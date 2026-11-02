/* ---------- face: eyes and mouth ----------
   The default face draws the plan's pixel eyes ({x, y, w, h}, or a visor) and pixel mouth. It blinks, sleeps, shows
   mood and sickness, and swaps in an expression while a clip asks for one (ctx.pose.face, ctx.pose.mouth).
   A theme with a face of its own sets face(ctx) and can reuse drawEye() and drawMouth() from here, as Derpy does. */
'use strict';
const {CREST_STAGE} = require('../core/rules');
const {C, mix} = require('./colors');

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
