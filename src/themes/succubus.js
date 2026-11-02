/* Succubus: a little imp that grows up into a succubus queen and then ascends. Chibi and cute while she grows
   (stages 1-5); a grown-up temptress from the lamia on: bare shoulders over a corset with a sweetheart neckline,
   a narrow waist, thigh-high boots with pink garters, painted lips, a hand on her hip.
   Skin in the affinity color; wings, hair and outfit are darker shades of it, so the whole look follows the affinity.
   Hearts everywhere: on the tail tip, in her hands, trailing behind her when she flies. */
'use strict';
const {G, px, ellipse, ring, poly, limb, chain} = require('../render/raster');
const {partList} = require('../render/figure');
const {eggShape, eggCrack} = require('../render/egg');
const {mix} = require('../render/colors');

module.exports = {
  id: 'succubus', name: 'Succubus', accent: '#FF5C9E', drawsEgg: true, reacts: true,
  bodies: ['Heart egg', 'Imp slime', 'Bat imp', 'Chibi imp', 'Chibi succubus', 'Young succubus', 'Lamia', 'Succubus', 'Flying succubus', 'Succubus queen', 'Ascended'],
  plans,
};

const PINK = '#FF5A7A', GOLD = '#E8C25A';
// shades of the skin (the affinity color): hair, outfit, the throne, rays of light
const hair = skin => mix(skin, '#40206E', 0.5);
const outfit = skin => mix(skin, '#0E0B16', 0.78);
const throne = skin => mix(skin, '#0E0B16', 0.86);
const light = skin => mix(mix(skin, '#FFFFFF', 0.6), '#080A0E', 0.35);
const laces = x0 => (x, y) => (x === x0 && y % 2 === 0 ? PINK : null);  // a row of pink laces down the middle

function heart(m, x, y, big) {
  const rows = big ? ['.#.#.', '#####', '#####', '.###.', '..#..'] : ['#.#', '###', '.#.'];
  const w = rows[0].length;
  rows.forEach((r, j) => { for (let i = 0; i < w; i++) if (r[i] === '#') px(m, x - (w >> 1) + i, y + j); });
}
// bat wings, both sides, from the shoulders at (x, y): span out, h tall, raised by flap
function wings(m, x, y, span, h, flap) {
  for (const s of [-1, 1]) poly(m, [[x + s * 2, y - 1], [x + s * span * 0.45, y - h - flap], [x + s * span, y - h * 0.45 - flap], [x + s * span * 0.88, y + h * 0.45],
    [x + s * span * 0.72, y + h * 0.05], [x + s * span * 0.57, y + h * 0.6], [x + s * span * 0.42, y + h * 0.15], [x + s * span * 0.27, y + h * 0.62], [x + s * 2, y + h * 0.35]]);
}
// curved horns from the top of a head at (x, y), w apart: out, up, and the tips turning out again
function horns(m, x, y, w, k = 1) {
  for (const s of [-1, 1]) chain(m, [[x + s * w, y, 1.1 * k], [x + s * (w + 1.6 * k), y - 1.4 * k, 0.85 * k], [x + s * (w + 2.2 * k), y - 3 * k, 0.6 * k], [x + s * (w + 3.2 * k), y - 3.8 * k, 0.4]]);
}

function plans(st, f, mo) {
  const {parts, part} = partList();
  const bob = mo.bob, walk = mo.walk, flap = mo.flap, sway = mo.sway, live = mo.motion && !mo.sleeping;
  let eyes = [], mouth = null, a = {}, decor = null;
  const cx = 32;
  const blush = (pts) => { const b = part('cheek', {zone: 'head', color: PINK, flat: true}); pts.forEach(([x, y]) => { px(b, x, y); px(b, x + 1, y); }); };
  // the tail: a thin curve from the hips, a heart on the tip
  const tail = (pts) => {
    const t = part('limb', {zone: 'tail'}); chain(t, pts.map(([x, y]) => [x, y, 0.6]));
    const [hx, hy] = pts[pts.length - 1], tip = part('core', {zone: 'tail', color: PINK, flat: true}); heart(tip, hx, hy - 1, true);
  };
  // a girl's hair behind her head and shoulders: a bob, twin tails, or long locks down her back
  const hairBack = (x, y, r, style) => {
    const back = part('limb', {zone: 'head', color: hair});
    ellipse(back, x, y + 0.5, r + 1, r + 0.6);
    if (style === 'long') for (const s of [-1, 1]) chain(back, [[x + s * (r + 0.3), y + 1, 1.8], [x + s * (r + 1.2), y + r + 3, 1.6], [x + s * (r + 1.6 + (s > 0 && live ? sway * 0.6 : 0)), y + r + 8, 1]]);
    if (style === 'twin') for (const s of [-1, 1]) chain(back, [[x + s * (r + 1), y - 1, 2.2], [x + s * (r + 3), y + 4 + (live && s > 0 ? sway : 0), 2], [x + s * (r + 2.5), y + 9, 1.2]]);
  };
  // her face, the fringe and horns on top; eyes and mouth placed for its size. Grown up: almond eyes and pink lips.
  const head = (x, y, r, grown) => {
    const face = part('body', {zone: 'head'}); ellipse(face, x, y + 0.5, r, r * 0.92);
    const fringe = part('limb', {zone: 'head', color: hair});
    poly(fringe, [[x - r - 0.5, y + 1], [x - r, y - r * 0.6], [x - r * 0.4, y - r - 0.5], [x + r * 0.4, y - r - 0.5], [x + r, y - r * 0.6], [x + r + 0.5, y + 1],
      [x + r * 0.6, y - r * 0.25], [x + r * 0.15, y - r * 0.15], [x - r * 0.3, y - r * 0.3], [x - r * 0.7, y - r * 0.1]]);
    const hr = part('horn', {zone: 'head'}); horns(hr, x, y - r + 0.5, r * 0.45, r >= 6 ? 1.2 : 0.9);
    const big = r >= 6, ex = big ? 3 : 2;
    eyes = [{x: x - ex - (big ? 1 : 0), y: Math.round(y), w: big ? 2 : 1, h: big ? 2 : 1}, {x: x + ex - (big ? 1 : 0) + (big ? 1 : 0), y: Math.round(y), w: big ? 2 : 1, h: big ? 2 : 1}];
    mouth = {x: x - 1, y: Math.round(y + r * 0.55), w: big ? 3 : 2};
    if (grown) {
      eyes = [{x: x - 3, y: Math.round(y), w: 2, h: 1}, {x: x + 2, y: Math.round(y), w: 2, h: 1}];
      mouth = {x: x - 1, y: Math.round(y + 2.5), w: 2, color: PINK};
      return;
    }
    blush(big ? [[x - r + 0.5, y + 2], [x + r - 1.5, y + 2]] : [[x - r + 0.5, y + 1.5], [x + r - 1.5, y + 1.5]]);
  };
  // a corset over a short skirt, from the shoulders (y0) to the hips (y1)
  const corset = (x, y0, y1, w) => {
    const c = part('body', {zone: 'body', color: outfit, pattern: laces(x)}); poly(c, [[x - w, y0], [x + w, y0], [x + w * 0.75, y1 - 3], [x + w + 1, y1], [x - w - 1, y1], [x - w * 0.75, y1 - 3]]);
    const trim = part('core', {zone: 'body', color: PINK, flat: true}); px(trim, x - w + 1, y0); px(trim, x + w - 1, y0);
  };
  // legs from the hips (y0) to the soles (y1), boots on the last third
  const legs = (x, y0, y1, gap, step = 0) => {
    const l = part('body', {zone: 'legs'}); limb(l, x - gap, y0, x - gap - step, y1 - 1, 1.3, 1); limb(l, x + gap, y0, x + gap + step, y1 - 1, 1.3, 1);
    const boot = part('limb', {zone: 'legs', color: outfit}), bt = y1 - Math.round((y1 - y0) * 0.45);
    limb(boot, x - gap - step * 0.6, bt, x - gap - step, y1 - 1, 1.15); limb(boot, x + gap + step * 0.6, bt, x + gap + step, y1 - 1, 1.15);
    const cuff = part('core', {zone: 'legs', color: PINK, flat: true}); px(cuff, x - gap - step * 0.6, bt); px(cuff, x + gap + step * 0.6, bt);
  };
  const arms = (x, y, w, lh, rh) => { const ar = part('body', {zone: 'arm'}); chain(ar, [[x - w, y, 1.1], ...lh]); chain(ar, [[x + w, y, 1.1], ...rh]); };
  // Grown up: bare shoulders and an hourglass in skin, from the shoulders (ys) through the waist (yw) to the hips (yh),
  // under a corset that starts at a sweetheart neckline; hip shifts the hips aside for a contrapposto stance.
  const figure = (x, ys, yw, yh, hip = 0) => {
    const t = part('body', {zone: 'body'});
    poly(t, [[x - 4.5, ys], [x + 4.5, ys], [x + 3.2, ys + 2.5], [x + 2.4, yw], [x + 3.7 + hip, yh], [x - 3.7 + hip, yh], [x - 2.4, yw], [x - 3.2, ys + 2.5]]);
    const yb = ys + 3;
    const c = part('body', {zone: 'body', color: outfit, pattern: (px0, py) => (px0 === x && py > yb + 1 && py % 2 === 0 ? PINK : null)});
    poly(c, [[x - 3.4, yb], [x - 2, yb - 1], [x - 0.6, yb], [x, yb + 1], [x + 0.6, yb], [x + 2, yb - 1], [x + 3.4, yb], [x + 2.5, yw], [x + 3.9 + hip, yh + 1], [x - 3.9 + hip, yh + 1], [x - 2.5, yw]]);
    const trim = part('core', {zone: 'body', color: PINK, flat: true});
    [[-3, 0], [-2, -1], [-1, 0], [1, 0], [2, -1], [3, 0]].forEach(([dx, dy]) => px(trim, x + dx, yb + dy));
    const neck = part('body', {zone: 'head'}); limb(neck, x, ys - 0.5, x, ys - 2, 1);
  };
  // Grown-up legs, each through [hip, knee, foot]: long and bare above thigh-high boots with a pink garter band.
  const longLegs = (...legs) => {
    const l = part('body', {zone: 'legs'}), boot = part('limb', {zone: 'legs', color: outfit}), band = part('core', {zone: 'legs', color: PINK, flat: true});
    for (const [[hx, hy], [kx, ky], [fx, fy]] of legs) {
      chain(l, [[hx, hy, 1.7], [kx, ky, 1.2], [fx, fy, 0.9]]);
      const bx = hx + (kx - hx) * 0.7, by = hy + (ky - hy) * 0.7;  // the boots reach just above the knee
      chain(boot, [[bx, by, 1.4], [kx, ky, 1.25], [fx, fy, 1.05]]); px(boot, fx + (fx >= hx ? 1 : -1), fy);
      px(band, bx - 0.6, by); px(band, bx + 0.6, by);
    }
  };
  // hearts floating up from (x, y) and fading
  const floatHearts = (x, y, n, dx = -3) => ctx => {
    if (!live) return;
    for (let k = 0; k < n; k++) {
      const age = (f + k * 4) % 12, hx = x + dx * k - (age >> 2), hy = y - age;
      const m = new Set(); heart(m, hx, hy, k === 0);
      for (const q of m) ctx.put(q % 64, (q / 64) | 0, age > 8 ? mix(PINK, ctx.screen, 0.5) : PINK);
    }
  };

  switch (st) {
    case 0: { // HEART EGG: an egg in the affinity color, dotted with pink, that rocks now and then
      const w = (f % 48) - 43, wob = mo.motion && mo.has && w > 0 ? [0, 1, -1, 1, 0][w] : 0;
      const ex = cx + wob, cy = G - 10 + 0.5;
      const b = part('body', {zone: 'egg', pattern: (x, y) => ((x - wob) * 5 + y * 3) % 9 === 0 ? PINK : null}); eggShape(b, ex, cy);
      const h = part('core', {zone: 'egg', color: PINK, flat: true}); heart(h, ex, cy - 1, true);
      a = {head: [ex, cy - 11], side: [ex - 10, cy], hold: [ex - 10, cy + 2], rear: [ex - 9, cy], cube: [ex + 13, cy - 10], box: [ex - 8, cy - 10, ex + 8, G]};
      decor = ctx => eggCrack(ctx, ex, cy - 6, PINK);
      break;
    }
    case 1: { // IMP SLIME: a soft blob with little horns, rosy cheeks and a heart-tipped tail
      const sq = bob ? 0.8 : 0, rx = 8 + sq, ry = 6.5 - sq, cy = G - ry + 0.5;
      tail([[cx + rx - 1, cy + 2], [cx + rx + 4, cy + 1], [cx + rx + 6, cy - 3 - sway]]);
      const hr = part('horn', {zone: 'head'}); horns(hr, cx, cy - ry + 1, 3, 0.8);
      const b = part('body', {zone: 'body'}); ellipse(b, cx, cy, rx, ry);
      const sh = part('belly', {zone: 'body'}); px(sh, cx - 5, cy - 3); px(sh, cx - 6, cy - 2);
      eyes = [{x: cx - 4, y: cy - 1, w: 2, h: 1}, {x: cx + 2, y: cy - 1, w: 2, h: 1}];
      mouth = {x: cx - 1, y: cy + 1, w: 2};
      blush([[cx - 6, cy + 1], [cx + 4, cy + 1]]);
      a = {head: [cx, cy - ry - 3], side: [cx - 10, cy], hold: [cx - 10, cy + 2], rear: [cx - 10, cy], cube: [cx + 13, cy - 12], box: [cx - 9, cy - ry - 3, cx + 15, G], split: cy};
      break;
    }
    case 2: { // BAT IMP: a round bat with big ears, wide wings and fangs, hovering
      const cy = G - 15 - bob;
      const wg = part('membrane', {zone: 'wing'}); wings(wg, cx, cy - 1, 17, 6, flap * 3);
      tail([[cx + 2, cy + 5], [cx + 5, cy + 9], [cx + 9, cy + 10 - sway]]);
      const ears = part('body', {zone: 'head'}); poly(ears, [[cx - 6, cy - 2], [cx - 5, cy - 10], [cx - 1, cy - 4]]); poly(ears, [[cx + 6, cy - 2], [cx + 5, cy - 10], [cx + 1, cy - 4]]);
      const b = part('body', {zone: 'body'}); ellipse(b, cx, cy, 6.5, 6);
      const feet = part('limb', {zone: 'legs'}); px(feet, cx - 2, cy + 6); px(feet, cx + 2, cy + 6); px(feet, cx - 2, cy + 7); px(feet, cx + 2, cy + 7);
      eyes = [{x: cx - 3, y: cy - 1, w: 1, h: 2}, {x: cx + 2, y: cy - 1, w: 1, h: 2}];
      mouth = {x: cx - 1, y: cy + 2, w: 3, fangs: true};
      blush([[cx - 5, cy + 1], [cx + 3, cy + 1]]);
      a = {head: [cx, cy - 11], side: [cx - 18, cy], hold: [cx - 7, cy + 3], rear: [cx - 6, cy + 2], cube: [cx + 19, cy - 12], box: [cx - 17, cy - 11, cx + 17, G], split: cy - 1};
      break;
    }
    case 3: { // CHIBI IMP: a big head with a bob, little wings, a heart in her hand
      const y0 = -bob, hy = G - 17 + y0;
      const wg = part('membrane', {zone: 'wing'}); wings(wg, cx, G - 13 + y0, 13, 5, flap * 2);
      tail([[cx + 3, G - 7 + y0], [cx + 8, G - 5], [cx + 11, G - 9 - sway]]);
      legs(cx, G - 7 + y0, G, 1.5);
      const dress = part('body', {zone: 'body', color: outfit, pattern: laces(cx)}); poly(dress, [[cx - 3, G - 12 + y0], [cx + 3, G - 12 + y0], [cx + 5, G - 6 + y0], [cx - 5, G - 6 + y0]]);
      arms(cx, G - 11 + y0, 3.5, [[cx - 6, G - 8 + y0, 0.9]], [[cx + 6, G - 9 + y0 - sway, 0.9]]);
      hairBack(cx, hy, 6.5, 'bob'); head(cx, hy, 6.5);
      const h = part('core', {zone: 'arm', color: PINK, flat: true}); heart(h, cx + 7, G - 12 + y0 - sway, false);
      a = {head: [cx, hy - 9], side: [cx - 14, G - 12], hold: [cx - 6, G - 8 + y0], rear: [cx - 5, G - 8], cube: [cx + 15, hy - 8], box: [cx - 14, hy - 9, cx + 14, G]};
      break;
    }
    case 4: { // CHIBI SUCCUBUS: twin tails, bigger wings, a heart held to her chest
      const y0 = -bob, hy = G - 18 + y0;
      const wg = part('membrane', {zone: 'wing'}); wings(wg, cx, G - 14 + y0, 15, 6, flap * 2);
      tail([[cx + 3, G - 7 + y0], [cx + 9, G - 5], [cx + 12, G - 10 - sway]]);
      legs(cx, G - 7 + y0, G, 1.5);
      const dress = part('body', {zone: 'body', color: outfit, pattern: laces(cx)}); poly(dress, [[cx - 3, G - 13 + y0], [cx + 3, G - 13 + y0], [cx + 5, G - 6 + y0], [cx - 5, G - 6 + y0]]);
      arms(cx, G - 12 + y0, 3.5, [[cx - 2, G - 9 + y0, 0.9]], [[cx + 2, G - 9 + y0, 0.9]]);
      hairBack(cx, hy, 6.5, 'twin'); head(cx, hy, 6.5);
      const h = part('core', {zone: 'body', color: PINK, flat: true}); heart(h, cx, G - 11 + y0, true);
      a = {head: [cx, hy - 9], side: [cx - 16, G - 13], hold: [cx - 3, G - 9 + y0], rear: [cx - 5, G - 8], cube: [cx + 17, hy - 8], box: [cx - 16, hy - 9, cx + 16, G]};
      break;
    }
    case 5: { // YOUNG SUCCUBUS: taller now, long hair, a corset and boots
      const y0 = -bob, hy = G - 28 + y0;
      const wg = part('membrane', {zone: 'wing'}); wings(wg, cx, G - 23 + y0, 13, 5, flap * 2);
      hairBack(cx, hy, 4.5, 'long');
      tail([[cx + 2, G - 13 + y0], [cx + 8, G - 9], [cx + 11, G - 5], [cx + 13, G - 9 - sway]]);
      legs(cx, G - 13 + y0, G, 1.5, walk * 0.5);
      corset(cx, G - 23 + y0, G - 12 + y0, 3);
      arms(cx, G - 22 + y0, 3.5, [[cx - 5, G - 18 + y0, 0.9], [cx - 3, G - 15 + y0, 0.8]], [[cx + 5, G - 18 + y0, 0.9], [cx + 6, G - 14 + y0 - sway, 0.8]]);
      const neck = part('body', {zone: 'head'}); limb(neck, cx, G - 24 + y0, cx, G - 25 + y0, 1);
      head(cx, hy, 4.5);
      a = {head: [cx, hy - 7], side: [cx - 14, G - 20], hold: [cx + 6, G - 14 + y0 - sway], rear: [cx - 4, G - 14], cube: [cx + 15, hy - 6], box: [cx - 14, hy - 7, cx + 15, G]};
      break;
    }
    case 6: { // LAMIA: grown up above the waist, a long scaled tail below, one hand in her hair
      const y0 = -bob, hy = G - 30 + y0, ph = mo.phase, path = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        path.push([cx + 2 - 30 * t * t, G - 13 + y0 + 12 * Math.min(1, t * 2.2) - 1.5 * Math.sin(t * 8 - ph) * t, 3.4 - 2.4 * t]);
      }
      const wg = part('membrane', {zone: 'wing'}); wings(wg, cx, G - 25 + y0, 12, 5, flap * 2);
      hairBack(cx, hy, 4.5, 'long');
      const coil = part('body', {zone: 'tail', pattern: (x, y) => ((x + 2 * y) % 4 === 0 ? mix(PINK, '#FFFFFF', 0.4) : null)}); chain(coil, path);
      const [tx, ty] = path[12], tip = part('core', {zone: 'tail', color: PINK, flat: true}); heart(tip, tx - 2, ty - 3, true);
      figure(cx, G - 25 + y0, G - 19 + y0, G - 14 + y0);
      arms(cx, G - 24.5 + y0, 4.2, [[cx - 7, G - 27 + y0 - sway, 0.95], [cx - 5, G - 30 + y0 - sway, 0.8]], [[cx + 6.5, G - 20 + y0, 0.95], [cx + 3.5, G - 16.5 + y0, 0.8]]);
      head(cx, hy, 4.5, true);
      a = {head: [cx, hy - 7], side: [cx - 13, G - 22], hold: [cx - 5, G - 30 + y0 - sway], rear: [tx, ty], cube: [cx + 15, hy - 6], box: [cx - 29, hy - 7, cx + 14, G], tailX: cx - 3};
      break;
    }
    case 7: { // SUCCUBUS: grown up, weight on one leg, a hand on her hip, wings spread wide
      const y0 = -bob, hy = G - 33 + y0, hip = 1;
      const wg = part('membrane', {zone: 'wing'}); wings(wg, cx, G - 27 + y0, 19, 7, flap * 3);
      hairBack(cx, hy, 4.5, 'long');
      tail([[cx + 3, G - 15 + y0], [cx + 9, G - 11], [cx + 13, G - 6], [cx + 15, G - 11 - sway]]);
      longLegs([[cx - 0.7 + hip, G - 15 + y0], [cx - 1.5, G - 8], [cx - 1, G - 1]], [[cx + 2.3 + hip, G - 15 + y0], [cx + 1.2, G - 8 - walk * 0.5], [cx + 3, G - 1]]);
      figure(cx, G - 27 + y0, G - 21 + y0, G - 16 + y0, hip);
      arms(cx, G - 26.5 + y0, 4.2, [[cx - 7, G - 22 + y0, 0.95], [cx - 3.4 + hip, G - 18 + y0, 0.8]], [[cx + 6, G - 21 + y0, 0.95], [cx + 7, G - 16 + y0 - sway, 0.8]]);
      head(cx, hy, 4.5, true);
      a = {head: [cx, hy - 7], side: [cx - 17, G - 22], hold: [cx + 7, G - 16 + y0 - sway], rear: [cx - 4, G - 16], cube: [cx + 21, hy - 4], box: [cx - 20, hy - 7, cx + 20, G]};
      break;
    }
    case 8: { // FLYING SUCCUBUS: aloft, one knee drawn up, an arm reaching ahead, a trail of hearts behind her
      const fy = Math.round(Math.sin(mo.phase * 0.7) * 1.4), y0 = -3 + fy, hy = G - 33 + y0;
      const wg = part('membrane', {zone: 'wing'}); wings(wg, cx, G - 27 + y0, 21, 8, flap * 4);
      hairBack(cx, hy, 4.5, 'long');
      tail([[cx + 2, G - 15 + y0], [cx + 8, G - 13 + y0], [cx + 12, G - 9 + y0], [cx + 15, G - 12 + y0 - sway]]);
      longLegs([[cx - 1.6, G - 15 + y0], [cx - 2.5, G - 9 + y0], [cx - 1, G - 3 + y0]], [[cx + 1.6, G - 15 + y0], [cx + 4.5, G - 11 + y0], [cx + 4, G - 6 + y0]]);
      figure(cx, G - 27 + y0, G - 21 + y0, G - 16 + y0);
      arms(cx, G - 26.5 + y0, 4.2, [[cx - 8, G - 26 + y0, 0.95], [cx - 11, G - 29 + y0, 0.8]], [[cx + 6.5, G - 22 + y0, 0.95], [cx + 3.4, G - 18 + y0, 0.8]]);
      head(cx, hy, 4.5, true);
      a = {head: [cx, hy - 7], side: [cx - 19, G - 24 + y0], hold: [cx - 11, G - 29 + y0], rear: [cx - 4, G - 10 + y0], cube: [cx + 23, hy - 3], box: [cx - 21, hy - 7, cx + 21, G - 3 + y0], float: true};
      decor = floatHearts(cx - 14, G - 12 + y0, 3);
      break;
    }
    case 9: { // SUCCUBUS QUEEN: on a dark throne trimmed with gold, legs crossed, a tiara in her hair
      const y0 = -bob, hy = G - 31 + y0;
      const wg = part('membrane', {zone: 'wing'}); wings(wg, cx, G - 26 + y0, 22, 9, flap * 3);
      hairBack(cx, hy, 4.5, 'long');
      const th = part('far', {zone: 'body', color: throne, pattern: (x, y) => (y === G - 33 || y === G - 9 ? GOLD : null)});
      poly(th, [[cx - 9, G - 34], [cx + 9, G - 34], [cx + 9, G - 7], [cx - 9, G - 7]]);
      const seat = part('limb', {zone: 'body', color: throne, pattern: (x, y) => (y === G - 6 ? GOLD : (x - cx) % 6 === 0 && y === G - 2 ? GOLD : null)});
      poly(seat, [[cx - 11, G - 6], [cx + 11, G - 6], [cx + 11, G], [cx - 11, G]]);
      tail([[cx + 3, G - 13 + y0], [cx + 11, G - 11], [cx + 14, G - 14 - sway]]);
      // one leg crossed over the other
      longLegs([[cx + 1.6, G - 14 + y0], [cx + 2.5, G - 10], [cx + 2, G - 6.5]], [[cx - 1.6, G - 14 + y0], [cx - 0.5, G - 11], [cx + 5, G - 8]]);
      figure(cx, G - 26 + y0, G - 20 + y0, G - 15 + y0);
      arms(cx, G - 25.5 + y0, 4.2, [[cx - 6.5, G - 21 + y0, 0.95], [cx - 6, G - 15 + y0, 0.8]], [[cx + 7, G - 22 + y0, 0.95], [cx + 3.4, G - 17.5 + y0, 0.8]]);
      head(cx, hy, 4.5, true);
      const tiara = part('core', {zone: 'head', color: GOLD, flat: true}); [[-2, -5], [0, -6], [2, -5], [-1, -5], [1, -5], [0, -7]].forEach(([dx, dy]) => px(tiara, cx + dx, hy + dy));
      const gem = part('core', {zone: 'head', color: PINK, flat: true}); px(gem, cx, hy - 6);
      a = {head: [cx, hy - 8], side: [cx - 20, G - 20], hold: [cx - 6, G - 15 + y0], rear: [cx - 11, G - 4], cube: [cx + 23, hy - 2], box: [cx - 22, G - 40, cx + 22, G]};
      decor = floatHearts(cx + 14, G - 22, 2, 3);
      break;
    }
    case 10: { // ASCENDED: floating in a burst of light with a halo, wings of light, hearts circling
      const fy = Math.round(Math.sin(mo.phase * 0.7) * 1.4), y0 = -1 + fy, hy = G - 32 + y0, cy = G - 22 + y0;
      const rays = part('far', {zone: 'wing', color: light, flat: true});
      for (let k = 0; k < 8; k++) {
        const ang = k * Math.PI / 4 + Math.PI / 8 + (live ? f * 0.04 : 0), r0 = 12, r1 = k % 2 ? 18 : 23;
        limb(rays, cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0 * 0.7, cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1 * 0.7, 0.45);
      }
      const wg = part('membrane', {zone: 'wing', color: skin => mix(skin, '#FFFFFF', 0.15)}); wings(wg, cx, G - 26 + y0, 18, 7, flap * 3);
      hairBack(cx, hy, 4.5, 'long');
      tail([[cx + 2, G - 15 + y0], [cx + 7, G - 11 + y0], [cx + 9, G - 7 + y0], [cx + 12, G - 9 + y0 - sway]]);
      longLegs([[cx - 1.5, G - 14 + y0], [cx - 1.8, G - 9 + y0], [cx - 1, G - 3 + y0]], [[cx + 1.5, G - 14 + y0], [cx + 3, G - 9 + y0], [cx + 2, G - 4 + y0]]);
      figure(cx, G - 26 + y0, G - 20 + y0, G - 15 + y0);
      arms(cx, G - 25.5 + y0, 4.2, [[cx - 7, G - 28 + y0, 0.95], [cx - 9, G - 32 + y0, 0.8]], [[cx + 7, G - 28 + y0, 0.95], [cx + 9, G - 32 + y0, 0.8]]);
      head(cx, hy, 4.5, true);
      const halo = part('core', {zone: 'head', color: GOLD, flat: true}); ring(halo, cx, hy - 7, 4.5, 1.2, 1);
      a = {head: [cx, hy - 9], side: [cx - 20, cy], hold: [cx - 9, G - 32 + y0], rear: [cx, G - 4 + y0], cube: [cx + 22, 6], box: [cx - 22, hy - 9, cx + 22, G - 4 + y0], float: true};
      decor = ctx => {  // hearts circling her
        for (let k = 0; k < 4; k++) {
          const ang = (live ? f * 0.12 : 0.5) + k * Math.PI / 2, hx = Math.round(cx + 19 * Math.cos(ang)), hy2 = Math.round(cy + 6 * Math.sin(ang));
          const m = new Set(); heart(m, hx, hy2, false);
          for (const q of m) ctx.put(q % 64, (q / 64) | 0, Math.sin(ang) < 0 ? mix(PINK, ctx.screen, 0.45) : PINK);
        }
      };
      break;
    }
  }
  return {parts, eyes, mouth, a, decor};
}
