/* ---------- fx: what floats off the creature while a clip plays ----------
   A clip names its effect (clip.fx = 'hearts') or brings its own function fx(ctx, t). Effects are drawn last, on top.
   t is the clip's tick; under reduced motion every effect shows one still frame (t = 4). */
'use strict';
const {C, mix} = require('./colors');
const {GW, G} = require('./raster');

// a plus-shaped twinkle
function star(ctx, x, y, c) { const {put} = ctx, d = mix(c, ctx.screen, 0.5); put(x, y, c); put(x - 1, y, d); put(x + 1, y, d); put(x, y - 1, d); put(x, y + 1, d); }

// where the default egg's anchors would be
const EGG = {head: [32, G - 21], box: [23, G - 20, 41, G], hold: [32, G - 10]};
// the anchors to place an effect by, the top of the head, a row kept on screen, and a column clear of the crest
const spot = ctx => {
  const A = ctx.A || EGG, [hx, hy] = A.head;
  return {A, hx, hy, top: y => Math.max(1, y), sx: Math.min(GW - 4, hx + 8)};
};
const QUESTION = ['###', '..#', '.##', '...', '.#.'];

const FX = {
  hearts(ctx, t) {  // hearts float up off the head, more of them on a streak of pats
    const {hx, hy, top} = spot(ctx), n = ctx.play.n >= 3 ? 3 : 2;
    for (let k = 0; k < n; k++) {
      const age = t - k * 4, life = 10;
      if (age < 0 || age >= life) continue;
      const side = [-1, 1, 0][k], x = hx + side * 6 + (((age >> 2) & 1) ? 1 : 0), y = top(hy - 4 - age);
      ctx.sprite(['#.#', '###', '.#.'], x - 1, y, {'#': age >= life - 2 ? mix(C.gem, ctx.screen, 0.45) : C.gem});
    }
  },
  sparks(ctx, t) {  // little sparks fly off both sides
    const {A} = spot(ctx), [x0, y0, x1, y1] = A.box, my = (y0 + y1) / 2;
    if (t < 12) { const k = t % 4; star(ctx, t & 1 ? x1 + 1 + k : x0 - 1 - k, my - 2 - k, C.spark); }
  },
  twinkle(ctx, t) { const [wx, wy] = spot(ctx).A.hold; if (t < 12 && (t & 2)) star(ctx, wx - 1, wy - 3, C.spark); },  // at the waving hand
  exclaim(ctx, t) { const {hy, top, sx} = spot(ctx); if (t < 10 && (t < 6 || (t & 1))) ctx.sprite(['#', '#', '#', '.', '#'], sx, top(hy - 7), {'#': C.yellow}); },
  question(ctx, t) { const {hy, top, sx} = spot(ctx); if (t < 12) ctx.sprite(QUESTION, sx, top(hy - 7), {'#': mix(ctx.body, '#ffffff', 0.6)}); },
  drowsy(ctx, t) { const {hy, top, sx} = spot(ctx); if (t < 8) ctx.sprite(QUESTION, sx, top(hy - 7), {'#': mix(ctx.body, ctx.screen, 0.35)}); },
  anger(ctx, t) {  // a pulsing anger mark on the forehead
    const {hx, hy} = spot(ctx);
    ctx.sprite((t >> 1) & 1 ? ['#.#', '.#.', '#.#'] : ['#.#', '...', '#.#'], hx + 3, hy + 2, {'#': C.alarm});
  },
  poke(ctx, t) { const {gx, gy} = ctx.play; if (gx !== undefined && t < 6) star(ctx, gx, gy, C.spark); },  // where the click landed
  burst(ctx, t) {  // stars flying out of the creature in a ring, gold and then fading
    const {A} = spot(ctx), [x0, y0, x1, y1] = A.box, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const r = 4 + t * 1.6, rx = (x1 - x0) / 2 + r, ry = (y1 - y0) / 2 * 0.6 + r * 0.6;
    if (t >= 16) return;
    for (let k = 0; k < 8; k++) {
      const ang = k * Math.PI / 4 + t * 0.08, x = Math.round(cx + rx * Math.cos(ang)), y = Math.round(cy + ry * Math.sin(ang));
      if (y < 0 || y > G + 2 || x < 0 || x >= GW) continue;
      const c = t < 8 ? C.gold : t < 12 ? C.spark : mix(C.spark, ctx.screen, 0.5);
      if (k % 2) ctx.put(x, y, c); else star(ctx, x, y, c);
    }
  },
  crumble(ctx, t) {  // bits of the creature come loose and fall to the ground, greying as they go
    const {A} = spot(ctx), [x0, y0, x1] = A.box, c = ctx.skin || ctx.body;
    for (let k = 0; k < 8; k++) {
      const age = t - k * 2;
      if (age < 0) continue;
      const x = Math.round(x0 + 2 + (x1 - x0 - 4) * (((k * 37) % 100) / 100)), y = Math.round(y0 + 3 + ((k * 23) % 9) + age * age * 0.12 + age * 0.4);
      if (y > G) continue;
      ctx.put(x, y, mix(c, ctx.screen, Math.min(0.75, 0.2 + age * 0.06)));
      if (age < 4) ctx.put(x + 1, y, mix(c, ctx.screen, 0.45));
    }
  },
};

function playFx(ctx) {
  const fx = ctx.clip.fx, draw = typeof fx === 'function' ? fx : FX[fx];
  if (draw) draw(ctx, ctx.motion ? ctx.ct : 4);
}

module.exports = {FX, playFx, star};
