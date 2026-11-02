/* Derpy: the Classic line drawn badly on purpose. Colored by the affinity.
   Googly eyes (eye: {x, y, r, g: true, p: pupil size}), lopsided bodies, buck teeth and tongues.
   Mouth types: buck (teeth), blep (tongue out), open (gaping), under (underbite fang). */
'use strict';
const {CREST_STAGE} = require('../core/rules');
const {C, mix} = require('../render/colors');
const {GW, G, px, ellipse, ring, poly, limb, chain, carve, paint} = require('../render/raster');
const {partList} = require('../render/figure');
const {eggCrack} = require('../render/egg');
const {bellyPlates} = require('../render/decor');
const {eyeColor} = require('../render/face');

module.exports = {
  id: 'derp', name: 'Derpy', accent: '#FFE27A', drawsEgg: true,
  bodies: ['Leggy egg', 'Blep', 'Crab', 'Potato', 'Derpasaur', 'Sausage', 'Noodle', 'Gremlin', 'Long boi', 'Chonk', 'Big eye'],
  plans, face,
};

function plans(st, f, mo) {
  const {parts, part} = partList();
  const bob = mo.bob, walk = mo.walk, flap = mo.flap, sway = mo.sway, alt = mo.alt;
  let eyes = [], mouth = null, a = {}, decor = null;
  const cx = 32;
  const goo = (m, x, y, r, p) => { ellipse(m, x, y, r, r); eyes.push({x, y, r, g: true, p: p || (r >= 2.5 ? 2 : 1)}); };
  switch (st) {
    case 0: { // leggy egg: an egg on two stubby legs, peeking around
      const step = mo.has ? walk : 0, cy = G - 13.5;
      const legs = part('limb');
      limb(legs, cx - 3, cy + 8, cx - 3, G - 1 - step, 1.2); limb(legs, cx + 3, cy + 8, cx + 3, G - 1 - (mo.has ? 1 - walk : 0), 1.2);
      ellipse(legs, cx - 4.5, G - 0.5 - step, 2.2, 1); ellipse(legs, cx + 4.5, G - 0.5 - (mo.has ? 1 - walk : 0), 2.2, 1);
      const b = part('body');
      for (let y = Math.floor(cy - 10); y <= Math.ceil(cy + 9); y++) for (let x = cx - 9; x <= cx + 9; x++) {
        const dy = (y - cy) / 9.5, rx = 7.5 * (dy < 0 ? 1 - 0.25 * dy * dy : 1), dx = (x - cx) / rx;
        if (dx * dx + dy * dy <= 1) px(b, x, y);
      }
      const ew = part('eyeWhite'); goo(ew, cx - 3, cy - 3, 2.5, 1); goo(ew, cx + 3.5, cy - 4, 3, 2);
      a = {head: [cx, cy - 10], side: [cx - 10, cy], hold: [cx - 10, cy + 2], rear: [cx - 9, cy], cube: [cx + 13, cy - 10], box: [cx - 8, cy - 10, cx + 8, G]};
      decor = ctx => eggCrack(ctx, cx, cy + 3);
      break;
    }
    case 1: { // BLEP: a puddle with a floppy tip, mismatched eyes and its tongue out
      const sq = bob ? 0.8 : 0, cy = G - 4 + sq * 0.5;
      const b = part('body'); ellipse(b, cx, cy, 10 + sq, 4.2 - sq * 0.5); ellipse(b, cx - 1, cy - 3, 7, 4.5 - sq * 0.5);
      poly(b, [[cx - 3, cy - 6], [cx + 3, cy - 11 + sq], [cx + 6, cy - 9 + sq], [cx + 2, cy - 5]]);
      const sh = part('belly'); px(sh, cx - 6, cy - 4); px(sh, cx - 7, cy - 3); px(sh, cx - 6, cy - 3);
      const ew = part('eyeWhite'); goo(ew, cx - 3, cy - 6, 3.5, 2); goo(ew, cx + 4, cy - 5, 2.3, 1);
      mouth = {x: cx - 1, y: cy, w: 3, derp: 'blep', drool: true};
      a = {head: [cx + 4, cy - 12], side: [cx - 12, cy], hold: [cx - 12, cy + 1], rear: [cx - 11, cy], cube: [cx + 13, cy - 14], box: [cx - 11, cy - 12, cx + 11, G]};
      break;
    }
    case 2: { // CRAB: fiddler crab, one huge claw, eye stalks that disagree
      const cy = G - 8.5 - bob * 0.5;
      const legs = part('limb');
      [-10, -7, -4, 4, 7, 10].forEach((o, i) => { const s = o < 0 ? -1 : 1, up = ((i + walk) & 1) ? 1 : 0; limb(legs, cx + o, cy + 3, cx + o + s * 2, G - up, 1.1, 0.9); });
      const arm = part('limb'); chain(arm, [[cx + 9, cy - 1, 1.6], [cx + 13, cy - 4 - sway, 1.4], [cx + 15, cy - 7 - sway, 1.3]]);
      chain(arm, [[cx - 9, cy - 1, 1.1], [cx - 12, cy - 3, 0.9], [cx - 13, cy - 5, 0.8]]);
      const b = part('body'); ellipse(b, cx, cy, 11, 6);
      const bel = part('belly'); ellipse(bel, cx, cy + 3, 7.5, 2.3);
      const claw = part('body'); ellipse(claw, cx + 18, cy - 11 - sway, 5, 3.6);
      carve(claw, [[cx + 18, cy - 11 - sway], [cx + 24, cy - 14 - sway - alt], [cx + 24, cy - 10 - sway + alt]]);
      ellipse(claw, cx - 14, cy - 6, 2, 1.6); px(claw, cx - 16, cy - 8); px(claw, cx - 14, cy - 8);
      const stalk = part('limb'); limb(stalk, cx - 3, cy - 5, cx - 4, cy - 9 + bob, 1, 0.8); chain(stalk, [[cx + 3, cy - 5, 1], [cx + 5, cy - 11, 0.8], [cx + 8, cy - 14 + bob, 0.7]]);
      const ew = part('eyeWhite'); goo(ew, cx - 4, cy - 11 + bob, 3, 2); goo(ew, cx + 9, cy - 16 + bob, 2.6, 1);
      mouth = {x: cx - 2, y: cy, w: 4, derp: 'buck'};
      a = {head: [cx - 1, cy - 7], side: [cx - 15, cy], hold: [cx - 14, cy - 6], rear: [cx - 13, cy], cube: [cx - 16, cy - 22], box: [cx - 16, cy - 19, cx + 23, G]};
      break;
    }
    case 3: { // POTATO: lumpy body, one floppy ear, noodle arms
      const cy = G - 11.5 - bob;
      const legs = part('limb'); limb(legs, cx - 3, cy + 8, cx - 3, G - 1, 1.5); limb(legs, cx + 4, cy + 8, cx + 4, G - 1, 1.5);
      ellipse(legs, cx - 4, G - 0.5, 2.4, 1); ellipse(legs, cx + 5, G - 0.5, 2.4, 1);
      const ears = part('body'); poly(ears, [[cx - 7, cy - 6], [cx - 9, cy - 14], [cx - 3, cy - 9]]);
      chain(ears, [[cx + 6, cy - 8, 2], [cx + 11, cy - 9, 1.6], [cx + 13, cy - 6, 1.1]]);
      const b = part('body'); ellipse(b, cx, cy, 9.5, 10); ellipse(b, cx + 1.5, cy + 3, 9, 7);
      const bel = part('belly'); ellipse(bel, cx + 1, cy + 4, 5.5, 4);
      const spot = part('limb'); px(spot, cx + 7, cy + 1); px(spot, cx + 6, cy + 2); px(spot, cx - 6, cy + 6);
      const arms = part('limb'); chain(arms, [[cx - 9, cy + 1, 1], [cx - 14, cy - 2 - sway * 3, 0.8], [cx - 15, cy - 6 - sway * 3, 0.7]]);
      chain(arms, [[cx + 10, cy + 2, 1], [cx + 13, cy + 6, 0.8], [cx + 12, cy + 9, 0.7]]);
      const ew = part('eyeWhite'); goo(ew, cx - 3, cy - 3, 3.4, 2); goo(ew, cx + 4, cy - 2, 2.6, 1);
      mouth = {x: cx - 1, y: cy + 3, w: 3, derp: 'buck'};
      a = {head: [cx - 1, cy - 11], side: [cx - 16, cy + 3], hold: [cx - 15, cy - 6 - sway * 3], rear: [cx - 10, cy], cube: [cx + 18, cy - 22], box: [cx - 16, cy - 14, cx + 14, G]};
      break;
    }
    case 4: { // DERPASAUR: giant head, frog eyes, tiny arms, mouth hanging open
      const y0 = -bob;
      const tail = part('limb'); chain(tail, [[cx - 6, G - 7 + y0, 3], [cx - 13, G - 4, 2], [cx - 17, G - 3 - sway, 1]]);
      const legs = part('limb'); limb(legs, cx - 4, G - 8 + y0, cx - 4, G - 1, 2.6); limb(legs, cx + 3, G - 8 + y0, cx + 4, G - 1, 2.6);
      ellipse(legs, cx - 5, G - 0.5, 3.4, 1.3); ellipse(legs, cx + 5, G - 0.5, 3.4, 1.3);
      const b = part('body'); ellipse(b, cx - 1, G - 11 + y0, 8, 7.5);
      const bel = part('belly'); ellipse(bel, cx + 1, G - 10 + y0, 5, 5);
      const head = part('body'); ellipse(head, cx + 3, G - 23 + y0, 10, 7); ellipse(head, cx + 10, G - 20 + y0, 5, 4);
      const sp = part('horn'); poly(sp, [[cx - 6, G - 25 + y0], [cx - 7, G - 30 + y0], [cx - 3, G - 28 + y0]]); poly(sp, [[cx - 3, G - 29 + y0], [cx - 1, G - 32 + y0], [cx, G - 29 + y0]]);
      const arm = part('limb'); limb(arm, cx + 5, G - 14 + y0, cx + 8, G - 13 + y0 - sway, 1, 0.8);
      const ew = part('eyeWhite'); goo(ew, cx + 1, G - 30 + y0, 3.4, 2); goo(ew, cx + 8, G - 29 + y0, 2.6, 1);
      mouth = {x: cx + 7, y: G - 20 + y0, w: 6, h: 2, derp: 'open'};
      a = {head: [cx + 4, G - 34 + y0], side: [cx - 12, G - 13], hold: [cx + 9, G - 13 + y0 - sway], rear: [cx - 17, G - 5], cube: [cx - 15, G - 34], box: [cx - 18, G - 33, cx + 15, G]};
      break;
    }
    case 5: { // SAUSAGE: dachshund on tiny legs, ear and tongue flapping
      const y0 = -bob;
      const tail = part('limb'); chain(tail, [[cx - 17, G - 9 + y0, 1.4], [cx - 20, G - 12 + (alt ? -2 : 1), 1.1], [cx - 22, G - 14 + (alt ? -4 : 2), 0.8]]);
      const far = part('far'); limb(far, cx - 11, G - 5 + y0, cx - 11 + walk, G - 1, 1.3); limb(far, cx + 5, G - 5 + y0, cx + 5 - walk, G - 1, 1.3);
      const b = part('body'); limb(b, cx - 14, G - 8 + y0, cx + 7, G - 8 + y0, 4.2, 4.4);
      const bel = part('belly'); limb(bel, cx - 11, G - 5 + y0, cx + 5, G - 5 + y0, 1.4);
      const legs = part('limb'); limb(legs, cx - 14, G - 5 + y0, cx - 14 - walk, G - 1, 1.4); limb(legs, cx + 8, G - 5 + y0, cx + 8 + walk, G - 1, 1.4);
      const neck = part('body'); limb(neck, cx + 7, G - 9 + y0, cx + 11, G - 12 + y0, 3.6, 3.4);
      const head = part('body'); ellipse(head, cx + 13, G - 14 + y0, 5.5, 4.6); ellipse(head, cx + 18, G - 12 + y0, 3.6, 2.4);
      const ear = part('limb'); chain(ear, [[cx + 11, G - 17 + y0, 1.8], [cx + 9, G - 13 + y0, 1.6], [cx + 8 - walk, G - 9 + y0 + walk, 1.2]]);
      const ew = part('eyeWhite'); goo(ew, cx + 13, G - 18 + y0, 2.8, 2); goo(ew, cx + 18, G - 16 + y0, 2.1, 1);
      mouth = {x: cx + 18, y: G - 11 + y0, w: 3, derp: 'blep', long: true};
      a = {head: [cx + 14, G - 21 + y0], side: [cx - 4, G - 10 + y0], hold: [cx + 22, G - 12 + y0], rear: [cx - 19, G - 10], cube: [cx + 21, G - 30], box: [cx - 22, G - 21, cx + 22, G]};
      break;
    }
    case 6: { // NOODLE: thin wobbly snake, big round head, forked blep
      const ph = mo.phase, N = 16, path = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        path.push([6 + 34 * t, G - 4 - 6 * Math.sin(t * 10 - ph) * (1 - t * 0.5) - 11 * t * t, 0.8 + 1.4 * Math.pow(Math.sin(Math.PI * Math.min(t, 0.85) / 0.85), 0.7)]);
      }
      const [hx0, hy0] = path[N], hx = hx0 + 3, hy = hy0 - 5 + bob;
      const b = part('body'); chain(b, path); limb(b, hx0, hy0, hx - 1, hy + 2, 1.8, 2.4);
      const bel = part('belly'); for (let i = 3; i < N - 1; i += 3) px(bel, path[i][0], path[i][1] + 1);
      const head = part('body'); ellipse(head, hx, hy, 6.5, 5.5);
      const ew = part('eyeWhite'); goo(ew, hx - 2, hy - 4, 3, 2); goo(ew, hx + 4, hy - 3, 2.6, 2);
      mouth = {x: hx + 1, y: hy + 2, w: 4, derp: 'blep', fork: true};
      a = {head: [hx + 1, hy - 8], side: [path[8][0], path[8][1] - 3], hold: [hx + 8, hy + 2], rear: [path[1][0], path[1][1]], cube: [54, 30], box: [5, hy - 8, hx + 8, G]};
      break;
    }
    case 7: { // GREMLIN: pot belly, huge ears, one bent horn, wings far too small
      const y0 = -bob, fl = flap;
      const wing = part('membrane');
      for (const s of [-1, 1]) poly(wing, [[cx + s * 6, G - 19 + y0], [cx + s * 11, G - 24 - fl * 3 + y0], [cx + s * 13, G - 20 - fl + y0], [cx + s * 9, G - 16 + y0]]);
      const tail = part('limb'); chain(tail, [[cx + 5, G - 6 + y0, 1.2], [cx + 11, G - 3, 1], [cx + 14, G - 8 - sway, 0.7]]);
      const tip = part('horn'); poly(tip, [[cx + 13, G - 8 - sway], [cx + 15, G - 12 - sway], [cx + 17, G - 8 - sway]]);
      const legs = part('limb'); limb(legs, cx - 3, G - 7 + y0, cx - 4, G - 1, 1.8); limb(legs, cx + 3, G - 7 + y0, cx + 4, G - 1, 1.8);
      ellipse(legs, cx - 5, G - 0.5, 2.6, 1.1); ellipse(legs, cx + 5, G - 0.5, 2.6, 1.1);
      const b = part('body'); ellipse(b, cx, G - 12 + y0, 8.5, 7.5);
      const bel = part('belly'); ellipse(bel, cx, G - 10.5 + y0, 6, 5);
      const navel = part('limb'); px(navel, cx, G - 9 + y0);
      const arms = part('limb'); limb(arms, cx - 7, G - 15 + y0, cx - 10, G - 11 + y0 - sway * 3, 1.3, 1); limb(arms, cx + 7, G - 15 + y0, cx + 10, G - 11 + y0, 1.3, 1);
      const head = part('body'); ellipse(head, cx, G - 24 + y0, 7.5, 6.5);
      for (const s of [-1, 1]) poly(head, [[cx + s * 6, G - 27 + y0], [cx + s * 13, G - 29 + y0 + (s > 0 ? alt : 0)], [cx + s * 6, G - 22 + y0]]);
      const horns = part('horn'); chain(horns, [[cx - 3, G - 30 + y0, 1.3], [cx - 4, G - 34 + y0, 0.6]]); chain(horns, [[cx + 3, G - 30 + y0, 1.3], [cx + 5, G - 32 + y0, 1], [cx + 7, G - 31 + y0, 0.6]]);
      px(horns, cx - 11, G - 11 + y0 - sway * 3); px(horns, cx + 11, G - 11 + y0);
      const ew = part('eyeWhite'); goo(ew, cx - 3, G - 25 + y0, 3.2, 2); goo(ew, cx + 3.5, G - 26 + y0, 2.5, 1);
      mouth = {x: cx - 2, y: G - 21 + y0, w: 4, derp: 'under'};
      a = {head: [cx, G - 35 + y0], side: [cx - 15, G - 12], hold: [cx - 11, G - 11 + y0 - sway * 3], rear: [cx + 15, G - 8], cube: [cx + 18, G - 30], box: [cx - 14, G - 35, cx + 17, G]};
      break;
    }
    case 8: { // LONG BOI: fat wyvern, giraffe neck, tiny head, stubby wing
      const y0 = -bob, fl = flap, nx = sway;
      const tail = part('limb'); chain(tail, [[cx - 17, G - 10 + y0, 2.6], [cx - 24, G - 8, 1.6], [cx - 28, G - 12 - sway, 1]]);
      const far = part('far'); limb(far, cx - 10, G - 6 + y0, cx - 10 + walk, G - 1, 1.8); limb(far, cx + 1, G - 6 + y0, cx + 1 - walk, G - 1, 1.8);
      const b = part('body'); ellipse(b, cx - 6, G - 10 + y0, 12, 6.5);
      const bel = part('belly'); ellipse(bel, cx - 5, G - 7 + y0, 9, 2.4);
      const wing = part('membrane'); poly(wing, [[cx - 7, G - 15 + y0], [cx - 10, G - 23 - fl * 3 + y0], [cx - 13, G - 19 - fl + y0], [cx - 15, G - 20 - fl * 2 + y0], [cx - 14, G - 15 + y0]]);
      const bones = part('limb'); limb(bones, cx - 7, G - 15 + y0, cx - 10, G - 23 - fl * 3 + y0, 0.7, 0.5);
      const legs = part('limb'); limb(legs, cx - 13, G - 6 + y0, cx - 13 - walk, G - 1, 2); limb(legs, cx + 3, G - 6 + y0, cx + 3 + walk, G - 1, 2);
      const neck = part('body'); chain(neck, [[cx + 3, G - 12 + y0, 3], [cx + 5, G - 19 + y0, 2.2], [cx + 7 + nx, G - 25 + y0, 1.8], [cx + 9 + nx, G - 29 + y0, 1.7]]);
      const head = part('body'); ellipse(head, cx + 11 + nx, G - 31 + y0, 4, 3); ellipse(head, cx + 15 + nx, G - 30 + y0, 2.6, 1.8);
      const ew = part('eyeWhite'); goo(ew, cx + 10 + nx, G - 35 + y0, 2.6, 2); goo(ew, cx + 15 + nx, G - 34 + y0, 2, 1);
      mouth = {x: cx + 15 + nx, y: G - 29 + y0, w: 3, derp: 'blep'};
      a = {head: [cx + 12 + nx, G - 38 + y0], side: [cx - 6, G - 11 + y0], hold: [cx + 19 + nx, G - 29 + y0], rear: [cx - 28, G - 11], cube: [cx + 22, G - 14], box: [cx - 29, G - 37, cx + 19, G]};
      break;
    }
    case 9: { // CHONK: a round dragon with toy wings, smoke from the nose
      const y0 = -bob, fl = flap;
      const wing = part('membrane');
      for (const s of [-1, 1]) poly(wing, [[cx + s * 10, G - 22 + y0], [cx + s * 17, G - 31 - fl * 2], [cx + s * 20, G - 26 - fl], [cx + s * 16, G - 20]]);
      const tail = part('limb'); chain(tail, [[cx + 11, G - 3, 2.2], [cx + 18, G - 2, 1.6], [cx + 22, G - 6 - sway, 1]]);
      const feet = part('limb'); ellipse(feet, cx - 8, G - 1, 3.6, 1.6); ellipse(feet, cx + 8, G - 1, 3.6, 1.6);
      const b = part('body'); ellipse(b, cx, G - 13 + y0, 14, 12.5);
      const bel = part('belly'); ellipse(bel, cx, G - 11 + y0, 9, 9);
      const arms = part('limb'); limb(arms, cx - 11, G - 17 + y0, cx - 13, G - 12 + y0 - sway * 2, 1.6, 1.2); limb(arms, cx + 11, G - 17 + y0, cx + 13, G - 12 + y0, 1.6, 1.2);
      const claws = part('horn'); [-10, -7, 7, 10].forEach(o => px(claws, cx + o, G - 1));
      const horns = part('horn'); chain(horns, [[cx - 4, G - 31 + y0, 1.4], [cx - 5, G - 35 + y0, 0.6]]); chain(horns, [[cx + 4, G - 31 + y0, 1.4], [cx + 6, G - 33 + y0, 0.9], [cx + 8, G - 32 + y0, 0.5]]);
      const head = part('body'); ellipse(head, cx, G - 27 + y0, 7.5, 5.5); ellipse(head, cx, G - 24 + y0, 4.5, 2.6);
      const ew = part('eyeWhite'); goo(ew, cx - 4, G - 29 + y0, 3.2, 2); goo(ew, cx + 4, G - 30 + y0, 2.7, 2);
      mouth = {x: cx - 2, y: G - 23 + y0, w: 4, derp: 'buck'};
      a = {head: [cx, G - 35 + y0], side: [cx - 18, G - 10], hold: [cx - 14, G - 12 + y0 - sway * 2], rear: [cx - 17, G - 6], cube: [cx + 25, G - 38], box: [cx - 21, G - 35, cx + 23, G]};
      decor = ctx => { bellyPlates(ctx); snotBubble(ctx, cx + 2, G - 25 + y0); };
      break;
    }
    case 10: { // BIG EYE: ascended into one floating eyeball with tiny wings and dangling legs
      const fy = Math.round(Math.sin(mo.phase * 0.7) * 1.4), y = G - 20 + fy;
      const wing = part('membrane');
      for (const s of [-1, 1]) for (let i = 0; i < 2; i++) limb(wing, cx + s * 8, y - 3 + i * 2, cx + s * (14 - i * 2), y - 8 - flap * 2 + i * 3, 1, 0.5);
      const halo = part('horn'); ring(halo, cx + (alt ? 2 : 1), y - 17 + (alt ? 1 : 0), 6, 1.8, 1);
      const legs = part('limb'); limb(legs, cx - 3, y + 11, cx - 4 + alt, y + 16, 0.8); limb(legs, cx + 3, y + 11, cx + 4 - alt, y + 16, 0.8);
      const b = part('body'); poly(b, [[cx, y - 13], [cx + 10, y], [cx, y + 13], [cx - 10, y]]);
      const ew = part('eyeWhite'); ellipse(ew, cx, y - 1, 5.2, 4.6); eyes.push({x: cx, y: y - 1, r: 4.6, rx: 5.2, g: true, p: 3});
      mouth = {x: cx - 1, y: y + 6, w: 3, derp: 'buck'};
      a = {head: [cx + 1, y - 20], side: [cx - 18, y + 4], hold: [cx - 15, y + 4], rear: [cx, y + 17], cube: [cx + 22, 6], box: [cx - 15, y - 20, cx + 15, y + 16], float: true};
      break;
    }
  }
  return {parts, eyes, mouth, a, decor};
}

/* ---- the face: googly eyes in dark rims, pupils that wander off on their own, and derp mouths ---- */
function face(ctx) {
  const {pl, put, body, screen, pal} = ctx;
  const rim = mix(body, screen, 0.62);
  for (const e of pl.eyes) {
    const rx = e.rx || e.r, ry = e.r;
    for (let y = Math.floor(e.y - ry - 1); y <= Math.ceil(e.y + ry + 1); y++) for (let x = Math.floor(e.x - rx - 1); x <= Math.ceil(e.x + rx + 1); x++) {
      const dx = (x - e.x) / rx, dy = (y - e.y) / ry, ox = (x - e.x) / (rx + 1), oy = (y - e.y) / (ry + 1);
      if (ox * ox + oy * oy <= 1.02 && dx * dx + dy * dy > 1.02) put(x, y, rim);
    }
  }
  for (const part of pl.parts) if (part.role === 'eyeWhite') paint(put, part.m, pal.eyeWhite, screen);
  pl.eyes.forEach((e, i) => googly(ctx, e, i, eyeColor(ctx, i)));
  if (pl.mouth) mouth(ctx, pl.mouth);
}

function googly(ctx, e, i, pc) {
  const {put, D, st, has, sleeping, blink, happy, tired, look, form, pl, pal, body, screen, eye} = ctx;
  const rx = e.rx || e.r, ry = e.r, ex = e.x, ey = e.y, lid = pal.limb;
  const each = fn => { for (let y = Math.floor(ey - ry); y <= Math.ceil(ey + ry); y++) for (let x = Math.floor(ex - rx); x <= Math.ceil(ex + rx); x++) { const dx = (x - ex) / rx, dy = (y - ey) / ry; if (dx * dx + dy * dy <= 1.02) fn(x, y); } };
  if (sleeping || (st === 0 && !has) || (blink && form !== 'owl')) { each((x, y) => put(x, y, y === Math.round(ey) ? eye : lid)); return; }
  // pupils wander on their own: wall-eyed, up, cross-eyed, one up one down; a lone eye rolls around
  let [dx, dy] = pl.eyes.length === 1 ? [[-1, 0], [0, -1], [1, 0], [0, 1]][look] : [[[-1, 0], [1, 0]], [[1, -1], [1, -1]], [[1, 0], [-1, 0]], [[0, 1], [-1, -1]]][look][i % 2];
  if (D.critical) { dx = 0; dy = 1; }
  const p = e.p || 1, k = Math.max(0, Math.floor(Math.min(rx, ry) - p / 2 - 0.2));
  const x0 = Math.round(ex + dx * k - (p - 1) / 2), y0 = Math.round(ey + dy * k - (p - 1) / 2);
  for (let u = 0; u < p; u++) for (let v = 0; v < p; v++) put(x0 + u, y0 + v, pc);
  if (form === 'owl' && p >= 2) put(x0 + p - 1, y0 + p - 1, C.yellow); // a 1px pupil has no room for the glint
  else if (happy && p >= 2) put(x0, y0, '#FFFFFF');
  if (D.critical) { each((x, y) => { if (y < Math.round(ey)) put(x, y, lid); }); if (i === 0) put(ex - rx + 1, ey + ry + 1, C.drop); }
  else if (tired) for (let x = Math.round(ex - rx + 1); x <= Math.round(ex + rx - 1); x++) put(x, Math.round(ey + ry) + 1, mix(body, screen, 0.45));
}

// M.derp: buck (teeth), blep (tongue out; long, fork), open (gaping), under (underbite fang); M.drool
function mouth(ctx, M) {
  const {put, D, aff, st, f, mo, motion, sleeping, happy, pal, eye} = ctx;
  const x = Math.round(M.x), y = Math.round(M.y), w = M.w, tooth = '#FFFFFF';
  const line = () => { for (let k = 0; k < w; k++) put(x + k, y, eye); if (happy) { put(x - 1, y - 1, eye); put(x + w, y - 1, eye); } };
  if (aff === 'local' && st >= CREST_STAGE && !D.sick) {  // shell prompt, as in Classic
    put(x - 1, y - 1, eye); put(x, y, eye); put(x - 1, y + 1, eye);
    if (!motion || mo.alt) { put(x + 1, y + 1, eye); put(x + 2, y + 1, eye); }
    return;
  }
  if (sleeping) { put(x + 1, y, eye); put(x + 1, y + 1, eye); const d = motion ? (f >> 2) % 4 : 1; if (d < 3) put(x + 2, y + 1 + d, C.drop); return; }
  if (D.sick || D.mood < 30) { for (let k = 0; k < Math.max(w, 3); k++) put(x + k, y + ((k & 1) ? 0 : 1), eye); if (M.derp === 'buck') put(x + 1, y + 2, tooth); return; }
  if (M.derp === 'open') {
    const h = (M.h || 2) + (happy ? 1 : 0);
    for (let j = 0; j < h; j++) for (let k = 0; k < w - (j === h - 1 ? 1 : 0); k++) put(x + k, y + j, eye);
    put(x + w - 3, y + h - 1, C.tongue); put(x + w - 4, y + h - 1, C.tongue); put(x + 1, y, tooth);
  } else if (M.derp === 'buck') {
    line(); const t = x + Math.floor(w / 2) - 1; put(t - 1, y + 1, eye); put(t, y + 1, tooth); put(t + 1, y + 1, tooth); put(t + 2, y + 1, eye);
  } else if (M.derp === 'blep') {
    line(); const tx = x + 1 + (M.long && motion && mo.alt ? 1 : 0), len = M.long ? 3 : 2;
    for (let j = 1; j <= len; j++) put(tx, y + j, C.tongue);
    if (M.long) put(tx + 1, y + 1, C.tongue);
    if (M.fork) { put(tx - 1, y + len + 1, C.tongue); put(tx + 1, y + len + 1, C.tongue); }
  } else if (M.derp === 'under') {
    line(); put(x + w - 1, y - 1, pal.horn); if (happy) put(x, y - 1, pal.horn);
  }
  if (M.drool && motion) { const d = (f >> 1) % 6; if (d < 4) put(x + w, y + 1 + d, C.drop); }
}

// a snot bubble that grows and pops
function snotBubble(ctx, x, y) {
  const {put, f, motion, screen} = ctx;
  if (!motion) return;
  const k = (f >> 1) % 16;
  if (k < 6) {
    const r = [0.5, 1, 1.5, 2, 2.5, 3][k], bx = x + 1 + r, by = y + 1;
    if (r < 1) put(x + 1, by, C.drop);
    else { const m = new Set(); ring(m, bx, by, r, r, 1); for (const q of m) put(q % GW, (q / GW) | 0, mix(C.drop, screen, 0.15)); put(bx - r * 0.5, by - r * 0.5, '#FFFFFF'); }
  } else if (k === 6) [[-1, -1], [1, -1], [-1, 1], [1, 1], [2, 0], [-2, 0]].forEach(([dx, dy]) => put(x + 4 + dx, y + 1 + dy, mix(C.drop, screen, 0.3)));
}
