/* ---------- fx: the little symbols that float off the creature while a click reaction plays ---------- */
'use strict';
const {C, mix} = require('./colors');
const {GW, G} = require('./raster');

// a plus-shaped twinkle
function star(ctx, x, y, c) { const {put} = ctx, d = mix(c, ctx.screen, 0.5); put(x, y, c); put(x - 1, y, d); put(x + 1, y, d); put(x, y - 1, d); put(x, y + 1, d); }

// where the default egg's anchors would be
const EGG = {head: [32, G - 21], box: [23, G - 20, 41, G], hold: [32, G - 10]};

function reactFx(ctx) {
  const {sprite, motion, rt, react: RX, body, screen} = ctx;
  const t = motion ? rt : 4, fade = (c, age, life) => age >= life - 2 ? mix(c, screen, 0.45) : c;
  const A = ctx.A || EGG;
  const [hx, hy] = A.head, top = y => Math.max(1, y), sx = Math.min(GW - 4, hx + 8);  // sx: clear of the crest
  switch (RX.kind) {
    case 'pat': {  // hearts float up off the head, more of them on a streak of pats
      const n = RX.n >= 3 ? 3 : 2;
      for (let k = 0; k < n; k++) {
        const age = t - k * 4, life = 10;
        if (age < 0 || age >= life) continue;
        const side = [-1, 1, 0][k], x = hx + side * 6 + (((age >> 2) & 1) ? 1 : 0), y = top(hy - 4 - age);
        sprite(['#.#', '###', '.#.'], x - 1, y, {'#': fade(C.gem, age, life)});
      }
      break;
    }
    case 'tickle': {  // little sparks fly off both sides
      const [x0, y0, x1, y1] = A.box, my = (y0 + y1) / 2;
      if (t < 12) { const k = t % 4; star(ctx, t & 1 ? x1 + 1 + k : x0 - 1 - k, my - 2 - k, C.spark); }
      break;
    }
    case 'wave': { const [wx, wy] = A.hold; if (t < 12 && (t & 2)) star(ctx, wx - 1, wy - 3, C.spark); break; }
    case 'tail': case 'flinch':  // !
      if (t < 10 && (t < 6 || (t & 1))) sprite(['#', '#', '#', '.', '#'], sx, top(hy - 7), {'#': C.yellow});
      break;
    case 'look':  // ? while it looks around for whatever poked the screen
      if (t < 12) sprite(['###', '..#', '.##', '...', '.#.'], sx, top(hy - 7), {'#': mix(body, '#ffffff', 0.6)});
      break;
    case 'angry': case 'grumpy': {  // a pulsing anger mark
      const rows = (t >> 1) & 1 ? ['#.#', '.#.', '#.#'] : ['#.#', '...', '#.#'];
      sprite(rows, hx + 3, hy + 2, {'#': C.alarm});
      break;
    }
    case 'stir':
      if (t < 8) sprite(['###', '..#', '.##', '...', '.#.'], sx, top(hy - 7), {'#': mix(body, screen, 0.35)});
      break;
    case 'wobble': if (RX.gx !== undefined && t < 6) star(ctx, RX.gx, RX.gy, C.spark); break;
  }
}

module.exports = {reactFx, star};
