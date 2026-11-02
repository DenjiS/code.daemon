/* ---------- status: the ground shadow and what the pet's state shows on top ---------- */
'use strict';
const {C, mix} = require('./colors');
const {GW, GH, G, K} = require('./raster');

// A shadow on the ground that shrinks while the creature is in the air; flyers trail falling motes instead.
function shadow(ctx) {
  const {A, put, put0, f, skin, screen, transform: t} = ctx;
  if (!A.float) {
    const [x0, , x1] = A.box, lift = Math.round(-t.oy / 2);
    for (let x = Math.round(x0 + (x1 - x0) * 0.2) + lift; x <= Math.round(x1 - (x1 - x0) * 0.2) - lift; x++) put0(x + t.ox, G + 1, mix(skin, screen, 0.82));
  } else {
    const cy = A.rear[1] + 3;
    for (let i = 0; i < 4; i++) if (((f >> 1) + i) % 4 !== 0) put(32 + (i - 1.5) * 3, Math.min(GH - 4, cy + ((f + i * 3) % 6)), mix(skin, screen, 0.5));
  }
}

// The last two stages have four motes circling them, passing behind the body.
function orbit(ctx) {
  const {A, put, buf, st, f, motion, body} = ctx;
  if (st < 9) return;
  const [x0, y0, x1] = A.box, cx = (x0 + x1) / 2, cy = (y0 + G) / 2;
  for (let k = 0; k < 4; k++) {
    const ang = (motion ? f * 0.11 : 0.6) + k * Math.PI / 2;
    const ox = Math.round(cx + ((x1 - x0) / 2 + 2) * Math.cos(ang)), oy = Math.round(cy + 4 * Math.sin(ang));
    if (Math.sin(ang) < 0 && buf.has(K(ox, oy))) continue;
    put(ox, oy, st === 10 ? '#FFFFFF' : mix(body, '#ffffff', 0.6));
  }
}

function shiny(ctx) {
  const {A, put, mut, motion, f, screen} = ctx;
  if (!mut.shiny || !motion) return;
  const [x0, y0, x1, y1] = A.box;
  const sp = [[x0 + 2, y0 + 2], [x1 - 1, y0 + 6], [(x0 + x1) / 2, y0 - 1], [x1 - 3, y1 - 4], [x0 + 3, y1 - 8]];
  const [sx, sy] = sp[(f >> 1) % sp.length];
  put(sx, sy, C.spark); put(sx - 1, sy, mix(C.spark, screen, 0.5)); put(sx + 1, sy, mix(C.spark, screen, 0.5)); put(sx, sy - 1, mix(C.spark, screen, 0.5)); put(sx, sy + 1, mix(C.spark, screen, 0.5));
}

// CI failing: a sweat drop, an alarm mark, and coughs when critical.
function sick(ctx) {
  const {A, M, put, D, mo, motion, f} = ctx;
  if (!D.sick) return;
  const [hx, hy] = A.head;
  if (!motion || mo.walk) { put(hx + 6, hy + 3, C.drop); put(hx + 6, hy + 4, C.drop); put(hx + 5, hy + 5, C.drop); }
  const mx = Math.min(GW - 2, Math.round(A.box[2]) + 2), my = Math.max(2, Math.round(A.box[1]));
  if (!motion || mo.alt) { for (let j = 0; j < 4; j++) put(mx, my + j, C.alarm); put(mx, my + 5, C.alarm); }
  if (D.critical && motion && M && (f % 8) < 3) { const k = f % 8, cx2 = M.x + M.w + 2 + k * 2, cy2 = M.y - k; put(cx2, cy2, C.steel); put(cx2 + 1, cy2, C.steel); put(cx2, cy2 - 1, C.steel); }
}

// Z's rising off the head.
function sleep(ctx) {
  const {A, sprite, sleeping, motion, f, body, screen} = ctx;
  if (!sleeping) return;
  const [hx, hy] = A.head, k = motion ? ((f >> 3) % 3) : 1;
  sprite(['####', '..#.', '.#..', '####'], hx + 6 + k * 2, hy - 4 - k * 3, {'#': k === 2 ? mix(body, screen, 0.4) : mix(body, '#ffffff', 0.6)});
}

module.exports = {shadow, orbit, shiny, sick, sleep};
