// Click reactions: what a click touches (hitTest), what the pet does about it (reactionFor), and how build() draws it.
const test = require('node:test');
const assert = require('node:assert');
const {P} = require('./helpers.cjs');
const pet = (stage, extra) => ({stage, count: 5, xp: 30, affinity: 'github', form: null, mood: 60, energy: 90, rest: 80, mutations: {}, ...extra});
const O = {theme: 'classic', screen: '#080A0E'};
const same = (a, b) => [...a].sort().join() === [...b].sort().join();

test('hitTest finds head, body, limbs, tail and wings, and misses empty screen', () => {
  const at = (st, x, y) => P.hitTest(pet(st), 8, O, x, y);
  assert.strictEqual(at(4, 33, 16), 'head');   // kaiju chick: head
  assert.strictEqual(at(4, 32, 28), 'body');
  assert.strictEqual(at(4, 17, 34), 'tail');
  assert.strictEqual(at(4, 27, 38), 'legs');
  assert.strictEqual(at(7, 14, 14), 'wing');   // imp: wing
  assert.strictEqual(at(3, 32, 24), 'head');   // round biped: upper half of the one blob is the head
  assert.strictEqual(at(3, 32, 33), 'body');
  assert.strictEqual(at(4, 2, 2), null);
  assert.strictEqual(at(0, 32, 31), 'egg');
});

test('only Classic reacts: other themes answer undefined and ignore opts.react', () => {
  for (const theme of ['derp', 'slavic', 'asian', 'demonic']) {
    assert.strictEqual(P.hitTest(pet(4), 8, {theme}, 32, 28), undefined, theme);
    assert.ok(same(P.build(pet(4), 8, {theme}), P.build(pet(4), 8, {theme, react: {kind: 'hop', t: 3, n: 1, gx: 0, gy: 0}})), theme);
  }
  assert.strictEqual(P.canReact('classic'), true);
  assert.strictEqual(P.canReact('constructor'), false);
});

test('reactionFor: zone, sleep, sickness, egg and a streak of clicks', () => {
  assert.strictEqual(P.reactionFor(pet(4), 'head', 1), 'pat');
  assert.strictEqual(P.reactionFor(pet(4), 'body', 1), 'tickle');
  assert.strictEqual(P.reactionFor(pet(4), 'legs', 1), 'hop');
  assert.strictEqual(P.reactionFor(pet(4), 'tail', 1), 'tail');
  assert.strictEqual(P.reactionFor(pet(7), 'wing', 1), 'flutter');
  assert.strictEqual(P.reactionFor(pet(4), 'arm', 1), 'wave');
  assert.strictEqual(P.reactionFor(pet(4), null, 1), 'look');
  assert.strictEqual(P.reactionFor(pet(4), 'head', 6), 'angry');
  assert.strictEqual(P.reactionFor(pet(4, {sick: true}), 'legs', 1), 'flinch');
  assert.strictEqual(P.reactionFor(pet(4, {energy: 10}), 'head', 1), 'stir');
  assert.strictEqual(P.reactionFor(pet(4, {energy: 10}), 'head', 3), 'grumpy');
  assert.strictEqual(P.reactionFor(pet(0), 'egg', 1), 'wobble');
});

test('every reaction draws on every stage, changes the picture, and ends where it started', () => {
  for (const kind of Object.keys(P.REACTIONS)) for (let st = 0; st <= 10; st++) for (const reduced of [false, true]) {
    const D = pet(st, kind === 'stir' || kind === 'grumpy' ? {energy: 10} : {}), o = {...O, reduced};
    let changed = false;
    for (let t = 0; t < P.REACTIONS[kind].len; t++) {
      const b = P.build(D, 8 + t, {...o, react: {kind, t, n: 3, gx: 5, gy: 40}});
      for (const k of b.keys()) assert.ok(k >= 0 && k < P.GW * P.GH);
      if (!same(b, P.build(D, 8 + t, o))) changed = true;
    }
    if (st > 0 || kind === 'wobble') assert.ok(changed, `${kind} on stage ${st}${reduced ? ' (reduced)' : ''} shows nothing`);
  }
});

test('a click lands on what is on screen mid-hop', () => {
  const D = pet(4), react = {kind: 'hop', t: 4, n: 1, gx: 0, gy: 0};  // 5 cells up at t = 4
  assert.strictEqual(P.hitTest(D, 12, {...O, react}, 27, 33), 'legs');
  assert.strictEqual(P.hitTest(D, 12, O, 27, 33), 'body');
});
