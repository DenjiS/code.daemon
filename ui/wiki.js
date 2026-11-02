/* code.daemon wiki: every rule the pet follows, with your own numbers next to it.
   The numbers come from pet-core.js (constants and the same functions the pet uses), so the text can't drift from the
   engine; the words come from the i18n dictionaries (keys w.*), in the wiki's own language.
   widget.js calls PetWiki.render(el, ctx) whenever the Wiki tab is shown or the state changes. */
(() => {
'use strict';
const P = window.PetCore, I = window.I18n;
const {DAY, HOUR, SOURCES, STAGES, MAX_STAGE, CREST_STAGE, FORM_STAGE, FORMS, MUTATIONS, FIX_XP, DAY_SOFT_CAP} = P;

const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const capRate = Math.round((P.OVER_CAP_RATE || 0.15) * 100);
const GAP_H = (P.SESSION_GAP || 2 * HOUR) / HOUR;

// small builders
const now$ = (label, value) => `<div class="wknow"><span>${label}</span><b>${value}</b></div>`;
const f$ = s => `<div class="wkf">${s}</div>`;
const p$ = s => `<p>${s}</p>`;
const ul$ = items => `<ul>${items.filter(Boolean).map(i => `<li>${i}</li>`).join('')}</ul>`;
const rows$ = (head, rows, on) => `<table class="wkt">${head ? `<tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>` : ''}${rows.map((r, i) => `<tr${on === i ? ' class="on"' : ''}>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
const bar$ = (label, frac, text, hot) => `<div class="wkbar${hot ? ' hot' : ''}"><span>${label}</span><i><b style="width:${Math.max(0, Math.min(100, frac * 100)).toFixed(0)}%"></b></i><em>${text}</em></div>`;

// what the last 7 days look like, shared by Mood and Rest
function week(D, now) {
  const w = D.sorted.filter(s => now - s.at < 7 * DAY);
  return {w, late: w.filter(s => P.isLate(s.at)), long: w.filter(s => s.min >= 240), quality: w.filter(s => s.tests || s.bug)};
}
const energyFor = (min, ageH, now) => P.derive([{id: 'x', src: 'local', min, commits: 0, at: now - ageH * HOUR}], now).energy;

// Every section: id, title key, peek (short live value next to the title) and body. c carries T (translate), n (names),
// num (number format), when (date format) and the widget's context.
const SECTIONS = [
  {id: 'how', title: 'w.how', peek: (D, c) => D.count ? c.T('w.how.peek', {n: D.count}) : c.T('w.how.start'), body: (D, c) => [
    p$(c.T('w.how.p1')), f$(c.T('w.how.flow')), p$(c.T('w.how.p2')), p$(c.T('w.how.p3')),
  ]},

  {id: 'sessions', title: 'w.ses', peek: (D, c) => c.T('w.ses.peek', {n: c.num(D.count)}), body: (D, c) => [
    p$(c.T('w.ses.p1', {gap: GAP_H})),
    p$(c.T('w.ses.tags')),
    ul$([c.T('w.ses.tests'), c.T('w.ses.fix'), c.T('w.ses.ship')]),
    p$(c.T('w.ses.p2')), p$(c.T('w.ses.p3')), p$(c.T('w.ses.p4')),
  ]},

  {id: 'xp', title: 'w.xp', peek: (D, c) => c.T('w.xp.peek', {n: c.num(D.xp)}), body: (D, c) => {
    const ex = [[25, 1], [50, 3], [90, 5], [180, 10], [480, 30]];
    const today = (D.dayRaw && D.dayRaw.get(P.dayIdx(c.now))) || 0;
    return [
      f$(c.T('w.xp.f')),
      p$(c.T('w.xp.p1')),
      rows$([c.T('w.xp.hMin'), c.T('w.xp.hCommits'), 'XP', c.T('w.xp.hTags')], ex.map(([m, k]) => [m, k, c.num(P.sessionXP({min: m, commits: k})), c.num(P.sessionXP({min: m, commits: k, tests: true, bug: true, ship: true}))])),
      p$(c.T('w.xp.streak', {a: P.mult(1).toFixed(2), b: P.mult(10).toFixed(2)})),
      p$(c.T('w.xp.cap', {cap: DAY_SOFT_CAP, rate: capRate, fix: FIX_XP})),
      now$(c.T('w.xp.today'), `${c.num(today)} / ${DAY_SOFT_CAP}`),
      now$(c.T('w.xp.mult'), `×${P.mult(D.streak).toFixed(2)}`),
    ];
  }},

  {id: 'stages', title: 'w.st', peek: (D, c) => `${c.n.stage(D.stage)} ${D.stage}/${MAX_STAGE}`, body: (D, c) => {
    const next = STAGES[D.stage + 1];
    return [
      rows$(['', c.T('w.st.hStage'), 'XP', c.T('w.st.hBody')], STAGES.map((s, i) => [i, esc(c.n.stage(i)), c.num(s.xp), esc(c.n.body(i, c.theme))]), D.stage),
      next ? now$(esc(c.T('w.st.to', {stage: c.n.stage(D.stage + 1)})), `${c.num(next.xp - D.xp)} XP`) : now$(c.T('w.st.stage'), c.T('w.st.max')),
      p$(esc(c.T('w.st.p1', {crest: c.n.stage(CREST_STAGE), form: c.n.stage(FORM_STAGE), kernel: c.n.stage(9)}))),
      p$(esc(c.T('w.st.p2', {kernel: c.n.stage(9), top: c.n.stage(MAX_STAGE), service: c.n.stage(8)}))),
    ];
  }},

  {id: 'forms', title: 'w.fm', peek: (D, c) => D.stage >= FORM_STAGE ? c.n.form(D.form || 'core') : c.T('w.fm.from', {stage: c.n.stage(FORM_STAGE)}), body: (D, c) => {
    const t = P.traitScores(D.sorted, c.now), pick = P.traitAt(D.sorted, c.now), core = esc(c.n.form('core'));
    const locked = STAGES.map((s, k) => k).filter(k => k >= FORM_STAGE && D.forms[k]).map(k => `${esc(c.n.stage(k))} → <b>${esc(c.n.form(D.forms[k]))}</b>`);
    return [
      p$(c.T('w.fm.p1', {stage: esc(c.n.stage(FORM_STAGE))})),
      ul$(Object.keys(FORMS).map(k => `<b>${esc(c.n.form(k))}</b>: ${esc(c.n.formRule(k))}`)),
      p$(c.T('w.fm.p2', {core})),
      `<div class="lbl">${esc(c.T('w.fm.now'))}</div>`,
      t.score
        ? Object.keys(t.score).map(k => bar$(esc(c.n.form(k)), t.score[k], Math.round(t.score[k] * 100) + '%', k === pick)).join('') + now$(esc(c.T('w.fm.result')), esc(c.n.form(pick)))
        : p$(c.T('w.fm.few', {n: t.n, core})),
      locked.length ? p$(c.T('w.fm.locked', {list: locked.join(' · ')})) : '',
    ];
  }},

  {id: 'crest', title: 'w.cr', peek: (D, c) => D.affinity ? c.n.src(D.affinity) : '—', body: (D, c) => {
    const xp30 = {}; let total = 0;
    for (const s of D.sorted) if (c.now - s.at < 30 * DAY) { const g = D.gain[s.id] || 0; xp30[s.src] = (xp30[s.src] || 0) + g; total += g; }
    return [
      p$(esc(c.T('w.cr.p1', {stage: c.n.stage(CREST_STAGE)}))),
      rows$(['', c.T('w.cr.hSrc'), c.T('w.cr.hCrest'), c.T('w.cr.h30')], SOURCES.map(s => [`<i class="wkdot" style="--c:var(--src-${s.id})"></i>`, esc(c.n.src(s.id)), `<span title="${esc(s.crest)}">${esc(c.T('crest.' + s.id))}</span>`, total ? Math.round((xp30[s.id] || 0) / total * 100) + '%' : '—']), SOURCES.findIndex(s => s.id === D.affinity)),
    ];
  }},

  {id: 'mutations', title: 'w.mu', peek: (D, c) => { const m = Object.keys(D.mutations).filter(k => D.mutations[k]); return m.length ? m.map(k => c.n.mut(k)).join(', ') : c.T('w.mu.none'); }, body: (D, c) => [
    p$(c.T('w.mu.p1')),
    ul$(Object.keys(MUTATIONS).map(k => `<b>${esc(c.n.mut(k))}</b>: ${esc(c.n.mutRule(k))}`)),
    bar$(esc(c.n.mut('shiny')), D.year.streak / 30, c.T('w.mu.days', {n: Math.min(D.year.streak, 30)}), D.mutations.shiny),
    bar$(esc(c.n.mut('cursed')), D.mutations.cursed ? 1 : 0, c.T(D.mutations.cursed ? 'w.mu.yes' : 'w.mu.no'), D.mutations.cursed),
    bar$(esc(c.n.mut('crowned')), D.year.xp / P.CROWN_XP, `${c.num(Math.min(D.year.xp, P.CROWN_XP))}/${c.num(P.CROWN_XP)}`, D.mutations.crowned),
    bar$(esc(c.n.mut('committed')), D.year.commits / P.COMMITTED, `${c.num(Math.min(D.year.commits, P.COMMITTED))}/${c.num(P.COMMITTED)}`, D.mutations.committed),
    p$(esc(c.T('w.mu.p2', {shiny: c.n.mut('shiny'), cursed: c.n.mut('cursed'), crowned: c.n.mut('crowned'), committed: c.n.mut('committed')}))),
  ]},

  {id: 'streak', title: 'w.sk', peek: (D, c) => c.T('w.days', {n: D.streak}), body: (D, c) => [
    p$(c.T('w.sk.p1')),
    p$(esc(c.T('w.sk.p2', {streaker: c.n.form('streaker'), shiny: c.n.mut('shiny')}))),
    now$(c.T('w.sk.cur'), c.T('w.days', {n: D.streak}) + (D.codedToday || !D.streak ? '' : ' · ' + c.T('w.sk.notToday'))),
    now$(c.T('w.sk.best'), c.T('w.days', {n: D.maxStreak})),
  ]},

  {id: 'energy', title: 'vital.energy', peek: D => D.count ? String(D.energy) : '—', body: (D, c) => {
    let W = 0; for (const s of D.sorted) W += s.min * Math.pow(0.5, Math.max(0, (c.now - s.at) / HOUR) / 24);
    return [
      p$(c.T('w.en.p1')),
      f$(c.T('w.en.f')),
      rows$([c.T('w.en.hSes'), c.T('vital.energy')], [['ex0', 50, 0], ['ex0', 90, 0], ['ex0', 180, 0], ['ex1', 90, 24], ['ex3', 90, 72]].map(([k, m, h]) => [c.T('w.en.' + k, {min: m}), energyFor(m, h, c.now)])),
      p$(c.T('w.en.p2')),
      now$(c.T('w.en.now'), c.num(W)),
    ];
  }},

  {id: 'hunger', title: 'w.hu', peek: (D, c) => (!D.count ? '—' : c.T(D.fading ? 'w.hu.fading' : D.starving ? 'w.hu.starving' : 'w.hu.fed')), body: (D, c) => {
    const H = P.HUNGER, spell = D.losses.find(l => l.ongoing), lost = D.losses.reduce((a, l) => a + l.xp, 0);
    const rates = STAGES.map((s, i) => [i, esc(c.n.stage(i)), c.num(P.hungerRate(i)), i < MAX_STAGE ? c.T('w.days', {n: Math.round((STAGES[i + 1].xp - s.xp) / P.hungerRate(i))}) : '—']);
    return [
      p$(c.T('w.hu.p1', {grace: H.grace, energy: H.energy})),
      p$(c.T('w.hu.p2', {ramp: H.ramp, share: Math.round(H.share * 100), cap: H.cap})),
      rows$(['', c.T('w.st.hStage'), c.T('w.hu.hRate'), c.T('w.hu.hEmpty')], rates, D.stage),
      p$(c.T('w.hu.p3', {floor: H.floor, fall: H.fall})),
      p$(c.T('w.hu.p4')),
      D.count && D.starveAt ? now$(c.T(D.starving ? 'w.hu.since' : 'w.hu.from'), c.when(D.starveAt)) : '',
      D.drain ? now$(c.T('w.hu.rate'), `−${c.num(D.drain)} XP`) : '',
      D.fading ? now$(c.T('w.hu.fall'), esc(c.T('w.hu.fallV', {stage: c.n.stage(D.stage - 1), when: c.when(D.fallAt)}))) : '',
      spell ? now$(c.T('w.hu.spell'), `−${c.num(spell.xp)} XP`) : '',
      lost && (!spell || lost > spell.xp) ? now$(c.T('w.hu.lost'), `−${c.num(lost)} XP`) : '',
      D.peak > D.stage ? now$(c.T('w.hu.peak'), esc(c.n.stage(D.peak))) : '',
    ];
  }},

  {id: 'mood', title: 'vital.mood', peek: D => D.count ? String(D.mood) : '—', body: (D, c) => {
    const k = week(D, c.now), q = Math.min(20, k.quality.length * 4);
    return [
      p$(c.T('w.mo.p1')),
      rows$(null, [
        [c.T('w.mo.r1'), k.w.length ? '+10' : '0'],
        [c.T('w.mo.r2', {n: D.streak}), '+' + D.streak * 10],
        [c.T('w.mo.r3', {n: D.variety}), '+' + D.variety * 8],
        [c.T('w.mo.r4', {n: k.quality.length}), '+' + q],
      ]),
      p$(c.T('w.mo.p2')),
      now$(c.T('vital.mood'), D.count ? D.mood : '—'),
    ];
  }},

  {id: 'rest', title: 'vital.rest', peek: D => D.count ? String(D.rest) : '—', body: (D, c) => {
    const k = week(D, c.now);
    const pen = k.w.filter(s => P.isLate(s.at) || s.min >= 240).sort((a, b) => a.at - b.at)[0];
    const back = pen ? (P.isLate(pen.at) ? 18 : 0) + (pen.min >= 240 ? 10 : 0) : 0;
    return [
      p$(c.T('w.re.p1')),
      f$(c.T('w.re.f')),
      p$(c.T('w.re.p2')), p$(c.T('w.re.p3')),
      now$(c.T('w.re.late'), k.late.length ? `${k.late.length} (−${k.late.length * 18})` : '0'),
      now$(c.T('w.re.long'), k.long.length ? `${k.long.length} (−${k.long.length * 10})` : '0'),
      pen ? now$(c.T('w.re.next'), esc(c.T('w.re.nextV', {n: back, when: c.when(pen.at + 7 * DAY)}))) : '',
    ];
  }},

  {id: 'build', title: 'vital.build', peek: D => D.ciTracked ? String(D.health) : '—', body: (D, c) => [
    p$(c.T('w.bu.p1')),
    f$(c.T('w.bu.f')),
    p$(c.T('w.bu.p2')), p$(c.T('w.bu.p3', {fix: FIX_XP})),
    D.ciTracked ? now$(c.T('w.bu.green'), c.T('w.bu.greenV', {p: D.ciPassing, n: D.ciTracked})) : now$(c.T('w.bu.tracked'), c.T('w.bu.trackedV')),
    D.failing.length ? now$(c.T('w.bu.red'), D.failing.map(k => c.ci[k] && c.ci[k].since ? esc(c.T('w.bu.since', {repo: c.label(k), when: c.when(c.ci[k].since)})) : esc(c.label(k))).join(', ')) : '',
    D.fixes ? now$(c.T('w.bu.fixes'), c.num(D.fixes)) : '',
  ]},

  {id: 'status', title: 'w.sl', peek: () => '', body: (D, c) => [
    p$(c.T('w.sl.p1')),
    `<ol>${['1', 'cool', 'fade', 'starve', '2', '3', '4', '5', '6'].map(i => `<li>${c.T('w.sl.' + i)}</li>`).join('')}</ol>`,
  ]},

  {id: 'scans', title: 'w.sc', peek: () => '', body: (D, c) => [p$(c.T('w.sc.p1')), p$(c.T('w.sc.p2')), p$(c.T('w.sc.p3'))]},

  {id: 'themes', title: 'w.th', peek: (D, c) => c.n.theme(c.theme), body: (D, c) => [
    p$(c.T('w.th.p1')),
    ul$(P.themes().map(t => `<b>${esc(c.n.theme(t.id))}</b>${t.id === c.theme ? ' ' + esc(c.T('w.th.cur')) : ''}: ${esc(STAGES.map((s, i) => c.n.bodyLower(i, t.id)).join(' → '))}`)),
    p$(c.T('w.th.p2')),
  ]},
];

const IDS = new Set(SECTIONS.map(s => s.id));
const open = new Set(['how']);
let focus = null;

function render(el, ctx) {
  if (!el) return;
  const c = Object.assign({now: Date.now(), theme: 'classic', ci: {}, lang: 'en', label: k => String(k || '').replace(/^g[hl]:/, '')}, ctx);
  const tag = I.tag(c.lang), nf = new Intl.NumberFormat(tag, {maximumFractionDigits: 0});
  const df = new Intl.DateTimeFormat(tag, {month: 'short', day: 'numeric'});
  c.T = (k, v) => I.t(c.lang, k, v);
  c.n = I.names(c.lang);
  c.num = v => nf.format(Math.round(v));
  c.when = ms => { const d = new Date(ms); return `${df.format(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const D = c.D;
  if (!el._wiki) {
    el._wiki = true;
    // 'toggle' doesn't bubble, so listen in the capture phase
    el.addEventListener('toggle', e => { const d = e.target; if (d.dataset && d.dataset.wk) { if (d.open) open.add(d.dataset.wk); else open.delete(d.dataset.wk); } }, true);
  }
  el.lang = tag;
  el.innerHTML = SECTIONS.map(s => {
    let body = '';
    try { body = [].concat(s.body(D, c)).filter(Boolean).join(''); } catch (e) { body = p$('This section could not be built: ' + esc(e.message)); }
    const peek = s.peek(D, c);
    return `<details class="wk" data-wk="${s.id}" id="wk-${s.id}"${open.has(s.id) ? ' open' : ''}><summary><span>${esc(c.T(s.title))}</span>${peek ? `<em>${esc(peek)}</em>` : ''}</summary><div class="wkb">${body}</div></details>`;
  }).join('');
  if (focus) {
    const d = el.querySelector('#wk-' + focus), box = el.closest('.tabbody');
    focus = null;
    if (d && box) box.scrollTop += d.getBoundingClientRect().top - box.getBoundingClientRect().top - 2;
  }
}
// Opens one section (and scrolls to it) on the next render.
function show(id) { if (!IDS.has(id)) return; open.add(id); focus = id; }

window.PetWiki = {render, show, SECTIONS};
})();
