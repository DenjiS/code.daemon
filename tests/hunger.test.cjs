// Hunger (src/core/hunger.js): days without code eat XP, a pet left at the bottom of its stage devolves, all the way
// back to the egg; and how a hungry pet looks (src/render/gaunt.js).
const test = require('node:test');
const assert = require('node:assert');
const {P, HOUR, DAY} = require('./helpers.cjs');
const H = P.HUNGER;
const T0 = Date.UTC(2026, 6, 1, 12);
// one session a day for `days` days from `start`
const daily = (days, min = 90, commits = 5, start = T0, tag = 's') => Array.from({length: days}, (_, d) => ({id: tag + d, src: 'github', min, commits, at: start + d * DAY}));

test('no hunger for the first days, nor while Energy is above the line; a well-fed pet lasts longer', () => {
  const light = daily(20, 30, 1), heavy = daily(20, 300, 12);
  const end = s => s.at(-1).at;
  for (const h of [light, heavy]) {
    const D = P.derive(h, end(h) + H.grace * DAY - HOUR);
    assert.strictEqual(D.starving, false);
    assert.strictEqual(D.xp, P.derive(h, end(h) + 1).xp, 'nothing lost inside the grace days');
  }
  const startL = P.derive(light, end(light) + 1).starveAt - end(light), startH = P.derive(heavy, end(heavy) + 1).starveAt - end(heavy);
  assert.ok(startL >= H.grace * DAY && startH > startL + DAY, `light ${startL / DAY} d, heavy ${startH / DAY} d`);
  const D = P.derive(heavy, end(heavy) + startH / 1 + HOUR);
  assert.ok(D.starving && D.energy <= H.energy);
});

test('a week off costs next to nothing, a month off a week or two of coding', () => {
  const h = daily(60), last = h.at(-1).at, D0 = P.derive(h, last + 1), perDay = D0.xp / 60;
  const lost = d => D0.xp - P.derive(h, last + d * DAY).xp;
  assert.ok(lost(7) <= 20, `a week: ${lost(7)}`);
  assert.ok(lost(30) > 2 * perDay && lost(30) < 15 * perDay, `a month: ${lost(30)} XP, ${(lost(30) / perDay).toFixed(1)} days of coding`);
});

test('XP stops at the bottom of the stage, waits, devolves near the top of the stage below, and keeps going to the egg', () => {
  const h = daily(40), last = h.at(-1).at;
  let prev = P.derive(h, last + 1), fell = 0;
  for (let t = last + 6 * HOUR; t < last + 400 * DAY; t += 6 * HOUR) {
    const D = P.derive(h, t);
    assert.ok(D.xp <= prev.xp, 'XP only goes down while nobody codes');
    assert.ok(D.stage <= prev.stage, 'and so does the stage');
    assert.ok(D.xp >= P.STAGES[D.stage].xp, 'never under the threshold of its stage');
    if (D.stage < prev.stage) {
      fell++;
      assert.strictEqual(D.stage, prev.stage - 1, 'one stage at a time');
      assert.strictEqual(prev.xp, P.STAGES[prev.stage].xp, 'it was at the bottom');
      assert.ok(prev.fading, 'and the status said so');
      const top = P.STAGES[prev.stage].xp, land = top - H.fall * P.hungerRate(D.stage);
      assert.ok(D.xp <= top - 1 && D.xp >= land - 2 * P.hungerRate(D.stage), `lands near the top: ${D.xp} of ${top}`);
      assert.strictEqual(D.form, D.stage >= P.FORM_STAGE ? (D.forms[D.stage] || 'core') : null);
      assert.ok(!(prev.stage in D.forms), 'the lost stage forgets its form');
    }
    prev = D;
  }
  assert.strictEqual(prev.stage, 0, 'back to the egg');
  assert.strictEqual(prev.xp, 0, 'a cold egg');
  assert.strictEqual(P.statusInfo(prev)[0], 'cooling');
  assert.ok(fell >= 3);
  assert.strictEqual(prev.losses.length, 1);
  assert.strictEqual(prev.losses[0].falls.length, fell);
  assert.ok(prev.losses[0].ongoing);
});

test('the wait at the bottom lasts HUNGER.floor days', () => {
  const h = daily(40), last = h.at(-1).at;
  let first = null;
  for (let t = last; t < last + 120 * DAY; t += HOUR) {
    const D = P.derive(h, t);
    if (D.fading && first === null) first = D;
    if (first && D.stage < first.stage) { assert.ok(Math.abs(t - first.fallAt) <= HOUR, 'falls when it said it would'); assert.ok(Math.abs(first.fallAt - (t - H.floor * DAY)) <= H.floor * DAY); return; }
  }
  assert.fail('never fell');
});

test('a session ends hunger at once; a fixed build adds XP but does not feed the pet', () => {
  const h = daily(40), last = h.at(-1).at, t = last + 25 * DAY;
  const starving = P.derive(h, t);
  assert.ok(starving.starving && starving.drain > 0);
  const fix = {id: 'fix:x', kind: 'fix', repo: 'gh:me/app', at: t - HOUR, xp: P.FIX_XP};
  const withFix = P.derive(h, t, {events: [fix]});
  assert.ok(withFix.starving, 'still starving');
  assert.strictEqual(withFix.starveAt, starving.starveAt);
  assert.ok(withFix.xp > starving.xp);
  const fed = P.derive(h.concat({id: 'back', src: 'local', min: 60, commits: 3, at: t - HOUR}), t);
  assert.strictEqual(fed.starving, false);
  assert.strictEqual(fed.losses.length, 1);
  assert.strictEqual(fed.losses[0].ongoing, false);
  assert.ok(fed.losses[0].xp > 0);
});

test('a pet that devolved and is fed again evolves again, and takes a form from its new habits', () => {
  const h = daily(30, 120, 4).map((s, i) => Object.assign(s, {tests: true, at: T0 + i * 2 * DAY}));   // a Guardian, every other day
  const last = h.at(-1).at, D0 = P.derive(h, last + 1);
  assert.strictEqual(D0.form, 'guardian');
  let t = last; while (P.derive(h, t).stage >= D0.stage) t += 12 * HOUR;
  assert.ok(P.derive(h, t).stage === D0.stage - 1);
  t = Math.max(t, last + 31 * DAY);  // the old habits are out of the 30-day window by now
  const back = h.concat(Array.from({length: 12}, (_, i) => ({id: 'b' + i, src: 'local', min: 200, commits: 30, at: t + i * DAY})));
  const D = P.derive(back, t + 12 * DAY);
  assert.ok(D.stage >= D0.stage, 'back where it was');
  assert.strictEqual(D.forms[D0.stage], 'vibe', 'the new habits pick the form');
});

test('hunger is the same however the time is split', () => {
  for (const stage of [0, 3, 6, 9, 10]) {
    const S = 0, start = {xp: P.STAGES[stage].xp + 900, stage, floorAt: null};
    const once = Object.assign({}, start), steps = Object.assign({}, start);
    const lostOnce = P.starve(once, S, 0, 120 * DAY);
    let lost = 0; for (let a = 0; a < 120 * DAY; a += 7 * HOUR + 13) lost += P.starve(steps, S, a, Math.min(120 * DAY, a + 7 * HOUR + 13));
    assert.strictEqual(steps.stage, once.stage, `stage from ${stage}`);
    assert.ok(Math.abs(steps.xp - once.xp) < 1e-6 && Math.abs(lost - lostOnce) < 1e-6, `XP from ${stage}: ${steps.xp} vs ${once.xp}`);
  }
});

test('the status line warns before hunger, while it eats, and before a fall', () => {
  const h = daily(40), last = h.at(-1).at;
  const seen = new Set();
  for (let t = last; t < last + 60 * DAY; t += 6 * HOUR) seen.add(P.statusInfo(P.derive(h, t))[0]);
  for (const k of ['asleep', 'starving', 'fading']) assert.ok(seen.has(k), k);
  const D = P.derive(h, last + 5 * DAY);
  assert.match(P.statusLine(D), /^> (asleep · starves in \d+d|starving · −\d+ XP a day)$/);
});

/* ---- the look ---- */
const pet = (stage, extra) => ({stage, count: 5, xp: P.STAGES[stage].xp + 5, affinity: 'github', form: null, mood: 60, energy: 90, rest: 80, mutations: {}, failing: [], ...extra});
// the body under the head: rows from the middle of the screen down (the Z's of a sleeping pet float above)
const cells = (D, theme = 'classic') => new Map([...P.build(D, 13, {theme, reduced: true})].filter(([k]) => k >= 26 * P.GW));
const colorful = b => [...b.values()].filter(c => { const [r, g, bl] = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); return Math.max(r, g, bl) - Math.min(r, g, bl) > 40; }).length;

test('an exhausted pet looks thinner and paler than a fed one, a starving one more so', () => {
  for (const t of P.themes()) for (let st = 1; st <= 10; st++) {
    const fed = cells(pet(st, {energy: 30}), t.id), tired = cells(pet(st, {energy: 10}), t.id), starving = cells(pet(st, {energy: 1, starving: true}), t.id);
    assert.ok(tired.size <= fed.size, `${t.id} ${st}: thinner when exhausted (${fed.size} -> ${tired.size})`);
    assert.ok(starving.size <= tired.size, `${t.id} ${st}: thinner still when starving (${tired.size} -> ${starving.size})`);
    assert.ok(colorful(starving) < colorful(fed), `${t.id} ${st}: colors fade`);
  }
});

test('a fading pet flickers now and then, and holds still under reduced motion', () => {
  const D = pet(5, {energy: 1, starving: true, fading: true}), calm = pet(5, {energy: 1, starving: true});
  const differs = f => [...P.build(D, f, {theme: 'classic'})].sort().join() !== [...P.build(calm, f, {theme: 'classic'})].sort().join();
  assert.ok([0, 1, 2, 24, 25].some(differs));
  assert.ok(![5, 9, 13, 17].some(differs), 'only for a moment');
  assert.strictEqual([...P.build(D, 0, {theme: 'classic', reduced: true})].sort().join(), [...P.build(calm, 0, {theme: 'classic', reduced: true})].sort().join());
});

test('mutations come from the last year: earned again, and gone a year after', () => {
  const run = daily(31, 60, 40), last = run.at(-1).at;   // 31 days in a row, 1240 commits
  const D = P.derive(run, last + DAY);
  assert.deepStrictEqual([D.mutations.shiny, D.mutations.committed, D.mutations.crowned], [true, true, false]);
  const later = P.derive(run, run[0].at + 400 * DAY);
  assert.deepStrictEqual([later.mutations.shiny, later.mutations.committed], [false, false]);
  const big = Array.from({length: 150}, (_, d) => ({id: 'x' + d, src: 'github', min: 240, commits: 8, tests: true, ship: true, at: T0 + d * DAY}));
  assert.ok(P.derive(big, T0 + 150 * DAY).mutations.crowned, 'crowned by XP');
  assert.ok(P.derive(big, T0 + 151 * DAY).year.xp >= P.CROWN_XP);
  assert.strictEqual(later.maxStreak, 31, 'the all-time best streak is still shown');
});
