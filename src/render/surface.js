// The surface one frame is drawn on: a Map(cell index -> color), and a transform a click reaction uses to move or
// squash the creature (ox, oy, sq toward the ground row). put() draws through the transform, put0() on the fixed screen.
'use strict';
const {GW, GH, G, K} = require('./raster');

function surface() {
  const buf = new Map(), t = {ox: 0, oy: 0, sq: 1};
  const put0 = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < GW && y < GH) buf.set(K(x, y), c); };
  const row = y => (t.sq === 1 ? y : G - (G - y) * t.sq) + t.oy;
  const cell = (x, y) => {
    x = Math.round(x + t.ox); y = Math.round(row(y));
    return x >= 0 && y >= 0 && x < GW && y < GH ? K(x, y) : -1;
  };
  const put = (x, y, c) => { const k = cell(x, y); if (k >= 0) buf.set(k, c); };
  const get = (x, y) => buf.get(cell(x, y));
  // Keep an ornament's top row visible in this pose; whole-cell shifts preserve its pixel pattern.
  const top = y => Math.round(row(y)) < 0 ? y + Math.ceil(-row(y) / t.sq) : y;
  // rows of characters, each looked up in colors; characters without a color are transparent
  const sprite = (rows, x0, y0, colors) => rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const c = colors[row[i]]; if (c) put(x0 + i, y0 + j, c); } });
  const move = (ox, oy, sq) => { t.ox = ox; t.oy = oy; t.sq = sq; };
  return {buf, put, put0, get, top, sprite, move, transform: t};
}

module.exports = {surface};
