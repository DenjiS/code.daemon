const test = require('node:test');
const assert = require('node:assert');
const {P, HOUR, DAY, MIN, T0, REPO, commits, sig} = require('./helpers.cjs');

const history = [...commits(20, T0, 9 * MIN), ...commits(5, T0 + 2 * DAY, 20 * MIN), ...commits(3, T0 + 2 * DAY + 3.5 * HOUR, 5 * MIN)];
const scan = since => P.toSessions(REPO, history.filter(c => c.t >= since), [], {});
const truth = scan(0);
const xp = list => P.derive(list, T0 + 30 * DAY, {}).xp;

test('widget rescans every 15 min keep sessions whole', () => {
  let auto = scan(0), lastScan = T0 + 3 * HOUR, now = lastScan;
  for (let k = 0; k < 4 * 24 * 8; k++) {
    now += 15 * MIN;
    const since = P.rescanFrom(auto, lastScan - 3 * DAY);
    auto = auto.filter(s => s.at < since).concat(scan(since)); lastScan = now;
  }
  assert.strictEqual(sig(auto), sig(truth));
  assert.strictEqual(xp(auto), xp(truth));
});

test('Action runs every 6 h keep sessions whole, also for saves without `first`', () => {
  for (const off of [0, 1, 2, 3, 4, 5]) {
    let now = T0 + (3 + off) * HOUR, saved = scan(0).map(({first, ...s}) => s), lastRun = now;
    for (let k = 0; k < 80; k++) {
      now += 6 * HOUR;
      const since = P.rescanFrom(saved, Math.max(now - 365 * DAY, lastRun - 14 * DAY));
      saved = saved.filter(s => s.at < since).concat(scan(since)); lastRun = now;
    }
    assert.strictEqual(sig(saved), sig(truth), `cron offset ${off} h`);
  }
});

test('a commit just after the boundary joins the session before it', () => {
  const cs = [...commits(3, T0, 10 * MIN), {oid: 'late', t: T0 + 110 * MIN, msg: 'x'}];
  const old = P.toSessions(REPO, cs.slice(0, 3), [], {});
  const since = P.rescanFrom(old, T0 + 80 * MIN);
  const res = old.filter(s => s.at < since).concat(P.toSessions(REPO, cs.filter(c => c.t >= since), [], {}));
  assert.strictEqual(res.length, 1);
  assert.strictEqual(res[0].commits, 4);
});

test('CI: moving from a red branch to a green one is not a fix', () => {
  let u = P.updateCI({}, {k: {s: 'fail', at: 1, ref: 'feature'}}, 1);
  u = P.updateCI(u.ci, {k: {s: 'pass', at: 2, ref: 'main'}}, 2);
  assert.strictEqual(u.events.length, 0);
});

test('CI: red -> running -> green on one branch is a fix; old entries without a branch still count', () => {
  let u = P.updateCI({}, {k: {s: 'fail', at: 1, ref: 'main'}}, 1);
  u = P.updateCI(u.ci, {k: {s: 'run', at: 2, ref: 'main'}}, 2);
  u = P.updateCI(u.ci, {k: {s: 'pass', at: 3, ref: 'main'}}, 3);
  assert.strictEqual(u.events.length, 1);
  u = P.updateCI({k: {s: 'fail', at: 1, since: 1}}, {k: {s: 'pass', at: 2, ref: 'main'}}, 2);
  assert.strictEqual(u.events.length, 1);
});

test('CI: a flapping build earns one fix per repo per day', () => {
  let ci = {}, ev = [];
  const step = (i, at) => { const r = P.updateCI(ci, {k: {s: i % 2 ? 'pass' : 'fail', at, ref: 'main'}}, at); ci = r.ci; ev = ev.concat(r.events); };
  for (let i = 0; i < 40; i++) step(i, T0 + i * MIN);
  assert.strictEqual(ev.length, 1);
  for (let i = 0; i < 4; i++) step(i, T0 + DAY + HOUR + i * MIN);
  assert.strictEqual(ev.length, 2);
});

test('CI fixes share the daily soft cap', () => {
  const heavy = Array.from({length: 6}, (_, i) => ({id: 's' + i, src: 'github', min: 120, commits: 10, at: T0 + i * HOUR}));
  const fixes = Array.from({length: 5}, (_, i) => ({id: 'f' + i, kind: 'fix', at: T0 + 7 * HOUR + i, xp: P.FIX_XP}));
  const gain = P.derive(heavy, T0 + DAY, {events: fixes}).xp - P.derive(heavy, T0 + DAY, {}).xp;
  assert.ok(gain < 2 * P.FIX_XP, `gain ${gain}`);
});

test('late nights mean 23:00-05:00 everywhere', () => {
  const at = h => new Date(2026, 9, 20, h, 30).getTime();
  assert.ok(P.isLate(at(23)) && P.isLate(at(2)) && !P.isLate(at(5)) && !P.isLate(at(22)));
  const now = at(12) + DAY;
  const D = P.derive([{id: 'a', src: 'local', min: 60, at: at(23)}, {id: 'b', src: 'local', min: 60, at: at(1)}], now, {});
  assert.strictEqual(D.late, 2);
});

// A fake GraphQL endpoint for scanGitHubRepo: branches -> commit lists (newest first).
function fakeRepo(branches, {ci = {}} = {}) {
  let calls = 0;
  const page = (list, from) => ({pageInfo: {hasNextPage: from + 100 < list.length, endCursor: String(from + 100)}, nodes: list.slice(from, from + 100)});
  const gql = async (q, v) => {
    calls++;
    if (q === P.Q_REPO) return {repository: {isPrivate: false, object: {entries: []}, releases: {nodes: []}, refs: {nodes: Object.entries(branches).map(([name, list]) => ({
      name, target: {committedDate: list[0].authoredDate, statusCheckRollup: {state: ci[name] || 'SUCCESS'}, history: page(list, 0)}}))}}};
    assert.strictEqual(q, P.Q_HIST);
    return {repository: {ref: {target: {history: page(branches[v.ref.replace('refs/heads/', '')], +v.cursor)}}}};
  };
  return {gql, calls: () => calls};
}
const node = (oid, t, msg = 'm') => ({oid, authoredDate: new Date(t).toISOString(), messageHeadline: msg});

test('GitHub history is paginated; a branch sharing history stops early', async () => {
  const all = Array.from({length: 250}, (_, i) => node('o' + i, T0 - i * 30 * MIN));
  const f = fakeRepo({main: all, feature: all});
  const res = await P.scanGitHubRepo(f.gql, 'me/app', 0, 'uid', {});
  assert.strictEqual(res.sessions.reduce((a, s) => a + s.commits, 0), 250);
  assert.strictEqual(f.calls(), 3);
  assert.strictEqual(res.ci.ref, 'main');
});

test('a commit rebased onto another branch counts once', async () => {
  const main = [node('a2', T0 + 20 * MIN, 'second'), node('a1', T0, 'first')];
  const rebased = [node('b2', T0 + 20 * MIN, 'second'), node('b1', T0, 'first'), node('b0', T0 - 10 * MIN, 'base')];
  const res = await P.scanGitHubRepo(fakeRepo({main, feature: rebased}).gql, 'me/app', 0, 'uid', {});
  assert.strictEqual(res.sessions.reduce((a, s) => a + s.commits, 0), 3);
});
