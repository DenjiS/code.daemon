/* ---------- decor: small extras a stage can ask for in plan.decor(ctx), drawn over the face ---------- */
'use strict';
const {mix} = require('./colors');
const {G} = require('./raster');

// darker bands across a belly, every third row, under the head (dragons and the like)
function bellyPlates(ctx) {
  const {A, get, put, pal, screen} = ctx, [hx] = A.head;
  for (let y = G - 18; y <= G - 5; y += 3) for (let x = hx - 4; x <= hx + 4; x++) if (get(x, y) === pal.belly) put(x, y, mix(pal.belly, screen, 0.3));
}

module.exports = {bellyPlates};
