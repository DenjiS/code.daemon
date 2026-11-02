// Clips: animation as data (src/render/clips.js). Base clips move the pet on their own; event clips play on top of
// them in every theme; themes can bring their own version of a clip; new clips can be added from outside.
const test = require('node:test');
const assert = require('node:assert');
const {P} = require('./helpers.cjs');
const pet = (stage, extra) => ({stage, count: 5, xp: 1400, affinity: 'gitlab', form: null, mood: 80, energy: 90, rest: 80, mutations: {}, ...extra});
const same = (a, b) => [...a].sort().join() === [...b].sort().join();
const changes = (theme, st, name, extra, opts) => {
  let n = 0;
  for (let t = 0; t < P.clipFor(theme, name).len; t++) if (!same(P.build(pet(st, extra), 8 + t, {theme, ...opts}), P.build(pet(st, extra), 8 + t, {theme, ...opts, clip: {name, t}}))) n++;
  return n;
};

test('the pet moves on its own while awake, and keeps still under reduced motion', () => {
  const frames = (D, opts) => new Set([0, 4, 8, 12, 16, 20, 24, 28].map(f => [...P.build(D, f, {theme: 'classic', ...opts})].sort().join())).size;
  assert.ok(frames(pet(4)) >= 4, 'idle bounces');
  assert.strictEqual(frames(pet(4), {reduced: true}), 1);
});

test('evolve and devolve play in every theme on every stage, and end where they started', () => {
  for (const name of ['evolve', 'devolve']) for (const t of P.themes()) for (let st = name === 'evolve' ? 1 : 0; st <= 10; st++) {
    const D = name === 'devolve' ? {energy: 2, starving: true} : {};  // a pet that devolves is a starving one
    assert.ok(changes(t.id, st, name, D) >= 8, `${name}: ${t.id} stage ${st}`);
    const len = P.CLIPS[name].len;
    assert.ok(same(P.build(pet(st, D), 30, {theme: t.id, clip: {name, t: len + 5}}), P.build(pet(st, D), 30, {theme: t.id, clip: {name, t: len - 1}})), 'clamped to its last tick');
  }
});

test('under reduced motion a clip still shows its face and effect, but the body stays put', () => {
  const D = pet(4), still = P.build(D, 8, {theme: 'classic', reduced: true});
  const during = P.build(D, 8, {theme: 'classic', reduced: true, clip: {name: 'hop', t: 3}});
  assert.ok(!same(still, during), 'the face changes');
  const box = b => { const ys = [...b.keys()].map(k => (k / P.GW) | 0); return Math.min(...ys); };
  assert.strictEqual(box(during), box(still), 'no jump');
});

test('a theme can bring its own version of a clip, and unknown clips are ignored', () => {
  const plans = () => ({parts: [{m: new Set([20 * P.GW + 30, 20 * P.GW + 31]), role: 'body'}], eyes: [], mouth: null});
  const t = P.defineTheme({id: 'clip-test', name: 'Clip test', plans, clips: {hop: {len: 3, ox: 5}}});
  assert.strictEqual(P.clipFor(t.id, 'hop').len, 3);
  assert.strictEqual(P.clipFor('classic', 'hop').len, P.CLIPS.hop.len);
  const moved = P.build(pet(4), 0, {theme: t.id, clip: {name: 'hop', t: 1}});
  assert.ok(moved.has(20 * P.GW + 35) && moved.has(20 * P.GW + 36), 'its own hop shifts it 5 cells right');
  assert.ok(same(P.build(pet(4), 0, {theme: 'classic', clip: {name: 'nope', t: 1}}), P.build(pet(4), 0, {theme: 'classic'})));
});

test('defineClip adds a clip every theme can play, and rejects broken ones', () => {
  P.defineClip('spin', {len: 6, ox: [0, 1, 2, 1, 0, -1], face: 'wow', fx: (ctx, t) => ctx.put(1, 1, '#FFFFFF')});
  for (const t of P.themes()) assert.ok(changes(t.id, 5, 'spin') >= 5, t.id);
  assert.ok(P.build(pet(5), 0, {theme: 'slavic', clip: {name: 'spin', t: 0}}).has(P.GW + 1), 'its own fx');
  assert.throws(() => P.defineClip('Bad', {len: 2}), /lowercase/);
  assert.throws(() => P.defineClip('nolen', {}), /len/);
  assert.throws(() => P.defineClip('typo', {len: 2, oyy: [1]}), /unknown channel "oyy"/);
});
