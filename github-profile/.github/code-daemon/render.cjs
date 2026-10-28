#!/usr/bin/env node
/*
  code.daemon profile pet. Reads your GitHub commits, CI results and releases,
  then writes code-daemon/pet.svg (animated) and code-daemon/state.json.

  Env:
    PET_TOKEN     optional. Classic token with repo + read:user to include private repos.
                  Without it the workflow's GITHUB_TOKEN sees public activity only.
    PET_SALT      optional, recommended together with PET_TOKEN. Any long random string.
                  state.json is public, so private repos are stored there under a keyed hash
                  instead of their names; this is the key. Without it PET_TOKEN is the key,
                  and replacing the token makes old private entries look like new repos.
    PET_LOGIN     GitHub login. Defaults to the repository owner.
    PET_NAME      Pet name shown on the card (default dmn).
    PET_THEME     classic (default), derp, slavic, demonic or succubus.
    PET_OUT       Output folder (default code-daemon).
    TZ            Time zone used for late-night sessions and streak days.
*/
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const P = require('./pet-core.js');

const DAY = P.DAY;
const token = process.env.PET_TOKEN || process.env.GITHUB_TOKEN;
const login = process.env.PET_LOGIN || process.env.GITHUB_REPOSITORY_OWNER;
const petName = String(process.env.PET_NAME || 'dmn').slice(0, 16);
const petTheme = String(process.env.PET_THEME || 'classic').toLowerCase().trim();
if (!P.hasTheme(petTheme)) {  // classic, derp and slavic are drawn by pet-core; sprite themes live in themes/
  const file = path.join(__dirname, 'themes', petTheme.replace(/[^a-z0-9-]/g, '') + '.js');
  if (fs.existsSync(file)) P.registerTheme(petTheme, require(file));
  else console.warn(`Theme "${petTheme}" not found in .github/code-daemon/themes, using classic.`);
}
const outDir = path.resolve(process.env.PET_OUT || 'code-daemon');
const usingPat = !!process.env.PET_TOKEN;
const secret = process.env.PET_SALT || process.env.PET_TOKEN || '';

// Private repos never appear in state.json by name: their keys become "gh:private:<hmac>".
const HIDDEN = 'gh:private:';
const isHidden = k => String(k).startsWith(HIDDEN);
const hmac = s => crypto.createHmac('sha256', secret).update(String(s)).digest('hex').slice(0, 16);

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
      private: Array.isArray(o.private) ? o.private : [],  // written in plain text by older versions; only read to migrate
    };
  } catch (e) { /* first run */ }

  // First run reads a year. Later runs re-read the last 14 days, starting at a session boundary so no
  // session is cut in two, and keep older sessions from state.json.
  const since = P.rescanFrom(saved.sessions.filter(P.valid), saved.lastRun ? Math.max(now - 365 * DAY, saved.lastRun - 14 * DAY) : now - 365 * DAY);
  const d = await gql(Q_USER, {login, from: new Date(Math.max(since, now - 365 * DAY)).toISOString()});
  const u = d.user;
  if (!u) fail(`GitHub user ${login} not found.`);
  const names = new Set(u.contributionsCollection.commitContributionsByRepository.map(x => x.repository.nameWithOwner));
  for (const r of u.repositories.nodes) if (r.pushedAt && Date.parse(r.pushedAt) >= since) names.add(r.nameWithOwner);
  for (const k of Object.keys(saved.ci)) if (!isHidden(k) && saved.ci[k] && saved.ci[k].s !== 'pass') names.add(k.replace(/^gh:/, ''));

  const results = [], skipped = new Set();
  await eachLimit([...names], 4, async name => {
    try { const res = await P.scanGitHubRepo(gql, name, since, u.id, {}); if (res) results.push(res); }
    catch (e) { skipped.add(name); console.warn(`skip ${name}: ${e.message}`); }
  });

  // Private keys: repos that are private now, plus the plain-text list older versions left in state.json.
  const priv = new Set(saved.private.map(String));
  for (const r of results) if (r.repo.private) priv.add(r.repo.key); else priv.delete(r.repo.key);
  if (priv.size && !secret) console.warn('Private repos in the old state but no PET_SALT or PET_TOKEN to hide them; dropping them from state.json.');
  const cloak = k => !priv.has(k) ? k : secret ? HIDDEN + hmac(k) : null;
  const cloakSession = s => {
    if (!s || !priv.has(s.repo)) return s;
    const repo = cloak(s.repo);
    return repo && Object.assign({}, s, {repo, id: HIDDEN + hmac(s.id)});
  };
  const cloakEvent = e => {
    if (!e || !priv.has(e.repo)) return e;
    const repo = cloak(e.repo);
    return repo && Object.assign({}, e, {repo, id: 'fix:' + repo + ':' + e.at});
  };
  const cloakMap = o => { const out = {}; for (const k in o) { const c = cloak(k); if (c) out[c] = o[k]; } return out; };

  // A repo that failed to scan keeps its saved sessions this run instead of losing the re-read window.
  const keepAll = new Set();
  for (const n of skipped) { keepAll.add('gh:' + n); if (secret) keepAll.add(HIDDEN + hmac('gh:' + n)); }

  const fresh = [], observed = {};
  for (const res of results) {
    fresh.push(...res.sessions.filter(s => s.at >= since).map(cloakSession).filter(Boolean));
    const k = cloak(res.repo.key);
    if (k) observed[k] = res.ci;
  }
  const kept = saved.sessions.map(cloakSession).filter(s => s && P.valid(s) && (s.at < since || keepAll.has(s.repo)));
  const sessions = kept.concat(fresh);
  const upd = P.updateCI(cloakMap(saved.ci), observed, now);
  const oldEvents = saved.events.map(cloakEvent).filter(Boolean);
  const known = new Set(oldEvents.map(e => e.id));
  const events = oldEvents.concat(upd.events.filter(e => !known.has(e.id)));
  const D = P.derive(sessions, now, {ci: upd.ci, events});

  const label = k => isHidden(k) ? 'a private repo' : String(k).replace(/^g[hl]:/, '');
  const updated = new Date(now).toISOString().slice(0, 10);
  fs.mkdirSync(outDir, {recursive: true});
  fs.writeFileSync(path.join(outDir, 'pet.svg'), P.renderSVG(D, {name: petName, login: u.login, updated, statusOpts: {label}, theme: P.hasTheme(petTheme) ? petTheme : 'classic'}));
  const compact = s => ({id: s.id, src: s.src, repo: s.repo, min: s.min, commits: s.commits, tests: s.tests || undefined, bug: s.bug || undefined, ship: s.ship || undefined, first: s.first, at: s.at});
  fs.writeFileSync(statePath, JSON.stringify({
    lastRun: now, ci: upd.ci, events,
    pet: {name: petName, stage: P.STAGES[D.stage].name, form: D.form, xp: D.xp, health: D.health, mutations: D.mutations},
    sessions: sessions.map(compact),
  }) + '\n');
  console.log(`code.daemon: ${P.STAGES[D.stage].name}${D.form ? ' / ' + P.FORMS[D.form].name : ''}, ${D.xp} XP, build ${D.ciTracked ? D.health : 'n/a'}. ` +
    `${results.length} repos with your commits, ${skipped.size} skipped, ${usingPat ? 'private repos included' : 'public activity only'}.`);
})().catch(e => fail(e.message));
