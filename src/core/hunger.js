/* ---------- hunger: what a pet loses while nobody codes ----------
   derive() replays the history in time order and lets hunger run in the gaps: between one session and the next,
   and after the last one until now. The numbers are HUNGER in rules.js.

   - The pet starts starving once both hold: HUNGER.grace days have passed since the last session, and Energy is down
     to HUNGER.energy. A pet fed well lasts longer: a week of long days keeps it going for about a week.
   - Hunger grows from nothing to full over HUNGER.ramp days. Full hunger eats share × the stage's XP band a day,
     at most cap XP, so every stage up to BYTE empties in about 25 days and the big ones take months.
   - XP never drops under the stage's threshold. The pet sits at the bottom for HUNGER.floor days, then devolves and
     lands HUNGER.fall days of full hunger under the top of the stage below, and hunger goes on from there.
   - All the way down to the egg; the egg only cools (its XP drains to 0) and never breaks.
   - Any session ends it at once. CI fixes add XP but don't feed the pet. */
'use strict';
const {DAY} = require('./util');
const {STAGES, MAX_STAGE, HUNGER} = require('./rules');

// Energy is 100·(1 − e^(−W / 90)), W the weighted minutes: W at the hunger line
const W_LINE = -90 * Math.log(1 - HUNGER.energy / 100);
// XP a day full hunger eats at a stage. The last stage has no band: it loses XP over its threshold at the cap.
const rateOf = st => Math.min(HUNGER.cap, HUNGER.share * (st < MAX_STAGE ? STAGES[st + 1].xp - STAGES[st].xp : Infinity));
// When a pet fed last at `at`, with W weighted minutes right then, starts starving. Energy halves every 24 h.
const starveAt = (at, W) => at + Math.max(HUNGER.grace, W > W_LINE ? Math.log2(W / W_LINE) : 0) * DAY;
// How hungry, 0..1, d days into starving
const hungerAt = d => Math.max(0, Math.min(1, d / HUNGER.ramp));
// Days of full hunger in the first d days of starving (it grows linearly over the ramp), and back
const R = HUNGER.ramp;
const eaten = d => (d <= 0 ? 0 : d < R ? d * d / (2 * R) : d - R / 2);
const eatenInv = e => (e <= 0 ? 0 : e < R / 2 ? Math.sqrt(2 * R * e) : e + R / 2);

/* Moves p = {xp, stage, floorAt} from time a to b (ms) of a spell that began at S. floorAt is when it reached the
   bottom of its stage, so a wait can span calls. fell(at, from, to) hears about each devolution. Returns the XP eaten. */
function starve(p, S, a, b, fell) {
  a = Math.max(a, S);
  let lost = 0;
  for (let guard = 0; a < b && guard < 64; guard++) {
    const base = STAGES[p.stage].xp;
    if (p.xp > base) {
      p.floorAt = null;
      const r = rateOf(p.stage), e0 = eaten((a - S) / DAY), can = (eaten((b - S) / DAY) - e0) * r;
      if (can < p.xp - base) { p.xp -= can; lost += can; break; }
      const t = S + eatenInv(e0 + (p.xp - base) / r) * DAY;
      lost += p.xp - base; p.xp = base; p.floorAt = t; a = Math.max(a, t);
    } else {
      if (p.stage === 0) { p.xp = 0; break; }
      if (p.floorAt == null) p.floorAt = a;
      const at = p.floorAt + HUNGER.floor * DAY;
      if (at > b) break;
      const from = p.stage, land = base - HUNGER.fall * rateOf(from - 1);
      lost += base - land;
      p.stage = from - 1; p.xp = land; p.floorAt = null; a = at;
      if (fell) fell(at, from, p.stage);
    }
  }
  return lost;
}

module.exports = {W_LINE, rateOf, starveAt, hungerAt, eaten, eatenInv, starve};
