/* ---------- eggs ----------
   drawEgg(): the default stage 0, for themes without drawsEgg. eggCrack(): the crack that grows toward hatching,
   for a theme's own egg (call it from the stage 0 plan's decor). */
'use strict';
const {clamp} = require('../core/util');
const {STAGES} = require('../core/rules');
const {mix} = require('./colors');
const {G, px, paint} = require('./raster');
const {reactFx} = require('./fx');

// how far along hatching is, 0 to 1
const hatching = D => clamp(D.xp / STAGES[1].xp, 0, 1);

function drawEgg(ctx) {
  const {D, f, motion, has, body, screen, eye, put, rp, react} = ctx;
  const w = (f % 48) - 43, wob = motion && has && w > 0 ? [0, 1, -1, 1, 0][w] : 0;  // a wobble every 6 seconds
  const cx = 32 + wob, cy = G - 10 + 0.5;
  for (let x = 24; x <= 40; x++) put(x, G + 1, mix(body, screen, 0.8));
  ctx.move(rp.ox, 0, 1);
  const m = new Set();
  eggShape(m, cx, cy);
  paint(put, m, body, screen, (x, y) => ((x * 7 + y * 13) % 11 === 0 ? mix(body, screen, 0.42) : null));
  const p = hatching(D);
  if (has && p > 0) {
    const path = [[-7, 0], [-6, 1], [-5, 0], [-4, 1], [-3, 2], [-2, 1], [-1, 0], [0, 1], [1, 2], [2, 1], [3, 0], [4, 1], [5, 0], [6, 1], [7, 0]];
    const n = Math.ceil(p * path.length);
    for (let i = 0; i < n; i++) put(cx + path[i][0], Math.round(cy) - 2 + path[i][1], eye);
  }
  if (react && react.kind === 'wobble') { ctx.move(0, 0, 1); reactFx(ctx); }
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
