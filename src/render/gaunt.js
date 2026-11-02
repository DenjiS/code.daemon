/* ---------- gaunt: a pet that went too long without code ----------
   level(D, st): 0 fed, 1 exhausted (Energy under 20, so asleep), 2 starving (losing XP, see core/hunger.js).
   An exhausted pet looks it, every theme alike, and a starving one more so:
     thin(pl, lvl)    narrows the body under the face, row by row, before anything is drawn: the head keeps its size,
                      so the body looks thinner next to it. build() and hitTest() both draw from the thinned plan.
     ribs(ctx)        ribs across the chest (front view) or down the side (a body lying long)
     sockets(ctx)     dark rings under (and when starving, over) the eyes
     fade(c, ...)     colors drained toward grey
   And a pet about to devolve flickers like a dying process: glitch(ctx), on the finished frame. */
'use strict';
const {C, mix, gray} = require('./colors');
const {GW, GH, K} = require('./raster');

function level(D, st) {
  if (!D || !D.count || !st) return 0;
  if (D.starving) return 2;
  return D.energy < 20 ? 1 : 0;
}

// a color drained toward grey and a little toward the screen
const fade = (c, lvl, screen) => (lvl ? mix(mix(c, gray(c), lvl > 1 ? 0.55 : 0.35), screen, lvl > 1 ? 0.12 : 0.06) : c);

// The cells an eye covers, rim included: [x0, y0, x1, y1]. Pixel eyes, googly eyes (Derpy) and a visor.
function eyeBox(e) {
  if (e.g) { const rx = e.rx || e.r, ry = e.r; return [Math.floor(e.x - rx - 1), Math.floor(e.y - ry - 1), Math.ceil(e.x + rx + 1), Math.ceil(e.y + ry + 1)]; }
  return [e.x, e.y, e.x + (e.w || 1) - 1, e.y + (e.visor ? 1 : e.h || 1) - 1];
}

// The rows of a set of cells: Map(y -> sorted xs)
function rows(m) {
  const r = new Map();
  for (const k of m) { const y = (k / GW) | 0; if (!r.has(y)) r.set(y, []); r.get(y).push(k % GW); }
  for (const xs of r.values()) xs.sort((a, b) => a - b);
  return r;
}

// Each run of cells in a row of m, from row `from` down, loses e cells at both ends; e from the run's length.
function narrow(m, from, cut) {
  const out = new Set(m);
  for (const [y, xs] of rows(m)) {
    if (y < from) continue;
    for (let i = 0; i < xs.length;) {
      let j = i; while (j + 1 < xs.length && xs[j + 1] === xs[j] + 1) j++;
      const e = cut(j - i + 1);
      for (let k = 0; k < e; k++) { out.delete(K(xs[i + k], y)); out.delete(K(xs[j - k], y)); }
      i = j + 1;
    }
  }
  return out;
}

function thin(pl, lvl) {
  if (!lvl || !pl || !pl.parts) return pl;
  // rows above the face stay whole: from just under the lowest eye or the mouth, whichever is lower
  let face = -Infinity;
  for (const e of pl.eyes || []) face = Math.max(face, eyeBox(e)[3]);
  if (pl.mouth) face = Math.max(face, Math.round(pl.mouth.y) + 1);
  const from = Number.isFinite(face) ? face + 2 : 0;
  const cut = lvl > 1 ? n => (n >= 10 ? 2 : n >= 5 ? 1 : 0) : n => (n >= 7 ? 1 : 0);
  const cutLimb = lvl > 1 ? n => (n >= 5 ? 1 : 0) : n => (n >= 6 ? 1 : 0);  // legs and arms get skinny, never thinner than 3
  const gone = new Set();
  let torso = null, most = 0;
  for (const p of pl.parts) {
    // flesh only: parts in a color of their own (a mortar, a shirt, a throne) keep their shape
    const limb = p.role === 'limb' || p.role === 'far', skin = typeof p.color !== 'string';
    if (!skin || (p.role !== 'body' && p.role !== 'belly' && !limb)) continue;
    const m = narrow(p.m, from, limb ? cutLimb : cut);
    if (p.role === 'body') { for (const k of p.m) if (!m.has(k)) gone.add(k); }
    p.m = m;
    if (p.role === 'body' && !p.color) { let n = 0; for (const k of m) if (((k / GW) | 0) >= from) n++; if (n > most) { most = n; torso = p; } }
  }
  // a belly never shows where the body under it was taken away
  for (const p of pl.parts) if (p.role === 'belly') for (const k of gone) p.m.delete(k);
  pl.gaunt = {lvl, from, torso};
  return pl;
}

// Ribs on the torso, drawn over the body and belly but under anything in front of them (arms, wings).
function ribs(ctx) {
  const {pl, owner, put, screen, pal} = ctx, g = pl.gaunt;
  if (!g || !g.torso || !owner) return;
  const own = k => { const p = owner.get(k); return p === g.torso || (p && p.role === 'belly'); };
  const cells = [...g.torso.m].filter(k => ((k / GW) | 0) >= g.from && own(k));
  if (cells.length < 30) return;
  let x0 = GW, x1 = 0, y0 = GH, y1 = 0;
  for (const k of cells) { const x = k % GW, y = (k / GW) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const w = x1 - x0 + 1, h = y1 - y0 + 1, cx = Math.round((x0 + x1) / 2), t = g.lvl > 1 ? 0.45 : 0.3;
  const inside = k => own(k) && own(k - 1) && own(k + 1) && own(k - GW) && own(k + GW);
  const shade = (x, y) => { const k = K(x, y); if (inside(k)) put(x, y, mix(owner.get(k).paint || pal.body, screen, t)); };
  if (w >= h * 1.6) {
    // a body lying long, seen from the side: ribs run down it, over its front half
    const from = Math.round(cx - w * 0.05), to = Math.round(cx + w * 0.3);
    for (let x = from; x <= to; x += 2) for (let y = y0 + 1; y <= y0 + Math.round(h * 0.7); y++) shade(x, y);
  } else {
    // seen from the front: ribs across the chest, both sides of the breastbone
    const last = y0 + Math.max(3, Math.round(h * (g.lvl > 1 ? 0.65 : 0.5)));
    for (let y = y0 + 1; y <= last; y += 2) {
      const half = Math.round(w * 0.36 * (1 - 0.35 * (y - y0) / h));
      for (let x = cx - half; x <= cx + half; x++) if (Math.abs(x - cx) >= 1) shade(x, y);
    }
  }
}

// Sunken eyes: a dark ring under each eye, and over it too when starving. Only on the creature, never on an eye.
function sockets(ctx) {
  const {pl, owner, put, skin, screen} = ctx, g = pl.gaunt;
  if (!g || !owner) return;
  const boxes = pl.eyes.map(eyeBox);
  const free = (x, y) => owner.has(K(x, y)) && !boxes.some(([a, b, c, d]) => x >= a && x <= c && y >= b && y <= d);
  const deep = mix(skin, screen, g.lvl > 1 ? 0.62 : 0.5), brow = mix(skin, screen, 0.4);
  for (const [x0, y0, x1, y1] of boxes) {
    for (let x = x0; x <= x1; x++) if (free(x, y1 + 1)) put(x, y1 + 1, deep);
    if (free(x0 - 1, y1)) put(x0 - 1, y1, deep);
    if (free(x1 + 1, y1)) put(x1 + 1, y1, deep);
    if (g.lvl > 1) for (let x = x0; x <= x1; x++) if (free(x, y0 - 1)) put(x, y0 - 1, brow);
  }
}

// About to devolve: now and then a band of rows slips sideways and dims, like a process about to be killed.
function glitch(ctx) {
  const {D, buf, f, motion, screen, A} = ctx;
  if (!D.fading || !motion) return;
  const k = f % 24;
  if (k > 2) return;
  const [, y0, , y1] = A.box, span = Math.max(4, y1 - y0);
  const top = Math.round(y0 + ((f * 7) % span)), n = k === 1 ? 3 : 2, dx = (f >> 3) & 1 ? 1 : -1;
  for (let y = top; y < Math.min(GH, top + n); y++) {
    const row = [];
    for (let x = 0; x < GW; x++) { const c = buf.get(K(x, y)); if (c) row.push([x, c]); }
    for (const [x] of row) buf.delete(K(x, y));
    for (const [x, c] of row) if (x + dx >= 0 && x + dx < GW) buf.set(K(x + dx, y), k === 2 ? mix(c, screen, 0.5) : c);
  }
  if (k === 0) for (let i = 0; i < 6; i++) {  // a few dead pixels
    const x = (f * 13 + i * 11) % GW, y = Math.round(y0 + ((f * 5 + i * 7) % span));
    if (buf.has(K(x, y))) buf.set(K(x, y), mix(C.steel, screen, 0.4));
  }
}

module.exports = {level, fade, eyeBox, thin, ribs, sockets, glitch};
