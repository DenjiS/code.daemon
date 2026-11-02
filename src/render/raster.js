/* ======================================================================
   Raster: the 64 x 48 cell screen. A shape is a Set of cell indexes (K(x, y)); paint() shades it into a buffer.
   ====================================================================== */
'use strict';
const {clamp} = require('../core/util');
const {mix} = require('./colors');

const GW = 64, GH = 48, G = 41;  // G = ground row the feet stand on
const K = (x, y) => y * GW + x;

/* raster primitives on a Set of cell indexes */
function px(m, x, y) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < GW && y < GH) m.add(K(x, y)); }
function ellipse(m, cx, cy, rx, ry) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1.02) px(m, x, y);
    }
}
function ring(m, cx, cy, rx, ry, w) {
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry, d = Math.sqrt(dx * dx + dy * dy);
      if (Math.abs(d - 1) * Math.min(rx, ry) <= w / 2) px(m, x, y);
    }
}
function poly(m, pts) {
  const ys = pts.map(p => p[1]);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= y && by > y) || (by <= y && ay > y)) xs.push(ax + (y - ay) / (by - ay) * (bx - ax));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.round(xs[i]); x <= Math.round(xs[i + 1]); x++) px(m, x, y);
  }
}
// tapered thick line from (x0,y0,r0) to (x1,y1,r1)
function limb(m, x0, y0, x1, y1, r0, r1) {
  if (r1 === undefined) r1 = r0;
  const R = Math.max(r0, r1), dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1;
  for (let y = Math.floor(Math.min(y0, y1) - R); y <= Math.ceil(Math.max(y0, y1) + R); y++)
    for (let x = Math.floor(Math.min(x0, x1) - R); x <= Math.ceil(Math.max(x0, x1) + R); x++) {
      const t = clamp(((x - x0) * dx + (y - y0) * dy) / L2, 0, 1);
      const qx = x0 + t * dx, qy = y0 + t * dy, r = r0 + (r1 - r0) * t;
      if ((x - qx) * (x - qx) + (y - qy) * (y - qy) <= r * r + 0.15) px(m, x, y);
    }
}
// smooth tapered chain through points [[x,y,r],...]
function chain(m, pts) { for (let i = 0; i + 1 < pts.length; i++) limb(m, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], pts[i][2], pts[i + 1][2]); }
// cut a polygon out of a shape
function carve(m, pts) { const t = new Set(); poly(t, pts); for (const k of t) m.delete(k); }

// draw one shaded part: top edge lit, bottom and right edges shaded
function paint(put, m, color, screen, extra, glow) {
  const sh = mix(color, screen, 0.45), hi = mix(color, '#ffffff', 0.45);
  for (const k of m) {
    const x = k % GW, y = (k / GW) | 0;
    let c = color;
    if (glow) c = color;
    else if (!m.has(k + GW)) c = sh;
    else if (!m.has(k - GW)) c = hi;
    else if (!m.has(k + 1)) c = sh;
    else { const e = extra && extra(x, y); if (e) c = e; }
    put(x, y, c);
  }
}

module.exports = {GW, GH, G, K, px, ellipse, ring, poly, limb, chain, carve, paint};
