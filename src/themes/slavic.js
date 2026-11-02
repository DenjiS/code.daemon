/* Slavic: the line retold as characters from Slavic fairy tales.
   Each creature brings its own colors (plan.main and part.c) and folk ornament (part.pat).
   The affinity still shows in the crest above the head, as in Classic. */
'use strict';
const {G, px, ellipse, poly, limb, chain} = require('../render/raster');
const {partList} = require('../render/figure');
const {eggCrack} = require('../render/egg');

module.exports = {
  id: 'slavic', name: 'Slavic', accent: '#3D6BE0', screen: '#0B0F1D', dot: '#161C2F', drawsEgg: true,
  bodies: ['Pysanka', 'Kolobok', 'Frog tsarevna', 'Domovoi', 'Leshy', 'Humpbacked horse', 'Poloz', 'Baba Yaga', 'Firebird', 'Zmei Gorynych', 'Koschei'],
  plans,
};

const SL = {
  red: '#D23A2C', redDark: '#9C2A22', gold: '#F2B33D', goldDark: '#C08A2A', linen: '#EFE7D3',
  bread: '#DFA65A', crust: '#B9793A', cheek: '#EE7A62',
  frog: '#62B84A', frogDark: '#3F8A33',
  hair: '#8C6A48', hairDark: '#62482F', beard: '#DAD4C5', skin: '#EBBB94', nose: '#D9806A', pants: '#5B6C96', bast: '#D9B35A',
  bark: '#7E5E3E', barkDark: '#5A422C', moss: '#6E9E3C', leaf: '#9CCB4E', branch: '#9A7650', amanita: '#E2402E',
  horse: '#A6B4CE', dapple: '#CDD6E6', mane: '#EDE7D8', hoof: '#545668',
  malachite: '#2FA27C', malLight: '#86E0BA',
  wood: '#8E5E34', woodDark: '#6A4424', woodLight: '#C99A62', straw: '#D2AA58', shawl: '#4E5F8F', hairGray: '#C3C6CC', skinOld: '#DDB896',
  fire: '#FF8A2A', flame: '#FFD24A', ember: '#FF5A2A', wingRed: '#E2412E',
  zmei: '#4E9E45', zmeiDark: '#3A7A34', plate: '#E3C25E',
  cloak: '#5C4082', cloakDark: '#3D2A5C', bone: '#E7E1CD', ghost: '#7CFF8A',
};
// embroidery: a lattice of rhombi in one thread color
const rhomb = (col, n) => (x, y) => { n = n || 6; const a = ((x + y) % n + n) % n, b = ((x - y) % n + n) % n; return a === 0 || b === 0 ? col : null; };
function plans(st, f, mo) {
  const {parts, part} = partList();
  const bob = mo.bob, walk = mo.walk, flap = mo.flap, sway = mo.sway, alt = mo.alt, live = mo.motion && !mo.sleeping;
  const S = SL, cx = 32, mut = mo.mut || {};
  const moved = (pat, dx, dy) => (x, y) => pat(x - dx, y - dy);  // ornament that rides along with the body
  let eyes = [], mouth = null, a = {}, main = null, decor = null;
  switch (st) {
    case 0: { // PYSANKA: a painted Easter egg, gold zigzag belt and sun rosettes on red
      const wob = mo.has ? mo.rock : 0;
      const ex = cx + wob, cy = G - 10 + 0.5;
      main = S.red;
      const pat = (x, y) => {
        const dy = Math.round(y - cy), dx = x - ex;
        if (Math.abs(dy) === 2) return S.linen;
        if (Math.abs(dy) < 2) return [0, 1, 2, 1][((dx % 4) + 4) % 4] === dy + 1 ? S.redDark : S.gold;
        for (const [rx, ry] of [[0, -6], [0, 6]]) { const d = Math.abs(dx - rx) + Math.abs(dy - ry); if (d === 0) return S.linen; if (d === 2) return S.gold; }
        if (Math.abs(dy) === 5 && Math.abs(dx) === 5) return S.linen;
        return null;
      };
      const b = part('body', {pattern: pat});
      for (let y = Math.floor(cy - 10); y <= Math.ceil(cy + 10); y++) for (let x = ex - 9; x <= ex + 9; x++) {
        const dy = (y - cy) / 10, rx = 8 * (dy < 0 ? 1 - 0.25 * dy * dy : 1), dx = (x - ex) / rx;
        if (dx * dx + dy * dy <= 1) px(b, x, y);
      }
      a = {head: [ex, cy - 11], side: [ex - 10, cy], hold: [ex - 10, cy + 2], rear: [ex - 9, cy], cube: [ex + 13, cy - 10], box: [ex - 8, cy - 10, ex + 8, G]};
      decor = ctx => eggCrack(ctx, ex, cy - 5);
      break;
    }
    case 1: { // KOLOBOK: the runaway bun, rosy cheeks
      const sq = bob ? 0.7 : 0, rx = 8 + sq, ry = 7.5 - sq, cy = G - ry + 0.5;
      main = S.bread;
      const b = part('body', {pattern: (x, y) => ((x * 5 + y * 3) % 13 === 0 ? S.crust : null)}); ellipse(b, cx, cy, rx, ry);
      const ch = part('cheek', {color: S.cheek, flat: true}); [[-7, 0], [-6, 0], [5, 0], [6, 0]].forEach(([dx, dy]) => px(ch, cx + dx, cy + dy));
      eyes = [{x: cx - 4, y: cy - 3, w: 2, h: 2}, {x: cx + 2, y: cy - 3, w: 2, h: 2}];
      mouth = {x: cx - 1, y: cy + 1, w: 3};
      a = {head: [cx, cy - ry - 1], side: [cx - 10, cy], hold: [cx - 10, cy + 2], rear: [cx - 10, cy], cube: [cx + 13, cy - 12], box: [cx - 9, cy - ry - 1, cx + 9, G]};
      break;
    }
    case 2: { // FROG TSAREVNA: crowned frog with Ivan's arrow in her mouth
      const cy = G - 6 - bob * 0.5;
      main = S.frog;
      const legs = part('limb');
      ellipse(legs, cx - 11, cy + 2, 3.5, 2.6); ellipse(legs, cx + 11, cy + 2, 3.5, 2.6);
      ellipse(legs, cx - 14, G - 0.5, 2.6, 1); ellipse(legs, cx + 14, G - 0.5, 2.6, 1);
      [-5, 5].forEach((o, i) => { const up = ((i + walk) & 1) ? 1 : 0; limb(legs, cx + o, cy + 3, cx + o * 1.3, G - up, 1.3, 1); });
      const b = part('body', {pattern: (x, y) => ((x * 3 + y * 5) % 11 === 0 ? S.frogDark : null)}); ellipse(b, cx, cy, 10.5, 5.5); ellipse(b, cx, cy - 3.5, 8.5, 4);
      const bel = part('belly'); ellipse(bel, cx, cy + 2.5, 6.5, 2.4);
      const bumps = part('body'); ellipse(bumps, cx - 5, cy - 7.5, 3, 2.8); ellipse(bumps, cx + 5, cy - 7.5, 3, 2.8);
      const iris = part('eyeWhite', {color: S.gold}); ellipse(iris, cx - 5, cy - 7.5, 1.8, 1.8); ellipse(iris, cx + 5, cy - 7.5, 1.8, 1.8);
      const shaft = part('far', {color: S.woodLight, flat: true}); limb(shaft, cx - 15, cy - 2, cx + 13, cy - 2, 0.4);
      const tip = part('horn', {color: '#C9D2DE'}); poly(tip, [[cx + 13, cy - 4], [cx + 17, cy - 2], [cx + 13, cy]]);
      const flet = part('membrane', {color: S.red}); poly(flet, [[cx - 18, cy - 5], [cx - 14, cy - 2], [cx - 18, cy + 1], [cx - 16, cy - 2]]);
      if (!mut.crowned) { const cr = part('core', {color: S.gold}); [[-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-2, -1], [0, -1], [2, -1], [0, -2]].forEach(([dx, dy]) => px(cr, cx + dx, cy - 9 + dy)); }
      eyes = [{x: cx - 5, y: cy - 8, w: 1, h: 2}, {x: cx + 5, y: cy - 8, w: 1, h: 2}];
      mouth = {x: cx - 3, y: cy - 3, w: 7};
      a = {head: [cx, mut.crowned ? cy - 8 : cy - 11], side: [cx - 16, cy - 1], hold: [cx - 15, cy], rear: [cx - 15, cy], cube: [cx + 16, cy - 14], box: [cx - 18, cy - 11, cx + 17, G]};
      break;
    }
    case 3: { // DOMOVOI: the house spirit, all hair and beard, red shirt, bast shoes, a bath broom
      const cy = G - 11.5 - bob;
      main = S.hair;
      const broom = part('far', {color: S.woodLight}); limb(broom, cx + 13, cy - 7, cx + 12, G - 6, 0.6);
      const bristle = part('limb', {color: S.straw, pattern: (x, y) => (x % 2 === 0 ? S.goldDark : null)}); poly(bristle, [[cx + 10, G - 6], [cx + 14, G - 6], [cx + 16, G], [cx + 8, G]]);
      const tie = part('core', {color: S.red}); px(tie, cx + 11, G - 6); px(tie, cx + 12, G - 6); px(tie, cx + 13, G - 6);
      const legs = part('limb', {color: S.pants}); limb(legs, cx - 3, cy + 7, cx - 3, G - 1, 1.6); limb(legs, cx + 3, cy + 7, cx + 3, G - 1, 1.6);
      const lapti = part('limb', {color: S.bast, pattern: (x, y) => ((x + y) % 2 === 0 ? S.goldDark : null)}); ellipse(lapti, cx - 4.5, G - 0.5, 2.8, 1.3); ellipse(lapti, cx + 4.5, G - 0.5, 2.8, 1.3);
      const shirt = part('body', {color: S.red, pattern: moved((x, y) => (y >= 6 ? ((x + y) % 2 === 0 ? S.linen : null) : null), 0, Math.round(cy))}); ellipse(shirt, cx, cy + 4, 7.5, 4.5);
      const belt = part('core', {color: S.gold}); limb(belt, cx - 6, cy + 3, cx + 6, cy + 3, 0.4);
      const arms = part('limb', {color: S.red}); limb(arms, cx - 7, cy + 2, cx - 11, cy + 6 - sway * 3, 1.3, 1.1); limb(arms, cx + 7, cy + 2, cx + 11, cy + 6, 1.3, 1.1);
      const hands = part('limb', {color: S.skin}); ellipse(hands, cx - 11.5, cy + 6.5 - sway * 3, 1.3, 1.3); ellipse(hands, cx + 11.5, cy + 6.5, 1.3, 1.3);
      const hair = part('body', {pattern: (x, y) => ((x * 3 + y) % 5 === 0 ? S.hairDark : null)}); ellipse(hair, cx, cy - 3, 8.5, 7.5);
      [[[-7, -7], [-11, -10], [-5, -9]], [[-5, -9], [-5, -13], [-2, -10]], [[-1, -10], [1, -14], [3, -10]], [[3, -10], [8, -12], [6, -8]], [[-8, -3], [-11, -1], [-8, 0]], [[8, -4], [11, -3], [8, -1]]]
        .forEach(t => poly(hair, t.map(([dx, dy]) => [cx + dx, cy + dy])));
      const face = part('body', {color: S.skin}); ellipse(face, cx, cy - 2.5, 5, 3);
      const beard = part('body', {color: S.beard, pattern: (x, y) => ((x * 2 + y) % 4 === 0 ? '#B9B2A2' : null)}); poly(beard, [[cx - 6, cy - 1], [cx + 6, cy - 1], [cx + 4, cy + 5], [cx, cy + 8], [cx - 4, cy + 5]]);
      const nose = part('core', {color: S.nose}); ellipse(nose, cx - 0.5, cy - 1.5, 1.3, 1);
      eyes = [{x: cx - 4, y: cy - 4, w: 2, h: 2}, {x: cx + 2, y: cy - 4, w: 2, h: 2}];
      mouth = {x: cx - 1, y: cy + 1, w: 3};
      a = {head: [cx, cy - 14], side: [cx - 14, cy + 3], hold: [cx - 12, cy + 6 - sway * 3], rear: [cx - 11, cy], cube: [cx - 17, cy - 14], box: [cx - 12, cy - 14, cx + 16, G]};
      break;
    }
    case 4: { // LESHY: forest spirit of bark and moss, branch antlers, a fly agaric on the shoulder
      const y0 = -bob;
      main = S.bark;
      const barkPat = moved((x, y) => ((x * 2 + (y >> 2)) % 5 === 0 ? S.barkDark : null), 0, y0);
      const br = part('horn', {color: S.branch});
      chain(br, [[cx - 3, G - 29 + y0, 1.2], [cx - 7, G - 33 + y0, 0.9], [cx - 9, G - 38 + y0, 0.6]]); limb(br, cx - 7, G - 33 + y0, cx - 12, G - 35 + y0, 0.5);
      chain(br, [[cx + 3, G - 29 + y0, 1.2], [cx + 7, G - 34 + y0, 0.9], [cx + 8, G - 39 + y0, 0.6]]); limb(br, cx + 7, G - 34 + y0, cx + 12, G - 36 + y0, 0.5);
      const lv = part('leaf', {color: S.leaf, flat: true}); [[-9, -39], [-10, -38], [-12, -36], [-13, -35], [8, -40], [9, -39], [12, -37], [13, -36]].forEach(([dx, dy]) => px(lv, cx + dx, G + dy + y0));
      const legs = part('limb', {pattern: barkPat}); limb(legs, cx - 3, G - 8 + y0, cx - 5, G - 1, 2); limb(legs, cx + 3, G - 8 + y0, cx + 5, G - 1, 2);
      limb(legs, cx - 5, G - 1, cx - 9, G, 0.7); limb(legs, cx + 5, G - 1, cx + 9, G, 0.7);
      const arms = part('limb', {pattern: barkPat});
      chain(arms, [[cx - 6, G - 19 + y0, 1.6], [cx - 11, G - 14 + y0, 1.2], [cx - 12, G - 8 + y0 - sway * 2, 1]]); limb(arms, cx - 12, G - 8 + y0 - sway * 2, cx - 14, G - 6 + y0 - sway * 2, 0.5);
      chain(arms, [[cx + 6, G - 19 + y0, 1.6], [cx + 11, G - 14 + y0, 1.2], [cx + 12, G - 8 + y0, 1]]); limb(arms, cx + 12, G - 8 + y0, cx + 14, G - 6 + y0, 0.5);
      const b = part('body', {pattern: barkPat}); ellipse(b, cx, G - 13 + y0, 7, 8.5);
      const head = part('body', {pattern: barkPat}); ellipse(head, cx, G - 25 + y0, 6, 5.5);
      const moss = part('body', {color: S.moss, pattern: (x, y) => ((x * 3 + y * 7) % 5 === 0 ? S.leaf : null)});
      poly(moss, [[cx - 6, G - 24 + y0], [cx + 6, G - 24 + y0], [cx + 5, G - 17 + y0], [cx + 3, G - 13 + y0], [cx + 1, G - 16 + y0], [cx - 1, G - 12 + y0], [cx - 3, G - 15 + y0], [cx - 5, G - 14 + y0]]);
      ellipse(moss, cx, G - 29.5 + y0, 5, 1.6);
      const stem = part('limb', {color: S.linen}); limb(stem, cx + 9, G - 21 + y0, cx + 9, G - 19 + y0, 0.7);
      const cap = part('body', {color: S.amanita, pattern: (x, y) => ((x * 2 + y) % 3 === 0 ? '#FFFFFF' : null)}); ellipse(cap, cx + 9, G - 22.5 + y0, 3.2, 1.8);
      eyes = [{x: cx - 3, y: G - 27 + y0, w: 2, h: 1, glow: '#D8F26A'}, {x: cx + 2, y: G - 27 + y0, w: 2, h: 1, glow: '#D8F26A'}];
      mouth = {x: cx - 1, y: G - 22 + y0, w: 3};
      a = {head: [cx, G - 31 + y0], side: [cx - 15, G - 14], hold: [cx - 13, G - 7 + y0 - sway * 2], rear: [cx - 10, G - 8], cube: [cx + 18, G - 34], box: [cx - 15, G - 39, cx + 15, G]};
      break;
    }
    case 5: { // HUMPBACKED HORSE (Konyok-Gorbunok): long ears, a hump, a red saddle cloth and a bell
      const y0 = -bob;
      main = S.horse;
      const dapple = moved((x, y) => ((x * 7 + y * 11) % 10 === 0 ? S.dapple : null), 0, y0);
      const tail = part('limb', {color: S.mane}); chain(tail, [[cx - 12, G - 13 + y0, 1.6], [cx - 16, G - 12, 1.4], [cx - 18, G - 7 + sway, 1.1], [cx - 17, G - 4 + sway, 0.8]]);
      const far = part('far'); limb(far, cx + 4, G - 8 + y0, cx + 3 - walk * 2, G - 1, 1.3); limb(far, cx - 8, G - 8 + y0, cx - 7 + walk * 2, G - 1, 1.3);
      const b = part('body', {pattern: dapple}); ellipse(b, cx - 2, G - 11 + y0, 10.5, 5.2);
      const hump = part('body', {pattern: dapple}); ellipse(hump, cx - 5, G - 15.5 + y0, 4.5, 3.6);
      const bel = part('belly'); ellipse(bel, cx - 1, G - 7.5 + y0, 7.5, 1.6);
      const legs = part('limb'); limb(legs, cx + 6, G - 8 + y0, cx + 7 + walk * 2, G - 1, 1.4); limb(legs, cx - 10, G - 8 + y0, cx - 11 - walk * 2, G - 1, 1.4);
      const hv = part('core', {color: S.hoof}); [cx + 7 + walk * 2, cx - 11 - walk * 2, cx + 3 - walk * 2, cx - 7 + walk * 2].forEach(x => { px(hv, x, G - 1); px(hv, x + 1, G - 1); });
      const cloth = part('body', {color: S.red, pattern: moved(rhomb(S.linen, 4), 0, y0)}); poly(cloth, [[cx - 10, G - 15 + y0], [cx + 1, G - 15 + y0], [cx + 2, G - 9 + y0], [cx - 11, G - 9 + y0]]);
      const fringe = part('core', {color: S.gold}); for (let x = cx - 11; x <= cx + 2; x += 2) px(fringe, x, G - 8 + y0);
      const neck = part('body', {pattern: dapple}); limb(neck, cx + 6, G - 13 + y0, cx + 10, G - 19 + y0, 3.2, 2.8);
      const ears = part('body'); poly(ears, [[cx + 9, G - 23 + y0], [cx + 7 - alt, G - 35 + y0], [cx + 11, G - 24 + y0]]); poly(ears, [[cx + 12, G - 24 + y0], [cx + 14, G - 36 + y0], [cx + 14.5, G - 23 + y0]]);
      const inner = part('core', {color: S.cheek}); limb(inner, cx + 9, G - 25 + y0, cx + 8 - alt, G - 32 + y0, 0.3); limb(inner, cx + 13, G - 25 + y0, cx + 14, G - 33 + y0, 0.3);
      const head = part('body'); ellipse(head, cx + 12, G - 21 + y0, 4.5, 3.8); ellipse(head, cx + 16.5, G - 19.5 + y0, 3, 2.2);
      const mane = part('limb', {color: S.mane}); chain(mane, [[cx + 9, G - 24 + y0, 1.2], [cx + 7, G - 19 + y0, 1.3], [cx + 4, G - 15 + y0, 1]]);
      const bridle = part('core', {color: S.red}); limb(bridle, cx + 10, G - 23 + y0, cx + 15, G - 18 + y0, 0.4); px(bridle, cx + 16, G - 18 + y0);
      const bell = part('core', {color: S.gold}); ellipse(bell, cx + 8 + (live ? alt : 0), G - 13 + y0, 1.2, 1.2);
      eyes = [{x: cx + 11, y: G - 23 + y0, w: 2, h: 2}];
      mouth = {x: cx + 16, y: G - 18 + y0, w: 3};
      a = {head: [cx + 11, G - 26 + y0], side: [cx - 4, G - 11 + y0], hold: [cx + 20, G - 19 + y0], rear: [cx - 18, G - 12], cube: [cx + 22, G - 34], box: [cx - 19, G - 36, cx + 20, G]};
      break;
    }
    case 6: { // POLOZ: the great serpent, malachite and gold, king of snakes
      const ph = mo.phase, N = 16, path = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        path.push([5 + 37 * t, G - 6 - 6 * Math.sin(t * 8 - ph) * (1 - t * 0.5) - 12 * t * t, 1 + 3 * Math.pow(Math.sin(Math.PI * Math.min(t, 0.85) / 0.85), 0.6)]);
      }
      main = S.malachite;
      const scale = (x, y) => ((x + 2 * y) % 6 === 0 ? S.malLight : (x * 3 + y) % 11 === 0 ? S.gold : null);
      const [hx0, hy0] = path[N], hx = hx0 + 3, hy = hy0 - 4;
      const b = part('body', {pattern: scale}); chain(b, path); limb(b, hx0, hy0, hx, hy, 3, 3);
      const bel = part('belly'); chain(bel, path.slice(2, N - 1).map(([x, y, r]) => [x + 0.5, y + r * 0.55, r * 0.42]));
      const head = part('body', {pattern: scale}); ellipse(head, hx, hy, 6, 4.5); ellipse(head, hx + 5, hy + 1.5, 4, 2.4);
      if (!mut.crowned) { const cr = part('core', {color: S.gold}); for (let x = hx - 3; x <= hx + 1; x++) px(cr, x, hy - 5); [[-3, -6], [-1, -6], [1, -6], [-3, -7], [-1, -7], [1, -7], [-1, -8]].forEach(([dx, dy]) => px(cr, hx + dx, hy + dy)); }
      eyes = [{x: hx, y: hy - 2, w: 2, h: 2, glow: S.flame, slit: true}];
      mouth = {x: hx + 5, y: hy + 2, w: 3, tongue: mo.alt};
      a = {head: [hx - 1, mut.crowned ? hy - 5 : hy - 9], side: [path[8][0], path[8][1] - 3], hold: [hx + 10, hy + 2], rear: [path[1][0], path[1][1]], cube: [52, 6], box: [5, hy - 9, hx + 10, G]};
      break;
    }
    case 7: { // BABA YAGA: flying in her mortar, pestle in hand, the broom sweeping her tracks
      const fy = mo.motion ? Math.round(Math.sin(mo.phase * 0.7) * 1.4) : 0, y = G - 16 + fy, sw = live ? alt : 0;
      main = S.wood;
      const handle = part('far', {color: S.woodLight}); limb(handle, cx - 5, y + 3, cx - 15, y + 9, 0.6);
      const twigs = part('limb', {color: S.straw, pattern: (x, yy) => ((x + yy) % 2 === 0 ? S.goldDark : null)}); poly(twigs, [[cx - 14, y + 7], [cx - 15, y + 10], [cx - 24, y + 12 + sw], [cx - 25, y + 8 - sw], [cx - 21, y + 6]]);
      const shawl = part('body', {color: S.shawl, pattern: rhomb(S.linen, 4)}); ellipse(shawl, cx, y - 5, 5.5, 3.2);
      const arm = part('limb', {color: S.shawl}); limb(arm, cx + 3, y - 5, cx + 6, y - 6, 1.1);
      const pest = part('horn', {color: S.woodLight}); chain(pest, [[cx + 4, y - 2, 0.7], [cx + 10, y - 13, 1]]); ellipse(pest, cx + 10.5, y - 14, 1.5, 1.8);
      const hand = part('limb', {color: S.skinOld}); ellipse(hand, cx + 6.5, y - 6.5, 1.2, 1.2);
      const mortar = part('body', {pattern: moved((x, yy) => (yy % 4 === 0 ? S.woodDark : null), 0, y)}); poly(mortar, [[cx - 8, y - 3], [cx + 8, y - 3], [cx + 6, y + 10], [cx - 6, y + 10]]);
      const rim = part('belly', {color: S.woodLight}); limb(rim, cx - 8, y - 3, cx + 8, y - 3, 0.7);
      const hair = part('limb', {color: S.hairGray}); [[-4, -10], [-4, -9], [-5, -8], [-3, -8], [4, -12], [5, -11]].forEach(([dx, dy]) => px(hair, cx + dx, y + dy));
      const face = part('body', {color: S.skinOld}); ellipse(face, cx + 0.5, y - 9.5, 4, 3.4);
      const nose = part('limb', {color: S.skinOld}); poly(nose, [[cx + 3, y - 12], [cx + 8, y - 9], [cx + 8, y - 7], [cx + 4, y - 8]]);
      const wart = part('core', {color: '#B98A6A'}); px(wart, cx + 6, y - 10);
      const scarf = part('body', {color: S.red, pattern: (x, yy) => ((x * 2 + yy) % 4 === 0 ? S.linen : null)}); ellipse(scarf, cx + 0.5, y - 13.5, 5, 2.3); poly(scarf, [[cx - 3, y - 13], [cx - 7, y - 6], [cx - 3, y - 10]]);
      eyes = [{x: cx - 2, y: y - 11, w: 2, h: 1}, {x: cx + 2, y: y - 11, w: 1, h: 1}];
      mouth = {x: cx - 1, y: y - 8, w: 3, tooth: true};
      a = {head: [cx + 1, y - 17], side: [cx - 12, y + 3], hold: [cx - 9, y - 4], rear: [cx - 25, y + 9], cube: [cx + 22, 6], box: [cx - 25, y - 16, cx + 12, y + 12], float: true};
      break;
    }
    case 8: { // FIREBIRD (Zhar-ptitsa): burning plumes with peacock eyes, a three-feather crest
      const y0 = -bob, fl = flap, fire = (x, y) => (((x + y + (live ? f : 0)) % 5) === 0 ? S.flame : null);
      main = S.fire;
      const tails = [
        [[cx - 3, G - 13 + y0, 1.6], [cx - 12, G - 11, 1.3], [cx - 20, G - 13 - sway, 1], [cx - 24, G - 19 - sway, 0.8]],
        [[cx - 3, G - 12 + y0, 1.6], [cx - 13, G - 6, 1.2], [cx - 22, G - 5, 1], [cx - 27, G - 9 + sway, 0.8]],
        [[cx - 3, G - 14 + y0, 1.4], [cx - 10, G - 19, 1.1], [cx - 14, G - 25 - sway, 0.9], [cx - 12, G - 30 - sway, 0.7]],
      ];
      const tail = part('limb', {color: S.flame, pattern: fire}); tails.forEach(t => chain(tail, t));
      const ring1 = part('core', {color: S.gold}), ring2 = part('core', {color: S.ember});
      tails.forEach(t => { const [x, y] = t[t.length - 1]; ellipse(ring1, x, y, 2.2, 2.2); ellipse(ring2, x, y, 1, 1); });
      const wing = part('membrane', {color: S.wingRed, pattern: (x, y) => ((x - y) % 3 === 0 ? S.flame : null)});
      poly(wing, [[cx - 1, G - 17 + y0], [cx - 4, G - 29 - fl * 2 + y0], [cx - 10, G - 32 - fl * 3 + y0], [cx - 9, G - 25 + y0], [cx - 13, G - 23 - fl + y0], [cx - 6, G - 15 + y0]]);
      const legs = part('limb', {color: S.gold}); limb(legs, cx + 1, G - 10 + y0, cx, G - 1, 0.7); limb(legs, cx + 4, G - 10 + y0, cx + 5, G - 1, 0.7);
      [[-1, 0], [1, 0], [4, 0], [6, 0]].forEach(([dx]) => px(legs, cx + dx, G - 1));
      const b = part('body', {pattern: fire}); ellipse(b, cx + 2, G - 14 + y0, 7, 5.5);
      const breast = part('belly', {color: S.flame}); ellipse(breast, cx + 5.5, G - 13 + y0, 3, 3.6);
      const wingF = part('limb', {color: S.wingRed, pattern: (x, y) => ((x - y) % 3 === 0 ? S.flame : null)}); ellipse(wingF, cx - 0.5, G - 14 + y0, 5, 3);
      const neck = part('body'); limb(neck, cx + 5, G - 18 + y0, cx + 8, G - 22 + y0, 2.4, 2.2);
      const head = part('body'); ellipse(head, cx + 9, G - 24 + y0, 3.6, 3.2);
      const beak = part('horn', {color: S.gold}); poly(beak, [[cx + 12, G - 25.5 + y0], [cx + 16, G - 23.5 + y0], [cx + 12, G - 22 + y0]]);
      const crest = part('limb', {color: S.flame}); limb(crest, cx + 8, G - 27 + y0, cx + 6, G - 31 + y0, 0.4); limb(crest, cx + 9, G - 27 + y0, cx + 9, G - 32 + y0, 0.4); limb(crest, cx + 10, G - 27 + y0, cx + 12, G - 31 + y0, 0.4);
      const tips = part('core', {color: live && alt ? S.flame : S.ember}); [[6, -32], [9, -33], [12, -32]].forEach(([dx, dy]) => px(tips, cx + dx, G + dy + y0));
      if (live) { const em = part('core', {color: S.flame}); for (let k = 0; k < 3; k++) { const t = (f + k * 5) % 16; if (t < 10) px(em, cx - 20 + k * 6 + (t & 1), G - 16 - t); } }
      eyes = [{x: cx + 9, y: G - 26 + y0, w: 2, h: 2}];
      mouth = {x: cx + 12, y: G - 24 + y0, w: 3};
      a = {head: [cx + 9, G - 34 + y0], side: [cx - 1, G - 14 + y0], hold: [cx + 16, G - 20 + y0], rear: [cx - 27, G - 12], cube: [cx + 22, G - 12], box: [cx - 28, G - 33, cx + 16, G]};
      break;
    }
    case 9: { // ZMEI GORYNYCH: three heads, golden belly plates, the side heads take turns breathing fire
      const y0 = -bob, fl = flap;
      main = S.zmei;
      const scales = moved((x, y) => ((x * 3 + y * 5) % 7 === 0 ? S.zmeiDark : null), 0, y0);
      const wing = part('membrane', {color: '#8E4430'});
      for (const s of [-1, 1]) poly(wing, [[cx + s * 7, G - 21 + y0], [cx + s * 20, G - 36 - fl * 2], [cx + s * 29, G - 29 - fl], [cx + s * 27, G - 20], [cx + s * 23, G - 23], [cx + s * 21, G - 15], [cx + s * 17, G - 19], [cx + s * 13, G - 12], [cx + s * 8, G - 14 + y0]]);
      const bones = part('limb');
      for (const s of [-1, 1]) { limb(bones, cx + s * 7, G - 21 + y0, cx + s * 20, G - 36 - fl * 2, 1, 0.6); limb(bones, cx + s * 20, G - 36 - fl * 2, cx + s * 29, G - 29 - fl, 0.6, 0.5); limb(bones, cx + s * 20, G - 36 - fl * 2, cx + s * 23, G - 23, 0.5); limb(bones, cx + s * 20, G - 36 - fl * 2, cx + s * 17, G - 19, 0.5); }
      const haunch = part('limb', {pattern: scales}); ellipse(haunch, cx - 8, G - 5, 6, 5); ellipse(haunch, cx + 8, G - 5, 6, 5);
      const b = part('body', {pattern: scales}); ellipse(b, cx, G - 13 + y0, 10, 10.5);
      const bel = part('belly', {color: S.plate, pattern: moved((x, y) => (y % 3 === 0 ? S.goldDark : null), 0, y0)}); ellipse(bel, cx, G - 11 + y0, 6, 8);
      const arms = part('limb'); limb(arms, cx - 8, G - 17 + y0, cx - 6, G - 3, 2.2, 1.8); limb(arms, cx + 8, G - 17 + y0, cx + 6, G - 3, 2.2, 1.8);
      const tail = part('limb'); chain(tail, [[cx + 10, G - 3, 2.6], [cx, G - 0.5, 2.2], [cx - 12, G - 1, 1.6], [cx - 17, G - 5 - sway, 1]]);
      const claws = part('horn'); [-7, -5, 5, 7].forEach(o => px(claws, cx + o, G - 1)); poly(claws, [[cx - 18, G - 4 - sway], [cx - 21, G - 8 - sway], [cx - 16, G - 7 - sway]]);
      const necks = part('body', {pattern: scales});
      chain(necks, [[cx - 6, G - 21 + y0, 3], [cx - 11, G - 26 + y0, 2.4], [cx - 14, G - 30 + y0, 2.2]]);
      chain(necks, [[cx + 6, G - 21 + y0, 3], [cx + 11, G - 26 + y0, 2.4], [cx + 14, G - 30 + y0, 2.2]]);
      limb(necks, cx, G - 22 + y0, cx, G - 28 + y0, 3.2, 2.6);
      const heads = part('body');
      for (const s of [-1, 1]) { ellipse(heads, cx + s * 15, G - 31 + y0, 4.2, 3.3); ellipse(heads, cx + s * 19, G - 30 + y0, 2.8, 1.9); }
      ellipse(heads, cx, G - 31 + y0, 4, 3.2); ellipse(heads, cx, G - 28.5 + y0, 2.6, 1.6);
      const horns = part('horn'); for (const hx of [cx - 15, cx, cx + 15]) { px(horns, hx - 2, G - 35 + y0); px(horns, hx + 2, G - 35 + y0); px(horns, hx - 2, G - 34 + y0); px(horns, hx + 2, G - 34 + y0); }
      if (live) {  // the side heads take turns breathing fire
        const s = (f >> 3) & 1 ? 1 : -1, k = (f >> 1) % 4, fx = cx + s * 22, fy = G - 30 + y0;
        const fo = part('core', {color: S.fire}), fi = part('core', {color: S.flame});
        for (let i = 0; i <= k + 1; i++) { limb(fo, fx + s * i * 2, fy, fx + s * (i * 2 + 2), fy + (i & 1 ? 1 : -1), 1 + i * 0.35); }
        limb(fi, fx, fy, fx + s * (k + 2), fy, 0.6);
      }
      eyes = [{x: cx - 16, y: G - 33 + y0, w: 1, h: 2}, {x: cx - 2, y: G - 33 + y0, w: 1, h: 2}, {x: cx + 1, y: G - 33 + y0, w: 1, h: 2}, {x: cx + 16, y: G - 33 + y0, w: 1, h: 2}];
      mouth = {x: cx - 1, y: G - 28 + y0, w: 3, fangs: true};
      a = {head: [cx, G - 36 + y0], side: [cx - 17, G - 9], hold: [cx - 7, G - 4], rear: [cx - 18, G - 6], cube: [cx + 25, G - 10], box: [cx - 29, G - 37, cx + 29, G]};
      break;
    }
    case 10: { // KOSCHEI THE DEATHLESS: crowned skull, purple cloak, holding up the egg his death is hidden in
      const fy = Math.round(Math.sin(mo.phase * 0.7) * 1.4), y = G - 18 + fy;
      main = S.cloak;
      const collar = part('far', {color: S.cloakDark}); poly(collar, [[cx - 6, y - 6], [cx - 10, y - 17], [cx - 3, y - 9]]); poly(collar, [[cx + 6, y - 6], [cx + 10, y - 17], [cx + 3, y - 9]]);
      const cl = part('body', {pattern: (x, yy) => ((x * 3 + yy * 2) % 13 === 0 ? S.cloakDark : null)});
      const hem = []; for (let x = cx + 10; x >= cx - 10; x -= 2) hem.push([x, y + 12 + ((((x >> 1) + (live ? f >> 1 : 0)) & 1) ? 2 : 0)]);
      poly(cl, [[cx - 6, y - 7], [cx + 6, y - 7]].concat(hem));
      const trim = part('core', {color: S.gold}); limb(trim, cx, y - 5, cx, y + 11, 0.4); [3, 7].forEach(dy => { px(trim, cx - 1, y + dy); px(trim, cx + 1, y + dy); });
      const arms = part('limb', {color: S.bone});
      chain(arms, [[cx - 5, y - 4, 1], [cx - 10, y + 1, 0.8], [cx - 12, y - 3 - sway, 0.7]]);
      chain(arms, [[cx + 5, y - 4, 1], [cx + 10, y + 2, 0.8], [cx + 11, y + 6, 0.6]]); px(arms, cx + 10, y + 7); px(arms, cx + 12, y + 7);
      const egg = part('belly', {color: S.gold}); ellipse(egg, cx - 13, y - 6 - sway, 1.8, 2.3);
      if (live && alt) { const gl = part('core', {color: '#FFFFFF'}); px(gl, cx - 13, y - 7 - sway); }
      const skull = part('body', {color: S.bone}); ellipse(skull, cx, y - 11, 4.2, 4.5); ellipse(skull, cx, y - 7.5, 2.8, 1.8);
      const socket = part('core', {color: '#1C1630'}); ellipse(socket, cx - 2, y - 11.5, 1.3, 1.2); ellipse(socket, cx + 2, y - 11.5, 1.3, 1.2);
      if (!mut.crowned) { const cr = part('core', {color: S.gold}); for (let x = cx - 4; x <= cx + 4; x++) px(cr, x, y - 15); [[-4, 1], [-2, 1], [0, 3], [2, 1], [4, 1]].forEach(([dx, h]) => { for (let j = 1; j <= h; j++) px(cr, cx + dx, y - 15 - j); }); }
      eyes = [{x: cx - 2, y: y - 12, w: 1, h: 1, glow: S.ghost}, {x: cx + 2, y: y - 12, w: 1, h: 1, glow: S.ghost}];
      mouth = {x: cx - 2, y: y - 8, w: 5, teeth: S.bone};
      a = {head: [cx, mut.crowned ? y - 16 : y - 19], side: [cx - 14, y + 2], hold: [cx + 11, y + 6], rear: [cx, y + 14], cube: [cx + 22, 6], box: [cx - 15, y - 19, cx + 12, y + 14], float: true};
      break;
    }
  }
  return {parts, eyes, mouth, a, main, decor};
}
