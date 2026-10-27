/*
  code.daemon pet engine. Shared by the desktop widget (ui/widget.html) and the
  GitHub profile Action (render.cjs). No dependencies; works in a browser and in Node.

  - XP with diminishing returns and a daily soft cap, replayed in time order
  - 11 stages, each with its own creature body
  - branching forms, locked at the moment each evolution happens
  - rare mutations from your whole history
  - build health from CI results, with a bonus when you fix a red build
  - a 64 x 48 pixel renderer built from shaded body parts, and an animated SVG card
*/
(function (root) {
'use strict';

const DAY = 864e5, HOUR = 36e5;
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
const MUTATIONS = {
  shiny:   {name: 'Shiny',   rule: 'Coded 30 days in a row at some point'},
  cursed:  {name: 'Cursed',  rule: 'Coded on a Friday the 13th'},
  crowned: {name: 'Crowned', rule: '1000 commits'},
};
const PET = {github: '#8E9BFF', gitlab: '#FF9B5E', local: '#4ADBC3', unity: '#B4E15C', unreal: '#E78CF7', none: '#C7CFDA'};
const FIX_XP = 15;
const DAY_SOFT_CAP = 90, OVER_CAP_RATE = 0.15;
const RX_BUG = /\b(fix(e[sd])?|bug(fix)?|hotfix|patch(ed)?|resolve[sd]?)\b/i;
const RX_TEST = /\b(tests?|testing|specs?|e2e)\b/i;
const RX_REL = /\b(release[sd]?|bump(ed)? version|v\d+\.\d+(\.\d+)?)\b/i;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dayIdx = ms => { const d = new Date(ms); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY); };
// One session's XP before streak and daily cap. Long sessions and commit bursts grow slowly on purpose.
const sessionXP = s => 12 * Math.log(1 + Math.min(s.min, 480) / 20) + 7 * Math.sqrt(Math.min(s.commits || 0, 50))
  + (s.tests ? 8 : 0) + (s.bug ? 6 : 0) + (s.ship ? 15 : 0);
const baseXP = sessionXP;
const mult = st => 1 + 0.03 * Math.min(st, 10);
const softCap = v => v <= DAY_SOFT_CAP ? v : DAY_SOFT_CAP + (v - DAY_SOFT_CAP) * OVER_CAP_RATE;
const valid = s => !!(s && SRC[s.src] && Number.isFinite(s.min) && s.min > 0 && Number.isFinite(s.at));
const isLate = ms => { const h = new Date(ms).getHours(); return h >= 23 || h < 5; };
const SESSION_GAP = 2 * HOUR;  // commits closer than this join one session

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

/* ---------- forms ---------- */
function traitAt(seen, t) {
  const w = seen.filter(s => s.at <= t && t - s.at < 30 * DAY);
  if (w.length < 3) return 'core';
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
  let best = 'core', bv = 1;
  for (const k in score) if (score[k] >= bv && score[k] > (score[best] || 0)) { best = k; bv = score[k]; }
  return best;
}

/* ---------- derive everything from sessions ---------- */
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
  const late = week.filter(s => new Date(s.at).getHours() < 5).length;
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

function statusLine(D, opts) {
  opts = opts || {};
  const name = opts.label || (k => String(k || '').replace(/^g[hl]:/, ''));
  if (!D.count) return opts.empty || '> egg found. waiting for commits';
  if (D.stage === 0) return `> incubating · ${STAGES[1].xp - D.xp} XP to hatch`;
  if (D.failing.length) return `> sick · CI failing in ${name(D.failing[0])}${D.failing.length > 1 ? ` +${D.failing.length - 1}` : ''}`;
  if (D.energy < 20) return '> asleep · feed it a commit';
  if (D.rest < 50) return `> tired · ${D.late} late night${D.late === 1 ? '' : 's'} this week`;
  if (D.streak >= 2 && !D.codedToday) return `> streak ${D.streak}d at risk · code today`;
  if (D.stage < MAX_STAGE) { const n = STAGES[D.stage + 1]; return `> ${n.xp - D.xp} XP to ${n.name.toLowerCase()}`; }
  return `> singularity · ${D.xp} XP`;
}

/* ---------- commits -> sessions ---------- */
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

/* ---------- CI ---------- */
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

/* ---------- GitHub (GraphQL) ---------- */
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
  const seen = new Map();
  const add = nodes => { let fresh = 0; for (const c of nodes) if (c && !seen.has(c.oid)) { seen.set(c.oid, {oid: c.oid, t: Date.parse(c.authoredDate), msg: c.messageHeadline || ''}); fresh++; } return fresh; };
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

/* ---------- themes: Classic and Derpy are drawn below; others are sprite sets registered at load ---------- */
const THEMES = {};
const THEME_LIST = [{id: 'classic', name: 'Classic'}, {id: 'derp', name: 'Derpy'}, {id: 'demonic', name: 'Demonic'}, {id: 'succubus', name: 'Succubus'}];
const DRAWN = {
  classic: null,
  derp: ['Leggy egg', 'Blep', 'Crab', 'Potato', 'Derpasaur', 'Sausage', 'Noodle', 'Gremlin', 'Long boi', 'Chonk', 'Big eye'],
};
const own = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
function registerTheme(id, data) { if (id && !own(DRAWN, id) && data && data.stages && data.palettes) THEMES[id] = data; }
const themeOf = id => (own(THEMES, id) && !own(DRAWN, id)) ? THEMES[id] : null;
const hasTheme = id => own(DRAWN, id) || own(THEMES, id);
const stageBody = (st, id) => { const T = themeOf(id); return (T && T.bodies && T.bodies[st]) || (own(DRAWN, id) && DRAWN[id] && DRAWN[id][st]) || STAGES[st].body; };
const themeColors = id => { const T = themeOf(id); return T ? {screen: T.screen, dot: T.dot} : null; };

/* ======================================================================
   Renderer: 64 x 48 cells. Each creature is a list of shaded parts.
   ====================================================================== */
const GW = 64, GH = 48, G = 41;  // G = ground row the feet stand on
const C = {steel: '#A9B8C9', steelDark: '#5C6B7C', white: '#FFFFFF', wood: '#B7834C', woodDark: '#7A5230', moon: '#E8E4C9',
  red: '#FF5A3C', orange: '#FF9B3C', yellow: '#FFE27A', gold: '#FFD24A', gem: '#FF5A7A', sick: '#8FA08A', drop: '#7FC8FF',
  alarm: '#FF5A5A', curse: '#FF4D4D', spark: '#FFF6C8', horn: '#ECE4CF', tongue: '#FF6F7D', note: '#F5F0FF', eyeWhite: '#F2F4F8'};
const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
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

/* ---------- creature body plans ----------
   Each returns {parts: [{m, role}], eyes: [{x,y,w,h}], mouth: {x,y,w}, a: anchors}.
   Roles: body, limb, far, belly, membrane, horn, core. Anchors: head (top of head), side, hold, rear, cube, box, face. */
function plans(st, f, mo) {
  const parts = [], P = role => { const m = new Set(); parts.push({m, role}); return m; };
  const bob = mo.bob, walk = mo.walk, flap = mo.flap, sway = mo.sway;
  let eyes = [], mouth = null, a = {};
  const cx = 32;
  switch (st) {
    case 1: { // BIT: slime droplet
      const sq = bob ? 0.8 : 0, rx = 7.5 + sq, ry = 6 - sq, cy = G - ry + 0.5;
      const b = P('body'); ellipse(b, cx, cy, rx, ry); poly(b, [[cx - 3.5, cy - ry + 2], [cx + 1, cy - ry - 4 + sq], [cx + 3, cy - ry + 2]]);
      const sh = P('belly'); px(sh, cx - 4, cy - 3); px(sh, cx - 5, cy - 2); px(sh, cx - 4, cy - 2);
      eyes = [{x: cx - 4, y: cy - 1, w: 2, h: 2}, {x: cx + 2, y: cy - 1, w: 2, h: 2}];
      mouth = {x: cx - 1, y: cy + 2, w: 2};
      a = {head: [cx, cy - ry - 3], side: [cx - 9, cy], hold: [cx - 9, cy + 2], rear: [cx - 9, cy], cube: [cx + 12, cy - 12], box: [cx - 9, cy - ry - 4, cx + 9, G]};
      break;
    }
    case 2: { // NIBBLE: crawler with eye stalks and stub legs
      const cy = G - 8.5 - bob * 0.5;
      const legs = P('limb');
      [-8, -3, 3, 8].forEach((o, i) => { const up = ((i + walk) & 1) ? 1 : 0; limb(legs, cx + o, cy + 4, cx + o + (i < 2 ? -1 : 1), G - up, 1.4, 1.2); });
      const b = P('body'); ellipse(b, cx, cy, 11.5, 6.5);
      const bel = P('belly'); ellipse(bel, cx, cy + 3, 8, 2.5);
      const st1 = P('limb'); limb(st1, cx - 3, cy - 5, cx - 6, cy - 12 + bob, 1, 0.8); limb(st1, cx + 3, cy - 5, cx + 6, cy - 12 + bob, 1, 0.8);
      const eb = P('eyeWhite'); ellipse(eb, cx - 6, cy - 13 + bob, 2.4, 2.4); ellipse(eb, cx + 6, cy - 13 + bob, 2.4, 2.4);
      eyes = [{x: cx - 6, y: cy - 14 + bob, w: 1, h: 2}, {x: cx + 6, y: cy - 14 + bob, w: 1, h: 2}];
      mouth = {x: cx - 1, y: cy + 1, w: 3};
      a = {head: [cx, cy - 7], side: [cx - 13, cy - 1], hold: [cx - 13, cy + 1], rear: [cx - 12, cy], cube: [cx + 14, cy - 18], box: [cx - 12, cy - 16, cx + 12, G]};
      break;
    }
    case 3: { // BYTE: round biped with ears and arms
      const cy = G - 12.5 - bob;
      const legs = P('limb'); limb(legs, cx - 4, cy + 7, cx - 5, G - 1, 1.8); limb(legs, cx + 4, cy + 7, cx + 5, G - 1, 1.8);
      ellipse(legs, cx - 6, G - 0.5, 3, 1.3); ellipse(legs, cx + 6, G - 0.5, 3, 1.3);
      const ears = P('body'); poly(ears, [[cx - 8, cy - 5], [cx - 10, cy - 13], [cx - 3, cy - 8]]); poly(ears, [[cx + 8, cy - 5], [cx + 10, cy - 13], [cx + 3, cy - 8]]);
      const b = P('body'); ellipse(b, cx, cy, 10, 9);
      const bel = P('belly'); ellipse(bel, cx, cy + 3.5, 6, 4.5);
      const arms = P('limb'); limb(arms, cx - 9, cy + 1, cx - 13, cy + 4 - sway * 4, 1.4, 1.1); limb(arms, cx + 9, cy + 1, cx + 13, cy + 4, 1.4, 1.1);
      eyes = [{x: cx - 5, y: cy - 3, w: 2, h: 2}, {x: cx + 3, y: cy - 3, w: 2, h: 2}];
      mouth = {x: cx - 1, y: cy + 1, w: 2};
      a = {head: [cx, cy - 9], side: [cx - 16, cy + 1], hold: [cx - 13, cy + 4 - sway * 4], rear: [cx - 11, cy], cube: [cx + 15, cy - 12], box: [cx - 13, cy - 13, cx + 13, G]};
      break;
    }
    case 4: { // WORD: upright kaiju chick with a tail
      const y0 = -bob;
      const tail = P('limb'); chain(tail, [[cx - 5, G - 8 + y0, 3.2], [cx - 13, G - 5, 2.2], [cx - 19, G - 7 - sway, 1]]);
      const legs = P('limb'); limb(legs, cx - 4, G - 9 + y0, cx - 5, G - 1, 2.4); limb(legs, cx + 4, G - 9 + y0, cx + 5, G - 1, 2.4);
      ellipse(legs, cx - 6, G - 0.5, 3.6, 1.4); ellipse(legs, cx + 6, G - 0.5, 3.6, 1.4);
      const armB = P('far'); limb(armB, cx - 5, G - 16 + y0, cx - 9, G - 12 + y0, 1.3, 1);
      const b = P('body'); ellipse(b, cx, G - 12.5 + y0, 8, 8.5);
      const bel = P('belly'); ellipse(bel, cx + 1.5, G - 11 + y0, 5, 6);
      const head = P('body'); ellipse(head, cx + 1, G - 24 + y0, 8, 6.5); ellipse(head, cx + 7, G - 21.5 + y0, 4.5, 3.2);
      const sp = P('horn'); [[cx - 5, G - 29], [cx - 1, G - 31], [cx + 3, G - 31]].forEach(([x, y]) => poly(sp, [[x - 1.5, y + 2 + y0], [x, y - 2 + y0], [x + 1.5, y + 2 + y0]]));
      const armF = P('limb'); limb(armF, cx + 6, G - 16 + y0, cx + 10, G - 12 + y0 - sway * 3, 1.4, 1.1);
      eyes = [{x: cx + 1, y: G - 26 + y0, w: 2, h: 2}, {x: cx + 6, y: G - 26 + y0, w: 2, h: 2}];
      mouth = {x: cx + 8, y: G - 21 + y0, w: 3};
      a = {head: [cx + 1, G - 31 + y0], side: [cx - 14, G - 16], hold: [cx + 11, G - 12 + y0 - sway * 3], rear: [cx - 19, G - 9], cube: [cx + 15, G - 34], box: [cx - 19, G - 33, cx + 13, G]};
      break;
    }
    case 5: { // PROCESS: four-legged runner facing right
      const y0 = -bob;
      const tail = P('limb'); chain(tail, [[cx - 13, G - 12 + y0, 2.8], [cx - 19, G - 16, 2], [cx - 22, G - 23 + sway, 1.4], [cx - 20, G - 27 + sway, 1]]);
      const far = P('far'); limb(far, cx + 4, G - 8 + y0, cx + 3 - walk * 2, G - 1, 1.6); limb(far, cx - 7, G - 8 + y0, cx - 6 + walk * 2, G - 1, 1.6);
      const b = P('body'); ellipse(b, cx - 2, G - 11 + y0, 13, 6.2);
      const bel = P('belly'); ellipse(bel, cx - 1, G - 7.5 + y0, 9, 2.4);
      const legs = P('limb'); limb(legs, cx + 7, G - 8 + y0, cx + 8 + walk * 2, G - 1, 1.8); limb(legs, cx - 10, G - 8 + y0, cx - 11 - walk * 2, G - 1, 1.8);
      const neck = P('body'); limb(neck, cx + 8, G - 13 + y0, cx + 12, G - 18 + y0, 3.4, 3);
      const ears = P('body'); poly(ears, [[cx + 10, G - 24 + y0], [cx + 11, G - 31 + y0], [cx + 14, G - 24 + y0]]); poly(ears, [[cx + 15, G - 24 + y0], [cx + 17, G - 30 + y0], [cx + 18, G - 23 + y0]]);
      const head = P('body'); ellipse(head, cx + 14, G - 20.5 + y0, 6, 5); ellipse(head, cx + 19.5, G - 19 + y0, 4, 2.6);
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
      const fr = P('membrane'); poly(fr, [[hx - 3, hy - 1], [hx - 9, hy - 7], [hx - 5, hy - 4], [hx - 6, hy - 10], [hx - 2, hy - 5], [hx + 1, hy - 8], [hx + 1, hy - 3]]);
      const b = P('body'); chain(b, path); limb(b, hx0, hy0, hx, hy, 3.4, 3.4);
      const bel = P('belly'); chain(bel, path.slice(2, N - 1).map(([x, y, r]) => [x + 0.5, y + r * 0.55, r * 0.42]));
      const sp = P('horn'); for (let i = 3; i < N - 1; i += 2) { const [x, y, r] = path[i]; poly(sp, [[x - 1.2, y - r + 0.5], [x - 0.3, y - r - 2.3], [x + 1, y - r + 0.5]]); }
      const head = P('body'); ellipse(head, hx, hy, 6.5, 4.8); ellipse(head, hx + 5.5, hy + 1.5, 4.5, 2.6);
      const whisk = P('horn'); chain(whisk, [[hx + 8, hy + 3, 0.5], [hx + 11, hy + 6 - mo.alt, 0.5], [hx + 13, hy + 5, 0.4]]);
      eyes = [{x: hx, y: hy - 2, w: 2, h: 2}];
      mouth = {x: hx + 5, y: hy + 2, w: 3, tongue: mo.alt};
      a = {head: [hx - 1, hy - 5], side: [path[8][0], path[8][1] - 3], hold: [hx + 10, hy + 2], rear: [path[1][0], path[1][1]], cube: [52, 6], box: [5, hy - 10, hx + 10, G]};
      break;
    }
    case 7: { // DAEMON: winged imp
      const y0 = -bob, fl = flap;
      const wing = P('membrane');
      for (const s of [-1, 1]) {
        const sx = cx + s * 5;
        poly(wing, [[sx, G - 23 + y0], [sx + s * 13, G - 33 - fl * 2 + y0], [sx + s * 19, G - 26 - fl + y0], [sx + s * 17, G - 19 + y0], [sx + s * 13, G - 21 + y0], [sx + s * 11, G - 16 + y0], [sx + s * 7, G - 19 + y0], [sx + s * 3, G - 15 + y0]]);
      }
      const bones = P('limb');
      for (const s of [-1, 1]) { const sx = cx + s * 5; limb(bones, sx, G - 23 + y0, cx + s * 18, G - 33 - fl * 2 + y0, 0.9, 0.5); limb(bones, cx + s * 18, G - 33 - fl * 2 + y0, cx + s * 24, G - 26 - fl + y0, 0.6, 0.4); }
      const tail = P('limb'); chain(tail, [[cx + 3, G - 8 + y0, 1.4], [cx + 12, G - 5, 1.1], [cx + 17, G - 10 - sway, 0.8]]);
      const tip = P('horn'); poly(tip, [[cx + 15, G - 11 - sway], [cx + 18, G - 16 - sway], [cx + 20, G - 10 - sway]]);
      const legs = P('limb'); limb(legs, cx - 3, G - 9 + y0, cx - 4, G - 1, 2); limb(legs, cx + 3, G - 9 + y0, cx + 4, G - 1, 2);
      ellipse(legs, cx - 5, G - 0.5, 2.6, 1.2); ellipse(legs, cx + 5, G - 0.5, 2.6, 1.2);
      const b = P('body'); ellipse(b, cx, G - 14 + y0, 6.5, 7);
      const bel = P('belly'); ellipse(bel, cx, G - 12.5 + y0, 4, 4.5);
      const arms = P('limb'); limb(arms, cx - 6, G - 18 + y0, cx - 10, G - 12 + y0 - sway * 4, 1.5, 1.1); limb(arms, cx + 6, G - 18 + y0, cx + 10, G - 12 + y0, 1.5, 1.1);
      const head = P('body'); ellipse(head, cx, G - 25 + y0, 6, 5.5);
      poly(head, [[cx - 5, G - 26 + y0], [cx - 9, G - 30 + y0], [cx - 4, G - 29 + y0]]); poly(head, [[cx + 5, G - 26 + y0], [cx + 9, G - 30 + y0], [cx + 4, G - 29 + y0]]);
      const horns = P('horn'); chain(horns, [[cx - 3, G - 29 + y0, 1.5], [cx - 5, G - 33 + y0, 1], [cx - 4, G - 36 + y0, 0.5]]); chain(horns, [[cx + 3, G - 29 + y0, 1.5], [cx + 5, G - 33 + y0, 1], [cx + 4, G - 36 + y0, 0.5]]);
      px(horns, cx - 11, G - 12 + y0 - sway * 4); px(horns, cx + 11, G - 12 + y0);
      eyes = [{x: cx - 3, y: G - 27 + y0, w: 2, h: 2}, {x: cx + 2, y: G - 27 + y0, w: 2, h: 2}];
      mouth = {x: cx - 1, y: G - 23 + y0, w: 3, fangs: true};
      a = {head: [cx, G - 31 + y0], side: [cx - 15, G - 13], hold: [cx - 11, G - 12 + y0 - sway * 4], rear: [cx + 20, G - 12], cube: [cx + 26, G - 12], box: [cx - 24, G - 36, cx + 24, G]};
      break;
    }
    case 8: { // SERVICE: wyvern with a raised wing and long neck
      const y0 = -bob, fl = flap;
      const wingF = P('far'); poly(wingF, [[cx + 2, G - 16 + y0], [cx + 2, G - 34 - fl * 3 + y0], [cx - 2, G - 28 + y0], [cx - 7, G - 31 - fl * 2 + y0], [cx - 6, G - 23 + y0], [cx - 4, G - 16 + y0]]);
      const tail = P('limb'); chain(tail, [[cx - 14, G - 11 + y0, 3], [cx - 22, G - 7, 2], [cx - 27, G - 11 - sway, 1.2]]);
      const tip = P('horn'); poly(tip, [[cx - 28, G - 9 - sway], [cx - 31, G - 13 - sway], [cx - 27, G - 15 - sway], [cx - 25, G - 12 - sway]]);
      const far = P('far'); limb(far, cx + 5, G - 8 + y0, cx + 4 - walk * 2, G - 1, 2); limb(far, cx - 8, G - 8 + y0, cx - 7 + walk * 2, G - 1, 2);
      const b = P('body'); ellipse(b, cx - 3, G - 11 + y0, 14, 7);
      const bel = P('belly'); ellipse(bel, cx - 2, G - 7.5 + y0, 10, 2.6);
      const spikes = P('horn'); for (let x = cx - 14; x <= cx + 6; x += 4) poly(spikes, [[x - 1.5, G - 16 + y0 + (x < cx - 10 ? 1 : 0)], [x, G - 20 + y0], [x + 1.5, G - 16 + y0]]);
      const wing = P('membrane'); poly(wing, [[cx - 2, G - 16 + y0], [cx - 8, G - 37 - fl * 3 + y0], [cx - 13, G - 29 + y0], [cx - 20, G - 34 - fl * 2 + y0], [cx - 20, G - 25 + y0], [cx - 26, G - 25 - fl + y0], [cx - 14, G - 16 + y0]]);
      const bones = P('limb'); limb(bones, cx - 2, G - 16 + y0, cx - 8, G - 37 - fl * 3 + y0, 1, 0.5); limb(bones, cx - 8, G - 37 - fl * 3 + y0, cx - 20, G - 34 - fl * 2 + y0, 0.6, 0.5); limb(bones, cx - 8, G - 37 - fl * 3 + y0, cx - 26, G - 25 - fl + y0, 0.6, 0.4);
      const legs = P('limb'); limb(legs, cx + 8, G - 8 + y0, cx + 9 + walk * 2, G - 1, 2.2); limb(legs, cx - 11, G - 8 + y0, cx - 12 - walk * 2, G - 1, 2.2);
      const neck = P('body'); chain(neck, [[cx + 8, G - 14 + y0, 3.6], [cx + 13, G - 21 + y0, 2.8], [cx + 16, G - 26 + y0, 2.6]]);
      const horns = P('horn'); chain(horns, [[cx + 16, G - 31 + y0, 1.2], [cx + 13, G - 35 + y0, 0.6]]); chain(horns, [[cx + 19, G - 31 + y0, 1.1], [cx + 18, G - 36 + y0, 0.5]]);
      const head = P('body'); ellipse(head, cx + 18, G - 28.5 + y0, 5.5, 4); ellipse(head, cx + 23, G - 27.5 + y0, 3.8, 2.4);
      eyes = [{x: cx + 18, y: G - 30 + y0, w: 2, h: 2}];
      mouth = {x: cx + 23, y: G - 26 + y0, w: 3, fangs: true};
      a = {head: [cx + 17, G - 33 + y0], side: [cx - 4, G - 12 + y0], hold: [cx + 27, G - 26 + y0], rear: [cx - 28, G - 12], cube: [cx + 24, G - 17], box: [cx - 31, G - 38, cx + 27, G]};
      break;
    }
    case 9: { // KERNEL: seated great dragon, wings spread
      const y0 = -bob, fl = flap;
      const wing = P('membrane');
      for (const s of [-1, 1]) {
        const sx = cx + s * 7;
        poly(wing, [[sx, G - 22 + y0], [cx + s * 20, G - 36 - fl * 2], [cx + s * 29, G - 30 - fl], [cx + s * 27, G - 21], [cx + s * 23, G - 24], [cx + s * 21, G - 16], [cx + s * 17, G - 20], [cx + s * 14, G - 13], [sx + s * 2, G - 15 + y0]]);
      }
      const bones = P('limb');
      for (const s of [-1, 1]) { const sx = cx + s * 7; limb(bones, sx, G - 22 + y0, cx + s * 20, G - 36 - fl * 2, 1.1, 0.6); limb(bones, cx + s * 20, G - 36 - fl * 2, cx + s * 29, G - 30 - fl, 0.7, 0.5); limb(bones, cx + s * 20, G - 36 - fl * 2, cx + s * 23, G - 24, 0.5); limb(bones, cx + s * 20, G - 36 - fl * 2, cx + s * 17, G - 20, 0.5); }
      const haunch = P('limb'); ellipse(haunch, cx - 8, G - 5, 6, 5); ellipse(haunch, cx + 8, G - 5, 6, 5);
      const b = P('body'); ellipse(b, cx, G - 13 + y0, 10, 11);
      const bel = P('belly'); ellipse(bel, cx, G - 11 + y0, 6, 8);
      const arms = P('limb'); limb(arms, cx - 8, G - 17 + y0, cx - 6, G - 3, 2.2, 1.8); limb(arms, cx + 8, G - 17 + y0, cx + 6, G - 3, 2.2, 1.8);
      const tail = P('limb'); chain(tail, [[cx + 10, G - 3, 2.6], [cx, G - 0.5, 2.2], [cx - 12, G - 1, 1.6], [cx - 17, G - 5 - sway, 1]]);
      const claws = P('horn'); [-7, -5, 5, 7].forEach(o => px(claws, cx + o, G - 1));
      const neck = P('body'); limb(neck, cx, G - 22 + y0, cx, G - 26 + y0, 4.2, 3.8);
      const horns = P('horn'); for (const s of [-1, 1]) chain(horns, [[cx + s * 4, G - 31 + y0, 1.8], [cx + s * 8, G - 35 + y0, 1.1], [cx + s * 10, G - 37 + y0, 0.5]]);
      const head = P('body'); ellipse(head, cx, G - 29 + y0, 6.5, 5); ellipse(head, cx, G - 25.5 + y0, 4.2, 2.8);
      eyes = [{x: cx - 4, y: G - 31 + y0, w: 2, h: 2}, {x: cx + 3, y: G - 31 + y0, w: 2, h: 2}];
      mouth = {x: cx - 1, y: G - 24 + y0, w: 3, fangs: true};
      a = {head: [cx, G - 34 + y0], side: [cx - 16, G - 9], hold: [cx - 7, G - 4], rear: [cx - 18, G - 6], cube: [cx + 25, G - 10], box: [cx - 29, G - 37, cx + 29, G], plates: true};
      break;
    }
    case 10: { // SINGULARITY: ascended, floating geometric form
      const fy = Math.round(Math.sin(mo.phase * 0.7) * 1.4), y = G - 18 + fy;
      const wing = P('membrane');
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
        const ang = (-0.35 - i * 0.28) * s, len = 14 + i * 2 + flap;
        limb(wing, cx + s * 6, y - 4, cx + s * 6 + Math.sin(ang) * len * s * s, y - 4 - Math.cos(ang) * len * 0.75, 1.2, 0.5);
      }
      const halo = P('horn'); ring(halo, cx, y - 19, 9, 2.4, 1);
      const plates = P('limb');
      for (const s of [-1, 1]) {
        poly(plates, [[cx + s * 10, y - 9], [cx + s * 15, y - 7], [cx + s * 12, y - 3]]);
        const hy = y + 4 - fy * 2;
        poly(plates, [[cx + s * 17, hy - 2.5], [cx + s * 19.5, hy], [cx + s * 17, hy + 2.5], [cx + s * 14.5, hy]]);
      }
      const b = P('body'); poly(b, [[cx, y - 13], [cx + 9.5, y], [cx, y + 13], [cx - 9.5, y]]);
      const facet = P('belly'); poly(facet, [[cx, y - 7], [cx + 5, y], [cx, y + 7], [cx - 5, y]]);
      const core = P('core'); ellipse(core, cx, y, mo.alt ? 2.4 : 1.8, mo.alt ? 2.4 : 1.8);
      const head = P('body'); poly(head, [[cx - 3.5, y - 16], [cx, y - 19.5], [cx + 3.5, y - 16], [cx + 3.5, y - 14.5], [cx, y - 13], [cx - 3.5, y - 14.5]]);
      eyes = [{x: cx - 2, y: y - 16, w: 5, h: 1, visor: true}];
      mouth = null;
      a = {head: [cx, y - 22], side: [cx - 20, y + 4], hold: [cx - 17, y + 4], rear: [cx, y + 15], cube: [cx + 22, 6], box: [cx - 22, y - 24, cx + 22, y + 14], float: true};
      break;
    }
  }
  return {parts, eyes, mouth, a};
}

/* ---------- Derpy: the same line, drawn badly on purpose ----------
   Googly eyes (eye: {x, y, r, g: true, p: pupil size}), lopsided bodies, buck teeth and tongues.
   Mouth types: buck (teeth), blep (tongue out), open (gaping), under (underbite fang). */
function carve(m, pts) { const t = new Set(); poly(t, pts); for (const k of t) m.delete(k); }
function derpPlans(st, f, mo) {
  const parts = [], P = role => { const m = new Set(); parts.push({m, role}); return m; };
  const bob = mo.bob, walk = mo.walk, flap = mo.flap, sway = mo.sway, alt = mo.alt;
  let eyes = [], mouth = null, a = {};
  const cx = 32;
  const goo = (m, x, y, r, p) => { ellipse(m, x, y, r, r); eyes.push({x, y, r, g: true, p: p || (r >= 2.5 ? 2 : 1)}); };
  switch (st) {
    case 0: { // leggy egg: an egg on two stubby legs, peeking around
      const step = mo.has ? walk : 0, cy = G - 13.5;
      const legs = P('limb');
      limb(legs, cx - 3, cy + 8, cx - 3, G - 1 - step, 1.2); limb(legs, cx + 3, cy + 8, cx + 3, G - 1 - (mo.has ? 1 - walk : 0), 1.2);
      ellipse(legs, cx - 4.5, G - 0.5 - step, 2.2, 1); ellipse(legs, cx + 4.5, G - 0.5 - (mo.has ? 1 - walk : 0), 2.2, 1);
      const b = P('body');
      for (let y = Math.floor(cy - 10); y <= Math.ceil(cy + 9); y++) for (let x = cx - 9; x <= cx + 9; x++) {
        const dy = (y - cy) / 9.5, rx = 7.5 * (dy < 0 ? 1 - 0.25 * dy * dy : 1), dx = (x - cx) / rx;
        if (dx * dx + dy * dy <= 1) px(b, x, y);
      }
      const ew = P('eyeWhite'); goo(ew, cx - 3, cy - 3, 2.5, 1); goo(ew, cx + 3.5, cy - 4, 3, 2);
      a = {head: [cx, cy - 10], side: [cx - 10, cy], hold: [cx - 10, cy + 2], rear: [cx - 9, cy], cube: [cx + 13, cy - 10], box: [cx - 8, cy - 10, cx + 8, G], crack: [cx, cy + 3]};
      break;
    }
    case 1: { // BLEP: a puddle with a floppy tip, mismatched eyes and its tongue out
      const sq = bob ? 0.8 : 0, cy = G - 4 + sq * 0.5;
      const b = P('body'); ellipse(b, cx, cy, 10 + sq, 4.2 - sq * 0.5); ellipse(b, cx - 1, cy - 3, 7, 4.5 - sq * 0.5);
      poly(b, [[cx - 3, cy - 6], [cx + 3, cy - 11 + sq], [cx + 6, cy - 9 + sq], [cx + 2, cy - 5]]);
      const sh = P('belly'); px(sh, cx - 6, cy - 4); px(sh, cx - 7, cy - 3); px(sh, cx - 6, cy - 3);
      const ew = P('eyeWhite'); goo(ew, cx - 3, cy - 6, 3.5, 2); goo(ew, cx + 4, cy - 5, 2.3, 1);
      mouth = {x: cx - 1, y: cy, w: 3, derp: 'blep', drool: true};
      a = {head: [cx + 4, cy - 12], side: [cx - 12, cy], hold: [cx - 12, cy + 1], rear: [cx - 11, cy], cube: [cx + 13, cy - 14], box: [cx - 11, cy - 12, cx + 11, G]};
      break;
    }
    case 2: { // CRAB: fiddler crab, one huge claw, eye stalks that disagree
      const cy = G - 8.5 - bob * 0.5;
      const legs = P('limb');
      [-10, -7, -4, 4, 7, 10].forEach((o, i) => { const s = o < 0 ? -1 : 1, up = ((i + walk) & 1) ? 1 : 0; limb(legs, cx + o, cy + 3, cx + o + s * 2, G - up, 1.1, 0.9); });
      const arm = P('limb'); chain(arm, [[cx + 9, cy - 1, 1.6], [cx + 13, cy - 4 - sway, 1.4], [cx + 15, cy - 7 - sway, 1.3]]);
      chain(arm, [[cx - 9, cy - 1, 1.1], [cx - 12, cy - 3, 0.9], [cx - 13, cy - 5, 0.8]]);
      const b = P('body'); ellipse(b, cx, cy, 11, 6);
      const bel = P('belly'); ellipse(bel, cx, cy + 3, 7.5, 2.3);
      const claw = P('body'); ellipse(claw, cx + 18, cy - 11 - sway, 5, 3.6);
      carve(claw, [[cx + 18, cy - 11 - sway], [cx + 24, cy - 14 - sway - alt], [cx + 24, cy - 10 - sway + alt]]);
      ellipse(claw, cx - 14, cy - 6, 2, 1.6); px(claw, cx - 16, cy - 8); px(claw, cx - 14, cy - 8);
      const stalk = P('limb'); limb(stalk, cx - 3, cy - 5, cx - 4, cy - 9 + bob, 1, 0.8); chain(stalk, [[cx + 3, cy - 5, 1], [cx + 5, cy - 11, 0.8], [cx + 8, cy - 14 + bob, 0.7]]);
      const ew = P('eyeWhite'); goo(ew, cx - 4, cy - 11 + bob, 3, 2); goo(ew, cx + 9, cy - 16 + bob, 2.6, 1);
      mouth = {x: cx - 2, y: cy, w: 4, derp: 'buck'};
      a = {head: [cx - 1, cy - 7], side: [cx - 15, cy], hold: [cx - 14, cy - 6], rear: [cx - 13, cy], cube: [cx - 16, cy - 22], box: [cx - 16, cy - 19, cx + 23, G]};
      break;
    }
    case 3: { // POTATO: lumpy body, one floppy ear, noodle arms
      const cy = G - 11.5 - bob;
      const legs = P('limb'); limb(legs, cx - 3, cy + 8, cx - 3, G - 1, 1.5); limb(legs, cx + 4, cy + 8, cx + 4, G - 1, 1.5);
      ellipse(legs, cx - 4, G - 0.5, 2.4, 1); ellipse(legs, cx + 5, G - 0.5, 2.4, 1);
      const ears = P('body'); poly(ears, [[cx - 7, cy - 6], [cx - 9, cy - 14], [cx - 3, cy - 9]]);
      chain(ears, [[cx + 6, cy - 8, 2], [cx + 11, cy - 9, 1.6], [cx + 13, cy - 6, 1.1]]);
      const b = P('body'); ellipse(b, cx, cy, 9.5, 10); ellipse(b, cx + 1.5, cy + 3, 9, 7);
      const bel = P('belly'); ellipse(bel, cx + 1, cy + 4, 5.5, 4);
      const spot = P('limb'); px(spot, cx + 7, cy + 1); px(spot, cx + 6, cy + 2); px(spot, cx - 6, cy + 6);
      const arms = P('limb'); chain(arms, [[cx - 9, cy + 1, 1], [cx - 14, cy - 2 - sway * 3, 0.8], [cx - 15, cy - 6 - sway * 3, 0.7]]);
      chain(arms, [[cx + 10, cy + 2, 1], [cx + 13, cy + 6, 0.8], [cx + 12, cy + 9, 0.7]]);
      const ew = P('eyeWhite'); goo(ew, cx - 3, cy - 3, 3.4, 2); goo(ew, cx + 4, cy - 2, 2.6, 1);
      mouth = {x: cx - 1, y: cy + 3, w: 3, derp: 'buck'};
      a = {head: [cx - 1, cy - 11], side: [cx - 16, cy + 3], hold: [cx - 15, cy - 6 - sway * 3], rear: [cx - 10, cy], cube: [cx + 18, cy - 22], box: [cx - 16, cy - 14, cx + 14, G]};
      break;
    }
    case 4: { // DERPASAUR: giant head, frog eyes, tiny arms, mouth hanging open
      const y0 = -bob;
      const tail = P('limb'); chain(tail, [[cx - 6, G - 7 + y0, 3], [cx - 13, G - 4, 2], [cx - 17, G - 3 - sway, 1]]);
      const legs = P('limb'); limb(legs, cx - 4, G - 8 + y0, cx - 4, G - 1, 2.6); limb(legs, cx + 3, G - 8 + y0, cx + 4, G - 1, 2.6);
      ellipse(legs, cx - 5, G - 0.5, 3.4, 1.3); ellipse(legs, cx + 5, G - 0.5, 3.4, 1.3);
      const b = P('body'); ellipse(b, cx - 1, G - 11 + y0, 8, 7.5);
      const bel = P('belly'); ellipse(bel, cx + 1, G - 10 + y0, 5, 5);
      const head = P('body'); ellipse(head, cx + 3, G - 23 + y0, 10, 7); ellipse(head, cx + 10, G - 20 + y0, 5, 4);
      const sp = P('horn'); poly(sp, [[cx - 6, G - 25 + y0], [cx - 7, G - 30 + y0], [cx - 3, G - 28 + y0]]); poly(sp, [[cx - 3, G - 29 + y0], [cx - 1, G - 32 + y0], [cx, G - 29 + y0]]);
      const arm = P('limb'); limb(arm, cx + 5, G - 14 + y0, cx + 8, G - 13 + y0 - sway, 1, 0.8);
      const ew = P('eyeWhite'); goo(ew, cx + 1, G - 30 + y0, 3.4, 2); goo(ew, cx + 8, G - 29 + y0, 2.6, 1);
      mouth = {x: cx + 7, y: G - 20 + y0, w: 6, h: 2, derp: 'open'};
      a = {head: [cx + 4, G - 34 + y0], side: [cx - 12, G - 13], hold: [cx + 9, G - 13 + y0 - sway], rear: [cx - 17, G - 5], cube: [cx - 15, G - 34], box: [cx - 18, G - 33, cx + 15, G]};
      break;
    }
    case 5: { // SAUSAGE: dachshund on tiny legs, ear and tongue flapping
      const y0 = -bob;
      const tail = P('limb'); chain(tail, [[cx - 17, G - 9 + y0, 1.4], [cx - 20, G - 12 + (alt ? -2 : 1), 1.1], [cx - 22, G - 14 + (alt ? -4 : 2), 0.8]]);
      const far = P('far'); limb(far, cx - 11, G - 5 + y0, cx - 11 + walk, G - 1, 1.3); limb(far, cx + 5, G - 5 + y0, cx + 5 - walk, G - 1, 1.3);
      const b = P('body'); limb(b, cx - 14, G - 8 + y0, cx + 7, G - 8 + y0, 4.2, 4.4);
      const bel = P('belly'); limb(bel, cx - 11, G - 5 + y0, cx + 5, G - 5 + y0, 1.4);
      const legs = P('limb'); limb(legs, cx - 14, G - 5 + y0, cx - 14 - walk, G - 1, 1.4); limb(legs, cx + 8, G - 5 + y0, cx + 8 + walk, G - 1, 1.4);
      const neck = P('body'); limb(neck, cx + 7, G - 9 + y0, cx + 11, G - 12 + y0, 3.6, 3.4);
      const head = P('body'); ellipse(head, cx + 13, G - 14 + y0, 5.5, 4.6); ellipse(head, cx + 18, G - 12 + y0, 3.6, 2.4);
      const ear = P('limb'); chain(ear, [[cx + 11, G - 17 + y0, 1.8], [cx + 9, G - 13 + y0, 1.6], [cx + 8 - walk, G - 9 + y0 + walk, 1.2]]);
      const ew = P('eyeWhite'); goo(ew, cx + 13, G - 18 + y0, 2.8, 2); goo(ew, cx + 18, G - 16 + y0, 2.1, 1);
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
      const b = P('body'); chain(b, path); limb(b, hx0, hy0, hx - 1, hy + 2, 1.8, 2.4);
      const bel = P('belly'); for (let i = 3; i < N - 1; i += 3) px(bel, path[i][0], path[i][1] + 1);
      const head = P('body'); ellipse(head, hx, hy, 6.5, 5.5);
      const ew = P('eyeWhite'); goo(ew, hx - 2, hy - 4, 3, 2); goo(ew, hx + 4, hy - 3, 2.6, 2);
      mouth = {x: hx + 1, y: hy + 2, w: 4, derp: 'blep', fork: true};
      a = {head: [hx + 1, hy - 8], side: [path[8][0], path[8][1] - 3], hold: [hx + 8, hy + 2], rear: [path[1][0], path[1][1]], cube: [54, 30], box: [5, hy - 8, hx + 8, G]};
      break;
    }
    case 7: { // GREMLIN: pot belly, huge ears, one bent horn, wings far too small
      const y0 = -bob, fl = flap;
      const wing = P('membrane');
      for (const s of [-1, 1]) poly(wing, [[cx + s * 6, G - 19 + y0], [cx + s * 11, G - 24 - fl * 3 + y0], [cx + s * 13, G - 20 - fl + y0], [cx + s * 9, G - 16 + y0]]);
      const tail = P('limb'); chain(tail, [[cx + 5, G - 6 + y0, 1.2], [cx + 11, G - 3, 1], [cx + 14, G - 8 - sway, 0.7]]);
      const tip = P('horn'); poly(tip, [[cx + 13, G - 8 - sway], [cx + 15, G - 12 - sway], [cx + 17, G - 8 - sway]]);
      const legs = P('limb'); limb(legs, cx - 3, G - 7 + y0, cx - 4, G - 1, 1.8); limb(legs, cx + 3, G - 7 + y0, cx + 4, G - 1, 1.8);
      ellipse(legs, cx - 5, G - 0.5, 2.6, 1.1); ellipse(legs, cx + 5, G - 0.5, 2.6, 1.1);
      const b = P('body'); ellipse(b, cx, G - 12 + y0, 8.5, 7.5);
      const bel = P('belly'); ellipse(bel, cx, G - 10.5 + y0, 6, 5);
      const navel = P('limb'); px(navel, cx, G - 9 + y0);
      const arms = P('limb'); limb(arms, cx - 7, G - 15 + y0, cx - 10, G - 11 + y0 - sway * 3, 1.3, 1); limb(arms, cx + 7, G - 15 + y0, cx + 10, G - 11 + y0, 1.3, 1);
      const head = P('body'); ellipse(head, cx, G - 24 + y0, 7.5, 6.5);
      for (const s of [-1, 1]) poly(head, [[cx + s * 6, G - 27 + y0], [cx + s * 13, G - 29 + y0 + (s > 0 ? alt : 0)], [cx + s * 6, G - 22 + y0]]);
      const horns = P('horn'); chain(horns, [[cx - 3, G - 30 + y0, 1.3], [cx - 4, G - 34 + y0, 0.6]]); chain(horns, [[cx + 3, G - 30 + y0, 1.3], [cx + 5, G - 32 + y0, 1], [cx + 7, G - 31 + y0, 0.6]]);
      px(horns, cx - 11, G - 11 + y0 - sway * 3); px(horns, cx + 11, G - 11 + y0);
      const ew = P('eyeWhite'); goo(ew, cx - 3, G - 25 + y0, 3.2, 2); goo(ew, cx + 3.5, G - 26 + y0, 2.5, 1);
      mouth = {x: cx - 2, y: G - 21 + y0, w: 4, derp: 'under'};
      a = {head: [cx, G - 35 + y0], side: [cx - 15, G - 12], hold: [cx - 11, G - 11 + y0 - sway * 3], rear: [cx + 15, G - 8], cube: [cx + 18, G - 30], box: [cx - 14, G - 35, cx + 17, G]};
      break;
    }
    case 8: { // LONG BOI: fat wyvern, giraffe neck, tiny head, stubby wing
      const y0 = -bob, fl = flap, nx = sway;
      const tail = P('limb'); chain(tail, [[cx - 17, G - 10 + y0, 2.6], [cx - 24, G - 8, 1.6], [cx - 28, G - 12 - sway, 1]]);
      const far = P('far'); limb(far, cx - 10, G - 6 + y0, cx - 10 + walk, G - 1, 1.8); limb(far, cx + 1, G - 6 + y0, cx + 1 - walk, G - 1, 1.8);
      const b = P('body'); ellipse(b, cx - 6, G - 10 + y0, 12, 6.5);
      const bel = P('belly'); ellipse(bel, cx - 5, G - 7 + y0, 9, 2.4);
      const wing = P('membrane'); poly(wing, [[cx - 7, G - 15 + y0], [cx - 10, G - 23 - fl * 3 + y0], [cx - 13, G - 19 - fl + y0], [cx - 15, G - 20 - fl * 2 + y0], [cx - 14, G - 15 + y0]]);
      const bones = P('limb'); limb(bones, cx - 7, G - 15 + y0, cx - 10, G - 23 - fl * 3 + y0, 0.7, 0.5);
      const legs = P('limb'); limb(legs, cx - 13, G - 6 + y0, cx - 13 - walk, G - 1, 2); limb(legs, cx + 3, G - 6 + y0, cx + 3 + walk, G - 1, 2);
      const neck = P('body'); chain(neck, [[cx + 3, G - 12 + y0, 3], [cx + 5, G - 19 + y0, 2.2], [cx + 7 + nx, G - 25 + y0, 1.8], [cx + 9 + nx, G - 29 + y0, 1.7]]);
      const head = P('body'); ellipse(head, cx + 11 + nx, G - 31 + y0, 4, 3); ellipse(head, cx + 15 + nx, G - 30 + y0, 2.6, 1.8);
      const ew = P('eyeWhite'); goo(ew, cx + 10 + nx, G - 35 + y0, 2.6, 2); goo(ew, cx + 15 + nx, G - 34 + y0, 2, 1);
      mouth = {x: cx + 15 + nx, y: G - 29 + y0, w: 3, derp: 'blep'};
      a = {head: [cx + 12 + nx, G - 38 + y0], side: [cx - 6, G - 11 + y0], hold: [cx + 19 + nx, G - 29 + y0], rear: [cx - 28, G - 11], cube: [cx + 22, G - 14], box: [cx - 29, G - 37, cx + 19, G]};
      break;
    }
    case 9: { // CHONK: a round dragon with toy wings, smoke from the nose
      const y0 = -bob, fl = flap;
      const wing = P('membrane');
      for (const s of [-1, 1]) poly(wing, [[cx + s * 10, G - 22 + y0], [cx + s * 17, G - 31 - fl * 2], [cx + s * 20, G - 26 - fl], [cx + s * 16, G - 20]]);
      const tail = P('limb'); chain(tail, [[cx + 11, G - 3, 2.2], [cx + 18, G - 2, 1.6], [cx + 22, G - 6 - sway, 1]]);
      const feet = P('limb'); ellipse(feet, cx - 8, G - 1, 3.6, 1.6); ellipse(feet, cx + 8, G - 1, 3.6, 1.6);
      const b = P('body'); ellipse(b, cx, G - 13 + y0, 14, 12.5);
      const bel = P('belly'); ellipse(bel, cx, G - 11 + y0, 9, 9);
      const arms = P('limb'); limb(arms, cx - 11, G - 17 + y0, cx - 13, G - 12 + y0 - sway * 2, 1.6, 1.2); limb(arms, cx + 11, G - 17 + y0, cx + 13, G - 12 + y0, 1.6, 1.2);
      const claws = P('horn'); [-10, -7, 7, 10].forEach(o => px(claws, cx + o, G - 1));
      const horns = P('horn'); chain(horns, [[cx - 4, G - 31 + y0, 1.4], [cx - 5, G - 35 + y0, 0.6]]); chain(horns, [[cx + 4, G - 31 + y0, 1.4], [cx + 6, G - 33 + y0, 0.9], [cx + 8, G - 32 + y0, 0.5]]);
      const head = P('body'); ellipse(head, cx, G - 27 + y0, 7.5, 5.5); ellipse(head, cx, G - 24 + y0, 4.5, 2.6);
      const ew = P('eyeWhite'); goo(ew, cx - 4, G - 29 + y0, 3.2, 2); goo(ew, cx + 4, G - 30 + y0, 2.7, 2);
      mouth = {x: cx - 2, y: G - 23 + y0, w: 4, derp: 'buck'};
      a = {head: [cx, G - 35 + y0], side: [cx - 18, G - 10], hold: [cx - 14, G - 12 + y0 - sway * 2], rear: [cx - 17, G - 6], cube: [cx + 25, G - 38], box: [cx - 21, G - 35, cx + 23, G], plates: true, snot: [cx + 2, G - 25 + y0]};
      break;
    }
    case 10: { // BIG EYE: ascended into one floating eyeball with tiny wings and dangling legs
      const fy = Math.round(Math.sin(mo.phase * 0.7) * 1.4), y = G - 20 + fy;
      const wing = P('membrane');
      for (const s of [-1, 1]) for (let i = 0; i < 2; i++) limb(wing, cx + s * 8, y - 3 + i * 2, cx + s * (14 - i * 2), y - 8 - flap * 2 + i * 3, 1, 0.5);
      const halo = P('horn'); ring(halo, cx + (alt ? 2 : 1), y - 17 + (alt ? 1 : 0), 6, 1.8, 1);
      const legs = P('limb'); limb(legs, cx - 3, y + 11, cx - 4 + alt, y + 16, 0.8); limb(legs, cx + 3, y + 11, cx + 4 - alt, y + 16, 0.8);
      const b = P('body'); poly(b, [[cx, y - 13], [cx + 10, y], [cx, y + 13], [cx - 10, y]]);
      const ew = P('eyeWhite'); ellipse(ew, cx, y - 1, 5.2, 4.6); eyes.push({x: cx, y: y - 1, r: 4.6, rx: 5.2, g: true, p: 3});
      mouth = {x: cx - 1, y: y + 6, w: 3, derp: 'buck'};
      a = {head: [cx + 1, y - 20], side: [cx - 18, y + 4], hold: [cx - 15, y + 4], rear: [cx, y + 17], cube: [cx + 22, 6], box: [cx - 15, y - 20, cx + 15, y + 16], float: true};
      break;
    }
  }
  return {parts, eyes, mouth, a};
}

// Returns Map(index -> color) for frame f. opts: {screen, reduced}
function build(D, f, opts) {
  opts = opts || {};
  const T = themeOf(opts.theme);
  if (T) return buildSprite(D, f, opts, T);
  const screen = opts.screen || '#080A0E', motion = !opts.reduced;
  const buf = new Map();
  const put = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < GW && y < GH) buf.set(K(x, y), c); };
  const sprite = (rows, x0, y0, colors) => rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const c = colors[row[i]]; if (c) put(x0 + i, y0 + j, c); } });
  const st = Math.min(D.stage, MAX_STAGE), aff = D.affinity, has = D.count > 0, mut = D.mutations || {};
  const derp = opts.theme === 'derp';
  const sleeping = has && st > 0 && D.energy < 20;
  let body = PET[aff || 'none'];
  if (mut.shiny) body = mix(body, C.gold, 0.35);
  if (D.sick) body = mix(body, C.sick, D.critical ? 0.6 : 0.4);
  const eye = screen;

  if (st === 0 && !derp) {
    const w = (f % 48) - 43, wob = motion && has && w > 0 ? [0, 1, -1, 1, 0][w] : 0;
    const cx = 32 + wob, cy = G - 10 + 0.5;
    for (let x = 24; x <= 40; x++) put(x, G + 1, mix(body, screen, 0.8));
    const m = new Set();
    for (let y = Math.floor(cy - 10); y <= Math.ceil(cy + 10); y++) for (let x = cx - 9; x <= cx + 9; x++) {
      const dy = (y - cy) / 10, rx = 8 * (dy < 0 ? 1 - 0.25 * dy * dy : 1), dx = (x - cx) / rx;
      if (dx * dx + dy * dy <= 1) px(m, x, y);
    }
    paint(put, m, body, screen, (x, y) => ((x * 7 + y * 13) % 11 === 0 ? mix(body, screen, 0.42) : null));
    const p = clamp(D.xp / STAGES[1].xp, 0, 1);
    if (has && p > 0) {
      const path = [[-7, 0], [-6, 1], [-5, 0], [-4, 1], [-3, 2], [-2, 1], [-1, 0], [0, 1], [1, 2], [2, 1], [3, 0], [4, 1], [5, 0], [6, 1], [7, 0]];
      const n = Math.ceil(p * path.length);
      for (let i = 0; i < n; i++) put(cx + path[i][0], Math.round(cy) - 2 + path[i][1], eye);
    }
    return buf;
  }

  const mo = {
    bob: motion && !sleeping && !D.critical ? ((f >> 2) & 1) : 0,
    walk: motion && !sleeping ? ((f >> 2) & 1) : 0,
    flap: motion && !sleeping ? ((f >> 2) & 1) : 0,
    sway: motion && !sleeping ? ((f >> 3) & 1) : 0,
    alt: motion ? ((f >> 1) & 1) : 0,
    phase: motion ? f * 0.4 : 0,
    has,
  };
  const form = st >= FORM_STAGE ? D.form : null;
  const pl = derp ? derpPlans(st, f, mo) : plans(st, f, mo), A = pl.a;
  const pal = {
    body, limb: mix(body, screen, 0.16), far: mix(body, screen, 0.42), belly: mix(body, '#ffffff', 0.38),
    membrane: mix(body, screen, 0.5), horn: mix(C.horn, body, 0.18), core: '#FFFFFF', eyeWhite: C.eyeWhite,
  };

  // backdrop accessories
  if (form === 'owl') sprite(['.###.', '##...', '#....', '#....', '##...', '.###.'], 3, 6, {'#': C.moon});
  if (form === 'shipper' && !A.float) {
    const x0 = Math.max(0, Math.round(A.box[0] - 10)), y0 = G - 5;
    sprite(['bbbbbbb', 'bhbbbhb', 'bbhbhbb', 'bbbhbbb', 'bbhbhbb', 'bhbbbhb'], x0, y0, {b: C.wood, h: C.woodDark});
    for (let y = y0 - 6; y < y0; y++) put(x0 + 6, y, C.steel);
    const wv = mo.alt;
    sprite(['ff.', 'fff', 'ff.'].map(r => r), x0 + 7, y0 - 6 + wv, {f: body});
  }
  if (form === 'streaker') {
    const [rx, ry] = A.rear, fr = mo.alt;
    const flame = fr ? ['..y..', '.yoy.', 'oyyyo', 'oryro', '.rrr.'] : ['.y...', '.yo..', 'oyyo.', 'oryro', '.rrr.'];
    sprite(flame, rx - 6, ry - 3, {r: C.red, o: C.orange, y: C.yellow});
    for (let i = 0; i < 3 + mo.walk; i++) { put(rx - 8 - i, ry + 3, mix(body, screen, 0.4)); put(rx - 7 - i, ry - 3, mix(body, screen, 0.55)); }
  }

  // shadow
  if (!A.float) { const [x0, , x1] = A.box; for (let x = Math.round(x0 + (x1 - x0) * 0.2); x <= Math.round(x1 - (x1 - x0) * 0.2); x++) put(x, G + 1, mix(body, screen, 0.82)); }
  else { const cy = A.rear[1] + 3; for (let i = 0; i < 4; i++) if (((f >> 1) + i) % 4 !== 0) put(32 + (i - 1.5) * 3, Math.min(GH - 4, cy + ((f + i * 3) % 6)), mix(body, screen, 0.5)); }

  // body parts
  const stripes = form === 'polyglot' && D.srcs30 && D.srcs30.length > 1
    ? (x, y) => mix(PET[D.srcs30[Math.floor(y / 3) % D.srcs30.length]] || body, body, 0.35) : null;
  const sheen = aff === 'unreal' && st >= CREST_STAGE ? (x, y) => ((((x - y + (motion ? f * 2 : 0)) % 17) + 17) % 17 < 2 ? mix(body, '#ffffff', 0.4) : null) : null;
  for (const part of pl.parts) {
    const base = pal[part.role] || body;
    const extra = part.role === 'body' ? (x, y) => (sheen && sheen(x, y)) || (stripes && stripes(x, y)) || null : null;
    paint(put, part.m, base, screen, extra, part.role === 'core');
  }
  if (A.plates) { const [hx] = A.head; for (let y = G - 18; y <= G - 5; y += 3) for (let x = hx - 4; x <= hx + 4; x++) if (buf.get(K(x, y)) === pal.belly) put(x, y, mix(pal.belly, screen, 0.3)); }

  // googly eyes and derp mouths (Derpy theme)
  function googly(e, i, pc) {
    const rx = e.rx || e.r, ry = e.r, ex = e.x, ey = e.y, lid = pal.limb;
    const each = fn => { for (let y = Math.floor(ey - ry); y <= Math.ceil(ey + ry); y++) for (let x = Math.floor(ex - rx); x <= Math.ceil(ex + rx); x++) { const dx = (x - ex) / rx, dy = (y - ey) / ry; if (dx * dx + dy * dy <= 1.02) fn(x, y); } };
    if (sleeping || (st === 0 && !has) || (blink && form !== 'owl')) { each((x, y) => put(x, y, y === Math.round(ey) ? eye : lid)); return; }
    // pupils wander on their own: wall-eyed, up, cross-eyed, one up one down; a lone eye rolls around
    let [dx, dy] = pl.eyes.length === 1 ? [[-1, 0], [0, -1], [1, 0], [0, 1]][look] : [[[-1, 0], [1, 0]], [[1, -1], [1, -1]], [[1, 0], [-1, 0]], [[0, 1], [-1, -1]]][look][i % 2];
    if (D.critical) { dx = 0; dy = 1; }
    const p = e.p || 1, k = Math.max(0, Math.floor(Math.min(rx, ry) - p / 2 - 0.2));
    const x0 = Math.round(ex + dx * k - (p - 1) / 2), y0 = Math.round(ey + dy * k - (p - 1) / 2);
    for (let u = 0; u < p; u++) for (let v = 0; v < p; v++) put(x0 + u, y0 + v, pc);
    if (form === 'owl') put(x0 + p - 1, y0 + p - 1, C.yellow);
    else if (happy && p >= 2) put(x0, y0, '#FFFFFF');
    if (D.critical) { each((x, y) => { if (y < Math.round(ey)) put(x, y, lid); }); if (i === 0) put(ex - rx + 1, ey + ry + 1, C.drop); }
    else if (tired) for (let x = Math.round(ex - rx + 1); x <= Math.round(ex + rx - 1); x++) put(x, Math.round(ey + ry) + 1, mix(body, screen, 0.45));
  }
  function derpMouth(M) {
    const x = Math.round(M.x), y = Math.round(M.y), w = M.w, tooth = '#FFFFFF';
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

  // face
  const blink = motion && ((f % 41) < 1 || (f % 113) === 60);
  const happy = D.mood >= 70 && !sleeping && !D.sick, tired = has && D.rest < 50;
  const look = motion ? (f >> 2) & 3 : 0;
  if (pl.eyes.some(e => e.g)) {
    const rim = mix(body, screen, 0.62);
    for (const e of pl.eyes) if (e.g) {
      const rx = e.rx || e.r, ry = e.r;
      for (let y = Math.floor(e.y - ry - 1); y <= Math.ceil(e.y + ry + 1); y++) for (let x = Math.floor(e.x - rx - 1); x <= Math.ceil(e.x + rx + 1); x++) {
        const dx = (x - e.x) / rx, dy = (y - e.y) / ry, ox = (x - e.x) / (rx + 1), oy = (y - e.y) / (ry + 1);
        if (ox * ox + oy * oy <= 1.02 && dx * dx + dy * dy > 1.02) put(x, y, rim);
      }
    }
    for (const part of pl.parts) if (part.role === 'eyeWhite') paint(put, part.m, pal.eyeWhite, screen);
  }
  pl.eyes.forEach((e, i) => {
    const ec = mut.cursed && i === pl.eyes.length - 1 ? C.curse : eye;
    if (e.g) { googly(e, i, ec); return; }
    if (e.visor) {
      const vc = D.sick ? C.alarm : mut.cursed ? C.curse : '#FFFFFF';
      for (let k = 0; k < e.w; k++) put(e.x + k, e.y, (sleeping || blink) && k % 2 ? eye : vc);
      return;
    }
    if (sleeping || (blink && form !== 'owl')) { for (let k = 0; k < e.w; k++) put(e.x + k, e.y + e.h - 1, ec); }
    else if (D.critical) { for (let k = 0; k < e.w; k++) put(e.x + k, e.y + e.h - 1, ec); put(e.x, e.y + e.h, C.drop); }
    else {
      for (let k = 0; k < e.w; k++) for (let j = 0; j < e.h; j++) put(e.x + k, e.y + j, ec);
      if (form === 'owl') put(e.x + e.w - 1, e.y + e.h - 1, C.yellow);
      else if (happy && e.w >= 2) put(e.x, e.y, mix(body, '#ffffff', 0.7));
    }
    if (tired && !D.critical) for (let k = 0; k < e.w; k++) put(e.x + k, e.y + e.h, mix(body, screen, 0.45));
  });
  const M = pl.mouth;
  if (M && M.derp) derpMouth(M);
  else if (M) {
    if (aff === 'local' && st >= CREST_STAGE && !D.sick) {
      put(M.x - 1, M.y - 1, eye); put(M.x, M.y, eye); put(M.x - 1, M.y + 1, eye);
      if (!motion || mo.alt) { put(M.x + 1, M.y + 1, eye); put(M.x + 2, M.y + 1, eye); }
    } else if (sleeping) put(M.x + 1, M.y, eye);
    else if (D.sick || D.mood < 30) { put(M.x, M.y + 1, eye); put(M.x + 1, M.y, eye); put(M.x + 2, M.y + 1, eye); }
    else if (happy) { put(M.x, M.y, eye); put(M.x + 1, M.y + 1, eye); put(M.x + 2, M.y, eye); }
    else for (let k = 0; k < M.w; k++) put(M.x + k, M.y, eye);
    if (M.fangs && !sleeping) { put(M.x, M.y + 1, pal.horn); put(M.x + M.w - 1, M.y + 1, pal.horn); }
    if (M.tongue && !sleeping) { put(M.x + M.w, M.y, C.tongue); put(M.x + M.w + 1, M.y - 1, C.tongue); put(M.x + M.w + 1, M.y + 1, C.tongue); }
  }

  if (derp) {
    if (st === 0 && has) {  // crack grows toward hatching
      const p = clamp(D.xp / STAGES[1].xp, 0, 1), [kx, ky] = A.crack;
      const path = [[-6, 1], [-5, 0], [-4, 1], [-3, 2], [-2, 1], [-1, 0], [0, 1], [1, 2], [2, 1], [3, 0], [4, 1], [5, 0], [6, 1]];
      for (let i = 0; i < Math.ceil(p * path.length); i++) put(kx + path[i][0], ky + path[i][1], eye);
    }
    if (A.snot && motion) {  // a snot bubble that grows and pops
      const k = (f >> 1) % 16, [x, y] = A.snot;
      if (k < 6) {
        const r = [0.5, 1, 1.5, 2, 2.5, 3][k], bx = x + 1 + r, by = y + 1;
        if (r < 1) put(x + 1, by, C.drop);
        else { const m = new Set(); ring(m, bx, by, r, r, 1); for (const q of m) put(q % GW, (q / GW) | 0, mix(C.drop, screen, 0.15)); put(bx - r * 0.5, by - r * 0.5, '#FFFFFF'); }
      } else if (k === 6) [[-1, -1], [1, -1], [-1, 1], [1, 1], [2, 0], [-2, 0]].forEach(([dx, dy]) => put(x + 4 + dx, y + 1 + dy, mix(C.drop, screen, 0.3)));
    }
  }

  // held / worn accessories from forms
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

  // crest from the dominant source
  let [tx, ty] = A.head;
  if (mut.crowned && st >= CREST_STAGE) { sprite(['y.y.y.y', 'yyygyyy', 'yyyyyyy'], tx - 3, ty - 2, {y: C.gold, g: C.gem}); ty -= 3; }
  if (st >= CREST_STAGE) {
    const hi = mix(body, '#ffffff', 0.6), sh = mix(body, screen, 0.42), deep = mix(body, screen, 0.75);
    if (aff === 'github') {
      const L = clamp(ty - 4, 3, 6);  // shorter antenna when the head is near the top edge
      for (let i = 1; i <= L; i++) put(tx, ty - i, sh);
      for (let i = 2; i < L; i++) put(tx + Math.min(3, i - 1), ty - i - 1, sh);
      const p = motion ? ((f >> 3) & 1) : 0;
      sprite(['nn', 'nn'], tx - 0.5, ty - L - 2, {n: p ? hi : body}); sprite(['nn', 'nn'], tx + 2.5, ty - L - 2, {n: p ? body : hi});
    } else if (aff === 'gitlab') {
      put(tx, ty - 1, sh); put(tx, ty - 2, sh);
      for (let x = tx - 6; x <= tx + 6; x++) put(x, ty - 3, deep);
      const j = D.sick ? -1 : (motion ? ((f >> 2) % 4) : 3);
      [-6, 0, 6].forEach((o, k) => { const c = D.sick && k === 2 ? C.alarm : k < j ? body : k === j ? hi : sh; sprite(['cc', 'cc'], tx + o - 0.5, ty - 4.5, {c}); });
    } else if (aff === 'local') {
      put(tx, ty - 1, sh); put(tx, ty - 2, sh); put(tx, ty - 3, (!motion || mo.alt) ? hi : sh);
    } else if (aff === 'unity') {
      const [ux, uy] = A.cube, cb = motion ? ((f >> 2) & 1) : 0;
      sprite(['...hhh...', '.hhhhhhh.', 'hhhhhhhhh', 'bbhhhhhss', 'bbbbhssss', 'bbbbbssss', 'bbbbbssss', '.bbbbsss.', '...bbs...'], ux - 4, uy + cb, {h: hi, b: body, s: sh});
    } else if (aff === 'unreal') {
      const [x0, y0, x1, y1] = A.box;
      const sp = [[x0 - 1, y0 + 3], [x1 + 1, y0 + 8], [tx + 3, ty - 3], [x0 + 1, y1 - 6], [x1 - 2, y1 - 3]];
      const [sx, sy] = sp[motion ? ((f >> 2) % sp.length) : 0];
      put(sx, sy, hi); put(sx - 1, sy, sh); put(sx + 1, sy, sh); put(sx, sy - 1, sh); put(sx, sy + 1, sh);
    }
  }

  // final-stage extras
  if (st >= 9) {
    const [x0, y0, x1] = A.box, cx = (x0 + x1) / 2, cy = (y0 + G) / 2;
    for (let k = 0; k < 4; k++) {
      const ang = (motion ? f * 0.11 : 0.6) + k * Math.PI / 2;
      const ox = Math.round(cx + ((x1 - x0) / 2 + 2) * Math.cos(ang)), oy = Math.round(cy + 4 * Math.sin(ang));
      if (Math.sin(ang) < 0 && buf.has(K(ox, oy))) continue;
      put(ox, oy, st === 10 ? '#FFFFFF' : mix(body, '#ffffff', 0.6));
    }
  }
  if (mut.shiny && motion) {
    const [x0, y0, x1, y1] = A.box;
    const sp = [[x0 + 2, y0 + 2], [x1 - 1, y0 + 6], [(x0 + x1) / 2, y0 - 1], [x1 - 3, y1 - 4], [x0 + 3, y1 - 8]];
    const [sx, sy] = sp[(f >> 1) % sp.length];
    put(sx, sy, C.spark); put(sx - 1, sy, mix(C.spark, screen, 0.5)); put(sx + 1, sy, mix(C.spark, screen, 0.5)); put(sx, sy - 1, mix(C.spark, screen, 0.5)); put(sx, sy + 1, mix(C.spark, screen, 0.5));
  }
  // sick: sweat drop, alarm mark, coughs when critical
  if (D.sick) {
    const [hx, hy] = A.head;
    if (!motion || mo.walk) { put(hx + 6, hy + 3, C.drop); put(hx + 6, hy + 4, C.drop); put(hx + 5, hy + 5, C.drop); }
    const mx = Math.min(GW - 2, Math.round(A.box[2]) + 2), my = Math.max(2, Math.round(A.box[1]));
    if (!motion || mo.alt) { for (let j = 0; j < 4; j++) put(mx, my + j, C.alarm); put(mx, my + 5, C.alarm); }
    if (D.critical && motion && M && (f % 8) < 3) { const k = f % 8, cx2 = M.x + M.w + 2 + k * 2, cy2 = M.y - k; put(cx2, cy2, C.steel); put(cx2 + 1, cy2, C.steel); put(cx2, cy2 - 1, C.steel); }
  }
  if (sleeping) {
    const [hx, hy] = A.head, k = motion ? ((f >> 3) % 3) : 1;
    sprite(['####', '..#.', '.#..', '####'], hx + 6 + k * 2, hy - 4 - k * 3, {'#': k === 2 ? mix(body, screen, 0.4) : mix(body, '#ffffff', 0.6)});
  }
  return buf;
}
// Sprite themes: pre-drawn frames, recolored for the affinity, with status overlays on top.
function buildSprite(D, f, opts, T) {
  const screen = opts.screen || T.screen || '#080A0E', motion = !opts.reduced;
  const buf = new Map();
  const put = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < GW && y < GH) buf.set(K(x, y), c); };
  const sprite = (rows, x0, y0, colors) => rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const c = colors[row[i]]; if (c) put(x0 + i, y0 + j, c); } });
  const st = Math.min(D.stage, MAX_STAGE), has = D.count > 0, mut = D.mutations || {};
  const sleeping = has && st > 0 && D.energy < 20;
  const pal = T.palettes[D.affinity] || T.palettes[T.default] || T.palettes[Object.keys(T.palettes)[0]];
  const tinted = pal.map(c => {
    let x = c;
    if (mut.shiny) x = mix(x, C.gold, 0.2);
    if (D.sick) x = mix(x, C.sick, D.critical ? 0.55 : 0.35);
    if (sleeping) x = mix(x, screen, 0.25);
    return x;
  });
  const fr = T.stages[st][(!motion || sleeping) ? 0 : ((f >> 1) % T.frames)], r = fr.r;
  for (let i = 0; i < r.length; i += 4) for (let k = 0; k < r[i + 2]; k++) put(r[i + 1] + k, r[i], tinted[r[i + 3]]);
  const [x0, y0, x1, y1] = fr.box, cx = Math.round((x0 + x1) / 2), cy = Math.round((y0 + y1) / 2), alt = motion ? (f >> 1) & 1 : 0;
  const form = st >= FORM_STAGE ? D.form : null, body = PET[D.affinity] || PET.none;
  // form accessories sit beside the sprite so they never cover the drawing
  const L = Math.max(1, x0 - 9), R = Math.min(GW - 8, x1 + 2);
  if (form === 'owl') sprite(['.###.', '##...', '#....', '#....', '##...', '.###.'], 3, 3, {'#': C.moon});
  if (form === 'guardian') sprite(['sssssss', 'swww+ws', 'sw+++ws', 'sww+wws', '.sw+ws.', '..sws..', '...s...'], R, cy - 2, {s: C.steel, w: C.steelDark, '+': C.white});
  if (form === 'debugger') sprite(['.s.s', '.sss', '..s.', '.s..', 's...'], R + 1, cy - 2 + alt, {s: C.steel});
  if (form === 'shipper') {
    const bx = L, by = Math.min(GH - 7, y1 - 5);
    sprite(['bbbbbbb', 'bhbbbhb', 'bbhbhbb', 'bbbhbbb', 'bbhbhbb', 'bhbbbhb'], bx, by, {b: C.wood, h: C.woodDark});
    for (let y = by - 6; y < by; y++) put(bx + 6, y, C.steel);
    sprite(['ff.', 'fff', 'ff.'], bx + 7, by - 6 + alt, {f: body});
  }
  if (form === 'streaker') sprite(alt ? ['..y..', '.yoy.', 'oyyyo', 'oryro', '.rrr.'] : ['.y...', '.yo..', 'oyyo.', 'oryro', '.rrr.'], L + 2, Math.min(GH - 6, y1 - 4), {r: C.red, o: C.orange, y: C.yellow});
  if (form === 'polyglot' && D.srcs30) D.srcs30.slice(0, 5).forEach((src, i) => sprite(['##', '##'], L + 4, y0 + 2 + i * 3, {'#': PET[src] || body}));
  if (form === 'vibe') {
    const nt = motion ? (f >> 1) % 8 : 2;
    sprite(['.##', '.#.', '##.'], R + 1 + (nt >> 2), Math.max(0, cy - nt), {'#': C.note});
    if (nt > 3) sprite(['#', '#', '#'], L + 5, Math.max(0, cy + 4 - nt), {'#': mix(C.note, body, 0.4)});
  }
  if (mut.cursed) sprite(alt ? ['.r.', 'rrr', '.r.'] : ['r.r', '.r.', 'r.r'], L + 3, Math.max(0, y0), {r: C.curse});
  if (mut.crowned && st >= CREST_STAGE) sprite(['y.y.y.y', 'yyygyyy', 'yyyyyyy'], cx - 3, Math.max(0, y0 - 4), {y: C.gold, g: C.gem});
  if (mut.shiny && motion) {
    const sp = [[x0 + 1, y0 + 4], [x1 - 1, y0 + 2], [cx, y0 - 2], [x1 - 2, G - 4], [x0 + 2, G - 8]];
    const [sx, sy] = sp[(f >> 1) % sp.length];
    put(sx, sy, C.spark); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => put(sx + dx, sy + dy, mix(C.spark, screen, 0.5)));
  }
  if (D.sick) {
    const mx = Math.min(GW - 2, x1 + 2), my = Math.max(2, y0);
    if (!motion || ((f >> 1) & 1)) { for (let j = 0; j < 4; j++) put(mx, my + j, C.alarm); put(mx, my + 5, C.alarm); }
    if (!motion || ((f >> 2) & 1)) { put(x1 - 2, y0 + 4, C.drop); put(x1 - 2, y0 + 5, C.drop); put(x1 - 3, y0 + 6, C.drop); }
  }
  if (sleeping) {
    const k = motion ? ((f >> 3) % 3) : 1;
    sprite(['####', '..#.', '.#..', '####'], Math.min(GW - 5, x1 - 3 + k * 2), Math.max(0, y0 - 4 - k * 3), {'#': k === 2 ? mix('#ffffff', screen, 0.5) : '#E8ECF4'});
  }
  return buf;
}

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

/* ---------- animated SVG card (for a README) ---------- */
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

const PetCore = {
  DAY, HOUR, SOURCES, SRC, STAGES, MAX_STAGE, CREST_STAGE, FORM_STAGE, FORMS, MUTATIONS, PET, FIX_XP, DAY_SOFT_CAP, GW, GH,
  clamp, dayIdx, sessionXP, baseXP, mult, valid, mix, derive, gainFor, traitAt, statusLine,
  SESSION_GAP, sessionStart, rescanFrom,
  detectKind, toSessions, ciFromRollup, ciFromPipeline, updateCI, Q_REPO, Q_HIST, scanGitHubRepo,
  build, renderSVG, THEMES, THEME_LIST, registerTheme, hasTheme, stageBody, themeColors,
};
root.PetCore = PetCore;
if (typeof module !== 'undefined' && module.exports) module.exports = PetCore;
})(typeof globalThis !== 'undefined' ? globalThis : this);
