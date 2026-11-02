/* ---------- figure: what a drawn theme's plans() returns ----------
   {parts, eyes, mouth, a, main?, decor?}, see the theme contract in themes.js. partList() gives plans() its parts list;
   withAnchors() fills in the anchors a theme left out. */
'use strict';
const {G, GW} = require('./raster');

// parts: the shapes in drawing order. part(role, {zone, color, pattern, flat}) adds one and returns its Set of cells.
function partList() {
  const parts = [];
  const part = (role, opts) => { const m = new Set(); parts.push(Object.assign({m, role}, opts)); return m; };
  return {parts, part};
}

// Anchors from the parts' bounding box, for any a theme leaves out: the box itself, the top of the head at its
// top center, the hand and side at its left edge, the rear at its left middle and the Unity cube up and to the right.
function withAnchors(a, parts) {
  a = a || {};
  if (a.box && a.head && a.side && a.hold && a.rear && a.cube) return a;
  let box = a.box;
  if (!box) {
    let x0 = GW, y0 = G, x1 = 0, y1 = 0;
    for (const p of parts) for (const k of p.m) { const x = k % GW, y = (k / GW) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    box = x1 >= x0 ? [x0, y0, x1, Math.max(y1, a.float ? y1 : G)] : [24, G - 16, 40, G];
  }
  const [x0, y0, x1, y1] = box, cx = Math.round((x0 + x1) / 2), cy = Math.round((y0 + y1) / 2);
  return Object.assign({box, head: [cx, y0], side: [x0 - 3, cy], hold: [x0 - 2, cy + 2], rear: [x0 - 1, cy], cube: [x1 + 6, y0 - 4]}, a, {box});
}

module.exports = {partList, withAnchors};
