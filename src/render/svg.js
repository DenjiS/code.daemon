/* ---------- animated SVG card (for a README) ---------- */
'use strict';
const {clamp} = require('../core/util');
const {SRC, STAGES, MAX_STAGE, FORMS, MUTATIONS, PET} = require('../core/rules');
const {statusLine} = require('../core/derive');
const {C} = require('./colors');
const {GW} = require('./raster');
const {themeColors, stageBody} = require('./themes');
const {build} = require('./build');

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
