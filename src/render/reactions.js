/* ---------- clicks ----------
   For themes with reacts: true (every built-in theme): their parts say which zone they are. The widget asks
   hitTest() what a click touched, picks a clip with reactionFor(), and plays it: opts.clip = {name, t, n, gx, gy} to
   build() for the clip's len ticks (n: a streak of the same reaction, gx, gy: the cell clicked). Clips are in clips.js;
   reactions are cosmetic and never change stats. */
'use strict';
const {MAX_STAGE} = require('../core/rules');
const {G, K} = require('./raster');
const {themeOf} = require('./themes');
const {pose} = require('./pose');
const {level, thin} = require('./gaunt');

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
