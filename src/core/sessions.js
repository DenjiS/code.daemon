/* ---------- commits -> sessions ---------- */
'use strict';
const {HOUR, clamp} = require('./util');
const {SRC} = require('./rules');

// Commit titles that mark a session as bug fixing, testing or shipping.
const RX_BUG = /\b(fix(e[sd])?|bug(fix)?|hotfix|patch(ed)?|resolve[sd]?)\b/i;
const RX_TEST = /\b(tests?|testing|specs?|e2e)\b/i;
const RX_REL = /\b(release[sd]?|bump(ed)? version|v\d+\.\d+(\.\d+)?)\b/i;
// a session the engine can count
const valid = s => !!(s && SRC[s.src] && Number.isFinite(s.min) && s.min > 0 && Number.isFinite(s.at));
const SESSION_GAP = 2 * HOUR;  // commits closer than this join one session
// Same author time and title = the same commit, rebased or cherry-picked onto another branch.
const commitKey = (t, msg) => t + '|' + String(msg || '').trim();

/* ---------- rescans ----------
   A rescan re-reads commits from `since` and rebuilds the sessions after it. If `since` fell inside a session,
   the rebuilt one would only keep the commits after `since`, and the start of the session would be lost for good.
   So the boundary moves back to the start of any session it touches (or that ends less than SESSION_GAP before it). */
const sessionStart = s => Number.isFinite(s.first) ? s.first : s.at - Math.max(0, (s.min || 0) - 30) * 6e4;
function rescanFrom(list, since) {
  for (let moved = true; moved;) {
    moved = false;
    for (const s of list || []) {
      if (!s || !Number.isFinite(s.at) || s.at < since - SESSION_GAP) continue;
      const first = sessionStart(s);
      if (Number.isFinite(first) && first < since) { since = first; moved = true; }
    }
  }
  return since;
}

// Unity and Unreal projects, told apart by the files at the repo root
function detectKind(entries) {
  const dirs = new Set(entries.filter(e => e.dir).map(e => e.name));
  if (entries.some(e => !e.dir && /\.uproject$/i.test(e.name))) return 'unreal';
  if (dirs.has('ProjectSettings') && dirs.has('Assets')) return 'unity';
  return null;
}
function toSessions(repo, commits, releases, overrides) {
  commits = commits.slice().sort((a, b) => a.t - b.t);
  const groups = [];
  let g = null;
  for (const c of commits) {
    if (g && c.t - g.last <= SESSION_GAP) { g.last = c.t; g.n++; g.msgs.push(c.msg); }
    else { g = {first: c.t, last: c.t, n: 1, oid: c.oid, msgs: [c.msg]}; groups.push(g); }
  }
  for (const r of releases || []) { let best = null; for (const x of groups) if (r >= x.first - HOUR && r <= x.last + 12 * HOUR) best = x; if (best) best.rel = true; }
  const src = (overrides && overrides[repo.key]) || repo.kind;
  return groups.map(x => ({
    id: repo.key + '@' + String(x.oid).slice(0, 12), prov: repo.prov, repo: repo.key, kind: repo.kind, src, auto: true, sample: false,
    note: repo.name, commits: x.n, min: clamp(Math.round((x.last - x.first) / 6e4) + 30, 15, 480),
    tests: x.msgs.some(m => RX_TEST.test(m)), bug: x.msgs.some(m => RX_BUG.test(m)), ship: !!x.rel || x.msgs.some(m => RX_REL.test(m)),
    at: x.last, first: x.first,
  }));
}

module.exports = {SESSION_GAP, commitKey, sessionStart, rescanFrom, valid, detectKind, toSessions};
