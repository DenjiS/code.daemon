// The theme registry and the themes in it: what defineTheme() accepts, picker order, the fallback for unknown ids,
// and that every theme draws every stage in every state inside the screen.
const test = require('node:test');
const assert = require('node:assert');
const {P} = require('./helpers.cjs');
const pet = (stage, extra) => ({stage, count: 5, xp: 1400, affinity: 'github', form: null, mood: 60, energy: 90, rest: 80, mutations: {}, ...extra});
const same = (a, b) => [...a].sort().join() === [...b].sort().join();
const ANCHORS = {head: [32, 20], side: [20, 30], hold: [20, 32], rear: [22, 34], cube: [46, 12], box: [22, 20, 42, 41]};
const theme = extra => ({id: 'test-' + Math.random().toString(36).slice(2, 8), name: 'Test', plans: () => ({parts: [], eyes: [], mouth: null, a: ANCHORS}), ...extra});

test('the themes, in picker order', () => {
  assert.deepStrictEqual(P.themes().map(t => t.id).slice(0, 6), ['classic', 'derp', 'slavic', 'asian', 'demonic', 'succubus']);
  for (const t of P.themes()) assert.ok(t.id && t.name && typeof t.plans === 'function', t.id);
});

test('every theme draws every stage, form and state on the screen, with something to see', () => {
  const forms = [null, 'owl', 'shipper', 'streaker', 'guardian', 'debugger', 'vibe', 'polyglot'];
  const states = [{}, {energy: 10}, {energy: 1, starving: true, fading: true}, {sick: true, critical: true, mood: 10}, {count: 0}, {mutations: {shiny: true, crowned: true, cursed: true, committed: true}}];
  for (const t of P.themes()) for (let st = 0; st <= 10; st++) for (const form of forms) for (const s of states) for (const aff of ['github', 'gitlab', 'local', 'unity', 'unreal', null]) {
    const b = P.build(pet(st, {form, affinity: aff, srcs30: ['github', 'local'], ...s}), 13, {theme: t.id});
    assert.ok(b.size > 40, `${t.id} stage ${st} ${form} draws ${b.size} cells`);
    for (const [k, c] of b) assert.ok(k >= 0 && k < P.GW * P.GH && /^#[0-9a-f]{6}$/i.test(c), `${t.id} stage ${st}: cell ${k} ${c}`);
  }
});

test('unknown ids draw as Classic, and names from Object.prototype are not themes', () => {
  assert.strictEqual(P.hasTheme('constructor'), false);
  assert.strictEqual(P.hasTheme('nope'), false);
  assert.ok(same(P.build(pet(4), 3, {theme: 'nope'}), P.build(pet(4), 3, {theme: 'classic'})));
  assert.ok(same(P.build(pet(4), 3, {theme: 'constructor'}), P.build(pet(4), 3, {})));
  assert.strictEqual(P.themeColors('nope'), null);
  assert.strictEqual(P.stageBody(4, 'nope'), P.STAGES[4].body);
});

test('defineTheme rejects broken themes with a message that names the theme', () => {
  const bad = [
    [{...theme(), id: 'Bad Id'}, /lowercase/],
    [{...theme(), name: ''}, /name/],
    [theme({plans: null}), /plans/],
    [theme({face: 'googly'}), /face/],
    [theme({bodies: ['one']}), /11 names/],
    [{...theme(), id: 'classic'}, /already defined/],
  ];
  for (const [t, why] of bad) assert.throws(() => P.defineTheme(t), e => why.test(e.message) && e.message.includes(t.id), t.id);
});

test('a new theme needs nothing but its own object, and anchors it leaves out are placed for it', () => {
  const t = P.defineTheme(theme({accent: '#123456', screen: '#010203', dot: '#040506', bodies: P.STAGES.map((s, i) => 'Body ' + i)}));
  assert.ok(P.hasTheme(t.id));
  assert.strictEqual(P.themes().at(-1), t);
  assert.strictEqual(P.defineTheme(t), t, 'the same theme twice is fine');
  assert.deepStrictEqual(P.themeColors(t.id), {screen: '#010203', dot: '#040506'});
  assert.strictEqual(P.stageBody(7, t.id), 'Body 7');
  assert.ok(P.build(pet(0), 0, {theme: t.id}).size > 0, 'the default egg');
  assert.ok(P.renderSVG({...pet(4), failing: [], commits: 3}, {theme: t.id}).startsWith('<svg'));
  // a blob with no anchors at all still gets a crest, a form accessory and a shadow
  const blob = P.defineTheme(theme({plans: () => { const parts = [{m: new Set([30, 31, 32].flatMap(x => [30, 31, 32].map(y => y * P.GW + x))), role: 'body'}]; return {parts, eyes: [], mouth: null}; }}));
  const b = P.build(pet(4, {form: 'guardian'}), 0, {theme: blob.id});
  assert.ok(b.size > 9 + 20, 'crest, shield and shadow around the blob');
});
