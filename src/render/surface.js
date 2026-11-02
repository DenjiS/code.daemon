// The surface one frame is drawn on: a Map(cell index -> color), and a transform a click reaction uses to move or
// squash the creature (ox, oy, sq toward the ground row). put() draws through the transform, put0() on the fixed screen.
'use strict';
const {GW, GH, G, K} = require('./raster');

function surface() {
  const buf = new Map(), t = {ox: 0, oy: 0, sq: 1};
  const put0 = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < GW && y < GH) buf.set(K(x, y), c); };
  const put = (x, y, c) => put0(x + t.ox, (t.sq === 1 ? y : G - (G - y) * t.sq) + t.oy, c);
  // rows of characters, each looked up in colors; characters without a color are transparent
  const sprite = (rows, x0, y0, colors) => rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const c = colors[row[i]]; if (c) put(x0 + i, y0 + j, c); } });
  const move = (ox, oy, sq) => { t.ox = ox; t.oy = oy; t.sq = sq; };
  return {buf, put, put0, sprite, move, transform: t};
}

module.exports = {surface};
