#!/usr/bin/env node
/*
  code.daemon profile pet. Reads your GitHub commits, CI results and releases,
  then writes code-daemon/pet.svg (animated) and code-daemon/state.json.

  Env:
    PET_TOKEN     optional. Classic token with repo + read:user to include private repos.
                  Without it the workflow's GITHUB_TOKEN sees public activity only.
    PET_LOGIN     GitHub login. Defaults to the repository owner.
    PET_NAME      Pet name shown on the card (default dmn).
    PET_OUT       Output folder (default code-daemon).
    TZ            Time zone used for late-night sessions and streak days.
*/
'use strict';
const fs = require('fs');
const path = require('path');
const P = require('./pet-core.js');

const DAY = P.DAY;
const token = process.env.PET_TOKEN || process.env.GITHUB_TOKEN;
const login = process.env.PET_LOGIN || process.env.GITHUB_REPOSITORY_OWNER;
const petName = String(process.env.PET_NAME || 'dmn').slice(0, 16);
const outDir = path.resolve(process.env.PET_OUT || 'code-daemon');
const usingPat = !!process.env.PET_TOKEN;

function fail(msg) { console.error(`code.daemon: ${msg}`); process.exit(1); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
if (!token) fail('No token. Run inside GitHub Actions or set PET_TOKEN.');
if (!login) fail('No login. Set PET_LOGIN.');

async function gql(query, variables) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'code-daemon-action'},
      body: JSON.stringify({query, variables}),
    });
    if (r.status >= 500) { await sleep(2000 * (attempt + 1)); continue; }
    const j = await r.json().catch(() => null);
    if (!r.ok) throw new Error(`GitHub API ${r.status}${j && j.message ? ': ' + j.message : ''}`);
    if (!j || !j.data) throw new Error((j && j.errors && j.errors[0] && j.errors[0].message) || 'GraphQL error');
    return j.data;
  }
  throw new Error('GitHub API kept failing');
}
async function eachLimit(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({length: Math.min(n, items.length)}, async () => { while (i < items.length) await fn(items[i++]); }));
}

const Q_USER = `query($login:String!,$from:DateTime!){user(login:$login){id login contributionsCollection(from:$from){commitContributionsByRepository(maxRepositories:100){repository{nameWithOwner}}} repositories(first:50,orderBy:{field:PUSHED_AT,direction:DESC},ownerAffiliations:[OWNER,COLLABORATOR,ORGANIZATION_MEMBER]){nodes{nameWithOwner pushedAt}}}}`;

(async () => {
  const now = Date.now();
  const statePath = path.join(outDir, 'state.json');
  let saved = {ci: {}, events: [], sessions: [], lastRun: 0, private: []};
  try {
    const o = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    if (o && typeof o === 'object') saved = {
      ci: o.ci && typeof o.ci === 'object' ? o.ci : {},
      events: Array.isArray(o.events) ? o.events : [],
      sessions: Array.isArray(o.sessions) ? o.sessions : [],
      lastRun: +o.lastRun || 0,
      private: Array.isArray(o.private) ? o.private : [],
    };
  } catch (e) { /* first run */ }

  // First run reads a year; later runs re-read the last 14 days and keep older sessions from state.json.
  const since = saved.lastRun ? Math.max(now - 365 * DAY, saved.lastRun - 14 * DAY) : now - 365 * DAY;
  const d = await gql(Q_USER, {login, from: new Date(since).toISOString()});
  const u = d.user;
  if (!u) fail(`GitHub user ${login} not found.`);
  const names = new Set(u.contributionsCollection.commitContributionsByRepository.map(x => x.repository.nameWithOwner));
  for (const r of u.repositories.nodes) if (r.pushedAt && Date.parse(r.pushedAt) >= since) names.add(r.nameWithOwner);
  for (const k of Object.keys(saved.ci)) if (saved.ci[k] && saved.ci[k].s !== 'pass') names.add(k.replace(/^gh:/, ''));

  const fresh = [], observed = {}, privateRepos = new Set(saved.private);
  let scanned = 0, skipped = 0;
  await eachLimit([...names], 4, async name => {
    try {
      const res = await P.scanGitHubRepo(gql, name, since, u.id, {});
      if (!res) return;
      scanned++;
      if (res.repo.private) privateRepos.add(res.repo.key); else privateRepos.delete(res.repo.key);
      fresh.push(...res.sessions.filter(s => s.at >= since));
      observed[res.repo.key] = res.ci;
    } catch (e) { skipped++; console.warn(`skip ${name}: ${e.message}`); }
  });

  const sessions = saved.sessions.filter(s => P.valid(s) && s.at < since).concat(fresh);
  const upd = P.updateCI(saved.ci, observed, now);
  const known = new Set(saved.events.map(e => e.id));
  const events = saved.events.concat(upd.events.filter(e => !known.has(e.id)));
  const D = P.derive(sessions, now, {ci: upd.ci, events});

  const label = k => privateRepos.has(k) ? 'a private repo' : String(k).replace(/^g[hl]:/, '');
  const updated = new Date(now).toISOString().slice(0, 10);
  fs.mkdirSync(outDir, {recursive: true});
  fs.writeFileSync(path.join(outDir, 'pet.svg'), P.renderSVG(D, {name: petName, login: u.login, updated, statusOpts: {label}}));
  const compact = s => ({id: s.id, src: s.src, repo: s.repo, min: s.min, commits: s.commits, tests: s.tests || undefined, bug: s.bug || undefined, ship: s.ship || undefined, at: s.at});
  fs.writeFileSync(statePath, JSON.stringify({
    lastRun: now, private: [...privateRepos], ci: upd.ci, events,
    pet: {name: petName, stage: P.STAGES[D.stage].name, form: D.form, xp: D.xp, health: D.health, mutations: D.mutations},
    sessions: sessions.map(compact),
  }) + '\n');
  console.log(`code.daemon: ${P.STAGES[D.stage].name}${D.form ? ' / ' + P.FORMS[D.form].name : ''}, ${D.xp} XP, build ${D.ciTracked ? D.health : 'n/a'}. ` +
    `${scanned} repos with your commits, ${skipped} skipped, ${usingPat ? 'private repos included' : 'public activity only'}.`);
})().catch(e => fail(e.message));
