// The profile Action ships its own copy of the engine and themes; they must match the widget's.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const {ROOT} = require('./helpers.cjs');
for (const f of ['pet-core.js', 'themes/demonic.js', 'themes/succubus.js']) {
  test(`github-profile copy of ${f} matches ui/`, () => {
    const a = fs.readFileSync(path.join(ROOT, 'ui', f), 'utf8');
    const b = fs.readFileSync(path.join(ROOT, 'github-profile/.github/code-daemon', f), 'utf8');
    assert.ok(a === b, `Copy ui/${f} to github-profile/.github/code-daemon/${f}`);
  });
}
