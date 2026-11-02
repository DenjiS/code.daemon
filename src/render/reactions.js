/* ---------- click reactions ----------
   For themes with reacts: true (Classic, Demonic and Succubus). The widget asks hitTest() what a click touched, picks a reaction
   with reactionFor(), and then passes opts.react = {kind, t, n, gx, gy} to build() for REACTIONS[kind].len frames
   (t counts 8 fps ticks from the click). Reactions are cosmetic: they never change stats.
   motionOf() also gives every drawn theme its idle motion (bob, walk, flap, sway), with or without a reaction. */
'use strict';
const {clamp, own} = require('../core/util');
const {STAGES, MAX_STAGE} = require('../core/rules');
const {G, K} = require('./raster');
const {themeOf} = require('./themes');

const canReact = id => !!themeOf(id).reacts;
const REACTIONS = {
  pat: {len: 16}, tickle: {len: 14}, wave: {len: 14}, hop: {len: 10}, tail: {len: 12}, flutter: {len: 14},
  look: {len: 16}, angry: {len: 20}, stir: {len: 12}, grumpy: {len: 16}, wobble: {len: 8}, flinch: {len: 8},
};
const ANGRY_AT = 6;  // this many clicks in a row (see the widget's combo window) makes it cross
const BY_ZONE = {head: 'pat', body: 'tickle', arm: 'wave', legs: 'hop', tail: 'tail', wing: 'flutter'};
// combo: how many clicks landed in quick succession, this one included
function reactionFor(D, zone, combo) {
  const st = Math.min(D.stage, MAX_STAGE), sleeping = D.count > 0 && st > 0 && D.energy < 20;
  if (st === 0) return 'wobble';
  if (sleeping) return combo >= 3 ? 'grumpy' : 'stir';
  if (combo >= ANGRY_AT) return 'angry';
  if (!zone) return 'look';
  if (D.sick) return zone === 'head' ? 'pat' : 'flinch';  // too poorly to hop or show off
  return BY_ZONE[zone] || 'tickle';
}
const shake = t => (t & 1 ? 1 : -1);
// What a reaction does at tick t: whole-body offset (ox, oy), squash toward the ground (sq),
// motion overrides for the plans (mo), and how the face looks.
function reactPose(R, motion) {
  const out = {ox: 0, oy: 0, sq: 1, mo: null, face: null, mouth: null};
  if (!R || !own(REACTIONS, R.kind)) return out;
  const t = clamp(R.t | 0, 0, REACTIONS[R.kind].len - 1), m = motion;
  switch (R.kind) {
    case 'pat': out.face = 'joy'; out.mouth = 'smile'; if (m && t < 4) out.sq = [0.92, 0.88, 0.92, 0.96][t]; break;
    case 'tickle': out.face = 'giggle'; out.mouth = 'open'; if (m && t < 12) out.ox = shake(t); break;
    case 'wave': out.face = 'joy'; out.mouth = 'smile'; if (m) out.mo = {sway: (t >> 1) & 1}; break;
    case 'hop': {
      const air = t < 7;
      out.face = air ? 'wow' : 'joy'; out.mouth = air ? 'o' : 'smile';
      if (m) { out.oy = [0, -2, -4, -5, -5, -4, -2, 0, 0, 0][t]; if (t === 7) out.sq = 0.88; if (t === 8) out.sq = 0.95; out.mo = {walk: t & 1}; }
      break;
    }
    case 'tail': out.face = 'wow'; out.mouth = 'o'; if (m) { out.oy = [-1, -2, -1][t] || 0; out.mo = {sway: t & 1}; } break;
    case 'flutter': out.face = 'joy'; out.mouth = 'smile'; if (m) { out.oy = -[1, 2, 3, 3, 3, 3, 3, 3, 2, 2, 1, 1, 0, 0][t]; out.mo = {flap: t & 1}; } break;
    case 'look': out.face = 'look'; break;
    case 'angry': case 'grumpy': out.face = 'angry'; out.mouth = 'frown'; if (m && t < (R.kind === 'angry' ? 10 : 4)) out.ox = shake(t); break;
    case 'stir': out.face = t >= 2 && t < 10 ? 'peek' : null; if (m && t < 2) out.ox = shake(t); break;
    case 'wobble': if (m) out.ox = [1, -1, 1, -1, 1, 0, 0, 0][t]; break;
    case 'flinch': out.face = 'wow'; out.mouth = 'o'; if (m && t < 4) out.ox = shake(t); break;
  }
  return out;
}
// The motion phase build() animates with, shared with hitTest() so clicks land on what is on screen.
function motionOf(D, f, opts) {
  const st = Math.min(D.stage, MAX_STAGE), has = D.count > 0, motion = !opts.reduced, mut = D.mutations || {};
  const sleeping = has && st > 0 && D.energy < 20;
  const mo = {
    bob: motion && !sleeping && !D.critical ? ((f >> 2) & 1) : 0,
    walk: motion && !sleeping ? ((f >> 2) & 1) : 0,
    flap: motion && !sleeping ? ((f >> 2) & 1) : 0,
    sway: motion && !sleeping ? ((f >> 3) & 1) : 0,
    alt: motion ? ((f >> 1) & 1) : 0,
    phase: motion ? f * 0.4 : 0,
    hatch: clamp(D.xp / STAGES[1].xp, 0, 1),
    has, motion, sleeping, mut,
  };
  const rp = canReact(opts.theme) ? reactPose(opts.react, motion) : reactPose(null, motion);
  if (rp.mo) Object.assign(mo, rp.mo);
  return {st, mo, rp, motion, sleeping};
}
const FALLBACK_ZONE = {limb: 'legs', far: 'legs', membrane: 'wing', horn: 'head', eyeWhite: 'head', core: 'body', belly: 'body'};
// What a click at grid cell (gx, gy) touched: 'head', 'body', 'arm', 'legs', 'tail', 'wing', 'egg', or null for a miss.
// Only themes with reacts: true answer; for the rest it returns undefined, and the widget leaves clicks alone.
function hitTest(D, f, opts, gx, gy) {
  opts = opts || {};
  const T = themeOf(opts.theme);
  if (!T.reacts) return undefined;
  const {st, mo, rp} = motionOf(D, f, opts);
  // undo the reaction's own offset and squash
  const x = Math.round(gx - rp.ox), y = Math.round(G - (G - (gy - rp.oy)) / rp.sq);
  if (st === 0 && !T.drawsEgg) { const dx = (x - 32) / 9, dy = (y - (G - 9.5)) / 10.5; return dx * dx + dy * dy <= 1 ? 'egg' : null; }
  const pl = T.plans(st, f, mo), A = pl.a;
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

module.exports = {REACTIONS, reactionFor, canReact, motionOf, hitTest};
