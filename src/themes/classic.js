/* Classic: the original line, from slime to an ascended geometric form. Colored by the affinity.
   The only theme that answers clicks so far: every part says which zone it is (head, body, arm, legs, tail, wing),
   and stages drawn as one blob mark where the head ends (a.split) or the tail starts (a.tailX). */
'use strict';
const {G, px, ellipse, ring, poly, limb, chain} = require('../render/raster');
const {partList} = require('../render/figure');
const {bellyPlates} = require('../render/decor');

module.exports = {id: 'classic', name: 'Classic', reacts: true, plans};

function plans(st, f, mo) {
  const {parts, part} = partList();
  const bob = mo.bob, walk = mo.walk, flap = mo.flap, sway = mo.sway;
  let eyes = [], mouth = null, a = {}, decor = null;
  const cx = 32;
  switch (st) {
    case 1: { // BIT: slime droplet
      const sq = bob ? 0.8 : 0, rx = 7.5 + sq, ry = 6 - sq, cy = G - ry + 0.5;
      const b = part('body', {zone: 'body'}); ellipse(b, cx, cy, rx, ry); poly(b, [[cx - 3.5, cy - ry + 2], [cx + 1, cy - ry - 4 + sq], [cx + 3, cy - ry + 2]]);
      const sh = part('belly', {zone: 'body'}); px(sh, cx - 4, cy - 3); px(sh, cx - 5, cy - 2); px(sh, cx - 4, cy - 2);
      eyes = [{x: cx - 4, y: cy - 1, w: 2, h: 2}, {x: cx + 2, y: cy - 1, w: 2, h: 2}];
      mouth = {x: cx - 1, y: cy + 2, w: 2};
      a = {head: [cx, cy - ry - 3], side: [cx - 9, cy], hold: [cx - 9, cy + 2], rear: [cx - 9, cy], cube: [cx + 12, cy - 12], box: [cx - 9, cy - ry - 4, cx + 9, G], split: cy};
      break;
    }
    case 2: { // NIBBLE: crawler with eye stalks and stub legs
      const cy = G - 8.5 - bob * 0.5;
      const legs = part('limb', {zone: 'legs'});
      [-8, -3, 3, 8].forEach((o, i) => { const up = ((i + walk) & 1) ? 1 : 0; limb(legs, cx + o, cy + 4, cx + o + (i < 2 ? -1 : 1), G - up, 1.4, 1.2); });
      const b = part('body', {zone: 'body'}); ellipse(b, cx, cy, 11.5, 6.5);
      const bel = part('belly', {zone: 'body'}); ellipse(bel, cx, cy + 3, 8, 2.5);
      const st1 = part('limb', {zone: 'head'}); limb(st1, cx - 3, cy - 5, cx - 6, cy - 12 + bob, 1, 0.8); limb(st1, cx + 3, cy - 5, cx + 6, cy - 12 + bob, 1, 0.8);
      const eb = part('eyeWhite', {zone: 'head'}); ellipse(eb, cx - 6, cy - 13 + bob, 2.4, 2.4); ellipse(eb, cx + 6, cy - 13 + bob, 2.4, 2.4);
      eyes = [{x: cx - 6, y: cy - 14 + bob, w: 1, h: 2}, {x: cx + 6, y: cy - 14 + bob, w: 1, h: 2}];
      mouth = {x: cx - 1, y: cy + 1, w: 3};
      a = {head: [cx, cy - 7], side: [cx - 13, cy - 1], hold: [cx - 13, cy + 1], rear: [cx - 12, cy], cube: [cx + 14, cy - 18], box: [cx - 12, cy - 16, cx + 12, G]};
      break;
    }
    case 3: { // BYTE: round biped with ears and arms
      const cy = G - 12.5 - bob;
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx - 4, cy + 7, cx - 5, G - 1, 1.8); limb(legs, cx + 4, cy + 7, cx + 5, G - 1, 1.8);
      ellipse(legs, cx - 6, G - 0.5, 3, 1.3); ellipse(legs, cx + 6, G - 0.5, 3, 1.3);
      const ears = part('body', {zone: 'head'}); poly(ears, [[cx - 8, cy - 5], [cx - 10, cy - 13], [cx - 3, cy - 8]]); poly(ears, [[cx + 8, cy - 5], [cx + 10, cy - 13], [cx + 3, cy - 8]]);
      const b = part('body', {zone: 'body'}); ellipse(b, cx, cy, 10, 9);
      const bel = part('belly', {zone: 'body'}); ellipse(bel, cx, cy + 3.5, 6, 4.5);
      const arms = part('limb', {zone: 'arm'}); limb(arms, cx - 9, cy + 1, cx - 13, cy + 4 - sway * 4, 1.4, 1.1); limb(arms, cx + 9, cy + 1, cx + 13, cy + 4, 1.4, 1.1);
      eyes = [{x: cx - 5, y: cy - 3, w: 2, h: 2}, {x: cx + 3, y: cy - 3, w: 2, h: 2}];
      mouth = {x: cx - 1, y: cy + 1, w: 2};
      a = {head: [cx, cy - 9], side: [cx - 16, cy + 1], hold: [cx - 13, cy + 4 - sway * 4], rear: [cx - 11, cy], cube: [cx + 15, cy - 12], box: [cx - 13, cy - 13, cx + 13, G], split: cy + 1};
      break;
    }
    case 4: { // WORD: upright kaiju chick with a tail
      const y0 = -bob;
      const tail = part('limb', {zone: 'tail'}); chain(tail, [[cx - 5, G - 8 + y0, 3.2], [cx - 13, G - 5, 2.2], [cx - 19, G - 7 - sway, 1]]);
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx - 4, G - 9 + y0, cx - 5, G - 1, 2.4); limb(legs, cx + 4, G - 9 + y0, cx + 5, G - 1, 2.4);
      ellipse(legs, cx - 6, G - 0.5, 3.6, 1.4); ellipse(legs, cx + 6, G - 0.5, 3.6, 1.4);
      const armB = part('far', {zone: 'arm'}); limb(armB, cx - 5, G - 16 + y0, cx - 9, G - 12 + y0, 1.3, 1);
      const b = part('body', {zone: 'body'}); ellipse(b, cx, G - 12.5 + y0, 8, 8.5);
      const bel = part('belly', {zone: 'body'}); ellipse(bel, cx + 1.5, G - 11 + y0, 5, 6);
      const head = part('body', {zone: 'head'}); ellipse(head, cx + 1, G - 24 + y0, 8, 6.5); ellipse(head, cx + 7, G - 21.5 + y0, 4.5, 3.2);
      const sp = part('horn', {zone: 'head'}); [[cx - 5, G - 29], [cx - 1, G - 31], [cx + 3, G - 31]].forEach(([x, y]) => poly(sp, [[x - 1.5, y + 2 + y0], [x, y - 2 + y0], [x + 1.5, y + 2 + y0]]));
      const armF = part('limb', {zone: 'arm'}); limb(armF, cx + 6, G - 16 + y0, cx + 10, G - 12 + y0 - sway * 3, 1.4, 1.1);
      eyes = [{x: cx + 1, y: G - 26 + y0, w: 2, h: 2}, {x: cx + 6, y: G - 26 + y0, w: 2, h: 2}];
      mouth = {x: cx + 8, y: G - 21 + y0, w: 3};
      a = {head: [cx + 1, G - 31 + y0], side: [cx - 14, G - 16], hold: [cx + 11, G - 12 + y0 - sway * 3], rear: [cx - 19, G - 9], cube: [cx + 15, G - 34], box: [cx - 19, G - 33, cx + 13, G]};
      break;
    }
    case 5: { // PROCESS: four-legged runner facing right
      const y0 = -bob;
      const tail = part('limb', {zone: 'tail'}); chain(tail, [[cx - 13, G - 12 + y0, 2.8], [cx - 19, G - 16, 2], [cx - 22, G - 23 + sway, 1.4], [cx - 20, G - 27 + sway, 1]]);
      const far = part('far', {zone: 'legs'}); limb(far, cx + 4, G - 8 + y0, cx + 3 - walk * 2, G - 1, 1.6); limb(far, cx - 7, G - 8 + y0, cx - 6 + walk * 2, G - 1, 1.6);
      const b = part('body', {zone: 'body'}); ellipse(b, cx - 2, G - 11 + y0, 13, 6.2);
      const bel = part('belly', {zone: 'body'}); ellipse(bel, cx - 1, G - 7.5 + y0, 9, 2.4);
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx + 7, G - 8 + y0, cx + 8 + walk * 2, G - 1, 1.8); limb(legs, cx - 10, G - 8 + y0, cx - 11 - walk * 2, G - 1, 1.8);
      const neck = part('body', {zone: 'body'}); limb(neck, cx + 8, G - 13 + y0, cx + 12, G - 18 + y0, 3.4, 3);
      const ears = part('body', {zone: 'head'}); poly(ears, [[cx + 10, G - 24 + y0], [cx + 11, G - 31 + y0], [cx + 14, G - 24 + y0]]); poly(ears, [[cx + 15, G - 24 + y0], [cx + 17, G - 30 + y0], [cx + 18, G - 23 + y0]]);
      const head = part('body', {zone: 'head'}); ellipse(head, cx + 14, G - 20.5 + y0, 6, 5); ellipse(head, cx + 19.5, G - 19 + y0, 4, 2.6);
      eyes = [{x: cx + 15, y: G - 23 + y0, w: 2, h: 2}];
      mouth = {x: cx + 20, y: G - 18 + y0, w: 3};
      a = {head: [cx + 14, G - 25 + y0], side: [cx - 3, G - 13 + y0], hold: [cx + 23, G - 18 + y0], rear: [cx - 22, G - 14], cube: [cx + 22, G - 34], box: [cx - 23, G - 31, cx + 24, G]};
      break;
    }
    case 6: { // THREAD: wyrm, slithering S-curve
      const ph = mo.phase, N = 16, path = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        path.push([5 + 37 * t, G - 6 - 6.5 * Math.sin(t * 9 - ph) * (1 - t * 0.55) - 12 * t * t, 0.9 + 3.1 * Math.pow(Math.sin(Math.PI * Math.min(t, 0.85) / 0.85), 0.6)]);
      }
      const [hx0, hy0] = path[N], hx = hx0 + 3, hy = hy0 - 4;
      const fr = part('membrane', {zone: 'head'}); poly(fr, [[hx - 3, hy - 1], [hx - 9, hy - 7], [hx - 5, hy - 4], [hx - 6, hy - 10], [hx - 2, hy - 5], [hx + 1, hy - 8], [hx + 1, hy - 3]]);
      const b = part('body', {zone: 'body'}); chain(b, path); limb(b, hx0, hy0, hx, hy, 3.4, 3.4);
      const bel = part('belly', {zone: 'body'}); chain(bel, path.slice(2, N - 1).map(([x, y, r]) => [x + 0.5, y + r * 0.55, r * 0.42]));
      const sp = part('horn', {zone: 'body'}); for (let i = 3; i < N - 1; i += 2) { const [x, y, r] = path[i]; poly(sp, [[x - 1.2, y - r + 0.5], [x - 0.3, y - r - 2.3], [x + 1, y - r + 0.5]]); }
      const head = part('body', {zone: 'head'}); ellipse(head, hx, hy, 6.5, 4.8); ellipse(head, hx + 5.5, hy + 1.5, 4.5, 2.6);
      const whisk = part('horn', {zone: 'head'}); chain(whisk, [[hx + 8, hy + 3, 0.5], [hx + 11, hy + 6 - mo.alt, 0.5], [hx + 13, hy + 5, 0.4]]);
      eyes = [{x: hx, y: hy - 2, w: 2, h: 2}];
      mouth = {x: hx + 5, y: hy + 2, w: 3, tongue: mo.alt};
      a = {head: [hx - 1, hy - 5], side: [path[8][0], path[8][1] - 3], hold: [hx + 10, hy + 2], rear: [path[1][0], path[1][1]], cube: [52, 6], box: [5, hy - 10, hx + 10, G], tailX: 15};
      break;
    }
    case 7: { // DAEMON: winged imp
      const y0 = -bob, fl = flap;
      const wing = part('membrane', {zone: 'wing'});
      for (const s of [-1, 1]) {
        const sx = cx + s * 5;
        poly(wing, [[sx, G - 23 + y0], [sx + s * 13, G - 33 - fl * 2 + y0], [sx + s * 19, G - 26 - fl + y0], [sx + s * 17, G - 19 + y0], [sx + s * 13, G - 21 + y0], [sx + s * 11, G - 16 + y0], [sx + s * 7, G - 19 + y0], [sx + s * 3, G - 15 + y0]]);
      }
      const bones = part('limb', {zone: 'wing'});
      for (const s of [-1, 1]) { const sx = cx + s * 5; limb(bones, sx, G - 23 + y0, cx + s * 18, G - 33 - fl * 2 + y0, 0.9, 0.5); limb(bones, cx + s * 18, G - 33 - fl * 2 + y0, cx + s * 24, G - 26 - fl + y0, 0.6, 0.4); }
      const tail = part('limb', {zone: 'tail'}); chain(tail, [[cx + 3, G - 8 + y0, 1.4], [cx + 12, G - 5, 1.1], [cx + 17, G - 10 - sway, 0.8]]);
      const tip = part('horn', {zone: 'tail'}); poly(tip, [[cx + 15, G - 11 - sway], [cx + 18, G - 16 - sway], [cx + 20, G - 10 - sway]]);
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx - 3, G - 9 + y0, cx - 4, G - 1, 2); limb(legs, cx + 3, G - 9 + y0, cx + 4, G - 1, 2);
      ellipse(legs, cx - 5, G - 0.5, 2.6, 1.2); ellipse(legs, cx + 5, G - 0.5, 2.6, 1.2);
      const b = part('body', {zone: 'body'}); ellipse(b, cx, G - 14 + y0, 6.5, 7);
      const bel = part('belly', {zone: 'body'}); ellipse(bel, cx, G - 12.5 + y0, 4, 4.5);
      const arms = part('limb', {zone: 'arm'}); limb(arms, cx - 6, G - 18 + y0, cx - 10, G - 12 + y0 - sway * 4, 1.5, 1.1); limb(arms, cx + 6, G - 18 + y0, cx + 10, G - 12 + y0, 1.5, 1.1);
      const head = part('body', {zone: 'head'}); ellipse(head, cx, G - 25 + y0, 6, 5.5);
      poly(head, [[cx - 5, G - 26 + y0], [cx - 9, G - 30 + y0], [cx - 4, G - 29 + y0]]); poly(head, [[cx + 5, G - 26 + y0], [cx + 9, G - 30 + y0], [cx + 4, G - 29 + y0]]);
      const horns = part('horn', {zone: 'head'}); chain(horns, [[cx - 3, G - 29 + y0, 1.5], [cx - 5, G - 33 + y0, 1], [cx - 4, G - 36 + y0, 0.5]]); chain(horns, [[cx + 3, G - 29 + y0, 1.5], [cx + 5, G - 33 + y0, 1], [cx + 4, G - 36 + y0, 0.5]]);
      px(horns, cx - 11, G - 12 + y0 - sway * 4); px(horns, cx + 11, G - 12 + y0);
      eyes = [{x: cx - 3, y: G - 27 + y0, w: 2, h: 2}, {x: cx + 2, y: G - 27 + y0, w: 2, h: 2}];
      mouth = {x: cx - 1, y: G - 23 + y0, w: 3, fangs: true};
      a = {head: [cx, G - 31 + y0], side: [cx - 15, G - 13], hold: [cx - 11, G - 12 + y0 - sway * 4], rear: [cx + 20, G - 12], cube: [cx + 26, G - 12], box: [cx - 24, G - 36, cx + 24, G]};
      break;
    }
    case 8: { // SERVICE: wyvern with a raised wing and long neck
      const y0 = -bob, fl = flap;
      const wingF = part('far', {zone: 'wing'}); poly(wingF, [[cx + 2, G - 16 + y0], [cx + 2, G - 34 - fl * 3 + y0], [cx - 2, G - 28 + y0], [cx - 7, G - 31 - fl * 2 + y0], [cx - 6, G - 23 + y0], [cx - 4, G - 16 + y0]]);
      const tail = part('limb', {zone: 'tail'}); chain(tail, [[cx - 14, G - 11 + y0, 3], [cx - 22, G - 7, 2], [cx - 27, G - 11 - sway, 1.2]]);
      const tip = part('horn', {zone: 'tail'}); poly(tip, [[cx - 28, G - 9 - sway], [cx - 31, G - 13 - sway], [cx - 27, G - 15 - sway], [cx - 25, G - 12 - sway]]);
      const far = part('far', {zone: 'legs'}); limb(far, cx + 5, G - 8 + y0, cx + 4 - walk * 2, G - 1, 2); limb(far, cx - 8, G - 8 + y0, cx - 7 + walk * 2, G - 1, 2);
      const b = part('body', {zone: 'body'}); ellipse(b, cx - 3, G - 11 + y0, 14, 7);
      const bel = part('belly', {zone: 'body'}); ellipse(bel, cx - 2, G - 7.5 + y0, 10, 2.6);
      const spikes = part('horn', {zone: 'body'}); for (let x = cx - 14; x <= cx + 6; x += 4) poly(spikes, [[x - 1.5, G - 16 + y0 + (x < cx - 10 ? 1 : 0)], [x, G - 20 + y0], [x + 1.5, G - 16 + y0]]);
      const wing = part('membrane', {zone: 'wing'}); poly(wing, [[cx - 2, G - 16 + y0], [cx - 8, G - 37 - fl * 3 + y0], [cx - 13, G - 29 + y0], [cx - 20, G - 34 - fl * 2 + y0], [cx - 20, G - 25 + y0], [cx - 26, G - 25 - fl + y0], [cx - 14, G - 16 + y0]]);
      const bones = part('limb', {zone: 'wing'}); limb(bones, cx - 2, G - 16 + y0, cx - 8, G - 37 - fl * 3 + y0, 1, 0.5); limb(bones, cx - 8, G - 37 - fl * 3 + y0, cx - 20, G - 34 - fl * 2 + y0, 0.6, 0.5); limb(bones, cx - 8, G - 37 - fl * 3 + y0, cx - 26, G - 25 - fl + y0, 0.6, 0.4);
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx + 8, G - 8 + y0, cx + 9 + walk * 2, G - 1, 2.2); limb(legs, cx - 11, G - 8 + y0, cx - 12 - walk * 2, G - 1, 2.2);
      const neck = part('body', {zone: 'body'}); chain(neck, [[cx + 8, G - 14 + y0, 3.6], [cx + 13, G - 21 + y0, 2.8], [cx + 16, G - 26 + y0, 2.6]]);
      const horns = part('horn', {zone: 'head'}); chain(horns, [[cx + 16, G - 31 + y0, 1.2], [cx + 13, G - 35 + y0, 0.6]]); chain(horns, [[cx + 19, G - 31 + y0, 1.1], [cx + 18, G - 36 + y0, 0.5]]);
      const head = part('body', {zone: 'head'}); ellipse(head, cx + 18, G - 28.5 + y0, 5.5, 4); ellipse(head, cx + 23, G - 27.5 + y0, 3.8, 2.4);
      eyes = [{x: cx + 18, y: G - 30 + y0, w: 2, h: 2}];
      mouth = {x: cx + 23, y: G - 26 + y0, w: 3, fangs: true};
      a = {head: [cx + 17, G - 33 + y0], side: [cx - 4, G - 12 + y0], hold: [cx + 27, G - 26 + y0], rear: [cx - 28, G - 12], cube: [cx + 24, G - 17], box: [cx - 31, G - 38, cx + 27, G]};
      break;
    }
    case 9: { // KERNEL: seated great dragon, wings spread
      const y0 = -bob, fl = flap;
      const wing = part('membrane', {zone: 'wing'});
      for (const s of [-1, 1]) {
        const sx = cx + s * 7;
        poly(wing, [[sx, G - 22 + y0], [cx + s * 20, G - 36 - fl * 2], [cx + s * 29, G - 30 - fl], [cx + s * 27, G - 21], [cx + s * 23, G - 24], [cx + s * 21, G - 16], [cx + s * 17, G - 20], [cx + s * 14, G - 13], [sx + s * 2, G - 15 + y0]]);
      }
      const bones = part('limb', {zone: 'wing'});
      for (const s of [-1, 1]) { const sx = cx + s * 7; limb(bones, sx, G - 22 + y0, cx + s * 20, G - 36 - fl * 2, 1.1, 0.6); limb(bones, cx + s * 20, G - 36 - fl * 2, cx + s * 29, G - 30 - fl, 0.7, 0.5); limb(bones, cx + s * 20, G - 36 - fl * 2, cx + s * 23, G - 24, 0.5); limb(bones, cx + s * 20, G - 36 - fl * 2, cx + s * 17, G - 20, 0.5); }
      const haunch = part('limb', {zone: 'legs'}); ellipse(haunch, cx - 8, G - 5, 6, 5); ellipse(haunch, cx + 8, G - 5, 6, 5);
      const b = part('body', {zone: 'body'}); ellipse(b, cx, G - 13 + y0, 10, 11);
      const bel = part('belly', {zone: 'body'}); ellipse(bel, cx, G - 11 + y0, 6, 8);
      const arms = part('limb', {zone: 'arm'}); limb(arms, cx - 8, G - 17 + y0, cx - 6, G - 3, 2.2, 1.8); limb(arms, cx + 8, G - 17 + y0, cx + 6, G - 3, 2.2, 1.8);
      const tail = part('limb', {zone: 'tail'}); chain(tail, [[cx + 10, G - 3, 2.6], [cx, G - 0.5, 2.2], [cx - 12, G - 1, 1.6], [cx - 17, G - 5 - sway, 1]]);
      const claws = part('horn', {zone: 'legs'}); [-7, -5, 5, 7].forEach(o => px(claws, cx + o, G - 1));
      const neck = part('body', {zone: 'body'}); limb(neck, cx, G - 22 + y0, cx, G - 26 + y0, 4.2, 3.8);
      const horns = part('horn', {zone: 'head'}); for (const s of [-1, 1]) chain(horns, [[cx + s * 4, G - 31 + y0, 1.8], [cx + s * 8, G - 35 + y0, 1.1], [cx + s * 10, G - 37 + y0, 0.5]]);
      const head = part('body', {zone: 'head'}); ellipse(head, cx, G - 29 + y0, 6.5, 5); ellipse(head, cx, G - 25.5 + y0, 4.2, 2.8);
      eyes = [{x: cx - 4, y: G - 31 + y0, w: 2, h: 2}, {x: cx + 3, y: G - 31 + y0, w: 2, h: 2}];
      mouth = {x: cx - 1, y: G - 24 + y0, w: 3, fangs: true};
      a = {head: [cx, G - 34 + y0], side: [cx - 16, G - 9], hold: [cx - 7, G - 4], rear: [cx - 18, G - 6], cube: [cx + 25, G - 10], box: [cx - 29, G - 37, cx + 29, G]};
      decor = bellyPlates;
      break;
    }
    case 10: { // SINGULARITY: ascended, floating geometric form
      const fy = Math.round(Math.sin(mo.phase * 0.7) * 1.4), y = G - 18 + fy;
      const wing = part('membrane', {zone: 'wing'});
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
        const ang = (-0.35 - i * 0.28) * s, len = 14 + i * 2 + flap;
        limb(wing, cx + s * 6, y - 4, cx + s * 6 + Math.sin(ang) * len * s * s, y - 4 - Math.cos(ang) * len * 0.75, 1.2, 0.5);
      }
      const halo = part('horn', {zone: 'head'}); ring(halo, cx, y - 19, 9, 2.4, 1);
      const plates = part('limb', {zone: 'body'});
      for (const s of [-1, 1]) {
        poly(plates, [[cx + s * 10, y - 9], [cx + s * 15, y - 7], [cx + s * 12, y - 3]]);
        const hy = y + 4 - fy * 2;
        poly(plates, [[cx + s * 17, hy - 2.5], [cx + s * 19.5, hy], [cx + s * 17, hy + 2.5], [cx + s * 14.5, hy]]);
      }
      const b = part('body', {zone: 'body'}); poly(b, [[cx, y - 13], [cx + 9.5, y], [cx, y + 13], [cx - 9.5, y]]);
      const facet = part('belly', {zone: 'body'}); poly(facet, [[cx, y - 7], [cx + 5, y], [cx, y + 7], [cx - 5, y]]);
      const core = part('core', {zone: 'body'}); ellipse(core, cx, y, mo.alt ? 2.4 : 1.8, mo.alt ? 2.4 : 1.8);
      const head = part('body', {zone: 'head'}); poly(head, [[cx - 3.5, y - 16], [cx, y - 19.5], [cx + 3.5, y - 16], [cx + 3.5, y - 14.5], [cx, y - 13], [cx - 3.5, y - 14.5]]);
      eyes = [{x: cx - 2, y: y - 16, w: 5, h: 1, visor: true}];
      mouth = null;
      a = {head: [cx, y - 22], side: [cx - 20, y + 4], hold: [cx - 17, y + 4], rear: [cx, y + 15], cube: [cx + 22, 6], box: [cx - 22, y - 24, cx + 22, y + 14], float: true};
      break;
    }
  }
  return {parts, eyes, mouth, a, decor};
}
