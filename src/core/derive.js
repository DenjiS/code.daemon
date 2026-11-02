/* ---------- derive everything from sessions ---------- */
'use strict';
const {DAY, HOUR, clamp, dayIdx} = require('./util');
const {STAGES, MAX_STAGE, FORM_STAGE, DAY_SOFT_CAP, isLate} = require('./rules');
const {sessionXP, mult, softCap} = require('./xp');
const {valid} = require('./sessions');
const {traitAt} = require('./forms');

function derive(list, now, extra) {
  extra = extra || {};
  const ci = extra.ci || {};
  const events = (extra.events || []).filter(e => e && Number.isFinite(e.at) && Number.isFinite(e.xp));
  const sorted = list.filter(valid).sort((a, b) => a.at - b.at);
  const items = sorted.map(s => ({t: s.at, s})).concat(events.map(e => ({t: e.at, e}))).sort((a, b) => a.t - b.t);
  const days = new Set(), dayRaw = new Map(), gain = {}, mults = {}, src30 = {}, srcAll = {}, forms = {}, seen = [];
  let xp = 0, commits = 0, maxStreak = 0, fri13 = false, stage = 0, fixes = 0;
  for (const it of items) {
    if (it.s) {
      const s = it.s, d = dayIdx(s.at);
      days.add(d);
      let st = 0; while (days.has(d - st)) st++;
      if (st > maxStreak) maxStreak = st;
      const before = dayRaw.get(d) || 0, raw = sessionXP(s) * mult(st);
      dayRaw.set(d, before + raw);
      const g = Math.max(1, Math.round(softCap(before + raw) - softCap(before)));
      gain[s.id] = g; mults[s.id] = mult(st); xp += g; commits += s.commits || 0;
      srcAll[s.src] = (srcAll[s.src] || 0) + g;
      if (now - s.at < 30 * DAY) src30[s.src] = (src30[s.src] || 0) + g;
      const dt = new Date(s.at);
      if (dt.getDay() === 5 && dt.getDate() === 13) fri13 = true;
      seen.push(s);
    } else {
      // CI fixes share the daily soft cap with sessions, so a flapping build can't carry the pet.
      const d = dayIdx(it.e.at), before = dayRaw.get(d) || 0;
      dayRaw.set(d, before + it.e.xp);
      const g = Math.max(1, Math.round(softCap(before + it.e.xp) - softCap(before)));
      xp += g; gain[it.e.id] = g; fixes++;
    }
    while (stage < MAX_STAGE && xp >= STAGES[stage + 1].xp) { stage++; if (stage >= FORM_STAGE) forms[stage] = traitAt(seen, it.t); }
  }
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
    mutations: {shiny: maxStreak >= 30, cursed: fri13, crowned: commits >= 1000},
    health, failing, ciTracked: tracked.length, ciPassing: tracked.filter(k => ci[k].s === 'pass').length, fixes,
    sick: failing.length > 0, critical: health < 30,
    last: sorted.length ? sorted[sorted.length - 1].at : null, count: sorted.length,
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
function statusInfo(D) {
  if (!D.count) return ['empty', {}];
  if (D.stage === 0) return ['incubating', {n: STAGES[1].xp - D.xp}];
  if (D.failing.length) return ['sick', {repo: D.failing[0], more: D.failing.length - 1}];
  if (D.energy < 20) return ['asleep', {}];
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
    case 'sick': return `> sick · CI failing in ${name(v.repo)}${v.more ? ` +${v.more}` : ''}`;
    case 'asleep': return '> asleep · feed it a commit';
    case 'tired': return `> tired · ${v.n} late night${v.n === 1 ? '' : 's'} this week`;
    case 'risk': return `> streak ${v.n}d at risk · code today`;
    case 'next': return `> ${v.n} XP to ${STAGES[v.stage].name.toLowerCase()}`;
  }
  return `> singularity · ${v.n} XP`;
}

module.exports = {derive, gainFor, statusInfo, statusLine};
