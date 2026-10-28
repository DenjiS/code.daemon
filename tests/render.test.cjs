// End-to-end run of the profile Action (render.cjs) against a fake GitHub.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {execFileSync} = require('child_process');
const {ROOT, P, HOUR, DAY, MIN} = require('./helpers.cjs');

const RENDER = path.join(ROOT, 'github-profile/.github/code-daemon/render.cjs');
const NOW = Date.UTC(2026, 9, 28, 12, 0), t0 = NOW - 10 * DAY;
const mk = (tag, n, start, step) => Array.from({length: n}, (_, i) => ({oid: tag + i, t: start + i * step}));
const REPOS = {
  'me/app': {commits: mk('a', 12, t0, 15 * MIN)},
  'me/secret': {private: true, ci: 'FAILURE', commits: mk('s', 8, t0 + DAY, 20 * MIN)},
  'me/flaky': {commits: mk('f', 4, NOW - 2 * DAY, 10 * MIN)},
};
function run(dir, now, extra = {}) {
  return execFileSync(process.execPath, ['-r', path.join(__dirname, 'fake-github.cjs'), RENDER], {cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    env: {...process.env, FAKE_NOW: String(now), FAKE_REPOS: JSON.stringify(REPOS), PET_TOKEN: 'x', PET_SALT: 'pepper', GITHUB_REPOSITORY_OWNER: 'me', TZ: 'UTC', ...extra}});
}

test('private repo names stay out of state.json and pet.svg; old plain-text state is migrated', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-render-'));
  fs.mkdirSync(path.join(dir, 'code-daemon'));
  // State written by the previous version, which kept private names in plain text.
  const legacy = (key, cs) => P.toSessions({key, name: key.slice(3), prov: 'gh', kind: 'github'}, cs.map(c => ({...c, msg: 'w'})), [], {})
    .map(s => ({id: s.id, src: s.src, repo: s.repo, min: s.min, commits: s.commits, at: s.at}));
  fs.writeFileSync(path.join(dir, 'code-daemon/state.json'), JSON.stringify({
    lastRun: NOW - 6 * HOUR, private: ['gh:me/secret'], ci: {'gh:me/secret': {s: 'fail', at: t0 + DAY, since: t0 + DAY}},
    events: [{id: 'fix:gh:me/secret:1', kind: 'fix', repo: 'gh:me/secret', at: t0, xp: 15}],
    sessions: [...legacy('gh:me/app', REPOS['me/app'].commits), ...legacy('gh:me/secret', REPOS['me/secret'].commits)]}));
  run(dir, NOW);
  const stateText = fs.readFileSync(path.join(dir, 'code-daemon/state.json'), 'utf8');
  const svg = fs.readFileSync(path.join(dir, 'code-daemon/pet.svg'), 'utf8');
  assert.ok(!stateText.includes('secret'), 'state.json mentions the private repo');
  assert.ok(!svg.includes('secret'), 'pet.svg mentions the private repo');
  const state = JSON.parse(stateText);
  assert.ok(!('private' in state));
  assert.ok(state.sessions.some(s => s.repo.startsWith('gh:private:')));
  assert.match(svg, /CI failing in a private repo/);

  // Six hours later two repos fail to scan: their sessions must survive.
  run(dir, NOW + 6 * HOUR, {FAIL: 'me/flaky,me/secret'});
  const after = JSON.parse(fs.readFileSync(path.join(dir, 'code-daemon/state.json'), 'utf8'));
  const c = s => s.sessions.map(x => x.repo + ':' + x.commits).sort().join(' ');
  assert.strictEqual(c(after), c(state));
  assert.strictEqual(after.pet.xp, state.pet.xp);
  fs.rmSync(dir, {recursive: true, force: true});
});
