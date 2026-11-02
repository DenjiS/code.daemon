/* code.daemon widget UI. The pet engine lives in pet-core.js; the PowerShell host adds API tokens. */
(() => {
'use strict';
const P = window.PetCore;
const {DAY, HOUR, SOURCES, SRC, STAGES, MAX_STAGE, CREST_STAGE, FORM_STAGE, FORMS, MUTATIONS, PET, clamp, valid} = P;
const I = window.I18n;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wv = window.chrome && window.chrome.webview ? window.chrome.webview : null;

const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
let monthFmt = new Intl.DateTimeFormat('en', {month:'short', day:'numeric'});
const fmtWhen = ms => { const d = new Date(ms); return `${monthFmt.format(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const since = ms => { const m = Math.max(0, Math.round((Date.now() - ms) / 6e4)); if (m < 1) return t('time.now'); if (m < 60) return t('time.m', {n: m}); const h = Math.floor(m / 60); if (h < 24) return t('time.h', {n: h}); return t('time.d', {n: Math.floor(h / 24)}); };
const newId = () => 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const repoName = k => String(k || '').replace(/^g[hl]:/, '');
const repoLabel = k => { const r = state.repos.find(x => x.key === k); return r ? r.name : repoName(k); };

/* ---------- state ---------- */
const freshState = () => ({v:2, name:'dmn', theme:'classic', lang:'auto', wikiLang:'ui', manual:[], auto:[], repos:[], ci:{}, events:[], lastScan:{gh:0, gl:0}, accounts:{gh:null, gl:null}, overrides:{}});
function normSession(b) {
  b = b || {};
  return {
    id: String(b.id || newId()), src: String(b.src || ''), kind: b.kind ? String(b.kind) : '',
    min: Math.round(+b.min), commits: Math.max(0, Math.round(+b.commits || 0)),
    tests: !!b.tests, bug: !!b.bug, ship: !!b.ship, note: typeof b.note === 'string' ? b.note.slice(0, 80) : '',
    at: +b.at, first: +b.first || +b.at, prov: b.prov === 'gh' || b.prov === 'gl' ? b.prov : '', repo: b.repo ? String(b.repo) : '',
    auto: !!b.auto, sample: !!b.sample,
  };
}
function loadState(text) {
  const s = freshState();
  let o = null;
  try { o = text ? JSON.parse(text) : null; } catch (e) { o = null; }
  if (!o || typeof o !== 'object') return s;
  const arr = x => Array.isArray(x) ? x : [];
  if (typeof o.name === 'string' && o.name.trim()) s.name = o.name.trim().slice(0, 16);
  if (typeof o.theme === 'string' && P.hasTheme(o.theme)) s.theme = o.theme;
  if (typeof o.lang === 'string' && (o.lang === 'auto' || I.has(o.lang))) s.lang = o.lang;
  if (typeof o.wikiLang === 'string' && (o.wikiLang === 'ui' || I.has(o.wikiLang))) s.wikiLang = o.wikiLang;
  s.manual = arr(o.manual).map(normSession).filter(valid);
  s.auto = arr(o.auto).map(normSession).filter(valid);
  s.repos = arr(o.repos).filter(r => r && r.key).map(r => ({key:String(r.key), name:String(r.name || r.key), prov:r.prov === 'gl' ? 'gl' : 'gh', kind:String(r.kind || ''), last:+r.last || 0}));
  if (o.lastScan) s.lastScan = {gh:+o.lastScan.gh || 0, gl:+o.lastScan.gl || 0};
  if (o.accounts) s.accounts = {gh:o.accounts.gh || null, gl:o.accounts.gl || null};
  if (o.overrides && typeof o.overrides === 'object') for (const k in o.overrides) if (SRC[o.overrides[k]]) s.overrides[k] = o.overrides[k];
  if (o.ci && typeof o.ci === 'object') for (const k in o.ci) {
    const c = o.ci[k];
    if (c && ['pass', 'fail', 'run'].includes(c.s)) s.ci[k] = {s:c.s, at:+c.at || 0, since:+c.since || undefined, wasFail:!!c.wasFail,
      ref: typeof c.ref === 'string' && c.ref ? c.ref : undefined, lastFix: +c.lastFix || undefined};
  }
  s.events = arr(o.events).filter(e => e && e.id && Number.isFinite(+e.at) && Number.isFinite(+e.xp))
    .map(e => ({id:String(e.id), kind:'fix', repo:String(e.repo || ''), at:+e.at, xp:+e.xp}));
  return s;
}
let state = freshState();
let settings = {gh:{connected:false}, gl:{connected:false, url:'https://gitlab.com'}, topmost:true, expanded:false, autostart:false};
let errors = {gh:null, gl:null}, rate = {gh:null, gl:null};
let scanning = false, ready = false, expanded = false, tab = 'feed';
const allSessions = () => state.manual.concat(state.auto);
const deriveNow = () => P.derive(allSessions(), Date.now(), {ci: state.ci, events: state.events});
let D = deriveNow();

function post(m) { if (wv) wv.postMessage(m); }
let saveTimer = null, dirty = false;
function flushSave() {
  clearTimeout(saveTimer); saveTimer = null;
  if (!dirty) return;  // never overwrite the save file with a state that wasn't loaded or changed
  dirty = false;
  const json = JSON.stringify(state);
  if (wv) wv.postMessage('SAVE:' + json);
  else { try { localStorage.setItem('code-daemon.widget', json); } catch (e) {} }
}
function save() { dirty = true; clearTimeout(saveTimer); saveTimer = setTimeout(flushSave, 300); }
// Quit writes any pending change first; the host waits for the 'quit' message that follows it.
function quit() { commitName(true); flushSave(); post({type:'quit'}); }

/* ---------- language ----------
   The interface and the wiki each have a language, saved with the pet. 'auto' follows Windows; the wiki can follow the interface.
   Static text in widget.html carries data-i18n* attributes; its English is read from the page itself at start-up. */
const sysLang = I.detect(navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]);
let lang = 'en', wikiLang = 'en';
const t = (k, v) => I.t(lang, k, v);
const N = () => I.names(lang);
const I18N_ATTRS = [['data-i18n', ''], ['data-i18n-html', 'html'], ['data-i18n-title', 'title'], ['data-i18n-ph', 'placeholder'], ['data-i18n-aria', 'aria-label']];
for (const [a, how] of I18N_ATTRS) for (const el of $$(`[${a}]`)) {
  const k = el.getAttribute(a);
  if (!(I.DICT.en && Object.prototype.hasOwnProperty.call(I.DICT.en, k))) I.add('en', {[k]: how === 'html' ? el.innerHTML.trim() : how ? el.getAttribute(how) : el.textContent});
}
// A scan or host error: a dictionary key with values, or plain text that came from elsewhere.
const errText = e => e && typeof e === 'object' && e.key ? t(e.key, e.vars) : String(e || '');
function applyLang() {
  lang = state.lang !== 'auto' && I.has(state.lang) ? state.lang : sysLang;
  wikiLang = state.wikiLang !== 'ui' && I.has(state.wikiLang) ? state.wikiLang : lang;
  document.documentElement.lang = I.tag(lang);
  for (const [a, how] of I18N_ATTRS) for (const el of $$(`[${a}]`)) {
    const v = t(el.getAttribute(a));
    if (how === 'html') { if (el.innerHTML !== v) el.innerHTML = v; } else if (how) el.setAttribute(how, v); else if (el.textContent !== v) el.textContent = v;
  }
  monthFmt = new Intl.DateTimeFormat(I.tag(lang), {month: 'short', day: 'numeric'});
  renderSrcs();
  post({type: 'menu', items: {show: t('tray.show'), rescan: t('tray.rescan'), data: t('tray.data'), quit: t('tray.quit')}});
}
const setHTML = (el, html) => { if (el._html !== html) { el._html = html; el.innerHTML = html; } };
function renderLangs() {
  const opt = (v, label, on) => `<option value="${v}"${on ? ' selected' : ''}>${esc(label)}</option>`;
  const sys = I.LANGS.find(l => l.id === sysLang) || I.LANGS[0];
  setHTML($('#lang-ui'), opt('auto', t('lang.auto', {name: sys.name}), state.lang === 'auto') + I.LANGS.map(l => opt(l.id, l.name, state.lang === l.id)).join(''));
  setHTML($('#lang-wiki'), opt('ui', t('lang.same'), state.wikiLang === 'ui') + I.LANGS.map(l => opt(l.id, l.name, state.wikiLang === l.id)).join(''));
  $('#lang-ui').value = state.lang; $('#lang-wiki').value = state.wikiLang;
}

/* ---------- themes ---------- */
const THEME_DOT = {classic: 'var(--muted)', derp: '#FFE27A', slavic: '#3D6BE0', asian: '#3FB28A', demonic: '#D8322A', succubus: '#FF5C9E'};
function applyTheme() {
  const tc = P.themeColors(state.theme), el = $('.screen');
  if (el) { if (tc) { el.style.setProperty('--screen', tc.screen); el.style.setProperty('--screen-dot', tc.dot); } else { el.style.removeProperty('--screen'); el.style.removeProperty('--screen-dot'); } }
}
function renderThemes() {
  const box = $('#themes'); if (!box) return;
  box.innerHTML = P.THEME_LIST.filter(t => P.hasTheme(t.id)).map(t =>
    `<label class="chip" style="--c:${THEME_DOT[t.id] || 'var(--muted)'}"><input type="radio" name="theme" value="${t.id}"${state.theme === t.id ? ' checked' : ''}><span>${esc(N().theme(t.id))}</span></label>`).join('');
}
function setTheme(id) {
  if (!P.hasTheme(id) || id === state.theme) return;
  state.theme = id; save(); applyTheme(); render(); paint();
}

/* ---------- pixel screen ---------- */
const canvas = $('#pet'), ctx = canvas.getContext('2d');
const theme = {screen:'#0D1015', dot:'#181D25'};
function readTheme() {
  const cs = getComputedStyle(document.documentElement);
  const s = cs.getPropertyValue('--screen').trim(), d = cs.getPropertyValue('--screen-dot').trim();
  if (/^#[0-9a-f]{6}$/i.test(s)) theme.screen = s;
  if (/^#[0-9a-f]{6}$/i.test(d)) theme.dot = d;
}
let frame = 0, flash = 0;
function paint() {
  const W = canvas.width, H = canvas.height;
  if (!W || !H) return;
  const GW = P.GW, GH = P.GH, cell = W / GW, gap = Math.max(1, cell * 0.14), r = cell - gap;
  const tc = P.themeColors(state.theme), screen = tc ? tc.screen : theme.screen, dot = tc ? tc.dot : theme.dot;
  const buf = P.build(D, frame, {screen, reduced, theme: state.theme, react: reactNow()});
  const body = PET[D.affinity || 'none'];
  ctx.shadowBlur = 0;
  ctx.fillStyle = screen; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = flash > 0 && (flash & 1) ? P.mix(dot, body, 0.35) : dot;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (!buf.has(y * GW + x)) ctx.fillRect(x * cell + gap / 2, y * cell + gap / 2, r, r);
  ctx.save();
  ctx.shadowBlur = cell * 0.7;
  for (const [k, c] of buf) {
    const x = k % GW, y = (k / GW) | 0;
    ctx.fillStyle = c; ctx.shadowColor = c === screen ? 'transparent' : c + '80';
    ctx.fillRect(x * cell + gap / 2, y * cell + gap / 2, r, r);
  }
  ctx.restore();
}
function sizeCanvas() {
  const dpr = Math.min(3, window.devicePixelRatio || 1), w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  paint();
}
let lastT = 0;
function loop(t) {
  requestAnimationFrame(loop);
  if (t - lastT < 1000 / (reduced ? 2 : 8)) return;
  lastT = t; frame++; if (flash > 0) flash--;
  paint();
}
function fx(el, text) {
  el.textContent = text; el.style.color = PET[D.affinity || 'none'];
  el.hidden = false; el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
  clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; }, 1700);
}
function evolve(st) {
  flash = 12;
  const n = N(), form = st >= FORM_STAGE && D.form ? ' · ' + n.upper(n.form(D.form)) : '';
  setTimeout(() => fx($('#evofx'), `→ ${n.stage(st)}${form}`), 600);
}

/* ---------- API (the host adds the token) ---------- */
const waiting = new Map();
let seq = 0;
class ScanError extends Error { constructor(key, vars) { super(I.t('en', key, vars)); this.key = key; this.vars = vars; } }
const FATAL = /token|rate limit|unreachable|did not answer/i;
function api(prov, path, opts = {}) {
  if (!wv) return Promise.reject(new ScanError('err.preview'));
  const id = ++seq;
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { waiting.delete(id); reject(new ScanError('err.timeout')); }, 60000);
    waiting.set(id, r => { clearTimeout(t); resolve(r); });
    post({type:'api', id, prov, method: opts.method || 'GET', path, body: opts.body ? JSON.stringify(opts.body) : null});
  });
}
async function eachLimit(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({length: Math.min(n, items.length)}, async () => { while (i < items.length) await fn(items[i++]); }));
}
async function gql(query, variables) {
  const r = await api('gh', '/graphql', {method:'POST', body:{query, variables}});
  if (r.headers && r.headers['X-RateLimit-Remaining']) rate.gh = +r.headers['X-RateLimit-Remaining'];
  if (r.status === 401) throw new ScanError('err.ghToken');
  if (r.status === 403 || r.status === 429) throw new ScanError('err.ghRate');
  if (r.status === 0) throw (r.error ? new ScanError('err.raw', {msg: r.error}) : new ScanError('err.ghDown'));
  if (r.status >= 400 || !r.data) throw new ScanError('err.ghStatus', {n: r.status});
  if (!r.data.data) { const msg = r.data.errors && r.data.errors[0] && r.data.errors[0].message; throw msg ? new ScanError('err.raw', {msg}) : new ScanError('err.ghQuery'); }
  return r.data.data;
}
async function gl(path, soft) {
  const r = await api('gl', path);
  if (r.headers && r.headers['RateLimit-Remaining']) rate.gl = +r.headers['RateLimit-Remaining'];
  if (r.status === 401) throw new ScanError('err.glToken');
  if (r.status === 0) throw (r.error ? new ScanError('err.raw', {msg: r.error}) : new ScanError('err.glDown'));
  if (r.status === 429) throw new ScanError('err.glRate');
  if (r.status === 403 && !soft) throw new ScanError('err.glScope');
  if (r.status >= 400) { if (soft) return null; throw new ScanError('err.glStatus', {n: r.status}); }
  return r.data;
}

const Q_REPOS = `query($cursor:String){viewer{login id repositories(first:50,after:$cursor,orderBy:{field:PUSHED_AT,direction:DESC},affiliations:[OWNER,COLLABORATOR,ORGANIZATION_MEMBER],ownerAffiliations:[OWNER,COLLABORATOR,ORGANIZATION_MEMBER]){pageInfo{hasNextPage endCursor} nodes{nameWithOwner pushedAt}}}}`;
async function scanGitHub(since, now) {
  let cursor = null, viewer = null;
  const active = [];
  for (let page = 0; page < 6; page++) {
    const d = await gql(Q_REPOS, {cursor});
    viewer = d.viewer;
    const conn = d.viewer.repositories;
    let stop = false;
    for (const n of conn.nodes) { if (!n.pushedAt || Date.parse(n.pushedAt) < since) { stop = true; break; } active.push(n.nameWithOwner); }
    if (stop || !conn.pageInfo.hasNextPage) break;
    cursor = conn.pageInfo.endCursor;
  }
  const repos = [], sessions = [], observed = {}, failed = new Set();
  await eachLimit(active, 3, async name => {
    let res = null;
    try { res = await P.scanGitHubRepo(gql, name, since, viewer.id, state.overrides); }
    catch (e) { if (FATAL.test(e.message)) throw e; failed.add('gh:' + name); return; }  // keep its saved sessions this time
    if (!res) return;
    repos.push(res.repo); sessions.push(...res.sessions);
    observed[res.repo.key] = res.ci;
  });
  // Re-check repos that were red or running but had no new commits in this window.
  const recheck = Object.keys(state.ci).filter(k => k.startsWith('gh:') && state.ci[k].s !== 'pass' && !(k in observed));
  await eachLimit(recheck, 3, async key => {
    try { const res = await P.scanGitHubRepo(gql, repoName(key), now - 14 * DAY, viewer.id, state.overrides); observed[key] = res ? res.ci : null; }
    catch (e) { if (FATAL.test(e.message)) throw e; }
  });
  return {account: '@' + viewer.login, repos, sessions, observed, failed};
}

async function glPipeline(projectId, username) {
  const pipes = await gl(`/api/v4/projects/${projectId}/pipelines?per_page=5&username=${encodeURIComponent(username)}`, true);
  if (!Array.isArray(pipes)) return null;
  for (const p of pipes) { const s = P.ciFromPipeline(p.status); if (s) return {s, at: Date.parse(p.updated_at || p.created_at) || Date.now(), ref: p.ref ? String(p.ref) : undefined}; }
  return null;
}
async function scanGitLab(since, now) {
  const iso = encodeURIComponent(new Date(since).toISOString());
  const me = await gl('/api/v4/user');
  if (!me || !me.id) throw new ScanError('err.glProfile');
  const emails = new Set([me.email, me.commit_email, me.public_email].filter(Boolean).map(s => String(s).toLowerCase()));
  const extra = await gl('/api/v4/user/emails', true);
  if (Array.isArray(extra)) extra.forEach(e => e && e.email && emails.add(String(e.email).toLowerCase()));
  const projects = [];
  for (let p = 1; p <= 5; p++) {
    const list = await gl(`/api/v4/projects?membership=true&archived=false&simple=true&order_by=last_activity_at&sort=desc&last_activity_after=${iso}&per_page=100&page=${p}`);
    if (!Array.isArray(list) || !list.length) break;
    projects.push(...list);
    if (list.length < 100) break;
  }
  const repos = [], sessions = [], observed = {}, failed = new Set();
  await eachLimit(projects, 3, async pr => {
    const tree = await gl(`/api/v4/projects/${pr.id}/repository/tree?per_page=100`, true);
    const kind = P.detectKind((Array.isArray(tree) ? tree : []).map(e => ({name: e.name, dir: e.type === 'tree'}))) || 'gitlab';
    const seen = new Map();
    for (let p = 1; p <= 50; p++) {
      const list = await gl(`/api/v4/projects/${pr.id}/repository/commits?all=true&since=${iso}&per_page=100&page=${p}`, true);
      if (!Array.isArray(list)) { failed.add('gl:' + pr.id); return; }  // error page: keep its saved sessions this time
      if (!list.length) break;
      for (const c of list) {
        // Match by email; the display name is only a fallback when GitLab shows no email (names are not unique).
        const mine = emails.size ? emails.has(String(c.author_email || '').toLowerCase()) : !!(me.name && c.author_name === me.name);
        const t = Date.parse(c.authored_date), key = P.commitKey(t, c.title);
        if (mine && !seen.has(key)) seen.set(key, {oid: c.id, t, msg: c.title || ''});
      }
      if (list.length < 100) break;
    }
    const commits = [...seen.values()].filter(c => Number.isFinite(c.t) && c.t >= since);
    if (!commits.length) return;
    const rels = await gl(`/api/v4/projects/${pr.id}/releases?per_page=10`, true);
    const rel = (Array.isArray(rels) ? rels : []).map(x => Date.parse(x.released_at)).filter(Number.isFinite);
    const repo = {key: 'gl:' + pr.id, name: pr.path_with_namespace || pr.name || String(pr.id), prov: 'gl', kind, last: Math.max(...commits.map(c => c.t))};
    repos.push(repo);
    sessions.push(...P.toSessions(repo, commits, rel, state.overrides));
    observed[repo.key] = await glPipeline(pr.id, me.username);
  });
  const recheck = Object.keys(state.ci).filter(k => k.startsWith('gl:') && state.ci[k].s !== 'pass' && !(k in observed));
  await eachLimit(recheck, 3, async key => { observed[key] = await glPipeline(key.slice(3), me.username); });
  return {account: '@' + me.username, repos, sessions, observed, failed};
}

async function scan(opts = {}) {
  if (scanning || !wv || !ready) return;
  const provs = ['gh', 'gl'].filter(p => settings[p].connected && (!opts.only || opts.only === p));
  if (!provs.length) { render(); return; }
  scanning = true; render();
  const beforeXP = D.xp, beforeStage = D.stage, now = Date.now();
  let fixed = 0;
  for (const p of provs) {
    const full = opts.full || !state.lastScan[p];
    // Re-read the last 3 days, starting at a session boundary so no session gets cut in two.
    const since = P.rescanFrom(state.auto.filter(s => s.prov === p), full ? now - 180 * DAY : state.lastScan[p] - 3 * DAY);
    try {
      const r = p === 'gh' ? await scanGitHub(since, now) : await scanGitLab(since, now);
      state.auto = state.auto.filter(s => s.prov !== p || s.at < since || r.failed.has(s.repo)).concat(r.sessions);
      const map = new Map(state.repos.filter(x => x.prov === p).map(x => [x.key, x]));
      for (const x of r.repos) map.set(x.key, x);
      state.repos = state.repos.filter(x => x.prov !== p).concat([...map.values()]);
      const u = P.updateCI(state.ci, r.observed, now);
      state.ci = u.ci;
      const known = new Set(state.events.map(e => e.id));
      const fresh = u.events.filter(e => !known.has(e.id));
      state.events = state.events.concat(fresh);
      fixed += fresh.length;
      state.accounts[p] = r.account; state.lastScan[p] = now; errors[p] = null;
    } catch (e) {
      errors[p] = e && e.key ? {key: e.key, vars: e.vars} : (e && e.message ? e.message : String(e));
    }
  }
  scanning = false;
  save(); render();
  if (D.xp > beforeXP) fx($('#xpfx'), `+${D.xp - beforeXP} XP`);
  if (D.stage > beforeStage) evolve(D.stage);
  else if (fixed) setTimeout(() => fx($('#evofx'), fixed > 1 ? t('fx.fixedN', {n: fixed}) : t('fx.fixed')), 600);
}

/* ---------- render ---------- */
const lv = v => v >= 60 ? 'ok' : v >= 30 ? 'mid' : 'low';
function syncLine() {
  if (!wv) return {text: t('sync.preview'), err: false};
  if (!ready) return {text: t('sync.connecting'), err: false};
  if (scanning) return {text: t('sync.syncing'), err: false};
  const errP = ['gh', 'gl'].find(p => errors[p]);
  if (errP) return {text: t('sync.err', {name: errP === 'gh' ? 'GitHub' : 'GitLab', err: errText(errors[errP])}), err: true};
  const parts = [];
  for (const [p, name] of [['gh', 'GitHub'], ['gl', 'GitLab']]) if (settings[p].connected)
    parts.push(state.lastScan[p] ? t('sync.when', {name, when: since(state.lastScan[p])}) : t('sync.pending', {name}));
  return {text: parts.length ? t('sync.synced', {list: parts.join(' · ')}) : t('sync.none'), err: false};
}
// The status line on the screen, in the interface language (pet-core decides what it says).
function statusText() {
  const [k, v] = P.statusInfo(D), n = N();
  if (k === 'empty') return t(settings.gh.connected || settings.gl.connected ? 'hud.eggWait' : 'hud.eggConnect');
  if (k === 'sick') return t(v.more ? 'st.sickMore' : 'st.sick', {repo: repoLabel(v.repo), more: v.more});
  if (k === 'next' || k === 'max') return t('st.' + k, {n: v.n, stage: n.lower(n.stage(v.stage)), STAGE: n.stage(v.stage)});
  return t('st.' + k, v);
}
function render() {
  D = deriveNow();
  applyTheme();
  const st = D.stage, aff = D.affinity, has = D.count > 0, n = N();
  document.documentElement.style.setProperty('--aff', aff ? `var(--src-${aff})` : 'var(--muted)');
  $('#petname').textContent = state.name || 'dmn';
  $('#pill').textContent = `${n.stage(st)} ${st}/${MAX_STAGE}`;
  const muts = Object.keys(D.mutations).filter(k => D.mutations[k]).map(k => n.upper(n.mut(k)));
  const body = n.bodyLower(st, state.theme), form = D.form || 'core';
  const formTxt = st >= FORM_STAGE ? t('pet.form', {form: esc(n.form(form)), body: esc(body)})
    : esc(t('pet.locks', {body, stage: n.stage(FORM_STAGE), n: STAGES[FORM_STAGE].xp - D.xp}));
  const affTxt = aff && st >= CREST_STAGE ? ' · ' + esc(t('pet.crest', {src: n.src(aff)})) : '';
  $('#formrow').innerHTML = formTxt + affTxt + (muts.length ? ` · <span class="mut">${esc(muts.join(' · '))}</span>` : '');
  $('#formrow').title = st >= FORM_STAGE ? n.formRule(form) : t('pet.locksTip', {stage: n.stage(FORM_STAGE)});
  const next = STAGES[st + 1];
  const fill = next ? clamp((D.xp - STAGES[st].xp) / (next.xp - STAGES[st].xp) * 100, 0, 100) : 100;
  $('#xpfill').style.width = fill.toFixed(1) + '%';
  $('#xpcap').textContent = next ? t('pet.xp', {xp: D.xp, next: next.xp}) : t('pet.xpMax', {xp: D.xp});
  const vit = [['energy', D.energy, has], ['mood', D.mood, has], ['rest', D.rest, has], ['build', D.health, D.ciTracked > 0]];
  $('#vitals').innerHTML = vit.map(([k, v, show]) => {
    const label = t('vital.' + k);
    const tip = k === 'build' ? (show ? t('vital.buildTip', {p: D.ciPassing, n: D.ciTracked}) : t('vital.buildNone')) : label;
    return `<div class="vital" data-wiki="${k}" data-lv="${show ? lv(v) : 'ok'}" title="${esc(tip)}"><div class="top"><span>${esc(n.upper(label))}</span><b>${show ? v : '—'}</b></div><div class="track"><i style="width:${show ? v : 0}%"></i></div></div>`;
  }).join('');
  $('#hudstage').textContent = `${n.stage(st)} · ${st}/${MAX_STAGE}`;
  $('#hudup').textContent = has ? t('hud.streak', {n: D.streak}) : t('hud.nosignal');
  $('#hudstatus').textContent = !ready ? t('hud.boot') : statusText();
  canvas.setAttribute('aria-label', has
    ? t(D.ciTracked ? 'aria.petBuild' : 'aria.pet', {name: state.name, what: n.stage(st) + (st >= FORM_STAGE ? ' ' + n.form(form) : ''), e: D.energy, m: D.mood, r: D.rest, h: D.health})
    : t('aria.egg', {name: state.name}));
  const sl = syncLine();
  const sync = $('#sync'); sync.textContent = sl.text; sync.className = sl.err ? 'err' : ''; sync.title = sl.text;
  $('#b-scan').classList.toggle('spin', scanning);
  $('#b-scan').disabled = scanning || !wv;
  if (expanded) renderPanel();
  paint();
}
function renderPanel() {
  $$('.tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  $('#tab-feed').hidden = tab !== 'feed'; $('#tab-log').hidden = tab !== 'log'; $('#tab-setup').hidden = tab !== 'setup'; $('#tab-wiki').hidden = tab !== 'wiki';
  if (tab === 'feed') updatePreview();
  if (tab === 'wiki') renderWiki();
  if (tab === 'log') renderLog();
  if (tab === 'setup') renderSetup();
}
function renderLog() {
  const n = N();
  const locked = STAGES.map((x, k) => k).filter(k => k >= FORM_STAGE && D.forms[k]).map(k => `${esc(n.stage(k))} → <b>${esc(n.form(D.forms[k]))}</b>`);
  $('#evo').innerHTML = locked.length ? t('log.evo', {list: locked.join(' · ')})
    : t('log.next', {stage: esc(n.stage(FORM_STAGE)), form: esc(n.form(P.traitAt(D.sorted, Date.now())))});
  const rows = D.sorted.map(s => ({t: s.at, s})).concat(state.events.map(e => ({t: e.at, e}))).sort((a, b) => b.t - a.t).slice(0, 40);
  $('#logempty').hidden = rows.length > 0;
  const del = esc(t('log.del'));
  $('#loglist').innerHTML = rows.map(({s, e}) => {
    if (e) return `<li class="lrow" style="--c:var(--good)"><span class="ldot"></span><div style="min-width:0"><div class="l1">${t('log.fixed')}</div><div class="l2">${fmtWhen(e.at)} · ${esc(repoLabel(e.repo))}</div></div><span class="lxp">+${D.gain[e.id] || 0}</span><span></span></li>`;
    const late = P.isLate(s.at);
    const flags = [s.tests && 'tests', s.bug && 'fix', s.ship && 'ship', late && 'late'].filter(Boolean).map(f => t('flag.' + f)).join(' · ');
    const where = s.auto ? esc(s.note) : esc(t(s.sample ? 'log.sample' : 'log.manual'));
    return `<li class="lrow" style="--c:var(--src-${s.src})"><span class="ldot"></span><div style="min-width:0"><div class="l1"><b>${esc(n.src(s.src))}</b> ${esc(t('log.size', {min: s.min, c: s.commits}))}${flags ? ' · ' + esc(flags) : ''}</div><div class="l2" title="${esc(s.note || '')}">${fmtWhen(s.at)} · ${where}</div></div><span class="lxp">+${D.gain[s.id] || 0}</span>${!s.auto ? `<button class="x" type="button" data-del="${esc(s.id)}" title="${del}" aria-label="${del}">×</button>` : '<span></span>'}</li>`;
  }).join('');
}
function renderWiki() {
  if (window.PetWiki) window.PetWiki.render($('#tab-wiki'), {D, now: Date.now(), theme: state.theme, ci: state.ci, label: repoLabel, lang: wikiLang});
}
// Opens the Wiki tab, optionally at one section.
function openWiki(section) {
  if (section && window.PetWiki) window.PetWiki.show(section);
  if (expanded && tab === 'wiki') renderPanel(); else setExpanded(true, 'wiki');
}
function renderSetup() {
  $('#previewnote').hidden = !!wv;
  renderLangs();
  renderThemes();
  const n = N();
  for (const p of ['gh', 'gl']) {
    const el = $(`#${p}-state`), on = settings[p].connected;
    el.className = 'astate' + (errors[p] ? ' err' : on && state.accounts[p] ? ' ok' : '');
    el.textContent = errors[p] ? errText(errors[p]) : on ? (state.accounts[p] ? t('acct.on', {who: state.accounts[p]}) : t('acct.scanning')) : t('acct.none');
    $(`#${p}-clearwrap`).hidden = !on;
    $(`#${p}-save`).textContent = t(on ? 'acct.replace' : 'acct.connect');
  }
  const urlEl = $('#gl-url');
  if (document.activeElement !== urlEl) urlEl.value = settings.gl.url || 'https://gitlab.com';
  const base = (urlEl.value || 'https://gitlab.com').replace(/\/+$/, '');
  if (/^https?:\/\/[^\s/]+/.test(base)) $('#gl-link').href = `${base}/-/user_settings/personal_access_tokens?name=code.daemon&scopes=read_api,read_user`;
  const info = [];
  if (state.lastScan.gh) info.push(rate.gh != null ? t('scan.calls', {name: 'GitHub', when: since(state.lastScan.gh), n: rate.gh}) : t('sync.when', {name: 'GitHub', when: since(state.lastScan.gh)}));
  if (state.lastScan.gl) info.push(t('sync.when', {name: 'GitLab', when: since(state.lastScan.gl)}));
  $('#scaninfo').textContent = scanning ? t('scan.busy') : info.length ? t('scan.last', {list: info.join(' · ')}) : t('scan.idle');
  $('#scan2').disabled = $('#scanfull').disabled = scanning || !wv;
  const counts = {};
  for (const s of state.auto) counts[s.repo] = (counts[s.repo] || 0) + s.commits;
  const repos = state.repos.slice().sort((a, b) => b.last - a.last);
  $('#repocount').textContent = repos.length ? String(repos.length) : '';
  const ciCell = k => { const c = state.ci[k]; if (!c) return `<span class="ci none" title="${esc(t('ci.none'))}">—</span>`; return `<span class="ci ${c.s}" title="${esc(t('ci.' + c.s))}">${{pass: '✓', fail: '✗', run: '…'}[c.s]}</span>`; };
  $('#repos').innerHTML = repos.length ? repos.map(r => {
    const ov = state.overrides[r.key] || '';
    const eff = ov || r.kind;
    const opts = [`<option value="">${esc(t('repo.auto', {src: SRC[r.kind] ? n.src(r.kind) : r.kind}))}</option>`].concat(SOURCES.map(s => `<option value="${s.id}"${ov === s.id ? ' selected' : ''}>${esc(n.src(s.id))}</option>`)).join('');
    return `<li class="repo"><span class="ldot" style="--c:var(--src-${SRC[eff] ? eff : 'local'})"></span><span class="rn" title="${esc(r.name)}">${esc(r.name)}</span>${ciCell(r.key)}<span class="rc">${counts[r.key] || 0}c</span><select data-repo="${esc(r.key)}" aria-label="${esc(t('repo.aria', {name: r.name}))}">${opts}</select></li>`;
  }).join('') : `<li class="hint">${esc(t('repos.none'))}</li>`;
  $('#t-top').checked = !!settings.topmost;
  $('#t-auto').checked = !!settings.autostart;
}

/* ---------- panel + window ---------- */
let lastH = 0;
function fit() {
  const h = Math.ceil($('#app').getBoundingClientRect().height);
  if (h && h !== lastH) { lastH = h; post({type:'resize', h}); }
}
function setExpanded(on, which) {
  expanded = on;
  if (which) tab = which;
  $('#panel').hidden = !on;
  $('#b-more').setAttribute('aria-expanded', String(on));
  if (on) renderPanel();
  post({type:'expanded', on});
  requestAnimationFrame(fit);
}
$('#b-more').addEventListener('click', () => setExpanded(!expanded));
$('#b-wiki').addEventListener('click', () => { if (expanded && tab === 'wiki') setExpanded(false); else openWiki(); });
// Vitals and other "how does this work" links jump to their wiki section.
$('#app').addEventListener('click', e => { const t = e.target.closest('[data-wiki]'); if (t) openWiki(t.dataset.wiki); });
$('#b-hide').addEventListener('click', () => post({type:'hide'}));
$$('.tabs button').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; renderPanel(); }));
function startDrag(e) {
  if (e.button !== 0 || e.target.closest('button,input,select,a,label')) return;
  e.preventDefault(); post({type:'drag'});
}
$('#bar').addEventListener('mousedown', startDrag);

/* ---------- poking the pet ----------
   On the screen a press that stays put is a click on the pet; one that moves a few pixels drags the window,
   as before. Themes without reactions (P.canReact) drag straight away. Reactions are cosmetic only. */
const DRAG_PX = 4, COMBO_MS = 2500, TICK_MS = 125;  // TICK_MS: one animation frame at 8 fps
let press = null, react = null, lastReact = null, pokes = [], hoverCell = '';
function cellAt(e) {
  const r = canvas.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  const gx = Math.floor((e.clientX - r.left) / r.width * P.GW), gy = Math.floor((e.clientY - r.top) / r.height * P.GH);
  return gx >= 0 && gy >= 0 && gx < P.GW && gy < P.GH ? [gx, gy] : null;
}
function reactNow() {
  if (!react) return null;
  const t = Math.floor((performance.now() - react.start) / TICK_MS);
  if (t >= P.REACTIONS[react.kind].len) { react = null; return null; }
  return {kind: react.kind, t, n: react.n, gx: react.gx, gy: react.gy};
}
function zoneAt(e) {
  const c = cellAt(e);
  return c ? {cell: c, zone: P.hitTest(D, frame, {reduced, theme: state.theme, react: reactNow()}, c[0], c[1])} : null;
}
function poke(e) {
  const hit = zoneAt(e);
  if (!hit || hit.zone === undefined) return;
  const now = performance.now();
  if (react && (react.kind === 'angry' || react.kind === 'grumpy')) return;  // let it fume
  pokes = pokes.filter(t => now - t < COMBO_MS); pokes.push(now);
  const kind = P.reactionFor(D, hit.zone, pokes.length);
  if (kind === 'angry' || kind === 'grumpy') pokes = [];
  // n: a streak of the same reaction (a third pat in a row blushes)
  const n = lastReact && lastReact.kind === kind && now - lastReact.start < COMBO_MS ? lastReact.n + 1 : 1;
  react = lastReact = {kind, start: now, n, gx: hit.cell[0], gy: hit.cell[1]};
  paint();
}
$('#screen').addEventListener('mousedown', e => {
  if (e.button !== 0 || e.target.closest('button,input,select,a,label')) return;
  if (!P.canReact(state.theme)) return startDrag(e);
  e.preventDefault();
  press = {x: e.clientX, y: e.clientY};
});
window.addEventListener('mousemove', e => {
  if (press) {
    if (!(e.buttons & 1)) press = null;  // released outside the window
    else if (Math.hypot(e.clientX - press.x, e.clientY - press.y) >= DRAG_PX) { press = null; post({type: 'drag'}); }
    return;
  }
  if (!P.canReact(state.theme) || !(e.target.closest && e.target.closest('#screen'))) { if (hoverCell) { hoverCell = ''; canvas.style.cursor = ''; } return; }
  const c = cellAt(e), key = c ? c + '|' + frame : '';
  if (key === hoverCell) return;
  hoverCell = key;
  const hit = c && zoneAt(e);
  canvas.style.cursor = hit && hit.zone ? 'pointer' : '';
});
window.addEventListener('mouseup', e => {
  if (!press || e.button !== 0) return;
  press = null;
  poke(e);
});

/* ---------- feed ---------- */
function renderSrcs() {
  const cur = (document.querySelector('input[name="src"]:checked') || {}).value || 'local', n = N();
  $('#srcs').innerHTML = SOURCES.map(s => `<label class="chip" style="--c:var(--src-${s.id})"><input type="radio" name="src" value="${s.id}"${s.id === cur ? ' checked' : ''}><span>${esc(n.src(s.id))}</span></label>`).join('');
}
function readDraft() {
  const r = document.querySelector('input[name="src"]:checked');
  const min = Math.round(+$('#min').value);
  if (!r || !SRC[r.value]) return {error: t('feed.errSrc')};
  if (!(min >= 5 && min <= 720)) return {error: t('feed.errMin')};
  return {src: r.value, min, commits: clamp(Math.round(+$('#commits').value || 0), 0, 99), tests: $('#h-tests').checked, bug: $('#h-bug').checked, ship: $('#h-ship').checked, at: Date.now(), note: ''};
}
const previewXP = d => P.gainFor(D, d);
function updatePreview() {
  const d = readDraft();
  if (d.error) { $('#pvxp').textContent = '—'; $('#pvdetail').textContent = d.error; return; }
  const p = previewXP(d);
  $('#pvxp').textContent = `+${p.xp} XP`;
  $('#pvdetail').textContent = t(p.capped ? 'feed.pvCapped' : 'feed.pv', {base: p.base, mult: p.mult.toFixed(2)});
}
$('#tab-feed').addEventListener('input', updatePreview);
$$('.preset').forEach(b => b.addEventListener('click', () => { $('#min').value = b.dataset.min; updatePreview(); }));
$$('.step').forEach(b => b.addEventListener('click', () => { const i = $('#commits'); i.value = clamp((+i.value || 0) + +b.dataset.step, 0, 99); updatePreview(); }));
$('#tab-feed').addEventListener('submit', e => {
  e.preventDefault();
  const d = readDraft();
  if (d.error) { $('#feedmsg').textContent = d.error; return; }
  const s = normSession({id: newId(), ...d});
  const before = D.stage, p = previewXP(s);
  state.manual.push(s);
  save(); render();
  $('#feedmsg').textContent = t('feed.done', {min: s.min, src: N().src(s.src), xp: p.xp});
  fx($('#xpfx'), `+${p.xp} XP`);
  if (D.stage > before) evolve(D.stage);
  ['#h-tests', '#h-bug', '#h-ship'].forEach(q => { $(q).checked = false; });
  $('#commits').value = 0;
  updatePreview();
});
$('#loglist').addEventListener('click', e => {
  const b = e.target.closest('[data-del]');
  if (!b) return;
  if (!b.classList.contains('arm')) {
    b.classList.add('arm'); b.textContent = t('log.sure');
    setTimeout(() => { if (b.isConnected) { b.classList.remove('arm'); b.textContent = '×'; } }, 3000);
    return;
  }
  state.manual = state.manual.filter(s => s.id !== b.dataset.del);
  save(); render();
});

/* ---------- setup ---------- */
for (const p of ['gh', 'gl']) {
  $(`#${p}-save`).addEventListener('click', () => {
    const tok = $(`#${p}-token`).value.trim();
    if (!tok) { errors[p] = {key: 'err.noToken'}; renderSetup(); return; }
    errors[p] = null;
    post({type:'setToken', prov: p, token: tok, url: p === 'gl' ? $('#gl-url').value.trim() : undefined});
    $(`#${p}-token`).value = '';
  });
  $(`#${p}-token`).addEventListener('keydown', e => { if (e.key === 'Enter') $(`#${p}-save`).click(); });
  $(`#${p}-clear`).addEventListener('click', () => { errors[p] = null; state.accounts[p] = null; save(); post({type:'clearToken', prov: p}); });
}
$('#gl-url').addEventListener('input', renderSetup);
$('#scan2').addEventListener('click', () => scan());
$('#scanfull').addEventListener('click', () => scan({full: true}));
$('#b-scan').addEventListener('click', () => scan());
$('#repos').addEventListener('change', e => {
  const sel = e.target.closest('select[data-repo]');
  if (!sel) return;
  const key = sel.dataset.repo, v = sel.value;
  if (v) state.overrides[key] = v; else delete state.overrides[key];
  for (const s of state.auto) if (s.repo === key) s.src = v || s.kind;
  save(); render();
});
$('#themes').addEventListener('change', e => { if (e.target.name === 'theme') setTheme(e.target.value); });
$('#lang-ui').addEventListener('change', e => { state.lang = e.target.value; save(); applyLang(); render(); });
$('#lang-wiki').addEventListener('change', e => { state.wikiLang = e.target.value; save(); applyLang(); render(); });
$('#t-top').addEventListener('change', e => post({type:'topmost', on: e.target.checked}));
$('#t-auto').addEventListener('change', e => post({type:'autostart', on: e.target.checked}));
$('#b-data').addEventListener('click', () => post({type:'openData'}));
$('#b-quit').addEventListener('click', quit);

/* ---------- rename ---------- */
const nameBtn = $('#petname'), nameIn = $('#petnameinput');
nameBtn.addEventListener('click', () => { nameIn.value = state.name; nameBtn.hidden = true; nameIn.hidden = false; nameIn.focus(); nameIn.select(); });
function commitName(keep) {
  if (nameIn.hidden) return;
  const v = nameIn.value.trim().replace(/\s+/g, ' ').slice(0, 16);
  nameIn.hidden = true; nameBtn.hidden = false;
  if (keep && v) { state.name = v; save(); render(); }
}
nameIn.addEventListener('keydown', e => { if (e.key === 'Enter') commitName(true); if (e.key === 'Escape') commitName(false); });
nameIn.addEventListener('blur', () => commitName(true));

/* ---------- host messages ---------- */
function normSettings(s) {
  s = s || {};
  return {gh: {connected: !!(s.gh && s.gh.connected)}, gl: {connected: !!(s.gl && s.gl.connected), url: (s.gl && s.gl.url) || 'https://gitlab.com'},
    topmost: s.topmost !== false, expanded: !!s.expanded, autostart: !!s.autostart};
}
function onHost(m) {
  if (!m || typeof m !== 'object') return;
  switch (m.type) {
    case 'init':
      state = loadState(m.save);
      settings = normSettings(m.settings);
      ready = true;
      applyLang();
      render();
      if (!settings.gh.connected && !settings.gl.connected) setExpanded(true, 'setup');
      else { if (settings.expanded) setExpanded(true); scan(); }
      break;
    case 'settings':
      settings = normSettings(m.settings);
      if (m.connected) { state.lastScan[m.connected] = 0; errors[m.connected] = null; scan({only: m.connected}); }
      render();
      break;
    case 'notice': if (m.prov) errors[m.prov] = m.key ? {key: 'err.' + m.key} : m.text; render(); break;
    case 'rescan': scan(); break;
    case 'quit': quit(); break;
    case 'api': {
      const f = waiting.get(m.id);
      if (f) { waiting.delete(m.id); let data = null; try { data = m.body ? JSON.parse(m.body) : null; } catch (e) { data = null; } f({status: m.status || 0, data, headers: m.headers || {}, error: m.error}); }
      break;
    }
  }
}

/* ---------- boot ---------- */
applyLang();
readTheme();
new ResizeObserver(sizeCanvas).observe(canvas);
new ResizeObserver(() => fit()).observe($('#app'));
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readTheme(); render(); });
requestAnimationFrame(loop);
setInterval(() => { if (ready) render(); }, 60000);
setInterval(() => scan(), 15 * 60000);
if (wv) {
  wv.addEventListener('message', e => onHost(e.data));
  render();
  post({type:'ready'});
} else {
  // Preview outside the widget host: sample data so the layout can be checked in a browser.
  const now = Date.now();
  const mk = (h, src, min, commits, f = {}) => normSession({id: 'p' + h, src, min, commits, at: now - h * HOUR, sample: true, auto: !!f.repo, ...f});
  state.manual = [];
  for (let d = 0; d < 16; d++) {
    state.manual.push(mk(d * 24 + 2, 'unity', 110, 4, {tests: d % 2 === 0, repo: 'gh:you/arena', note: 'you/arena'}));
    if (d % 3 === 0) state.manual.push(mk(d * 24 + 7, 'github', 45, 3, {bug: true, repo: 'gh:you/tools', note: 'you/tools'}));
  }
  state.ci = {'gh:you/arena': {s: 'fail', at: now - 5 * HOUR, since: now - 5 * HOUR}, 'gh:you/tools': {s: 'pass', at: now - 30 * HOUR}};
  state.events = [{id: 'fix:demo', kind: 'fix', repo: 'gh:you/tools', at: now - 30 * HOUR, xp: P.FIX_XP}];
  state.repos = [{key: 'gh:you/arena', name: 'you/arena', prov: 'gh', kind: 'unity', last: now - 2 * HOUR}, {key: 'gh:you/tools', name: 'you/tools', prov: 'gh', kind: 'github', last: now - 7 * HOUR}];
  ready = true;
  render();
}
if (document.fonts) document.fonts.ready.then(() => requestAnimationFrame(fit));
})();
