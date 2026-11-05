// Ornament reads and headroom must use the same pose as the creature, including jumps and squash.
const test = require('node:test');
const assert = require('node:assert/strict');
const {P} = require('./helpers.cjs');
const {surface} = require('../src/render/surface');
const {bellyPlates} = require('../src/render/decor');
const {crest} = require('../src/render/accessories');
const {sleep} = require('../src/render/status');
const {pose} = require('../src/render/pose');
const {withAnchors} = require('../src/render/figure');
const {GW, GH, G} = require('../src/render/raster');
const pet = (stage, extra) => ({stage, count: 5, xp: 30, energy: 90, affinity: 'gitlab', mutations: {}, ...extra});

test('surface reads exactly the cell it paints, with rounding, squash, shifts and clipping', () => {
  for (const [ox, oy, sq] of [[0, 0, 1], [1, -5, 1], [-1, 0, 0.88], [0.5, -2.5, 0.94]]) {
    const s = surface(); s.move(ox, oy, sq);
    for (const [x, y] of [[32, 23], [31.5, 25.5], [-1, 23], [64, 23], [32, -20], [32, 60]]) {
      s.buf.clear(); s.put(x, y, '#123456');
      assert.equal(s.get(x, y), s.buf.size ? '#123456' : undefined);
    }
    s.put0(63, 22, '#FFFFFF');
    assert.equal(s.get(-1 - ox, 23), undefined, 'out-of-bounds x cannot alias the previous row');
  }
});

test('belly plates only recolor belly cells in the animated pose', () => {
  for (const [ox, oy, sq] of [[0, 0, 1], [1, -5, 1], [-1, 0, 0.88], [0.5, -2.5, 0.94]]) {
    const s = surface(); s.move(ox, oy, sq);
    const pal = {belly: '#C0C0C0'};
    for (let y = G - 18; y <= G - 5; y += 3) for (let x = 28; x <= 36; x++) s.put(x, y, x % 2 ? '#111111' : pal.belly);
    const before = new Map(s.buf);
    bellyPlates({...s, A: {head: [32, 7]}, pal, screen: '#080A0E'});
    assert.ok([...s.buf].some(([k, c]) => before.get(k) !== c), 'plates are drawn');
    for (const [k, c] of s.buf) if (c !== before.get(k)) assert.equal(before.get(k), pal.belly, 'every changed cell was belly');
  }
});

test('crowns, every affinity crest and sleeping Zs clear the top edge through every built-in clip', () => {
  // Color-only mutations and forms do not change these anchors. Cover both crown states and all base poses.
  const samples = Array.from({length: 48}, (_, f) => ({f}));
  for (const [name, clip] of Object.entries(P.CLIPS)) for (let t = 0; t < clip.len; t++) samples.push({f: 8 + t, clip: {name, t}});
  for (const T of P.themes()) for (let st = 1; st <= 10; st++) for (const state of [{}, {energy: 10}, {critical: true}, {reduced: true}]) for (const sample of samples) for (const crowned of [false, true]) {
    const D = pet(st, {...state, mutations: {crowned}}), q = pose(D, sample.f, {clip: sample.clip, reduced: state.reduced}, T);
    const pl = T.plans(st, sample.f, q.mo), A = withAnchors(pl.a, pl.parts);
    const s = surface(); s.move(q.pose.ox, q.pose.oy, q.pose.sq);
    let layer;
    const put = (x, y) => {
      const yy = Math.round(G - (G - y) * q.pose.sq + q.pose.oy);
      assert.ok(yy >= 0 && yy < GH, `${T.id} ${st} ${layer} ${JSON.stringify(sample)}: row ${yy}`);
    };
    const sprite = (rows, x, y, colors) => rows.forEach((r, j) => [...r].forEach((c, i) => { if (colors[c]) put(x + i, y + j); }));
    const ctx = {...s, put, sprite, A, st, D, f: sample.f, sleeping: q.sleeping, mo: q.mo, motion: q.motion, screen: '#080A0E', body: '#FF9B5E'};
    for (const aff of [null, ...P.SOURCES.map(s => s.id)]) {
      layer = `${aff} crown=${crowned}`;
      crest({...ctx, aff, mut: {crowned}});
    }
    layer = 'sleep'; sleep(ctx);
  }
});
