// The engine is built from src/ (tools/build.cjs) into ui/pet-core.js and the profile Action's folder.
// A stale copy means someone changed src/ and did not run `npm run build`.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const {ROOT, P} = require('./helpers.cjs');
const build = require(path.join(ROOT, 'tools', 'build.cjs'));

test('generated files are up to date with src/', () => {
  assert.deepStrictEqual(build.stale(), [], 'Run `npm run build`');
});

test('the bundle exports the same engine as src/', () => {
  const src = require(path.join(ROOT, 'src', 'index.js'));
  assert.deepStrictEqual(Object.keys(P).sort(), Object.keys(src).sort());
  assert.deepStrictEqual(P.themes().map(t => t.id), src.themes().map(t => t.id));
});
