/* Demonic: the Classic line from hell, in crimson and obsidian with lava inside, on a dark red screen.
   Creatures bring their own colors; the affinity shows in the crest above the head. Eyes glow, embers drift up. */
'use strict';
const {G, px, ellipse, poly, limb, chain} = require('../render/raster');
const {partList} = require('../render/figure');
const {eggShape, eggCrack} = require('../render/egg');
const {mix} = require('../render/colors');

module.exports = {
  id: 'demonic', name: 'Demonic', accent: '#D8322A', screen: '#0E0709', dot: '#1E1015', drawsEgg: true, reacts: true,
  bodies: ['Obsidian egg', 'Shadow slime', 'Spider imp', 'Impling', 'Hell kaiju', 'Hellhound', 'Hell serpent', 'Demon', 'Infernal wyvern', 'Archdemon', 'Void lord'],
  plans,
};

const S = {
  red: '#B3263C', redDark: '#7A1A2C', wing: '#6B1E2E', bone: '#E6D8B8', obsidian: '#3A2C36', char: '#3E3038', charDark: '#2A2027',
  lava: '#FF6A1F', lavaHot: '#FFB33B', ember: '#FF4422', glow: '#FFD23A', steel: '#9AA0AE', void: '#3C2A4E', voidLight: '#6A4C86',
};
// lava showing through cracks: a loose diagonal lattice, brighter where the lines cross
const lavaVeins = (dx = 0) => (x, y) => { x -= dx; const a = ((x + 2 * y) % 9 + 9) % 9, b = ((3 * x - y) % 13 + 13) % 13; return a === 0 && b < 4 ? S.lavaHot : b === 0 && a < 3 ? S.lava : null; };
const lavaBands = (x, y) => (y % 3 === 0 ? S.lavaHot : S.lava);

function plans(st, f, mo) {
  const {parts, part} = partList();
  const bob = mo.bob, walk = mo.walk, flap = mo.flap, sway = mo.sway, alt = mo.alt, live = mo.motion && !mo.sleeping;
  let eyes = [], mouth = null, a = {}, main = S.red, decor = null;
  const cx = 32;
  const glowEyes = (pts, w = 2, h = 1) => { eyes = pts.map(([x, y]) => ({x, y, w, h, glow: S.glow})); };
  // horns curving out and up from (x, y), s = -1 left, 1 right
  const horns = (m, x, y, s, len = 1) => chain(m, [[x, y, 1.3 * len], [x + s * 2.5 * len, y - 2.5 * len, 1], [x + s * 2 * len, y - 5 * len, 0.5]]);
  // embers drifting up from (x, y) while it is awake
  const embers = (x, y, n = 3) => ctx => {
    if (!live) return;
    for (let k = 0; k < n; k++) {
      const age = (f + k * 5) % 12, ex = x + (k - (n - 1) / 2) * 4 + ((age >> 2) & 1);
      if (age < 9) ctx.put(ex, y - age, age > 5 ? mix(S.ember, ctx.screen, 0.5) : age > 2 ? S.lava : S.lavaHot);
    }
  };
  // flames licking up from a row of points, flickering frame to frame
  const flames = (xs, y, tall = 0) => ctx => {
    xs.forEach((x, i) => {
      const h = 2 + tall + ((i + (live ? f >> 1 : 0)) % 3), lean = (i + (live ? f : 0)) % 2;
      for (let j = 0; j < h; j++) {
        const c = j < h / 3 ? S.ember : j < h - 1 ? S.lava : S.lavaHot, xj = x + (j >= h - 2 ? lean : 0);
        ctx.put(xj, y - j, c);
        if (tall && j < h - 2) ctx.put(xj + 1, y - j, j < h / 3 ? S.lava : S.lavaHot);
      }
    });
  };

  switch (st) {
    case 0: { // OBSIDIAN EGG: black glass veined with lava; it rocks now and then, and the crack glows
      const wob = mo.has ? mo.rock : 0;
      const ex = cx + wob, cy = G - 10 + 0.5;
      main = S.obsidian;
      const b = part('body', {zone: 'egg', pattern: lavaVeins(wob)}); eggShape(b, ex, cy);
      a = {head: [ex, cy - 11], side: [ex - 10, cy], hold: [ex - 10, cy + 2], rear: [ex - 9, cy], cube: [ex + 13, cy - 10], box: [ex - 8, cy - 10, ex + 8, G]};
      decor = ctx => { eggCrack(ctx, ex, cy - 3, S.lavaHot); if (mo.has && mo.hatch > 0.5) embers(ex, cy - 11, 2)(ctx); };
      break;
    }
    case 1: { // SHADOW SLIME: a crimson droplet with stubby horns and a toothy grin
      const sq = bob ? 0.8 : 0, rx = 8 + sq, ry = 6.5 - sq, cy = G - ry + 0.5;
      const hr = part('horn', {zone: 'head'}); horns(hr, cx - 4, cy - ry + 2, -1, 0.7); horns(hr, cx + 4, cy - ry + 2, 1, 0.7);
      const b = part('body', {zone: 'body'}); ellipse(b, cx, cy, rx, ry); poly(b, [[cx - 3, cy - ry + 2], [cx + 0.5, cy - ry - 4 + sq], [cx + 3, cy - ry + 2]]);
      const sh = part('belly', {zone: 'body'}); px(sh, cx - 5, cy - 3); px(sh, cx - 6, cy - 2); px(sh, cx - 5, cy - 2);
      glowEyes([[cx - 4, cy - 1], [cx + 2, cy - 1]]);
      mouth = {x: cx - 1, y: cy + 2, w: 3, fangs: true};
      a = {head: [cx, cy - ry - 4], side: [cx - 10, cy], hold: [cx - 10, cy + 2], rear: [cx - 10, cy], cube: [cx + 13, cy - 12], box: [cx - 9, cy - ry - 4, cx + 9, G], split: cy};
      decor = embers(cx, cy - ry - 5, 2);
      break;
    }
    case 2: { // SPIDER IMP: a squat body on six jointed legs, horns, four eyes
      const cy = G - 9 - bob * 0.5;
      const legs = part('limb', {zone: 'legs'});
      for (const s of [-1, 1]) [0, 1, 2].forEach(i => {
        const up = ((i + walk + (s > 0 ? 1 : 0)) & 1) ? 1 : 0, hx = cx + s * (5 + i * 2.5), kx = cx + s * (11 + i * 3.5), fx = cx + s * (13 + i * 4);
        chain(legs, [[hx, cy + 1, 1.3], [kx, cy - 5 + i - up, 1.1], [fx, G - up, 0.9]]);
      });
      const b = part('body', {zone: 'body'}); ellipse(b, cx, cy, 9.5, 6);
      const hr = part('horn', {zone: 'head'}); horns(hr, cx - 4, cy - 5, -1, 0.8); horns(hr, cx + 4, cy - 5, 1, 0.8);
      const bel = part('belly', {zone: 'body', color: S.redDark}); ellipse(bel, cx, cy + 3.5, 6, 1.6);
      eyes = [{x: cx - 4, y: cy - 2, w: 2, h: 1, glow: S.glow}, {x: cx + 2, y: cy - 2, w: 2, h: 1, glow: S.glow}, {x: cx - 2, y: cy - 4, w: 1, h: 1, glow: S.lava}, {x: cx + 1, y: cy - 4, w: 1, h: 1, glow: S.lava}];
      mouth = {x: cx - 1, y: cy + 1, w: 3, fangs: true};
      a = {head: [cx, cy - 9], side: [cx - 21, cy - 2], hold: [cx - 12, cy - 4], rear: [cx - 12, cy], cube: [cx + 17, cy - 15], box: [cx - 21, cy - 12, cx + 21, G]};
      break;
    }
    case 3: { // IMPLING: a round little devil with bat wings, big horns and an arrow tail
      const cy = G - 12.5 - bob;
      const wing = part('membrane', {zone: 'wing', color: S.wing});
      for (const s of [-1, 1]) poly(wing, [[cx + s * 6, cy - 3], [cx + s * 15, cy - 9 - flap * 2], [cx + s * 17, cy - 2 - flap], [cx + s * 14, cy + 1], [cx + s * 11, cy - 1], [cx + s * 8, cy + 3]]);
      const tail = part('limb', {zone: 'tail'}); chain(tail, [[cx + 6, cy + 6, 1.2], [cx + 12, cy + 7, 1], [cx + 15, cy + 3 - sway, 0.8]]);
      const tip = part('horn', {zone: 'tail', color: S.redDark}); poly(tip, [[cx + 13, cy + 2 - sway], [cx + 16, cy - 2 - sway], [cx + 18, cy + 3 - sway]]);
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx - 4, cy + 7, cx - 5, G - 1, 1.8); limb(legs, cx + 4, cy + 7, cx + 5, G - 1, 1.8);
      ellipse(legs, cx - 6, G - 0.5, 2.8, 1.2); ellipse(legs, cx + 6, G - 0.5, 2.8, 1.2);
      const b = part('body', {zone: 'body'}); ellipse(b, cx, cy, 9.5, 9);
      const bel = part('belly', {zone: 'body', color: '#D9675A'}); ellipse(bel, cx, cy + 3.5, 5.5, 4);
      const hr = part('horn', {zone: 'head'}); horns(hr, cx - 5, cy - 6, -1, 1.2); horns(hr, cx + 5, cy - 6, 1, 1.2);
      const arms = part('limb', {zone: 'arm'}); limb(arms, cx - 9, cy + 1, cx - 12, cy + 4 - sway * 3, 1.3, 1); limb(arms, cx + 9, cy + 1, cx + 12, cy + 4, 1.3, 1);
      glowEyes([[cx - 5, cy - 2], [cx + 3, cy - 2]]);
      mouth = {x: cx - 1, y: cy + 1, w: 3, fangs: true};
      a = {head: [cx, cy - 12], side: [cx - 16, cy + 1], hold: [cx - 12, cy + 4 - sway * 3], rear: [cx - 11, cy], cube: [cx + 17, cy - 13], box: [cx - 17, cy - 14, cx + 18, G], split: cy + 1};
      break;
    }
    case 4: { // HELL KAIJU: an upright lizard with a lava belly, bone spikes, and embers on its breath
      const y0 = -bob;
      const tail = part('limb', {zone: 'tail'}); chain(tail, [[cx - 5, G - 8 + y0, 3.2], [cx - 13, G - 5, 2.2], [cx - 19, G - 7 - sway, 1]]);
      const tsp = part('horn', {zone: 'tail'}); [[cx - 12, G - 8], [cx - 16, G - 8 - sway]].forEach(([x, y]) => poly(tsp, [[x - 1.2, y + 1], [x, y - 2], [x + 1.2, y + 1]]));
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx - 4, G - 9 + y0, cx - 5, G - 1, 2.4); limb(legs, cx + 4, G - 9 + y0, cx + 5, G - 1, 2.4);
      ellipse(legs, cx - 6, G - 0.5, 3.6, 1.4); ellipse(legs, cx + 6, G - 0.5, 3.6, 1.4);
      const armB = part('far', {zone: 'arm'}); limb(armB, cx - 5, G - 16 + y0, cx - 9, G - 12 + y0, 1.3, 1);
      const b = part('body', {zone: 'body'}); ellipse(b, cx, G - 12.5 + y0, 8, 8.5);
      const bel = part('belly', {zone: 'body', color: S.lava, pattern: (x, y) => ((x + y) % 3 === 0 ? S.redDark : (x - y) % 3 === 0 ? S.lavaHot : null)}); ellipse(bel, cx + 1.5, G - 11 + y0, 4.5, 5.5);
      const head = part('body', {zone: 'head'}); ellipse(head, cx + 1, G - 24 + y0, 8, 6.5); ellipse(head, cx + 7, G - 21.5 + y0, 4.5, 3.2);
      const hr = part('horn', {zone: 'head'}); horns(hr, cx - 3, G - 29 + y0, -1, 1); horns(hr, cx + 3, G - 30 + y0, 1, 1);
      const sp = part('horn', {zone: 'body'}); [[cx - 7, G - 20], [cx - 8, G - 15], [cx - 8, G - 10]].forEach(([x, y]) => poly(sp, [[x + 1, y - 1.5 + y0], [x - 2.5, y + y0], [x + 1, y + 1.5 + y0]]));
      const armF = part('limb', {zone: 'arm'}); limb(armF, cx + 6, G - 16 + y0, cx + 10, G - 12 + y0 - sway * 3, 1.4, 1.1);
      eyes = [{x: cx + 2, y: G - 26 + y0, w: 2, h: 1, glow: S.glow, slit: true}];
      mouth = {x: cx + 8, y: G - 21 + y0, w: 3, fangs: true};
      a = {head: [cx + 1, G - 35 + y0], side: [cx - 14, G - 16], hold: [cx + 11, G - 12 + y0 - sway * 3], rear: [cx - 19, G - 9], cube: [cx + 16, G - 36], box: [cx - 19, G - 35, cx + 13, G]};
      decor = embers(cx + 15, G - 22 + y0, 3);
      break;
    }
    case 5: { // HELLHOUND: a charcoal hound with flames along its back and a spiked collar
      const y0 = -bob;
      main = S.char;
      const tail = part('limb', {zone: 'tail'}); chain(tail, [[cx - 13, G - 12 + y0, 2.4], [cx - 18, G - 16, 1.8], [cx - 21, G - 22 + sway, 1.2]]);
      const far = part('far', {zone: 'legs'}); limb(far, cx + 4, G - 8 + y0, cx + 3 - walk * 2, G - 1, 1.6); limb(far, cx - 7, G - 8 + y0, cx - 6 + walk * 2, G - 1, 1.6);
      const b = part('body', {zone: 'body', pattern: (x, y) => ((x + 2 * y) % 6 === 0 && y > G - 15 ? S.redDark : null)}); ellipse(b, cx - 2, G - 11 + y0, 13, 6);
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx + 7, G - 8 + y0, cx + 8 + walk * 2, G - 1, 1.8); limb(legs, cx - 10, G - 8 + y0, cx - 11 - walk * 2, G - 1, 1.8);
      const neck = part('body', {zone: 'head'}); limb(neck, cx + 8, G - 13 + y0, cx + 12, G - 18 + y0, 3.4, 3);
      const collar = part('horn', {zone: 'head', color: S.steel}); limb(collar, cx + 8.5, G - 16 + y0, cx + 11, G - 13 + y0, 1); px(collar, cx + 7, G - 16 + y0); px(collar, cx + 9, G - 18 + y0);
      const ears = part('body', {zone: 'head'}); poly(ears, [[cx + 10, G - 23 + y0], [cx + 11, G - 30 + y0], [cx + 14, G - 23 + y0]]); poly(ears, [[cx + 14, G - 23 + y0], [cx + 17, G - 29 + y0], [cx + 18, G - 22 + y0]]);
      const head = part('body', {zone: 'head'}); ellipse(head, cx + 14, G - 20.5 + y0, 6, 4.8); ellipse(head, cx + 19.5, G - 18.5 + y0, 4, 2.4);
      eyes = [{x: cx + 15, y: G - 22 + y0, w: 2, h: 1, glow: S.lava}];
      mouth = {x: cx + 19, y: G - 17 + y0, w: 3, fangs: true};
      a = {head: [cx + 14, G - 31 + y0], side: [cx - 3, G - 13 + y0], hold: [cx + 23, G - 18 + y0], rear: [cx - 22, G - 14], cube: [cx + 23, G - 36], box: [cx - 23, G - 31, cx + 24, G]};
      decor = ctx => { flames([cx - 10, cx - 6, cx - 2, cx + 2], G - 17 + y0, 2)(ctx); flames([cx - 22], G - 23 + sway, 1)(ctx); };
      break;
    }
    case 6: { // HELL SERPENT: a crimson wyrm with a molten belly, bone spines and swept-back horns
      const ph = mo.phase, N = 16, path = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        path.push([5 + 37 * t, G - 6 - 6.5 * Math.sin(t * 9 - ph) * (1 - t * 0.55) - 12 * t * t, 0.9 + 3.1 * Math.pow(Math.sin(Math.PI * Math.min(t, 0.85) / 0.85), 0.6)]);
      }
      const [hx0, hy0] = path[N], hx = hx0 + 3, hy = hy0 - 4;
      const b = part('body', {zone: 'body'}); chain(b, path); limb(b, hx0, hy0, hx, hy, 3.4, 3.4);
      const bel = part('belly', {zone: 'body', color: S.lava, pattern: lavaBands}); chain(bel, path.slice(2, N - 1).map(([x, y, r]) => [x + 0.5, y + r * 0.55, r * 0.42]));
      const sp = part('horn', {zone: 'body'}); for (let i = 3; i < N - 1; i += 2) { const [x, y, r] = path[i]; poly(sp, [[x - 1.2, y - r + 0.5], [x - 0.3, y - r - 2.3], [x + 1, y - r + 0.5]]); }
      const head = part('body', {zone: 'head'}); ellipse(head, hx, hy, 6.5, 4.8); ellipse(head, hx + 5.5, hy + 1.5, 4.5, 2.6);
      const hr = part('horn', {zone: 'head'}); chain(hr, [[hx - 2, hy - 4, 1.4], [hx - 6, hy - 7, 1], [hx - 10, hy - 7, 0.5]]); chain(hr, [[hx + 1, hy - 4, 1.2], [hx - 2, hy - 8, 0.8], [hx - 5, hy - 10, 0.5]]);
      eyes = [{x: hx, y: hy - 2, w: 2, h: 1, glow: S.glow, slit: true}];
      mouth = {x: hx + 5, y: hy + 2, w: 3, tongue: alt};
      a = {head: [hx - 1, hy - 7], side: [path[8][0], path[8][1] - 3], hold: [hx + 10, hy + 2], rear: [path[1][0], path[1][1]], cube: [52, 6], box: [5, hy - 10, hx + 10, G], tailX: 15};
      break;
    }
    case 7: { // DEMON: horned and winged, a trident in hand, standing in fire
      const y0 = -bob, fl = flap;
      const wing = part('membrane', {zone: 'wing', color: S.wing});
      for (const s of [-1, 1]) {
        const sx = cx + s * 5;
        poly(wing, [[sx, G - 23 + y0], [sx + s * 13, G - 33 - fl * 2 + y0], [sx + s * 19, G - 26 - fl + y0], [sx + s * 17, G - 19 + y0], [sx + s * 13, G - 21 + y0], [sx + s * 11, G - 16 + y0], [sx + s * 7, G - 19 + y0], [sx + s * 3, G - 15 + y0]]);
      }
      const bones = part('horn', {zone: 'wing'});
      for (const s of [-1, 1]) { const sx = cx + s * 5; limb(bones, sx, G - 23 + y0, cx + s * 18, G - 33 - fl * 2 + y0, 0.7, 0.4); limb(bones, cx + s * 18, G - 33 - fl * 2 + y0, cx + s * 24, G - 26 - fl + y0, 0.5, 0.3); }
      const fork = part('horn', {zone: 'arm', color: S.steel, flat: true});
      const fx = cx - 11; limb(fork, fx, G - 1, fx, G - 30 + y0, 0.5); for (const o of [-2, 0, 2]) limb(fork, fx + o, G - 30 + y0, fx + o, G - 33 + y0, 0.5); limb(fork, fx - 2, G - 30 + y0, fx + 2, G - 30 + y0, 0.5);
      const tail = part('limb', {zone: 'tail'}); chain(tail, [[cx + 3, G - 8 + y0, 1.4], [cx + 12, G - 5, 1.1], [cx + 17, G - 10 - sway, 0.8]]);
      const tip = part('horn', {zone: 'tail', color: S.redDark}); poly(tip, [[cx + 15, G - 11 - sway], [cx + 18, G - 16 - sway], [cx + 20, G - 10 - sway]]);
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx - 3, G - 9 + y0, cx - 4, G - 1, 2); limb(legs, cx + 3, G - 9 + y0, cx + 4, G - 1, 2);
      ellipse(legs, cx - 5, G - 0.5, 2.6, 1.2); ellipse(legs, cx + 5, G - 0.5, 2.6, 1.2);
      const b = part('body', {zone: 'body'}); ellipse(b, cx, G - 14 + y0, 6.5, 7);
      const ribs = part('belly', {zone: 'body', color: S.redDark, pattern: (x, y) => ((y + 1) % 2 === 0 && Math.abs(x - cx) > 0 ? '#D9675A' : null)}); ellipse(ribs, cx, G - 13 + y0, 3.8, 4.2);
      const arms = part('limb', {zone: 'arm'}); limb(arms, cx - 6, G - 18 + y0, cx - 10, G - 14 + y0, 1.5, 1.1); limb(arms, cx + 6, G - 18 + y0, cx + 10, G - 12 + y0 - sway * 3, 1.5, 1.1);
      const head = part('body', {zone: 'head'}); ellipse(head, cx, G - 25 + y0, 6, 5.5);
      poly(head, [[cx - 5, G - 26 + y0], [cx - 9, G - 29 + y0], [cx - 4, G - 28 + y0]]); poly(head, [[cx + 5, G - 26 + y0], [cx + 9, G - 29 + y0], [cx + 4, G - 28 + y0]]);
      const hr = part('horn', {zone: 'head'}); horns(hr, cx - 3, G - 29 + y0, -1, 1.3); horns(hr, cx + 3, G - 29 + y0, 1, 1.3);
      glowEyes([[cx - 3, G - 27 + y0], [cx + 2, G - 27 + y0]]);
      mouth = {x: cx - 1, y: G - 23 + y0, w: 3, fangs: true};
      a = {head: [cx, G - 37 + y0], side: [cx - 15, G - 13], hold: [cx - 10, G - 14 + y0], rear: [cx + 20, G - 12], cube: [cx + 26, G - 14], box: [cx - 24, G - 37, cx + 24, G]};
      decor = flames([cx - 8, cx - 5, cx - 2, cx + 1, cx + 4, cx + 7], G);
      break;
    }
    case 8: { // INFERNAL WYVERN: one wing raised, a long neck, molten plates under the belly
      const y0 = -bob, fl = flap;
      const wingF = part('far', {zone: 'wing', color: S.wing}); poly(wingF, [[cx + 2, G - 16 + y0], [cx + 2, G - 34 - fl * 3 + y0], [cx - 2, G - 28 + y0], [cx - 7, G - 31 - fl * 2 + y0], [cx - 6, G - 23 + y0], [cx - 4, G - 16 + y0]]);
      const tail = part('limb', {zone: 'tail'}); chain(tail, [[cx - 14, G - 11 + y0, 3], [cx - 22, G - 7, 2], [cx - 27, G - 11 - sway, 1.2]]);
      const tip = part('horn', {zone: 'tail'}); poly(tip, [[cx - 28, G - 9 - sway], [cx - 31, G - 13 - sway], [cx - 27, G - 15 - sway], [cx - 25, G - 12 - sway]]);
      const far = part('far', {zone: 'legs'}); limb(far, cx + 5, G - 8 + y0, cx + 4 - walk * 2, G - 1, 2); limb(far, cx - 8, G - 8 + y0, cx - 7 + walk * 2, G - 1, 2);
      const b = part('body', {zone: 'body'}); ellipse(b, cx - 3, G - 11 + y0, 14, 7);
      const bel = part('belly', {zone: 'body', color: S.lava, pattern: (x, y) => (x % 4 === 0 ? S.redDark : y % 2 ? S.lavaHot : null)}); ellipse(bel, cx - 2, G - 7.5 + y0, 9, 2);
      const spikes = part('horn', {zone: 'body'}); for (let x = cx - 14; x <= cx + 6; x += 4) poly(spikes, [[x - 1.5, G - 16 + y0 + (x < cx - 10 ? 1 : 0)], [x, G - 20 + y0], [x + 1.5, G - 16 + y0]]);
      const wing = part('membrane', {zone: 'wing', color: S.wing}); poly(wing, [[cx - 2, G - 16 + y0], [cx - 8, G - 37 - fl * 3 + y0], [cx - 13, G - 29 + y0], [cx - 20, G - 34 - fl * 2 + y0], [cx - 20, G - 25 + y0], [cx - 26, G - 25 - fl + y0], [cx - 14, G - 16 + y0]]);
      const bones = part('horn', {zone: 'wing'}); limb(bones, cx - 2, G - 16 + y0, cx - 8, G - 37 - fl * 3 + y0, 0.8, 0.4); limb(bones, cx - 8, G - 37 - fl * 3 + y0, cx - 20, G - 34 - fl * 2 + y0, 0.5, 0.4); limb(bones, cx - 8, G - 37 - fl * 3 + y0, cx - 26, G - 25 - fl + y0, 0.5, 0.3);
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx + 8, G - 8 + y0, cx + 9 + walk * 2, G - 1, 2.2); limb(legs, cx - 11, G - 8 + y0, cx - 12 - walk * 2, G - 1, 2.2);
      const neck = part('body', {zone: 'head'}); chain(neck, [[cx + 8, G - 14 + y0, 3.6], [cx + 13, G - 21 + y0, 2.8], [cx + 16, G - 26 + y0, 2.6]]);
      const hr = part('horn', {zone: 'head'}); chain(hr, [[cx + 16, G - 31 + y0, 1.2], [cx + 12, G - 34 + y0, 0.8], [cx + 10, G - 37 + y0, 0.4]]); chain(hr, [[cx + 19, G - 31 + y0, 1.1], [cx + 18, G - 35 + y0, 0.7], [cx + 20, G - 38 + y0, 0.4]]);
      const head = part('body', {zone: 'head'}); ellipse(head, cx + 18, G - 28.5 + y0, 5.5, 4); ellipse(head, cx + 23, G - 27.5 + y0, 3.8, 2.4);
      eyes = [{x: cx + 18, y: G - 30 + y0, w: 2, h: 1, glow: S.glow, slit: true}];
      mouth = {x: cx + 23, y: G - 26 + y0, w: 3, fangs: true};
      a = {head: [cx + 17, G - 36 + y0], side: [cx - 4, G - 12 + y0], hold: [cx + 27, G - 26 + y0], rear: [cx - 28, G - 12], cube: [cx + 24, G - 17], box: [cx - 31, G - 38, cx + 27, G]};
      decor = embers(cx + 28, G - 27 + y0, 2);
      break;
    }
    case 9: { // ARCHDEMON: enthroned on nothing, wings spread, a molten chest, a ring of fire on the ground
      const y0 = -bob, fl = flap;
      const wing = part('membrane', {zone: 'wing', color: S.wing});
      for (const s of [-1, 1]) {
        const sx = cx + s * 7;
        poly(wing, [[sx, G - 22 + y0], [cx + s * 20, G - 36 - fl * 2], [cx + s * 29, G - 30 - fl], [cx + s * 27, G - 21], [cx + s * 23, G - 24], [cx + s * 21, G - 16], [cx + s * 17, G - 20], [cx + s * 14, G - 13], [sx + s * 2, G - 15 + y0]]);
      }
      const bones = part('horn', {zone: 'wing'});
      for (const s of [-1, 1]) { const sx = cx + s * 7; limb(bones, sx, G - 22 + y0, cx + s * 20, G - 36 - fl * 2, 0.9, 0.5); limb(bones, cx + s * 20, G - 36 - fl * 2, cx + s * 29, G - 30 - fl, 0.6, 0.4); limb(bones, cx + s * 20, G - 36 - fl * 2, cx + s * 23, G - 24, 0.4); limb(bones, cx + s * 20, G - 36 - fl * 2, cx + s * 17, G - 20, 0.4); }
      const haunch = part('limb', {zone: 'legs'}); ellipse(haunch, cx - 8, G - 5, 6, 5); ellipse(haunch, cx + 8, G - 5, 6, 5);
      const b = part('body', {zone: 'body'}); ellipse(b, cx, G - 13 + y0, 10, 11);
      const chest = part('belly', {zone: 'body', color: S.lava, pattern: lavaBands}); ellipse(chest, cx, G - 11 + y0, 5, 8);
      const arms = part('limb', {zone: 'arm'}); limb(arms, cx - 8, G - 17 + y0, cx - 6, G - 3, 2.2, 1.8); limb(arms, cx + 8, G - 17 + y0, cx + 6, G - 3, 2.2, 1.8);
      const tail = part('limb', {zone: 'tail'}); chain(tail, [[cx + 10, G - 3, 2.6], [cx, G - 0.5, 2.2], [cx - 12, G - 1, 1.6], [cx - 17, G - 5 - sway, 1]]);
      const claws = part('horn', {zone: 'legs'}); [-7, -5, 5, 7].forEach(o => px(claws, cx + o, G - 1));
      const neck = part('body', {zone: 'head'}); limb(neck, cx, G - 22 + y0, cx, G - 26 + y0, 4.2, 3.8);
      const hr = part('horn', {zone: 'head'}); for (const s of [-1, 1]) chain(hr, [[cx + s * 4, G - 31 + y0, 1.8], [cx + s * 8, G - 34 + y0, 1.2], [cx + s * 9, G - 38 + y0, 0.5]]);
      const head = part('body', {zone: 'head'}); ellipse(head, cx, G - 29 + y0, 6.5, 5); ellipse(head, cx, G - 25.5 + y0, 4.2, 2.8);
      glowEyes([[cx - 4, G - 31 + y0], [cx + 3, G - 31 + y0]]);
      mouth = {x: cx - 1, y: G - 24 + y0, w: 3, fangs: true};
      a = {head: [cx, G - 35 + y0], side: [cx - 16, G - 9], hold: [cx - 7, G - 4], rear: [cx - 18, G - 6], cube: [cx + 25, G - 10], box: [cx - 29, G - 38, cx + 29, G]};
      decor = ctx => {  // a ring of fire on the ground: the near half in front, flames running around it
        for (let x = cx - 25; x <= cx + 25; x++) {
          const t = (x - cx) / 25, ry = Math.round(G + 1 + (1 - t * t) * 1.5), k = ((x - (live ? f : 0)) % 6 + 6) % 6;
          ctx.put0(x, ry, k === 0 ? S.lavaHot : S.lava);
          if (k < 2) ctx.put0(x, ry - 1, k === 0 ? S.lavaHot : S.ember);
          if (Math.abs(t) > 0.85) ctx.put0(x, ry - 1, S.lava);
        }
      };
      break;
    }
    case 10: { // VOID LORD: a floating crystal of the void with one burning eye, eight jointed legs and a crown of horns
      const fy = Math.round(Math.sin(mo.phase * 0.7) * 1.4), y = G - 18 + fy;
      main = S.void;
      const legs = part('limb', {zone: 'legs', color: S.void});
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
        const kx = cx + s * (12 + i * 3), ky = y - 8 + i * 4 - (flap && i % 2 ? 1 : 0), fx = cx + s * (16 + i * 4), fyy = y - 2 + i * 6;
        chain(legs, [[cx + s * 5, y - 2 + i * 2, 1.1], [kx, ky, 0.9], [fx, fyy, 0.6]]);
      }
      const crown = part('horn', {zone: 'head'});
      for (let i = -2; i <= 2; i++) chain(crown, [[cx + i * 3, y - 13, 1], [cx + i * 4.5, y - 18 - (2 - Math.abs(i)) * 1.5, 0.5]]);
      const b = part('body', {zone: 'body', pattern: (x, yy) => ((x * 3 + yy * 5) % 11 === 0 ? S.voidLight : null)}); poly(b, [[cx, y - 14], [cx + 10, y], [cx, y + 14], [cx - 10, y]]);
      const facet = part('belly', {zone: 'body', color: S.voidLight}); poly(facet, [[cx, y - 8], [cx + 5, y], [cx, y + 8], [cx - 5, y]]);
      const sclera = part('core', {zone: 'head', color: S.lava}); ellipse(sclera, cx, y, 4.4, 3);
      const iris = part('core', {zone: 'head', color: S.glow}); ellipse(iris, cx, y, 2.2, 2.2);
      eyes = [{x: cx, y: y - 1, w: 1, h: 3}];
      mouth = null;
      a = {head: [cx, y - 20], side: [cx - 22, y + 4], hold: [cx - 18, y + 6], rear: [cx, y + 15], cube: [cx + 22, 6], box: [cx - 26, y - 20, cx + 26, y + 16], float: true};
      decor = embers(cx, y + 16, 3);
      break;
    }
  }
  return {parts, eyes, mouth, a, main, decor};
}
