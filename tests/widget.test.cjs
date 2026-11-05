// The widget's scan flow in jsdom, with a fake WebView2 host. Needs `npm install` (jsdom).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const {ROOT, P, HOUR, DAY, MIN} = require('./helpers.cjs');
let JSDOM = null;
try { ({JSDOM} = require('jsdom')); } catch (e) { /* skipped below */ }
const UI = path.join(ROOT, 'ui');

// extra: code run right after pet-core.js, before the widget starts (to define a theme, say)
function boot(save, repos, now, extra) {
  const page = fs.readFileSync(path.join(UI, 'widget.html'), 'utf8');
  const scripts = [...page.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
  const html = page.replace(/<script[^>]*><\/script>/g, '');
  const dom = new JSDOM(html, {runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://daemon.example/widget.html'});
  const w = dom.window;
  const ctx2d = () => new Proxy({}, {get: (t, k) => k in t ? t[k] : () => {}, set: (t, k, v) => (t[k] = v, true)});
  w.HTMLCanvasElement.prototype.getContext = ctx2d;
  w.matchMedia = () => ({matches: false, addEventListener() {}});
  w.ResizeObserver = class { observe() {} };
  const host = {saves: [], posted: [], listener: null};
  const reply = m => setTimeout(() => host.listener({data: m}), 1);
  w.chrome = {webview: {addEventListener: (t, f) => { host.listener = f; }, postMessage(m) {
    host.posted.push(m);
    if (typeof m === 'string') { if (m.startsWith('SAVE:')) host.saves.push(JSON.parse(m.slice(5))); return; }
    if (m.type === 'ready') return reply({type: 'init', save: JSON.stringify(save), settings: {gh: {connected: true}, gl: {connected: false}}});
    if (m.type !== 'api') return;
    const {query, variables: v} = JSON.parse(m.body);
    const ok = data => reply({type: 'api', id: m.id, status: 200, headers: {}, body: JSON.stringify({data})});
    if (query.includes('viewer')) return ok({viewer: {login: 'me', id: 'U1', repositories: {pageInfo: {hasNextPage: false},
      nodes: Object.keys(repos).map(n => ({nameWithOwner: n, pushedAt: new Date(now).toISOString()}))}}});
    const r = repos[v.owner + '/' + v.name];
    if (r.fail) return reply({type: 'api', id: m.id, status: 502, headers: {}, body: '{}'});
    const since = Date.parse(v.since);
    const nodes = r.commits.filter(c => c.t >= since).sort((a, b) => b.t - a.t).map(c => ({oid: c.oid, authoredDate: new Date(c.t).toISOString(), messageHeadline: 'w'}));
    ok({repository: {isPrivate: false, object: {entries: []}, releases: {nodes: []}, refs: {nodes: r.ci.map(b => ({name: b.ref,
      target: {committedDate: new Date(now - 30 * MIN).toISOString(), statusCheckRollup: {state: b.s}, history: {pageInfo: {hasNextPage: false}, nodes}}}))}}});
  }}};
  for (const f of scripts) { w.eval(fs.readFileSync(path.join(UI, f), 'utf8')); if (f === 'pet-core.js' && extra) w.eval(extra); }
  return {w, host, tell: m => host.listener({data: m})};
}
const wait = ms => new Promise(r => setTimeout(r, ms));
async function until(check) {
  for (let i = 0; i < 200; i++) { if (check()) return; await wait(10); }
  assert.ok(check(), 'widget finished the requested scan');
}
const toS = (name, cs) => P.toSessions({key: 'gh:' + name, name, prov: 'gh', kind: 'github'}, cs.map(c => ({...c, msg: 'w'})), [], {});

test('a rescan keeps a session that straddles the window, keeps repos that failed, and a branch switch is not a fix', {skip: !JSDOM && 'jsdom not installed'}, async () => {
  const now = Date.now(), lastScan = now - 15 * MIN, boundary = lastScan - 3 * DAY;
  const repos = {
    'me/app': {commits: Array.from({length: 20}, (_, i) => ({oid: 'a' + i, t: boundary - 90 * MIN + i * 9 * MIN})), ci: [{ref: 'main', s: 'SUCCESS'}]},
    'me/flaky': {fail: true, commits: Array.from({length: 5}, (_, i) => ({oid: 'f' + i, t: now - DAY + i * 10 * MIN}))},
  };
  const save = {v: 2, name: 'dmn', theme: 'classic', manual: [], repos: [],
    auto: [...toS('me/app', repos['me/app'].commits), ...toS('me/flaky', repos['me/flaky'].commits)],
    ci: {'gh:me/app': {s: 'fail', at: now - 5 * HOUR, since: now - 5 * HOUR, ref: 'feature'}},
    events: [], lastScan: {gh: lastScan, gl: 0}, accounts: {gh: '@me', gl: null}, overrides: {}};
  repos['me/app'].commits.push({oid: 'a99', t: now - 30 * MIN});
  const {w, host} = boot(save, repos, now);
  await wait(1200).finally(() => w.close());  // close stops the widget's timers so the test process can exit
  const saved = host.saves.at(-1);
  assert.ok(saved, 'state saved');
  const by = repo => saved.auto.filter(s => s.repo === repo);
  assert.strictEqual(by('gh:me/app').reduce((a, s) => a + s.commits, 0), 21);
  assert.strictEqual(by('gh:me/flaky').length, 1);
  assert.strictEqual(saved.events.length, 0);
  assert.strictEqual(saved.ci['gh:me/app'].ref, 'main');
});

// Observe the engine calls rather than exposing widget internals. A controllable clip clock avoids long waits.
const traceClips = `
  window.clipTrace = []; window.clipTime = 0; window.scanCount = 0;
  Object.defineProperty(performance, 'now', {value: () => window.clipTime});
  const build = PetCore.build, updateCI = PetCore.updateCI;
  PetCore.build = (D, f, o) => { if (o.clip) window.clipTrace.push(o.clip.name); return build(D, f, o); };
  PetCore.updateCI = (...args) => { window.scanCount++; return updateCI(...args); };
`;

test('widget plays CI transitions in all themes, once, keeps the fixed message, and ignores a branch switch', {skip: !JSDOM && 'jsdom not installed'}, async () => {
  for (const T of P.themes()) {
    const now = Date.now(), ci = [{ref: 'main', s: 'SUCCESS'}];
    const repos = {'me/app': {commits: [{oid: 'ci1', t: now - HOUR}, {oid: 'ci2', t: now - 30 * MIN}], ci}};
    const save = {v: 2, name: 'dmn', theme: T.id, manual: [], auto: toS('me/app', repos['me/app'].commits), repos: [],
      ci: {'gh:me/app': {s: 'pass', ref: 'main', at: now - HOUR}}, events: [], lastScan: {gh: now, gl: 0}, overrides: {}};
    const {w, tell} = boot(save, repos, now, traceClips);
    const scan = async () => {
      const n = w.scanCount;
      tell({type: 'rescan'});
      await until(() => w.scanCount > n && !w.document.querySelector('#b-scan').disabled);
    };
    const settle = () => { w.clipTime += 10000; tell({type: 'settings', settings: {gh: {connected: true}}}); w.clipTrace.length = 0; };
    try {
      await until(() => w.scanCount > 0 && !w.document.querySelector('#b-scan').disabled);
      assert.equal(w.clipTrace.length, 0, `${T.id}: no reaction on initial load`);
      ci[0].s = 'FAILURE'; await scan();
      assert.ok(w.clipTrace.includes('ciFail'), T.id + ': red build');
      settle(); await scan();
      assert.equal(w.clipTrace.length, 0, T.id + ': unchanged red does not replay');
      ci[0].s = 'PENDING'; await scan();
      assert.equal(w.clipTrace.length, 0, T.id + ': pending is not a fix');
      ci[0].s = 'SUCCESS'; await scan();
      assert.ok(w.clipTrace.includes('ciFixed'), T.id + ': red -> running -> green');
      await until(() => !w.document.querySelector('#evofx').hidden);
      assert.match(w.document.querySelector('#evofx').textContent, /fixed/i);
      settle(); await scan();
      assert.equal(w.clipTrace.length, 0, T.id + ': unchanged green does not replay');
      ci[0].s = 'FAILURE'; await scan(); settle();
      ci[0] = {ref: 'feature', s: 'SUCCESS'}; await scan();
      assert.equal(w.clipTrace.length, 0, T.id + ': a branch switch is not a fix');
    } finally { w.close(); }
  }
});

test('a saved red build is quiet on startup; CI waits for an evolution from the same scan', {skip: !JSDOM && 'jsdom not installed'}, async () => {
  const now = Date.now(), ci = [{ref: 'main', s: 'FAILURE'}];
  const repos = {'me/app': {commits: [{oid: 'q1', t: now - HOUR}], ci}};
  const save = {v: 2, name: 'dmn', manual: [], auto: toS('me/app', repos['me/app'].commits), repos: [],
    ci: {'gh:me/app': {s: 'fail', ref: 'main', at: now - HOUR, since: now - HOUR}}, events: [], lastScan: {gh: now, gl: 0}, overrides: {}};
  const extra = traceClips + `
    const derive = PetCore.derive;
    PetCore.derive = (...args) => ({...derive(...args), stage: window.scanCount > 1 ? 2 : 1});
  `;
  const {w, tell} = boot(save, repos, now, extra);
  try {
    await until(() => w.scanCount > 0 && !w.document.querySelector('#b-scan').disabled);
    assert.equal(w.clipTrace.length, 0, 'loading a saved illness is not a new red build');
    ci[0].s = 'SUCCESS'; tell({type: 'rescan'});
    await until(() => w.scanCount > 1 && !w.document.querySelector('#b-scan').disabled);
    assert.ok(w.clipTrace.includes('evolve'), 'evolution plays first');
    assert.ok(!w.clipTrace.includes('ciFixed'), 'CI has been queued');
    w.clipTime = 3000; tell({type: 'settings', settings: {gh: {connected: true}}});
    assert.ok(w.clipTrace.includes('ciFixed'), 'the repair plays when evolution finishes');
  } finally { w.close(); }
});

test('quit writes a pending rename before the quit message, and never writes an unchanged save', {skip: !JSDOM && 'jsdom not installed'}, async () => {
  const save = {v: 2, name: 'dmn', manual: [], auto: [], repos: [], ci: {}, events: [], lastScan: {gh: Date.now(), gl: 0}, overrides: {}};
  const {w, host, tell} = boot(save, {}, Date.now());
  try {
  await wait(800);  // the start-up scan and its save are done
  host.posted.length = 0;
  tell({type: 'quit'});                       // tray Quit with nothing changed
  assert.deepStrictEqual(host.posted.filter(m => typeof m === 'string'), []);
  assert.ok(host.posted.some(m => m && m.type === 'quit'));
  host.posted.length = 0;
  const $ = s => w.document.querySelector(s);
  $('#petname').click(); $('#petnameinput').value = 'nyx';
  $('#b-quit').click();                        // rename in progress, then Quit at once
  const i = host.posted.findIndex(m => typeof m === 'string' && m.startsWith('SAVE:'));
  const q = host.posted.findIndex(m => m && m.type === 'quit');
  assert.ok(i >= 0 && q > i, 'SAVE comes before quit');
  assert.strictEqual(JSON.parse(host.posted[i].slice(5)).name, 'nyx');
  } finally { w.close(); }
});

test('the wiki builds every section from the engine, and a vital opens its own section', {skip: !JSDOM && 'jsdom not installed'}, async () => {
  const now = Date.now();
  const save = {v: 2, name: 'dmn', manual: [], repos: [], ci: {}, events: [], lastScan: {gh: now, gl: 0}, overrides: {},
    auto: toS('me/app', Array.from({length: 12}, (_, i) => ({oid: 'w' + i, t: now - i * 26 * HOUR})))};
  const {w} = boot(save, {}, now);
  try {
    await wait(800);
    const $ = s => w.document.querySelector(s), $$ = s => [...w.document.querySelectorAll(s)];
    $('#b-wiki').click();
    assert.strictEqual($('#tab-wiki').hidden, false);
    const secs = $$('#tab-wiki details.wk');
    assert.strictEqual(secs.length, w.PetWiki.SECTIONS.length);
    assert.ok(!$('#tab-wiki').textContent.includes('could not be built'));
    for (const s of P.STAGES) assert.ok($('#wk-stages').textContent.includes(s.xp.toLocaleString('en-US')), s.name);
    $('[data-wiki="rest"]').click();
    assert.ok($('#wk-rest').open, 'Rest section opened');
    assert.strictEqual($('#tab-wiki').hidden, false);
  } finally { w.close(); }
});

test('switching the interface language translates the page, the tray menu and the wiki; the wiki can keep its own', {skip: !JSDOM && 'jsdom not installed'}, async () => {
  const now = Date.now();
  const save = {v: 2, name: 'dmn', manual: [], repos: [], ci: {}, events: [], lastScan: {gh: now, gl: 0}, overrides: {},
    auto: toS('me/app', Array.from({length: 12}, (_, i) => ({oid: 'l' + i, t: now - i * 26 * HOUR})))};
  const {w, host} = boot(save, {}, now);
  try {
    await wait(800);
    const $ = s => w.document.querySelector(s);
    $('#b-more').click(); $('[data-tab=setup]').click();
    const pick = (sel, v) => { const el = $(sel); el.value = v; el.dispatchEvent(new w.Event('change', {bubbles: true})); };
    pick('#lang-ui', 'ru');
    assert.strictEqual(w.document.documentElement.lang, 'ru');
    assert.strictEqual($('[data-tab=feed]').textContent, 'Корм');
    assert.ok($('#vitals').textContent.includes('ЭНЕРГИЯ'));
    const menu = host.posted.filter(m => m && m.type === 'menu').at(-1);
    assert.strictEqual(menu.items.quit, 'Выйти');
    $('#b-wiki').click();
    assert.ok($('#wk-how summary').textContent.startsWith('Как это работает'));
    $('[data-tab=setup]').click();
    pick('#lang-wiki', 'ja');
    $('[data-tab=wiki]').click();
    assert.ok($('#wk-how summary').textContent.startsWith('しくみ'));
    assert.strictEqual($('[data-tab=wiki]').textContent, 'Вики');
    await wait(400);
    const saved = host.saves.at(-1);
    assert.strictEqual(saved.lang, 'ru'); assert.strictEqual(saved.wikiLang, 'ja');
    $('[data-tab=setup]').click();
    pick('#lang-ui', 'en');
    assert.strictEqual($('[data-tab=feed]').textContent, 'Feed');
    assert.ok($('#setup-gh-hint, [data-i18n-html="setup.ghHint"]').innerHTML.startsWith('Safest:'));
    assert.ok($('#gh-clear'), 'the Disconnect button survives the switch');
  } finally { w.close(); }
});

test('on the pet screen a press that stays put is a click, one that moves drags; other themes drag at once', {skip: !JSDOM && 'jsdom not installed'}, async () => {
  const save = {v: 2, name: 'dmn', theme: 'classic', manual: [], auto: [], repos: [], ci: {}, events: [], lastScan: {gh: Date.now(), gl: 0}, overrides: {}};
  const {w, host} = boot(save, {}, Date.now());
  try {
    await wait(300);
    const scr = w.document.querySelector('#screen'), canvas = w.document.querySelector('#pet');
    canvas.getBoundingClientRect = () => ({left: 0, top: 0, width: 256, height: 192, right: 256, bottom: 192});
    const ev = (el, type, x, y, buttons) => el.dispatchEvent(new w.MouseEvent(type, {bubbles: true, cancelable: true, button: 0, buttons, clientX: x, clientY: y}));
    const drags = () => host.posted.filter(m => m && m.type === 'drag').length;
    ev(scr, 'mousedown', 128, 120, 1); ev(w.document, 'mousemove', 129, 121, 1); ev(w.document, 'mouseup', 129, 121, 0);
    assert.strictEqual(drags(), 0, 'a click does not drag');
    ev(scr, 'mousedown', 128, 120, 1); ev(w.document, 'mousemove', 140, 120, 1);
    assert.strictEqual(drags(), 1, 'moving while pressed drags');
    ev(w.document, 'mouseup', 140, 120, 0);
  } finally { w.close(); }
  const still = "PetCore.defineTheme({id: 'still', name: 'Still', plans: () => ({parts: [], eyes: [], mouth: null})});";  // a theme without reactions
  const other = boot({...save, theme: 'still'}, {}, Date.now(), still);
  try {
    await wait(300);
    other.w.document.querySelector('#screen').dispatchEvent(new other.w.MouseEvent('mousedown', {bubbles: true, cancelable: true, button: 0, buttons: 1}));
    assert.strictEqual(other.host.posted.filter(m => m && m.type === 'drag').length, 1, 'themes without reactions drag on press');
  } finally { other.w.close(); }
});

test('pin blocks header, pet and edge dragging, and restores from host settings', {skip: !JSDOM && 'jsdom not installed'}, async () => {
  const {w, host, tell} = boot({}, {}, Date.now());
  try {
    await until(() => host.listener && host.posted.some(m => m.type === 'ready'));
    await wait(30);
    const button = w.document.querySelector('#b-pin');
    const mouse = (el, type, x, y) => el.dispatchEvent(new w.MouseEvent(type, {bubbles: true, button: 0, buttons: 1, clientX: x, clientY: y}));
    const header = w.document.querySelector('#bar'), screen = w.document.querySelector('#screen');
    tell({type:'settings', settings:{pinned:true, large:true}});
    assert.strictEqual(button.getAttribute('aria-pressed'), 'true');
    assert.strictEqual(screen.hasAttribute('title'), false);
    w.document.querySelector('#b-more').click();
    w.document.querySelector('[data-tab=setup]').click();
    const language = w.document.querySelector('#lang-ui');
    language.value = 'ru';
    language.dispatchEvent(new w.Event('change', {bubbles: true}));
    assert.strictEqual(w.document.documentElement.lang, 'ru');
    assert.strictEqual(screen.hasAttribute('title'), false, 'language changes keep the drag hint hidden');
    w.document.querySelector('#b-size').click(); // enable large view to exercise edge resizing
    host.posted.length = 0;
    mouse(header, 'mousedown', 100, 20);
    mouse(screen, 'mousedown', 100, 100);
    mouse(w, 'mousemove', 120, 120);
    mouse(w.document.body, 'mousedown', 1, 1);
    assert.ok(!host.posted.some(m => m.type === 'drag' || m.type === 'sizeDrag'));
    button.click();
    assert.strictEqual(button.getAttribute('aria-pressed'), 'false');
    assert.strictEqual(screen.title, w.I18n.t('ru', 'bar.drag'));
    assert.ok(host.posted.some(m => m.type === 'pinned' && m.on === false));
    mouse(header, 'mousedown', 100, 20);
    assert.ok(host.posted.some(m => m.type === 'drag'));
    button.click();
    assert.ok(host.posted.some(m => m.type === 'pinned' && m.on === true));
    assert.strictEqual(screen.hasAttribute('title'), false);
  } finally { w.close(); }
});
