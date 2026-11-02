// Clicks: what a click touches (hitTest), which clip the pet plays about it (reactionFor), and how build() draws it.
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

test('only themes with reacts: true answer clicks; the others answer undefined', () => {
  for (const theme of P.themes().filter(t => !t.reacts).map(t => t.id)) assert.strictEqual(P.hitTest(pet(4), 8, {theme}, 32, 28), undefined, theme);
  assert.strictEqual(P.canReact('classic'), true);
  assert.strictEqual(P.canReact('derp'), false);
  assert.deepStrictEqual(P.themes().filter(t => t.reacts).map(t => t.id), ['classic', 'demonic', 'succubus']);
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

const REACTING = P.themes().filter(t => t.reacts).map(t => t.id);
const REACTIONS = ['pat', 'tickle', 'wave', 'hop', 'tail', 'flutter', 'look', 'angry', 'grumpy', 'stir', 'wobble', 'flinch'];

test('every reaction draws on every stage of every theme that reacts, and changes the picture', () => {
  for (const theme of REACTING) for (const kind of REACTIONS) for (let st = 0; st <= 10; st++) for (const reduced of [false, true]) {
    const D = pet(st, kind === 'stir' || kind === 'grumpy' ? {energy: 10} : {}), o = {...O, theme, reduced};
    let changed = false;
    for (let t = 0; t < P.CLIPS[kind].len; t++) {
      const b = P.build(D, 8 + t, {...o, clip: {name: kind, t, n: 3, gx: 5, gy: 40}});
      for (const k of b.keys()) assert.ok(k >= 0 && k < P.GW * P.GH);
      if (!same(b, P.build(D, 8 + t, o))) changed = true;
    }
    if (st > 0 || kind === 'wobble') assert.ok(changed, `${theme}: ${kind} on stage ${st}${reduced ? ' (reduced)' : ''} shows nothing`);
  }
});

test('every stage of every theme that reacts can be clicked on the head and the body', () => {
  for (const theme of REACTING) for (let st = 1; st <= 10; st++) {
    const zones = new Set();
    for (let y = 0; y < P.GH; y++) for (let x = 0; x < P.GW; x++) zones.add(P.hitTest(pet(st), 8, {theme}, x, y));
    for (const z of ['head', 'body', null]) assert.ok(zones.has(z), `${theme} stage ${st} has no ${z === null ? 'empty screen' : z}`);
  }
});

test('a click lands on what is on screen mid-hop', () => {
  const D = pet(4), clip = {name: 'hop', t: 4, n: 1, gx: 0, gy: 0};  // 5 cells up at t = 4
  assert.strictEqual(P.hitTest(D, 12, {...O, clip}, 27, 33), 'legs');
  assert.strictEqual(P.hitTest(D, 12, O, 27, 33), 'body');
});
