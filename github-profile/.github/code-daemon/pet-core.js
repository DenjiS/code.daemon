/*
  code.daemon pet engine. Shared by the desktop widget (ui/widget.html) and the
  GitHub profile Action (render.cjs). No dependencies; works in a browser and in Node.

  - XP and stages, replayed in time order
  - branching forms, locked at the moment each evolution happens
  - rare mutations from your whole history
  - build health from CI results, with a bonus when you fix a red build
  - the 40 x 30 pixel pet, and an animated SVG card for a README
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
  {name: 'EGG', xp: 0}, {name: 'BIT', xp: 60}, {name: 'BYTE', xp: 200},
  {name: 'PROCESS', xp: 500}, {name: 'DAEMON', xp: 1100}, {name: 'KERNEL', xp: 2400},
];
const FORMS = {
  core:     {name: 'Core',      rule: 'Balanced habits'},
  guardian: {name: 'Guardian',  rule: 'Tests in 30%+ of sessions: carries a shield'},
  debugger: {name: 'Debugger',  rule: 'Bug fixes in 35%+ of sessions: holds a wrench'},
  owl:      {name: 'Night Owl', rule: '25%+ of sessions end 23:00-05:00: ear tufts, glowing eyes, a moon'},
  shipper:  {name: 'Shipper',   rule: '3+ shipped sessions in 30 days: keeps a crate with a flag'},
  streaker: {name: 'Streaker',  rule: '7+ day streak when it evolved: trails fire'},
  polyglot: {name: 'Polyglot',  rule: '4+ sources in 30 days: striped in their colors'},
};
const MUTATIONS = {
  shiny:   {name: 'Shiny',   rule: 'Coded 30 days in a row at some point'},
  cursed:  {name: 'Cursed',  rule: 'Coded on a Friday the 13th'},
  crowned: {name: 'Crowned', rule: '1000 commits'},
};
const GEOM = [null, {rx: 4.5, ry: 3.5}, {rx: 6.5, ry: 5}, {rx: 7.5, ry: 6}, {rx: 9, ry: 7}, {rx: 10.5, ry: 8}];
const PET = {github: '#8E9BFF', gitlab: '#FF9B5E', local: '#4ADBC3', unity: '#B4E15C', unreal: '#E78CF7', none: '#C7CFDA'};
const FIX_XP = 15;
const RX_BUG = /\b(fix(e[sd])?|bug(fix)?|hotfix|patch(ed)?|resolve[sd]?)\b/i;
const RX_TEST = /\b(tests?|testing|specs?|e2e)\b/i;
const RX_REL = /\b(release[sd]?|bump(ed)? version|v\d+\.\d+(\.\d+)?)\b/i;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dayIdx = ms => { const d = new Date(ms); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY); };
const baseXP = s => Math.min(s.min, 480) / 3 + Math.min(s.commits || 0, 30) * 4 + (s.tests ? 12 : 0) + (s.bug ? 10 : 0) + (s.ship ? 20 : 0);
const mult = st => 1 + 0.05 * Math.min(st, 10);
const valid = s => !!(s && SRC[s.src] && Number.isFinite(s.min) && s.min > 0 && Number.isFinite(s.at));
const isLate = ms => { const h = new Date(ms).getHours(); return h >= 23 || h < 5; };

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
  const days = new Set(), gain = {}, src30 = {}, srcAll = {}, forms = {}, seen = [];
  let xp = 0, commits = 0, maxStreak = 0, fri13 = false, stage = 0, fixes = 0;
  for (const it of items) {
    if (it.s) {
      const s = it.s, d = dayIdx(s.at);
      days.add(d);
      let st = 0; while (days.has(d - st)) st++;
      if (st > maxStreak) maxStreak = st;
      const g = Math.round(baseXP(s) * mult(st));
      gain[s.id] = g; xp += g; commits += s.commits || 0;
      srcAll[s.src] = (srcAll[s.src] || 0) + g;
      if (now - s.at < 30 * DAY) src30[s.src] = (src30[s.src] || 0) + g;
      const dt = new Date(s.at);
      if (dt.getDay() === 5 && dt.getDate() === 13) fri13 = true;
      seen.push(s);
    } else { xp += it.e.xp; gain[it.e.id] = it.e.xp; fixes++; }
    while (stage < 5 && xp >= STAGES[stage + 1].xp) { stage++; if (stage >= 3) forms[stage] = traitAt(seen, it.t); }
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
    sorted, gain, xp, commits, streak, maxStreak, codedToday: days.has(today), days, energy, mood, rest, late, variety,
    affinity, srcs30, stage, forms, form: stage >= 3 ? (forms[stage] || 'core') : null,
    mutations: {shiny: maxStreak >= 30, cursed: fri13, crowned: commits >= 1000},
    health, failing, ciTracked: tracked.length, ciPassing: tracked.filter(k => ci[k].s === 'pass').length, fixes,
    sick: failing.length > 0, critical: health < 30,
    last: sorted.length ? sorted[sorted.length - 1].at : null, count: sorted.length,
  };
}

function statusLine(D, opts) {
  opts = opts || {};
  const name = opts.label || (k => String(k || '').replace(/^g[hl]:/, ''));
  if (!D.count) return opts.empty || '> egg found. waiting for commits';
  if (D.stage === 0) return `> incubating · ${60 - D.xp} XP to hatch`;
  if (D.failing.length) return `> sick · CI failing in ${name(D.failing[0])}${D.failing.length > 1 ? ` +${D.failing.length - 1}` : ''}`;
  if (D.energy < 20) return '> asleep · feed it a commit';
  if (D.rest < 50) return `> tired · ${D.late} late night${D.late === 1 ? '' : 's'} this week`;
  if (D.streak >= 2 && !D.codedToday) return `> streak ${D.streak}d at risk · code today`;
  if (D.stage < 5) { const n = STAGES[D.stage + 1]; return `> ${n.xp - D.xp} XP to ${n.name.toLowerCase()}`; }
  return `> kernel mode · ${D.xp} XP`;
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
    if (g && c.t - g.last <= 2 * HOUR) { g.last = c.t; g.n++; g.msgs.push(c.msg); }
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
// Merges freshly observed CI results into the stored map. A red -> green change earns a "build fixed" event.
function updateCI(prev, observed, now) {
  const ci = Object.assign({}, prev || {}), events = [];
  for (const key in observed) {
    const o = observed[key], p = ci[key];
    if (!o || !o.s) { delete ci[key]; continue; }
    const wasRed = !!(p && (p.s === 'fail' || p.wasFail));
    if (o.s === 'fail') ci[key] = {s: 'fail', at: o.at || now, since: p && p.s === 'fail' ? p.since : (o.at || now)};
    else if (o.s === 'run') ci[key] = {s: 'run', at: o.at || now, wasFail: wasRed, since: wasRed && p ? p.since : undefined};
    else {
      ci[key] = {s: 'pass', at: o.at || now};
      if (wasRed) events.push({id: 'fix:' + key + ':' + (o.at || now), kind: 'fix', repo: key, at: o.at || now, xp: FIX_XP});
    }
  }
  return {ci, events};
}

/* ---------- GitHub (GraphQL) ---------- */
const Q_REPO = `query($owner:String!,$name:String!,$since:GitTimestamp!,$uid:ID!){repository(owner:$owner,name:$name){isPrivate object(expression:"HEAD:"){... on Tree{entries{name type}}} refs(refPrefix:"refs/heads/",first:20,orderBy:{field:TAG_COMMIT_DATE,direction:DESC}){nodes{target{... on Commit{committedDate statusCheckRollup{state} history(first:100,since:$since,author:{id:$uid}){nodes{oid authoredDate messageHeadline}}}}}} releases(first:10,orderBy:{field:CREATED_AT,direction:DESC}){nodes{publishedAt}}}}`;
// gql(query, variables) -> data. Returns {repo, sessions, ci} or null when you have no commits there.
async function scanGitHubRepo(gql, nameWithOwner, since, uid, overrides) {
  const parts = nameWithOwner.split('/');
  const d = await gql(Q_REPO, {owner: parts[0], name: parts[1], since: new Date(since).toISOString(), uid});
  const r = d && d.repository;
  if (!r) return null;
  const entries = ((r.object && r.object.entries) || []).map(e => ({name: e.name, dir: e.type === 'tree'}));
  const kind = detectKind(entries) || 'github';
  const seen = new Map();
  let head = null;
  for (const ref of (r.refs && r.refs.nodes) || []) {
    const t = ref && ref.target;
    if (!t) continue;
    const nodes = (t.history && t.history.nodes) || [];
    for (const c of nodes) if (!seen.has(c.oid)) seen.set(c.oid, {oid: c.oid, t: Date.parse(c.authoredDate), msg: c.messageHeadline || ''});
    const at = Date.parse(t.committedDate);
    if (nodes.length && Number.isFinite(at) && (!head || at > head.at)) head = {at, s: ciFromRollup(t.statusCheckRollup && t.statusCheckRollup.state)};
  }
  const commits = [...seen.values()].filter(c => Number.isFinite(c.t) && c.t >= since);
  if (!commits.length) return null;
  const rel = ((r.releases && r.releases.nodes) || []).map(x => Date.parse(x.publishedAt)).filter(Number.isFinite);
  const repo = {key: 'gh:' + nameWithOwner, name: nameWithOwner, prov: 'gh', kind, private: !!r.isPrivate, last: Math.max(...commits.map(c => c.t))};
  return {repo, sessions: toSessions(repo, commits, rel, overrides), ci: head && head.s ? {s: head.s, at: head.at} : null};
}

/* ---------- pixel pet (40 x 30) ---------- */
const GW = 40, GH = 30, FLOOR = 25;
const CUBE = ['..hhh..', 'hhhhhhh', 'bbhhhss', 'bbbbsss', 'bbbbsss', 'bbbbsss', '..bbs..'];
const ZG = ['####', '..#.', '.#..', '####'];
const MOON = ['.###.', '##...', '#....', '##...', '.###.'];
const SHIELD = ['sssss', 'sw+ws', 's+++s', 'sw+ws', '.sws.', '..s..'];
const CRATE = ['bbbbbb', 'bhbbhb', 'bbhhbb', 'bhbbhb', 'bbbbbb'];
const FLAME = [['.y.', '.yo', 'oyo', 'ror'], ['y..', 'oy.', 'oyo', 'ror']];
const CROWN = ['y.y.y', 'yygyy', 'yyyyy'];
const C = {steel: '#A9B8C9', steelDark: '#5C6B7C', white: '#FFFFFF', wood: '#B7834C', woodDark: '#7A5230', moon: '#E8E4C9',
  red: '#FF5A3C', orange: '#FF9B3C', yellow: '#FFE27A', gold: '#FFD24A', gem: '#FF5A7A', sick: '#8FA08A', drop: '#7FC8FF', alarm: '#FF5A5A', curse: '#FF4D4D', spark: '#FFF6C8'};

const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };

function blob(cx, cy, rx, ry, taper) {
  const pts = [];
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    const dy = (y - cy) / ry, k = 1 - dy * dy;
    if (k < 0.06) continue;
    const rr = rx * (taper && dy < 0 ? 1 - taper * dy * dy : 1) * Math.sqrt(k);
    for (let x = Math.ceil(cx - rr - 1e-4); x <= Math.floor(cx + rr + 1e-4); x++) pts.push([x, y]);
  }
  return pts;
}
function shadeBlob(pts, cx, cy, pal, put, extra) {
  const S = new Set(pts.map(([x, y]) => y * GW + x));
  const inS = (x, y) => S.has(y * GW + x);
  for (const [x, y] of pts) {
    let c = pal.body;
    if (!inS(x, y + 1) || (!inS(x + 1, y) && x > cx)) c = pal.shade;
    else if ((!inS(x, y - 1) && x <= cx) || (!inS(x - 1, y) && y < cy)) c = pal.hi;
    const e = extra && extra(x, y);
    if (e && c === pal.body) c = e;
    put(x, y, c);
  }
  return S;
}
const colTop = (S, x) => { for (let y = 0; y < GH; y++) if (S.has(y * GW + x)) return y; return FLOOR; };
function sprite(put, rows, x0, y0, colors) {
  rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const c = colors[row[i]]; if (c) put(x0 + i, y0 + j, c); } });
}

// Returns Map(index -> color) for frame f. opts: {screen, reduced}
function build(D, f, opts) {
  opts = opts || {};
  const screen = opts.screen || '#080A0E', motion = !opts.reduced;
  const buf = new Map();
  const put = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < GW && y < GH) buf.set(y * GW + x, c); };
  const st = D.stage, aff = D.affinity, has = D.count > 0, mut = D.mutations || {};
  const sleeping = has && st > 0 && D.energy < 20;
  let body = PET[aff || 'none'];
  if (mut.shiny) body = mix(body, C.gold, 0.35);
  if (D.sick) body = mix(body, C.sick, D.critical ? 0.6 : 0.4);
  const shade = mix(body, screen, 0.42), deep = mix(body, screen, 0.8), hi = mix(body, '#ffffff', 0.6), eye = screen;
  const pal = {body, shade, hi};

  if (st === 0) {
    const w = (f % 48) - 43;
    const wob = motion && has && w > 0 ? [0, 1, -1, 1, 0][w] : 0;
    const cx = 20 + wob, cy = FLOOR - 7 + 0.5;
    for (let x = 16; x <= 24; x++) put(x, FLOOR + 1, deep);
    shadeBlob(blob(cx, cy, 5.5, 7, 0.28), cx, cy, pal, put, (x, y) => ((x * 7 + y * 13) % 11 === 0 ? shade : null));
    const p = clamp(D.xp / 60, 0, 1);
    if (has && p > 0) {
      const path = [[-4, 0], [-3, 1], [-2, 0], [-1, 1], [0, 0], [1, 1], [2, 0], [3, 1], [4, 0]];
      const n = Math.ceil(p * path.length);
      for (let i = 0; i < n; i++) put(cx + path[i][0], Math.round(cy) - 1 + path[i][1], eye);
    }
    return buf;
  }

  const G = GEOM[st], feet = st >= 2, form = st >= 3 ? D.form : null;
  const cx = (aff === 'unity' && feet) ? 17 : 20;
  const bob = motion && !sleeping && !D.critical ? ((f >> 2) & 1) : 0;
  const baseCy = FLOOR - (feet ? 1 : 0) - G.ry + 0.5, cy = baseCy - bob;
  const halfAt = y => G.rx * Math.sqrt(Math.max(0, 1 - ((y - cy) / G.ry) ** 2));

  // things behind the body
  if (form === 'owl') sprite(put, MOON, 2, 4, {'#': C.moon});
  if (form === 'shipper') {
    const x0 = Math.max(0, Math.round(cx - G.rx - 9)), y0 = FLOOR - 4;
    sprite(put, CRATE, x0, y0, {b: C.wood, h: C.woodDark});
    for (let y = y0 - 4; y < y0; y++) put(x0 + 5, y, C.steel);
    const wave = motion ? ((f >> 3) & 1) : 0;
    put(x0 + 6, y0 - 4 + wave, body); put(x0 + 7, y0 - 4 + wave, body); put(x0 + 6, y0 - 3 + wave, body);
  }
  if (form === 'streaker') {
    const L = Math.ceil(cx - halfAt(Math.round(cy)));
    sprite(put, FLAME[motion ? ((f >> 1) & 1) : 0], L - 5, Math.round(cy) - 2, {r: C.red, o: C.orange, y: C.yellow});
    const k = motion ? ((f >> 1) % 3) : 1;
    for (let i = 0; i < 2 + k; i++) { put(L - 3 - i, Math.round(cy) + 3, shade); }
  }

  const sw = Math.round(G.rx * 0.85);
  for (let x = cx - sw; x <= cx + sw; x++) put(x, FLOOR + 1, deep);
  if (feet) {
    const fx = Math.max(2, Math.round(G.rx * 0.45));
    for (const s of [-1, 1]) { const lx = cx + s * fx; put(lx, FLOOR - 1, shade); put(lx, FLOOR, shade); put(lx + s, FLOOR, shade); }
  }

  const top = Math.ceil(cy - G.ry);
  const stripes = form === 'polyglot' && D.srcs30 && D.srcs30.length > 1
    ? (x, y) => mix(PET[D.srcs30[Math.floor((y - top) / 2) % D.srcs30.length]] || body, body, 0.35) : null;
  const sheen = aff === 'unreal' && feet ? (x, y) => ((((x - y + (motion ? f : 0)) % 13) + 13) % 13 < 2 ? mix(body, '#ffffff', 0.38) : null) : null;
  const S = shadeBlob(blob(cx, cy, G.rx, G.ry, 0), cx, cy, pal, put, (x, y) => (sheen && sheen(x, y)) || (stripes && stripes(x, y)) || null);
  let T = colTop(S, cx);

  if (st >= 3) {
    const ay = Math.round(cy + G.ry * 0.15), h = halfAt(ay), L = Math.ceil(cx - h), R = Math.floor(cx + h);
    const wave = motion && !sleeping && form !== 'debugger' && form !== 'guardian' ? ((f >> 3) & 1) : 0;
    put(L - 1, ay, body); put(L - 2, ay + 1 - wave * 2, body); put(R + 1, ay, body); put(R + 2, ay + 1, body);
    if (form === 'guardian') sprite(put, SHIELD, L - 7, ay - 2, {s: C.steel, w: C.steelDark, '+': C.white});
    if (form === 'debugger') {
      const hx = L - 3, hy = ay;
      [[0, 0], [-1, -1], [-2, -2]].forEach(([dx, dy]) => put(hx + dx, hy + dy, C.steel));
      [[-3, -3], [-4, -3], [-3, -4], [-5, -4], [-4, -5], [-5, -2], [-2, -5]].forEach(([dx, dy]) => put(hx + dx, hy + dy, C.steel));
      put(hx - 4, hy - 4, C.steelDark);
    }
  }
  if (form === 'owl') {
    const ox = Math.round(G.rx * 0.5);
    for (const s of [-1, 1]) { const bx = cx + s * ox, b = colTop(S, bx); put(bx, b - 1, shade); put(bx + s, b - 2, shade); }
  }
  if (st >= 4) {
    const hx = Math.round(G.rx * 0.45);
    if (form !== 'owl') for (const s of [-1, 1]) { const bx = cx + s * hx, b = colTop(S, bx); put(bx, b - 1, hi); put(bx + s, b - 2, hi); put(bx + s, b - 3, hi); }
    const ty = Math.round(cy + G.ry * 0.45), tx = Math.floor(cx + halfAt(ty)), tw = motion && !sleeping ? ((f >> 3) & 1) : 0;
    put(tx + 1, ty, shade); put(tx + 2, ty - 1, shade); put(tx + 3, ty - 2, shade); put(tx + 3, ty - 3 - tw, shade);
    const ax = tx + 3, ay2 = ty - 4 - tw;
    put(ax, ay2, hi); put(ax - 1, ay2, hi); put(ax + 1, ay2, hi); put(ax, ay2 - 1, hi);
  }

  // face
  const ex = Math.max(2, Math.round(G.rx * 0.4)), ey = Math.round(cy - G.ry * 0.2), ew = feet ? 2 : 1;
  const blink = motion && ((f % 41) < 1 || (f % 113) === 60);
  const happy = D.mood >= 70 && !sleeping && !D.sick, tired = has && D.rest < 50;
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? cx - ex - (ew - 1) : cx + ex;
    const ec = mut.cursed && s > 0 ? C.curse : eye;
    if (sleeping || (blink && form !== 'owl')) { for (let i = 0; i < ew; i++) put(x0 + i, ey + 1, ec); }
    else if (D.critical) { for (let i = 0; i < ew; i++) put(x0 + i, ey + 1, ec); put(x0 + (s < 0 ? 0 : ew - 1), ey + 2, C.drop); }
    else {
      for (let i = 0; i < ew; i++) { put(x0 + i, ey, ec); put(x0 + i, ey + 1, ec); }
      if (form === 'owl' && ew === 2) put(x0 + (s < 0 ? 1 : 0), ey + 1, C.yellow);
      else if (happy && ew === 2) put(x0, ey, hi);
    }
    if (tired && !D.critical) for (let i = 0; i < ew; i++) put(x0 + i, ey + 2, shade);
  }
  const my = ey + (feet ? 3 : 2);
  if (aff === 'local' && feet && !D.sick) {
    const bx = cx - 2;
    put(bx, my - 1, eye); put(bx + 1, my, eye); put(bx, my + 1, eye);
    if (!motion || ((f >> 2) & 1)) { put(bx + 2, my + 1, eye); put(bx + 3, my + 1, eye); }
  } else if (sleeping) put(cx, my, eye);
  else if (D.sick || D.mood < 30) { put(cx - 1, my + 1, eye); put(cx, my, eye); put(cx + 1, my + 1, eye); }
  else if (happy) { put(cx - 1, my, eye); put(cx, my + 1, eye); put(cx + 1, my, eye); }
  else { put(cx, my, eye); put(cx + 1, my, eye); }

  // head gear
  if (mut.crowned && feet) { sprite(put, CROWN, cx - 2, T - 3, {y: C.gold, g: C.gem}); T -= 3; }
  if (feet) {
    if (aff === 'github') {
      for (let i = 1; i <= 5; i++) put(cx, T - i, shade);
      put(cx + 1, T - 3, shade); put(cx + 2, T - 4, shade); put(cx + 2, T - 5, shade);
      const p = motion ? ((f >> 3) & 1) : 0;
      put(cx, T - 6, p ? hi : body); put(cx + 2, T - 6, p ? body : hi);
    } else if (aff === 'gitlab') {
      put(cx, T - 1, shade); put(cx, T - 2, shade);
      for (let x = cx - 4; x <= cx + 4; x++) put(x, T - 3, deep);
      const j = D.sick ? -1 : (motion ? ((f >> 2) % 4) : 3);
      [-4, 0, 4].forEach((o, k) => { const c = D.sick && k === 2 ? C.alarm : k < j ? body : k === j ? hi : shade; put(cx + o, T - 3, c); put(cx + o, T - 4, c); });
    } else if (aff === 'local') {
      put(cx, T - 1, shade); put(cx, T - 2, (!motion || ((f >> 2) & 1)) ? hi : shade);
    } else if (aff === 'unity') {
      const cb = motion ? ((f >> 2) & 1) : 0;
      const x0 = Math.min(GW - 8, cx + Math.round(G.rx) + 5), y0 = Math.round(baseCy - G.ry - 3 + cb);
      sprite(put, CUBE, x0, y0, {h: hi, b: body, s: shade});
    } else if (aff === 'unreal') {
      const sp = [[cx - G.rx - 2, cy - G.ry + 1], [cx + G.rx + 2, cy - 2], [cx + 2, T - 3], [cx - G.rx - 1, cy + 2]];
      const [sx, sy] = sp[motion ? ((f >> 2) % sp.length) : 0];
      put(sx, sy, hi); put(sx - 1, sy, shade); put(sx + 1, sy, shade); put(sx, sy - 1, shade); put(sx, sy + 1, shade);
    }
  }
  if (st === 5) {
    const hy = Math.max(0, T - 8);
    for (let x = cx - 5; x <= cx + 5; x++) if (((x + (motion ? (f >> 1) : 0)) & 1) === 0) put(x, hy, hi);
    for (let k = 0; k < 3; k++) {
      const a = (motion ? f * 0.11 : 0.6) + k * 2.094;
      const ox = Math.round(cx + (G.rx + 3.5) * Math.cos(a)), oy = Math.round(cy + 2.5 * Math.sin(a));
      if (Math.sin(a) < 0 && S.has(oy * GW + ox)) continue;
      put(ox, oy, hi);
    }
  }
  if (mut.shiny && motion) {
    const sp = [[cx - G.rx - 1, top + 1], [cx + G.rx + 1, top + 3], [cx - 3, top - 2], [cx + G.rx - 1, FLOOR - 1]];
    const [sx, sy] = sp[(f >> 1) % sp.length];
    put(sx, sy, C.spark);
  }
  // sick: sweat drop, alarm mark, coughs when critical
  if (D.sick) {
    const R = Math.floor(cx + halfAt(top + 2));
    if (!motion || ((f >> 2) & 1)) { put(R - 1, top + 1, C.drop); put(R - 1, top + 2, C.drop); }
    const mx = Math.min(GW - 2, Math.floor(cx + G.rx) + 2), my2 = Math.max(1, top - 2);
    if (!motion || ((f >> 1) & 1)) { put(mx, my2, C.alarm); put(mx, my2 + 1, C.alarm); put(mx, my2 + 3, C.alarm); }
    if (D.critical && motion && (f % 8) < 3) { const k = f % 8, px = cx - 3 - k * 2, py = my - k; put(px, py, C.steel); put(px - 1, py, C.steel); put(px, py - 1, C.steel); }
  }
  if (sleeping) {
    const k = motion ? ((f >> 3) % 3) : 1, zx = cx + Math.round(G.rx * 0.6) + k, zy = T - 5 - k * 2;
    sprite(put, ZG, zx, zy, {'#': k === 2 ? shade : hi});
  }
  return buf;
}

/* ---------- animated SVG card (for a README) ---------- */
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
function renderSVG(D, o) {
  o = o || {};
  const screen = '#080A0E', dot = '#141820', cell = 8, frames = 16, loop = 2;
  const ink = '#E3E7ED', muted = '#8C95A4', track = '#20262F', panel = '#151920', line = '#272D37';
  const good = '#49C383', warn = '#E3AE3C', bad = '#EF6B60';
  const aff = D.affinity, accent = PET[aff || 'none'];
  let frameSvg = '';
  for (let f = 0; f < frames; f++) {
    const byColor = new Map();
    for (const [k, c] of build(D, f, {screen})) {
      const x = (k % GW) * cell + 1, y = ((k / GW) | 0) * cell + 1;
      byColor.set(c, (byColor.get(c) || '') + `M${x} ${y}h6v6h-6z`);
    }
    let paths = '';
    for (const [c, d] of byColor) paths += `<path fill="${c}" d="${d}"/>`;
    frameSvg += `<g class="f" style="animation-delay:${(f * loop / frames).toFixed(3)}s">${paths}</g>`;
  }
  const st = D.stage, next = STAGES[st + 1];
  const fill = next ? clamp((D.xp - STAGES[st].xp) / (next.xp - STAGES[st].xp), 0, 1) : 1;
  const formName = D.form ? FORMS[D.form].name : (st < 3 ? 'form at PROCESS' : 'Core');
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
  const title = `${o.name || 'dmn'}: ${STAGES[st].name}${D.form ? ' ' + formName : ''}, ${D.xp} XP`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="264" viewBox="0 0 640 264" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
<defs>
<pattern id="dots" width="${cell}" height="${cell}" patternUnits="userSpaceOnUse"><rect x="1" y="1" width="6" height="6" rx="1" fill="${dot}"/></pattern>
<filter id="glow" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
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
<text x="10" y="18" fill="#9AA5B5" font-size="10" letter-spacing=".8">${STAGES[st].name} · ${st}/5</text>
<text x="310" y="18" fill="#9AA5B5" font-size="10" letter-spacing=".8" text-anchor="end">streak ${D.streak}d</text>
</g>
<text x="${X}" y="44" fill="${ink}" font-size="24" font-weight="700">${esc(o.name || 'dmn')}</text>
<text x="${X}" y="66" fill="${accent}" font-size="13" font-weight="700">${STAGES[st].name}${D.form ? ' · ' + esc(formName.toUpperCase()) : ''}</text>
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
  DAY, HOUR, SOURCES, SRC, STAGES, FORMS, MUTATIONS, PET, FIX_XP, GW, GH,
  clamp, dayIdx, baseXP, mult, valid, mix, derive, traitAt, statusLine,
  detectKind, toSessions, ciFromRollup, ciFromPipeline, updateCI, Q_REPO, scanGitHubRepo,
  build, renderSVG,
};
root.PetCore = PetCore;
if (typeof module !== 'undefined' && module.exports) module.exports = PetCore;
})(typeof globalThis !== 'undefined' ? globalThis : this);
