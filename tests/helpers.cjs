// Shared fixtures for the tests. Run all of them with `npm test` (Node 22+).
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const P = require(path.join(ROOT, 'ui', 'pet-core.js'));
const {HOUR, DAY} = P, MIN = 6e4;
const T0 = Date.UTC(2026, 9, 1, 10, 0);
const REPO = {key: 'gh:me/app', name: 'me/app', prov: 'gh', kind: 'github'};
// n commits starting at `start`, `step` ms apart
const commits = (n, start, step, tag = 'c') => Array.from({length: n}, (_, i) => ({oid: `${tag}${start}_${i}`, t: start + i * step, msg: 'work'}));
const sig = list => list.map(s => `${s.commits}c/${s.min}m`).sort().join(' ');
module.exports = {ROOT, P, HOUR, DAY, MIN, T0, REPO, commits, sig};
