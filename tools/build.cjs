#!/usr/bin/env node
/* Builds the pet engine from src/ for the two places that run it:
     ui/pet-core.js                                  the desktop widget (a <script> tag)
     github-profile/.github/code-daemon/pet-core.js  the profile Action (require)

   npm run build              write those files
   npm run build -- --check   only report files that are out of date (the tests do this too)

   src/ is plain CommonJS with relative requires, so Node can load it as is. The bundle wraps each module in a
   function, keyed by its path under src/, and adds a small loader; the code inside reads exactly like src/.
   No dependencies. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const ENTRY = 'index';
const ACTION = 'github-profile/.github/code-daemon';
const lf = s => s.replace(/\r\n/g, '\n');

// Modules reachable from the entry, dependencies first: Map(id -> code with requires rewritten to ids).
function collect(id, mods = new Map(), stack = []) {
  if (mods.has(id)) return mods;
  if (stack.includes(id)) throw new Error('require cycle: ' + [...stack, id].join(' -> '));
  const code = lf(fs.readFileSync(path.join(SRC, id + '.js'), 'utf8')).replace(/require\((['"])([^'"]+)\1\)/g, (m, q, rel) => {
    if (!rel.startsWith('.')) throw new Error(`src/${id}.js: only relative requires can be bundled, not '${rel}'`);
    const dep = path.posix.join(path.posix.dirname(id), rel).replace(/\.js$/, '');
    collect(dep, mods, [...stack, id]);
    return `require('${dep}')`;
  });
  mods.set(id, code);
  return mods;
}

function bundle() {
  const modules = [...collect(ENTRY)].map(([id, code]) => `'${id}': function (module, require) {\n${code.trimEnd()}\n},\n`).join('');
  return `/* code.daemon pet engine. GENERATED from src/ by tools/build.cjs: edit src/, then run \`npm run build\`. */
(function (root) {
'use strict';
const modules = {
${modules}};
const cache = {};
function require(id) {
  if (!cache[id]) { cache[id] = {exports: {}}; modules[id](cache[id], require); }
  return cache[id].exports;
}
const PetCore = require('${ENTRY}');
root.PetCore = PetCore;
if (typeof module !== 'undefined' && module.exports) module.exports = PetCore;
})(typeof globalThis !== 'undefined' ? globalThis : this);
`;
}

// Every generated file: Map(path from the repo root -> content).
function outputs() {
  const engine = bundle();
  return new Map([['ui/pet-core.js', engine], [`${ACTION}/pet-core.js`, engine]]);
}

const read = file => { try { return fs.readFileSync(path.join(ROOT, file), 'utf8'); } catch { return null; } };
// Generated files whose content differs from what src/ builds (line endings aside).
const stale = (out = outputs()) => [...out].filter(([file, text]) => { const now = read(file); return now === null || lf(now) !== text; }).map(([file]) => file);

function write(out = outputs()) {
  const changed = stale(out);
  for (const file of changed) {
    const now = read(file), eol = now && now.includes('\r\n') ? '\r\n' : '\n';  // keep the checkout's line endings
    fs.mkdirSync(path.dirname(path.join(ROOT, file)), {recursive: true});
    fs.writeFileSync(path.join(ROOT, file), eol === '\n' ? out.get(file) : out.get(file).replace(/\n/g, eol));
  }
  return changed;
}

if (require.main === module) {
  if (process.argv.includes('--check')) {
    const files = stale();
    if (files.length) { console.error('Out of date, run `npm run build`:\n  ' + files.join('\n  ')); process.exit(1); }
    console.log('Generated files are up to date.');
  } else {
    const files = write();
    console.log(files.length ? 'Wrote:\n  ' + files.join('\n  ') : 'Nothing to do: generated files are up to date.');
  }
}

module.exports = {bundle, outputs, stale, write};
