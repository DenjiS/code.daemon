/* code.daemon pet engine. GENERATED from src/ by tools/build.cjs: edit src/, then run `npm run build`. */
(function (root) {
'use strict';
const modules = {
'core/util': function (module, require) {
// Small helpers shared by the engine and the renderer.
'use strict';
const DAY = 864e5, HOUR = 36e5;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dayIdx = ms => { const d = new Date(ms); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY); };
// o has its own property k: never one inherited from Object.prototype, like "constructor"
const own = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

module.exports = {DAY, HOUR, clamp, dayIdx, own};
},
'core/rules': function (module, require) {
// The rules of the game: sources, stages, forms, mutations, and the numbers that tune XP.
'use strict';
const SOURCES = [
  {id: 'github', label: 'GitHub', crest: 'Brancher'},
  {id: 'gitlab', label: 'GitLab', crest: 'Pipeliner'},
  {id: 'local', label: 'Local', crest: 'Shell'},
  {id: 'unity', label: 'Unity', crest: 'Builder'},
  {id: 'unreal', label: 'Unreal', crest: 'Shader'},
];
const SRC = Object.fromEntries(SOURCES.map(s => [s.id, s]));
const STAGES = [
  {name: 'EGG',         xp: 0,     body: 'Egg'},
  {name: 'BIT',         xp: 60,    body: 'Slime'},
  {name: 'NIBBLE',      xp: 250,   body: 'Crawler'},
  {name: 'BYTE',        xp: 650,   body: 'Biped'},
  {name: 'WORD',        xp: 1300,  body: 'Kaiju'},
  {name: 'PROCESS',     xp: 2300,  body: 'Runner'},
  {name: 'THREAD',      xp: 3800,  body: 'Wyrm'},
  {name: 'DAEMON',      xp: 5800,  body: 'Imp'},
  {name: 'SERVICE',     xp: 8500,  body: 'Wyvern'},
  {name: 'KERNEL',      xp: 13000, body: 'Dragon'},
  {name: 'SINGULARITY', xp: 30000, body: 'Ascended'},
];
const MAX_STAGE = STAGES.length - 1;
const CREST_STAGE = 2, FORM_STAGE = 4;
const FORMS = {
  core:     {name: 'Core',      rule: 'Balanced habits'},
  guardian: {name: 'Guardian',  rule: 'Tests in 30%+ of sessions: carries a shield'},
  debugger: {name: 'Debugger',  rule: 'Bug fixes in 35%+ of sessions: holds a wrench'},
  owl:      {name: 'Night Owl', rule: '25%+ of sessions end 23:00-05:00: ear tufts, glowing eyes, a moon'},
  shipper:  {name: 'Shipper',   rule: '3+ shipped sessions in 30 days: keeps a crate with a flag'},
  streaker: {name: 'Streaker',  rule: '7+ day streak when it evolved: trails fire'},
  polyglot: {name: 'Polyglot',  rule: '4+ sources in 30 days: striped in their colors'},
  vibe:     {name: 'Vibecoder', rule: '10+ commits per session on average: headphones and floating notes'},
};
// Mutations look at the last MUTATION_DAYS only: earned again every year, lost a year after the last time.
const MUTATION_DAYS = 365;
const MUTATIONS = {
  shiny:   {name: 'Shiny',   rule: 'Coded 30 days in a row within a year'},
  cursed:  {name: 'Cursed',  rule: 'Coded on a Friday the 13th within a year'},
  crowned: {name: 'Crowned', rule: '10,000 XP earned within a year'},
  committed: {name: 'Committed', rule: '1000 commits within a year'},
};
const CROWN_XP = 10000, COMMITTED = 1000;
const PET = {github: '#8E9BFF', gitlab: '#FF9B5E', local: '#4ADBC3', unity: '#B4E15C', unreal: '#E78CF7', none: '#C7CFDA'};
const FIX_XP = 15;
const DAY_SOFT_CAP = 90, OVER_CAP_RATE = 0.15;
// late night, 23:00-05:00 local time: the Night Owl form and REST both count it
const isLate = ms => { const h = new Date(ms).getHours(); return h >= 23 || h < 5; };

/* Hunger: a pet nobody codes for loses XP, and one left at the bottom of its stage devolves (core/hunger.js).
   Tuned so a week off costs next to nothing, a month off costs a week or two of coding, and only months of silence
   take a pet back down several stages: every stage to BYTE empties in about 25 days, bigger ones take months. */
const HUNGER = {
  grace: 3,      // days: never hungry sooner than this after the last session...
  energy: 5,     // ...and not before Energy is down to this
  ramp: 7,       // days for hunger to grow from nothing to full
  share: 0.04,   // full hunger eats this share of the stage's XP band a day...
  cap: 25,       // ...but never more than this many XP a day
  floor: 3,      // days at the bottom of a stage before the pet devolves
  fall: 2,       // a devolved pet lands this many days of full hunger below the top of the stage under it
};

module.exports = {SOURCES, SRC, STAGES, MAX_STAGE, CREST_STAGE, FORM_STAGE, FORMS, MUTATIONS, PET, FIX_XP, DAY_SOFT_CAP, OVER_CAP_RATE, HUNGER, MUTATION_DAYS, CROWN_XP, COMMITTED, isLate};
},
'core/xp': function (module, require) {
// XP math: what one session is worth, the streak bonus and the daily soft cap.
'use strict';
const {DAY_SOFT_CAP, OVER_CAP_RATE} = require('core/rules');

// One session's XP before streak and daily cap. Long sessions and commit bursts grow slowly on purpose.
const sessionXP = s => 12 * Math.log(1 + Math.min(s.min, 480) / 20) + 7 * Math.sqrt(Math.min(s.commits || 0, 50))
  + (s.tests ? 8 : 0) + (s.bug ? 6 : 0) + (s.ship ? 15 : 0);
// streak multiplier: +3% per day in a row, up to +30%
const mult = st => 1 + 0.03 * Math.min(st, 10);
// XP over DAY_SOFT_CAP in one day counts at OVER_CAP_RATE
const softCap = v => v <= DAY_SOFT_CAP ? v : DAY_SOFT_CAP + (v - DAY_SOFT_CAP) * OVER_CAP_RATE;

module.exports = {sessionXP, mult, softCap};
},
'core/sessions': function (module, require) {
/* ---------- commits -> sessions ---------- */
'use strict';
const {HOUR, clamp} = require('core/util');
const {SRC} = require('core/rules');

// Commit titles that mark a session as bug fixing, testing or shipping.
const RX_BUG = /\b(fix(e[sd])?|bug(fix)?|hotfix|patch(ed)?|resolve[sd]?)\b/i;
const RX_TEST = /\b(tests?|testing|specs?|e2e)\b/i;
const RX_REL = /\b(release[sd]?|bump(ed)? version|v\d+\.\d+(\.\d+)?)\b/i;
// a session the engine can count
const valid = s => !!(s && SRC[s.src] && Number.isFinite(s.min) && s.min > 0 && Number.isFinite(s.at));
const SESSION_GAP = 2 * HOUR;  // commits closer than this join one session
// Same author time and title = the same commit, rebased or cherry-picked onto another branch.
const commitKey = (t, msg) => t + '|' + String(msg || '').trim();

/* ---------- rescans ----------
   A rescan re-reads commits from `since` and rebuilds the sessions after it. If `since` fell inside a session,
   the rebuilt one would only keep the commits after `since`, and the start of the session would be lost for good.
   So the boundary moves back to the start of any session it touches (or that ends less than SESSION_GAP before it). */
const sessionStart = s => Number.isFinite(s.first) ? s.first : s.at - Math.max(0, (s.min || 0) - 30) * 6e4;
function rescanFrom(list, since) {
  for (let moved = true; moved;) {
    moved = false;
    for (const s of list || []) {
      if (!s || !Number.isFinite(s.at) || s.at < since - SESSION_GAP) continue;
      const first = sessionStart(s);
      if (Number.isFinite(first) && first < since) { since = first; moved = true; }
    }
  }
  return since;
}

// Unity and Unreal projects, told apart by the files at the repo root
function detectKind(entries) {
  const dirs = new Set(entries.filter(e => e.dir).map(e => e.name));
  if (entries.some(e => !e.dir && /\.uproject$/i.test(e.name))) return 'unreal';
  if (dirs.has('ProjectSettings') && dirs.has('Assets')) return 'unity';
  return null;
}
function toSessions(repo, commits, releases, overrides) {
  commits = commits.slice().sort((a, b) => a.t - b.t);
  const groups = [];
  let g = null;
  for (const c of commits) {
    if (g && c.t - g.last <= SESSION_GAP) { g.last = c.t; g.n++; g.msgs.push(c.msg); }
    else { g = {first: c.t, last: c.t, n: 1, oid: c.oid, msgs: [c.msg]}; groups.push(g); }
  }
  for (const r of releases || []) { let best = null; for (const x of groups) if (r >= x.first - HOUR && r <= x.last + 12 * HOUR) best = x; if (best) best.rel = true; }
  const src = (overrides && overrides[repo.key]) || repo.kind;
  return groups.map(x => ({
    id: repo.key + '@' + String(x.oid).slice(0, 12), prov: repo.prov, repo: repo.key, kind: repo.kind, src, auto: true, sample: false,
    note: repo.name, commits: x.n, min: clamp(Math.round((x.last - x.first) / 6e4) + 30, 15, 480),
    tests: x.msgs.some(m => RX_TEST.test(m)), bug: x.msgs.some(m => RX_BUG.test(m)), ship: !!x.rel || x.msgs.some(m => RX_REL.test(m)),
    at: x.last, first: x.first,
  }));
}

module.exports = {SESSION_GAP, commitKey, sessionStart, rescanFrom, valid, detectKind, toSessions};
},
'core/forms': function (module, require) {
/* ---------- forms ---------- */
'use strict';
const {DAY, dayIdx} = require('core/util');
const {isLate} = require('core/rules');

// Each trait's score against its own threshold (1 = qualifies), from the 30 days before t. No scores below 3 sessions.
function traitScores(seen, t) {
  const w = seen.filter(s => s.at <= t && t - s.at < 30 * DAY);
  if (w.length < 3) return {n: w.length, score: null};
  const n = w.length, share = f => w.filter(f).length / n;
  const days = new Set(w.map(s => dayIdx(s.at)));
  let streak = 0; const td = dayIdx(t); while (days.has(td - streak)) streak++;
  const score = {
    guardian: share(s => s.tests) / 0.30,
    debugger: share(s => s.bug) / 0.35,
    owl: share(s => isLate(s.at)) / 0.25,
    shipper: w.filter(s => s.ship).length / 3,
    streaker: streak / 7,
    polyglot: new Set(w.map(s => s.src)).size / 4,
    vibe: (w.reduce((a, s) => a + (s.commits || 0), 0) / n) / 10,
  };
  return {n, score};
}
function traitAt(seen, t) {
  const {score} = traitScores(seen, t);
  if (!score) return 'core';
  let best = 'core', bv = 1;
  for (const k in score) if (score[k] >= bv && score[k] > (score[best] || 0)) { best = k; bv = score[k]; }
  return best;
}

module.exports = {traitScores, traitAt};
},
'core/hunger': function (module, require) {
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
const {DAY} = require('core/util');
const {STAGES, MAX_STAGE, HUNGER} = require('core/rules');

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
},
'core/derive': function (module, require) {
/* ---------- derive everything from sessions ---------- */
'use strict';
const {DAY, HOUR, clamp, dayIdx} = require('core/util');
const {STAGES, MAX_STAGE, FORM_STAGE, DAY_SOFT_CAP, HUNGER, MUTATION_DAYS, CROWN_XP, COMMITTED, isLate} = require('core/rules');
const {sessionXP, mult, softCap} = require('core/xp');
const {valid} = require('core/sessions');
const {traitAt} = require('core/forms');
const {rateOf, starveAt, hungerAt, starve} = require('core/hunger');

function derive(list, now, extra) {
  extra = extra || {};
  const ci = extra.ci || {};
  const events = (extra.events || []).filter(e => e && Number.isFinite(e.at) && Number.isFinite(e.xp));
  const sorted = list.filter(valid).sort((a, b) => a.at - b.at);
  const items = sorted.map(s => ({t: s.at, s})).concat(events.map(e => ({t: e.at, e}))).sort((a, b) => a.t - b.t);
  const days = new Set(), dayRaw = new Map(), gain = {}, mults = {}, src30 = {}, srcAll = {}, forms = {}, seen = [];
  let commits = 0, maxStreak = 0, fixes = 0, peak = 0;
  // The pet as the replay goes: XP, stage and, while it waits at the bottom of a stage, since when (core/hunger.js).
  const pet = {xp: 0, stage: 0, floorAt: null};
  // fed: the last session, fedW: weighted minutes right after it, S: when the pet starts starving, at: replayed up to
  let fed = null, fedW = 0, S = Infinity, at = -Infinity, spell = null;
  const losses = [];  // hunger spells: {id, at, end, xp, from, to, falls: [{at, from, to}]}
  const famish = t => {  // let hunger run up to t
    if (t > S && t > at) {
      if (!spell) { spell = {id: 'hunger:' + Math.round(S), at: S, end: S, xp: 0, from: pet.stage, to: pet.stage, falls: []}; losses.push(spell); }
      spell.xp += starve(pet, S, Math.max(at, S), t, (when, from, to) => { delete forms[from]; spell.falls.push({at: when, from, to}); });
      spell.end = t; spell.to = pet.stage;
    }
    at = Math.max(at, t);
  };
  for (const it of items) {
    famish(it.t);
    if (it.s) {
      const s = it.s, d = dayIdx(s.at);
      days.add(d);
      let st = 0; while (days.has(d - st)) st++;
      if (st > maxStreak) maxStreak = st;
      const before = dayRaw.get(d) || 0, raw = sessionXP(s) * mult(st);
      dayRaw.set(d, before + raw);
      const g = Math.max(1, Math.round(softCap(before + raw) - softCap(before)));
      gain[s.id] = g; mults[s.id] = mult(st); pet.xp += g; commits += s.commits || 0;
      srcAll[s.src] = (srcAll[s.src] || 0) + g;
      if (now - s.at < 30 * DAY) src30[s.src] = (src30[s.src] || 0) + g;
      seen.push(s);
      // a session feeds the pet: hunger is over, and the next spell can only start a while after this one
      fedW = (fed === null ? 0 : fedW * Math.pow(0.5, (s.at - fed) / DAY)) + s.min;
      fed = s.at; S = starveAt(fed, fedW); spell = null; pet.floorAt = null;
    } else {
      // CI fixes share the daily soft cap with sessions, so a flapping build can't carry the pet.
      const d = dayIdx(it.e.at), before = dayRaw.get(d) || 0;
      dayRaw.set(d, before + it.e.xp);
      const g = Math.max(1, Math.round(softCap(before + it.e.xp) - softCap(before)));
      pet.xp += g; gain[it.e.id] = g; fixes++;
    }
    while (pet.stage < MAX_STAGE && pet.xp >= STAGES[pet.stage + 1].xp) { pet.stage++; if (pet.stage >= FORM_STAGE) forms[pet.stage] = traitAt(seen, it.t); }
    if (pet.stage > peak) peak = pet.stage;
  }
  famish(now);
  const stage = pet.stage, xp = Math.floor(pet.xp + 1e-6);
  const starving = fed !== null && now >= S;
  const hunger = starving ? hungerAt((now - S) / DAY) : 0;
  const fallAt = starving && stage > 0 && pet.floorAt != null ? pet.floorAt + HUNGER.floor * DAY : null;
  const today = dayIdx(now);
  const start = days.has(today) ? today : (days.has(today - 1) ? today - 1 : null);
  let streak = 0; if (start !== null) while (days.has(start - streak)) streak++;
  let W = 0; for (const s of sorted) W += s.min * Math.pow(0.5, Math.max(0, (now - s.at) / HOUR) / 24);
  const energy = Math.round(100 * (1 - Math.exp(-W / 90)));
  const week = sorted.filter(s => now - s.at < 7 * DAY);
  const variety = new Set(week.map(s => s.src)).size;
  const quality = week.filter(s => s.tests || s.bug).length;
  const mood = clamp(Math.round((week.length ? 10 : 0) + streak * 10 + variety * 8 + Math.min(20, quality * 4)), 0, 100);
  const late = week.filter(s => isLate(s.at)).length;
  const rest = clamp(100 - 18 * late - 10 * week.filter(s => s.min >= 240).length, 0, 100);
  // mutations, from the last year: the longest run of coding days, a Friday the 13th, commits
  const year = sorted.filter(s => now - s.at < MUTATION_DAYS * DAY), yDays = new Set(year.map(s => dayIdx(s.at)));
  let yStreak = 0; for (const d of yDays) if (!yDays.has(d - 1)) { let n = 1; while (yDays.has(d + n)) n++; if (n > yStreak) yStreak = n; }
  const yCommits = year.reduce((a, s) => a + (s.commits || 0), 0);
  // XP earned in the year, before hunger: sessions and fixed builds
  const yXP = year.reduce((a, s) => a + (gain[s.id] || 0), 0) + events.filter(e => now - e.at < MUTATION_DAYS * DAY).reduce((a, e) => a + (gain[e.id] || 0), 0);
  const fri13 = year.some(s => { const dt = new Date(s.at); return dt.getDay() === 5 && dt.getDate() === 13; });
  const pick = o => { let best = null, bv = 0; for (const k in o) if (o[k] > bv) { bv = o[k]; best = k; } return best; };
  const affinity = pick(src30) || pick(srcAll);
  const srcs30 = Object.keys(src30).sort((a, b) => src30[b] - src30[a]);

  // build health: repos you touched in the last 14 days whose latest CI run failed (-45 each, -15 more after a day)
  const recent = new Set(sorted.filter(s => s.repo && now - s.at < 14 * DAY).map(s => s.repo));
  const tracked = Object.keys(ci).filter(k => ci[k] && ci[k].s && recent.has(k));
  const failing = tracked.filter(k => ci[k].s === 'fail');
  const longFail = failing.filter(k => now - (ci[k].since || ci[k].at || now) > DAY).length;
  const health = clamp(100 - 45 * failing.length - 15 * longFail, 0, 100);

  return {
    sorted, gain, mults, xp, commits, streak, maxStreak, codedToday: days.has(today), days, dayRaw, energy, mood, rest, late, variety,
    affinity, srcs30, stage, forms, form: stage >= FORM_STAGE ? (forms[stage] || 'core') : null,
    year: {streak: yStreak, commits: yCommits, xp: yXP, fri13},
    mutations: {shiny: yStreak >= 30, cursed: fri13, crowned: yXP >= CROWN_XP, committed: yCommits >= COMMITTED},
    health, failing, ciTracked: tracked.length, ciPassing: tracked.filter(k => ci[k].s === 'pass').length, fixes,
    sick: failing.length > 0, critical: health < 30,
    last: sorted.length ? sorted[sorted.length - 1].at : null, count: sorted.length, now,
    // hunger: when it starts (or started) for this gap, how hungry now 0..1, XP a day it eats now,
    // when the pet devolves if it sits at the bottom of its stage, and every spell that cost XP
    peak, starveAt: fed === null ? null : S, starving, hunger, drain: starving && pet.xp > STAGES[stage].xp ? hunger * rateOf(stage) : 0,
    fading: fallAt !== null, fallAt, losses: losses.filter(l => l.xp >= 0.5 || l.falls.length).map(l => Object.assign({}, l, {xp: Math.round(l.xp), ongoing: l === spell && starving})),
  };
}
// XP a new session would earn right now, given what D already counted today.
function gainFor(D, s) {
  const d = dayIdx(s.at), days = new Set(D.days); days.add(d);
  let st = 0; while (days.has(d - st)) st++;
  const before = (D.dayRaw && D.dayRaw.get(d)) || 0, raw = sessionXP(s) * mult(st);
  return {xp: Math.max(1, Math.round(softCap(before + raw) - softCap(before))), mult: mult(st), capped: before + raw > DAY_SOFT_CAP, base: Math.round(sessionXP(s))};
}

// What the status line should say, as a key and its values: the first of these that applies.
// statusLine() words it in English (profile card); the widget words it in the chosen language.
const daysTo = (D, t) => { const d = Math.ceil((t - D.now) / DAY); return Number.isFinite(d) ? Math.max(1, d) : 1; };
function statusInfo(D) {
  if (!D.count) return ['empty', {}];
  if (D.stage === 0) return D.starving ? ['cooling', {}] : ['incubating', {n: STAGES[1].xp - D.xp}];
  if (D.fading) return ['fading', {n: daysTo(D, D.fallAt), stage: D.stage - 1}];
  if (D.starving) return ['starving', {n: Math.max(1, Math.round(D.drain))}];
  if (D.failing.length) return ['sick', {repo: D.failing[0], more: D.failing.length - 1}];
  if (D.energy < 20) return ['asleep', {n: daysTo(D, D.starveAt)}];
  if (D.rest < 50) return ['tired', {n: D.late}];
  if (D.streak >= 2 && !D.codedToday) return ['risk', {n: D.streak}];
  if (D.stage < MAX_STAGE) return ['next', {n: STAGES[D.stage + 1].xp - D.xp, stage: D.stage + 1}];
  return ['max', {n: D.xp, stage: MAX_STAGE}];
}
function statusLine(D, opts) {
  opts = opts || {};
  const name = opts.label || (k => String(k || '').replace(/^g[hl]:/, ''));
  const [k, v] = statusInfo(D);
  switch (k) {
    case 'empty': return opts.empty || '> egg found. waiting for commits';
    case 'incubating': return `> incubating · ${v.n} XP to hatch`;
    case 'cooling': return '> egg is cooling · feed it a commit';
    case 'fading': return `> fading · back to ${STAGES[v.stage].name.toLowerCase()} in ${v.n}d`;
    case 'starving': return `> starving · −${v.n} XP a day`;
    case 'sick': return `> sick · CI failing in ${name(v.repo)}${v.more ? ` +${v.more}` : ''}`;
    case 'asleep': return `> asleep · starves in ${v.n}d`;
    case 'tired': return `> tired · ${v.n} late night${v.n === 1 ? '' : 's'} this week`;
    case 'risk': return `> streak ${v.n}d at risk · code today`;
    case 'next': return `> ${v.n} XP to ${STAGES[v.stage].name.toLowerCase()}`;
  }
  return `> singularity · ${v.n} XP`;
}

module.exports = {derive, gainFor, statusInfo, statusLine};
},
'core/ci': function (module, require) {
/* ---------- CI ---------- */
'use strict';
const {DAY} = require('core/util');
const {FIX_XP} = require('core/rules');

function ciFromRollup(state) {
  if (state === 'SUCCESS') return 'pass';
  if (state === 'FAILURE' || state === 'ERROR') return 'fail';
  if (state === 'PENDING' || state === 'EXPECTED') return 'run';
  return null;
}
function ciFromPipeline(status) {
  if (status === 'success') return 'pass';
  if (status === 'failed') return 'fail';
  if (['running', 'pending', 'created', 'preparing', 'waiting_for_resource', 'scheduled'].indexOf(status) >= 0) return 'run';
  return null;
}
// Merges freshly observed CI results into the stored map. A red -> green change on the same branch earns a
// "build fixed" event, at most once per repo per day. Moving from a red branch to a green one is not a fix.
function updateCI(prev, observed, now) {
  const ci = Object.assign({}, prev || {}), events = [];
  for (const key in observed) {
    const o = observed[key], old = ci[key];
    if (!o || !o.s) { delete ci[key]; continue; }
    const at = o.at || now, ref = o.ref || undefined;
    const p = old && (!old.ref || !ref || old.ref === ref) ? old : null;  // entries saved before refs were tracked count as the same branch
    const lastFix = (old && old.lastFix) || undefined;
    const wasRed = !!(p && (p.s === 'fail' || p.wasFail));
    if (o.s === 'fail') ci[key] = {s: 'fail', at, ref, since: p && p.s === 'fail' ? p.since : at, lastFix};
    else if (o.s === 'run') ci[key] = {s: 'run', at, ref, wasFail: wasRed, since: wasRed ? p.since : undefined, lastFix};
    else {
      const fix = wasRed && !(lastFix && at - lastFix < DAY);
      ci[key] = {s: 'pass', at, ref, lastFix: fix ? at : lastFix};
      if (fix) events.push({id: 'fix:' + key + ':' + at, kind: 'fix', repo: key, at, xp: FIX_XP});
    }
  }
  return {ci, events};
}

module.exports = {ciFromRollup, ciFromPipeline, updateCI};
},
'core/github': function (module, require) {
/* ---------- GitHub (GraphQL) ---------- */
'use strict';
const {ciFromRollup} = require('core/ci');
const {commitKey, detectKind, toSessions} = require('core/sessions');

const Q_REPO = `query($owner:String!,$name:String!,$since:GitTimestamp!,$uid:ID!){repository(owner:$owner,name:$name){isPrivate object(expression:"HEAD:"){... on Tree{entries{name type}}} refs(refPrefix:"refs/heads/",first:20,orderBy:{field:TAG_COMMIT_DATE,direction:DESC}){nodes{name target{... on Commit{committedDate statusCheckRollup{state} history(first:100,since:$since,author:{id:$uid}){pageInfo{hasNextPage endCursor} nodes{oid authoredDate messageHeadline}}}}}} releases(first:10,orderBy:{field:CREATED_AT,direction:DESC}){nodes{publishedAt}}}}`;
const Q_HIST = `query($owner:String!,$name:String!,$ref:String!,$since:GitTimestamp!,$uid:ID!,$cursor:String){repository(owner:$owner,name:$name){ref(qualifiedName:$ref){target{... on Commit{history(first:100,after:$cursor,since:$since,author:{id:$uid}){pageInfo{hasNextPage endCursor} nodes{oid authoredDate messageHeadline}}}}}}}`;
const HISTORY_PAGES = 30;  // per branch, 100 commits each
async function scanGitHubRepo(gql, nameWithOwner, since, uid, overrides) {
  const parts = nameWithOwner.split('/');
  const vars = {owner: parts[0], name: parts[1], since: new Date(since).toISOString(), uid};
  const d = await gql(Q_REPO, vars);
  const r = d && d.repository;
  if (!r) return null;
  const entries = ((r.object && r.object.entries) || []).map(e => ({name: e.name, dir: e.type === 'tree'}));
  const kind = detectKind(entries) || 'github';
  const seen = new Map(), oids = new Set();
  const add = nodes => {
    let fresh = 0;
    for (const c of nodes) {
      if (!c || oids.has(c.oid)) continue;
      oids.add(c.oid); fresh++;
      const t = Date.parse(c.authoredDate), msg = c.messageHeadline || '', key = commitKey(t, msg);
      if (!seen.has(key)) seen.set(key, {oid: c.oid, t, msg});
    }
    return fresh;
  };
  let head = null;
  const more = [];
  for (const ref of (r.refs && r.refs.nodes) || []) {
    const t = ref && ref.target;
    if (!t) continue;
    const h = t.history || {}, nodes = h.nodes || [];
    const fresh = add(nodes);
    if (fresh && h.pageInfo && h.pageInfo.hasNextPage && ref.name) more.push({ref: 'refs/heads/' + ref.name, cursor: h.pageInfo.endCursor});
    const at = Date.parse(t.committedDate);
    if (nodes.length && Number.isFinite(at) && (!head || at > head.at)) head = {at, ref: ref.name, s: ciFromRollup(t.statusCheckRollup && t.statusCheckRollup.state)};
  }
  // Older pages. Branches share most of their history, so a branch stops as soon as a page brings nothing new.
  for (const b of more) {
    let cursor = b.cursor;
    for (let page = 1; page < HISTORY_PAGES && cursor; page++) {
      const x = await gql(Q_HIST, Object.assign({}, vars, {ref: b.ref, cursor}));
      const h = x && x.repository && x.repository.ref && x.repository.ref.target && x.repository.ref.target.history;
      if (!h || !add(h.nodes || [])) break;
      cursor = h.pageInfo && h.pageInfo.hasNextPage ? h.pageInfo.endCursor : null;
    }
  }
  const commits = [...seen.values()].filter(c => Number.isFinite(c.t) && c.t >= since);
  if (!commits.length) return null;
  const rel = ((r.releases && r.releases.nodes) || []).map(x => Date.parse(x.publishedAt)).filter(Number.isFinite);
  const repo = {key: 'gh:' + nameWithOwner, name: nameWithOwner, prov: 'gh', kind, private: !!r.isPrivate, last: Math.max(...commits.map(c => c.t))};
  return {repo, sessions: toSessions(repo, commits, rel, overrides), ci: head && head.s ? {s: head.s, at: head.at, ref: head.ref} : null};
}

module.exports = {Q_REPO, Q_HIST, scanGitHubRepo};
},
'render/colors': function (module, require) {
// Accent colors every theme's overlays share (forms, crests, status marks), and color math.
'use strict';
const C = {steel: '#A9B8C9', steelDark: '#5C6B7C', white: '#FFFFFF', wood: '#B7834C', woodDark: '#7A5230', moon: '#E8E4C9',
  red: '#FF5A3C', orange: '#FF9B3C', yellow: '#FFE27A', gold: '#FFD24A', gem: '#FF5A7A', sick: '#8FA08A', drop: '#7FC8FF',
  alarm: '#FF5A5A', curse: '#FF4D4D', spark: '#FFF6C8', horn: '#ECE4CF', tongue: '#FF6F7D', note: '#F5F0FF', eyeWhite: '#F2F4F8', frost: '#A9C6DE'};
const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
// the grey of the same brightness
const gray = c => { const [r, g, b] = hex(c), v = Math.round(0.3 * r + 0.59 * g + 0.11 * b).toString(16).padStart(2, '0'); return '#' + v + v + v; };

module.exports = {C, mix, gray};
},
'render/raster': function (module, require) {
/* ======================================================================
   Raster: the 64 x 48 cell screen. A shape is a Set of cell indexes (K(x, y)); paint() shades it into a buffer.
   ====================================================================== */
'use strict';
const {clamp} = require('core/util');
const {mix} = require('render/colors');

const GW = 64, GH = 48, G = 41;  // G = ground row the feet stand on
const K = (x, y) => y * GW + x;

/* raster primitives on a Set of cell indexes */
function px(m, x, y) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < GW && y < GH) m.add(K(x, y)); }
function ellipse(m, cx, cy, rx, ry) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1.02) px(m, x, y);
    }
}
function ring(m, cx, cy, rx, ry, w) {
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry, d = Math.sqrt(dx * dx + dy * dy);
      if (Math.abs(d - 1) * Math.min(rx, ry) <= w / 2) px(m, x, y);
    }
}
function poly(m, pts) {
  const ys = pts.map(p => p[1]);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= y && by > y) || (by <= y && ay > y)) xs.push(ax + (y - ay) / (by - ay) * (bx - ax));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.round(xs[i]); x <= Math.round(xs[i + 1]); x++) px(m, x, y);
  }
}
// tapered thick line from (x0,y0,r0) to (x1,y1,r1)
function limb(m, x0, y0, x1, y1, r0, r1) {
  if (r1 === undefined) r1 = r0;
  const R = Math.max(r0, r1), dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1;
  for (let y = Math.floor(Math.min(y0, y1) - R); y <= Math.ceil(Math.max(y0, y1) + R); y++)
    for (let x = Math.floor(Math.min(x0, x1) - R); x <= Math.ceil(Math.max(x0, x1) + R); x++) {
      const t = clamp(((x - x0) * dx + (y - y0) * dy) / L2, 0, 1);
      const qx = x0 + t * dx, qy = y0 + t * dy, r = r0 + (r1 - r0) * t;
      if ((x - qx) * (x - qx) + (y - qy) * (y - qy) <= r * r + 0.15) px(m, x, y);
    }
}
// smooth tapered chain through points [[x,y,r],...]
function chain(m, pts) { for (let i = 0; i + 1 < pts.length; i++) limb(m, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], pts[i][2], pts[i + 1][2]); }
// cut a polygon out of a shape
function carve(m, pts) { const t = new Set(); poly(t, pts); for (const k of t) m.delete(k); }

// draw one shaded part: top edge lit, bottom and right edges shaded
function paint(put, m, color, screen, extra, glow) {
  const sh = mix(color, screen, 0.45), hi = mix(color, '#ffffff', 0.45);
  for (const k of m) {
    const x = k % GW, y = (k / GW) | 0;
    let c = color;
    if (glow) c = color;
    else if (!m.has(k + GW)) c = sh;
    else if (!m.has(k - GW)) c = hi;
    else if (!m.has(k + 1)) c = sh;
    else { const e = extra && extra(x, y); if (e) c = e; }
    put(x, y, c);
  }
}

module.exports = {GW, GH, G, K, px, ellipse, ring, poly, limb, chain, carve, paint};
},
'render/themes': function (module, require) {
/* ---------- theme registry ----------
   A theme is one file in src/themes/ that exports one object; src/index.js registers it with defineTheme(),
   and the picker lists themes in that order. Every theme draws its creatures from shapes, frame by frame.

     id        lowercase letters, digits and dashes; the saved setting and PET_THEME use it
     name      English name (translations: 'theme.<id>' and 'body.<id>.<stage>' in ui/i18n/*.js)
     accent    color of its chip in the theme picker (optional)
     screen, dot   its own screen and dot-grid colors (optional; otherwise the widget's)
     bodies    11 creature names, one per stage (optional; otherwise STAGES[st].body)

     plans(st, f, mo)  the creature for stage st at frame f, moving as mo says (the motion channels of the playing clips,
                       pose.js: bob, walk, flap, sway, alt, phase, rock, blink, look; and hatch, has, sleeping). Returns a figure {parts, eyes, mouth, a, main?, decor?}:
                         parts  shapes in drawing order, from partList() in figure.js: part(role, {zone, color, pattern, flat})
                                role picks the shading: body, limb, far, belly, membrane, horn, core, eyeWhite.
                                color: its own color instead of the role's, or skin => color to derive it from the skin
                                (Succubus: hair and outfit follow the affinity); pattern(x, y): ornament color or null;
                                flat: no shading; zone: what a click there touches (head, body, arm, legs, tail, wing, egg).
                         eyes   [{x, y, w, h}] pixel eyes (optional glow, slit, spark), or one {visor: true}
                         mouth  {x, y, w} with optional color (lips), fangs, tooth, teeth (a color), tongue
                         a      anchors: head (top of the head), side, hold (hand), rear, cube (Unity crest), box [x0, y0, x1, y1],
                                float: true for flyers. Any left out are placed around the parts' bounding box.
                         main   the creature's own body color (otherwise the affinity color)
                         decor(ctx)  extras drawn over the face for this stage (decor.js, egg.js have some)
     face(ctx)  draws the eyes and mouth itself, instead of the default pixel face (Derpy's googly eyes)
     drawsEgg   plans() draws stage 0 too (otherwise the default egg is used)
     reacts     answers clicks: its parts carry zones (see reactions.js)
     clips      its own versions of clips, by name (see clips.js), e.g. {pat: {len: 12, face: 'joy', fx: 'hearts'}}

   ctx, the context every layer and hook gets, is described in build.js. */
'use strict';
const {STAGES} = require('core/rules');

const DEFAULT_THEME = 'classic';
const registry = new Map();

function defineTheme(theme) {
  const fail = why => { throw new Error(`code.daemon theme "${theme && theme.id}": ${why}`); };
  if (!theme || typeof theme.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(theme.id)) fail('id must be lowercase letters, digits and dashes');
  if (registry.get(theme.id) === theme) return theme;  // the same module registered twice
  if (registry.has(theme.id)) fail('a theme with this id is already defined');
  if (typeof theme.name !== 'string' || !theme.name) fail('name is missing');
  if (typeof theme.plans !== 'function') fail('plans(st, f, mo) is missing');
  if (theme.face !== undefined && typeof theme.face !== 'function') fail('face must be a function');
  if (theme.bodies && theme.bodies.length !== STAGES.length) fail(`bodies needs ${STAGES.length} names, one per stage`);
  registry.set(theme.id, theme);
  return theme;
}

// All defined themes, in picker order.
const themes = () => [...registry.values()];
const hasTheme = id => typeof id === 'string' && registry.has(id);
// Unknown ids draw as the default theme, so a stale setting never leaves the screen empty.
const themeOf = id => registry.get(id) || registry.get(DEFAULT_THEME);
const stageBody = (st, id) => (themeOf(id).bodies || [])[st] || STAGES[st].body;
const themeColors = id => { const T = themeOf(id); return T.screen ? {screen: T.screen, dot: T.dot} : null; };

module.exports = {defineTheme, themes, hasTheme, themeOf, stageBody, themeColors};
},
'render/clips': function (module, require) {
/* ---------- clips: animation as data ----------
   A clip says what the creature does over time, as channels. Each channel is a constant, an array indexed by the tick,
   or a function of the tick (one tick = one frame, 8 per second). Channels a clip leaves out keep their default.

     body       ox, oy     shift the whole creature, in cells          (default 0)
                sq         squash it toward the ground, 1 = none     (default 1)
     motion     bob, walk, flap, sway, alt   0 or 1: the phases plans() animate with
                phase      a smooth angle for slithering and floating
                rock       the egg's sideways rock, -1..1
                blink      eyes shut for this frame
                look       which way googly pupils wander, 0..3
     face       face       an eye expression: joy, giggle, wow, look, angry, peek (see face.js)
                mouth      a mouth expression: smile, frown, open, o
     fx         the name of an effect in fx.js, or fx(ctx, t) drawing one over the creature

   A base clip loops for as long as a state lasts (idle, weak, sleep); an event clip plays once on top of it, for len
   ticks, and its channels win. Under reduced motion only the face and fx of an event clip play, and the base is still.
   Themes can replace a clip with their own version: theme.clips = {pat: {...}}. */
'use strict';
const {own} = require('core/util');

// flips between 0 and 1 every n ticks
const toggle = n => t => Math.floor(t / n) & 1;
// -1, 1, -1, 1... for the first n ticks, then 0: a shake
const shake = n => t => (t < n ? (t & 1 ? 1 : -1) : 0);

/* base clips: what the creature does on its own */
const IDLE = {
  loop: true, bob: toggle(4), walk: toggle(4), flap: toggle(4), sway: toggle(8), alt: toggle(2), phase: t => t * 0.4,
  look: t => Math.floor(t / 4) & 3,
  blink: t => t % 41 < 1 || t % 113 === 60,                                  // twice in a while, out of step
  rock: t => { const w = t % 48 - 43; return w > 0 ? [0, 1, -1, 1, 0][w] : 0; },  // an egg rocks every 6 seconds
};
const BASE = {
  idle: IDLE,
  weak: Object.assign({}, IDLE, {bob: 0}),                                   // critical: too weak to bounce
  sleep: Object.assign({}, IDLE, {bob: 0, walk: 0, flap: 0, sway: 0}),
};

/* event clips: reactions to clicks (see reactionFor in reactions.js), the evolution and the devolution */
const CLIPS = {
  pat: {len: 16, face: 'joy', mouth: 'smile', sq: [0.92, 0.88, 0.92, 0.96], fx: 'hearts'},
  tickle: {len: 14, face: 'giggle', mouth: 'open', ox: shake(12), fx: 'sparks'},
  wave: {len: 14, face: 'joy', mouth: 'smile', sway: t => (t >> 1) & 1, fx: 'twinkle'},
  hop: {len: 10, face: t => (t < 7 ? 'wow' : 'joy'), mouth: t => (t < 7 ? 'o' : 'smile'),
    oy: [0, -2, -4, -5, -5, -4, -2, 0, 0, 0], sq: [1, 1, 1, 1, 1, 1, 1, 0.88, 0.95, 1], walk: t => t & 1},
  tail: {len: 12, face: 'wow', mouth: 'o', oy: [-1, -2, -1], sway: t => t & 1, fx: 'exclaim'},
  flutter: {len: 14, face: 'joy', mouth: 'smile', oy: [-1, -2, -3, -3, -3, -3, -3, -3, -2, -2, -1, -1, 0, 0], flap: t => t & 1},
  look: {len: 16, face: 'look', fx: 'question'},
  angry: {len: 20, face: 'angry', mouth: 'frown', ox: shake(10), fx: 'anger'},
  grumpy: {len: 16, face: 'angry', mouth: 'frown', ox: shake(4), fx: 'anger'},
  stir: {len: 12, face: t => (t >= 2 && t < 10 ? 'peek' : null), ox: shake(2), fx: 'drowsy'},
  wobble: {len: 8, ox: [1, -1, 1, -1, 1, 0, 0, 0], fx: 'poke'},
  flinch: {len: 8, face: 'wow', mouth: 'o', ox: shake(4), fx: 'exclaim'},
  // two happy jumps and a burst of stars: the widget plays it when the pet evolves
  evolve: {len: 18, face: t => (t < 14 ? 'joy' : null), mouth: t => (t < 14 ? 'open' : null), flap: t => t & 1,
    oy: [0, -2, -4, -4, -2, 0, 0, -2, -4, -4, -2, 0], sq: [1, 1, 1, 1, 1, 1, 0.88, 1, 1, 1, 1, 1, 0.88, 0.95], fx: 'burst'},
  // a start, a shiver, and it sags while bits of it crumble away: the widget plays it when hunger costs a stage
  devolve: {len: 20, face: t => (t < 8 ? 'wow' : null), mouth: t => (t < 8 ? 'o' : 'frown'), ox: shake(8),
    sq: [1, 1, 1, 0.97, 0.94, 0.91, 0.88, 0.88, 0.88, 0.9, 0.92, 0.94, 0.96, 0.98], fx: 'crumble'},
};

const CHANNELS = ['ox', 'oy', 'sq', 'bob', 'walk', 'flap', 'sway', 'alt', 'phase', 'rock', 'blink', 'look', 'face', 'mouth', 'fx'];
function defineClip(name, clip) {
  const fail = why => { throw new Error(`code.daemon clip "${name}": ${why}`); };
  if (typeof name !== 'string' || !/^[a-z][a-zA-Z0-9-]*$/.test(name)) fail('name must start with a lowercase letter');
  if (!clip || !(clip.len >= 1)) fail('len (ticks) is missing');
  for (const k in clip) if (k !== 'len' && !CHANNELS.includes(k)) fail(`unknown channel "${k}"`);
  CLIPS[name] = clip;
  return clip;
}

// The clip a theme plays under a name: its own version if it has one.
const clipOf = (theme, name) => (theme && theme.clips && own(theme.clips, name) && theme.clips[name]) || (own(CLIPS, name) && CLIPS[name]) || null;

// A channel's value at tick t, or dflt where the clip says nothing.
function channel(clip, key, t, dflt) {
  if (!clip || !own(clip, key)) return dflt;
  const v = clip[key];
  const x = typeof v === 'function' ? v(t) : Array.isArray(v) ? v[t] : v;
  return x === undefined ? dflt : x;
}

module.exports = {BASE, CLIPS, defineClip, clipOf, channel};
},
'render/pose': function (module, require) {
/* ---------- pose: where the creature is in its animation at frame f ----------
   The base clip for its state (idle, weak when CI is critical, sleep) loops on the frame counter; an event clip passed
   as opts.clip = {name, t, ...} (t ticks since it started; n, gx, gy for clicks) plays on top for its len ticks.
   build() and hitTest() both take the pose from here, so clicks land on what is on screen. */
'use strict';
const {clamp} = require('core/util');
const {STAGES, MAX_STAGE} = require('core/rules');
const {themeOf} = require('render/themes');
const {BASE, clipOf, channel} = require('render/clips');

const MOTION = ['bob', 'walk', 'flap', 'sway', 'alt', 'phase', 'rock', 'blink', 'look'];

// Returns {st, sleeping, motion, mo, pose, play, clip, t}:
//   mo     what plans() animate with: the MOTION channels, plus hatch (0..1), has (any sessions), motion, sleeping, mut
//   pose   the whole body: ox, oy, sq, and the face and mouth expressions (null for none)
//   play   the event clip instance playing (opts.clip), clip its definition, t its tick
function pose(D, f, opts, T) {
  const st = Math.min(D.stage, MAX_STAGE), has = D.count > 0, motion = !opts.reduced, mut = D.mutations || {};
  const sleeping = has && st > 0 && D.energy < 20;
  const base = BASE[sleeping ? 'sleep' : D.critical ? 'weak' : 'idle'];
  const clip = opts.clip ? clipOf(T, opts.clip.name) : null, play = clip ? opts.clip : null;
  const t = clip ? clamp(play.t | 0, 0, clip.len - 1) : 0;
  const mo = {hatch: clamp(D.xp / STAGES[1].xp, 0, 1), has, motion, sleeping, mut};
  for (const k of MOTION) mo[k] = motion ? channel(clip, k, t, channel(base, k, f, 0)) : 0;
  const body = {ox: 0, oy: 0, sq: 1, face: channel(clip, 'face', t, null), mouth: channel(clip, 'mouth', t, null)};
  if (motion) { body.ox = channel(clip, 'ox', t, 0); body.oy = channel(clip, 'oy', t, 0); body.sq = channel(clip, 'sq', t, 1); }
  return {st, sleeping, motion, mo, pose: body, play, clip, t};
}

// The clip a theme (by id) plays under a name, for the widget to know how long it lasts.
const clipFor = (themeId, name) => clipOf(themeOf(themeId), name);

module.exports = {pose, clipFor};
},
'render/surface': function (module, require) {
// The surface one frame is drawn on: a Map(cell index -> color), and a transform a click reaction uses to move or
// squash the creature (ox, oy, sq toward the ground row). put() draws through the transform, put0() on the fixed screen.
'use strict';
const {GW, GH, G, K} = require('render/raster');

function surface() {
  const buf = new Map(), t = {ox: 0, oy: 0, sq: 1};
  const put0 = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < GW && y < GH) buf.set(K(x, y), c); };
  const put = (x, y, c) => put0(x + t.ox, (t.sq === 1 ? y : G - (G - y) * t.sq) + t.oy, c);
  // rows of characters, each looked up in colors; characters without a color are transparent
  const sprite = (rows, x0, y0, colors) => rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const c = colors[row[i]]; if (c) put(x0 + i, y0 + j, c); } });
  const move = (ox, oy, sq) => { t.ox = ox; t.oy = oy; t.sq = sq; };
  return {buf, put, put0, sprite, move, transform: t};
}

module.exports = {surface};
},
'render/figure': function (module, require) {
/* ---------- figure: what a drawn theme's plans() returns ----------
   {parts, eyes, mouth, a, main?, decor?}, see the theme contract in themes.js. partList() gives plans() its parts list;
   withAnchors() fills in the anchors a theme left out. */
'use strict';
const {G, GW} = require('render/raster');

// parts: the shapes in drawing order. part(role, {zone, color, pattern, flat}) adds one and returns its Set of cells.
function partList() {
  const parts = [];
  const part = (role, opts) => { const m = new Set(); parts.push(Object.assign({m, role}, opts)); return m; };
  return {parts, part};
}

// Anchors from the parts' bounding box, for any a theme leaves out: the box itself, the top of the head at its
// top center, the hand and side at its left edge, the rear at its left middle and the Unity cube up and to the right.
function withAnchors(a, parts) {
  a = a || {};
  if (a.box && a.head && a.side && a.hold && a.rear && a.cube) return a;
  let box = a.box;
  if (!box) {
    let x0 = GW, y0 = G, x1 = 0, y1 = 0;
    for (const p of parts) for (const k of p.m) { const x = k % GW, y = (k / GW) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    box = x1 >= x0 ? [x0, y0, x1, Math.max(y1, a.float ? y1 : G)] : [24, G - 16, 40, G];
  }
  const [x0, y0, x1, y1] = box, cx = Math.round((x0 + x1) / 2), cy = Math.round((y0 + y1) / 2);
  return Object.assign({box, head: [cx, y0], side: [x0 - 3, cy], hold: [x0 - 2, cy + 2], rear: [x0 - 1, cy], cube: [x1 + 6, y0 - 4]}, a, {box});
}

module.exports = {partList, withAnchors};
},
'render/fx': function (module, require) {
/* ---------- fx: what floats off the creature while a clip plays ----------
   A clip names its effect (clip.fx = 'hearts') or brings its own function fx(ctx, t). Effects are drawn last, on top.
   t is the clip's tick; under reduced motion every effect shows one still frame (t = 4). */
'use strict';
const {C, mix} = require('render/colors');
const {GW, G} = require('render/raster');

// a plus-shaped twinkle
function star(ctx, x, y, c) { const {put} = ctx, d = mix(c, ctx.screen, 0.5); put(x, y, c); put(x - 1, y, d); put(x + 1, y, d); put(x, y - 1, d); put(x, y + 1, d); }

// where the default egg's anchors would be
const EGG = {head: [32, G - 21], box: [23, G - 20, 41, G], hold: [32, G - 10]};
// the anchors to place an effect by, the top of the head, a row kept on screen, and a column clear of the crest
const spot = ctx => {
  const A = ctx.A || EGG, [hx, hy] = A.head;
  return {A, hx, hy, top: y => Math.max(1, y), sx: Math.min(GW - 4, hx + 8)};
};
const QUESTION = ['###', '..#', '.##', '...', '.#.'];

const FX = {
  hearts(ctx, t) {  // hearts float up off the head, more of them on a streak of pats
    const {hx, hy, top} = spot(ctx), n = ctx.play.n >= 3 ? 3 : 2;
    for (let k = 0; k < n; k++) {
      const age = t - k * 4, life = 10;
      if (age < 0 || age >= life) continue;
      const side = [-1, 1, 0][k], x = hx + side * 6 + (((age >> 2) & 1) ? 1 : 0), y = top(hy - 4 - age);
      ctx.sprite(['#.#', '###', '.#.'], x - 1, y, {'#': age >= life - 2 ? mix(C.gem, ctx.screen, 0.45) : C.gem});
    }
  },
  sparks(ctx, t) {  // little sparks fly off both sides
    const {A} = spot(ctx), [x0, y0, x1, y1] = A.box, my = (y0 + y1) / 2;
    if (t < 12) { const k = t % 4; star(ctx, t & 1 ? x1 + 1 + k : x0 - 1 - k, my - 2 - k, C.spark); }
  },
  twinkle(ctx, t) { const [wx, wy] = spot(ctx).A.hold; if (t < 12 && (t & 2)) star(ctx, wx - 1, wy - 3, C.spark); },  // at the waving hand
  exclaim(ctx, t) { const {hy, top, sx} = spot(ctx); if (t < 10 && (t < 6 || (t & 1))) ctx.sprite(['#', '#', '#', '.', '#'], sx, top(hy - 7), {'#': C.yellow}); },
  question(ctx, t) { const {hy, top, sx} = spot(ctx); if (t < 12) ctx.sprite(QUESTION, sx, top(hy - 7), {'#': mix(ctx.body, '#ffffff', 0.6)}); },
  drowsy(ctx, t) { const {hy, top, sx} = spot(ctx); if (t < 8) ctx.sprite(QUESTION, sx, top(hy - 7), {'#': mix(ctx.body, ctx.screen, 0.35)}); },
  anger(ctx, t) {  // a pulsing anger mark on the forehead
    const {hx, hy} = spot(ctx);
    ctx.sprite((t >> 1) & 1 ? ['#.#', '.#.', '#.#'] : ['#.#', '...', '#.#'], hx + 3, hy + 2, {'#': C.alarm});
  },
  poke(ctx, t) { const {gx, gy} = ctx.play; if (gx !== undefined && t < 6) star(ctx, gx, gy, C.spark); },  // where the click landed
  burst(ctx, t) {  // stars flying out of the creature in a ring, gold and then fading
    const {A} = spot(ctx), [x0, y0, x1, y1] = A.box, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const r = 4 + t * 1.6, rx = (x1 - x0) / 2 + r, ry = (y1 - y0) / 2 * 0.6 + r * 0.6;
    if (t >= 16) return;
    for (let k = 0; k < 8; k++) {
      const ang = k * Math.PI / 4 + t * 0.08, x = Math.round(cx + rx * Math.cos(ang)), y = Math.round(cy + ry * Math.sin(ang));
      if (y < 0 || y > G + 2 || x < 0 || x >= GW) continue;
      const c = t < 8 ? C.gold : t < 12 ? C.spark : mix(C.spark, ctx.screen, 0.5);
      if (k % 2) ctx.put(x, y, c); else star(ctx, x, y, c);
    }
  },
  crumble(ctx, t) {  // bits of the creature come loose and fall to the ground, greying as they go
    const {A} = spot(ctx), [x0, y0, x1] = A.box, c = ctx.skin || ctx.body;
    for (let k = 0; k < 8; k++) {
      const age = t - k * 2;
      if (age < 0) continue;
      const x = Math.round(x0 + 2 + (x1 - x0 - 4) * (((k * 37) % 100) / 100)), y = Math.round(y0 + 3 + ((k * 23) % 9) + age * age * 0.12 + age * 0.4);
      if (y > G) continue;
      ctx.put(x, y, mix(c, ctx.screen, Math.min(0.75, 0.2 + age * 0.06)));
      if (age < 4) ctx.put(x + 1, y, mix(c, ctx.screen, 0.45));
    }
  },
};

function playFx(ctx) {
  const fx = ctx.clip.fx, draw = typeof fx === 'function' ? fx : FX[fx];
  if (draw) draw(ctx, ctx.motion ? ctx.ct : 4);
}

module.exports = {FX, playFx, star};
},
'render/egg': function (module, require) {
/* ---------- eggs ----------
   drawEgg(): the default stage 0, for themes without drawsEgg. eggCrack(): the crack that grows toward hatching,
   for a theme's own egg (call it from the stage 0 plan's decor). */
'use strict';
const {clamp} = require('core/util');
const {STAGES} = require('core/rules');
const {mix} = require('render/colors');
const {G, px, paint} = require('render/raster');
const {playFx} = require('render/fx');

// how far along hatching is, 0 to 1
const hatching = D => clamp(D.xp / STAGES[1].xp, 0, 1);

function drawEgg(ctx) {
  const {D, mo, has, body, screen, eye, put, pose} = ctx;
  const wob = has ? mo.rock : 0;  // it rocks now and then once there is something inside
  const cx = 32 + wob, cy = G - 10 + 0.5;
  for (let x = 24; x <= 40; x++) put(x, G + 1, mix(body, screen, 0.8));
  ctx.move(pose.ox, pose.oy, pose.sq);
  const m = new Set();
  eggShape(m, cx, cy);
  paint(put, m, body, screen, (x, y) => ((x * 7 + y * 13) % 11 === 0 ? mix(body, screen, 0.42) : null));
  const p = hatching(D);
  if (has && p > 0) {
    const path = [[-7, 0], [-6, 1], [-5, 0], [-4, 1], [-3, 2], [-2, 1], [-1, 0], [0, 1], [1, 2], [2, 1], [3, 0], [4, 1], [5, 0], [6, 1], [7, 0]];
    const n = Math.ceil(p * path.length);
    for (let i = 0; i < n; i++) put(cx + path[i][0], Math.round(cy) - 2 + path[i][1], eye);
  }
  if (ctx.play) { ctx.move(0, 0, 1); playFx(ctx); }
}

// an egg outline filled into m: narrower at the top
function eggShape(m, cx, cy, rx = 8, ry = 10) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = cx - rx - 1; x <= cx + rx + 1; x++) {
    const dy = (y - cy) / ry, w = rx * (dy < 0 ? 1 - 0.25 * dy * dy : 1), dx = (x - cx) / w;
    if (dx * dx + dy * dy <= 1) px(m, x, y);
  }
}

// color: the crack's color, the screen's (a hole) unless the egg glows from inside
function eggCrack(ctx, kx, ky, color) {
  const {D, has, put, eye} = ctx;
  if (!has) return;
  const path = [[-6, 1], [-5, 0], [-4, 1], [-3, 2], [-2, 1], [-1, 0], [0, 1], [1, 2], [2, 1], [3, 0], [4, 1], [5, 0], [6, 1]];
  for (let i = 0; i < Math.ceil(hatching(D) * path.length); i++) put(kx + path[i][0], ky + path[i][1], color || eye);
}

module.exports = {drawEgg, eggShape, eggCrack, hatching};
},
'render/face': function (module, require) {
/* ---------- face: eyes and mouth ----------
   The default face draws the plan's pixel eyes ({x, y, w, h}, or a visor) and pixel mouth. It blinks, sleeps, shows
   mood and sickness, and swaps in an expression while a clip asks for one (ctx.pose.face, ctx.pose.mouth).
   A theme with a face of its own sets face(ctx) and can reuse drawEye() and drawMouth() from here, as Derpy does. */
'use strict';
const {CREST_STAGE} = require('core/rules');
const {C, mix} = require('render/colors');

function drawFace(ctx) {
  ctx.pl.eyes.forEach((e, i) => drawEye(ctx, e, i, eyeColor(ctx, i)));
  if (ctx.pl.mouth) drawMouth(ctx, ctx.pl.mouth);
}

// A cursed pet's last eye glows red.
const eyeColor = (ctx, i) => ctx.mut.cursed && i === ctx.pl.eyes.length - 1 ? C.curse : ctx.eye;

function drawEye(ctx, e, i, ec) {
  const {put, D, mut, sleeping, blink, form, happy, tired, skin, screen, eye} = ctx;
  if (ctx.pose.face && expressionEye(ctx, e, i, ec)) return;
  if (e.visor) {
    const vc = D.sick ? C.alarm : mut.cursed ? C.curse : '#FFFFFF';
    for (let k = 0; k < e.w; k++) put(e.x + k, e.y, (sleeping || blink) && k % 2 ? eye : vc);
    return;
  }
  if (sleeping || (blink && form !== 'owl')) { for (let k = 0; k < e.w; k++) put(e.x + k, e.y + e.h - 1, ec); }
  else if (D.critical) { for (let k = 0; k < e.w; k++) put(e.x + k, e.y + e.h - 1, ec); put(e.x, e.y + e.h, C.drop); }
  else {
    const fill = e.glow && ec === eye ? e.glow : ec;
    for (let k = 0; k < e.w; k++) for (let j = 0; j < e.h; j++) put(e.x + k, e.y + j, fill);
    if (e.slit) for (let j = 0; j < e.h; j++) put(e.x + e.w - 1, e.y + j, eye);
    if (form === 'owl' && e.w * e.h > 1) put(e.x + e.w - 1, e.y + e.h - 1, C.yellow);
    else if (e.spark) put(e.x + e.w - 1, e.y, e.spark);
    else if (happy && e.w >= 2) put(e.x, e.y, mix(skin, '#ffffff', 0.7));
  }
  if (tired && !D.critical) for (let k = 0; k < e.w; k++) put(e.x + k, e.y + e.h, mix(skin, screen, 0.45));
}

// M: {x, y, w} and optionally color (painted lips instead of a dark line), fangs, tooth, teeth (a color), tongue
function drawMouth(ctx, M) {
  const {put, D, aff, st, motion, mo, sleeping, happy, pal, eye} = ctx, lip = M.color ? ctx.tint(M.color) : eye;
  if (ctx.pose.mouth) { expressionMouth(ctx, M, ctx.pose.mouth); return; }
  if (aff === 'local' && st >= CREST_STAGE && !D.sick) {  // a shell prompt: >_
    put(M.x - 1, M.y - 1, eye); put(M.x, M.y, eye); put(M.x - 1, M.y + 1, eye);
    if (!motion || mo.alt) { put(M.x + 1, M.y + 1, eye); put(M.x + 2, M.y + 1, eye); }
  } else if (sleeping) put(M.x + 1, M.y, lip);
  else if (D.sick || D.mood < 30) { put(M.x, M.y + 1, lip); put(M.x + 1, M.y, lip); put(M.x + 2, M.y + 1, lip); }
  else if (happy) { put(M.x, M.y, lip); put(M.x + 1, M.y + 1, lip); put(M.x + 2, M.y, lip); }
  else for (let k = 0; k < M.w; k++) put(M.x + k, M.y, lip);
  if (M.fangs && !sleeping) { put(M.x, M.y + 1, pal.horn); put(M.x + M.w - 1, M.y + 1, pal.horn); }
  if (M.tooth && !sleeping) put(M.x + 1, M.y + 1, pal.horn);
  if (M.teeth && !sleeping && !D.sick && D.mood >= 30) for (let k = 1; k < M.w; k += 2) put(M.x + k, M.y, M.teeth);
  if (M.tongue && !sleeping) { put(M.x + M.w, M.y, C.tongue); put(M.x + M.w + 1, M.y - 1, C.tongue); put(M.x + M.w + 1, M.y + 1, C.tongue); }
}

/* ---- expressions while a clip plays ---- */
function expressionEye(ctx, e, i, ec) {
  const {put, play, ct, skin, eye, pl} = ctx;
  // where the eyes look: at the click, or straight ahead for a clip that was not a click
  const gx = play && play.gx !== undefined ? play.gx : e.x + e.w / 2, gy = play && play.gy !== undefined ? play.gy : e.y;
  const face = ctx.pose.face, two = pl.eyes.length === 2, left = !two || i === 0, x = e.x, y = e.y, w = e.w, h = e.h;
  if (e.visor) {
    const vc = face === 'angry' ? C.alarm : face === 'giggle' ? (ct & 1 ? C.gem : '#FFFFFF') : face === 'joy' ? mix(C.gem, '#FFFFFF', 0.45) : '#FFFFFF';
    const sx = face === 'look' ? Math.sign(gx - (x + w / 2)) : 0;
    for (let k = 0; k < w; k++) put(x + k + sx, y, face === 'joy' && k === 2 ? eye : face === 'peek' && k > 2 ? eye : vc);
    if (face === 'wow') for (let k = 1; k < w - 1; k++) put(x + k, y - 1, vc);
    return true;
  }
  const hole = (x0, y0, ww, hh) => { for (let k = 0; k < ww; k++) for (let j = 0; j < hh; j++) put(x0 + k, y0 + j, ec); };
  switch (face) {
    case 'joy': {  // closed, curved up: ^ ^
      if (w >= 2) { put(x - 1, y + 1, ec); put(x, y, ec); put(x + w - 1, y, ec); put(x + w, y + 1, ec); }
      else { put(x - 1, y + 1, ec); put(x, y, ec); put(x + 1, y + 1, ec); }
      if (play && play.n >= 3) {  // blush after a few pats
        const bc = mix(C.gem, skin, 0.35), bx = two ? (left ? x - 2 : x + w) : x - 1;
        put(bx, y + 2, bc); put(bx + 1, y + 2, bc);
      }
      return true;
    }
    case 'giggle': {  // squeezed shut: > <
      const a = left ? 0 : Math.max(1, w - 1), b = left ? Math.max(1, w - 1) : 0;
      put(x + a, y - 1, ec); put(x + b, y, ec); put(x + b, y + 1, ec); put(x + a, y + 2, ec);
      return true;
    }
    case 'wow':  // eyes wide open with a glint
      hole(x, y - 1, w + 1, h + 1); put(x, y - 1, '#FFFFFF');
      return true;
    case 'look': {  // eyes follow the click
      const sx = Math.sign(Math.round(gx - ctx.transform.ox) - x), sy = Math.abs(gy - y) > 4 ? Math.sign(gy - y) : 0;
      hole(x + sx, y + sy, w, h);
      return true;
    }
    case 'angry': {  // frowning brows over open eyes
      hole(x, y, w, h);
      if (left) { put(x - 1, y - 2, ec); put(x, y - 2, ec); put(x + 1, y - 1, ec); }
      else { put(x + w, y - 2, ec); put(x + w - 1, y - 2, ec); put(x + w - 2, y - 1, ec); }
      return true;
    }
    case 'peek':  // one eye cracks open, the other keeps sleeping
      if (i === 0) { hole(x, y, w, h); return true; }
      for (let k = 0; k < w; k++) put(x + k, y + h - 1, ec);
      return true;
  }
  return false;
}
function expressionMouth(ctx, M, kind) {
  const {put, pal} = ctx, eye = M.color ? ctx.tint(M.color) : ctx.eye, x = M.x, y = M.y, w = M.w;
  if (kind === 'smile') { put(x, y, eye); put(x + 1, y + 1, eye); put(x + 2, y, eye); }
  else if (kind === 'frown') { put(x, y + 1, eye); put(x + 1, y, eye); put(x + 2, y + 1, eye); }
  else if (kind === 'open') { for (let k = 0; k < w; k++) { put(x + k, y, eye); put(x + k, y + 1, eye); } put(x + Math.floor(w / 2), y + 1, C.tongue); }
  else if (kind === 'o') { put(x + 1, y, eye); put(x, y + 1, eye); put(x + 2, y + 1, eye); put(x + 1, y + 2, eye); }
  if (M.fangs && (kind === 'smile' || kind === 'frown')) { put(x, y + 1, pal.horn); put(x + w - 1, y + 1, pal.horn); }
}

module.exports = {drawFace, drawEye, drawMouth, eyeColor};
},
'render/accessories': function (module, require) {
/* ---------- accessories: what forms and the affinity add around the creature ----------
   All placed on the plan's anchors (a.head, a.side, a.hold, a.rear, a.cube, a.box), so they fit every theme. */
'use strict';
const {clamp} = require('core/util');
const {CREST_STAGE} = require('core/rules');
const {C, mix} = require('render/colors');
const {G} = require('render/raster');

// Behind the creature, on the fixed screen: the Night Owl's moon and the Shipper's crate.
function backdrop(ctx) {
  const {form, A, sprite, put, mo, body} = ctx;
  if (form === 'owl') sprite(['.###.', '##...', '#....', '#....', '##...', '.###.'], 3, 6, {'#': C.moon});
  if (form === 'shipper' && !A.float) {
    const x0 = Math.max(0, Math.round(A.box[0] - 10)), y0 = G - 5;
    sprite(['bbbbbbb', 'bhbbbhb', 'bbhbhbb', 'bbbhbbb', 'bbhbhbb', 'bhbbbhb'], x0, y0, {b: C.wood, h: C.woodDark});
    for (let y = y0 - 6; y < y0; y++) put(x0 + 6, y, C.steel);
    sprite(['ff.', 'fff', 'ff.'], x0 + 7, y0 - 6 + mo.alt, {f: body});
  }
}

// The Streaker's fire trail behind its rear.
function trail(ctx) {
  const {form, A, sprite, put, mo, body, screen} = ctx;
  if (form !== 'streaker') return;
  const [rx, ry] = A.rear;
  const flame = mo.alt ? ['..y..', '.yoy.', 'oyyyo', 'oryro', '.rrr.'] : ['.y...', '.yo..', 'oyyo.', 'oryro', '.rrr.'];
  sprite(flame, rx - 6, ry - 3, {r: C.red, o: C.orange, y: C.yellow});
  for (let i = 0; i < 3 + mo.walk; i++) { put(rx - 8 - i, ry + 3, mix(body, screen, 0.4)); put(rx - 7 - i, ry - 3, mix(body, screen, 0.55)); }
}

// Held and worn: the Guardian's shield, the Debugger's wrench, the Night Owl's ear tufts, the Vibecoder's headphones.
function worn(ctx) {
  const {form, A, sprite, put, st, f, pal, body} = ctx;
  if (form === 'guardian') { const [sx, sy] = A.side; sprite(['sssssss', 'swww+ws', 'sw+++ws', 'sww+wws', '.sw+ws.', '..sws..', '...s...'], sx - 3, sy - 3, {s: C.steel, w: C.steelDark, '+': C.white}); }
  if (form === 'debugger') {
    const [hx, hy] = A.hold;
    [[0, 0], [-1, -1], [-2, -2], [-3, -3]].forEach(([dx, dy]) => put(hx + dx, hy + dy, C.steel));
    [[-4, -4], [-5, -4], [-4, -5], [-6, -5], [-5, -6], [-6, -3], [-3, -6], [-7, -6], [-6, -7]].forEach(([dx, dy]) => put(hx + dx, hy + dy, C.steel));
    put(hx - 5, hy - 5, C.steelDark);
  }
  if (form === 'owl') { const [hx, hy] = A.head; put(hx - 4, hy + 1, pal.body); put(hx - 5, hy, pal.body); put(hx - 5, hy - 1, pal.limb); put(hx + 4, hy + 1, pal.body); put(hx + 5, hy, pal.body); put(hx + 5, hy - 1, pal.limb); }
  if (form === 'vibe') {
    const [hx, hy] = A.head, w = st >= 9 ? 8 : 6, band = mix('#2A2F3A', body, 0.15);
    for (let x = hx - w + 1; x <= hx + w - 1; x++) { const t = (x - hx) / w; put(x, Math.round(hy + 2 - (1 - t * t) * 3), band); }
    for (const s of [-1, 1]) for (let j = 0; j < 4; j++) { put(hx + s * w, hy + 2 + j, band); put(hx + s * (w + 1), hy + 2 + j, mix(C.gem, band, 0.3)); }
    const nt = (f >> 1) % 8, nx = hx + w + 3 + (nt >> 2), ny = hy - 1 - nt;
    sprite(['.##', '.#.', '##.'], nx, ny, {'#': C.note});
    if (nt > 3) sprite(['#', '#', '#'], hx - w - 4, hy + 4 - nt, {'#': mix(C.note, body, 0.4)});
  }
}

// Over the head: the crown of a Crowned pet, then the crest of the dominant source, in the affinity color.
function crest(ctx) {
  const {A, sprite, put, st, f, D, aff, mut, mo, motion, body, screen} = ctx;
  let [tx, ty] = A.head;
  if (mut.crowned && st >= CREST_STAGE) { sprite(['y.y.y.y', 'yyygyyy', 'yyyyyyy'], tx - 3, ty - 2, {y: C.gold, g: C.gem}); ty -= 3; }
  if (st < CREST_STAGE) return;
  const hi = mix(body, '#ffffff', 0.6), sh = mix(body, screen, 0.42), deep = mix(body, screen, 0.75);
  if (aff === 'github') {  // a branching antenna
    const L = clamp(ty - 4, 3, 6);  // shorter when the head is near the top edge
    for (let i = 1; i <= L; i++) put(tx, ty - i, sh);
    for (let i = 2; i < L; i++) put(tx + Math.min(3, i - 1), ty - i - 1, sh);
    const p = motion ? ((f >> 3) & 1) : 0;
    sprite(['nn', 'nn'], tx - 0.5, ty - L - 2, {n: p ? hi : body}); sprite(['nn', 'nn'], tx + 2.5, ty - L - 2, {n: p ? body : hi});
  } else if (aff === 'gitlab') {  // a pipeline whose stages light up in turn, the last one red while CI fails
    put(tx, ty - 1, sh); put(tx, ty - 2, sh);
    for (let x = tx - 6; x <= tx + 6; x++) put(x, ty - 3, deep);
    const j = D.sick ? -1 : (motion ? ((f >> 2) % 4) : 3);
    [-6, 0, 6].forEach((o, k) => { const c = D.sick && k === 2 ? C.alarm : k < j ? body : k === j ? hi : sh; sprite(['cc', 'cc'], tx + o - 0.5, ty - 4.5, {c}); });
  } else if (aff === 'local') {  // a blinking cursor
    put(tx, ty - 1, sh); put(tx, ty - 2, sh); put(tx, ty - 3, (!motion || mo.alt) ? hi : sh);
  } else if (aff === 'unity') {  // a floating cube
    const [ux, uy] = A.cube, cb = motion ? ((f >> 2) & 1) : 0;
    sprite(['...hhh...', '.hhhhhhh.', 'hhhhhhhhh', 'bbhhhhhss', 'bbbbhssss', 'bbbbbssss', 'bbbbbssss', '.bbbbsss.', '...bbs...'], ux - 4, uy + cb, {h: hi, b: body, s: sh});
  } else if (aff === 'unreal') {  // a sparkle that hops around the creature
    const [x0, y0, x1, y1] = A.box;
    const sp = [[x0 - 1, y0 + 3], [x1 + 1, y0 + 8], [tx + 3, ty - 3], [x0 + 1, y1 - 6], [x1 - 2, y1 - 3]];
    const [sx, sy] = sp[motion ? ((f >> 2) % sp.length) : 0];
    put(sx, sy, hi); put(sx - 1, sy, sh); put(sx + 1, sy, sh); put(sx, sy - 1, sh); put(sx, sy + 1, sh);
  }
}

module.exports = {backdrop, trail, worn, crest};
},
'render/status': function (module, require) {
/* ---------- status: the ground shadow and what the pet's state shows on top ---------- */
'use strict';
const {C, mix} = require('render/colors');
const {GW, GH, G, K} = require('render/raster');

// A shadow on the ground that shrinks while the creature is in the air; flyers trail falling motes instead.
function shadow(ctx) {
  const {A, put, put0, f, skin, screen, transform: t} = ctx;
  if (!A.float) {
    const [x0, , x1] = A.box, lift = Math.round(-t.oy / 2);
    for (let x = Math.round(x0 + (x1 - x0) * 0.2) + lift; x <= Math.round(x1 - (x1 - x0) * 0.2) - lift; x++) put0(x + t.ox, G + 1, mix(skin, screen, 0.82));
  } else {
    const cy = A.rear[1] + 3;
    for (let i = 0; i < 4; i++) if (((f >> 1) + i) % 4 !== 0) put(32 + (i - 1.5) * 3, Math.min(GH - 4, cy + ((f + i * 3) % 6)), mix(skin, screen, 0.5));
  }
}

// The last two stages have four motes circling them, passing behind the body.
function orbit(ctx) {
  const {A, put, buf, st, f, motion, body} = ctx;
  if (st < 9) return;
  const [x0, y0, x1] = A.box, cx = (x0 + x1) / 2, cy = (y0 + G) / 2;
  for (let k = 0; k < 4; k++) {
    const ang = (motion ? f * 0.11 : 0.6) + k * Math.PI / 2;
    const ox = Math.round(cx + ((x1 - x0) / 2 + 2) * Math.cos(ang)), oy = Math.round(cy + 4 * Math.sin(ang));
    if (Math.sin(ang) < 0 && buf.has(K(ox, oy))) continue;
    put(ox, oy, st === 10 ? '#FFFFFF' : mix(body, '#ffffff', 0.6));
  }
}

function shiny(ctx) {
  const {A, put, mut, motion, f, screen} = ctx;
  if (!mut.shiny || !motion) return;
  const [x0, y0, x1, y1] = A.box;
  const sp = [[x0 + 2, y0 + 2], [x1 - 1, y0 + 6], [(x0 + x1) / 2, y0 - 1], [x1 - 3, y1 - 4], [x0 + 3, y1 - 8]];
  const [sx, sy] = sp[(f >> 1) % sp.length];
  put(sx, sy, C.spark); put(sx - 1, sy, mix(C.spark, screen, 0.5)); put(sx + 1, sy, mix(C.spark, screen, 0.5)); put(sx, sy - 1, mix(C.spark, screen, 0.5)); put(sx, sy + 1, mix(C.spark, screen, 0.5));
}

// CI failing: a sweat drop, an alarm mark, and coughs when critical.
function sick(ctx) {
  const {A, M, put, D, mo, motion, f} = ctx;
  if (!D.sick) return;
  const [hx, hy] = A.head;
  if (!motion || mo.walk) { put(hx + 6, hy + 3, C.drop); put(hx + 6, hy + 4, C.drop); put(hx + 5, hy + 5, C.drop); }
  const mx = Math.min(GW - 2, Math.round(A.box[2]) + 2), my = Math.max(2, Math.round(A.box[1]));
  if (!motion || mo.alt) { for (let j = 0; j < 4; j++) put(mx, my + j, C.alarm); put(mx, my + 5, C.alarm); }
  if (D.critical && motion && M && (f % 8) < 3) { const k = f % 8, cx2 = M.x + M.w + 2 + k * 2, cy2 = M.y - k; put(cx2, cy2, C.steel); put(cx2 + 1, cy2, C.steel); put(cx2, cy2 - 1, C.steel); }
}

// Z's rising off the head.
function sleep(ctx) {
  const {A, sprite, sleeping, motion, f, body, screen} = ctx;
  if (!sleeping) return;
  const [hx, hy] = A.head, k = motion ? ((f >> 3) % 3) : 1;
  sprite(['####', '..#.', '.#..', '####'], hx + 6 + k * 2, hy - 4 - k * 3, {'#': k === 2 ? mix(body, screen, 0.4) : mix(body, '#ffffff', 0.6)});
}

module.exports = {shadow, orbit, shiny, sick, sleep};
},
'render/gaunt': function (module, require) {
/* ---------- gaunt: a pet that went too long without code ----------
   level(D, st): 0 fed, 1 exhausted (Energy under 20, so asleep), 2 starving (losing XP, see core/hunger.js).
   An exhausted pet looks it, every theme alike, and a starving one more so:
     thin(pl, lvl)    narrows the body under the face, row by row, before anything is drawn: the head keeps its size,
                      so the body looks thinner next to it. build() and hitTest() both draw from the thinned plan.
     ribs(ctx)        ribs across the chest (front view) or down the side (a body lying long)
     sockets(ctx)     dark rings under (and when starving, over) the eyes
     fade(c, ...)     colors drained toward grey
   And a pet about to devolve flickers like a dying process: glitch(ctx), on the finished frame. */
'use strict';
const {C, mix, gray} = require('render/colors');
const {GW, GH, K} = require('render/raster');

function level(D, st) {
  if (!D || !D.count || !st) return 0;
  if (D.starving) return 2;
  return D.energy < 20 ? 1 : 0;
}

// a color drained toward grey and a little toward the screen
const fade = (c, lvl, screen) => (lvl ? mix(mix(c, gray(c), lvl > 1 ? 0.55 : 0.35), screen, lvl > 1 ? 0.12 : 0.06) : c);

// The cells an eye covers, rim included: [x0, y0, x1, y1]. Pixel eyes, googly eyes (Derpy) and a visor.
function eyeBox(e) {
  if (e.g) { const rx = e.rx || e.r, ry = e.r; return [Math.floor(e.x - rx - 1), Math.floor(e.y - ry - 1), Math.ceil(e.x + rx + 1), Math.ceil(e.y + ry + 1)]; }
  return [e.x, e.y, e.x + (e.w || 1) - 1, e.y + (e.visor ? 1 : e.h || 1) - 1];
}

// The rows of a set of cells: Map(y -> sorted xs)
function rows(m) {
  const r = new Map();
  for (const k of m) { const y = (k / GW) | 0; if (!r.has(y)) r.set(y, []); r.get(y).push(k % GW); }
  for (const xs of r.values()) xs.sort((a, b) => a - b);
  return r;
}

// Each run of cells in a row of m, from row `from` down, loses e cells at both ends; e from the run's length.
function narrow(m, from, cut) {
  const out = new Set(m);
  for (const [y, xs] of rows(m)) {
    if (y < from) continue;
    for (let i = 0; i < xs.length;) {
      let j = i; while (j + 1 < xs.length && xs[j + 1] === xs[j] + 1) j++;
      const e = cut(j - i + 1);
      for (let k = 0; k < e; k++) { out.delete(K(xs[i + k], y)); out.delete(K(xs[j - k], y)); }
      i = j + 1;
    }
  }
  return out;
}

function thin(pl, lvl) {
  if (!lvl || !pl || !pl.parts) return pl;
  // rows above the face stay whole: from just under the lowest eye or the mouth, whichever is lower
  let face = -Infinity;
  for (const e of pl.eyes || []) face = Math.max(face, eyeBox(e)[3]);
  if (pl.mouth) face = Math.max(face, Math.round(pl.mouth.y) + 1);
  const from = Number.isFinite(face) ? face + 2 : 0;
  const cut = lvl > 1 ? n => (n >= 10 ? 2 : n >= 5 ? 1 : 0) : n => (n >= 7 ? 1 : 0);
  const cutLimb = lvl > 1 ? n => (n >= 5 ? 1 : 0) : n => (n >= 6 ? 1 : 0);  // legs and arms get skinny, never thinner than 3
  const gone = new Set();
  let torso = null, most = 0;
  for (const p of pl.parts) {
    // flesh only: parts in a color of their own (a mortar, a shirt, a throne) keep their shape
    const limb = p.role === 'limb' || p.role === 'far', skin = typeof p.color !== 'string';
    if (!skin || (p.role !== 'body' && p.role !== 'belly' && !limb)) continue;
    const m = narrow(p.m, from, limb ? cutLimb : cut);
    if (p.role === 'body') { for (const k of p.m) if (!m.has(k)) gone.add(k); }
    p.m = m;
    if (p.role === 'body' && !p.color) { let n = 0; for (const k of m) if (((k / GW) | 0) >= from) n++; if (n > most) { most = n; torso = p; } }
  }
  // a belly never shows where the body under it was taken away
  for (const p of pl.parts) if (p.role === 'belly') for (const k of gone) p.m.delete(k);
  pl.gaunt = {lvl, from, torso};
  return pl;
}

// Ribs on the torso, drawn over the body and belly but under anything in front of them (arms, wings).
function ribs(ctx) {
  const {pl, owner, put, screen, pal} = ctx, g = pl.gaunt;
  if (!g || !g.torso || !owner) return;
  const own = k => { const p = owner.get(k); return p === g.torso || (p && p.role === 'belly'); };
  const cells = [...g.torso.m].filter(k => ((k / GW) | 0) >= g.from && own(k));
  if (cells.length < 30) return;
  let x0 = GW, x1 = 0, y0 = GH, y1 = 0;
  for (const k of cells) { const x = k % GW, y = (k / GW) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const w = x1 - x0 + 1, h = y1 - y0 + 1, cx = Math.round((x0 + x1) / 2), t = g.lvl > 1 ? 0.45 : 0.3;
  const inside = k => own(k) && own(k - 1) && own(k + 1) && own(k - GW) && own(k + GW);
  const shade = (x, y) => { const k = K(x, y); if (inside(k)) put(x, y, mix(owner.get(k).paint || pal.body, screen, t)); };
  if (w >= h * 1.6) {
    // a body lying long, seen from the side: ribs run down it, over its front half
    const from = Math.round(cx - w * 0.05), to = Math.round(cx + w * 0.3);
    for (let x = from; x <= to; x += 2) for (let y = y0 + 1; y <= y0 + Math.round(h * 0.7); y++) shade(x, y);
  } else {
    // seen from the front: ribs across the chest, both sides of the breastbone
    const last = y0 + Math.max(3, Math.round(h * (g.lvl > 1 ? 0.65 : 0.5)));
    for (let y = y0 + 1; y <= last; y += 2) {
      const half = Math.round(w * 0.36 * (1 - 0.35 * (y - y0) / h));
      for (let x = cx - half; x <= cx + half; x++) if (Math.abs(x - cx) >= 1) shade(x, y);
    }
  }
}

// Sunken eyes: a dark ring under each eye, and over it too when starving. Only on the creature, never on an eye.
function sockets(ctx) {
  const {pl, owner, put, skin, screen} = ctx, g = pl.gaunt;
  if (!g || !owner) return;
  const boxes = pl.eyes.map(eyeBox);
  const free = (x, y) => owner.has(K(x, y)) && !boxes.some(([a, b, c, d]) => x >= a && x <= c && y >= b && y <= d);
  const deep = mix(skin, screen, g.lvl > 1 ? 0.62 : 0.5), brow = mix(skin, screen, 0.4);
  for (const [x0, y0, x1, y1] of boxes) {
    for (let x = x0; x <= x1; x++) if (free(x, y1 + 1)) put(x, y1 + 1, deep);
    if (free(x0 - 1, y1)) put(x0 - 1, y1, deep);
    if (free(x1 + 1, y1)) put(x1 + 1, y1, deep);
    if (g.lvl > 1) for (let x = x0; x <= x1; x++) if (free(x, y0 - 1)) put(x, y0 - 1, brow);
  }
}

// About to devolve: now and then a band of rows slips sideways and dims, like a process about to be killed.
function glitch(ctx) {
  const {D, buf, f, motion, screen, A} = ctx;
  if (!D.fading || !motion) return;
  const k = f % 24;
  if (k > 2) return;
  const [, y0, , y1] = A.box, span = Math.max(4, y1 - y0);
  const top = Math.round(y0 + ((f * 7) % span)), n = k === 1 ? 3 : 2, dx = (f >> 3) & 1 ? 1 : -1;
  for (let y = top; y < Math.min(GH, top + n); y++) {
    const row = [];
    for (let x = 0; x < GW; x++) { const c = buf.get(K(x, y)); if (c) row.push([x, c]); }
    for (const [x] of row) buf.delete(K(x, y));
    for (const [x, c] of row) if (x + dx >= 0 && x + dx < GW) buf.set(K(x + dx, y), k === 2 ? mix(c, screen, 0.5) : c);
  }
  if (k === 0) for (let i = 0; i < 6; i++) {  // a few dead pixels
    const x = (f * 13 + i * 11) % GW, y = Math.round(y0 + ((f * 5 + i * 7) % span));
    if (buf.has(K(x, y))) buf.set(K(x, y), mix(C.steel, screen, 0.4));
  }
}

module.exports = {level, fade, eyeBox, thin, ribs, sockets, glitch};
},
'render/marks': function (module, require) {
/* ---------- marks: mutations drawn on the screen itself ----------
   wall(ctx): the Committed mutation. A dim contribution graph on the wall behind the pet: your real commits of the
   last 29 weeks, one column a week (this week on the right), one row a day (Monday on top), four greens by how many.
   It is drawn first, on the fixed screen, so the pet and every other effect stay in front of it, and dim enough to
   read as a backdrop. It keeps clear of the Night Owl's moon in the top left corner. */
'use strict';
const {dayIdx} = require('core/util');
const {mix} = require('render/colors');
const {GW} = require('render/raster');

const GREENS = ['#0E4429', '#006D32', '#26A641', '#39D353'];
const WEEKS = 29, X0 = 4, Y0 = 9;  // 29 columns two cells apart fill the width; 7 rows from y 9 to 21
const level = n => (n >= 10 ? 3 : n >= 6 ? 2 : n >= 3 ? 1 : 0);

// commits a day, from the pet's sessions; a made-up week pattern when there are none to read (previews, tests)
function days(D) {
  const by = new Map();
  if (D.sorted && Number.isFinite(D.now)) { for (const s of D.sorted) { const d = dayIdx(s.at); by.set(d, (by.get(d) || 0) + (s.commits || 0)); } return by; }
  const today = dayIdx(Date.UTC(2026, 10, 2));
  for (let i = 0; i < WEEKS * 7; i++) if ((i * 7 + (i % 5) * 3) % 4) by.set(today - i, (i * 13) % 12 + 1);
  return by;
}

function wall(ctx) {
  const {D, mut, put0, screen, form} = ctx;
  if (!mut.committed) return;
  const by = days(D), now = Number.isFinite(D.now) ? D.now : Date.UTC(2026, 10, 2);
  const today = dayIdx(now), wd = (new Date(now).getDay() + 6) % 7;  // Monday 0
  for (let c = 0; c < WEEKS; c++) for (let r = 0; r < 7; r++) {
    const day = today - wd + r - (WEEKS - 1 - c) * 7, n = by.get(day) || 0;
    if (day > today || !n) continue;
    const x = X0 + c * 2, y = Y0 + r * 2;
    if (form === 'owl' && x < 10 && y < 14) continue;
    if (x < GW) put0(x, y, mix(GREENS[level(n)], screen, 0.35));
  }
}

module.exports = {wall};
},
'render/build': function (module, require) {
/* ---------- build: one frame of the pet as pixels ----------
   build(D, f, opts) returns Map(cell index -> color) for frame f (8 per second). opts: {theme, screen, reduced, clip}:
   clip = {name, t, n, gx, gy} plays an event clip (clips.js), t ticks in.

   A frame is drawn in layers, back to front, over the wall: the Committed mutation's contribution graph (marks.js). Every layer gets the same context (see context()): the pet's state,
   the theme's figure for this frame (plan, anchors, palette) and the surface to draw on.
     backdrop     the Night Owl's moon, the Shipper's crate (fixed, behind everything)
     trail        the Streaker's fire                          -- from here on, a click reaction moves the creature
     shadow       on the ground, or motes under a flyer
     parts        the theme's shapes, shaded by role, with Polyglot stripes and the Unreal sheen
     ribs         an exhausted or starving pet's ribs (gaunt.js; its body was thinned in figure())
     face         eyes and mouth: theme.face(ctx), or the default pixel face, then sunken sockets when gaunt
     decor        the stage's own extras: plan.decor(ctx)
     worn, crest  form accessories, crown and the affinity crest over the head
     orbit, shiny, sick, sleep, reaction fx
     glitch       a pet about to devolve flickers (on the finished frame) */
'use strict';
const {CREST_STAGE, FORM_STAGE, PET} = require('core/rules');
const {C, mix, gray} = require('render/colors');
const {paint} = require('render/raster');
const {themeOf} = require('render/themes');
const {pose} = require('render/pose');
const {surface} = require('render/surface');
const {withAnchors} = require('render/figure');
const {drawEgg} = require('render/egg');
const {drawFace} = require('render/face');
const {backdrop, trail, worn, crest} = require('render/accessories');
const {shadow, orbit, shiny, sick, sleep} = require('render/status');
const {playFx} = require('render/fx');
const gaunt = require('render/gaunt');
const {wall} = require('render/marks');

function build(D, f, opts) {
  opts = opts || {};
  const T = themeOf(opts.theme);
  const ctx = context(D, f, opts, T);
  wall(ctx);
  if (ctx.st === 0 && !T.drawsEgg) { drawEgg(ctx); return ctx.buf; }
  figure(ctx);
  backdrop(ctx);
  ctx.move(ctx.pose.ox, ctx.pose.oy, ctx.pose.sq);
  trail(ctx);
  shadow(ctx);
  parts(ctx);
  gaunt.ribs(ctx);
  (T.face || drawFace)(ctx);
  gaunt.sockets(ctx);
  if (ctx.pl.decor) ctx.pl.decor(ctx);
  worn(ctx);
  crest(ctx);
  orbit(ctx);
  shiny(ctx);
  sick(ctx);
  sleep(ctx);
  if (ctx.play) playFx(ctx);
  gaunt.glitch(ctx);
  return ctx.buf;
}

// Everything a layer needs to know about this frame.
function context(D, f, opts, T) {
  const screen = opts.screen || T.screen || '#080A0E', motion = !opts.reduced;
  const P = pose(D, f, opts, T), {st, sleeping, mo} = P, has = D.count > 0, mut = D.mutations || {};
  const lvl = gaunt.level(D, st), cold = st === 0 && has && D.starving;
  // shiny pets turn golden, sick ones turn grey-green, hungry ones lose their color, a cooling egg turns frosty
  const tint = c => {
    let x = c;
    if (mut.shiny) x = mix(x, C.gold, 0.35);
    if (D.sick) x = mix(x, C.sick, D.critical ? 0.6 : 0.4);
    if (lvl) x = gaunt.fade(x, lvl, screen);
    if (cold) x = mix(mix(x, gray(x), 0.4), C.frost, 0.25);
    return x;
  };
  return Object.assign(surface(), {
    D, f, theme: T, st, aff: D.affinity, has, mut, sleeping, motion, screen,
    gaunt: lvl,         // 0 fed, 1 exhausted, 2 starving (gaunt.js)
    form: st >= FORM_STAGE ? D.form : null,
    mo,                 // motion channels for plans(): bob, walk, flap, sway, alt, phase, rock, blink, look, hatch...
    pose: P.pose,       // the whole body: ox, oy, sq, and face and mouth expressions
    play: P.play,       // the event clip playing, {name, t, n, gx, gy}, or null
    clip: P.clip,       // its definition
    ct: P.t,            // its tick
    tint,
    body: tint(PET[D.affinity || 'none']),  // the affinity color
    eye: screen,        // eyes and mouths are holes in the creature
    blink: mo.blink,
    happy: D.mood >= 70 && !sleeping && !D.sick,
    tired: has && D.rest < 50,
    look: mo.look,
  });
}

// The theme's plan for this frame, its anchors, and the palette its parts are shaded with.
function figure(ctx) {
  const pl = gaunt.thin(ctx.theme.plans(ctx.st, ctx.f, ctx.mo), ctx.gaunt);
  ctx.pl = pl;
  ctx.A = pl.a = withAnchors(pl.a, pl.parts);
  ctx.M = pl.mouth;
  // skin: the creature's own color if the plan brings one (Slavic, Asian), otherwise the affinity color
  const skin = ctx.skin = pl.main ? ctx.tint(pl.main) : ctx.body, screen = ctx.screen;
  ctx.pal = {
    body: skin, limb: mix(skin, screen, 0.16), far: mix(skin, screen, 0.42), belly: mix(skin, '#ffffff', 0.38),
    membrane: mix(skin, screen, 0.5), horn: mix(C.horn, skin, 0.18), core: '#FFFFFF', eyeWhite: C.eyeWhite,
  };
}

// Each part shaded by its role, or in its own color: a color, or one made from the skin, as skin => color.
// Parts can carry an ornament pattern.
// Body parts in the affinity color also wear the Polyglot's source stripes and the Unreal sheen.
// ctx.owner remembers which part is on top in every cell, for the layers that draw on the body (ribs, sockets).
function parts(ctx) {
  const {D, f, st, aff, form, motion, skin, pal, screen, tint, put, pl} = ctx, owner = ctx.owner = new Map();
  const stripes = form === 'polyglot' && D.srcs30 && D.srcs30.length > 1
    ? (x, y) => mix(PET[D.srcs30[Math.floor(y / 3) % D.srcs30.length]] || skin, skin, 0.35) : null;
  const sheen = aff === 'unreal' && st >= CREST_STAGE ? (x, y) => ((((x - y + (motion ? f * 2 : 0)) % 17) + 17) % 17 < 2 ? mix(skin, '#ffffff', 0.4) : null) : null;
  for (const part of pl.parts) {
    const base = typeof part.color === 'function' ? part.color(skin) : part.color ? tint(part.color) : (pal[part.role] || skin);
    const orn = part.pattern ? (x, y) => { const c = part.pattern(x, y); return c ? tint(c) : null; } : null;
    const extra = part.role === 'body' && !part.color ? (x, y) => (sheen && sheen(x, y)) || (stripes && stripes(x, y)) || (orn && orn(x, y)) || null : orn;
    paint(put, part.m, base, screen, extra, part.role === 'core' || part.flat);
    part.paint = base;
    for (const k of part.m) owner.set(k, part);
  }
}

module.exports = {build};
},
'render/reactions': function (module, require) {
/* ---------- clicks ----------
   For themes with reacts: true (every built-in theme): their parts say which zone they are. The widget asks
   hitTest() what a click touched, picks a clip with reactionFor(), and plays it: opts.clip = {name, t, n, gx, gy} to
   build() for the clip's len ticks (n: a streak of the same reaction, gx, gy: the cell clicked). Clips are in clips.js;
   reactions are cosmetic and never change stats. */
'use strict';
const {MAX_STAGE} = require('core/rules');
const {G, K} = require('render/raster');
const {themeOf} = require('render/themes');
const {pose} = require('render/pose');
const {level, thin} = require('render/gaunt');

const canReact = id => !!themeOf(id).reacts;
const ANGRY_AT = 6;  // this many clicks in a row (see the widget's combo window) makes it cross
const BY_ZONE = {head: 'pat', body: 'tickle', arm: 'wave', legs: 'hop', tail: 'tail', wing: 'flutter'};
// The clip a click plays. combo: how many clicks landed in quick succession, this one included.
function reactionFor(D, zone, combo) {
  const st = Math.min(D.stage, MAX_STAGE), sleeping = D.count > 0 && st > 0 && D.energy < 20;
  if (st === 0) return 'wobble';
  if (sleeping) return combo >= 3 ? 'grumpy' : 'stir';
  if (combo >= ANGRY_AT) return 'angry';
  if (!zone) return 'look';
  if (D.sick) return zone === 'head' ? 'pat' : 'flinch';  // too poorly to hop or show off
  return BY_ZONE[zone] || 'tickle';
}
const FALLBACK_ZONE = {limb: 'legs', far: 'legs', membrane: 'wing', horn: 'head', eyeWhite: 'head', core: 'body', belly: 'body'};
// What a click at grid cell (gx, gy) touched: 'head', 'body', 'arm', 'legs', 'tail', 'wing', 'egg', or null for a miss.
// Only themes with reacts: true answer; for the rest it returns undefined, and the widget leaves clicks alone.
function hitTest(D, f, opts, gx, gy) {
  opts = opts || {};
  const T = themeOf(opts.theme);
  if (!T.reacts) return undefined;
  const {st, mo, pose: p} = pose(D, f, opts, T);
  // undo the clip's own offset and squash
  const x = Math.round(gx - p.ox), y = Math.round(G - (G - (gy - p.oy)) / p.sq);
  if (st === 0 && !T.drawsEgg) { const dx = (x - 32) / 9, dy = (y - (G - 9.5)) / 10.5; return dx * dx + dy * dy <= 1 ? 'egg' : null; }
  const pl = thin(T.plans(st, f, mo), level(D, st)), A = pl.a;
  const zoneAt = (px, py) => {
    for (const e of pl.eyes) if (px >= e.x - 1 && px <= e.x + e.w && py >= e.y - 1 && py <= e.y + e.h) return 'head';
    const k = K(px, py);
    for (let i = pl.parts.length - 1; i >= 0; i--) {
      const p = pl.parts[i];
      if (!p.m.has(k)) continue;
      let z = p.zone || FALLBACK_ZONE[p.role] || 'body';
      if (z === 'body' && A.split !== undefined && py < A.split) z = 'head';
      if (z === 'body' && A.tailX !== undefined && px < A.tailX) z = 'tail';
      return z;
    }
    return null;
  };
  // the exact cell, then a forgiving ring around it: pixels are small and fingers are not
  for (let r = 0; r <= 2; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const z = zoneAt(x + dx, y + dy);
      if (z) return z;
    }
  }
  const [hx, hy] = A.head;  // the crest floats above the head
  if (Math.abs(x - hx) <= 4 && y <= hy + 1 && y >= hy - 9) return 'head';
  return null;
}

module.exports = {reactionFor, canReact, hitTest};
},
'render/svg': function (module, require) {
/* ---------- animated SVG card (for a README) ---------- */
'use strict';
const {clamp} = require('core/util');
const {SRC, STAGES, MAX_STAGE, FORMS, MUTATIONS, PET} = require('core/rules');
const {statusLine} = require('core/derive');
const {C} = require('render/colors');
const {GW} = require('render/raster');
const {themeColors, stageBody} = require('render/themes');
const {build} = require('render/build');

const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
function renderSVG(D, o) {
  o = o || {};
  const tc = themeColors(o.theme), screen = tc ? tc.screen : '#080A0E', dot = tc ? tc.dot : '#141820', cell = 5, frames = 16, loop = 2;
  const ink = '#E3E7ED', muted = '#8C95A4', track = '#20262F', panel = '#151920', line = '#272D37';
  const good = '#49C383', warn = '#E3AE3C', bad = '#EF6B60';
  const aff = D.affinity, accent = PET[aff || 'none'];
  let frameSvg = '';
  for (let f = 0; f < frames; f++) {
    const byColor = new Map();
    for (const [k, c] of build(D, f, {screen, theme: o.theme})) {
      const x = (k % GW) * cell, y = ((k / GW) | 0) * cell;
      byColor.set(c, (byColor.get(c) || '') + `M${x} ${y}h4v4h-4z`);
    }
    let paths = '';
    for (const [c, d] of byColor) paths += `<path fill="${c}" d="${d}"/>`;
    frameSvg += `<g class="f" style="animation-delay:${(f * loop / frames).toFixed(3)}s">${paths}</g>`;
  }
  const st = D.stage, next = STAGES[st + 1];
  const fill = next ? clamp((D.xp - STAGES[st].xp) / (next.xp - STAGES[st].xp), 0, 1) : 1;
  const formName = D.form ? FORMS[D.form].name : null, body = stageBody(st, o.theme);
  const vit = [['ENERGY', D.energy], ['MOOD', D.mood], ['REST', D.rest], ['BUILD', D.ciTracked ? D.health : null]];
  const color = v => v == null ? muted : v >= 60 ? good : v >= 30 ? warn : bad;
  const X = 352, BW = 160;
  let vitals = '';
  vit.forEach(([k, v], i) => {
    const y = 150 + i * 20;
    vitals += `<text x="${X}" y="${y}" fill="${muted}" font-size="11" letter-spacing=".8">${k}</text>`
      + `<rect x="${X + 70}" y="${y - 7}" width="${BW}" height="6" rx="2" fill="${track}"/>`
      + (v == null ? '' : `<rect x="${X + 70}" y="${y - 7}" width="${(BW * v / 100).toFixed(1)}" height="6" rx="2" fill="${color(v)}"/>`)
      + `<text x="626" y="${y}" fill="${v == null ? muted : ink}" font-size="11" text-anchor="end">${v == null ? 'no CI' : v}</text>`;
  });
  const muts = Object.keys(D.mutations || {}).filter(k => D.mutations[k]).map(k => MUTATIONS[k].name.toUpperCase());
  const status = statusLine(D, o.statusOpts);
  const affLine = [o.login ? '@' + o.login : null, aff ? SRC[aff].label + ' affinity' : null, `${D.commits} commits`].filter(Boolean).join(' · ');
  const title = `${o.name || 'dmn'}: ${STAGES[st].name}${formName ? ' ' + formName : ''}, ${D.xp} XP`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="264" viewBox="0 0 640 264" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
<defs>
<pattern id="dots" width="${cell}" height="${cell}" patternUnits="userSpaceOnUse"><rect width="4" height="4" rx=".6" fill="${dot}"/></pattern>
<filter id="glow" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="1.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<clipPath id="scr"><rect width="320" height="240" rx="8"/></clipPath>
</defs>
<style>
.f{opacity:0;animation:fr ${loop}s steps(1,end) infinite}
@keyframes fr{0%{opacity:1}${(100 / frames).toFixed(3)}%{opacity:0}100%{opacity:0}}
text{font-family:ui-monospace,SFMono-Regular,"Cascadia Mono",Menlo,Consolas,monospace}
</style>
<rect width="640" height="264" rx="14" fill="${panel}"/>
<rect x=".5" y=".5" width="639" height="263" rx="13.5" fill="none" stroke="${line}"/>
<g transform="translate(12 12)" clip-path="url(#scr)">
<rect width="320" height="240" fill="${screen}"/>
<rect width="320" height="240" fill="url(#dots)"/>
<g filter="url(#glow)">${frameSvg}</g>
<text x="10" y="18" fill="#9AA5B5" font-size="10" letter-spacing=".8">${STAGES[st].name} · ${st}/${MAX_STAGE}</text>
<text x="310" y="18" fill="#9AA5B5" font-size="10" letter-spacing=".8" text-anchor="end">streak ${D.streak}d</text>
</g>
<text x="${X}" y="44" fill="${ink}" font-size="24" font-weight="700">${esc(o.name || 'dmn')}</text>
<text x="${X}" y="66" fill="${accent}" font-size="13" font-weight="700">${STAGES[st].name}${formName ? ' · ' + esc(formName.toUpperCase()) : ''} <tspan fill="${muted}" font-weight="400" font-size="11">${esc(body.toLowerCase())}</tspan></text>
<text x="${X}" y="84" fill="${muted}" font-size="11">${esc(affLine)}</text>
<rect x="${X}" y="98" width="274" height="6" rx="2" fill="${track}"/>
<rect x="${X}" y="98" width="${(274 * fill).toFixed(1)}" height="6" rx="2" fill="${accent}"/>
<text x="${X}" y="120" fill="${muted}" font-size="11">${next ? `${D.xp} / ${next.xp} XP → ${next.name}` : `${D.xp} XP · final stage`}</text>
${vitals}
<text x="${X}" y="236" fill="${D.failing.length ? bad : muted}" font-size="11">${esc(status.length > 42 ? status.slice(0, 41) + '…' : status)}</text>
${muts.length ? `<text x="626" y="44" fill="${C.gold}" font-size="10" letter-spacing=".8" text-anchor="end">${esc(muts.join(' · '))}</text>` : ''}
<text x="626" y="254" fill="#5C6574" font-size="9" text-anchor="end">${esc(o.updated ? 'updated ' + o.updated + ' · ' : '')}code.daemon</text>
</svg>
`;
}

module.exports = {renderSVG};
},
'render/decor': function (module, require) {
/* ---------- decor: small extras a stage can ask for in plan.decor(ctx), drawn over the face ---------- */
'use strict';
const {mix} = require('render/colors');
const {G, K} = require('render/raster');

// darker bands across a belly, every third row, under the head (dragons and the like)
function bellyPlates(ctx) {
  const {A, buf, put, pal, screen} = ctx, [hx] = A.head;
  for (let y = G - 18; y <= G - 5; y += 3) for (let x = hx - 4; x <= hx + 4; x++) if (buf.get(K(x, y)) === pal.belly) put(x, y, mix(pal.belly, screen, 0.3));
}

module.exports = {bellyPlates};
},
'themes/classic': function (module, require) {
/* Classic: the original line, from slime to an ascended geometric form. Colored by the affinity.
   The only theme that answers clicks so far: every part says which zone it is (head, body, arm, legs, tail, wing),
   and stages drawn as one blob mark where the head ends (a.split) or the tail starts (a.tailX). */
'use strict';
const {G, px, ellipse, ring, poly, limb, chain} = require('render/raster');
const {partList} = require('render/figure');
const {bellyPlates} = require('render/decor');

module.exports = {id: 'classic', name: 'Classic', reacts: true, plans};

function plans(st, f, mo) {
  const {parts, part} = partList();
  const bob = mo.bob, walk = mo.walk, flap = mo.flap, sway = mo.sway;
  let eyes = [], mouth = null, a = {}, decor = null;
  const cx = 32;
  switch (st) {
    case 1: { // BIT: slime droplet
      const sq = bob ? 0.8 : 0, rx = 7.5 + sq, ry = 6 - sq, cy = G - ry + 0.5;
      const b = part('body', {zone: 'body'}); ellipse(b, cx, cy, rx, ry); poly(b, [[cx - 3.5, cy - ry + 2], [cx + 1, cy - ry - 4 + sq], [cx + 3, cy - ry + 2]]);
      const sh = part('belly', {zone: 'body'}); px(sh, cx - 4, cy - 3); px(sh, cx - 5, cy - 2); px(sh, cx - 4, cy - 2);
      eyes = [{x: cx - 4, y: cy - 1, w: 2, h: 2}, {x: cx + 2, y: cy - 1, w: 2, h: 2}];
      mouth = {x: cx - 1, y: cy + 2, w: 2};
      a = {head: [cx, cy - ry - 3], side: [cx - 9, cy], hold: [cx - 9, cy + 2], rear: [cx - 9, cy], cube: [cx + 12, cy - 12], box: [cx - 9, cy - ry - 4, cx + 9, G], split: cy};
      break;
    }
    case 2: { // NIBBLE: crawler with eye stalks and stub legs
      const cy = G - 8.5 - bob * 0.5;
      const legs = part('limb', {zone: 'legs'});
      [-8, -3, 3, 8].forEach((o, i) => { const up = ((i + walk) & 1) ? 1 : 0; limb(legs, cx + o, cy + 4, cx + o + (i < 2 ? -1 : 1), G - up, 1.4, 1.2); });
      const b = part('body', {zone: 'body'}); ellipse(b, cx, cy, 11.5, 6.5);
      const bel = part('belly', {zone: 'body'}); ellipse(bel, cx, cy + 3, 8, 2.5);
      const st1 = part('limb', {zone: 'head'}); limb(st1, cx - 3, cy - 5, cx - 6, cy - 12 + bob, 1, 0.8); limb(st1, cx + 3, cy - 5, cx + 6, cy - 12 + bob, 1, 0.8);
      const eb = part('eyeWhite', {zone: 'head'}); ellipse(eb, cx - 6, cy - 13 + bob, 2.4, 2.4); ellipse(eb, cx + 6, cy - 13 + bob, 2.4, 2.4);
      eyes = [{x: cx - 6, y: cy - 14 + bob, w: 1, h: 2}, {x: cx + 6, y: cy - 14 + bob, w: 1, h: 2}];
      mouth = {x: cx - 1, y: cy + 1, w: 3};
      a = {head: [cx, cy - 7], side: [cx - 13, cy - 1], hold: [cx - 13, cy + 1], rear: [cx - 12, cy], cube: [cx + 14, cy - 18], box: [cx - 12, cy - 16, cx + 12, G]};
      break;
    }
    case 3: { // BYTE: round biped with ears and arms
      const cy = G - 12.5 - bob;
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx - 4, cy + 7, cx - 5, G - 1, 1.8); limb(legs, cx + 4, cy + 7, cx + 5, G - 1, 1.8);
      ellipse(legs, cx - 6, G - 0.5, 3, 1.3); ellipse(legs, cx + 6, G - 0.5, 3, 1.3);
      const ears = part('body', {zone: 'head'}); poly(ears, [[cx - 8, cy - 5], [cx - 10, cy - 13], [cx - 3, cy - 8]]); poly(ears, [[cx + 8, cy - 5], [cx + 10, cy - 13], [cx + 3, cy - 8]]);
      const b = part('body', {zone: 'body'}); ellipse(b, cx, cy, 10, 9);
      const bel = part('belly', {zone: 'body'}); ellipse(bel, cx, cy + 3.5, 6, 4.5);
      const arms = part('limb', {zone: 'arm'}); limb(arms, cx - 9, cy + 1, cx - 13, cy + 4 - sway * 4, 1.4, 1.1); limb(arms, cx + 9, cy + 1, cx + 13, cy + 4, 1.4, 1.1);
      eyes = [{x: cx - 5, y: cy - 3, w: 2, h: 2}, {x: cx + 3, y: cy - 3, w: 2, h: 2}];
      mouth = {x: cx - 1, y: cy + 1, w: 2};
      a = {head: [cx, cy - 9], side: [cx - 16, cy + 1], hold: [cx - 13, cy + 4 - sway * 4], rear: [cx - 11, cy], cube: [cx + 15, cy - 12], box: [cx - 13, cy - 13, cx + 13, G], split: cy + 1};
      break;
    }
    case 4: { // WORD: upright kaiju chick with a tail
      const y0 = -bob;
      const tail = part('limb', {zone: 'tail'}); chain(tail, [[cx - 5, G - 8 + y0, 3.2], [cx - 13, G - 5, 2.2], [cx - 19, G - 7 - sway, 1]]);
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx - 4, G - 9 + y0, cx - 5, G - 1, 2.4); limb(legs, cx + 4, G - 9 + y0, cx + 5, G - 1, 2.4);
      ellipse(legs, cx - 6, G - 0.5, 3.6, 1.4); ellipse(legs, cx + 6, G - 0.5, 3.6, 1.4);
      const armB = part('far', {zone: 'arm'}); limb(armB, cx - 5, G - 16 + y0, cx - 9, G - 12 + y0, 1.3, 1);
      const b = part('body', {zone: 'body'}); ellipse(b, cx, G - 12.5 + y0, 8, 8.5);
      const bel = part('belly', {zone: 'body'}); ellipse(bel, cx + 1.5, G - 11 + y0, 5, 6);
      const head = part('body', {zone: 'head'}); ellipse(head, cx + 1, G - 24 + y0, 8, 6.5); ellipse(head, cx + 7, G - 21.5 + y0, 4.5, 3.2);
      const sp = part('horn', {zone: 'head'}); [[cx - 5, G - 29], [cx - 1, G - 31], [cx + 3, G - 31]].forEach(([x, y]) => poly(sp, [[x - 1.5, y + 2 + y0], [x, y - 2 + y0], [x + 1.5, y + 2 + y0]]));
      const armF = part('limb', {zone: 'arm'}); limb(armF, cx + 6, G - 16 + y0, cx + 10, G - 12 + y0 - sway * 3, 1.4, 1.1);
      eyes = [{x: cx + 1, y: G - 26 + y0, w: 2, h: 2}, {x: cx + 6, y: G - 26 + y0, w: 2, h: 2}];
      mouth = {x: cx + 8, y: G - 21 + y0, w: 3};
      a = {head: [cx + 1, G - 31 + y0], side: [cx - 14, G - 16], hold: [cx + 11, G - 12 + y0 - sway * 3], rear: [cx - 19, G - 9], cube: [cx + 15, G - 34], box: [cx - 19, G - 33, cx + 13, G]};
      break;
    }
    case 5: { // PROCESS: four-legged runner facing right
      const y0 = -bob;
      const tail = part('limb', {zone: 'tail'}); chain(tail, [[cx - 13, G - 12 + y0, 2.8], [cx - 19, G - 16, 2], [cx - 22, G - 23 + sway, 1.4], [cx - 20, G - 27 + sway, 1]]);
      const far = part('far', {zone: 'legs'}); limb(far, cx + 4, G - 8 + y0, cx + 3 - walk * 2, G - 1, 1.6); limb(far, cx - 7, G - 8 + y0, cx - 6 + walk * 2, G - 1, 1.6);
      const b = part('body', {zone: 'body'}); ellipse(b, cx - 2, G - 11 + y0, 13, 6.2);
      const bel = part('belly', {zone: 'body'}); ellipse(bel, cx - 1, G - 7.5 + y0, 9, 2.4);
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx + 7, G - 8 + y0, cx + 8 + walk * 2, G - 1, 1.8); limb(legs, cx - 10, G - 8 + y0, cx - 11 - walk * 2, G - 1, 1.8);
      const neck = part('body', {zone: 'body'}); limb(neck, cx + 8, G - 13 + y0, cx + 12, G - 18 + y0, 3.4, 3);
      const ears = part('body', {zone: 'head'}); poly(ears, [[cx + 10, G - 24 + y0], [cx + 11, G - 31 + y0], [cx + 14, G - 24 + y0]]); poly(ears, [[cx + 15, G - 24 + y0], [cx + 17, G - 30 + y0], [cx + 18, G - 23 + y0]]);
      const head = part('body', {zone: 'head'}); ellipse(head, cx + 14, G - 20.5 + y0, 6, 5); ellipse(head, cx + 19.5, G - 19 + y0, 4, 2.6);
      eyes = [{x: cx + 15, y: G - 23 + y0, w: 2, h: 2}];
      mouth = {x: cx + 20, y: G - 18 + y0, w: 3};
      a = {head: [cx + 14, G - 25 + y0], side: [cx - 3, G - 13 + y0], hold: [cx + 23, G - 18 + y0], rear: [cx - 22, G - 14], cube: [cx + 22, G - 34], box: [cx - 23, G - 31, cx + 24, G]};
      break;
    }
    case 6: { // THREAD: wyrm, slithering S-curve
      const ph = mo.phase, N = 16, path = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        path.push([5 + 37 * t, G - 6 - 6.5 * Math.sin(t * 9 - ph) * (1 - t * 0.55) - 12 * t * t, 0.9 + 3.1 * Math.pow(Math.sin(Math.PI * Math.min(t, 0.85) / 0.85), 0.6)]);
      }
      const [hx0, hy0] = path[N], hx = hx0 + 3, hy = hy0 - 4;
      const fr = part('membrane', {zone: 'head'}); poly(fr, [[hx - 3, hy - 1], [hx - 9, hy - 7], [hx - 5, hy - 4], [hx - 6, hy - 10], [hx - 2, hy - 5], [hx + 1, hy - 8], [hx + 1, hy - 3]]);
      const b = part('body', {zone: 'body'}); chain(b, path); limb(b, hx0, hy0, hx, hy, 3.4, 3.4);
      const bel = part('belly', {zone: 'body'}); chain(bel, path.slice(2, N - 1).map(([x, y, r]) => [x + 0.5, y + r * 0.55, r * 0.42]));
      const sp = part('horn', {zone: 'body'}); for (let i = 3; i < N - 1; i += 2) { const [x, y, r] = path[i]; poly(sp, [[x - 1.2, y - r + 0.5], [x - 0.3, y - r - 2.3], [x + 1, y - r + 0.5]]); }
      const head = part('body', {zone: 'head'}); ellipse(head, hx, hy, 6.5, 4.8); ellipse(head, hx + 5.5, hy + 1.5, 4.5, 2.6);
      const whisk = part('horn', {zone: 'head'}); chain(whisk, [[hx + 8, hy + 3, 0.5], [hx + 11, hy + 6 - mo.alt, 0.5], [hx + 13, hy + 5, 0.4]]);
      eyes = [{x: hx, y: hy - 2, w: 2, h: 2}];
      mouth = {x: hx + 5, y: hy + 2, w: 3, tongue: mo.alt};
      a = {head: [hx - 1, hy - 5], side: [path[8][0], path[8][1] - 3], hold: [hx + 10, hy + 2], rear: [path[1][0], path[1][1]], cube: [52, 6], box: [5, hy - 10, hx + 10, G], tailX: 15};
      break;
    }
    case 7: { // DAEMON: winged imp
      const y0 = -bob, fl = flap;
      const wing = part('membrane', {zone: 'wing'});
      for (const s of [-1, 1]) {
        const sx = cx + s * 5;
        poly(wing, [[sx, G - 23 + y0], [sx + s * 13, G - 33 - fl * 2 + y0], [sx + s * 19, G - 26 - fl + y0], [sx + s * 17, G - 19 + y0], [sx + s * 13, G - 21 + y0], [sx + s * 11, G - 16 + y0], [sx + s * 7, G - 19 + y0], [sx + s * 3, G - 15 + y0]]);
      }
      const bones = part('limb', {zone: 'wing'});
      for (const s of [-1, 1]) { const sx = cx + s * 5; limb(bones, sx, G - 23 + y0, cx + s * 18, G - 33 - fl * 2 + y0, 0.9, 0.5); limb(bones, cx + s * 18, G - 33 - fl * 2 + y0, cx + s * 24, G - 26 - fl + y0, 0.6, 0.4); }
      const tail = part('limb', {zone: 'tail'}); chain(tail, [[cx + 3, G - 8 + y0, 1.4], [cx + 12, G - 5, 1.1], [cx + 17, G - 10 - sway, 0.8]]);
      const tip = part('horn', {zone: 'tail'}); poly(tip, [[cx + 15, G - 11 - sway], [cx + 18, G - 16 - sway], [cx + 20, G - 10 - sway]]);
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx - 3, G - 9 + y0, cx - 4, G - 1, 2); limb(legs, cx + 3, G - 9 + y0, cx + 4, G - 1, 2);
      ellipse(legs, cx - 5, G - 0.5, 2.6, 1.2); ellipse(legs, cx + 5, G - 0.5, 2.6, 1.2);
      const b = part('body', {zone: 'body'}); ellipse(b, cx, G - 14 + y0, 6.5, 7);
      const bel = part('belly', {zone: 'body'}); ellipse(bel, cx, G - 12.5 + y0, 4, 4.5);
      const arms = part('limb', {zone: 'arm'}); limb(arms, cx - 6, G - 18 + y0, cx - 10, G - 12 + y0 - sway * 4, 1.5, 1.1); limb(arms, cx + 6, G - 18 + y0, cx + 10, G - 12 + y0, 1.5, 1.1);
      const head = part('body', {zone: 'head'}); ellipse(head, cx, G - 25 + y0, 6, 5.5);
      poly(head, [[cx - 5, G - 26 + y0], [cx - 9, G - 30 + y0], [cx - 4, G - 29 + y0]]); poly(head, [[cx + 5, G - 26 + y0], [cx + 9, G - 30 + y0], [cx + 4, G - 29 + y0]]);
      const horns = part('horn', {zone: 'head'}); chain(horns, [[cx - 3, G - 29 + y0, 1.5], [cx - 5, G - 33 + y0, 1], [cx - 4, G - 36 + y0, 0.5]]); chain(horns, [[cx + 3, G - 29 + y0, 1.5], [cx + 5, G - 33 + y0, 1], [cx + 4, G - 36 + y0, 0.5]]);
      px(horns, cx - 11, G - 12 + y0 - sway * 4); px(horns, cx + 11, G - 12 + y0);
      eyes = [{x: cx - 3, y: G - 27 + y0, w: 2, h: 2}, {x: cx + 2, y: G - 27 + y0, w: 2, h: 2}];
      mouth = {x: cx - 1, y: G - 23 + y0, w: 3, fangs: true};
      a = {head: [cx, G - 31 + y0], side: [cx - 15, G - 13], hold: [cx - 11, G - 12 + y0 - sway * 4], rear: [cx + 20, G - 12], cube: [cx + 26, G - 12], box: [cx - 24, G - 36, cx + 24, G]};
      break;
    }
    case 8: { // SERVICE: wyvern with a raised wing and long neck
      const y0 = -bob, fl = flap;
      const wingF = part('far', {zone: 'wing'}); poly(wingF, [[cx + 2, G - 16 + y0], [cx + 2, G - 34 - fl * 3 + y0], [cx - 2, G - 28 + y0], [cx - 7, G - 31 - fl * 2 + y0], [cx - 6, G - 23 + y0], [cx - 4, G - 16 + y0]]);
      const tail = part('limb', {zone: 'tail'}); chain(tail, [[cx - 14, G - 11 + y0, 3], [cx - 22, G - 7, 2], [cx - 27, G - 11 - sway, 1.2]]);
      const tip = part('horn', {zone: 'tail'}); poly(tip, [[cx - 28, G - 9 - sway], [cx - 31, G - 13 - sway], [cx - 27, G - 15 - sway], [cx - 25, G - 12 - sway]]);
      const far = part('far', {zone: 'legs'}); limb(far, cx + 5, G - 8 + y0, cx + 4 - walk * 2, G - 1, 2); limb(far, cx - 8, G - 8 + y0, cx - 7 + walk * 2, G - 1, 2);
      const b = part('body', {zone: 'body'}); ellipse(b, cx - 3, G - 11 + y0, 14, 7);
      const bel = part('belly', {zone: 'body'}); ellipse(bel, cx - 2, G - 7.5 + y0, 10, 2.6);
      const spikes = part('horn', {zone: 'body'}); for (let x = cx - 14; x <= cx + 6; x += 4) poly(spikes, [[x - 1.5, G - 16 + y0 + (x < cx - 10 ? 1 : 0)], [x, G - 20 + y0], [x + 1.5, G - 16 + y0]]);
      const wing = part('membrane', {zone: 'wing'}); poly(wing, [[cx - 2, G - 16 + y0], [cx - 8, G - 37 - fl * 3 + y0], [cx - 13, G - 29 + y0], [cx - 20, G - 34 - fl * 2 + y0], [cx - 20, G - 25 + y0], [cx - 26, G - 25 - fl + y0], [cx - 14, G - 16 + y0]]);
      const bones = part('limb', {zone: 'wing'}); limb(bones, cx - 2, G - 16 + y0, cx - 8, G - 37 - fl * 3 + y0, 1, 0.5); limb(bones, cx - 8, G - 37 - fl * 3 + y0, cx - 20, G - 34 - fl * 2 + y0, 0.6, 0.5); limb(bones, cx - 8, G - 37 - fl * 3 + y0, cx - 26, G - 25 - fl + y0, 0.6, 0.4);
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx + 8, G - 8 + y0, cx + 9 + walk * 2, G - 1, 2.2); limb(legs, cx - 11, G - 8 + y0, cx - 12 - walk * 2, G - 1, 2.2);
      const neck = part('body', {zone: 'body'}); chain(neck, [[cx + 8, G - 14 + y0, 3.6], [cx + 13, G - 21 + y0, 2.8], [cx + 16, G - 26 + y0, 2.6]]);
      const horns = part('horn', {zone: 'head'}); chain(horns, [[cx + 16, G - 31 + y0, 1.2], [cx + 13, G - 35 + y0, 0.6]]); chain(horns, [[cx + 19, G - 31 + y0, 1.1], [cx + 18, G - 36 + y0, 0.5]]);
      const head = part('body', {zone: 'head'}); ellipse(head, cx + 18, G - 28.5 + y0, 5.5, 4); ellipse(head, cx + 23, G - 27.5 + y0, 3.8, 2.4);
      eyes = [{x: cx + 18, y: G - 30 + y0, w: 2, h: 2}];
      mouth = {x: cx + 23, y: G - 26 + y0, w: 3, fangs: true};
      a = {head: [cx + 17, G - 33 + y0], side: [cx - 4, G - 12 + y0], hold: [cx + 27, G - 26 + y0], rear: [cx - 28, G - 12], cube: [cx + 24, G - 17], box: [cx - 31, G - 38, cx + 27, G]};
      break;
    }
    case 9: { // KERNEL: seated great dragon, wings spread
      const y0 = -bob, fl = flap;
      const wing = part('membrane', {zone: 'wing'});
      for (const s of [-1, 1]) {
        const sx = cx + s * 7;
        poly(wing, [[sx, G - 22 + y0], [cx + s * 20, G - 36 - fl * 2], [cx + s * 29, G - 30 - fl], [cx + s * 27, G - 21], [cx + s * 23, G - 24], [cx + s * 21, G - 16], [cx + s * 17, G - 20], [cx + s * 14, G - 13], [sx + s * 2, G - 15 + y0]]);
      }
      const bones = part('limb', {zone: 'wing'});
      for (const s of [-1, 1]) { const sx = cx + s * 7; limb(bones, sx, G - 22 + y0, cx + s * 20, G - 36 - fl * 2, 1.1, 0.6); limb(bones, cx + s * 20, G - 36 - fl * 2, cx + s * 29, G - 30 - fl, 0.7, 0.5); limb(bones, cx + s * 20, G - 36 - fl * 2, cx + s * 23, G - 24, 0.5); limb(bones, cx + s * 20, G - 36 - fl * 2, cx + s * 17, G - 20, 0.5); }
      const haunch = part('limb', {zone: 'legs'}); ellipse(haunch, cx - 8, G - 5, 6, 5); ellipse(haunch, cx + 8, G - 5, 6, 5);
      const b = part('body', {zone: 'body'}); ellipse(b, cx, G - 13 + y0, 10, 11);
      const bel = part('belly', {zone: 'body'}); ellipse(bel, cx, G - 11 + y0, 6, 8);
      const arms = part('limb', {zone: 'arm'}); limb(arms, cx - 8, G - 17 + y0, cx - 6, G - 3, 2.2, 1.8); limb(arms, cx + 8, G - 17 + y0, cx + 6, G - 3, 2.2, 1.8);
      const tail = part('limb', {zone: 'tail'}); chain(tail, [[cx + 10, G - 3, 2.6], [cx, G - 0.5, 2.2], [cx - 12, G - 1, 1.6], [cx - 17, G - 5 - sway, 1]]);
      const claws = part('horn', {zone: 'legs'}); [-7, -5, 5, 7].forEach(o => px(claws, cx + o, G - 1));
      const neck = part('body', {zone: 'body'}); limb(neck, cx, G - 22 + y0, cx, G - 26 + y0, 4.2, 3.8);
      const horns = part('horn', {zone: 'head'}); for (const s of [-1, 1]) chain(horns, [[cx + s * 4, G - 31 + y0, 1.8], [cx + s * 8, G - 35 + y0, 1.1], [cx + s * 10, G - 37 + y0, 0.5]]);
      const head = part('body', {zone: 'head'}); ellipse(head, cx, G - 29 + y0, 6.5, 5); ellipse(head, cx, G - 25.5 + y0, 4.2, 2.8);
      eyes = [{x: cx - 4, y: G - 31 + y0, w: 2, h: 2}, {x: cx + 3, y: G - 31 + y0, w: 2, h: 2}];
      mouth = {x: cx - 1, y: G - 24 + y0, w: 3, fangs: true};
      a = {head: [cx, G - 34 + y0], side: [cx - 16, G - 9], hold: [cx - 7, G - 4], rear: [cx - 18, G - 6], cube: [cx + 25, G - 10], box: [cx - 29, G - 37, cx + 29, G]};
      decor = bellyPlates;
      break;
    }
    case 10: { // SINGULARITY: ascended, floating geometric form
      const fy = Math.round(Math.sin(mo.phase * 0.7) * 1.4), y = G - 18 + fy;
      const wing = part('membrane', {zone: 'wing'});
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
        const ang = (-0.35 - i * 0.28) * s, len = 14 + i * 2 + flap;
        limb(wing, cx + s * 6, y - 4, cx + s * 6 + Math.sin(ang) * len * s * s, y - 4 - Math.cos(ang) * len * 0.75, 1.2, 0.5);
      }
      const halo = part('horn', {zone: 'head'}); ring(halo, cx, y - 19, 9, 2.4, 1);
      const plates = part('limb', {zone: 'body'});
      for (const s of [-1, 1]) {
        poly(plates, [[cx + s * 10, y - 9], [cx + s * 15, y - 7], [cx + s * 12, y - 3]]);
        const hy = y + 4 - fy * 2;
        poly(plates, [[cx + s * 17, hy - 2.5], [cx + s * 19.5, hy], [cx + s * 17, hy + 2.5], [cx + s * 14.5, hy]]);
      }
      const b = part('body', {zone: 'body'}); poly(b, [[cx, y - 13], [cx + 9.5, y], [cx, y + 13], [cx - 9.5, y]]);
      const facet = part('belly', {zone: 'body'}); poly(facet, [[cx, y - 7], [cx + 5, y], [cx, y + 7], [cx - 5, y]]);
      const core = part('core', {zone: 'body'}); ellipse(core, cx, y, mo.alt ? 2.4 : 1.8, mo.alt ? 2.4 : 1.8);
      const head = part('body', {zone: 'head'}); poly(head, [[cx - 3.5, y - 16], [cx, y - 19.5], [cx + 3.5, y - 16], [cx + 3.5, y - 14.5], [cx, y - 13], [cx - 3.5, y - 14.5]]);
      eyes = [{x: cx - 2, y: y - 16, w: 5, h: 1, visor: true}];
      mouth = null;
      a = {head: [cx, y - 22], side: [cx - 20, y + 4], hold: [cx - 17, y + 4], rear: [cx, y + 15], cube: [cx + 22, 6], box: [cx - 22, y - 24, cx + 22, y + 14], float: true};
      break;
    }
  }
  return {parts, eyes, mouth, a, decor};
}
},
'themes/derp': function (module, require) {
/* Derpy: the Classic line drawn badly on purpose. Colored by the affinity.
   Googly eyes (eye: {x, y, r, g: true, p: pupil size}), lopsided bodies, buck teeth and tongues.
   Mouth types: buck (teeth), blep (tongue out), open (gaping), under (underbite fang). */
'use strict';
const {CREST_STAGE} = require('core/rules');
const {C, mix} = require('render/colors');
const {GW, G, px, ellipse, ring, poly, limb, chain, carve, paint} = require('render/raster');
const {partList} = require('render/figure');
const {eggCrack} = require('render/egg');
const {bellyPlates} = require('render/decor');
const {eyeColor, drawMouth} = require('render/face');

module.exports = {
  id: 'derp', name: 'Derpy', accent: '#FFE27A', drawsEgg: true, reacts: true,
  bodies: ['Leggy egg', 'Blep', 'Crab', 'Potato', 'Derpasaur', 'Sausage', 'Noodle', 'Gremlin', 'Long boi', 'Chonk', 'Big eye'],
  plans, face,
};

function plans(st, f, mo) {
  const {parts, part} = partList();
  const bob = mo.bob, walk = mo.walk, flap = mo.flap, sway = mo.sway, alt = mo.alt;
  let eyes = [], mouth = null, a = {}, decor = null;
  const cx = 32;
  const goo = (m, x, y, r, p) => { ellipse(m, x, y, r, r); eyes.push({x, y, r, g: true, p: p || (r >= 2.5 ? 2 : 1)}); };
  switch (st) {
    case 0: { // leggy egg: an egg on two stubby legs, peeking around
      const step = mo.has ? walk : 0, cy = G - 13.5;
      const legs = part('limb', {zone: 'egg'});
      limb(legs, cx - 3, cy + 8, cx - 3, G - 1 - step, 1.2); limb(legs, cx + 3, cy + 8, cx + 3, G - 1 - (mo.has ? 1 - walk : 0), 1.2);
      ellipse(legs, cx - 4.5, G - 0.5 - step, 2.2, 1); ellipse(legs, cx + 4.5, G - 0.5 - (mo.has ? 1 - walk : 0), 2.2, 1);
      const b = part('body', {zone: 'egg'});
      for (let y = Math.floor(cy - 10); y <= Math.ceil(cy + 9); y++) for (let x = cx - 9; x <= cx + 9; x++) {
        const dy = (y - cy) / 9.5, rx = 7.5 * (dy < 0 ? 1 - 0.25 * dy * dy : 1), dx = (x - cx) / rx;
        if (dx * dx + dy * dy <= 1) px(b, x, y);
      }
      const ew = part('eyeWhite', {zone: 'egg'}); goo(ew, cx - 3, cy - 3, 2.5, 1); goo(ew, cx + 3.5, cy - 4, 3, 2);
      a = {head: [cx, cy - 10], side: [cx - 10, cy], hold: [cx - 10, cy + 2], rear: [cx - 9, cy], cube: [cx + 13, cy - 10], box: [cx - 8, cy - 10, cx + 8, G]};
      decor = ctx => eggCrack(ctx, cx, cy + 3);
      break;
    }
    case 1: { // BLEP: a puddle with a floppy tip, mismatched eyes and its tongue out
      const sq = bob ? 0.8 : 0, cy = G - 4 + sq * 0.5;
      const b = part('body', {zone: 'body'}); ellipse(b, cx, cy, 10 + sq, 4.2 - sq * 0.5); ellipse(b, cx - 1, cy - 3, 7, 4.5 - sq * 0.5);
      poly(b, [[cx - 3, cy - 6], [cx + 3, cy - 11 + sq], [cx + 6, cy - 9 + sq], [cx + 2, cy - 5]]);
      const sh = part('belly', {zone: 'body'}); px(sh, cx - 6, cy - 4); px(sh, cx - 7, cy - 3); px(sh, cx - 6, cy - 3);
      const ew = part('eyeWhite', {zone: 'head'}); goo(ew, cx - 3, cy - 6, 3.5, 2); goo(ew, cx + 4, cy - 5, 2.3, 1);
      mouth = {x: cx - 1, y: cy, w: 3, derp: 'blep', drool: true};
      a = {head: [cx + 4, cy - 12], side: [cx - 12, cy], hold: [cx - 12, cy + 1], rear: [cx - 11, cy], cube: [cx + 13, cy - 14], box: [cx - 11, cy - 12, cx + 11, G], split: cy - 2};
      break;
    }
    case 2: { // CRAB: fiddler crab, one huge claw, eye stalks that disagree
      const cy = G - 8.5 - bob * 0.5;
      const legs = part('limb', {zone: 'legs'});
      [-10, -7, -4, 4, 7, 10].forEach((o, i) => { const s = o < 0 ? -1 : 1, up = ((i + walk) & 1) ? 1 : 0; limb(legs, cx + o, cy + 3, cx + o + s * 2, G - up, 1.1, 0.9); });
      const arm = part('limb', {zone: 'arm'}); chain(arm, [[cx + 9, cy - 1, 1.6], [cx + 13, cy - 4 - sway, 1.4], [cx + 15, cy - 7 - sway, 1.3]]);
      chain(arm, [[cx - 9, cy - 1, 1.1], [cx - 12, cy - 3, 0.9], [cx - 13, cy - 5, 0.8]]);
      const b = part('body', {zone: 'body'}); ellipse(b, cx, cy, 11, 6);
      const bel = part('belly', {zone: 'body'}); ellipse(bel, cx, cy + 3, 7.5, 2.3);
      const claw = part('body', {zone: 'arm'}); ellipse(claw, cx + 18, cy - 11 - sway, 5, 3.6);
      carve(claw, [[cx + 18, cy - 11 - sway], [cx + 24, cy - 14 - sway - alt], [cx + 24, cy - 10 - sway + alt]]);
      ellipse(claw, cx - 14, cy - 6, 2, 1.6); px(claw, cx - 16, cy - 8); px(claw, cx - 14, cy - 8);
      const stalk = part('limb', {zone: 'head'}); limb(stalk, cx - 3, cy - 5, cx - 4, cy - 9 + bob, 1, 0.8); chain(stalk, [[cx + 3, cy - 5, 1], [cx + 5, cy - 11, 0.8], [cx + 8, cy - 14 + bob, 0.7]]);
      const ew = part('eyeWhite', {zone: 'head'}); goo(ew, cx - 4, cy - 11 + bob, 3, 2); goo(ew, cx + 9, cy - 16 + bob, 2.6, 1);
      mouth = {x: cx - 2, y: cy, w: 4, derp: 'buck'};
      a = {head: [cx - 1, cy - 7], side: [cx - 15, cy], hold: [cx - 14, cy - 6], rear: [cx - 13, cy], cube: [cx - 16, cy - 22], box: [cx - 16, cy - 19, cx + 23, G]};
      break;
    }
    case 3: { // POTATO: lumpy body, one floppy ear, noodle arms
      const cy = G - 11.5 - bob;
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx - 3, cy + 8, cx - 3, G - 1, 1.5); limb(legs, cx + 4, cy + 8, cx + 4, G - 1, 1.5);
      ellipse(legs, cx - 4, G - 0.5, 2.4, 1); ellipse(legs, cx + 5, G - 0.5, 2.4, 1);
      const ears = part('body', {zone: 'head'}); poly(ears, [[cx - 7, cy - 6], [cx - 9, cy - 14], [cx - 3, cy - 9]]);
      chain(ears, [[cx + 6, cy - 8, 2], [cx + 11, cy - 9, 1.6], [cx + 13, cy - 6, 1.1]]);
      const b = part('body', {zone: 'body'}); ellipse(b, cx, cy, 9.5, 10); ellipse(b, cx + 1.5, cy + 3, 9, 7);
      const bel = part('belly', {zone: 'body'}); ellipse(bel, cx + 1, cy + 4, 5.5, 4);
      const spot = part('limb', {zone: 'body'}); px(spot, cx + 7, cy + 1); px(spot, cx + 6, cy + 2); px(spot, cx - 6, cy + 6);
      const arms = part('limb', {zone: 'arm'}); chain(arms, [[cx - 9, cy + 1, 1], [cx - 14, cy - 2 - sway * 3, 0.8], [cx - 15, cy - 6 - sway * 3, 0.7]]);
      chain(arms, [[cx + 10, cy + 2, 1], [cx + 13, cy + 6, 0.8], [cx + 12, cy + 9, 0.7]]);
      const ew = part('eyeWhite', {zone: 'head'}); goo(ew, cx - 3, cy - 3, 3.4, 2); goo(ew, cx + 4, cy - 2, 2.6, 1);
      mouth = {x: cx - 1, y: cy + 3, w: 3, derp: 'buck'};
      a = {head: [cx - 1, cy - 11], side: [cx - 16, cy + 3], hold: [cx - 15, cy - 6 - sway * 3], rear: [cx - 10, cy], cube: [cx + 18, cy - 22], box: [cx - 16, cy - 14, cx + 14, G]};
      break;
    }
    case 4: { // DERPASAUR: giant head, frog eyes, tiny arms, mouth hanging open
      const y0 = -bob;
      const tail = part('limb', {zone: 'tail'}); chain(tail, [[cx - 6, G - 7 + y0, 3], [cx - 13, G - 4, 2], [cx - 17, G - 3 - sway, 1]]);
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx - 4, G - 8 + y0, cx - 4, G - 1, 2.6); limb(legs, cx + 3, G - 8 + y0, cx + 4, G - 1, 2.6);
      ellipse(legs, cx - 5, G - 0.5, 3.4, 1.3); ellipse(legs, cx + 5, G - 0.5, 3.4, 1.3);
      const b = part('body', {zone: 'body'}); ellipse(b, cx - 1, G - 11 + y0, 8, 7.5);
      const bel = part('belly', {zone: 'body'}); ellipse(bel, cx + 1, G - 10 + y0, 5, 5);
      const head = part('body', {zone: 'head'}); ellipse(head, cx + 3, G - 23 + y0, 10, 7); ellipse(head, cx + 10, G - 20 + y0, 5, 4);
      const sp = part('horn', {zone: 'body'}); poly(sp, [[cx - 6, G - 25 + y0], [cx - 7, G - 30 + y0], [cx - 3, G - 28 + y0]]); poly(sp, [[cx - 3, G - 29 + y0], [cx - 1, G - 32 + y0], [cx, G - 29 + y0]]);
      const arm = part('limb', {zone: 'arm'}); limb(arm, cx + 5, G - 14 + y0, cx + 8, G - 13 + y0 - sway, 1, 0.8);
      const ew = part('eyeWhite', {zone: 'head'}); goo(ew, cx + 1, G - 30 + y0, 3.4, 2); goo(ew, cx + 8, G - 29 + y0, 2.6, 1);
      mouth = {x: cx + 7, y: G - 20 + y0, w: 6, h: 2, derp: 'open'};
      a = {head: [cx + 4, G - 34 + y0], side: [cx - 12, G - 13], hold: [cx + 9, G - 13 + y0 - sway], rear: [cx - 17, G - 5], cube: [cx - 15, G - 34], box: [cx - 18, G - 33, cx + 15, G]};
      break;
    }
    case 5: { // SAUSAGE: dachshund on tiny legs, ear and tongue flapping
      const y0 = -bob;
      const tail = part('limb', {zone: 'tail'}); chain(tail, [[cx - 17, G - 9 + y0, 1.4], [cx - 20, G - 12 + (alt ? -2 : 1), 1.1], [cx - 22, G - 14 + (alt ? -4 : 2), 0.8]]);
      const far = part('far', {zone: 'legs'}); limb(far, cx - 11, G - 5 + y0, cx - 11 + walk, G - 1, 1.3); limb(far, cx + 5, G - 5 + y0, cx + 5 - walk, G - 1, 1.3);
      const b = part('body', {zone: 'body'}); limb(b, cx - 14, G - 8 + y0, cx + 7, G - 8 + y0, 4.2, 4.4);
      const bel = part('belly', {zone: 'body'}); limb(bel, cx - 11, G - 5 + y0, cx + 5, G - 5 + y0, 1.4);
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx - 14, G - 5 + y0, cx - 14 - walk, G - 1, 1.4); limb(legs, cx + 8, G - 5 + y0, cx + 8 + walk, G - 1, 1.4);
      const neck = part('body', {zone: 'head'}); limb(neck, cx + 7, G - 9 + y0, cx + 11, G - 12 + y0, 3.6, 3.4);
      const head = part('body', {zone: 'head'}); ellipse(head, cx + 13, G - 14 + y0, 5.5, 4.6); ellipse(head, cx + 18, G - 12 + y0, 3.6, 2.4);
      const ear = part('limb', {zone: 'head'}); chain(ear, [[cx + 11, G - 17 + y0, 1.8], [cx + 9, G - 13 + y0, 1.6], [cx + 8 - walk, G - 9 + y0 + walk, 1.2]]);
      const ew = part('eyeWhite', {zone: 'head'}); goo(ew, cx + 13, G - 18 + y0, 2.8, 2); goo(ew, cx + 18, G - 16 + y0, 2.1, 1);
      mouth = {x: cx + 18, y: G - 11 + y0, w: 3, derp: 'blep', long: true};
      a = {head: [cx + 14, G - 21 + y0], side: [cx - 4, G - 10 + y0], hold: [cx + 22, G - 12 + y0], rear: [cx - 19, G - 10], cube: [cx + 21, G - 30], box: [cx - 22, G - 21, cx + 22, G]};
      break;
    }
    case 6: { // NOODLE: thin wobbly snake, big round head, forked blep
      const ph = mo.phase, N = 16, path = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        path.push([6 + 34 * t, G - 4 - 6 * Math.sin(t * 10 - ph) * (1 - t * 0.5) - 11 * t * t, 0.8 + 1.4 * Math.pow(Math.sin(Math.PI * Math.min(t, 0.85) / 0.85), 0.7)]);
      }
      const [hx0, hy0] = path[N], hx = hx0 + 3, hy = hy0 - 5 + bob;
      const b = part('body', {zone: 'body'}); chain(b, path); limb(b, hx0, hy0, hx - 1, hy + 2, 1.8, 2.4);
      const bel = part('belly', {zone: 'body'}); for (let i = 3; i < N - 1; i += 3) px(bel, path[i][0], path[i][1] + 1);
      const head = part('body', {zone: 'head'}); ellipse(head, hx, hy, 6.5, 5.5);
      const ew = part('eyeWhite', {zone: 'head'}); goo(ew, hx - 2, hy - 4, 3, 2); goo(ew, hx + 4, hy - 3, 2.6, 2);
      mouth = {x: hx + 1, y: hy + 2, w: 4, derp: 'blep', fork: true};
      a = {head: [hx + 1, hy - 8], side: [path[8][0], path[8][1] - 3], hold: [hx + 8, hy + 2], rear: [path[1][0], path[1][1]], cube: [54, 30], box: [5, hy - 8, hx + 8, G]};
      break;
    }
    case 7: { // GREMLIN: pot belly, huge ears, one bent horn, wings far too small
      const y0 = -bob, fl = flap;
      const wing = part('membrane', {zone: 'wing'});
      for (const s of [-1, 1]) poly(wing, [[cx + s * 6, G - 19 + y0], [cx + s * 11, G - 24 - fl * 3 + y0], [cx + s * 13, G - 20 - fl + y0], [cx + s * 9, G - 16 + y0]]);
      const tail = part('limb', {zone: 'tail'}); chain(tail, [[cx + 5, G - 6 + y0, 1.2], [cx + 11, G - 3, 1], [cx + 14, G - 8 - sway, 0.7]]);
      const tip = part('horn', {zone: 'tail'}); poly(tip, [[cx + 13, G - 8 - sway], [cx + 15, G - 12 - sway], [cx + 17, G - 8 - sway]]);
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx - 3, G - 7 + y0, cx - 4, G - 1, 1.8); limb(legs, cx + 3, G - 7 + y0, cx + 4, G - 1, 1.8);
      ellipse(legs, cx - 5, G - 0.5, 2.6, 1.1); ellipse(legs, cx + 5, G - 0.5, 2.6, 1.1);
      const b = part('body', {zone: 'body'}); ellipse(b, cx, G - 12 + y0, 8.5, 7.5);
      const bel = part('belly', {zone: 'body'}); ellipse(bel, cx, G - 10.5 + y0, 6, 5);
      const navel = part('limb', {zone: 'body'}); px(navel, cx, G - 9 + y0);
      const arms = part('limb', {zone: 'arm'}); limb(arms, cx - 7, G - 15 + y0, cx - 10, G - 11 + y0 - sway * 3, 1.3, 1); limb(arms, cx + 7, G - 15 + y0, cx + 10, G - 11 + y0, 1.3, 1);
      const head = part('body', {zone: 'head'}); ellipse(head, cx, G - 24 + y0, 7.5, 6.5);
      for (const s of [-1, 1]) poly(head, [[cx + s * 6, G - 27 + y0], [cx + s * 13, G - 29 + y0 + (s > 0 ? alt : 0)], [cx + s * 6, G - 22 + y0]]);
      const horns = part('horn', {zone: 'head'}); chain(horns, [[cx - 3, G - 30 + y0, 1.3], [cx - 4, G - 34 + y0, 0.6]]); chain(horns, [[cx + 3, G - 30 + y0, 1.3], [cx + 5, G - 32 + y0, 1], [cx + 7, G - 31 + y0, 0.6]]);
      px(horns, cx - 11, G - 11 + y0 - sway * 3); px(horns, cx + 11, G - 11 + y0);
      const ew = part('eyeWhite', {zone: 'head'}); goo(ew, cx - 3, G - 25 + y0, 3.2, 2); goo(ew, cx + 3.5, G - 26 + y0, 2.5, 1);
      mouth = {x: cx - 2, y: G - 21 + y0, w: 4, derp: 'under'};
      a = {head: [cx, G - 35 + y0], side: [cx - 15, G - 12], hold: [cx - 11, G - 11 + y0 - sway * 3], rear: [cx + 15, G - 8], cube: [cx + 18, G - 30], box: [cx - 14, G - 35, cx + 17, G]};
      break;
    }
    case 8: { // LONG BOI: fat wyvern, giraffe neck, tiny head, stubby wing
      const y0 = -bob, fl = flap, nx = sway;
      const tail = part('limb', {zone: 'tail'}); chain(tail, [[cx - 17, G - 10 + y0, 2.6], [cx - 24, G - 8, 1.6], [cx - 28, G - 12 - sway, 1]]);
      const far = part('far', {zone: 'legs'}); limb(far, cx - 10, G - 6 + y0, cx - 10 + walk, G - 1, 1.8); limb(far, cx + 1, G - 6 + y0, cx + 1 - walk, G - 1, 1.8);
      const b = part('body', {zone: 'body'}); ellipse(b, cx - 6, G - 10 + y0, 12, 6.5);
      const bel = part('belly', {zone: 'body'}); ellipse(bel, cx - 5, G - 7 + y0, 9, 2.4);
      const wing = part('membrane', {zone: 'wing'}); poly(wing, [[cx - 7, G - 15 + y0], [cx - 10, G - 23 - fl * 3 + y0], [cx - 13, G - 19 - fl + y0], [cx - 15, G - 20 - fl * 2 + y0], [cx - 14, G - 15 + y0]]);
      const bones = part('limb', {zone: 'wing'}); limb(bones, cx - 7, G - 15 + y0, cx - 10, G - 23 - fl * 3 + y0, 0.7, 0.5);
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx - 13, G - 6 + y0, cx - 13 - walk, G - 1, 2); limb(legs, cx + 3, G - 6 + y0, cx + 3 + walk, G - 1, 2);
      const neck = part('body', {zone: 'head'}); chain(neck, [[cx + 3, G - 12 + y0, 3], [cx + 5, G - 19 + y0, 2.2], [cx + 7 + nx, G - 25 + y0, 1.8], [cx + 9 + nx, G - 29 + y0, 1.7]]);
      const head = part('body', {zone: 'head'}); ellipse(head, cx + 11 + nx, G - 31 + y0, 4, 3); ellipse(head, cx + 15 + nx, G - 30 + y0, 2.6, 1.8);
      const ew = part('eyeWhite', {zone: 'head'}); goo(ew, cx + 10 + nx, G - 35 + y0, 2.6, 2); goo(ew, cx + 15 + nx, G - 34 + y0, 2, 1);
      mouth = {x: cx + 15 + nx, y: G - 29 + y0, w: 3, derp: 'blep'};
      a = {head: [cx + 12 + nx, G - 38 + y0], side: [cx - 6, G - 11 + y0], hold: [cx + 19 + nx, G - 29 + y0], rear: [cx - 28, G - 11], cube: [cx + 22, G - 14], box: [cx - 29, G - 37, cx + 19, G]};
      break;
    }
    case 9: { // CHONK: a round dragon with toy wings, smoke from the nose
      const y0 = -bob, fl = flap;
      const wing = part('membrane', {zone: 'wing'});
      for (const s of [-1, 1]) poly(wing, [[cx + s * 10, G - 22 + y0], [cx + s * 17, G - 31 - fl * 2], [cx + s * 20, G - 26 - fl], [cx + s * 16, G - 20]]);
      const tail = part('limb', {zone: 'tail'}); chain(tail, [[cx + 11, G - 3, 2.2], [cx + 18, G - 2, 1.6], [cx + 22, G - 6 - sway, 1]]);
      const feet = part('limb', {zone: 'legs'}); ellipse(feet, cx - 8, G - 1, 3.6, 1.6); ellipse(feet, cx + 8, G - 1, 3.6, 1.6);
      const b = part('body', {zone: 'body'}); ellipse(b, cx, G - 13 + y0, 14, 12.5);
      const bel = part('belly', {zone: 'body'}); ellipse(bel, cx, G - 11 + y0, 9, 9);
      const arms = part('limb', {zone: 'arm'}); limb(arms, cx - 11, G - 17 + y0, cx - 13, G - 12 + y0 - sway * 2, 1.6, 1.2); limb(arms, cx + 11, G - 17 + y0, cx + 13, G - 12 + y0, 1.6, 1.2);
      const claws = part('horn', {zone: 'legs'}); [-10, -7, 7, 10].forEach(o => px(claws, cx + o, G - 1));
      const horns = part('horn', {zone: 'head'}); chain(horns, [[cx - 4, G - 31 + y0, 1.4], [cx - 5, G - 35 + y0, 0.6]]); chain(horns, [[cx + 4, G - 31 + y0, 1.4], [cx + 6, G - 33 + y0, 0.9], [cx + 8, G - 32 + y0, 0.5]]);
      const head = part('body', {zone: 'head'}); ellipse(head, cx, G - 27 + y0, 7.5, 5.5); ellipse(head, cx, G - 24 + y0, 4.5, 2.6);
      const ew = part('eyeWhite', {zone: 'head'}); goo(ew, cx - 4, G - 29 + y0, 3.2, 2); goo(ew, cx + 4, G - 30 + y0, 2.7, 2);
      mouth = {x: cx - 2, y: G - 23 + y0, w: 4, derp: 'buck'};
      a = {head: [cx, G - 35 + y0], side: [cx - 18, G - 10], hold: [cx - 14, G - 12 + y0 - sway * 2], rear: [cx - 17, G - 6], cube: [cx + 25, G - 38], box: [cx - 21, G - 35, cx + 23, G]};
      decor = ctx => { bellyPlates(ctx); snotBubble(ctx, cx + 2, G - 25 + y0); };
      break;
    }
    case 10: { // BIG EYE: ascended into one floating eyeball with tiny wings and dangling legs
      const fy = Math.round(Math.sin(mo.phase * 0.7) * 1.4), y = G - 20 + fy;
      const wing = part('membrane', {zone: 'wing'});
      for (const s of [-1, 1]) for (let i = 0; i < 2; i++) limb(wing, cx + s * 8, y - 3 + i * 2, cx + s * (14 - i * 2), y - 8 - flap * 2 + i * 3, 1, 0.5);
      const halo = part('horn', {zone: 'head'}); ring(halo, cx + (alt ? 2 : 1), y - 17 + (alt ? 1 : 0), 6, 1.8, 1);
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx - 3, y + 11, cx - 4 + alt, y + 16, 0.8); limb(legs, cx + 3, y + 11, cx + 4 - alt, y + 16, 0.8);
      const b = part('body', {zone: 'body'}); poly(b, [[cx, y - 13], [cx + 10, y], [cx, y + 13], [cx - 10, y]]);
      const ew = part('eyeWhite', {zone: 'head'}); ellipse(ew, cx, y - 1, 5.2, 4.6); eyes.push({x: cx, y: y - 1, r: 4.6, rx: 5.2, g: true, p: 3});
      mouth = {x: cx - 1, y: y + 6, w: 3, derp: 'buck'};
      a = {head: [cx + 1, y - 20], side: [cx - 18, y + 4], hold: [cx - 15, y + 4], rear: [cx, y + 17], cube: [cx + 22, 6], box: [cx - 15, y - 20, cx + 15, y + 16], float: true};
      break;
    }
  }
  return {parts, eyes, mouth, a, decor};
}

/* ---- the face: googly eyes in dark rims, pupils that wander off on their own, and derp mouths ---- */
function face(ctx) {
  const {pl, put, body, screen, pal} = ctx;
  const rim = mix(body, screen, 0.62);
  for (const e of pl.eyes) {
    const rx = e.rx || e.r, ry = e.r;
    for (let y = Math.floor(e.y - ry - 1); y <= Math.ceil(e.y + ry + 1); y++) for (let x = Math.floor(e.x - rx - 1); x <= Math.ceil(e.x + rx + 1); x++) {
      const dx = (x - e.x) / rx, dy = (y - e.y) / ry, ox = (x - e.x) / (rx + 1), oy = (y - e.y) / (ry + 1);
      if (ox * ox + oy * oy <= 1.02 && dx * dx + dy * dy > 1.02) put(x, y, rim);
    }
  }
  for (const part of pl.parts) if (part.role === 'eyeWhite') paint(put, part.m, pal.eyeWhite, screen);
  pl.eyes.forEach((e, i) => googly(ctx, e, i, eyeColor(ctx, i)));
  if (pl.mouth) mouth(ctx, pl.mouth);
}

function googly(ctx, e, i, pc) {
  const {put, D, st, has, sleeping, blink, happy, tired, look, form, pl, pal, body, screen, eye} = ctx;
  const rx = e.rx || e.r, ry = e.r, ex = e.x, ey = e.y, lid = pal.limb;
  const each = fn => { for (let y = Math.floor(ey - ry); y <= Math.ceil(ey + ry); y++) for (let x = Math.floor(ex - rx); x <= Math.ceil(ex + rx); x++) { const dx = (x - ex) / rx, dy = (y - ey) / ry; if (dx * dx + dy * dy <= 1.02) fn(x, y); } };
  const shut = () => each((x, y) => put(x, y, y === Math.round(ey) ? eye : lid));
  const expr = ctx.pose.face;
  if (expr && expression(ctx, e, i, pc, each, lid, shut)) return;
  if (!expr && (sleeping || (st === 0 && !has) || (blink && form !== 'owl'))) { shut(); return; }
  // pupils wander on their own: wall-eyed, up, cross-eyed, one up one down; a lone eye rolls around
  let [dx, dy] = pl.eyes.length === 1 ? [[-1, 0], [0, -1], [1, 0], [0, 1]][look] : [[[-1, 0], [1, 0]], [[1, -1], [1, -1]], [[1, 0], [-1, 0]], [[0, 1], [-1, -1]]][look][i % 2];
  if (D.critical) { dx = 0; dy = 1; }
  if (expr) [dx, dy] = gaze(ctx, e);  // look and angry: the pupils follow the click
  let p = e.p || 1;
  if (expr === 'wow') { dx = 0; dy = 0; p = Math.max(1, p - 1); }  // shocked: small pupils dead center
  const k = Math.max(0, Math.floor(Math.min(rx, ry) - p / 2 - 0.2));
  const x0 = Math.round(ex + dx * k - (p - 1) / 2), y0 = Math.round(ey + dy * k - (p - 1) / 2);
  for (let u = 0; u < p; u++) for (let v = 0; v < p; v++) put(x0 + u, y0 + v, pc);
  if (form === 'owl' && p >= 2) put(x0 + p - 1, y0 + p - 1, C.yellow); // a 1px pupil has no room for the glint
  else if (happy && p >= 2) put(x0, y0, '#FFFFFF');
  if (expr === 'wow') put(Math.round(ex - rx * 0.5), Math.round(ey - ry * 0.5), '#FFFFFF');
  if (expr === 'angry') {  // a lid slanting down toward the middle of the face
    const s = pl.eyes.length === 2 && i === 1 ? -1 : 1;
    each((x, y) => { if (y < ey - ry * 0.25 + s * (x - ex) * 0.6) put(x, y, lid); });
  } else if (D.critical) { each((x, y) => { if (y < Math.round(ey)) put(x, y, lid); }); if (i === 0) put(ex - rx + 1, ey + ry + 1, C.drop); }
  else if (tired) for (let x = Math.round(ex - rx + 1); x <= Math.round(ex + rx - 1); x++) put(x, Math.round(ey + ry) + 1, mix(body, screen, 0.45));
}

// Where the pupils point during a clip: at the click, if there was one.
function gaze(ctx, e) {
  const {play, transform} = ctx;
  if (!play || play.gx === undefined) return [0, 0];
  const gx = play.gx - transform.ox, gy = play.gy - transform.oy;
  return [Math.sign(Math.round(gx - e.x)), Math.abs(gy - e.y) > 2 ? Math.sign(gy - e.y) : 0];
}

// Googly eyes during a clip's expression. Returns true when the eye is fully drawn here; look, angry and wow only
// move or resize the pupils and let googly() draw them.
function expression(ctx, e, i, pc, each, lid, shut) {
  const {put, pl, play, skin, eye} = ctx, face = ctx.pose.face;
  const rx = e.rx || e.r, ry = e.r, ex = e.x, ey = e.y, h = Math.max(1, Math.round(Math.min(rx, ry) - 1));
  if (face === 'joy') {  // shut tight and smiling: ^
    each((x, y) => put(x, y, lid));
    for (let x = Math.round(ex - rx + 1); x <= Math.round(ex + rx - 1); x++) put(x, Math.round(ey - 0.5 + Math.abs(x - ex) * 0.7), eye);
    if (play && play.n >= 3) { const bc = mix(C.gem, skin, 0.35); put(Math.round(ex - 1), Math.round(ey + ry + 1), bc); put(Math.round(ex + 1), Math.round(ey + ry + 1), bc); }
    return true;
  }
  if (face === 'giggle') {  // squeezed shut: > <
    const s = pl.eyes.length === 2 && i === 1 ? -1 : 1;
    each((x, y) => put(x, y, lid));
    for (let j = -h; j <= h; j++) put(Math.round(ex + s * (h - Math.abs(j)) - s * h / 2), Math.round(ey + j), eye);
    return true;
  }
  if (face === 'peek' && i > 0) { shut(); return true; }  // one eye cracks open, the other keeps sleeping
  return false;
}

// M.derp: buck (teeth), blep (tongue out; long, fork), open (gaping), under (underbite fang); M.drool
function mouth(ctx, M) {
  const {put, D, aff, st, f, mo, motion, sleeping, happy, pal, eye} = ctx;
  const x = Math.round(M.x), y = Math.round(M.y), w = M.w, tooth = '#FFFFFF';
  if (ctx.pose.mouth) { drawMouth(ctx, {x, y, w: Math.max(3, w)}); return; }  // a clip's expression
  const line = () => { for (let k = 0; k < w; k++) put(x + k, y, eye); if (happy) { put(x - 1, y - 1, eye); put(x + w, y - 1, eye); } };
  if (aff === 'local' && st >= CREST_STAGE && !D.sick) {  // shell prompt, as in Classic
    put(x - 1, y - 1, eye); put(x, y, eye); put(x - 1, y + 1, eye);
    if (!motion || mo.alt) { put(x + 1, y + 1, eye); put(x + 2, y + 1, eye); }
    return;
  }
  if (sleeping) { put(x + 1, y, eye); put(x + 1, y + 1, eye); const d = motion ? (f >> 2) % 4 : 1; if (d < 3) put(x + 2, y + 1 + d, C.drop); return; }
  if (D.sick || D.mood < 30) { for (let k = 0; k < Math.max(w, 3); k++) put(x + k, y + ((k & 1) ? 0 : 1), eye); if (M.derp === 'buck') put(x + 1, y + 2, tooth); return; }
  if (M.derp === 'open') {
    const h = (M.h || 2) + (happy ? 1 : 0);
    for (let j = 0; j < h; j++) for (let k = 0; k < w - (j === h - 1 ? 1 : 0); k++) put(x + k, y + j, eye);
    put(x + w - 3, y + h - 1, C.tongue); put(x + w - 4, y + h - 1, C.tongue); put(x + 1, y, tooth);
  } else if (M.derp === 'buck') {
    line(); const t = x + Math.floor(w / 2) - 1; put(t - 1, y + 1, eye); put(t, y + 1, tooth); put(t + 1, y + 1, tooth); put(t + 2, y + 1, eye);
  } else if (M.derp === 'blep') {
    line(); const tx = x + 1 + (M.long && motion && mo.alt ? 1 : 0), len = M.long ? 3 : 2;
    for (let j = 1; j <= len; j++) put(tx, y + j, C.tongue);
    if (M.long) put(tx + 1, y + 1, C.tongue);
    if (M.fork) { put(tx - 1, y + len + 1, C.tongue); put(tx + 1, y + len + 1, C.tongue); }
  } else if (M.derp === 'under') {
    line(); put(x + w - 1, y - 1, pal.horn); if (happy) put(x, y - 1, pal.horn);
  }
  if (M.drool && motion) { const d = (f >> 1) % 6; if (d < 4) put(x + w, y + 1 + d, C.drop); }
}

// a snot bubble that grows and pops
function snotBubble(ctx, x, y) {
  const {put, f, motion, screen} = ctx;
  if (!motion) return;
  const k = (f >> 1) % 16;
  if (k < 6) {
    const r = [0.5, 1, 1.5, 2, 2.5, 3][k], bx = x + 1 + r, by = y + 1;
    if (r < 1) put(x + 1, by, C.drop);
    else { const m = new Set(); ring(m, bx, by, r, r, 1); for (const q of m) put(q % GW, (q / GW) | 0, mix(C.drop, screen, 0.15)); put(bx - r * 0.5, by - r * 0.5, '#FFFFFF'); }
  } else if (k === 6) [[-1, -1], [1, -1], [-1, 1], [1, 1], [2, 0], [-2, 0]].forEach(([dx, dy]) => put(x + 4 + dx, y + 1 + dy, mix(C.drop, screen, 0.3)));
}
},
'themes/slavic': function (module, require) {
/* Slavic: the line retold as characters from Slavic fairy tales.
   Each creature brings its own colors (plan.main and part.c) and folk ornament (part.pat).
   The affinity still shows in the crest above the head, as in Classic. */
'use strict';
const {G, px, ellipse, poly, limb, chain} = require('render/raster');
const {partList} = require('render/figure');
const {eggCrack} = require('render/egg');

module.exports = {
  id: 'slavic', name: 'Slavic', accent: '#3D6BE0', screen: '#0B0F1D', dot: '#161C2F', drawsEgg: true, reacts: true,
  bodies: ['Pysanka', 'Kolobok', 'Frog tsarevna', 'Domovoi', 'Leshy', 'Humpbacked horse', 'Poloz', 'Baba Yaga', 'Firebird', 'Zmei Gorynych', 'Koschei'],
  plans,
};

const SL = {
  red: '#D23A2C', redDark: '#9C2A22', gold: '#F2B33D', goldDark: '#C08A2A', linen: '#EFE7D3',
  bread: '#DFA65A', crust: '#B9793A', cheek: '#EE7A62',
  frog: '#62B84A', frogDark: '#3F8A33',
  hair: '#8C6A48', hairDark: '#62482F', beard: '#DAD4C5', skin: '#EBBB94', nose: '#D9806A', pants: '#5B6C96', bast: '#D9B35A',
  bark: '#7E5E3E', barkDark: '#5A422C', moss: '#6E9E3C', leaf: '#9CCB4E', branch: '#9A7650', amanita: '#E2402E',
  horse: '#A6B4CE', dapple: '#CDD6E6', mane: '#EDE7D8', hoof: '#545668',
  malachite: '#2FA27C', malLight: '#86E0BA',
  wood: '#8E5E34', woodDark: '#6A4424', woodLight: '#C99A62', straw: '#D2AA58', shawl: '#4E5F8F', hairGray: '#C3C6CC', skinOld: '#DDB896',
  fire: '#FF8A2A', flame: '#FFD24A', ember: '#FF5A2A', wingRed: '#E2412E',
  zmei: '#4E9E45', zmeiDark: '#3A7A34', plate: '#E3C25E',
  cloak: '#5C4082', cloakDark: '#3D2A5C', bone: '#E7E1CD', ghost: '#7CFF8A',
};
// embroidery: a lattice of rhombi in one thread color
const rhomb = (col, n) => (x, y) => { n = n || 6; const a = ((x + y) % n + n) % n, b = ((x - y) % n + n) % n; return a === 0 || b === 0 ? col : null; };
function plans(st, f, mo) {
  const {parts, part} = partList();
  const bob = mo.bob, walk = mo.walk, flap = mo.flap, sway = mo.sway, alt = mo.alt, live = mo.motion && !mo.sleeping;
  const S = SL, cx = 32, mut = mo.mut || {};
  const moved = (pat, dx, dy) => (x, y) => pat(x - dx, y - dy);  // ornament that rides along with the body
  let eyes = [], mouth = null, a = {}, main = null, decor = null;
  switch (st) {
    case 0: { // PYSANKA: a painted Easter egg, gold zigzag belt and sun rosettes on red
      const wob = mo.has ? mo.rock : 0;
      const ex = cx + wob, cy = G - 10 + 0.5;
      main = S.red;
      const pat = (x, y) => {
        const dy = Math.round(y - cy), dx = x - ex;
        if (Math.abs(dy) === 2) return S.linen;
        if (Math.abs(dy) < 2) return [0, 1, 2, 1][((dx % 4) + 4) % 4] === dy + 1 ? S.redDark : S.gold;
        for (const [rx, ry] of [[0, -6], [0, 6]]) { const d = Math.abs(dx - rx) + Math.abs(dy - ry); if (d === 0) return S.linen; if (d === 2) return S.gold; }
        if (Math.abs(dy) === 5 && Math.abs(dx) === 5) return S.linen;
        return null;
      };
      const b = part('body', {zone: 'egg', pattern: pat});
      for (let y = Math.floor(cy - 10); y <= Math.ceil(cy + 10); y++) for (let x = ex - 9; x <= ex + 9; x++) {
        const dy = (y - cy) / 10, rx = 8 * (dy < 0 ? 1 - 0.25 * dy * dy : 1), dx = (x - ex) / rx;
        if (dx * dx + dy * dy <= 1) px(b, x, y);
      }
      a = {head: [ex, cy - 11], side: [ex - 10, cy], hold: [ex - 10, cy + 2], rear: [ex - 9, cy], cube: [ex + 13, cy - 10], box: [ex - 8, cy - 10, ex + 8, G]};
      decor = ctx => eggCrack(ctx, ex, cy - 5);
      break;
    }
    case 1: { // KOLOBOK: the runaway bun, rosy cheeks
      const sq = bob ? 0.7 : 0, rx = 8 + sq, ry = 7.5 - sq, cy = G - ry + 0.5;
      main = S.bread;
      const b = part('body', {zone: 'body', pattern: (x, y) => ((x * 5 + y * 3) % 13 === 0 ? S.crust : null)}); ellipse(b, cx, cy, rx, ry);
      const ch = part('cheek', {zone: 'head', color: S.cheek, flat: true}); [[-7, 0], [-6, 0], [5, 0], [6, 0]].forEach(([dx, dy]) => px(ch, cx + dx, cy + dy));
      eyes = [{x: cx - 4, y: cy - 3, w: 2, h: 2}, {x: cx + 2, y: cy - 3, w: 2, h: 2}];
      mouth = {x: cx - 1, y: cy + 1, w: 3};
      a = {head: [cx, cy - ry - 1], side: [cx - 10, cy], hold: [cx - 10, cy + 2], rear: [cx - 10, cy], cube: [cx + 13, cy - 12], box: [cx - 9, cy - ry - 1, cx + 9, G], split: cy};
      break;
    }
    case 2: { // FROG TSAREVNA: crowned frog with Ivan's arrow in her mouth
      const cy = G - 6 - bob * 0.5;
      main = S.frog;
      const legs = part('limb', {zone: 'legs'});
      ellipse(legs, cx - 11, cy + 2, 3.5, 2.6); ellipse(legs, cx + 11, cy + 2, 3.5, 2.6);
      ellipse(legs, cx - 14, G - 0.5, 2.6, 1); ellipse(legs, cx + 14, G - 0.5, 2.6, 1);
      [-5, 5].forEach((o, i) => { const up = ((i + walk) & 1) ? 1 : 0; limb(legs, cx + o, cy + 3, cx + o * 1.3, G - up, 1.3, 1); });
      const b = part('body', {zone: 'body', pattern: (x, y) => ((x * 3 + y * 5) % 11 === 0 ? S.frogDark : null)}); ellipse(b, cx, cy, 10.5, 5.5); ellipse(b, cx, cy - 3.5, 8.5, 4);
      const bel = part('belly', {zone: 'body'}); ellipse(bel, cx, cy + 2.5, 6.5, 2.4);
      const bumps = part('body', {zone: 'body'}); ellipse(bumps, cx - 5, cy - 7.5, 3, 2.8); ellipse(bumps, cx + 5, cy - 7.5, 3, 2.8);
      const iris = part('eyeWhite', {zone: 'head', color: S.gold}); ellipse(iris, cx - 5, cy - 7.5, 1.8, 1.8); ellipse(iris, cx + 5, cy - 7.5, 1.8, 1.8);
      const shaft = part('far', {zone: 'arm', color: S.woodLight, flat: true}); limb(shaft, cx - 15, cy - 2, cx + 13, cy - 2, 0.4);
      const tip = part('horn', {zone: 'arm', color: '#C9D2DE'}); poly(tip, [[cx + 13, cy - 4], [cx + 17, cy - 2], [cx + 13, cy]]);
      const flet = part('membrane', {zone: 'arm', color: S.red}); poly(flet, [[cx - 18, cy - 5], [cx - 14, cy - 2], [cx - 18, cy + 1], [cx - 16, cy - 2]]);
      if (!mut.crowned) { const cr = part('core', {zone: 'head', color: S.gold}); [[-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-2, -1], [0, -1], [2, -1], [0, -2]].forEach(([dx, dy]) => px(cr, cx + dx, cy - 9 + dy)); }
      eyes = [{x: cx - 5, y: cy - 8, w: 1, h: 2}, {x: cx + 5, y: cy - 8, w: 1, h: 2}];
      mouth = {x: cx - 3, y: cy - 3, w: 7};
      a = {head: [cx, mut.crowned ? cy - 8 : cy - 11], side: [cx - 16, cy - 1], hold: [cx - 15, cy], rear: [cx - 15, cy], cube: [cx + 16, cy - 14], box: [cx - 18, cy - 11, cx + 17, G], split: cy - 2};
      break;
    }
    case 3: { // DOMOVOI: the house spirit, all hair and beard, red shirt, bast shoes, a bath broom
      const cy = G - 11.5 - bob;
      main = S.hair;
      const broom = part('far', {zone: 'arm', color: S.woodLight}); limb(broom, cx + 13, cy - 7, cx + 12, G - 6, 0.6);
      const bristle = part('limb', {zone: 'arm', color: S.straw, pattern: (x, y) => (x % 2 === 0 ? S.goldDark : null)}); poly(bristle, [[cx + 10, G - 6], [cx + 14, G - 6], [cx + 16, G], [cx + 8, G]]);
      const tie = part('core', {zone: 'body', color: S.red}); px(tie, cx + 11, G - 6); px(tie, cx + 12, G - 6); px(tie, cx + 13, G - 6);
      const legs = part('limb', {zone: 'legs', color: S.pants}); limb(legs, cx - 3, cy + 7, cx - 3, G - 1, 1.6); limb(legs, cx + 3, cy + 7, cx + 3, G - 1, 1.6);
      const lapti = part('limb', {zone: 'legs', color: S.bast, pattern: (x, y) => ((x + y) % 2 === 0 ? S.goldDark : null)}); ellipse(lapti, cx - 4.5, G - 0.5, 2.8, 1.3); ellipse(lapti, cx + 4.5, G - 0.5, 2.8, 1.3);
      const shirt = part('body', {zone: 'body', color: S.red, pattern: moved((x, y) => (y >= 6 ? ((x + y) % 2 === 0 ? S.linen : null) : null), 0, Math.round(cy))}); ellipse(shirt, cx, cy + 4, 7.5, 4.5);
      const belt = part('core', {zone: 'body', color: S.gold}); limb(belt, cx - 6, cy + 3, cx + 6, cy + 3, 0.4);
      const arms = part('limb', {zone: 'arm', color: S.red}); limb(arms, cx - 7, cy + 2, cx - 11, cy + 6 - sway * 3, 1.3, 1.1); limb(arms, cx + 7, cy + 2, cx + 11, cy + 6, 1.3, 1.1);
      const hands = part('limb', {zone: 'arm', color: S.skin}); ellipse(hands, cx - 11.5, cy + 6.5 - sway * 3, 1.3, 1.3); ellipse(hands, cx + 11.5, cy + 6.5, 1.3, 1.3);
      const hair = part('body', {zone: 'head', pattern: (x, y) => ((x * 3 + y) % 5 === 0 ? S.hairDark : null)}); ellipse(hair, cx, cy - 3, 8.5, 7.5);
      [[[-7, -7], [-11, -10], [-5, -9]], [[-5, -9], [-5, -13], [-2, -10]], [[-1, -10], [1, -14], [3, -10]], [[3, -10], [8, -12], [6, -8]], [[-8, -3], [-11, -1], [-8, 0]], [[8, -4], [11, -3], [8, -1]]]
        .forEach(t => poly(hair, t.map(([dx, dy]) => [cx + dx, cy + dy])));
      const face = part('body', {zone: 'head', color: S.skin}); ellipse(face, cx, cy - 2.5, 5, 3);
      const beard = part('body', {zone: 'head', color: S.beard, pattern: (x, y) => ((x * 2 + y) % 4 === 0 ? '#B9B2A2' : null)}); poly(beard, [[cx - 6, cy - 1], [cx + 6, cy - 1], [cx + 4, cy + 5], [cx, cy + 8], [cx - 4, cy + 5]]);
      const nose = part('core', {zone: 'head', color: S.nose}); ellipse(nose, cx - 0.5, cy - 1.5, 1.3, 1);
      eyes = [{x: cx - 4, y: cy - 4, w: 2, h: 2}, {x: cx + 2, y: cy - 4, w: 2, h: 2}];
      mouth = {x: cx - 1, y: cy + 1, w: 3};
      a = {head: [cx, cy - 14], side: [cx - 14, cy + 3], hold: [cx - 12, cy + 6 - sway * 3], rear: [cx - 11, cy], cube: [cx - 17, cy - 14], box: [cx - 12, cy - 14, cx + 16, G]};
      break;
    }
    case 4: { // LESHY: forest spirit of bark and moss, branch antlers, a fly agaric on the shoulder
      const y0 = -bob;
      main = S.bark;
      const barkPat = moved((x, y) => ((x * 2 + (y >> 2)) % 5 === 0 ? S.barkDark : null), 0, y0);
      const br = part('horn', {zone: 'head', color: S.branch});
      chain(br, [[cx - 3, G - 29 + y0, 1.2], [cx - 7, G - 33 + y0, 0.9], [cx - 9, G - 38 + y0, 0.6]]); limb(br, cx - 7, G - 33 + y0, cx - 12, G - 35 + y0, 0.5);
      chain(br, [[cx + 3, G - 29 + y0, 1.2], [cx + 7, G - 34 + y0, 0.9], [cx + 8, G - 39 + y0, 0.6]]); limb(br, cx + 7, G - 34 + y0, cx + 12, G - 36 + y0, 0.5);
      const lv = part('leaf', {zone: 'head', color: S.leaf, flat: true}); [[-9, -39], [-10, -38], [-12, -36], [-13, -35], [8, -40], [9, -39], [12, -37], [13, -36]].forEach(([dx, dy]) => px(lv, cx + dx, G + dy + y0));
      const legs = part('limb', {zone: 'legs', pattern: barkPat}); limb(legs, cx - 3, G - 8 + y0, cx - 5, G - 1, 2); limb(legs, cx + 3, G - 8 + y0, cx + 5, G - 1, 2);
      limb(legs, cx - 5, G - 1, cx - 9, G, 0.7); limb(legs, cx + 5, G - 1, cx + 9, G, 0.7);
      const arms = part('limb', {zone: 'arm', pattern: barkPat});
      chain(arms, [[cx - 6, G - 19 + y0, 1.6], [cx - 11, G - 14 + y0, 1.2], [cx - 12, G - 8 + y0 - sway * 2, 1]]); limb(arms, cx - 12, G - 8 + y0 - sway * 2, cx - 14, G - 6 + y0 - sway * 2, 0.5);
      chain(arms, [[cx + 6, G - 19 + y0, 1.6], [cx + 11, G - 14 + y0, 1.2], [cx + 12, G - 8 + y0, 1]]); limb(arms, cx + 12, G - 8 + y0, cx + 14, G - 6 + y0, 0.5);
      const b = part('body', {zone: 'body', pattern: barkPat}); ellipse(b, cx, G - 13 + y0, 7, 8.5);
      const head = part('body', {zone: 'head', pattern: barkPat}); ellipse(head, cx, G - 25 + y0, 6, 5.5);
      const moss = part('body', {zone: 'head', color: S.moss, pattern: (x, y) => ((x * 3 + y * 7) % 5 === 0 ? S.leaf : null)});
      poly(moss, [[cx - 6, G - 24 + y0], [cx + 6, G - 24 + y0], [cx + 5, G - 17 + y0], [cx + 3, G - 13 + y0], [cx + 1, G - 16 + y0], [cx - 1, G - 12 + y0], [cx - 3, G - 15 + y0], [cx - 5, G - 14 + y0]]);
      ellipse(moss, cx, G - 29.5 + y0, 5, 1.6);
      const stem = part('limb', {zone: 'head', color: S.linen}); limb(stem, cx + 9, G - 21 + y0, cx + 9, G - 19 + y0, 0.7);
      const cap = part('body', {zone: 'head', color: S.amanita, pattern: (x, y) => ((x * 2 + y) % 3 === 0 ? '#FFFFFF' : null)}); ellipse(cap, cx + 9, G - 22.5 + y0, 3.2, 1.8);
      eyes = [{x: cx - 3, y: G - 27 + y0, w: 2, h: 1, glow: '#D8F26A'}, {x: cx + 2, y: G - 27 + y0, w: 2, h: 1, glow: '#D8F26A'}];
      mouth = {x: cx - 1, y: G - 22 + y0, w: 3};
      a = {head: [cx, G - 31 + y0], side: [cx - 15, G - 14], hold: [cx - 13, G - 7 + y0 - sway * 2], rear: [cx - 10, G - 8], cube: [cx + 18, G - 34], box: [cx - 15, G - 39, cx + 15, G]};
      break;
    }
    case 5: { // HUMPBACKED HORSE (Konyok-Gorbunok): long ears, a hump, a red saddle cloth and a bell
      const y0 = -bob;
      main = S.horse;
      const dapple = moved((x, y) => ((x * 7 + y * 11) % 10 === 0 ? S.dapple : null), 0, y0);
      const tail = part('limb', {zone: 'tail', color: S.mane}); chain(tail, [[cx - 12, G - 13 + y0, 1.6], [cx - 16, G - 12, 1.4], [cx - 18, G - 7 + sway, 1.1], [cx - 17, G - 4 + sway, 0.8]]);
      const far = part('far', {zone: 'legs'}); limb(far, cx + 4, G - 8 + y0, cx + 3 - walk * 2, G - 1, 1.3); limb(far, cx - 8, G - 8 + y0, cx - 7 + walk * 2, G - 1, 1.3);
      const b = part('body', {zone: 'body', pattern: dapple}); ellipse(b, cx - 2, G - 11 + y0, 10.5, 5.2);
      const hump = part('body', {zone: 'body', pattern: dapple}); ellipse(hump, cx - 5, G - 15.5 + y0, 4.5, 3.6);
      const bel = part('belly', {zone: 'body'}); ellipse(bel, cx - 1, G - 7.5 + y0, 7.5, 1.6);
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx + 6, G - 8 + y0, cx + 7 + walk * 2, G - 1, 1.4); limb(legs, cx - 10, G - 8 + y0, cx - 11 - walk * 2, G - 1, 1.4);
      const hv = part('core', {zone: 'legs', color: S.hoof}); [cx + 7 + walk * 2, cx - 11 - walk * 2, cx + 3 - walk * 2, cx - 7 + walk * 2].forEach(x => { px(hv, x, G - 1); px(hv, x + 1, G - 1); });
      const cloth = part('body', {zone: 'body', color: S.red, pattern: moved(rhomb(S.linen, 4), 0, y0)}); poly(cloth, [[cx - 10, G - 15 + y0], [cx + 1, G - 15 + y0], [cx + 2, G - 9 + y0], [cx - 11, G - 9 + y0]]);
      const fringe = part('core', {zone: 'body', color: S.gold}); for (let x = cx - 11; x <= cx + 2; x += 2) px(fringe, x, G - 8 + y0);
      const neck = part('body', {zone: 'head', pattern: dapple}); limb(neck, cx + 6, G - 13 + y0, cx + 10, G - 19 + y0, 3.2, 2.8);
      const ears = part('body', {zone: 'head'}); poly(ears, [[cx + 9, G - 23 + y0], [cx + 7 - alt, G - 35 + y0], [cx + 11, G - 24 + y0]]); poly(ears, [[cx + 12, G - 24 + y0], [cx + 14, G - 36 + y0], [cx + 14.5, G - 23 + y0]]);
      const inner = part('core', {zone: 'head', color: S.cheek}); limb(inner, cx + 9, G - 25 + y0, cx + 8 - alt, G - 32 + y0, 0.3); limb(inner, cx + 13, G - 25 + y0, cx + 14, G - 33 + y0, 0.3);
      const head = part('body', {zone: 'head'}); ellipse(head, cx + 12, G - 21 + y0, 4.5, 3.8); ellipse(head, cx + 16.5, G - 19.5 + y0, 3, 2.2);
      const mane = part('limb', {zone: 'head', color: S.mane}); chain(mane, [[cx + 9, G - 24 + y0, 1.2], [cx + 7, G - 19 + y0, 1.3], [cx + 4, G - 15 + y0, 1]]);
      const bridle = part('core', {zone: 'head', color: S.red}); limb(bridle, cx + 10, G - 23 + y0, cx + 15, G - 18 + y0, 0.4); px(bridle, cx + 16, G - 18 + y0);
      const bell = part('core', {zone: 'head', color: S.gold}); ellipse(bell, cx + 8 + (live ? alt : 0), G - 13 + y0, 1.2, 1.2);
      eyes = [{x: cx + 11, y: G - 23 + y0, w: 2, h: 2}];
      mouth = {x: cx + 16, y: G - 18 + y0, w: 3};
      a = {head: [cx + 11, G - 26 + y0], side: [cx - 4, G - 11 + y0], hold: [cx + 20, G - 19 + y0], rear: [cx - 18, G - 12], cube: [cx + 22, G - 34], box: [cx - 19, G - 36, cx + 20, G]};
      break;
    }
    case 6: { // POLOZ: the great serpent, malachite and gold, king of snakes
      const ph = mo.phase, N = 16, path = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        path.push([5 + 37 * t, G - 6 - 6 * Math.sin(t * 8 - ph) * (1 - t * 0.5) - 12 * t * t, 1 + 3 * Math.pow(Math.sin(Math.PI * Math.min(t, 0.85) / 0.85), 0.6)]);
      }
      main = S.malachite;
      const scale = (x, y) => ((x + 2 * y) % 6 === 0 ? S.malLight : (x * 3 + y) % 11 === 0 ? S.gold : null);
      const [hx0, hy0] = path[N], hx = hx0 + 3, hy = hy0 - 4;
      const b = part('body', {zone: 'body', pattern: scale}); chain(b, path); limb(b, hx0, hy0, hx, hy, 3, 3);
      const bel = part('belly', {zone: 'body'}); chain(bel, path.slice(2, N - 1).map(([x, y, r]) => [x + 0.5, y + r * 0.55, r * 0.42]));
      const head = part('body', {zone: 'head', pattern: scale}); ellipse(head, hx, hy, 6, 4.5); ellipse(head, hx + 5, hy + 1.5, 4, 2.4);
      if (!mut.crowned) { const cr = part('core', {zone: 'head', color: S.gold}); for (let x = hx - 3; x <= hx + 1; x++) px(cr, x, hy - 5); [[-3, -6], [-1, -6], [1, -6], [-3, -7], [-1, -7], [1, -7], [-1, -8]].forEach(([dx, dy]) => px(cr, hx + dx, hy + dy)); }
      eyes = [{x: hx, y: hy - 2, w: 2, h: 2, glow: S.flame, slit: true}];
      mouth = {x: hx + 5, y: hy + 2, w: 3, tongue: mo.alt};
      a = {head: [hx - 1, mut.crowned ? hy - 5 : hy - 9], side: [path[8][0], path[8][1] - 3], hold: [hx + 10, hy + 2], rear: [path[1][0], path[1][1]], cube: [52, 6], box: [5, hy - 9, hx + 10, G]};
      break;
    }
    case 7: { // BABA YAGA: flying in her mortar, pestle in hand, the broom sweeping her tracks
      const fy = mo.motion ? Math.round(Math.sin(mo.phase * 0.7) * 1.4) : 0, y = G - 16 + fy, sw = live ? alt : 0;
      main = S.wood;
      const handle = part('far', {zone: 'tail', color: S.woodLight}); limb(handle, cx - 5, y + 3, cx - 15, y + 9, 0.6);
      const twigs = part('limb', {zone: 'tail', color: S.straw, pattern: (x, yy) => ((x + yy) % 2 === 0 ? S.goldDark : null)}); poly(twigs, [[cx - 14, y + 7], [cx - 15, y + 10], [cx - 24, y + 12 + sw], [cx - 25, y + 8 - sw], [cx - 21, y + 6]]);
      const shawl = part('body', {zone: 'body', color: S.shawl, pattern: rhomb(S.linen, 4)}); ellipse(shawl, cx, y - 5, 5.5, 3.2);
      const arm = part('limb', {zone: 'arm', color: S.shawl}); limb(arm, cx + 3, y - 5, cx + 6, y - 6, 1.1);
      const pest = part('horn', {zone: 'arm', color: S.woodLight}); chain(pest, [[cx + 4, y - 2, 0.7], [cx + 10, y - 13, 1]]); ellipse(pest, cx + 10.5, y - 14, 1.5, 1.8);
      const hand = part('limb', {zone: 'arm', color: S.skinOld}); ellipse(hand, cx + 6.5, y - 6.5, 1.2, 1.2);
      const mortar = part('body', {zone: 'legs', pattern: moved((x, yy) => (yy % 4 === 0 ? S.woodDark : null), 0, y)}); poly(mortar, [[cx - 8, y - 3], [cx + 8, y - 3], [cx + 6, y + 10], [cx - 6, y + 10]]);
      const rim = part('belly', {zone: 'legs', color: S.woodLight}); limb(rim, cx - 8, y - 3, cx + 8, y - 3, 0.7);
      const hair = part('limb', {zone: 'head', color: S.hairGray}); [[-4, -10], [-4, -9], [-5, -8], [-3, -8], [4, -12], [5, -11]].forEach(([dx, dy]) => px(hair, cx + dx, y + dy));
      const face = part('body', {zone: 'head', color: S.skinOld}); ellipse(face, cx + 0.5, y - 9.5, 4, 3.4);
      const nose = part('limb', {zone: 'head', color: S.skinOld}); poly(nose, [[cx + 3, y - 12], [cx + 8, y - 9], [cx + 8, y - 7], [cx + 4, y - 8]]);
      const wart = part('core', {zone: 'head', color: '#B98A6A'}); px(wart, cx + 6, y - 10);
      const scarf = part('body', {zone: 'head', color: S.red, pattern: (x, yy) => ((x * 2 + yy) % 4 === 0 ? S.linen : null)}); ellipse(scarf, cx + 0.5, y - 13.5, 5, 2.3); poly(scarf, [[cx - 3, y - 13], [cx - 7, y - 6], [cx - 3, y - 10]]);
      eyes = [{x: cx - 2, y: y - 11, w: 2, h: 1}, {x: cx + 2, y: y - 11, w: 1, h: 1}];
      mouth = {x: cx - 1, y: y - 8, w: 3, tooth: true};
      a = {head: [cx + 1, y - 17], side: [cx - 12, y + 3], hold: [cx - 9, y - 4], rear: [cx - 25, y + 9], cube: [cx + 22, 6], box: [cx - 25, y - 16, cx + 12, y + 12], float: true};
      break;
    }
    case 8: { // FIREBIRD (Zhar-ptitsa): burning plumes with peacock eyes, a three-feather crest
      const y0 = -bob, fl = flap, fire = (x, y) => (((x + y + (live ? f : 0)) % 5) === 0 ? S.flame : null);
      main = S.fire;
      const tails = [
        [[cx - 3, G - 13 + y0, 1.6], [cx - 12, G - 11, 1.3], [cx - 20, G - 13 - sway, 1], [cx - 24, G - 19 - sway, 0.8]],
        [[cx - 3, G - 12 + y0, 1.6], [cx - 13, G - 6, 1.2], [cx - 22, G - 5, 1], [cx - 27, G - 9 + sway, 0.8]],
        [[cx - 3, G - 14 + y0, 1.4], [cx - 10, G - 19, 1.1], [cx - 14, G - 25 - sway, 0.9], [cx - 12, G - 30 - sway, 0.7]],
      ];
      const tail = part('limb', {zone: 'tail', color: S.flame, pattern: fire}); tails.forEach(t => chain(tail, t));
      const ring1 = part('core', {zone: 'tail', color: S.gold}), ring2 = part('core', {zone: 'tail', color: S.ember});
      tails.forEach(t => { const [x, y] = t[t.length - 1]; ellipse(ring1, x, y, 2.2, 2.2); ellipse(ring2, x, y, 1, 1); });
      const wing = part('membrane', {zone: 'wing', color: S.wingRed, pattern: (x, y) => ((x - y) % 3 === 0 ? S.flame : null)});
      poly(wing, [[cx - 1, G - 17 + y0], [cx - 4, G - 29 - fl * 2 + y0], [cx - 10, G - 32 - fl * 3 + y0], [cx - 9, G - 25 + y0], [cx - 13, G - 23 - fl + y0], [cx - 6, G - 15 + y0]]);
      const legs = part('limb', {zone: 'legs', color: S.gold}); limb(legs, cx + 1, G - 10 + y0, cx, G - 1, 0.7); limb(legs, cx + 4, G - 10 + y0, cx + 5, G - 1, 0.7);
      [[-1, 0], [1, 0], [4, 0], [6, 0]].forEach(([dx]) => px(legs, cx + dx, G - 1));
      const b = part('body', {zone: 'body', pattern: fire}); ellipse(b, cx + 2, G - 14 + y0, 7, 5.5);
      const breast = part('belly', {zone: 'body', color: S.flame}); ellipse(breast, cx + 5.5, G - 13 + y0, 3, 3.6);
      const wingF = part('limb', {zone: 'wing', color: S.wingRed, pattern: (x, y) => ((x - y) % 3 === 0 ? S.flame : null)}); ellipse(wingF, cx - 0.5, G - 14 + y0, 5, 3);
      const neck = part('body', {zone: 'head'}); limb(neck, cx + 5, G - 18 + y0, cx + 8, G - 22 + y0, 2.4, 2.2);
      const head = part('body', {zone: 'head'}); ellipse(head, cx + 9, G - 24 + y0, 3.6, 3.2);
      const beak = part('horn', {zone: 'head', color: S.gold}); poly(beak, [[cx + 12, G - 25.5 + y0], [cx + 16, G - 23.5 + y0], [cx + 12, G - 22 + y0]]);
      const crest = part('limb', {zone: 'head', color: S.flame}); limb(crest, cx + 8, G - 27 + y0, cx + 6, G - 31 + y0, 0.4); limb(crest, cx + 9, G - 27 + y0, cx + 9, G - 32 + y0, 0.4); limb(crest, cx + 10, G - 27 + y0, cx + 12, G - 31 + y0, 0.4);
      const tips = part('core', {zone: 'head', color: live && alt ? S.flame : S.ember}); [[6, -32], [9, -33], [12, -32]].forEach(([dx, dy]) => px(tips, cx + dx, G + dy + y0));
      if (live) { const em = part('core', {zone: 'tail', color: S.flame}); for (let k = 0; k < 3; k++) { const t = (f + k * 5) % 16; if (t < 10) px(em, cx - 20 + k * 6 + (t & 1), G - 16 - t); } }
      eyes = [{x: cx + 9, y: G - 26 + y0, w: 2, h: 2}];
      mouth = {x: cx + 12, y: G - 24 + y0, w: 3};
      a = {head: [cx + 9, G - 34 + y0], side: [cx - 1, G - 14 + y0], hold: [cx + 16, G - 20 + y0], rear: [cx - 27, G - 12], cube: [cx + 22, G - 12], box: [cx - 28, G - 33, cx + 16, G]};
      break;
    }
    case 9: { // ZMEI GORYNYCH: three heads, golden belly plates, the side heads take turns breathing fire
      const y0 = -bob, fl = flap;
      main = S.zmei;
      const scales = moved((x, y) => ((x * 3 + y * 5) % 7 === 0 ? S.zmeiDark : null), 0, y0);
      const wing = part('membrane', {zone: 'wing', color: '#8E4430'});
      for (const s of [-1, 1]) poly(wing, [[cx + s * 7, G - 21 + y0], [cx + s * 20, G - 36 - fl * 2], [cx + s * 29, G - 29 - fl], [cx + s * 27, G - 20], [cx + s * 23, G - 23], [cx + s * 21, G - 15], [cx + s * 17, G - 19], [cx + s * 13, G - 12], [cx + s * 8, G - 14 + y0]]);
      const bones = part('limb', {zone: 'wing'});
      for (const s of [-1, 1]) { limb(bones, cx + s * 7, G - 21 + y0, cx + s * 20, G - 36 - fl * 2, 1, 0.6); limb(bones, cx + s * 20, G - 36 - fl * 2, cx + s * 29, G - 29 - fl, 0.6, 0.5); limb(bones, cx + s * 20, G - 36 - fl * 2, cx + s * 23, G - 23, 0.5); limb(bones, cx + s * 20, G - 36 - fl * 2, cx + s * 17, G - 19, 0.5); }
      const haunch = part('limb', {zone: 'legs', pattern: scales}); ellipse(haunch, cx - 8, G - 5, 6, 5); ellipse(haunch, cx + 8, G - 5, 6, 5);
      const b = part('body', {zone: 'body', pattern: scales}); ellipse(b, cx, G - 13 + y0, 10, 10.5);
      const bel = part('belly', {zone: 'body', color: S.plate, pattern: moved((x, y) => (y % 3 === 0 ? S.goldDark : null), 0, y0)}); ellipse(bel, cx, G - 11 + y0, 6, 8);
      const arms = part('limb', {zone: 'arm'}); limb(arms, cx - 8, G - 17 + y0, cx - 6, G - 3, 2.2, 1.8); limb(arms, cx + 8, G - 17 + y0, cx + 6, G - 3, 2.2, 1.8);
      const tail = part('limb', {zone: 'tail'}); chain(tail, [[cx + 10, G - 3, 2.6], [cx, G - 0.5, 2.2], [cx - 12, G - 1, 1.6], [cx - 17, G - 5 - sway, 1]]);
      const claws = part('horn', {zone: 'legs'}); [-7, -5, 5, 7].forEach(o => px(claws, cx + o, G - 1)); poly(claws, [[cx - 18, G - 4 - sway], [cx - 21, G - 8 - sway], [cx - 16, G - 7 - sway]]);
      const necks = part('body', {zone: 'head', pattern: scales});
      chain(necks, [[cx - 6, G - 21 + y0, 3], [cx - 11, G - 26 + y0, 2.4], [cx - 14, G - 30 + y0, 2.2]]);
      chain(necks, [[cx + 6, G - 21 + y0, 3], [cx + 11, G - 26 + y0, 2.4], [cx + 14, G - 30 + y0, 2.2]]);
      limb(necks, cx, G - 22 + y0, cx, G - 28 + y0, 3.2, 2.6);
      const heads = part('body', {zone: 'head'});
      for (const s of [-1, 1]) { ellipse(heads, cx + s * 15, G - 31 + y0, 4.2, 3.3); ellipse(heads, cx + s * 19, G - 30 + y0, 2.8, 1.9); }
      ellipse(heads, cx, G - 31 + y0, 4, 3.2); ellipse(heads, cx, G - 28.5 + y0, 2.6, 1.6);
      const horns = part('horn', {zone: 'head'}); for (const hx of [cx - 15, cx, cx + 15]) { px(horns, hx - 2, G - 35 + y0); px(horns, hx + 2, G - 35 + y0); px(horns, hx - 2, G - 34 + y0); px(horns, hx + 2, G - 34 + y0); }
      if (live) {  // the side heads take turns breathing fire
        const s = (f >> 3) & 1 ? 1 : -1, k = (f >> 1) % 4, fx = cx + s * 22, fy = G - 30 + y0;
        const fo = part('core', {zone: 'head', color: S.fire}), fi = part('core', {zone: 'head', color: S.flame});
        for (let i = 0; i <= k + 1; i++) { limb(fo, fx + s * i * 2, fy, fx + s * (i * 2 + 2), fy + (i & 1 ? 1 : -1), 1 + i * 0.35); }
        limb(fi, fx, fy, fx + s * (k + 2), fy, 0.6);
      }
      eyes = [{x: cx - 16, y: G - 33 + y0, w: 1, h: 2}, {x: cx - 2, y: G - 33 + y0, w: 1, h: 2}, {x: cx + 1, y: G - 33 + y0, w: 1, h: 2}, {x: cx + 16, y: G - 33 + y0, w: 1, h: 2}];
      mouth = {x: cx - 1, y: G - 28 + y0, w: 3, fangs: true};
      a = {head: [cx, G - 36 + y0], side: [cx - 17, G - 9], hold: [cx - 7, G - 4], rear: [cx - 18, G - 6], cube: [cx + 25, G - 10], box: [cx - 29, G - 37, cx + 29, G]};
      break;
    }
    case 10: { // KOSCHEI THE DEATHLESS: crowned skull, purple cloak, holding up the egg his death is hidden in
      const fy = Math.round(Math.sin(mo.phase * 0.7) * 1.4), y = G - 18 + fy;
      main = S.cloak;
      const collar = part('far', {zone: 'body', color: S.cloakDark}); poly(collar, [[cx - 6, y - 6], [cx - 10, y - 17], [cx - 3, y - 9]]); poly(collar, [[cx + 6, y - 6], [cx + 10, y - 17], [cx + 3, y - 9]]);
      const cl = part('body', {zone: 'body', pattern: (x, yy) => ((x * 3 + yy * 2) % 13 === 0 ? S.cloakDark : null)});
      const hem = []; for (let x = cx + 10; x >= cx - 10; x -= 2) hem.push([x, y + 12 + ((((x >> 1) + (live ? f >> 1 : 0)) & 1) ? 2 : 0)]);
      poly(cl, [[cx - 6, y - 7], [cx + 6, y - 7]].concat(hem));
      const trim = part('core', {zone: 'body', color: S.gold}); limb(trim, cx, y - 5, cx, y + 11, 0.4); [3, 7].forEach(dy => { px(trim, cx - 1, y + dy); px(trim, cx + 1, y + dy); });
      const arms = part('limb', {zone: 'arm', color: S.bone});
      chain(arms, [[cx - 5, y - 4, 1], [cx - 10, y + 1, 0.8], [cx - 12, y - 3 - sway, 0.7]]);
      chain(arms, [[cx + 5, y - 4, 1], [cx + 10, y + 2, 0.8], [cx + 11, y + 6, 0.6]]); px(arms, cx + 10, y + 7); px(arms, cx + 12, y + 7);
      const egg = part('belly', {zone: 'arm', color: S.gold}); ellipse(egg, cx - 13, y - 6 - sway, 1.8, 2.3);
      if (live && alt) { const gl = part('core', {zone: 'arm', color: '#FFFFFF'}); px(gl, cx - 13, y - 7 - sway); }
      const skull = part('body', {zone: 'head', color: S.bone}); ellipse(skull, cx, y - 11, 4.2, 4.5); ellipse(skull, cx, y - 7.5, 2.8, 1.8);
      const socket = part('core', {zone: 'head', color: '#1C1630'}); ellipse(socket, cx - 2, y - 11.5, 1.3, 1.2); ellipse(socket, cx + 2, y - 11.5, 1.3, 1.2);
      if (!mut.crowned) { const cr = part('core', {zone: 'head', color: S.gold}); for (let x = cx - 4; x <= cx + 4; x++) px(cr, x, y - 15); [[-4, 1], [-2, 1], [0, 3], [2, 1], [4, 1]].forEach(([dx, h]) => { for (let j = 1; j <= h; j++) px(cr, cx + dx, y - 15 - j); }); }
      eyes = [{x: cx - 2, y: y - 12, w: 1, h: 1, glow: S.ghost}, {x: cx + 2, y: y - 12, w: 1, h: 1, glow: S.ghost}];
      mouth = {x: cx - 2, y: y - 8, w: 5, teeth: S.bone};
      a = {head: [cx, mut.crowned ? y - 16 : y - 19], side: [cx - 14, y + 2], hold: [cx + 11, y + 6], rear: [cx, y + 14], cube: [cx + 22, 6], box: [cx - 15, y - 19, cx + 12, y + 14], float: true};
      break;
    }
  }
  return {parts, eyes, mouth, a, main, decor};
}
},
'themes/asian': function (module, require) {
/* Asian: the line retold as creatures from Japanese and Chinese folklore.
   Creatures bring their own colors, as in Slavic; the affinity shows in the crest above the head.
   The koi of stage 2 climbs the Dragon Gate: it comes back as a shachihoko and then as a dragon. */
'use strict';
const {clamp} = require('core/util');
const {G, px, ellipse, ring, poly, limb, chain} = require('render/raster');
const {partList} = require('render/figure');

module.exports = {
  id: 'asian', name: 'Asian', accent: '#3FB28A', screen: '#0A1513', dot: '#14221F', drawsEgg: true, reacts: true,
  bodies: ['Daruma', 'Mochi', 'Koi', 'Kappa', 'Maneki-neko', 'Kitsune', 'Shachihoko', 'Oni', 'Tengu', 'Ryu', 'Raijin'],
  plans,
};

const AS = {
  red: '#D8352B', redDark: '#9C241E', gold: '#F2B63C', goldDark: '#B8862A', paper: '#F3EDDF', ink: '#17151C', nose: '#E3A27C',
  mochi: '#F4B4C3', mochiLight: '#FBD9E1', blush: '#E9788F', leaf: '#6CA845', leafDark: '#477A2C', petal: '#FFC9D6',
  koi: '#F3EFE6', koiRed: '#E8502C', fin: '#F6C9A8', water: '#3F8FC0', foam: '#BFE7F7',
  kappa: '#58AE84', shell: '#86733F', shellDark: '#5E5029', plastron: '#E3D489', beak: '#E9C25A', plate: '#DCE7EC', kHair: '#2D4B3B', cucumber: '#4D9A3A', cukeLight: '#9BCB6A',
  cat: '#F4F1EA', calico: '#EC8A3A', patch: '#2C2A30', earPink: '#F2A3B0', cushion: '#7A3A8C', cushionDark: '#552866', whisker: '#B9B4AA',
  fox: '#EE973A', foxLight: '#F8E9D6', foxDark: '#2C2228', foxfire: '#8FE3FF', foxfireCore: '#EAFBFF',
  shachi: '#F2C24A', shachiDark: '#C08F2A', shachiBelly: '#FBE6A6', tile: '#5E6B7D', tileDark: '#414B59',
  oni: '#D9483A', oniDark: '#A8352B', tiger: '#F2C13A', stripe: '#1E1A1C', iron: '#5B6070', stud: '#BCC2CE', oniHair: '#2A2232',
  tengu: '#D6412F', robe: '#EDE6D2', robeDark: '#C2B9A2', pompom: '#F07F2E', wing: '#2E3242', wingLight: '#59607A', tokin: '#1D1D24', beard: '#ECEAE4', geta: '#8E6A44', fan: '#7B6A4A', fanLight: '#A8946A',
  ryu: '#3C8FD6', ryuLight: '#86C3F2', ryuBelly: '#F2D78C', mane: '#E8473A', pearl: '#E7F4FF', flame: '#FFB23C', cloud: '#7F8CA3', cloudLight: '#B9C4D6',
  raijin: '#EAE4D4', storm: '#4C566B', stormLight: '#7B869C', drum: '#C9372C', drumHead: '#F1E6C8', bolt: '#FFE45A', sash: '#4FB37E', thunderHair: '#2C2E3C', stick: '#C99A62',
};
function plans(st, f, mo) {
  const {parts, part} = partList();
  const bob = mo.bob, walk = mo.walk, flap = mo.flap, sway = mo.sway, alt = mo.alt, live = mo.motion && !mo.sleeping;
  const S = AS, cx = 32;
  const moved = (pat, dx, dy) => (x, y) => pat(x - dx, y - dy);
  const dots = (m, x0, y0, list) => list.forEach(([dx, dy]) => px(m, x0 + dx, y0 + dy));
  let eyes = [], mouth = null, a = {}, main = null;
  switch (st) {
    case 0: { // DARUMA: a tumbler doll. One eye is painted at the first commit, the other fills in as it nears hatching.
      const rock = mo.has ? mo.rock : 0;
      const ex = cx + rock, cy = G - 11 + 0.5, fy = Math.round(cy) - 2;
      main = S.red;
      const b = part('body', {zone: 'egg'});
      for (let y = Math.floor(cy - 11); y <= G; y++) for (let x = ex - 11; x <= ex + 11; x++) {
        const dy = (y - cy) / 11, rx = 10 * (dy < 0 ? 1 - 0.22 * dy * dy : 1 - 0.1 * dy * dy), dx = (x - ex) / rx;
        if (dx * dx + dy * dy <= 1.02) px(b, x, y);
      }
      // the face, cell by cell: w paper, k ink (brows, beard), r mouth, n nose, e eye white; pupils are painted on top
      const FACE = ['....wwwww....', '..kkwwwwwkk..', '.kkkkwwwkkkk.', '.wwwwwwwwwww.', 'wweeewwweeeww', 'weeeeeweeeeew', 'weeeeeneeeeew', 'wweeewwweeeww',
        '.kwwwkkkwwwk.', '.kkkkkrkkkkk.', '..kkkkkkkkk..', '...kkkkkkk...'];
      const cl = {w: part('core', {zone: 'egg', color: S.paper}), k: part('core', {zone: 'egg', color: S.ink}), r: part('core', {zone: 'egg', color: S.red}), n: part('core', {zone: 'egg', color: S.nose}), e: part('core', {zone: 'egg', color: '#FFFFFF'})};
      FACE.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (cl[row[i]]) px(cl[row[i]], ex - 6 + i, fy - 6 + j); });
      const pupil = part('core', {zone: 'egg', color: S.ink}), brush = [[-1, -1], [0, -1], [1, -1], [1, 0], [0, 0], [-1, 0]];  // 3 x 2, in brush-stroke order
      if (mo.has) brush.forEach(([dx, dy]) => px(pupil, ex - 3 + dx, fy + dy));
      if (mo.has) brush.slice(0, Math.ceil(clamp(mo.hatch || 0, 0, 1) * brush.length)).forEach(([dx, dy]) => px(pupil, ex + 3 + dx, fy + dy));
      const gold = part('core', {zone: 'egg', color: S.gold});  // a gold glyph on the belly
      dots(gold, ex, Math.round(cy) + 7, [[-1, -2], [1, -2], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [-1, 0], [1, 0], [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [-1, 2], [1, 2]]);
      a = {head: [ex, cy - 12], side: [ex - 12, cy], hold: [ex - 12, cy + 2], rear: [ex - 11, cy], cube: [ex + 14, cy - 10], box: [ex - 10, cy - 11, ex + 10, G]};
      break;
    }
    case 1: { // MOCHI: a sakura rice cake wrapped in its leaf, a petal drifting down
      const sq = bob ? 0.7 : 0, rx = 8.5 + sq, ry = 7 - sq, cy = G - ry + 0.5;
      main = S.mochi;
      const b = part('body', {zone: 'body', pattern: (x, y) => ((x * 7 + y * 5) % 17 === 0 ? S.mochiLight : null)}); ellipse(b, cx, cy, rx, ry);
      const leaf = part('limb', {zone: 'body', color: S.leaf}); poly(leaf, [[cx - rx - 1, cy - 1], [cx - 2, cy + 3], [cx + 5, cy + ry - 1], [cx + 3, G], [cx - 7, G], [cx - rx, cy + 4]]);
      const vein = part('core', {zone: 'body', color: S.leafDark}); limb(vein, cx - rx, cy + 1, cx + 2, G - 1, 0.3); limb(vein, cx - 4, cy + 3, cx - 5, G - 1, 0.3);
      const ch = part('cheek', {zone: 'head', color: S.blush, flat: true}); [[-7, 0], [-6, 0], [5, 0], [6, 0]].forEach(([dx, dy]) => px(ch, cx + dx, cy - 1 + dy));
      if (live) { const t = f % 24; if (t < 18) { const pt = part('core', {zone: 'head', color: S.petal}); px(pt, cx + 10 - (t >> 2), cy - 12 + (t >> 1)); px(pt, cx + 11 - (t >> 2) - ((t >> 1) & 1), cy - 12 + (t >> 1)); } }
      eyes = [{x: cx - 4, y: cy - 3, w: 2, h: 2}, {x: cx + 2, y: cy - 3, w: 2, h: 2}];
      mouth = {x: cx - 1, y: cy, w: 3};
      a = {head: [cx, cy - ry - 1], side: [cx - 11, cy], hold: [cx - 11, cy + 2], rear: [cx - 11, cy], cube: [cx + 13, cy - 12], box: [cx - 10, cy - ry - 1, cx + 10, G], split: cy};
      break;
    }
    case 2: { // KOI: a kohaku carp leaping out of its pond
      const y0 = -bob, cy = G - 12 + y0, N = 14, path = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        path.push([cx - 12 + 22 * t, cy + 3 - 5 * t - 4 * Math.sin(Math.PI * t), 0.9 + 3.6 * Math.pow(Math.sin(Math.PI * 0.5 * Math.min(t / 0.75, 1)), 1.2)]);
      }
      main = S.koi;
      const [tx, ty] = path[0], [hx0, hy0] = path[N], hx = hx0 + 1, hy = hy0;
      const blobs = [[path[4][0], path[4][1] - 1, 3], [path[9][0], path[9][1] - 2, 3.4], [hx, hy - 3, 2.6]];
      const kohaku = (x, y) => (blobs.some(([bx, by, r]) => (x - bx) * (x - bx) + (y - by) * (y - by) < r * r) ? S.koiRed : null);
      const pond = part('far', {zone: 'legs', color: S.water, pattern: (x, y) => ((x + (live ? f >> 1 : 0)) % 5 === 0 ? S.foam : null), flat: true}); ellipse(pond, cx - 1, G, 14, 1.2);
      const ripple = part('core', {zone: 'legs', color: S.foam}); [-12, -11, 9, 10].forEach(dx => px(ripple, cx + dx, G - 1));
      const tail = part('membrane', {zone: 'tail', color: S.fin, pattern: (x, y) => ((y - ty) % 2 === 0 ? S.koiRed : null)});
      poly(tail, [[tx + 1, ty], [tx - 5, ty - 5 - flap], [tx - 3, ty], [tx - 5, ty + 5 + flap]]);
      const dorsal = part('membrane', {zone: 'wing', color: S.fin}); poly(dorsal, [[path[5][0], path[5][1] - path[5][2] + 1], [path[7][0] - 1, path[7][1] - path[7][2] - 3], [path[9][0], path[9][1] - path[9][2] + 1]]);
      const b = part('body', {zone: 'body', pattern: kohaku}); chain(b, path);
      const head = part('body', {zone: 'head', pattern: kohaku}); ellipse(head, hx, hy, 4.8, 4.2); ellipse(head, hx + 3.5, hy + 0.5, 2.8, 2.6);
      const pect = part('membrane', {zone: 'wing', color: S.fin}); poly(pect, [[hx - 3, hy + 3], [hx - 6, hy + 7 + flap], [hx - 1, hy + 4]]);
      const barbel = part('core', {zone: 'head', color: S.fin}); px(barbel, hx + 5, hy + 3); px(barbel, hx + 6, hy + 4);
      if (live) { const d = part('core', {zone: 'legs', color: S.foam}), k = (f >> 1) % 6; if (k < 4) { px(d, tx - 2, G - 2 - k); px(d, tx + 3, G - 3 - (k >> 1)); } }
      eyes = [{x: hx + 1, y: hy - 1, w: 2, h: 2}];
      mouth = {x: hx + 4, y: hy + 2, w: 2};
      a = {head: [hx, hy - 7], side: [path[7][0], path[7][1] + 1], hold: [hx + 9, hy + 2], rear: [tx - 5, ty], cube: [52, 6], box: [tx - 6, hy - 6, hx + 7, G]};
      break;
    }
    case 3: { // KAPPA: river imp with a water dish on its head, a turtle shell, and a cucumber
      const cy = G - 12.5 - bob;
      main = S.kappa;
      const shell = part('far', {zone: 'body', color: S.shell, pattern: moved((x, y) => (((x + 2 * y) % 6 === 0 || (x - 2 * y) % 6 === 0) ? S.shellDark : null), 0, Math.round(cy))}); ellipse(shell, cx, cy + 2.5, 10.5, 8);
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx - 4, cy + 7, cx - 5, G - 1, 1.7); limb(legs, cx + 4, cy + 7, cx + 5, G - 1, 1.7);
      ellipse(legs, cx - 6, G - 0.5, 3, 1.2); ellipse(legs, cx + 6, G - 0.5, 3, 1.2);
      const b = part('body', {zone: 'body'}); ellipse(b, cx, cy + 3, 7.5, 6.5);
      const pl = part('belly', {zone: 'body', color: S.plastron, pattern: (x, y) => (Math.round(y - cy) % 3 === 0 ? S.goldDark : null)}); ellipse(pl, cx, cy + 4, 5, 4.6);
      const cuke = part('horn', {zone: 'arm', color: S.cucumber, pattern: (x, y) => ((x + y) % 3 === 0 ? S.cukeLight : null)}); limb(cuke, cx + 10, cy - 3 - sway, cx + 13, cy + 7 - sway, 1.4);
      const arms = part('limb', {zone: 'arm'}); limb(arms, cx - 7, cy + 1, cx - 11, cy + 5 - sway * 3, 1.3, 1.1); limb(arms, cx + 7, cy + 1, cx + 11, cy + 2 - sway, 1.3, 1.1);
      const hands = part('limb', {zone: 'arm'}); ellipse(hands, cx - 11.5, cy + 5.5 - sway * 3, 1.4, 1.4); ellipse(hands, cx + 11.5, cy + 2 - sway, 1.4, 1.4);
      const head = part('body', {zone: 'head'}); ellipse(head, cx, cy - 6, 6.5, 5.5);
      const hair = part('limb', {zone: 'head', color: S.kHair}); ellipse(hair, cx, cy - 10.5, 7, 2.2);  // a bowl cut around the dish
      for (const s of [-1, 1]) poly(hair, [[cx + s * 4, cy - 11], [cx + s * 7.5, cy - 10.5], [cx + s * 7.5, cy - 5], [cx + s * 6.5, cy - 6.5], [cx + s * 6, cy - 4.5], [cx + s * 5.5, cy - 8]]);
      const dish = part('core', {zone: 'head', color: S.plate}); ellipse(dish, cx, cy - 11.5, 4.2, 1.2);
      const wat = part('core', {zone: 'head', color: S.foam}); for (let x = cx - 2; x <= cx + 2; x++) px(wat, x, cy - 11.5); if (live && alt) px(wat, cx + 1, cy - 12.5);
      const beak = part('horn', {zone: 'head', color: S.beak}); poly(beak, [[cx - 2.5, cy - 4.5], [cx + 2.5, cy - 4.5], [cx + 1.5, cy - 2], [cx - 1.5, cy - 2]]);
      eyes = [{x: cx - 4, y: cy - 8, w: 2, h: 2}, {x: cx + 2, y: cy - 8, w: 2, h: 2}];
      mouth = {x: cx - 1, y: cy - 3, w: 3};
      a = {head: [cx, cy - 14], side: [cx - 15, cy + 2], hold: [cx - 12, cy + 6 - sway * 3], rear: [cx - 11, cy + 2], cube: [cx + 17, cy - 14], box: [cx - 12, cy - 14, cx + 14, G]};
      break;
    }
    case 4: { // MANEKI-NEKO: the beckoning cat on its cushion, a gold koban in one paw
      const y0 = -bob, wave = live ? sway : 0, hy = G - 23 + y0;
      main = S.cat;
      const calico = moved((x, y) => {
        const o = (x - (cx - 5)) * (x - (cx - 5)) / 16 + (y + 4) * (y + 4) / 9, k = (x - (cx + 6)) * (x - (cx + 6)) / 9 + (y + 7) * (y + 7) / 6;
        return o < 1 ? S.calico : k < 1 ? S.patch : null;
      }, 0, hy);
      const cushion = part('far', {zone: 'legs', color: S.cushion, pattern: (x, y) => ((x + y) % 4 === 0 ? S.cushionDark : null)}); poly(cushion, [[cx - 14, G - 3], [cx + 14, G - 3], [cx + 15, G], [cx - 15, G]]);
      const tas = part('core', {zone: 'legs', color: S.gold}); [[-15, -2], [-16, -1], [-16, 0], [15, -2], [16, -1], [16, 0]].forEach(([dx, dy]) => px(tas, cx + dx, G + dy));
      const tail = part('limb', {zone: 'tail'}); chain(tail, [[cx + 7, G - 6, 1.6], [cx + 11, G - 7, 1.3], [cx + 12, G - 11 - sway, 1]]);
      const b = part('body', {zone: 'body', pattern: moved((x, y) => ((x - cx - 4) * (x - cx - 4) / 10 + (y + 7) * (y + 7) / 5 < 1 ? S.calico : null), 0, G)}); ellipse(b, cx, G - 10.5 + y0 * 0.5, 9, 7.5);
      const feet = part('limb', {zone: 'legs'}); ellipse(feet, cx - 3.5, G - 3.5, 2.2, 1.3); ellipse(feet, cx + 3.5, G - 3.5, 2.2, 1.3);
      const koban = part('horn', {zone: 'arm', color: S.gold, pattern: (x, y) => (x % 2 === 0 ? S.goldDark : null)}); ellipse(koban, cx + 7, G - 9 + y0 * 0.5, 2.6, 4);
      const paw = part('limb', {zone: 'arm'}); limb(paw, cx + 6, G - 14 + y0, cx + 6, G - 11 + y0, 1.5); ellipse(paw, cx + 6.5, G - 10.5 + y0, 1.7, 1.4);
      const arm = part('limb', {zone: 'arm'}); limb(arm, cx - 6, G - 15 + y0, cx - 10, G - 21 + y0, 1.7, 1.5);
      ellipse(arm, cx - 10.5 - wave, G - 23 + y0 + wave * 2, 2, 1.8);
      const pad = part('core', {zone: 'arm', color: S.earPink}); px(pad, cx - 10 - wave, G - 23 + y0 + wave * 2);
      const head = part('body', {zone: 'head', pattern: calico}); ellipse(head, cx, hy, 9.5, 7);
      const ears = part('body', {zone: 'head', pattern: calico}); poly(ears, [[cx - 9, hy - 2], [cx - 8, hy - 11], [cx - 3, hy - 6]]); poly(ears, [[cx + 9, hy - 2], [cx + 8, hy - 11], [cx + 3, hy - 6]]);
      const inner = part('core', {zone: 'head', color: S.earPink}); limb(inner, cx - 7, hy - 5, cx - 7.5, hy - 8, 0.4); limb(inner, cx + 7, hy - 5, cx + 7.5, hy - 8, 0.4);
      const wh = part('core', {zone: 'head', color: S.whisker}); limb(wh, cx - 7, hy + 2, cx - 12, hy + 1, 0.3); limb(wh, cx - 7, hy + 3, cx - 12, hy + 4, 0.3); limb(wh, cx + 7, hy + 2, cx + 12, hy + 1, 0.3); limb(wh, cx + 7, hy + 3, cx + 12, hy + 4, 0.3);
      const nose = part('core', {zone: 'head', color: S.earPink}); px(nose, cx, hy + 1);
      const collar = part('core', {zone: 'head', color: S.red}); limb(collar, cx - 6, G - 16 + y0, cx + 6, G - 16 + y0, 0.5);
      const bell = part('horn', {zone: 'head', color: S.gold}); ellipse(bell, cx, G - 14.5 + y0, 1.4, 1.4);
      eyes = [{x: cx - 5, y: hy - 2, w: 2, h: 2}, {x: cx + 3, y: hy - 2, w: 2, h: 2}];
      mouth = {x: cx - 1, y: hy + 2, w: 3};
      a = {head: [cx, hy - 8], side: [cx - 16, G - 10], hold: [cx - 11, G - 23 + y0 + wave * 2], rear: [cx - 13, G - 6], cube: [cx + 17, G - 34], box: [cx - 15, hy - 11, cx + 15, G]};
      break;
    }
    case 5: { // KITSUNE: a three-tailed fox with a red bib, foxfire floating around it
      const y0 = -bob;
      main = S.fox;
      const tails = [
        [[cx - 11, G - 13 + y0, 2.2], [cx - 16, G - 19, 2.8], [cx - 17, G - 26 - sway, 2.4], [cx - 14, G - 31 - sway, 1.2]],
        [[cx - 11, G - 12 + y0, 2.2], [cx - 18, G - 14, 2.8], [cx - 23, G - 18 + sway, 2.3], [cx - 26, G - 23 + sway, 1.2]],
        [[cx - 11, G - 11 + y0, 2.2], [cx - 18, G - 8, 2.6], [cx - 24, G - 8 - sway, 2], [cx - 27, G - 11 - sway, 1]],
      ];
      const tl = part('body', {zone: 'tail'}); tails.forEach(t => chain(tl, t));
      const tips = part('belly', {zone: 'tail', color: S.foxLight}); tails.forEach(t => { const [x1, y1] = t[t.length - 1], [x2, y2] = t[t.length - 2]; limb(tips, x1, y1, x1 + (x2 - x1) * 0.3, y1 + (y2 - y1) * 0.3, 1.6, 1.8); });
      const far = part('far', {zone: 'legs'}); limb(far, cx + 4, G - 8 + y0, cx + 3 - walk * 2, G - 1, 1.2); limb(far, cx - 7, G - 8 + y0, cx - 6 + walk * 2, G - 1, 1.2);
      const b = part('body', {zone: 'body'}); ellipse(b, cx - 2, G - 11 + y0, 10, 4.6);
      const bel = part('belly', {zone: 'body', color: S.foxLight}); ellipse(bel, cx - 1, G - 7.5 + y0, 7, 1.4);
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx + 6, G - 8 + y0, cx + 7 + walk * 2, G - 1, 1.3); limb(legs, cx - 9, G - 8 + y0, cx - 10 - walk * 2, G - 1, 1.3);
      const socks = part('core', {zone: 'legs', color: S.foxDark}); [cx + 7 + walk * 2, cx - 10 - walk * 2, cx + 3 - walk * 2, cx - 6 + walk * 2].forEach(x => { px(socks, x, G - 1); px(socks, x, G - 2); px(socks, x + 1, G - 1); });
      const neck = part('body', {zone: 'head'}); limb(neck, cx + 6, G - 13 + y0, cx + 10, G - 18 + y0, 3, 2.6);
      const chest = part('belly', {zone: 'body', color: S.foxLight}); ellipse(chest, cx + 9, G - 14 + y0, 2.4, 3.2);
      const bib = part('body', {zone: 'body', color: S.red}); poly(bib, [[cx + 6, G - 17 + y0], [cx + 12, G - 18 + y0], [cx + 11, G - 13 + y0], [cx + 8, G - 11 + y0]]);
      const ears = part('body', {zone: 'head'}); poly(ears, [[cx + 9, G - 22 + y0], [cx + 9, G - 31 + y0], [cx + 12, G - 24 + y0]]); poly(ears, [[cx + 12, G - 24 + y0], [cx + 15, G - 31 + y0], [cx + 15.5, G - 22 + y0]]);
      const inner = part('core', {zone: 'head', color: S.foxDark}); limb(inner, cx + 10, G - 25 + y0, cx + 9.5, G - 29 + y0, 0.3); limb(inner, cx + 14, G - 25 + y0, cx + 14.5, G - 29 + y0, 0.3);
      const head = part('body', {zone: 'head'}); ellipse(head, cx + 12, G - 21 + y0, 4.6, 3.8); poly(head, [[cx + 14, G - 23 + y0], [cx + 21, G - 20 + y0], [cx + 20, G - 18.5 + y0], [cx + 14, G - 17.5 + y0]]);
      const cheek = part('belly', {zone: 'head', color: S.foxLight}); ellipse(cheek, cx + 14, G - 18.5 + y0, 2.6, 1.3);
      const nose = part('core', {zone: 'head', color: S.foxDark}); px(nose, cx + 21, G - 20 + y0);
      const mark = part('core', {zone: 'head', color: S.red}); [[12, -23], [13, -23], [14, -23], [15, -24]].forEach(([dx, dy]) => px(mark, cx + dx, G + dy + y0));
      for (const [k, x, y] of [[0, cx - 3, G - 25], [1, cx + 23, G - 30]]) {  // foxfire
        const yy = y + (live ? ((f >> 2) + k) & 1 : 0), fl = live && ((f >> 1) + k) & 1;
        const out = part('core', {zone: 'tail', color: S.foxfire}), core = part('core', {zone: 'tail', color: S.foxfireCore});
        dots(out, x, yy, [[-1, 0], [2, 0], [-1, 1], [2, 1], [0, 2], [1, 2], [0, -1], [1, -1], [fl ? 1 : 0, -2], [fl ? 0 : 1, -3]]);
        dots(core, x, yy, [[0, 0], [1, 0], [0, 1], [1, 1]]);
      }
      eyes = [{x: cx + 12, y: G - 22 + y0, w: 2, h: 1}];
      mouth = {x: cx + 17, y: G - 18 + y0, w: 3};
      a = {head: [cx + 12, G - 31 + y0], side: [cx - 4, G - 11 + y0], hold: [cx + 22, G - 19 + y0], rear: [cx - 27, G - 12], cube: [cx + 24, G - 12], box: [cx - 28, G - 33, cx + 21, G]};
      break;
    }
    case 6: { // SHACHIHOKO: the carp come back with a tiger's head, all gold, standing on its head on a castle roof
      main = S.shachi;
      const scales = (x, y) => (y % 2 === 0 && (x + (y >> 1)) % 3 === 0 ? S.shachiDark : null);
      const path = [[cx + 3, G - 10, 4], [cx - 4, G - 13, 4.4], [cx - 9, G - 19, 4], [cx - 10, G - 26, 3.2], [cx - 7, G - 31, 2.2], [cx - 3 + sway, G - 34, 1.2]];
      const roof = part('far', {zone: 'legs', color: S.tile, pattern: (x, y) => (x % 3 === 0 ? S.tileDark : null)}); poly(roof, [[cx - 15, G - 4], [cx + 15, G - 4], [cx + 17, G], [cx - 17, G]]);
      const ridge = part('limb', {zone: 'legs', color: S.tileDark}); limb(ridge, cx - 15, G - 4, cx + 15, G - 4, 0.6);
      const [fx, fy] = path[path.length - 1];
      const fin = part('membrane', {zone: 'wing', color: S.shachiBelly, pattern: (x, y) => ((x - y) % 2 === 0 ? S.shachiDark : null)});
      poly(fin, [[fx - 1, fy + 1], [fx - 7, fy - 5 - flap], [fx - 1, fy - 3], [fx + 5, fy - 6 - flap], [fx + 2, fy + 1]]);
      const spines = part('horn', {zone: 'body', color: S.shachiBelly}); [1, 2, 3].forEach(i => { const [x, y, r] = path[i]; poly(spines, [[x - r + 1, y - 2], [x - r - 3, y - 3], [x - r + 1, y + 1]]); });
      const b = part('body', {zone: 'body', pattern: scales}); chain(b, path);
      const bel = part('belly', {zone: 'body', color: S.shachiBelly, pattern: (x, y) => (y % 2 === 0 ? S.gold : null)}); chain(bel, path.slice(0, 5).map(([x, y, r]) => [x + r * 0.55, y + r * 0.2, r * 0.42]));
      const pect = part('membrane', {zone: 'wing', color: S.shachiBelly}); poly(pect, [[cx, G - 9], [cx - 4, G - 5], [cx + 2, G - 6]]);
      const mane = part('limb', {zone: 'head', color: S.shachiDark}); [[1, -16], [-1, -12], [0, -8], [3, -18]].forEach(([dx, dy]) => ellipse(mane, cx + dx, G + dy, 1.8, 1.6));
      const head = part('body', {zone: 'head', pattern: scales}); ellipse(head, cx + 6, G - 12, 5.5, 5);
      const snout = part('body', {zone: 'head'}); ellipse(snout, cx + 11, G - 13, 3.6, 2.2);
      const jaw = part('limb', {zone: 'head'}); ellipse(jaw, cx + 10.5, G - 8, 3.6, 1.5);
      const brow = part('horn', {zone: 'head', color: S.shachiBelly}); poly(brow, [[cx + 4, G - 17], [cx + 10, G - 17], [cx + 11, G - 15], [cx + 5, G - 16]]);
      const whisk = part('core', {zone: 'head', color: S.shachiBelly}); chain(whisk, [[cx + 14, G - 13, 0.3], [cx + 16, G - 15, 0.3], [cx + 15, G - 17 - sway, 0.3]]);
      eyes = [{x: cx + 7, y: G - 14, w: 2, h: 2, glow: '#FF6A3A'}];
      mouth = {x: cx + 9, y: G - 10, w: 5, fangs: true};
      a = {head: [cx + 7, G - 19], side: [cx - 16, G - 17], hold: [cx + 18, G - 10], rear: [cx - 12, G - 22], cube: [cx + 19, G - 34], box: [cx - 17, G - 40, cx + 16, G]};
      break;
    }
    case 7: { // ONI: red ogre in a tiger-skin loincloth, an iron kanabo club in hand
      const y0 = -bob, lift = live ? sway : 0;
      main = S.oni;
      const hair = part('limb', {zone: 'head', color: S.oniHair}); poly(hair, [[cx - 7, G - 26 + y0], [cx - 9, G - 32 + y0], [cx - 5, G - 31 + y0], [cx - 4, G - 35 + y0], [cx - 1, G - 32 + y0], [cx + 2, G - 35 + y0], [cx + 4, G - 31 + y0], [cx + 9, G - 32 + y0], [cx + 7, G - 26 + y0]]);
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx - 4, G - 9 + y0, cx - 5, G - 1, 2.4); limb(legs, cx + 4, G - 9 + y0, cx + 5, G - 1, 2.4);
      ellipse(legs, cx - 6, G - 0.5, 3.2, 1.3); ellipse(legs, cx + 6, G - 0.5, 3.2, 1.3);
      const torso = part('body', {zone: 'body', pattern: moved((x, y) => ((x === cx && y > -16 && y < -12) || (y === -17 && Math.abs(x - cx) < 5 && x !== cx) ? S.oniDark : null), 0, G + y0)}); ellipse(torso, cx, G - 17 + y0, 8, 6.5);
      const cloth = part('body', {zone: 'body', color: S.tiger, pattern: moved((x, y) => ((x + (y >> 1)) % 4 === 0 ? S.stripe : null), 0, y0)});
      poly(cloth, [[cx - 7, G - 13 + y0], [cx + 7, G - 13 + y0], [cx + 6, G - 8 + y0], [cx + 3, G - 6 + y0], [cx, G - 8 + y0], [cx - 3, G - 6 + y0], [cx - 6, G - 8 + y0]]);
      const club = part('horn', {zone: 'arm', color: S.iron, pattern: (x, y) => ((x + y) % 3 === 0 && y < G - 14 ? S.stud : null)}); limb(club, cx - 12, G - 6 - lift * 3, cx - 14, G - 31 - lift * 3, 1, 2.4);
      const arms = part('limb', {zone: 'arm'}); chain(arms, [[cx - 7, G - 21 + y0, 2], [cx - 11, G - 17 + y0, 1.7], [cx - 12, G - 13 - lift * 3, 1.6]]); chain(arms, [[cx + 7, G - 21 + y0, 2], [cx + 11, G - 17 + y0, 1.7], [cx + 11, G - 13 + y0, 1.6]]);
      const fists = part('limb', {zone: 'arm'}); ellipse(fists, cx - 12, G - 12.5 - lift * 3, 1.8, 1.8); ellipse(fists, cx + 11, G - 12 + y0, 1.8, 1.8);
      const cuffs = part('core', {zone: 'arm', color: S.gold}); limb(cuffs, cx - 13.5, G - 15 - lift * 3, cx - 10.5, G - 15 - lift * 3, 0.3); limb(cuffs, cx + 9.5, G - 15 + y0, cx + 12.5, G - 15 + y0, 0.3);
      const head = part('body', {zone: 'head'}); ellipse(head, cx, G - 27 + y0, 6, 5);
      const horns = part('horn', {zone: 'head'}); poly(horns, [[cx - 5, G - 30 + y0], [cx - 7, G - 36 + y0], [cx - 3, G - 31 + y0]]); poly(horns, [[cx + 5, G - 30 + y0], [cx + 7, G - 36 + y0], [cx + 3, G - 31 + y0]]);
      const brow = part('core', {zone: 'head', color: S.oniDark}); dots(brow, cx, G - 30 + y0, [[-4, -1], [-3, 0], [-2, 0], [4, -1], [3, 0], [2, 0]]);
      eyes = [{x: cx - 4, y: G - 29 + y0, w: 2, h: 2, glow: '#FFE27A'}, {x: cx + 2, y: G - 29 + y0, w: 2, h: 2, glow: '#FFE27A'}];
      mouth = {x: cx - 2, y: G - 25 + y0, w: 5, fangs: true};
      a = {head: [cx, G - 36 + y0], side: [cx + 16, G - 17], hold: [cx + 12, G - 12 + y0], rear: [cx - 16, G - 4], cube: [cx + 18, G - 34], box: [cx - 17, G - 36, cx + 14, G]};
      break;
    }
    case 8: { // TENGU: winged mountain goblin, red long-nosed face, a feather fan and one-toothed geta
      const y0 = 2 - bob, fl = flap, fan = live ? sway : 0;
      main = S.tengu;
      const wing = part('membrane', {zone: 'wing', color: S.wing, pattern: (x, y) => ((x + y) % 4 === 0 ? S.wingLight : null)});
      for (const s of [-1, 1]) poly(wing, [[cx + s * 5, G - 24 + y0], [cx + s * 13, G - 32 - fl * 2], [cx + s * 22, G - 34 - fl * 3], [cx + s * 27, G - 30 - fl * 2], [cx + s * 24, G - 26 - fl], [cx + s * 26, G - 22], [cx + s * 21, G - 20], [cx + s * 22, G - 15], [cx + s * 17, G - 16], [cx + s * 15, G - 11], [cx + s * 7, G - 15 + y0]]);
      const hair = part('limb', {zone: 'head', color: S.beard, pattern: (x, y) => ((x + y) % 3 === 0 ? '#CFCBC2' : null)}); ellipse(hair, cx - 2, G - 29 + y0, 5.5, 5); poly(hair, [[cx - 7, G - 30 + y0], [cx - 10, G - 21 + y0], [cx - 3, G - 24 + y0]]);
      const geta = part('limb', {zone: 'legs', color: S.geta}); for (const s of [-1, 1]) { limb(geta, cx + s * 3 - 1.5, G - 2, cx + s * 3 + 1.5, G - 2, 0.5); px(geta, cx + s * 3, G - 1); px(geta, cx + s * 3, G); }
      const robe = part('body', {zone: 'body', color: S.robe, pattern: moved((x, y) => ((x - cx) % 4 === 0 && y > -16 ? S.robeDark : null), 0, G + y0)}); poly(robe, [[cx - 6, G - 24 + y0], [cx + 6, G - 24 + y0], [cx + 8, G - 3], [cx - 8, G - 3]]);
      const slit = part('core', {zone: 'body', color: S.robeDark}); limb(slit, cx, G - 9, cx, G - 3, 0.3);
      const sleeves = part('body', {zone: 'arm', color: S.robe}); poly(sleeves, [[cx - 6, G - 23 + y0], [cx - 11, G - 16 + y0], [cx - 8, G - 13 + y0], [cx - 5, G - 17 + y0]]); poly(sleeves, [[cx + 6, G - 23 + y0], [cx + 11, G - 17 + y0], [cx + 9, G - 14 + y0], [cx + 5, G - 18 + y0]]);
      const pom = part('belly', {zone: 'body', color: S.pompom}); [[-3, -19], [3, -19], [-3, -15], [3, -15], [-3, -11], [3, -11]].forEach(([dx, dy]) => ellipse(pom, cx + dx, G + dy + y0, 1.1, 1.1));
      const handle = part('far', {zone: 'arm', color: S.geta}); limb(handle, cx + 10, G - 15 + y0, cx + 12, G - 20 - fan, 0.5);
      const fanM = part('membrane', {zone: 'arm', color: S.fan, pattern: (x, y) => ((x + y) % 2 === 0 ? S.fanLight : null)}); poly(fanM, [[cx + 12, G - 20 - fan], [cx + 9, G - 25 - fan * 2], [cx + 12, G - 31 - fan * 2], [cx + 17, G - 28 - fan * 2], [cx + 15, G - 21 - fan]]);
      const hands = part('limb', {zone: 'arm', color: S.tengu}); ellipse(hands, cx - 9.5, G - 13.5 + y0, 1.3, 1.3); ellipse(hands, cx + 10, G - 15 + y0, 1.3, 1.3);
      const head = part('body', {zone: 'head'}); ellipse(head, cx + 1, G - 28 + y0, 4.6, 4.4);
      const beard = part('limb', {zone: 'head', color: S.beard, pattern: (x, y) => ((x + y) % 3 === 0 ? '#CFCBC2' : null)}); poly(beard, [[cx - 3, G - 25 + y0], [cx + 4, G - 25 + y0], [cx + 2, G - 21 + y0], [cx, G - 21 + y0]]);
      const nose = part('body', {zone: 'head'}); limb(nose, cx + 3, G - 28 + y0, cx + 13, G - 26 + y0, 1.5, 0.9);
      const tokin = part('core', {zone: 'head', color: S.tokin}); poly(tokin, [[cx - 1, G - 32 + y0], [cx + 3, G - 32 + y0], [cx + 2, G - 35 + y0], [cx, G - 35 + y0]]);
      const brows = part('core', {zone: 'head', color: S.beard}); dots(brows, cx, G - 31 + y0, [[-3, 0], [-2, 0], [-1, 1], [5, 0], [4, 0], [3, 1]]);
      eyes = [{x: cx - 2, y: G - 30 + y0, w: 2, h: 1, glow: S.gold}, {x: cx + 3, y: G - 30 + y0, w: 2, h: 1, glow: S.gold}];
      mouth = {x: cx, y: G - 24 + y0, w: 3};
      a = {head: [cx + 1, G - 36 + y0], side: [cx - 13, G - 9], hold: [cx - 10, G - 13 + y0], rear: [cx - 9, G - 5], cube: [cx + 24, G - 10], box: [cx - 27, G - 37, cx + 27, G]};
      break;
    }
    case 9: { // RYU: an eastern dragon without wings, swimming through clouds after a flaming pearl
      const ph = mo.phase, N = 22, path = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        path.push([4 + 37 * t, G - 15 - 5.5 * Math.sin(t * 7 - ph) * (1 - 0.6 * t) - 7 * t, 0.8 + 2.4 * Math.pow(Math.min(1, t * 2.5), 0.7)]);
      }
      main = S.ryu;
      const scales = (x, y) => ((x + 2 * y) % 5 === 0 ? S.ryuLight : null);
      const [hx0, hy0] = path[N], hx = hx0 + 2, hy = hy0 - 1;
      const clouds = part('far', {zone: 'legs', color: S.cloud, pattern: (x, y) => ((x - 2 * y) % 7 === 0 ? S.cloudLight : null), flat: true});
      [[12, G - 3, 6, 2.2], [18, G - 4, 4, 2.6], [38, G - 3, 5, 2], [43, G - 4, 3.5, 2.4]].forEach(([x, y, rx, ry]) => ellipse(clouds, x, y, rx, ry));
      const farLegs = part('far', {zone: 'legs'}); [6, 15].forEach(i => { const [x, y, r] = path[i]; limb(farLegs, x - 1, y + r * 0.5, x - 3, y + r + 3, 0.9, 0.7); });
      const mane = part('limb', {zone: 'body', color: S.mane}); for (let i = 3; i < N - 1; i += 2) { const [x, y, r] = path[i]; poly(mane, [[x - 1.5, y - r + 0.5], [x - 0.5, y - r - 2 - (i & 2 ? 1 : 0)], [x + 1, y - r + 0.5]]); }
      const tuft = part('limb', {zone: 'tail', color: S.mane}); poly(tuft, [[path[0][0] + 1, path[0][1] - 1], [path[0][0] - 3, path[0][1] - 4 - sway], [path[0][0] - 2, path[0][1]], [path[0][0] - 3, path[0][1] + 3 + sway]]);
      const b = part('body', {zone: 'body', pattern: scales}); chain(b, path);
      const bel = part('belly', {zone: 'body', color: S.ryuBelly, pattern: (x, y) => (x % 2 === 0 ? S.goldDark : null)}); chain(bel, path.slice(2, N - 1).map(([x, y, r]) => [x + 0.3, y + r * 0.55, r * 0.4]));
      const legs = part('limb', {zone: 'legs'}); [8, 17].forEach(i => { const [x, y, r] = path[i]; limb(legs, x, y + r * 0.5, x + 2, y + r + 3, 1, 0.8); });
      const claws = part('core', {zone: 'legs', color: S.gold}); [8, 17].forEach(i => { const [x, y, r] = path[i]; dots(claws, Math.round(x + 2), Math.round(y + r + 4), [[-1, 0], [0, 0], [1, 0]]); });
      const horns = part('horn', {zone: 'head'}); chain(horns, [[hx - 2, hy - 3, 0.8], [hx - 6, hy - 9, 0.6]]); limb(horns, hx - 4.5, hy - 7, hx - 2, hy - 10, 0.5); chain(horns, [[hx + 1, hy - 3, 0.7], [hx - 1, hy - 8, 0.5]]);
      const hmane = part('limb', {zone: 'head', color: S.mane}); poly(hmane, [[hx - 2, hy - 2], [hx - 7, hy - 5], [hx - 5, hy], [hx - 8, hy + 3], [hx - 2, hy + 2]]);
      const head = part('body', {zone: 'head', pattern: scales}); ellipse(head, hx, hy, 4.8, 3.8); ellipse(head, hx + 5, hy + 0.5, 3.4, 2.3);
      const jaw = part('limb', {zone: 'head'}); poly(jaw, [[hx, hy + 3], [hx + 8, hy + 3.5], [hx + 3, hy + 5]]);
      const whisk = part('core', {zone: 'head', color: S.gold}), wv = live ? alt : 0; chain(whisk, [[hx + 7, hy, 0.3], [hx + 4, hy - 3 - wv, 0.3], [hx, hy - 4, 0.3], [hx - 4, hy - 2 + wv, 0.3]]); chain(whisk, [[hx + 8, hy + 2, 0.3], [hx + 5, hy + 6 + wv, 0.3], [hx, hy + 7, 0.3], [hx - 5, hy + 6 - wv, 0.3]]);
      const pr = [hx + 14, hy - 3], fire = part('core', {zone: 'arm', color: live && alt ? S.gold : S.flame}); ring(fire, pr[0], pr[1], 2.8, 2.8, 1);
      const pearl = part('belly', {zone: 'arm', color: S.pearl}); ellipse(pearl, pr[0], pr[1], 1.8, 1.8);
      if (live) { const sp = part('core', {zone: 'arm', color: S.flame}), k = (f >> 1) % 4; dots(sp, pr[0], pr[1], [[[0, -4], [3, -3], [4, 0], [3, 3]][k], [[-3, 3], [-4, 0], [-3, -3], [0, 4]][k]]); }
      eyes = [{x: hx + 1, y: hy - 2, w: 2, h: 1, glow: S.gold}];
      mouth = {x: hx + 4, y: hy + 3, w: 4, fangs: true};
      a = {head: [hx - 1, hy - 8], side: [path[11][0], path[11][1] - 3], hold: [hx + 8, hy + 4], rear: [path[1][0], path[1][1]], cube: [10, 4], box: [4, hy - 9, pr[0] + 3, G - 6], float: true};
      break;
    }
    case 10: { // RAIJIN: the thunder god on a storm cloud, a ring of drums behind him that he strikes in turns
      const fy = mo.motion ? Math.round(Math.sin(mo.phase * 0.7) * 1.2) : 0, y = G - 14 + fy, hit = live ? alt : 0;
      main = S.raijin;
      const rcy = y - 6, RX = 19, RY = 15, ANG = [14, 42, 68, 112, 138, 166], lit = live ? (f >> 2) % ANG.length : -1;
      const hoop = part('far', {zone: 'arm', color: S.drum});
      for (let d = 0; d <= 180; d++) if (d < 78 || d > 102) for (const r of [0, 1]) px(hoop, cx + (RX - r) * Math.cos(d * Math.PI / 180), rcy - (RY - r) * Math.sin(d * Math.PI / 180));
      const rims = part('horn', {zone: 'arm', color: S.gold}), heads = part('core', {zone: 'arm', color: S.drumHead}), tomoe = part('core', {zone: 'arm', color: S.drum}), flash = part('core', {zone: 'arm', color: S.bolt});
      ANG.forEach((d, i) => {
        const x = cx + RX * Math.cos(d * Math.PI / 180), yy = rcy - RY * Math.sin(d * Math.PI / 180);
        ellipse(rims, x, yy, 2.6, 2.6); ellipse(i === lit ? flash : heads, x, yy, 1.6, 1.6); px(tomoe, x, yy);
        if (i === lit) {  // a bolt jumps out of the struck drum
          const ux = Math.cos(d * Math.PI / 180), uy = -Math.sin(d * Math.PI / 180);
          let bx = x + ux * 3, by = yy + uy * 3;
          for (let k = 0; k < 3; k++) { const nx = bx + ux * 2 + (k & 1 ? 1 : -1) * uy, ny = by + uy * 2 - (k & 1 ? 1 : -1) * ux; limb(flash, bx, by, nx, ny, 0.3); bx = nx; by = ny; }
        }
      });
      const legs = part('limb', {zone: 'legs'}); chain(legs, [[cx - 4, y + 1, 2.8], [cx - 10, y + 3, 2.5], [cx - 9, y + 8, 2]]); chain(legs, [[cx + 4, y + 1, 2.8], [cx + 10, y + 2, 2.5], [cx + 12, y + 7, 2]]);
      const cloud = part('far', {zone: 'legs', color: S.storm, pattern: (x, yy) => ((x + 2 * yy + (live ? f >> 2 : 0)) % 7 === 0 ? S.stormLight : null)});
      [[-10, 10, 6, 3.5], [-2, 9.5, 7, 4], [8, 10, 6.5, 3.5], [14, 11, 4, 2.5], [-15, 11, 4, 2.5]].forEach(([dx, dy, rx, ry]) => ellipse(cloud, cx + dx, y + dy, rx, ry));
      const torso = part('body', {zone: 'body'}); ellipse(torso, cx, y - 5, 7, 5.5);
      const bel = part('belly', {zone: 'body'}); ellipse(bel, cx, y - 3, 4, 2.4);
      const cloth = part('body', {zone: 'body', color: S.tiger, pattern: moved((x, yy) => ((x + (yy >> 1)) % 4 === 0 ? S.stripe : null), 0, y)});
      poly(cloth, [[cx - 6, y - 1], [cx + 6, y - 1], [cx + 5, y + 4], [cx, y + 2], [cx - 5, y + 4]]);
      const lh = [cx - 13, y - 15 + (hit ? 3 : 0)], rh = [cx + 13, y - 15 + (hit ? 0 : 3)];
      const arms = part('limb', {zone: 'arm'}); chain(arms, [[cx - 6, y - 8, 2.2], [cx - 11, y - 10, 1.8], [lh[0], lh[1], 1.6]]); chain(arms, [[cx + 6, y - 8, 2.2], [cx + 11, y - 10, 1.8], [rh[0], rh[1], 1.6]]);
      const fists = part('limb', {zone: 'arm'}); ellipse(fists, lh[0], lh[1], 1.8, 1.8); ellipse(fists, rh[0], rh[1], 1.8, 1.8);
      const sticks = part('horn', {zone: 'arm', color: S.stick}); limb(sticks, lh[0], lh[1], lh[0] - 2, lh[1] - 4, 0.5); limb(sticks, rh[0], rh[1], rh[0] + 2, rh[1] - 4, 0.5);
      const hair = part('limb', {zone: 'head', color: S.thunderHair}); poly(hair, [[cx - 6, y - 11], [cx - 10, y - 17], [cx - 5, y - 16], [cx - 4, y - 20], [cx - 1, y - 17], [cx + 1, y - 21], [cx + 3, y - 17], [cx + 6, y - 20], [cx + 6, y - 16], [cx + 10, y - 17], [cx + 6, y - 11]]);
      const head = part('body', {zone: 'head'}); ellipse(head, cx, y - 13, 5, 4.4);
      const horns = part('horn', {zone: 'head'}); poly(horns, [[cx - 4, y - 16], [cx - 5, y - 20], [cx - 2, y - 17]]); poly(horns, [[cx + 4, y - 16], [cx + 5, y - 20], [cx + 2, y - 17]]);
      eyes = [{x: cx - 3, y: y - 14, w: 2, h: 1, glow: S.bolt}, {x: cx + 2, y: y - 14, w: 2, h: 1, glow: S.bolt}];
      mouth = {x: cx - 2, y: y - 11, w: 5, fangs: true};
      a = {head: [cx, y - 21], side: [cx - 15, y + 2], hold: [cx + 9, y + 1], rear: [cx - 18, y + 9], cube: [cx + 26, 4], box: [cx - 21, y - 21, cx + 21, y + 13], float: true};
      break;
    }
  }
  return {parts, eyes, mouth, a, main};
}
},
'themes/demonic': function (module, require) {
/* Demonic: the Classic line from hell, in crimson and obsidian with lava inside, on a dark red screen.
   Creatures bring their own colors; the affinity shows in the crest above the head. Eyes glow, embers drift up. */
'use strict';
const {G, px, ellipse, poly, limb, chain} = require('render/raster');
const {partList} = require('render/figure');
const {eggShape, eggCrack} = require('render/egg');
const {mix} = require('render/colors');

module.exports = {
  id: 'demonic', name: 'Demonic', accent: '#D8322A', screen: '#0E0709', dot: '#1E1015', drawsEgg: true, reacts: true,
  bodies: ['Obsidian egg', 'Shadow slime', 'Spider imp', 'Impling', 'Hell kaiju', 'Hellhound', 'Hell serpent', 'Demon', 'Infernal wyvern', 'Archdemon', 'Void lord'],
  plans,
};

const S = {
  red: '#B3263C', redDark: '#7A1A2C', wing: '#6B1E2E', bone: '#E6D8B8', obsidian: '#3A2C36', char: '#3E3038', charDark: '#2A2027',
  lava: '#FF6A1F', lavaHot: '#FFB33B', ember: '#FF4422', glow: '#FFD23A', steel: '#9AA0AE', void: '#3C2A4E', voidLight: '#6A4C86',
};
// lava showing through cracks: a loose diagonal lattice, brighter where the lines cross
const lavaVeins = (dx = 0) => (x, y) => { x -= dx; const a = ((x + 2 * y) % 9 + 9) % 9, b = ((3 * x - y) % 13 + 13) % 13; return a === 0 && b < 4 ? S.lavaHot : b === 0 && a < 3 ? S.lava : null; };
const lavaBands = (x, y) => (y % 3 === 0 ? S.lavaHot : S.lava);

function plans(st, f, mo) {
  const {parts, part} = partList();
  const bob = mo.bob, walk = mo.walk, flap = mo.flap, sway = mo.sway, alt = mo.alt, live = mo.motion && !mo.sleeping;
  let eyes = [], mouth = null, a = {}, main = S.red, decor = null;
  const cx = 32;
  const glowEyes = (pts, w = 2, h = 1) => { eyes = pts.map(([x, y]) => ({x, y, w, h, glow: S.glow})); };
  // horns curving out and up from (x, y), s = -1 left, 1 right
  const horns = (m, x, y, s, len = 1) => chain(m, [[x, y, 1.3 * len], [x + s * 2.5 * len, y - 2.5 * len, 1], [x + s * 2 * len, y - 5 * len, 0.5]]);
  // embers drifting up from (x, y) while it is awake
  const embers = (x, y, n = 3) => ctx => {
    if (!live) return;
    for (let k = 0; k < n; k++) {
      const age = (f + k * 5) % 12, ex = x + (k - (n - 1) / 2) * 4 + ((age >> 2) & 1);
      if (age < 9) ctx.put(ex, y - age, age > 5 ? mix(S.ember, ctx.screen, 0.5) : age > 2 ? S.lava : S.lavaHot);
    }
  };
  // flames licking up from a row of points, flickering frame to frame
  const flames = (xs, y, tall = 0) => ctx => {
    xs.forEach((x, i) => {
      const h = 2 + tall + ((i + (live ? f >> 1 : 0)) % 3), lean = (i + (live ? f : 0)) % 2;
      for (let j = 0; j < h; j++) {
        const c = j < h / 3 ? S.ember : j < h - 1 ? S.lava : S.lavaHot, xj = x + (j >= h - 2 ? lean : 0);
        ctx.put(xj, y - j, c);
        if (tall && j < h - 2) ctx.put(xj + 1, y - j, j < h / 3 ? S.lava : S.lavaHot);
      }
    });
  };

  switch (st) {
    case 0: { // OBSIDIAN EGG: black glass veined with lava; it rocks now and then, and the crack glows
      const wob = mo.has ? mo.rock : 0;
      const ex = cx + wob, cy = G - 10 + 0.5;
      main = S.obsidian;
      const b = part('body', {zone: 'egg', pattern: lavaVeins(wob)}); eggShape(b, ex, cy);
      a = {head: [ex, cy - 11], side: [ex - 10, cy], hold: [ex - 10, cy + 2], rear: [ex - 9, cy], cube: [ex + 13, cy - 10], box: [ex - 8, cy - 10, ex + 8, G]};
      decor = ctx => { eggCrack(ctx, ex, cy - 3, S.lavaHot); if (mo.has && mo.hatch > 0.5) embers(ex, cy - 11, 2)(ctx); };
      break;
    }
    case 1: { // SHADOW SLIME: a crimson droplet with stubby horns and a toothy grin
      const sq = bob ? 0.8 : 0, rx = 8 + sq, ry = 6.5 - sq, cy = G - ry + 0.5;
      const hr = part('horn', {zone: 'head'}); horns(hr, cx - 4, cy - ry + 2, -1, 0.7); horns(hr, cx + 4, cy - ry + 2, 1, 0.7);
      const b = part('body', {zone: 'body'}); ellipse(b, cx, cy, rx, ry); poly(b, [[cx - 3, cy - ry + 2], [cx + 0.5, cy - ry - 4 + sq], [cx + 3, cy - ry + 2]]);
      const sh = part('belly', {zone: 'body'}); px(sh, cx - 5, cy - 3); px(sh, cx - 6, cy - 2); px(sh, cx - 5, cy - 2);
      glowEyes([[cx - 4, cy - 1], [cx + 2, cy - 1]]);
      mouth = {x: cx - 1, y: cy + 2, w: 3, fangs: true};
      a = {head: [cx, cy - ry - 4], side: [cx - 10, cy], hold: [cx - 10, cy + 2], rear: [cx - 10, cy], cube: [cx + 13, cy - 12], box: [cx - 9, cy - ry - 4, cx + 9, G], split: cy};
      decor = embers(cx, cy - ry - 5, 2);
      break;
    }
    case 2: { // SPIDER IMP: a squat body on six jointed legs, horns, four eyes
      const cy = G - 9 - bob * 0.5;
      const legs = part('limb', {zone: 'legs'});
      for (const s of [-1, 1]) [0, 1, 2].forEach(i => {
        const up = ((i + walk + (s > 0 ? 1 : 0)) & 1) ? 1 : 0, hx = cx + s * (5 + i * 2.5), kx = cx + s * (11 + i * 3.5), fx = cx + s * (13 + i * 4);
        chain(legs, [[hx, cy + 1, 1.3], [kx, cy - 5 + i - up, 1.1], [fx, G - up, 0.9]]);
      });
      const b = part('body', {zone: 'body'}); ellipse(b, cx, cy, 9.5, 6);
      const hr = part('horn', {zone: 'head'}); horns(hr, cx - 4, cy - 5, -1, 0.8); horns(hr, cx + 4, cy - 5, 1, 0.8);
      const bel = part('belly', {zone: 'body', color: S.redDark}); ellipse(bel, cx, cy + 3.5, 6, 1.6);
      eyes = [{x: cx - 4, y: cy - 2, w: 2, h: 1, glow: S.glow}, {x: cx + 2, y: cy - 2, w: 2, h: 1, glow: S.glow}, {x: cx - 2, y: cy - 4, w: 1, h: 1, glow: S.lava}, {x: cx + 1, y: cy - 4, w: 1, h: 1, glow: S.lava}];
      mouth = {x: cx - 1, y: cy + 1, w: 3, fangs: true};
      a = {head: [cx, cy - 9], side: [cx - 21, cy - 2], hold: [cx - 12, cy - 4], rear: [cx - 12, cy], cube: [cx + 17, cy - 15], box: [cx - 21, cy - 12, cx + 21, G]};
      break;
    }
    case 3: { // IMPLING: a round little devil with bat wings, big horns and an arrow tail
      const cy = G - 12.5 - bob;
      const wing = part('membrane', {zone: 'wing', color: S.wing});
      for (const s of [-1, 1]) poly(wing, [[cx + s * 6, cy - 3], [cx + s * 15, cy - 9 - flap * 2], [cx + s * 17, cy - 2 - flap], [cx + s * 14, cy + 1], [cx + s * 11, cy - 1], [cx + s * 8, cy + 3]]);
      const tail = part('limb', {zone: 'tail'}); chain(tail, [[cx + 6, cy + 6, 1.2], [cx + 12, cy + 7, 1], [cx + 15, cy + 3 - sway, 0.8]]);
      const tip = part('horn', {zone: 'tail', color: S.redDark}); poly(tip, [[cx + 13, cy + 2 - sway], [cx + 16, cy - 2 - sway], [cx + 18, cy + 3 - sway]]);
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx - 4, cy + 7, cx - 5, G - 1, 1.8); limb(legs, cx + 4, cy + 7, cx + 5, G - 1, 1.8);
      ellipse(legs, cx - 6, G - 0.5, 2.8, 1.2); ellipse(legs, cx + 6, G - 0.5, 2.8, 1.2);
      const b = part('body', {zone: 'body'}); ellipse(b, cx, cy, 9.5, 9);
      const bel = part('belly', {zone: 'body', color: '#D9675A'}); ellipse(bel, cx, cy + 3.5, 5.5, 4);
      const hr = part('horn', {zone: 'head'}); horns(hr, cx - 5, cy - 6, -1, 1.2); horns(hr, cx + 5, cy - 6, 1, 1.2);
      const arms = part('limb', {zone: 'arm'}); limb(arms, cx - 9, cy + 1, cx - 12, cy + 4 - sway * 3, 1.3, 1); limb(arms, cx + 9, cy + 1, cx + 12, cy + 4, 1.3, 1);
      glowEyes([[cx - 5, cy - 2], [cx + 3, cy - 2]]);
      mouth = {x: cx - 1, y: cy + 1, w: 3, fangs: true};
      a = {head: [cx, cy - 12], side: [cx - 16, cy + 1], hold: [cx - 12, cy + 4 - sway * 3], rear: [cx - 11, cy], cube: [cx + 17, cy - 13], box: [cx - 17, cy - 14, cx + 18, G], split: cy + 1};
      break;
    }
    case 4: { // HELL KAIJU: an upright lizard with a lava belly, bone spikes, and embers on its breath
      const y0 = -bob;
      const tail = part('limb', {zone: 'tail'}); chain(tail, [[cx - 5, G - 8 + y0, 3.2], [cx - 13, G - 5, 2.2], [cx - 19, G - 7 - sway, 1]]);
      const tsp = part('horn', {zone: 'tail'}); [[cx - 12, G - 8], [cx - 16, G - 8 - sway]].forEach(([x, y]) => poly(tsp, [[x - 1.2, y + 1], [x, y - 2], [x + 1.2, y + 1]]));
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx - 4, G - 9 + y0, cx - 5, G - 1, 2.4); limb(legs, cx + 4, G - 9 + y0, cx + 5, G - 1, 2.4);
      ellipse(legs, cx - 6, G - 0.5, 3.6, 1.4); ellipse(legs, cx + 6, G - 0.5, 3.6, 1.4);
      const armB = part('far', {zone: 'arm'}); limb(armB, cx - 5, G - 16 + y0, cx - 9, G - 12 + y0, 1.3, 1);
      const b = part('body', {zone: 'body'}); ellipse(b, cx, G - 12.5 + y0, 8, 8.5);
      const bel = part('belly', {zone: 'body', color: S.lava, pattern: (x, y) => ((x + y) % 3 === 0 ? S.redDark : (x - y) % 3 === 0 ? S.lavaHot : null)}); ellipse(bel, cx + 1.5, G - 11 + y0, 4.5, 5.5);
      const head = part('body', {zone: 'head'}); ellipse(head, cx + 1, G - 24 + y0, 8, 6.5); ellipse(head, cx + 7, G - 21.5 + y0, 4.5, 3.2);
      const hr = part('horn', {zone: 'head'}); horns(hr, cx - 3, G - 29 + y0, -1, 1); horns(hr, cx + 3, G - 30 + y0, 1, 1);
      const sp = part('horn', {zone: 'body'}); [[cx - 7, G - 20], [cx - 8, G - 15], [cx - 8, G - 10]].forEach(([x, y]) => poly(sp, [[x + 1, y - 1.5 + y0], [x - 2.5, y + y0], [x + 1, y + 1.5 + y0]]));
      const armF = part('limb', {zone: 'arm'}); limb(armF, cx + 6, G - 16 + y0, cx + 10, G - 12 + y0 - sway * 3, 1.4, 1.1);
      eyes = [{x: cx + 2, y: G - 26 + y0, w: 2, h: 1, glow: S.glow, slit: true}];
      mouth = {x: cx + 8, y: G - 21 + y0, w: 3, fangs: true};
      a = {head: [cx + 1, G - 35 + y0], side: [cx - 14, G - 16], hold: [cx + 11, G - 12 + y0 - sway * 3], rear: [cx - 19, G - 9], cube: [cx + 16, G - 36], box: [cx - 19, G - 35, cx + 13, G]};
      decor = embers(cx + 15, G - 22 + y0, 3);
      break;
    }
    case 5: { // HELLHOUND: a charcoal hound with flames along its back and a spiked collar
      const y0 = -bob;
      main = S.char;
      const tail = part('limb', {zone: 'tail'}); chain(tail, [[cx - 13, G - 12 + y0, 2.4], [cx - 18, G - 16, 1.8], [cx - 21, G - 22 + sway, 1.2]]);
      const far = part('far', {zone: 'legs'}); limb(far, cx + 4, G - 8 + y0, cx + 3 - walk * 2, G - 1, 1.6); limb(far, cx - 7, G - 8 + y0, cx - 6 + walk * 2, G - 1, 1.6);
      const b = part('body', {zone: 'body', pattern: (x, y) => ((x + 2 * y) % 6 === 0 && y > G - 15 ? S.redDark : null)}); ellipse(b, cx - 2, G - 11 + y0, 13, 6);
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx + 7, G - 8 + y0, cx + 8 + walk * 2, G - 1, 1.8); limb(legs, cx - 10, G - 8 + y0, cx - 11 - walk * 2, G - 1, 1.8);
      const neck = part('body', {zone: 'head'}); limb(neck, cx + 8, G - 13 + y0, cx + 12, G - 18 + y0, 3.4, 3);
      const collar = part('horn', {zone: 'head', color: S.steel}); limb(collar, cx + 8.5, G - 16 + y0, cx + 11, G - 13 + y0, 1); px(collar, cx + 7, G - 16 + y0); px(collar, cx + 9, G - 18 + y0);
      const ears = part('body', {zone: 'head'}); poly(ears, [[cx + 10, G - 23 + y0], [cx + 11, G - 30 + y0], [cx + 14, G - 23 + y0]]); poly(ears, [[cx + 14, G - 23 + y0], [cx + 17, G - 29 + y0], [cx + 18, G - 22 + y0]]);
      const head = part('body', {zone: 'head'}); ellipse(head, cx + 14, G - 20.5 + y0, 6, 4.8); ellipse(head, cx + 19.5, G - 18.5 + y0, 4, 2.4);
      eyes = [{x: cx + 15, y: G - 22 + y0, w: 2, h: 1, glow: S.lava}];
      mouth = {x: cx + 19, y: G - 17 + y0, w: 3, fangs: true};
      a = {head: [cx + 14, G - 31 + y0], side: [cx - 3, G - 13 + y0], hold: [cx + 23, G - 18 + y0], rear: [cx - 22, G - 14], cube: [cx + 23, G - 36], box: [cx - 23, G - 31, cx + 24, G]};
      decor = ctx => { flames([cx - 10, cx - 6, cx - 2, cx + 2], G - 17 + y0, 2)(ctx); flames([cx - 22], G - 23 + sway, 1)(ctx); };
      break;
    }
    case 6: { // HELL SERPENT: a crimson wyrm with a molten belly, bone spines and swept-back horns
      const ph = mo.phase, N = 16, path = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        path.push([5 + 37 * t, G - 6 - 6.5 * Math.sin(t * 9 - ph) * (1 - t * 0.55) - 12 * t * t, 0.9 + 3.1 * Math.pow(Math.sin(Math.PI * Math.min(t, 0.85) / 0.85), 0.6)]);
      }
      const [hx0, hy0] = path[N], hx = hx0 + 3, hy = hy0 - 4;
      const b = part('body', {zone: 'body'}); chain(b, path); limb(b, hx0, hy0, hx, hy, 3.4, 3.4);
      const bel = part('belly', {zone: 'body', color: S.lava, pattern: lavaBands}); chain(bel, path.slice(2, N - 1).map(([x, y, r]) => [x + 0.5, y + r * 0.55, r * 0.42]));
      const sp = part('horn', {zone: 'body'}); for (let i = 3; i < N - 1; i += 2) { const [x, y, r] = path[i]; poly(sp, [[x - 1.2, y - r + 0.5], [x - 0.3, y - r - 2.3], [x + 1, y - r + 0.5]]); }
      const head = part('body', {zone: 'head'}); ellipse(head, hx, hy, 6.5, 4.8); ellipse(head, hx + 5.5, hy + 1.5, 4.5, 2.6);
      const hr = part('horn', {zone: 'head'}); chain(hr, [[hx - 2, hy - 4, 1.4], [hx - 6, hy - 7, 1], [hx - 10, hy - 7, 0.5]]); chain(hr, [[hx + 1, hy - 4, 1.2], [hx - 2, hy - 8, 0.8], [hx - 5, hy - 10, 0.5]]);
      eyes = [{x: hx, y: hy - 2, w: 2, h: 1, glow: S.glow, slit: true}];
      mouth = {x: hx + 5, y: hy + 2, w: 3, tongue: alt};
      a = {head: [hx - 1, hy - 7], side: [path[8][0], path[8][1] - 3], hold: [hx + 10, hy + 2], rear: [path[1][0], path[1][1]], cube: [52, 6], box: [5, hy - 10, hx + 10, G], tailX: 15};
      break;
    }
    case 7: { // DEMON: horned and winged, a trident in hand, standing in fire
      const y0 = -bob, fl = flap;
      const wing = part('membrane', {zone: 'wing', color: S.wing});
      for (const s of [-1, 1]) {
        const sx = cx + s * 5;
        poly(wing, [[sx, G - 23 + y0], [sx + s * 13, G - 33 - fl * 2 + y0], [sx + s * 19, G - 26 - fl + y0], [sx + s * 17, G - 19 + y0], [sx + s * 13, G - 21 + y0], [sx + s * 11, G - 16 + y0], [sx + s * 7, G - 19 + y0], [sx + s * 3, G - 15 + y0]]);
      }
      const bones = part('horn', {zone: 'wing'});
      for (const s of [-1, 1]) { const sx = cx + s * 5; limb(bones, sx, G - 23 + y0, cx + s * 18, G - 33 - fl * 2 + y0, 0.7, 0.4); limb(bones, cx + s * 18, G - 33 - fl * 2 + y0, cx + s * 24, G - 26 - fl + y0, 0.5, 0.3); }
      const fork = part('horn', {zone: 'arm', color: S.steel, flat: true});
      const fx = cx - 11; limb(fork, fx, G - 1, fx, G - 30 + y0, 0.5); for (const o of [-2, 0, 2]) limb(fork, fx + o, G - 30 + y0, fx + o, G - 33 + y0, 0.5); limb(fork, fx - 2, G - 30 + y0, fx + 2, G - 30 + y0, 0.5);
      const tail = part('limb', {zone: 'tail'}); chain(tail, [[cx + 3, G - 8 + y0, 1.4], [cx + 12, G - 5, 1.1], [cx + 17, G - 10 - sway, 0.8]]);
      const tip = part('horn', {zone: 'tail', color: S.redDark}); poly(tip, [[cx + 15, G - 11 - sway], [cx + 18, G - 16 - sway], [cx + 20, G - 10 - sway]]);
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx - 3, G - 9 + y0, cx - 4, G - 1, 2); limb(legs, cx + 3, G - 9 + y0, cx + 4, G - 1, 2);
      ellipse(legs, cx - 5, G - 0.5, 2.6, 1.2); ellipse(legs, cx + 5, G - 0.5, 2.6, 1.2);
      const b = part('body', {zone: 'body'}); ellipse(b, cx, G - 14 + y0, 6.5, 7);
      const ribs = part('belly', {zone: 'body', color: S.redDark, pattern: (x, y) => ((y + 1) % 2 === 0 && Math.abs(x - cx) > 0 ? '#D9675A' : null)}); ellipse(ribs, cx, G - 13 + y0, 3.8, 4.2);
      const arms = part('limb', {zone: 'arm'}); limb(arms, cx - 6, G - 18 + y0, cx - 10, G - 14 + y0, 1.5, 1.1); limb(arms, cx + 6, G - 18 + y0, cx + 10, G - 12 + y0 - sway * 3, 1.5, 1.1);
      const head = part('body', {zone: 'head'}); ellipse(head, cx, G - 25 + y0, 6, 5.5);
      poly(head, [[cx - 5, G - 26 + y0], [cx - 9, G - 29 + y0], [cx - 4, G - 28 + y0]]); poly(head, [[cx + 5, G - 26 + y0], [cx + 9, G - 29 + y0], [cx + 4, G - 28 + y0]]);
      const hr = part('horn', {zone: 'head'}); horns(hr, cx - 3, G - 29 + y0, -1, 1.3); horns(hr, cx + 3, G - 29 + y0, 1, 1.3);
      glowEyes([[cx - 3, G - 27 + y0], [cx + 2, G - 27 + y0]]);
      mouth = {x: cx - 1, y: G - 23 + y0, w: 3, fangs: true};
      a = {head: [cx, G - 37 + y0], side: [cx - 15, G - 13], hold: [cx - 10, G - 14 + y0], rear: [cx + 20, G - 12], cube: [cx + 26, G - 14], box: [cx - 24, G - 37, cx + 24, G]};
      decor = flames([cx - 8, cx - 5, cx - 2, cx + 1, cx + 4, cx + 7], G);
      break;
    }
    case 8: { // INFERNAL WYVERN: one wing raised, a long neck, molten plates under the belly
      const y0 = -bob, fl = flap;
      const wingF = part('far', {zone: 'wing', color: S.wing}); poly(wingF, [[cx + 2, G - 16 + y0], [cx + 2, G - 34 - fl * 3 + y0], [cx - 2, G - 28 + y0], [cx - 7, G - 31 - fl * 2 + y0], [cx - 6, G - 23 + y0], [cx - 4, G - 16 + y0]]);
      const tail = part('limb', {zone: 'tail'}); chain(tail, [[cx - 14, G - 11 + y0, 3], [cx - 22, G - 7, 2], [cx - 27, G - 11 - sway, 1.2]]);
      const tip = part('horn', {zone: 'tail'}); poly(tip, [[cx - 28, G - 9 - sway], [cx - 31, G - 13 - sway], [cx - 27, G - 15 - sway], [cx - 25, G - 12 - sway]]);
      const far = part('far', {zone: 'legs'}); limb(far, cx + 5, G - 8 + y0, cx + 4 - walk * 2, G - 1, 2); limb(far, cx - 8, G - 8 + y0, cx - 7 + walk * 2, G - 1, 2);
      const b = part('body', {zone: 'body'}); ellipse(b, cx - 3, G - 11 + y0, 14, 7);
      const bel = part('belly', {zone: 'body', color: S.lava, pattern: (x, y) => (x % 4 === 0 ? S.redDark : y % 2 ? S.lavaHot : null)}); ellipse(bel, cx - 2, G - 7.5 + y0, 9, 2);
      const spikes = part('horn', {zone: 'body'}); for (let x = cx - 14; x <= cx + 6; x += 4) poly(spikes, [[x - 1.5, G - 16 + y0 + (x < cx - 10 ? 1 : 0)], [x, G - 20 + y0], [x + 1.5, G - 16 + y0]]);
      const wing = part('membrane', {zone: 'wing', color: S.wing}); poly(wing, [[cx - 2, G - 16 + y0], [cx - 8, G - 37 - fl * 3 + y0], [cx - 13, G - 29 + y0], [cx - 20, G - 34 - fl * 2 + y0], [cx - 20, G - 25 + y0], [cx - 26, G - 25 - fl + y0], [cx - 14, G - 16 + y0]]);
      const bones = part('horn', {zone: 'wing'}); limb(bones, cx - 2, G - 16 + y0, cx - 8, G - 37 - fl * 3 + y0, 0.8, 0.4); limb(bones, cx - 8, G - 37 - fl * 3 + y0, cx - 20, G - 34 - fl * 2 + y0, 0.5, 0.4); limb(bones, cx - 8, G - 37 - fl * 3 + y0, cx - 26, G - 25 - fl + y0, 0.5, 0.3);
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx + 8, G - 8 + y0, cx + 9 + walk * 2, G - 1, 2.2); limb(legs, cx - 11, G - 8 + y0, cx - 12 - walk * 2, G - 1, 2.2);
      const neck = part('body', {zone: 'head'}); chain(neck, [[cx + 8, G - 14 + y0, 3.6], [cx + 13, G - 21 + y0, 2.8], [cx + 16, G - 26 + y0, 2.6]]);
      const hr = part('horn', {zone: 'head'}); chain(hr, [[cx + 16, G - 31 + y0, 1.2], [cx + 12, G - 34 + y0, 0.8], [cx + 10, G - 37 + y0, 0.4]]); chain(hr, [[cx + 19, G - 31 + y0, 1.1], [cx + 18, G - 35 + y0, 0.7], [cx + 20, G - 38 + y0, 0.4]]);
      const head = part('body', {zone: 'head'}); ellipse(head, cx + 18, G - 28.5 + y0, 5.5, 4); ellipse(head, cx + 23, G - 27.5 + y0, 3.8, 2.4);
      eyes = [{x: cx + 18, y: G - 30 + y0, w: 2, h: 1, glow: S.glow, slit: true}];
      mouth = {x: cx + 23, y: G - 26 + y0, w: 3, fangs: true};
      a = {head: [cx + 17, G - 36 + y0], side: [cx - 4, G - 12 + y0], hold: [cx + 27, G - 26 + y0], rear: [cx - 28, G - 12], cube: [cx + 24, G - 17], box: [cx - 31, G - 38, cx + 27, G]};
      decor = embers(cx + 28, G - 27 + y0, 2);
      break;
    }
    case 9: { // ARCHDEMON: enthroned on nothing, wings spread, a molten chest, a ring of fire on the ground
      const y0 = -bob, fl = flap;
      const wing = part('membrane', {zone: 'wing', color: S.wing});
      for (const s of [-1, 1]) {
        const sx = cx + s * 7;
        poly(wing, [[sx, G - 22 + y0], [cx + s * 20, G - 36 - fl * 2], [cx + s * 29, G - 30 - fl], [cx + s * 27, G - 21], [cx + s * 23, G - 24], [cx + s * 21, G - 16], [cx + s * 17, G - 20], [cx + s * 14, G - 13], [sx + s * 2, G - 15 + y0]]);
      }
      const bones = part('horn', {zone: 'wing'});
      for (const s of [-1, 1]) { const sx = cx + s * 7; limb(bones, sx, G - 22 + y0, cx + s * 20, G - 36 - fl * 2, 0.9, 0.5); limb(bones, cx + s * 20, G - 36 - fl * 2, cx + s * 29, G - 30 - fl, 0.6, 0.4); limb(bones, cx + s * 20, G - 36 - fl * 2, cx + s * 23, G - 24, 0.4); limb(bones, cx + s * 20, G - 36 - fl * 2, cx + s * 17, G - 20, 0.4); }
      const haunch = part('limb', {zone: 'legs'}); ellipse(haunch, cx - 8, G - 5, 6, 5); ellipse(haunch, cx + 8, G - 5, 6, 5);
      const b = part('body', {zone: 'body'}); ellipse(b, cx, G - 13 + y0, 10, 11);
      const chest = part('belly', {zone: 'body', color: S.lava, pattern: lavaBands}); ellipse(chest, cx, G - 11 + y0, 5, 8);
      const arms = part('limb', {zone: 'arm'}); limb(arms, cx - 8, G - 17 + y0, cx - 6, G - 3, 2.2, 1.8); limb(arms, cx + 8, G - 17 + y0, cx + 6, G - 3, 2.2, 1.8);
      const tail = part('limb', {zone: 'tail'}); chain(tail, [[cx + 10, G - 3, 2.6], [cx, G - 0.5, 2.2], [cx - 12, G - 1, 1.6], [cx - 17, G - 5 - sway, 1]]);
      const claws = part('horn', {zone: 'legs'}); [-7, -5, 5, 7].forEach(o => px(claws, cx + o, G - 1));
      const neck = part('body', {zone: 'head'}); limb(neck, cx, G - 22 + y0, cx, G - 26 + y0, 4.2, 3.8);
      const hr = part('horn', {zone: 'head'}); for (const s of [-1, 1]) chain(hr, [[cx + s * 4, G - 31 + y0, 1.8], [cx + s * 8, G - 34 + y0, 1.2], [cx + s * 9, G - 38 + y0, 0.5]]);
      const head = part('body', {zone: 'head'}); ellipse(head, cx, G - 29 + y0, 6.5, 5); ellipse(head, cx, G - 25.5 + y0, 4.2, 2.8);
      glowEyes([[cx - 4, G - 31 + y0], [cx + 3, G - 31 + y0]]);
      mouth = {x: cx - 1, y: G - 24 + y0, w: 3, fangs: true};
      a = {head: [cx, G - 35 + y0], side: [cx - 16, G - 9], hold: [cx - 7, G - 4], rear: [cx - 18, G - 6], cube: [cx + 25, G - 10], box: [cx - 29, G - 38, cx + 29, G]};
      decor = ctx => {  // a ring of fire on the ground: the near half in front, flames running around it
        for (let x = cx - 25; x <= cx + 25; x++) {
          const t = (x - cx) / 25, ry = Math.round(G + 1 + (1 - t * t) * 1.5), k = ((x - (live ? f : 0)) % 6 + 6) % 6;
          ctx.put0(x, ry, k === 0 ? S.lavaHot : S.lava);
          if (k < 2) ctx.put0(x, ry - 1, k === 0 ? S.lavaHot : S.ember);
          if (Math.abs(t) > 0.85) ctx.put0(x, ry - 1, S.lava);
        }
      };
      break;
    }
    case 10: { // VOID LORD: a floating crystal of the void with one burning eye, eight jointed legs and a crown of horns
      const fy = Math.round(Math.sin(mo.phase * 0.7) * 1.4), y = G - 18 + fy;
      main = S.void;
      const legs = part('limb', {zone: 'legs', color: S.void});
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
        const kx = cx + s * (12 + i * 3), ky = y - 8 + i * 4 - (flap && i % 2 ? 1 : 0), fx = cx + s * (16 + i * 4), fyy = y - 2 + i * 6;
        chain(legs, [[cx + s * 5, y - 2 + i * 2, 1.1], [kx, ky, 0.9], [fx, fyy, 0.6]]);
      }
      const crown = part('horn', {zone: 'head'});
      for (let i = -2; i <= 2; i++) chain(crown, [[cx + i * 3, y - 13, 1], [cx + i * 4.5, y - 18 - (2 - Math.abs(i)) * 1.5, 0.5]]);
      const b = part('body', {zone: 'body', pattern: (x, yy) => ((x * 3 + yy * 5) % 11 === 0 ? S.voidLight : null)}); poly(b, [[cx, y - 14], [cx + 10, y], [cx, y + 14], [cx - 10, y]]);
      const facet = part('belly', {zone: 'body', color: S.voidLight}); poly(facet, [[cx, y - 8], [cx + 5, y], [cx, y + 8], [cx - 5, y]]);
      const sclera = part('core', {zone: 'head', color: S.lava}); ellipse(sclera, cx, y, 4.4, 3);
      const iris = part('core', {zone: 'head', color: S.glow}); ellipse(iris, cx, y, 2.2, 2.2);
      eyes = [{x: cx, y: y - 1, w: 1, h: 3}];
      mouth = null;
      a = {head: [cx, y - 20], side: [cx - 22, y + 4], hold: [cx - 18, y + 6], rear: [cx, y + 15], cube: [cx + 22, 6], box: [cx - 26, y - 20, cx + 26, y + 16], float: true};
      decor = embers(cx, y + 16, 3);
      break;
    }
  }
  return {parts, eyes, mouth, a, main, decor};
}
},
'themes/succubus': function (module, require) {
/* Succubus: a little imp that grows up into a succubus queen and then ascends. Chibi and cute while she grows
   (stages 1-5); a grown-up temptress from the lamia on: bare shoulders over a corset with a sweetheart neckline,
   a narrow waist, thigh-high boots with pink garters, painted lips, a hand on her hip.
   Skin in the affinity color; wings, hair and outfit are darker shades of it, so the whole look follows the affinity.
   Hearts everywhere: on the tail tip, in her hands, trailing behind her when she flies. */
'use strict';
const {G, px, ellipse, ring, poly, limb, chain} = require('render/raster');
const {partList} = require('render/figure');
const {eggShape, eggCrack} = require('render/egg');
const {mix} = require('render/colors');

module.exports = {
  id: 'succubus', name: 'Succubus', accent: '#FF5C9E', drawsEgg: true, reacts: true,
  bodies: ['Heart egg', 'Imp slime', 'Bat imp', 'Chibi imp', 'Chibi succubus', 'Young succubus', 'Lamia', 'Succubus', 'Flying succubus', 'Succubus queen', 'Ascended'],
  plans,
};

const PINK = '#FF5A7A', GOLD = '#E8C25A';
// shades of the skin (the affinity color): hair, outfit, the throne, rays of light
const hair = skin => mix(skin, '#40206E', 0.5);
const outfit = skin => mix(skin, '#0E0B16', 0.78);
const throne = skin => mix(skin, '#0E0B16', 0.86);
const light = skin => mix(mix(skin, '#FFFFFF', 0.6), '#080A0E', 0.35);
const laces = x0 => (x, y) => (x === x0 && y % 2 === 0 ? PINK : null);  // a row of pink laces down the middle

function heart(m, x, y, big) {
  const rows = big ? ['.#.#.', '#####', '#####', '.###.', '..#..'] : ['#.#', '###', '.#.'];
  const w = rows[0].length;
  rows.forEach((r, j) => { for (let i = 0; i < w; i++) if (r[i] === '#') px(m, x - (w >> 1) + i, y + j); });
}
// bat wings, both sides, from the shoulders at (x, y): span out, h tall, raised by flap
function wings(m, x, y, span, h, flap) {
  for (const s of [-1, 1]) poly(m, [[x + s * 2, y - 1], [x + s * span * 0.45, y - h - flap], [x + s * span, y - h * 0.45 - flap], [x + s * span * 0.88, y + h * 0.45],
    [x + s * span * 0.72, y + h * 0.05], [x + s * span * 0.57, y + h * 0.6], [x + s * span * 0.42, y + h * 0.15], [x + s * span * 0.27, y + h * 0.62], [x + s * 2, y + h * 0.35]]);
}
// curved horns from the top of a head at (x, y), w apart: out, up, and the tips turning out again
function horns(m, x, y, w, k = 1) {
  for (const s of [-1, 1]) chain(m, [[x + s * w, y, 1.1 * k], [x + s * (w + 1.6 * k), y - 1.4 * k, 0.85 * k], [x + s * (w + 2.2 * k), y - 3 * k, 0.6 * k], [x + s * (w + 3.2 * k), y - 3.8 * k, 0.4]]);
}

function plans(st, f, mo) {
  const {parts, part} = partList();
  const bob = mo.bob, walk = mo.walk, flap = mo.flap, sway = mo.sway, live = mo.motion && !mo.sleeping;
  let eyes = [], mouth = null, a = {}, decor = null;
  const cx = 32;
  const blush = (pts) => { const b = part('cheek', {zone: 'head', color: PINK, flat: true}); pts.forEach(([x, y]) => { px(b, x, y); px(b, x + 1, y); }); };
  // the tail: a thin curve from the hips, a heart on the tip
  const tail = (pts) => {
    const t = part('limb', {zone: 'tail'}); chain(t, pts.map(([x, y]) => [x, y, 0.6]));
    const [hx, hy] = pts[pts.length - 1], tip = part('core', {zone: 'tail', color: PINK, flat: true}); heart(tip, hx, hy - 1, true);
  };
  // a girl's hair behind her head and shoulders: a bob, twin tails, or long locks down her back
  const hairBack = (x, y, r, style) => {
    const back = part('limb', {zone: 'head', color: hair});
    ellipse(back, x, y + 0.5, r + 1, r + 0.6);
    if (style === 'long') for (const s of [-1, 1]) chain(back, [[x + s * (r + 0.3), y + 1, 1.8], [x + s * (r + 1.2), y + r + 3, 1.6], [x + s * (r + 1.6 + (s > 0 && live ? sway * 0.6 : 0)), y + r + 8, 1]]);
    if (style === 'twin') for (const s of [-1, 1]) chain(back, [[x + s * (r + 1), y - 1, 2.2], [x + s * (r + 3), y + 4 + (live && s > 0 ? sway : 0), 2], [x + s * (r + 2.5), y + 9, 1.2]]);
  };
  // her face, the fringe and horns on top; eyes and mouth placed for its size. Grown up: almond eyes and pink lips.
  const head = (x, y, r, grown) => {
    const face = part('body', {zone: 'head'}); ellipse(face, x, y + 0.5, r, r * 0.92);
    const fringe = part('limb', {zone: 'head', color: hair});
    poly(fringe, [[x - r - 0.5, y + 1], [x - r, y - r * 0.6], [x - r * 0.4, y - r - 0.5], [x + r * 0.4, y - r - 0.5], [x + r, y - r * 0.6], [x + r + 0.5, y + 1],
      [x + r * 0.6, y - r * 0.25], [x + r * 0.15, y - r * 0.15], [x - r * 0.3, y - r * 0.3], [x - r * 0.7, y - r * 0.1]]);
    const hr = part('horn', {zone: 'head'}); horns(hr, x, y - r + 0.5, r * 0.45, r >= 6 ? 1.2 : 0.9);
    const big = r >= 6, ex = big ? 3 : 2;
    eyes = [{x: x - ex - (big ? 1 : 0), y: Math.round(y), w: big ? 2 : 1, h: big ? 2 : 1}, {x: x + ex - (big ? 1 : 0) + (big ? 1 : 0), y: Math.round(y), w: big ? 2 : 1, h: big ? 2 : 1}];
    mouth = {x: x - 1, y: Math.round(y + r * 0.55), w: big ? 3 : 2};
    if (grown) {
      eyes = [{x: x - 3, y: Math.round(y), w: 2, h: 1}, {x: x + 2, y: Math.round(y), w: 2, h: 1}];
      mouth = {x: x - 1, y: Math.round(y + 2.5), w: 2, color: PINK};
      return;
    }
    blush(big ? [[x - r + 0.5, y + 2], [x + r - 1.5, y + 2]] : [[x - r + 0.5, y + 1.5], [x + r - 1.5, y + 1.5]]);
  };
  // a corset over a short skirt, from the shoulders (y0) to the hips (y1)
  const corset = (x, y0, y1, w) => {
    const c = part('body', {zone: 'body', color: outfit, pattern: laces(x)}); poly(c, [[x - w, y0], [x + w, y0], [x + w * 0.75, y1 - 3], [x + w + 1, y1], [x - w - 1, y1], [x - w * 0.75, y1 - 3]]);
    const trim = part('core', {zone: 'body', color: PINK, flat: true}); px(trim, x - w + 1, y0); px(trim, x + w - 1, y0);
  };
  // legs from the hips (y0) to the soles (y1), boots on the last third
  const legs = (x, y0, y1, gap, step = 0) => {
    const l = part('body', {zone: 'legs'}); limb(l, x - gap, y0, x - gap - step, y1 - 1, 1.3, 1); limb(l, x + gap, y0, x + gap + step, y1 - 1, 1.3, 1);
    const boot = part('limb', {zone: 'legs', color: outfit}), bt = y1 - Math.round((y1 - y0) * 0.45);
    limb(boot, x - gap - step * 0.6, bt, x - gap - step, y1 - 1, 1.15); limb(boot, x + gap + step * 0.6, bt, x + gap + step, y1 - 1, 1.15);
    const cuff = part('core', {zone: 'legs', color: PINK, flat: true}); px(cuff, x - gap - step * 0.6, bt); px(cuff, x + gap + step * 0.6, bt);
  };
  const arms = (x, y, w, lh, rh) => { const ar = part('body', {zone: 'arm'}); chain(ar, [[x - w, y, 1.1], ...lh]); chain(ar, [[x + w, y, 1.1], ...rh]); };
  // Grown up: bare shoulders and an hourglass in skin, from the shoulders (ys) through the waist (yw) to the hips (yh),
  // under a corset that starts at a sweetheart neckline; hip shifts the hips aside for a contrapposto stance.
  const figure = (x, ys, yw, yh, hip = 0) => {
    const t = part('body', {zone: 'body'});
    poly(t, [[x - 4.5, ys], [x + 4.5, ys], [x + 3.2, ys + 2.5], [x + 2.4, yw], [x + 3.7 + hip, yh], [x - 3.7 + hip, yh], [x - 2.4, yw], [x - 3.2, ys + 2.5]]);
    const yb = ys + 3;
    const c = part('body', {zone: 'body', color: outfit, pattern: (px0, py) => (px0 === x && py > yb + 1 && py % 2 === 0 ? PINK : null)});
    poly(c, [[x - 3.4, yb], [x - 2, yb - 1], [x - 0.6, yb], [x, yb + 1], [x + 0.6, yb], [x + 2, yb - 1], [x + 3.4, yb], [x + 2.5, yw], [x + 3.9 + hip, yh + 1], [x - 3.9 + hip, yh + 1], [x - 2.5, yw]]);
    const trim = part('core', {zone: 'body', color: PINK, flat: true});
    [[-3, 0], [-2, -1], [-1, 0], [1, 0], [2, -1], [3, 0]].forEach(([dx, dy]) => px(trim, x + dx, yb + dy));
    const neck = part('body', {zone: 'head'}); limb(neck, x, ys - 0.5, x, ys - 2, 1);
  };
  // Grown-up legs, each through [hip, knee, foot]: long and bare above thigh-high boots with a pink garter band.
  const longLegs = (...legs) => {
    const l = part('body', {zone: 'legs'}), boot = part('limb', {zone: 'legs', color: outfit}), band = part('core', {zone: 'legs', color: PINK, flat: true});
    for (const [[hx, hy], [kx, ky], [fx, fy]] of legs) {
      chain(l, [[hx, hy, 1.7], [kx, ky, 1.2], [fx, fy, 0.9]]);
      const bx = hx + (kx - hx) * 0.7, by = hy + (ky - hy) * 0.7;  // the boots reach just above the knee
      chain(boot, [[bx, by, 1.4], [kx, ky, 1.25], [fx, fy, 1.05]]); px(boot, fx + (fx >= hx ? 1 : -1), fy);
      px(band, bx - 0.6, by); px(band, bx + 0.6, by);
    }
  };
  // hearts floating up from (x, y) and fading
  const floatHearts = (x, y, n, dx = -3) => ctx => {
    if (!live) return;
    for (let k = 0; k < n; k++) {
      const age = (f + k * 4) % 12, hx = x + dx * k - (age >> 2), hy = y - age;
      const m = new Set(); heart(m, hx, hy, k === 0);
      for (const q of m) ctx.put(q % 64, (q / 64) | 0, age > 8 ? mix(PINK, ctx.screen, 0.5) : PINK);
    }
  };

  switch (st) {
    case 0: { // HEART EGG: an egg in the affinity color, dotted with pink, that rocks now and then
      const wob = mo.has ? mo.rock : 0;
      const ex = cx + wob, cy = G - 10 + 0.5;
      const b = part('body', {zone: 'egg', pattern: (x, y) => ((x - wob) * 5 + y * 3) % 9 === 0 ? PINK : null}); eggShape(b, ex, cy);
      const h = part('core', {zone: 'egg', color: PINK, flat: true}); heart(h, ex, cy - 1, true);
      a = {head: [ex, cy - 11], side: [ex - 10, cy], hold: [ex - 10, cy + 2], rear: [ex - 9, cy], cube: [ex + 13, cy - 10], box: [ex - 8, cy - 10, ex + 8, G]};
      decor = ctx => eggCrack(ctx, ex, cy - 6, PINK);
      break;
    }
    case 1: { // IMP SLIME: a soft blob with little horns, rosy cheeks and a heart-tipped tail
      const sq = bob ? 0.8 : 0, rx = 8 + sq, ry = 6.5 - sq, cy = G - ry + 0.5;
      tail([[cx + rx - 1, cy + 2], [cx + rx + 4, cy + 1], [cx + rx + 6, cy - 3 - sway]]);
      const hr = part('horn', {zone: 'head'}); horns(hr, cx, cy - ry + 1, 3, 0.8);
      const b = part('body', {zone: 'body'}); ellipse(b, cx, cy, rx, ry);
      const sh = part('belly', {zone: 'body'}); px(sh, cx - 5, cy - 3); px(sh, cx - 6, cy - 2);
      eyes = [{x: cx - 4, y: cy - 1, w: 2, h: 1}, {x: cx + 2, y: cy - 1, w: 2, h: 1}];
      mouth = {x: cx - 1, y: cy + 1, w: 2};
      blush([[cx - 6, cy + 1], [cx + 4, cy + 1]]);
      a = {head: [cx, cy - ry - 3], side: [cx - 10, cy], hold: [cx - 10, cy + 2], rear: [cx - 10, cy], cube: [cx + 13, cy - 12], box: [cx - 9, cy - ry - 3, cx + 15, G], split: cy};
      break;
    }
    case 2: { // BAT IMP: a round bat with big ears, wide wings and fangs, hovering
      const cy = G - 15 - bob;
      const wg = part('membrane', {zone: 'wing'}); wings(wg, cx, cy - 1, 17, 6, flap * 3);
      tail([[cx + 2, cy + 5], [cx + 5, cy + 9], [cx + 9, cy + 10 - sway]]);
      const ears = part('body', {zone: 'head'}); poly(ears, [[cx - 6, cy - 2], [cx - 5, cy - 10], [cx - 1, cy - 4]]); poly(ears, [[cx + 6, cy - 2], [cx + 5, cy - 10], [cx + 1, cy - 4]]);
      const b = part('body', {zone: 'body'}); ellipse(b, cx, cy, 6.5, 6);
      const feet = part('limb', {zone: 'legs'}); px(feet, cx - 2, cy + 6); px(feet, cx + 2, cy + 6); px(feet, cx - 2, cy + 7); px(feet, cx + 2, cy + 7);
      eyes = [{x: cx - 3, y: cy - 1, w: 1, h: 2}, {x: cx + 2, y: cy - 1, w: 1, h: 2}];
      mouth = {x: cx - 1, y: cy + 2, w: 3, fangs: true};
      blush([[cx - 5, cy + 1], [cx + 3, cy + 1]]);
      a = {head: [cx, cy - 11], side: [cx - 18, cy], hold: [cx - 7, cy + 3], rear: [cx - 6, cy + 2], cube: [cx + 19, cy - 12], box: [cx - 17, cy - 11, cx + 17, G], split: cy - 1};
      break;
    }
    case 3: { // CHIBI IMP: a big head with a bob, little wings, a heart in her hand
      const y0 = -bob, hy = G - 17 + y0;
      const wg = part('membrane', {zone: 'wing'}); wings(wg, cx, G - 13 + y0, 13, 5, flap * 2);
      tail([[cx + 3, G - 7 + y0], [cx + 8, G - 5], [cx + 11, G - 9 - sway]]);
      legs(cx, G - 7 + y0, G, 1.5);
      const dress = part('body', {zone: 'body', color: outfit, pattern: laces(cx)}); poly(dress, [[cx - 3, G - 12 + y0], [cx + 3, G - 12 + y0], [cx + 5, G - 6 + y0], [cx - 5, G - 6 + y0]]);
      arms(cx, G - 11 + y0, 3.5, [[cx - 6, G - 8 + y0, 0.9]], [[cx + 6, G - 9 + y0 - sway, 0.9]]);
      hairBack(cx, hy, 6.5, 'bob'); head(cx, hy, 6.5);
      const h = part('core', {zone: 'arm', color: PINK, flat: true}); heart(h, cx + 7, G - 12 + y0 - sway, false);
      a = {head: [cx, hy - 9], side: [cx - 14, G - 12], hold: [cx - 6, G - 8 + y0], rear: [cx - 5, G - 8], cube: [cx + 15, hy - 8], box: [cx - 14, hy - 9, cx + 14, G]};
      break;
    }
    case 4: { // CHIBI SUCCUBUS: twin tails, bigger wings, a heart held to her chest
      const y0 = -bob, hy = G - 18 + y0;
      const wg = part('membrane', {zone: 'wing'}); wings(wg, cx, G - 14 + y0, 15, 6, flap * 2);
      tail([[cx + 3, G - 7 + y0], [cx + 9, G - 5], [cx + 12, G - 10 - sway]]);
      legs(cx, G - 7 + y0, G, 1.5);
      const dress = part('body', {zone: 'body', color: outfit, pattern: laces(cx)}); poly(dress, [[cx - 3, G - 13 + y0], [cx + 3, G - 13 + y0], [cx + 5, G - 6 + y0], [cx - 5, G - 6 + y0]]);
      arms(cx, G - 12 + y0, 3.5, [[cx - 2, G - 9 + y0, 0.9]], [[cx + 2, G - 9 + y0, 0.9]]);
      hairBack(cx, hy, 6.5, 'twin'); head(cx, hy, 6.5);
      const h = part('core', {zone: 'body', color: PINK, flat: true}); heart(h, cx, G - 11 + y0, true);
      a = {head: [cx, hy - 9], side: [cx - 16, G - 13], hold: [cx - 3, G - 9 + y0], rear: [cx - 5, G - 8], cube: [cx + 17, hy - 8], box: [cx - 16, hy - 9, cx + 16, G]};
      break;
    }
    case 5: { // YOUNG SUCCUBUS: taller now, long hair, a corset and boots
      const y0 = -bob, hy = G - 28 + y0;
      const wg = part('membrane', {zone: 'wing'}); wings(wg, cx, G - 23 + y0, 13, 5, flap * 2);
      hairBack(cx, hy, 4.5, 'long');
      tail([[cx + 2, G - 13 + y0], [cx + 8, G - 9], [cx + 11, G - 5], [cx + 13, G - 9 - sway]]);
      legs(cx, G - 13 + y0, G, 1.5, walk * 0.5);
      corset(cx, G - 23 + y0, G - 12 + y0, 3);
      arms(cx, G - 22 + y0, 3.5, [[cx - 5, G - 18 + y0, 0.9], [cx - 3, G - 15 + y0, 0.8]], [[cx + 5, G - 18 + y0, 0.9], [cx + 6, G - 14 + y0 - sway, 0.8]]);
      const neck = part('body', {zone: 'head'}); limb(neck, cx, G - 24 + y0, cx, G - 25 + y0, 1);
      head(cx, hy, 4.5);
      a = {head: [cx, hy - 7], side: [cx - 14, G - 20], hold: [cx + 6, G - 14 + y0 - sway], rear: [cx - 4, G - 14], cube: [cx + 15, hy - 6], box: [cx - 14, hy - 7, cx + 15, G]};
      break;
    }
    case 6: { // LAMIA: grown up above the waist, a long scaled tail below, one hand in her hair
      const y0 = -bob, hy = G - 30 + y0, ph = mo.phase, path = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        path.push([cx + 2 - 30 * t * t, G - 13 + y0 + 12 * Math.min(1, t * 2.2) - 1.5 * Math.sin(t * 8 - ph) * t, 3.4 - 2.4 * t]);
      }
      const wg = part('membrane', {zone: 'wing'}); wings(wg, cx, G - 25 + y0, 12, 5, flap * 2);
      hairBack(cx, hy, 4.5, 'long');
      const coil = part('body', {zone: 'tail', pattern: (x, y) => ((x + 2 * y) % 4 === 0 ? mix(PINK, '#FFFFFF', 0.4) : null)}); chain(coil, path);
      const [tx, ty] = path[12], tip = part('core', {zone: 'tail', color: PINK, flat: true}); heart(tip, tx - 2, ty - 3, true);
      figure(cx, G - 25 + y0, G - 19 + y0, G - 14 + y0);
      arms(cx, G - 24.5 + y0, 4.2, [[cx - 7, G - 27 + y0 - sway, 0.95], [cx - 5, G - 30 + y0 - sway, 0.8]], [[cx + 6.5, G - 20 + y0, 0.95], [cx + 3.5, G - 16.5 + y0, 0.8]]);
      head(cx, hy, 4.5, true);
      a = {head: [cx, hy - 7], side: [cx - 13, G - 22], hold: [cx - 5, G - 30 + y0 - sway], rear: [tx, ty], cube: [cx + 15, hy - 6], box: [cx - 29, hy - 7, cx + 14, G], tailX: cx - 3};
      break;
    }
    case 7: { // SUCCUBUS: grown up, weight on one leg, a hand on her hip, wings spread wide
      const y0 = -bob, hy = G - 33 + y0, hip = 1;
      const wg = part('membrane', {zone: 'wing'}); wings(wg, cx, G - 27 + y0, 19, 7, flap * 3);
      hairBack(cx, hy, 4.5, 'long');
      tail([[cx + 3, G - 15 + y0], [cx + 9, G - 11], [cx + 13, G - 6], [cx + 15, G - 11 - sway]]);
      longLegs([[cx - 0.7 + hip, G - 15 + y0], [cx - 1.5, G - 8], [cx - 1, G - 1]], [[cx + 2.3 + hip, G - 15 + y0], [cx + 1.2, G - 8 - walk * 0.5], [cx + 3, G - 1]]);
      figure(cx, G - 27 + y0, G - 21 + y0, G - 16 + y0, hip);
      arms(cx, G - 26.5 + y0, 4.2, [[cx - 7, G - 22 + y0, 0.95], [cx - 3.4 + hip, G - 18 + y0, 0.8]], [[cx + 6, G - 21 + y0, 0.95], [cx + 7, G - 16 + y0 - sway, 0.8]]);
      head(cx, hy, 4.5, true);
      a = {head: [cx, hy - 7], side: [cx - 17, G - 22], hold: [cx + 7, G - 16 + y0 - sway], rear: [cx - 4, G - 16], cube: [cx + 21, hy - 4], box: [cx - 20, hy - 7, cx + 20, G]};
      break;
    }
    case 8: { // FLYING SUCCUBUS: aloft, one knee drawn up, an arm reaching ahead, a trail of hearts behind her
      const fy = Math.round(Math.sin(mo.phase * 0.7) * 1.4), y0 = -3 + fy, hy = G - 33 + y0;
      const wg = part('membrane', {zone: 'wing'}); wings(wg, cx, G - 27 + y0, 21, 8, flap * 4);
      hairBack(cx, hy, 4.5, 'long');
      tail([[cx + 2, G - 15 + y0], [cx + 8, G - 13 + y0], [cx + 12, G - 9 + y0], [cx + 15, G - 12 + y0 - sway]]);
      longLegs([[cx - 1.6, G - 15 + y0], [cx - 2.5, G - 9 + y0], [cx - 1, G - 3 + y0]], [[cx + 1.6, G - 15 + y0], [cx + 4.5, G - 11 + y0], [cx + 4, G - 6 + y0]]);
      figure(cx, G - 27 + y0, G - 21 + y0, G - 16 + y0);
      arms(cx, G - 26.5 + y0, 4.2, [[cx - 8, G - 26 + y0, 0.95], [cx - 11, G - 29 + y0, 0.8]], [[cx + 6.5, G - 22 + y0, 0.95], [cx + 3.4, G - 18 + y0, 0.8]]);
      head(cx, hy, 4.5, true);
      a = {head: [cx, hy - 7], side: [cx - 19, G - 24 + y0], hold: [cx - 11, G - 29 + y0], rear: [cx - 4, G - 10 + y0], cube: [cx + 23, hy - 3], box: [cx - 21, hy - 7, cx + 21, G - 3 + y0], float: true};
      decor = floatHearts(cx - 14, G - 12 + y0, 3);
      break;
    }
    case 9: { // SUCCUBUS QUEEN: on a dark throne trimmed with gold, legs crossed, a tiara in her hair
      const y0 = -bob, hy = G - 31 + y0;
      const wg = part('membrane', {zone: 'wing'}); wings(wg, cx, G - 26 + y0, 22, 9, flap * 3);
      hairBack(cx, hy, 4.5, 'long');
      const th = part('far', {zone: 'body', color: throne, pattern: (x, y) => (y === G - 33 || y === G - 9 ? GOLD : null)});
      poly(th, [[cx - 9, G - 34], [cx + 9, G - 34], [cx + 9, G - 7], [cx - 9, G - 7]]);
      const seat = part('limb', {zone: 'body', color: throne, pattern: (x, y) => (y === G - 6 ? GOLD : (x - cx) % 6 === 0 && y === G - 2 ? GOLD : null)});
      poly(seat, [[cx - 11, G - 6], [cx + 11, G - 6], [cx + 11, G], [cx - 11, G]]);
      tail([[cx + 3, G - 13 + y0], [cx + 11, G - 11], [cx + 14, G - 14 - sway]]);
      // one leg crossed over the other
      longLegs([[cx + 1.6, G - 14 + y0], [cx + 2.5, G - 10], [cx + 2, G - 6.5]], [[cx - 1.6, G - 14 + y0], [cx - 0.5, G - 11], [cx + 5, G - 8]]);
      figure(cx, G - 26 + y0, G - 20 + y0, G - 15 + y0);
      arms(cx, G - 25.5 + y0, 4.2, [[cx - 6.5, G - 21 + y0, 0.95], [cx - 6, G - 15 + y0, 0.8]], [[cx + 7, G - 22 + y0, 0.95], [cx + 3.4, G - 17.5 + y0, 0.8]]);
      head(cx, hy, 4.5, true);
      const tiara = part('core', {zone: 'head', color: GOLD, flat: true}); [[-2, -5], [0, -6], [2, -5], [-1, -5], [1, -5], [0, -7]].forEach(([dx, dy]) => px(tiara, cx + dx, hy + dy));
      const gem = part('core', {zone: 'head', color: PINK, flat: true}); px(gem, cx, hy - 6);
      a = {head: [cx, hy - 8], side: [cx - 20, G - 20], hold: [cx - 6, G - 15 + y0], rear: [cx - 11, G - 4], cube: [cx + 23, hy - 2], box: [cx - 22, G - 40, cx + 22, G]};
      decor = floatHearts(cx + 14, G - 22, 2, 3);
      break;
    }
    case 10: { // ASCENDED: floating in a burst of light with a halo, wings of light, hearts circling
      const fy = Math.round(Math.sin(mo.phase * 0.7) * 1.4), y0 = -1 + fy, hy = G - 32 + y0, cy = G - 22 + y0;
      const rays = part('far', {zone: 'wing', color: light, flat: true});
      for (let k = 0; k < 8; k++) {
        const ang = k * Math.PI / 4 + Math.PI / 8 + (live ? f * 0.04 : 0), r0 = 12, r1 = k % 2 ? 18 : 23;
        limb(rays, cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0 * 0.7, cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1 * 0.7, 0.45);
      }
      const wg = part('membrane', {zone: 'wing', color: skin => mix(skin, '#FFFFFF', 0.15)}); wings(wg, cx, G - 26 + y0, 18, 7, flap * 3);
      hairBack(cx, hy, 4.5, 'long');
      tail([[cx + 2, G - 15 + y0], [cx + 7, G - 11 + y0], [cx + 9, G - 7 + y0], [cx + 12, G - 9 + y0 - sway]]);
      longLegs([[cx - 1.5, G - 14 + y0], [cx - 1.8, G - 9 + y0], [cx - 1, G - 3 + y0]], [[cx + 1.5, G - 14 + y0], [cx + 3, G - 9 + y0], [cx + 2, G - 4 + y0]]);
      figure(cx, G - 26 + y0, G - 20 + y0, G - 15 + y0);
      arms(cx, G - 25.5 + y0, 4.2, [[cx - 7, G - 28 + y0, 0.95], [cx - 9, G - 32 + y0, 0.8]], [[cx + 7, G - 28 + y0, 0.95], [cx + 9, G - 32 + y0, 0.8]]);
      head(cx, hy, 4.5, true);
      const halo = part('core', {zone: 'head', color: GOLD, flat: true}); ring(halo, cx, hy - 7, 4.5, 1.2, 1);
      a = {head: [cx, hy - 9], side: [cx - 20, cy], hold: [cx - 9, G - 32 + y0], rear: [cx, G - 4 + y0], cube: [cx + 22, 6], box: [cx - 22, hy - 9, cx + 22, G - 4 + y0], float: true};
      decor = ctx => {  // hearts circling her
        for (let k = 0; k < 4; k++) {
          const ang = (live ? f * 0.12 : 0.5) + k * Math.PI / 2, hx = Math.round(cx + 19 * Math.cos(ang)), hy2 = Math.round(cy + 6 * Math.sin(ang));
          const m = new Set(); heart(m, hx, hy2, false);
          for (const q of m) ctx.put(q % 64, (q / 64) | 0, Math.sin(ang) < 0 ? mix(PINK, ctx.screen, 0.45) : PINK);
        }
      };
      break;
    }
  }
  return {parts, eyes, mouth, a, decor};
}
},
'index': function (module, require) {
/*
  code.daemon pet engine. Shared by the desktop widget (ui/widget.html) and the
  GitHub profile Action (render.cjs). No dependencies; works in a browser and in Node.

  - XP with diminishing returns and a daily soft cap, replayed in time order
  - hunger: days without coding eat XP, and a pet left at the bottom of its stage devolves
  - 11 stages, each with its own creature body
  - branching forms, locked at the moment each evolution happens
  - rare mutations from your whole history
  - build health from CI results, with a bonus when you fix a red build
  - a 64 x 48 pixel renderer with themes, click reactions, and an animated SVG card

  core/    stats from coding sessions: rules, XP, forms, CI, GitHub scanning
  render/  pixels: raster primitives, the theme registry, build() and its layers, reactions, the SVG card
  themes/  the themes, one file each

  tools/build.cjs bundles this folder into ui/pet-core.js and the profile Action's copy: `npm run build`.
*/
'use strict';
const {DAY, HOUR, clamp, dayIdx} = require('core/util');
const {SOURCES, SRC, STAGES, MAX_STAGE, CREST_STAGE, FORM_STAGE, FORMS, MUTATIONS, PET, FIX_XP, DAY_SOFT_CAP, OVER_CAP_RATE, HUNGER, MUTATION_DAYS, CROWN_XP, COMMITTED, isLate} = require('core/rules');
const {sessionXP, mult} = require('core/xp');
const {SESSION_GAP, commitKey, sessionStart, rescanFrom, valid, detectKind, toSessions} = require('core/sessions');
const {traitScores, traitAt} = require('core/forms');
const {rateOf: hungerRate, starveAt, hungerAt, starve} = require('core/hunger');
const {derive, gainFor, statusInfo, statusLine} = require('core/derive');
const {ciFromRollup, ciFromPipeline, updateCI} = require('core/ci');
const {Q_REPO, Q_HIST, scanGitHubRepo} = require('core/github');
const {mix} = require('render/colors');
const {GW, GH} = require('render/raster');
const {defineTheme, themes, hasTheme, stageBody, themeColors} = require('render/themes');
const {build} = require('render/build');
const {reactionFor, canReact, hitTest} = require('render/reactions');
const {CLIPS, defineClip} = require('render/clips');
const {clipFor} = require('render/pose');
const {renderSVG} = require('render/svg');

// The themes, in picker order.
defineTheme(require('themes/classic'));
defineTheme(require('themes/derp'));
defineTheme(require('themes/slavic'));
defineTheme(require('themes/asian'));
defineTheme(require('themes/demonic'));
defineTheme(require('themes/succubus'));

module.exports = {
  // rules
  DAY, HOUR, SOURCES, SRC, STAGES, MAX_STAGE, CREST_STAGE, FORM_STAGE, FORMS, MUTATIONS, PET, FIX_XP, DAY_SOFT_CAP, OVER_CAP_RATE, HUNGER, MUTATION_DAYS, CROWN_XP, COMMITTED,
  isLate, clamp, dayIdx,
  // stats from sessions
  sessionXP, mult, valid, derive, gainFor, traitScores, traitAt, statusInfo, statusLine, hungerRate, starveAt, hungerAt, starve,
  SESSION_GAP, sessionStart, rescanFrom, commitKey, detectKind, toSessions,
  ciFromRollup, ciFromPipeline, updateCI, Q_REPO, Q_HIST, scanGitHubRepo,
  // pixels
  GW, GH, mix, build, renderSVG, CLIPS, defineClip, clipFor, reactionFor, canReact, hitTest,
  defineTheme, themes, hasTheme, stageBody, themeColors,
};
},
};
const cache = {};
function require(id) {
  if (!cache[id]) { cache[id] = {exports: {}}; modules[id](cache[id], require); }
  return cache[id].exports;
}
const PetCore = require('index');
root.PetCore = PetCore;
if (typeof module !== 'undefined' && module.exports) module.exports = PetCore;
})(typeof globalThis !== 'undefined' ? globalThis : this);
