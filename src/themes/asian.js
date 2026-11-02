/* Asian: the line retold as creatures from Japanese and Chinese folklore.
   Creatures bring their own colors, as in Slavic; the affinity shows in the crest above the head.
   The koi of stage 2 climbs the Dragon Gate: it comes back as a shachihoko and then as a dragon. */
'use strict';
const {clamp} = require('../core/util');
const {G, px, ellipse, ring, poly, limb, chain} = require('../render/raster');
const {partList} = require('../render/figure');

module.exports = {
  id: 'asian', name: 'Asian', accent: '#3FB28A', screen: '#0A1513', dot: '#14221F', drawsEgg: true, reacts: true,
  bodies: ['Daruma', 'Mochi', 'Koi', 'Kappa', 'Maneki-neko', 'Kitsune', 'Shachihoko', 'Oni', 'Tengu', 'Ryu', 'Raijin'],
  plans,
};

const AS = {
  red: '#D8352B', redDark: '#9C241E', gold: '#F2B63C', goldDark: '#B8862A', paper: '#F3EDDF', ink: '#17151C', nose: '#E3A27C',
  mochi: '#F4B4C3', mochiLight: '#FBD9E1', blush: '#E9788F', leaf: '#6CA845', leafDark: '#477A2C', petal: '#FFC9D6',
  koi: '#F3EFE6', koiRed: '#E8502C', fin: '#F6C9A8', water: '#3F8FC0', foam: '#BFE7F7',
  kappa: '#58AE84', shell: '#86733F', shellDark: '#5E5029', plastron: '#E3D489', beak: '#E9C25A', plate: '#DCE7EC', kHair: '#2D4B3B', cucumber: '#4D9A3A', cukeLight: '#9BCB6A',
  cat: '#F4F1EA', calico: '#EC8A3A', patch: '#2C2A30', earPink: '#F2A3B0', cushion: '#7A3A8C', cushionDark: '#552866', whisker: '#B9B4AA',
  fox: '#EE973A', foxLight: '#F8E9D6', foxDark: '#2C2228', foxfire: '#8FE3FF', foxfireCore: '#EAFBFF',
  shachi: '#F2C24A', shachiDark: '#C08F2A', shachiBelly: '#FBE6A6', tile: '#5E6B7D', tileDark: '#414B59',
  oni: '#D9483A', oniDark: '#A8352B', tiger: '#F2C13A', stripe: '#1E1A1C', iron: '#5B6070', stud: '#BCC2CE', oniHair: '#2A2232',
  tengu: '#D6412F', robe: '#EDE6D2', robeDark: '#C2B9A2', pompom: '#F07F2E', wing: '#2E3242', wingLight: '#59607A', tokin: '#1D1D24', beard: '#ECEAE4', geta: '#8E6A44', fan: '#7B6A4A', fanLight: '#A8946A',
  ryu: '#3C8FD6', ryuLight: '#86C3F2', ryuBelly: '#F2D78C', mane: '#E8473A', pearl: '#E7F4FF', flame: '#FFB23C', cloud: '#7F8CA3', cloudLight: '#B9C4D6',
  raijin: '#EAE4D4', storm: '#4C566B', stormLight: '#7B869C', drum: '#C9372C', drumHead: '#F1E6C8', bolt: '#FFE45A', sash: '#4FB37E', thunderHair: '#2C2E3C', stick: '#C99A62',
};
function plans(st, f, mo) {
  const {parts, part} = partList();
  const bob = mo.bob, walk = mo.walk, flap = mo.flap, sway = mo.sway, alt = mo.alt, live = mo.motion && !mo.sleeping;
  const S = AS, cx = 32;
  const moved = (pat, dx, dy) => (x, y) => pat(x - dx, y - dy);
  const dots = (m, x0, y0, list) => list.forEach(([dx, dy]) => px(m, x0 + dx, y0 + dy));
  let eyes = [], mouth = null, a = {}, main = null;
  switch (st) {
    case 0: { // DARUMA: a tumbler doll. One eye is painted at the first commit, the other fills in as it nears hatching.
      const rock = mo.has ? mo.rock : 0;
      const ex = cx + rock, cy = G - 11 + 0.5, fy = Math.round(cy) - 2;
      main = S.red;
      const b = part('body', {zone: 'egg'});
      for (let y = Math.floor(cy - 11); y <= G; y++) for (let x = ex - 11; x <= ex + 11; x++) {
        const dy = (y - cy) / 11, rx = 10 * (dy < 0 ? 1 - 0.22 * dy * dy : 1 - 0.1 * dy * dy), dx = (x - ex) / rx;
        if (dx * dx + dy * dy <= 1.02) px(b, x, y);
      }
      // the face, cell by cell: w paper, k ink (brows, beard), r mouth, n nose, e eye white; pupils are painted on top
      const FACE = ['....wwwww....', '..kkwwwwwkk..', '.kkkkwwwkkkk.', '.wwwwwwwwwww.', 'wweeewwweeeww', 'weeeeeweeeeew', 'weeeeeneeeeew', 'wweeewwweeeww',
        '.kwwwkkkwwwk.', '.kkkkkrkkkkk.', '..kkkkkkkkk..', '...kkkkkkk...'];
      const cl = {w: part('core', {zone: 'egg', color: S.paper}), k: part('core', {zone: 'egg', color: S.ink}), r: part('core', {zone: 'egg', color: S.red}), n: part('core', {zone: 'egg', color: S.nose}), e: part('core', {zone: 'egg', color: '#FFFFFF'})};
      FACE.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (cl[row[i]]) px(cl[row[i]], ex - 6 + i, fy - 6 + j); });
      const pupil = part('core', {zone: 'egg', color: S.ink}), brush = [[-1, -1], [0, -1], [1, -1], [1, 0], [0, 0], [-1, 0]];  // 3 x 2, in brush-stroke order
      if (mo.has) brush.forEach(([dx, dy]) => px(pupil, ex - 3 + dx, fy + dy));
      if (mo.has) brush.slice(0, Math.ceil(clamp(mo.hatch || 0, 0, 1) * brush.length)).forEach(([dx, dy]) => px(pupil, ex + 3 + dx, fy + dy));
      const gold = part('core', {zone: 'egg', color: S.gold});  // a gold glyph on the belly
      dots(gold, ex, Math.round(cy) + 7, [[-1, -2], [1, -2], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [-1, 0], [1, 0], [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [-1, 2], [1, 2]]);
      a = {head: [ex, cy - 12], side: [ex - 12, cy], hold: [ex - 12, cy + 2], rear: [ex - 11, cy], cube: [ex + 14, cy - 10], box: [ex - 10, cy - 11, ex + 10, G]};
      break;
    }
    case 1: { // MOCHI: a sakura rice cake wrapped in its leaf, a petal drifting down
      const sq = bob ? 0.7 : 0, rx = 8.5 + sq, ry = 7 - sq, cy = G - ry + 0.5;
      main = S.mochi;
      const b = part('body', {zone: 'body', pattern: (x, y) => ((x * 7 + y * 5) % 17 === 0 ? S.mochiLight : null)}); ellipse(b, cx, cy, rx, ry);
      const leaf = part('limb', {zone: 'body', color: S.leaf}); poly(leaf, [[cx - rx - 1, cy - 1], [cx - 2, cy + 3], [cx + 5, cy + ry - 1], [cx + 3, G], [cx - 7, G], [cx - rx, cy + 4]]);
      const vein = part('core', {zone: 'body', color: S.leafDark}); limb(vein, cx - rx, cy + 1, cx + 2, G - 1, 0.3); limb(vein, cx - 4, cy + 3, cx - 5, G - 1, 0.3);
      const ch = part('cheek', {zone: 'head', color: S.blush, flat: true}); [[-7, 0], [-6, 0], [5, 0], [6, 0]].forEach(([dx, dy]) => px(ch, cx + dx, cy - 1 + dy));
      if (live) { const t = f % 24; if (t < 18) { const pt = part('core', {zone: 'head', color: S.petal}); px(pt, cx + 10 - (t >> 2), cy - 12 + (t >> 1)); px(pt, cx + 11 - (t >> 2) - ((t >> 1) & 1), cy - 12 + (t >> 1)); } }
      eyes = [{x: cx - 4, y: cy - 3, w: 2, h: 2}, {x: cx + 2, y: cy - 3, w: 2, h: 2}];
      mouth = {x: cx - 1, y: cy, w: 3};
      a = {head: [cx, cy - ry - 1], side: [cx - 11, cy], hold: [cx - 11, cy + 2], rear: [cx - 11, cy], cube: [cx + 13, cy - 12], box: [cx - 10, cy - ry - 1, cx + 10, G], split: cy};
      break;
    }
    case 2: { // KOI: a kohaku carp leaping out of its pond
      const y0 = -bob, cy = G - 12 + y0, N = 14, path = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        path.push([cx - 12 + 22 * t, cy + 3 - 5 * t - 4 * Math.sin(Math.PI * t), 0.9 + 3.6 * Math.pow(Math.sin(Math.PI * 0.5 * Math.min(t / 0.75, 1)), 1.2)]);
      }
      main = S.koi;
      const [tx, ty] = path[0], [hx0, hy0] = path[N], hx = hx0 + 1, hy = hy0;
      const blobs = [[path[4][0], path[4][1] - 1, 3], [path[9][0], path[9][1] - 2, 3.4], [hx, hy - 3, 2.6]];
      const kohaku = (x, y) => (blobs.some(([bx, by, r]) => (x - bx) * (x - bx) + (y - by) * (y - by) < r * r) ? S.koiRed : null);
      const pond = part('far', {zone: 'legs', color: S.water, pattern: (x, y) => ((x + (live ? f >> 1 : 0)) % 5 === 0 ? S.foam : null), flat: true}); ellipse(pond, cx - 1, G, 14, 1.2);
      const ripple = part('core', {zone: 'legs', color: S.foam}); [-12, -11, 9, 10].forEach(dx => px(ripple, cx + dx, G - 1));
      const tail = part('membrane', {zone: 'tail', color: S.fin, pattern: (x, y) => ((y - ty) % 2 === 0 ? S.koiRed : null)});
      poly(tail, [[tx + 1, ty], [tx - 5, ty - 5 - flap], [tx - 3, ty], [tx - 5, ty + 5 + flap]]);
      const dorsal = part('membrane', {zone: 'wing', color: S.fin}); poly(dorsal, [[path[5][0], path[5][1] - path[5][2] + 1], [path[7][0] - 1, path[7][1] - path[7][2] - 3], [path[9][0], path[9][1] - path[9][2] + 1]]);
      const b = part('body', {zone: 'body', pattern: kohaku}); chain(b, path);
      const head = part('body', {zone: 'head', pattern: kohaku}); ellipse(head, hx, hy, 4.8, 4.2); ellipse(head, hx + 3.5, hy + 0.5, 2.8, 2.6);
      const pect = part('membrane', {zone: 'wing', color: S.fin}); poly(pect, [[hx - 3, hy + 3], [hx - 6, hy + 7 + flap], [hx - 1, hy + 4]]);
      const barbel = part('core', {zone: 'head', color: S.fin}); px(barbel, hx + 5, hy + 3); px(barbel, hx + 6, hy + 4);
      if (live) { const d = part('core', {zone: 'legs', color: S.foam}), k = (f >> 1) % 6; if (k < 4) { px(d, tx - 2, G - 2 - k); px(d, tx + 3, G - 3 - (k >> 1)); } }
      eyes = [{x: hx + 1, y: hy - 1, w: 2, h: 2}];
      mouth = {x: hx + 4, y: hy + 2, w: 2};
      a = {head: [hx, hy - 7], side: [path[7][0], path[7][1] + 1], hold: [hx + 9, hy + 2], rear: [tx - 5, ty], cube: [52, 6], box: [tx - 6, hy - 6, hx + 7, G]};
      break;
    }
    case 3: { // KAPPA: river imp with a water dish on its head, a turtle shell, and a cucumber
      const cy = G - 12.5 - bob;
      main = S.kappa;
      const shell = part('far', {zone: 'body', color: S.shell, pattern: moved((x, y) => (((x + 2 * y) % 6 === 0 || (x - 2 * y) % 6 === 0) ? S.shellDark : null), 0, Math.round(cy))}); ellipse(shell, cx, cy + 2.5, 10.5, 8);
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx - 4, cy + 7, cx - 5, G - 1, 1.7); limb(legs, cx + 4, cy + 7, cx + 5, G - 1, 1.7);
      ellipse(legs, cx - 6, G - 0.5, 3, 1.2); ellipse(legs, cx + 6, G - 0.5, 3, 1.2);
      const b = part('body', {zone: 'body'}); ellipse(b, cx, cy + 3, 7.5, 6.5);
      const pl = part('belly', {zone: 'body', color: S.plastron, pattern: (x, y) => (Math.round(y - cy) % 3 === 0 ? S.goldDark : null)}); ellipse(pl, cx, cy + 4, 5, 4.6);
      const cuke = part('horn', {zone: 'arm', color: S.cucumber, pattern: (x, y) => ((x + y) % 3 === 0 ? S.cukeLight : null)}); limb(cuke, cx + 10, cy - 3 - sway, cx + 13, cy + 7 - sway, 1.4);
      const arms = part('limb', {zone: 'arm'}); limb(arms, cx - 7, cy + 1, cx - 11, cy + 5 - sway * 3, 1.3, 1.1); limb(arms, cx + 7, cy + 1, cx + 11, cy + 2 - sway, 1.3, 1.1);
      const hands = part('limb', {zone: 'arm'}); ellipse(hands, cx - 11.5, cy + 5.5 - sway * 3, 1.4, 1.4); ellipse(hands, cx + 11.5, cy + 2 - sway, 1.4, 1.4);
      const head = part('body', {zone: 'head'}); ellipse(head, cx, cy - 6, 6.5, 5.5);
      const hair = part('limb', {zone: 'head', color: S.kHair}); ellipse(hair, cx, cy - 10.5, 7, 2.2);  // a bowl cut around the dish
      for (const s of [-1, 1]) poly(hair, [[cx + s * 4, cy - 11], [cx + s * 7.5, cy - 10.5], [cx + s * 7.5, cy - 5], [cx + s * 6.5, cy - 6.5], [cx + s * 6, cy - 4.5], [cx + s * 5.5, cy - 8]]);
      const dish = part('core', {zone: 'head', color: S.plate}); ellipse(dish, cx, cy - 11.5, 4.2, 1.2);
      const wat = part('core', {zone: 'head', color: S.foam}); for (let x = cx - 2; x <= cx + 2; x++) px(wat, x, cy - 11.5); if (live && alt) px(wat, cx + 1, cy - 12.5);
      const beak = part('horn', {zone: 'head', color: S.beak}); poly(beak, [[cx - 2.5, cy - 4.5], [cx + 2.5, cy - 4.5], [cx + 1.5, cy - 2], [cx - 1.5, cy - 2]]);
      eyes = [{x: cx - 4, y: cy - 8, w: 2, h: 2}, {x: cx + 2, y: cy - 8, w: 2, h: 2}];
      mouth = {x: cx - 1, y: cy - 3, w: 3};
      a = {head: [cx, cy - 14], side: [cx - 15, cy + 2], hold: [cx - 12, cy + 6 - sway * 3], rear: [cx - 11, cy + 2], cube: [cx + 17, cy - 14], box: [cx - 12, cy - 14, cx + 14, G]};
      break;
    }
    case 4: { // MANEKI-NEKO: the beckoning cat on its cushion, a gold koban in one paw
      const y0 = -bob, wave = live ? sway : 0, hy = G - 23 + y0;
      main = S.cat;
      const calico = moved((x, y) => {
        const o = (x - (cx - 5)) * (x - (cx - 5)) / 16 + (y + 4) * (y + 4) / 9, k = (x - (cx + 6)) * (x - (cx + 6)) / 9 + (y + 7) * (y + 7) / 6;
        return o < 1 ? S.calico : k < 1 ? S.patch : null;
      }, 0, hy);
      const cushion = part('far', {zone: 'legs', color: S.cushion, pattern: (x, y) => ((x + y) % 4 === 0 ? S.cushionDark : null)}); poly(cushion, [[cx - 14, G - 3], [cx + 14, G - 3], [cx + 15, G], [cx - 15, G]]);
      const tas = part('core', {zone: 'legs', color: S.gold}); [[-15, -2], [-16, -1], [-16, 0], [15, -2], [16, -1], [16, 0]].forEach(([dx, dy]) => px(tas, cx + dx, G + dy));
      const tail = part('limb', {zone: 'tail'}); chain(tail, [[cx + 7, G - 6, 1.6], [cx + 11, G - 7, 1.3], [cx + 12, G - 11 - sway, 1]]);
      const b = part('body', {zone: 'body', pattern: moved((x, y) => ((x - cx - 4) * (x - cx - 4) / 10 + (y + 7) * (y + 7) / 5 < 1 ? S.calico : null), 0, G)}); ellipse(b, cx, G - 10.5 + y0 * 0.5, 9, 7.5);
      const feet = part('limb', {zone: 'legs'}); ellipse(feet, cx - 3.5, G - 3.5, 2.2, 1.3); ellipse(feet, cx + 3.5, G - 3.5, 2.2, 1.3);
      const koban = part('horn', {zone: 'arm', color: S.gold, pattern: (x, y) => (x % 2 === 0 ? S.goldDark : null)}); ellipse(koban, cx + 7, G - 9 + y0 * 0.5, 2.6, 4);
      const paw = part('limb', {zone: 'arm'}); limb(paw, cx + 6, G - 14 + y0, cx + 6, G - 11 + y0, 1.5); ellipse(paw, cx + 6.5, G - 10.5 + y0, 1.7, 1.4);
      const arm = part('limb', {zone: 'arm'}); limb(arm, cx - 6, G - 15 + y0, cx - 10, G - 21 + y0, 1.7, 1.5);
      ellipse(arm, cx - 10.5 - wave, G - 23 + y0 + wave * 2, 2, 1.8);
      const pad = part('core', {zone: 'arm', color: S.earPink}); px(pad, cx - 10 - wave, G - 23 + y0 + wave * 2);
      const head = part('body', {zone: 'head', pattern: calico}); ellipse(head, cx, hy, 9.5, 7);
      const ears = part('body', {zone: 'head', pattern: calico}); poly(ears, [[cx - 9, hy - 2], [cx - 8, hy - 11], [cx - 3, hy - 6]]); poly(ears, [[cx + 9, hy - 2], [cx + 8, hy - 11], [cx + 3, hy - 6]]);
      const inner = part('core', {zone: 'head', color: S.earPink}); limb(inner, cx - 7, hy - 5, cx - 7.5, hy - 8, 0.4); limb(inner, cx + 7, hy - 5, cx + 7.5, hy - 8, 0.4);
      const wh = part('core', {zone: 'head', color: S.whisker}); limb(wh, cx - 7, hy + 2, cx - 12, hy + 1, 0.3); limb(wh, cx - 7, hy + 3, cx - 12, hy + 4, 0.3); limb(wh, cx + 7, hy + 2, cx + 12, hy + 1, 0.3); limb(wh, cx + 7, hy + 3, cx + 12, hy + 4, 0.3);
      const nose = part('core', {zone: 'head', color: S.earPink}); px(nose, cx, hy + 1);
      const collar = part('core', {zone: 'head', color: S.red}); limb(collar, cx - 6, G - 16 + y0, cx + 6, G - 16 + y0, 0.5);
      const bell = part('horn', {zone: 'head', color: S.gold}); ellipse(bell, cx, G - 14.5 + y0, 1.4, 1.4);
      eyes = [{x: cx - 5, y: hy - 2, w: 2, h: 2}, {x: cx + 3, y: hy - 2, w: 2, h: 2}];
      mouth = {x: cx - 1, y: hy + 2, w: 3};
      a = {head: [cx, hy - 8], side: [cx - 16, G - 10], hold: [cx - 11, G - 23 + y0 + wave * 2], rear: [cx - 13, G - 6], cube: [cx + 17, G - 34], box: [cx - 15, hy - 11, cx + 15, G]};
      break;
    }
    case 5: { // KITSUNE: a three-tailed fox with a red bib, foxfire floating around it
      const y0 = -bob;
      main = S.fox;
      const tails = [
        [[cx - 11, G - 13 + y0, 2.2], [cx - 16, G - 19, 2.8], [cx - 17, G - 26 - sway, 2.4], [cx - 14, G - 31 - sway, 1.2]],
        [[cx - 11, G - 12 + y0, 2.2], [cx - 18, G - 14, 2.8], [cx - 23, G - 18 + sway, 2.3], [cx - 26, G - 23 + sway, 1.2]],
        [[cx - 11, G - 11 + y0, 2.2], [cx - 18, G - 8, 2.6], [cx - 24, G - 8 - sway, 2], [cx - 27, G - 11 - sway, 1]],
      ];
      const tl = part('body', {zone: 'tail'}); tails.forEach(t => chain(tl, t));
      const tips = part('belly', {zone: 'tail', color: S.foxLight}); tails.forEach(t => { const [x1, y1] = t[t.length - 1], [x2, y2] = t[t.length - 2]; limb(tips, x1, y1, x1 + (x2 - x1) * 0.3, y1 + (y2 - y1) * 0.3, 1.6, 1.8); });
      const far = part('far', {zone: 'legs'}); limb(far, cx + 4, G - 8 + y0, cx + 3 - walk * 2, G - 1, 1.2); limb(far, cx - 7, G - 8 + y0, cx - 6 + walk * 2, G - 1, 1.2);
      const b = part('body', {zone: 'body'}); ellipse(b, cx - 2, G - 11 + y0, 10, 4.6);
      const bel = part('belly', {zone: 'body', color: S.foxLight}); ellipse(bel, cx - 1, G - 7.5 + y0, 7, 1.4);
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx + 6, G - 8 + y0, cx + 7 + walk * 2, G - 1, 1.3); limb(legs, cx - 9, G - 8 + y0, cx - 10 - walk * 2, G - 1, 1.3);
      const socks = part('core', {zone: 'legs', color: S.foxDark}); [cx + 7 + walk * 2, cx - 10 - walk * 2, cx + 3 - walk * 2, cx - 6 + walk * 2].forEach(x => { px(socks, x, G - 1); px(socks, x, G - 2); px(socks, x + 1, G - 1); });
      const neck = part('body', {zone: 'head'}); limb(neck, cx + 6, G - 13 + y0, cx + 10, G - 18 + y0, 3, 2.6);
      const chest = part('belly', {zone: 'body', color: S.foxLight}); ellipse(chest, cx + 9, G - 14 + y0, 2.4, 3.2);
      const bib = part('body', {zone: 'body', color: S.red}); poly(bib, [[cx + 6, G - 17 + y0], [cx + 12, G - 18 + y0], [cx + 11, G - 13 + y0], [cx + 8, G - 11 + y0]]);
      const ears = part('body', {zone: 'head'}); poly(ears, [[cx + 9, G - 22 + y0], [cx + 9, G - 31 + y0], [cx + 12, G - 24 + y0]]); poly(ears, [[cx + 12, G - 24 + y0], [cx + 15, G - 31 + y0], [cx + 15.5, G - 22 + y0]]);
      const inner = part('core', {zone: 'head', color: S.foxDark}); limb(inner, cx + 10, G - 25 + y0, cx + 9.5, G - 29 + y0, 0.3); limb(inner, cx + 14, G - 25 + y0, cx + 14.5, G - 29 + y0, 0.3);
      const head = part('body', {zone: 'head'}); ellipse(head, cx + 12, G - 21 + y0, 4.6, 3.8); poly(head, [[cx + 14, G - 23 + y0], [cx + 21, G - 20 + y0], [cx + 20, G - 18.5 + y0], [cx + 14, G - 17.5 + y0]]);
      const cheek = part('belly', {zone: 'head', color: S.foxLight}); ellipse(cheek, cx + 14, G - 18.5 + y0, 2.6, 1.3);
      const nose = part('core', {zone: 'head', color: S.foxDark}); px(nose, cx + 21, G - 20 + y0);
      const mark = part('core', {zone: 'head', color: S.red}); [[12, -23], [13, -23], [14, -23], [15, -24]].forEach(([dx, dy]) => px(mark, cx + dx, G + dy + y0));
      for (const [k, x, y] of [[0, cx - 3, G - 25], [1, cx + 23, G - 30]]) {  // foxfire
        const yy = y + (live ? ((f >> 2) + k) & 1 : 0), fl = live && ((f >> 1) + k) & 1;
        const out = part('core', {zone: 'tail', color: S.foxfire}), core = part('core', {zone: 'tail', color: S.foxfireCore});
        dots(out, x, yy, [[-1, 0], [2, 0], [-1, 1], [2, 1], [0, 2], [1, 2], [0, -1], [1, -1], [fl ? 1 : 0, -2], [fl ? 0 : 1, -3]]);
        dots(core, x, yy, [[0, 0], [1, 0], [0, 1], [1, 1]]);
      }
      eyes = [{x: cx + 12, y: G - 22 + y0, w: 2, h: 1}];
      mouth = {x: cx + 17, y: G - 18 + y0, w: 3};
      a = {head: [cx + 12, G - 31 + y0], side: [cx - 4, G - 11 + y0], hold: [cx + 22, G - 19 + y0], rear: [cx - 27, G - 12], cube: [cx + 24, G - 12], box: [cx - 28, G - 33, cx + 21, G]};
      break;
    }
    case 6: { // SHACHIHOKO: the carp come back with a tiger's head, all gold, standing on its head on a castle roof
      main = S.shachi;
      const scales = (x, y) => (y % 2 === 0 && (x + (y >> 1)) % 3 === 0 ? S.shachiDark : null);
      const path = [[cx + 3, G - 10, 4], [cx - 4, G - 13, 4.4], [cx - 9, G - 19, 4], [cx - 10, G - 26, 3.2], [cx - 7, G - 31, 2.2], [cx - 3 + sway, G - 34, 1.2]];
      const roof = part('far', {zone: 'legs', color: S.tile, pattern: (x, y) => (x % 3 === 0 ? S.tileDark : null)}); poly(roof, [[cx - 15, G - 4], [cx + 15, G - 4], [cx + 17, G], [cx - 17, G]]);
      const ridge = part('limb', {zone: 'legs', color: S.tileDark}); limb(ridge, cx - 15, G - 4, cx + 15, G - 4, 0.6);
      const [fx, fy] = path[path.length - 1];
      const fin = part('membrane', {zone: 'wing', color: S.shachiBelly, pattern: (x, y) => ((x - y) % 2 === 0 ? S.shachiDark : null)});
      poly(fin, [[fx - 1, fy + 1], [fx - 7, fy - 5 - flap], [fx - 1, fy - 3], [fx + 5, fy - 6 - flap], [fx + 2, fy + 1]]);
      const spines = part('horn', {zone: 'body', color: S.shachiBelly}); [1, 2, 3].forEach(i => { const [x, y, r] = path[i]; poly(spines, [[x - r + 1, y - 2], [x - r - 3, y - 3], [x - r + 1, y + 1]]); });
      const b = part('body', {zone: 'body', pattern: scales}); chain(b, path);
      const bel = part('belly', {zone: 'body', color: S.shachiBelly, pattern: (x, y) => (y % 2 === 0 ? S.gold : null)}); chain(bel, path.slice(0, 5).map(([x, y, r]) => [x + r * 0.55, y + r * 0.2, r * 0.42]));
      const pect = part('membrane', {zone: 'wing', color: S.shachiBelly}); poly(pect, [[cx, G - 9], [cx - 4, G - 5], [cx + 2, G - 6]]);
      const mane = part('limb', {zone: 'head', color: S.shachiDark}); [[1, -16], [-1, -12], [0, -8], [3, -18]].forEach(([dx, dy]) => ellipse(mane, cx + dx, G + dy, 1.8, 1.6));
      const head = part('body', {zone: 'head', pattern: scales}); ellipse(head, cx + 6, G - 12, 5.5, 5);
      const snout = part('body', {zone: 'head'}); ellipse(snout, cx + 11, G - 13, 3.6, 2.2);
      const jaw = part('limb', {zone: 'head'}); ellipse(jaw, cx + 10.5, G - 8, 3.6, 1.5);
      const brow = part('horn', {zone: 'head', color: S.shachiBelly}); poly(brow, [[cx + 4, G - 17], [cx + 10, G - 17], [cx + 11, G - 15], [cx + 5, G - 16]]);
      const whisk = part('core', {zone: 'head', color: S.shachiBelly}); chain(whisk, [[cx + 14, G - 13, 0.3], [cx + 16, G - 15, 0.3], [cx + 15, G - 17 - sway, 0.3]]);
      eyes = [{x: cx + 7, y: G - 14, w: 2, h: 2, glow: '#FF6A3A'}];
      mouth = {x: cx + 9, y: G - 10, w: 5, fangs: true};
      a = {head: [cx + 7, G - 19], side: [cx - 16, G - 17], hold: [cx + 18, G - 10], rear: [cx - 12, G - 22], cube: [cx + 19, G - 34], box: [cx - 17, G - 40, cx + 16, G]};
      break;
    }
    case 7: { // ONI: red ogre in a tiger-skin loincloth, an iron kanabo club in hand
      const y0 = -bob, lift = live ? sway : 0;
      main = S.oni;
      const hair = part('limb', {zone: 'head', color: S.oniHair}); poly(hair, [[cx - 7, G - 26 + y0], [cx - 9, G - 32 + y0], [cx - 5, G - 31 + y0], [cx - 4, G - 35 + y0], [cx - 1, G - 32 + y0], [cx + 2, G - 35 + y0], [cx + 4, G - 31 + y0], [cx + 9, G - 32 + y0], [cx + 7, G - 26 + y0]]);
      const legs = part('limb', {zone: 'legs'}); limb(legs, cx - 4, G - 9 + y0, cx - 5, G - 1, 2.4); limb(legs, cx + 4, G - 9 + y0, cx + 5, G - 1, 2.4);
      ellipse(legs, cx - 6, G - 0.5, 3.2, 1.3); ellipse(legs, cx + 6, G - 0.5, 3.2, 1.3);
      const torso = part('body', {zone: 'body', pattern: moved((x, y) => ((x === cx && y > -16 && y < -12) || (y === -17 && Math.abs(x - cx) < 5 && x !== cx) ? S.oniDark : null), 0, G + y0)}); ellipse(torso, cx, G - 17 + y0, 8, 6.5);
      const cloth = part('body', {zone: 'body', color: S.tiger, pattern: moved((x, y) => ((x + (y >> 1)) % 4 === 0 ? S.stripe : null), 0, y0)});
      poly(cloth, [[cx - 7, G - 13 + y0], [cx + 7, G - 13 + y0], [cx + 6, G - 8 + y0], [cx + 3, G - 6 + y0], [cx, G - 8 + y0], [cx - 3, G - 6 + y0], [cx - 6, G - 8 + y0]]);
      const club = part('horn', {zone: 'arm', color: S.iron, pattern: (x, y) => ((x + y) % 3 === 0 && y < G - 14 ? S.stud : null)}); limb(club, cx - 12, G - 6 - lift * 3, cx - 14, G - 31 - lift * 3, 1, 2.4);
      const arms = part('limb', {zone: 'arm'}); chain(arms, [[cx - 7, G - 21 + y0, 2], [cx - 11, G - 17 + y0, 1.7], [cx - 12, G - 13 - lift * 3, 1.6]]); chain(arms, [[cx + 7, G - 21 + y0, 2], [cx + 11, G - 17 + y0, 1.7], [cx + 11, G - 13 + y0, 1.6]]);
      const fists = part('limb', {zone: 'arm'}); ellipse(fists, cx - 12, G - 12.5 - lift * 3, 1.8, 1.8); ellipse(fists, cx + 11, G - 12 + y0, 1.8, 1.8);
      const cuffs = part('core', {zone: 'arm', color: S.gold}); limb(cuffs, cx - 13.5, G - 15 - lift * 3, cx - 10.5, G - 15 - lift * 3, 0.3); limb(cuffs, cx + 9.5, G - 15 + y0, cx + 12.5, G - 15 + y0, 0.3);
      const head = part('body', {zone: 'head'}); ellipse(head, cx, G - 27 + y0, 6, 5);
      const horns = part('horn', {zone: 'head'}); poly(horns, [[cx - 5, G - 30 + y0], [cx - 7, G - 36 + y0], [cx - 3, G - 31 + y0]]); poly(horns, [[cx + 5, G - 30 + y0], [cx + 7, G - 36 + y0], [cx + 3, G - 31 + y0]]);
      const brow = part('core', {zone: 'head', color: S.oniDark}); dots(brow, cx, G - 30 + y0, [[-4, -1], [-3, 0], [-2, 0], [4, -1], [3, 0], [2, 0]]);
      eyes = [{x: cx - 4, y: G - 29 + y0, w: 2, h: 2, glow: '#FFE27A'}, {x: cx + 2, y: G - 29 + y0, w: 2, h: 2, glow: '#FFE27A'}];
      mouth = {x: cx - 2, y: G - 25 + y0, w: 5, fangs: true};
      a = {head: [cx, G - 36 + y0], side: [cx + 16, G - 17], hold: [cx + 12, G - 12 + y0], rear: [cx - 16, G - 4], cube: [cx + 18, G - 34], box: [cx - 17, G - 36, cx + 14, G]};
      break;
    }
    case 8: { // TENGU: winged mountain goblin, red long-nosed face, a feather fan and one-toothed geta
      const y0 = 2 - bob, fl = flap, fan = live ? sway : 0;
      main = S.tengu;
      const wing = part('membrane', {zone: 'wing', color: S.wing, pattern: (x, y) => ((x + y) % 4 === 0 ? S.wingLight : null)});
      for (const s of [-1, 1]) poly(wing, [[cx + s * 5, G - 24 + y0], [cx + s * 13, G - 32 - fl * 2], [cx + s * 22, G - 34 - fl * 3], [cx + s * 27, G - 30 - fl * 2], [cx + s * 24, G - 26 - fl], [cx + s * 26, G - 22], [cx + s * 21, G - 20], [cx + s * 22, G - 15], [cx + s * 17, G - 16], [cx + s * 15, G - 11], [cx + s * 7, G - 15 + y0]]);
      const hair = part('limb', {zone: 'head', color: S.beard, pattern: (x, y) => ((x + y) % 3 === 0 ? '#CFCBC2' : null)}); ellipse(hair, cx - 2, G - 29 + y0, 5.5, 5); poly(hair, [[cx - 7, G - 30 + y0], [cx - 10, G - 21 + y0], [cx - 3, G - 24 + y0]]);
      const geta = part('limb', {zone: 'legs', color: S.geta}); for (const s of [-1, 1]) { limb(geta, cx + s * 3 - 1.5, G - 2, cx + s * 3 + 1.5, G - 2, 0.5); px(geta, cx + s * 3, G - 1); px(geta, cx + s * 3, G); }
      const robe = part('body', {zone: 'body', color: S.robe, pattern: moved((x, y) => ((x - cx) % 4 === 0 && y > -16 ? S.robeDark : null), 0, G + y0)}); poly(robe, [[cx - 6, G - 24 + y0], [cx + 6, G - 24 + y0], [cx + 8, G - 3], [cx - 8, G - 3]]);
      const slit = part('core', {zone: 'body', color: S.robeDark}); limb(slit, cx, G - 9, cx, G - 3, 0.3);
      const sleeves = part('body', {zone: 'arm', color: S.robe}); poly(sleeves, [[cx - 6, G - 23 + y0], [cx - 11, G - 16 + y0], [cx - 8, G - 13 + y0], [cx - 5, G - 17 + y0]]); poly(sleeves, [[cx + 6, G - 23 + y0], [cx + 11, G - 17 + y0], [cx + 9, G - 14 + y0], [cx + 5, G - 18 + y0]]);
      const pom = part('belly', {zone: 'body', color: S.pompom}); [[-3, -19], [3, -19], [-3, -15], [3, -15], [-3, -11], [3, -11]].forEach(([dx, dy]) => ellipse(pom, cx + dx, G + dy + y0, 1.1, 1.1));
      const handle = part('far', {zone: 'arm', color: S.geta}); limb(handle, cx + 10, G - 15 + y0, cx + 12, G - 20 - fan, 0.5);
      const fanM = part('membrane', {zone: 'arm', color: S.fan, pattern: (x, y) => ((x + y) % 2 === 0 ? S.fanLight : null)}); poly(fanM, [[cx + 12, G - 20 - fan], [cx + 9, G - 25 - fan * 2], [cx + 12, G - 31 - fan * 2], [cx + 17, G - 28 - fan * 2], [cx + 15, G - 21 - fan]]);
      const hands = part('limb', {zone: 'arm', color: S.tengu}); ellipse(hands, cx - 9.5, G - 13.5 + y0, 1.3, 1.3); ellipse(hands, cx + 10, G - 15 + y0, 1.3, 1.3);
      const head = part('body', {zone: 'head'}); ellipse(head, cx + 1, G - 28 + y0, 4.6, 4.4);
      const beard = part('limb', {zone: 'head', color: S.beard, pattern: (x, y) => ((x + y) % 3 === 0 ? '#CFCBC2' : null)}); poly(beard, [[cx - 3, G - 25 + y0], [cx + 4, G - 25 + y0], [cx + 2, G - 21 + y0], [cx, G - 21 + y0]]);
      const nose = part('body', {zone: 'head'}); limb(nose, cx + 3, G - 28 + y0, cx + 13, G - 26 + y0, 1.5, 0.9);
      const tokin = part('core', {zone: 'head', color: S.tokin}); poly(tokin, [[cx - 1, G - 32 + y0], [cx + 3, G - 32 + y0], [cx + 2, G - 35 + y0], [cx, G - 35 + y0]]);
      const brows = part('core', {zone: 'head', color: S.beard}); dots(brows, cx, G - 31 + y0, [[-3, 0], [-2, 0], [-1, 1], [5, 0], [4, 0], [3, 1]]);
      eyes = [{x: cx - 2, y: G - 30 + y0, w: 2, h: 1, glow: S.gold}, {x: cx + 3, y: G - 30 + y0, w: 2, h: 1, glow: S.gold}];
      mouth = {x: cx, y: G - 24 + y0, w: 3};
      a = {head: [cx + 1, G - 36 + y0], side: [cx - 13, G - 9], hold: [cx - 10, G - 13 + y0], rear: [cx - 9, G - 5], cube: [cx + 24, G - 10], box: [cx - 27, G - 37, cx + 27, G]};
      break;
    }
    case 9: { // RYU: an eastern dragon without wings, swimming through clouds after a flaming pearl
      const ph = mo.phase, N = 22, path = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        path.push([4 + 37 * t, G - 15 - 5.5 * Math.sin(t * 7 - ph) * (1 - 0.6 * t) - 7 * t, 0.8 + 2.4 * Math.pow(Math.min(1, t * 2.5), 0.7)]);
      }
      main = S.ryu;
      const scales = (x, y) => ((x + 2 * y) % 5 === 0 ? S.ryuLight : null);
      const [hx0, hy0] = path[N], hx = hx0 + 2, hy = hy0 - 1;
      const clouds = part('far', {zone: 'legs', color: S.cloud, pattern: (x, y) => ((x - 2 * y) % 7 === 0 ? S.cloudLight : null), flat: true});
      [[12, G - 3, 6, 2.2], [18, G - 4, 4, 2.6], [38, G - 3, 5, 2], [43, G - 4, 3.5, 2.4]].forEach(([x, y, rx, ry]) => ellipse(clouds, x, y, rx, ry));
      const farLegs = part('far', {zone: 'legs'}); [6, 15].forEach(i => { const [x, y, r] = path[i]; limb(farLegs, x - 1, y + r * 0.5, x - 3, y + r + 3, 0.9, 0.7); });
      const mane = part('limb', {zone: 'body', color: S.mane}); for (let i = 3; i < N - 1; i += 2) { const [x, y, r] = path[i]; poly(mane, [[x - 1.5, y - r + 0.5], [x - 0.5, y - r - 2 - (i & 2 ? 1 : 0)], [x + 1, y - r + 0.5]]); }
      const tuft = part('limb', {zone: 'tail', color: S.mane}); poly(tuft, [[path[0][0] + 1, path[0][1] - 1], [path[0][0] - 3, path[0][1] - 4 - sway], [path[0][0] - 2, path[0][1]], [path[0][0] - 3, path[0][1] + 3 + sway]]);
      const b = part('body', {zone: 'body', pattern: scales}); chain(b, path);
      const bel = part('belly', {zone: 'body', color: S.ryuBelly, pattern: (x, y) => (x % 2 === 0 ? S.goldDark : null)}); chain(bel, path.slice(2, N - 1).map(([x, y, r]) => [x + 0.3, y + r * 0.55, r * 0.4]));
      const legs = part('limb', {zone: 'legs'}); [8, 17].forEach(i => { const [x, y, r] = path[i]; limb(legs, x, y + r * 0.5, x + 2, y + r + 3, 1, 0.8); });
      const claws = part('core', {zone: 'legs', color: S.gold}); [8, 17].forEach(i => { const [x, y, r] = path[i]; dots(claws, Math.round(x + 2), Math.round(y + r + 4), [[-1, 0], [0, 0], [1, 0]]); });
      const horns = part('horn', {zone: 'head'}); chain(horns, [[hx - 2, hy - 3, 0.8], [hx - 6, hy - 9, 0.6]]); limb(horns, hx - 4.5, hy - 7, hx - 2, hy - 10, 0.5); chain(horns, [[hx + 1, hy - 3, 0.7], [hx - 1, hy - 8, 0.5]]);
      const hmane = part('limb', {zone: 'head', color: S.mane}); poly(hmane, [[hx - 2, hy - 2], [hx - 7, hy - 5], [hx - 5, hy], [hx - 8, hy + 3], [hx - 2, hy + 2]]);
      const head = part('body', {zone: 'head', pattern: scales}); ellipse(head, hx, hy, 4.8, 3.8); ellipse(head, hx + 5, hy + 0.5, 3.4, 2.3);
      const jaw = part('limb', {zone: 'head'}); poly(jaw, [[hx, hy + 3], [hx + 8, hy + 3.5], [hx + 3, hy + 5]]);
      const whisk = part('core', {zone: 'head', color: S.gold}), wv = live ? alt : 0; chain(whisk, [[hx + 7, hy, 0.3], [hx + 4, hy - 3 - wv, 0.3], [hx, hy - 4, 0.3], [hx - 4, hy - 2 + wv, 0.3]]); chain(whisk, [[hx + 8, hy + 2, 0.3], [hx + 5, hy + 6 + wv, 0.3], [hx, hy + 7, 0.3], [hx - 5, hy + 6 - wv, 0.3]]);
      const pr = [hx + 14, hy - 3], fire = part('core', {zone: 'arm', color: live && alt ? S.gold : S.flame}); ring(fire, pr[0], pr[1], 2.8, 2.8, 1);
      const pearl = part('belly', {zone: 'arm', color: S.pearl}); ellipse(pearl, pr[0], pr[1], 1.8, 1.8);
      if (live) { const sp = part('core', {zone: 'arm', color: S.flame}), k = (f >> 1) % 4; dots(sp, pr[0], pr[1], [[[0, -4], [3, -3], [4, 0], [3, 3]][k], [[-3, 3], [-4, 0], [-3, -3], [0, 4]][k]]); }
      eyes = [{x: hx + 1, y: hy - 2, w: 2, h: 1, glow: S.gold}];
      mouth = {x: hx + 4, y: hy + 3, w: 4, fangs: true};
      a = {head: [hx - 1, hy - 8], side: [path[11][0], path[11][1] - 3], hold: [hx + 8, hy + 4], rear: [path[1][0], path[1][1]], cube: [10, 4], box: [4, hy - 9, pr[0] + 3, G - 6], float: true};
      break;
    }
    case 10: { // RAIJIN: the thunder god on a storm cloud, a ring of drums behind him that he strikes in turns
      const fy = mo.motion ? Math.round(Math.sin(mo.phase * 0.7) * 1.2) : 0, y = G - 14 + fy, hit = live ? alt : 0;
      main = S.raijin;
      const rcy = y - 6, RX = 19, RY = 15, ANG = [14, 42, 68, 112, 138, 166], lit = live ? (f >> 2) % ANG.length : -1;
      const hoop = part('far', {zone: 'arm', color: S.drum});
      for (let d = 0; d <= 180; d++) if (d < 78 || d > 102) for (const r of [0, 1]) px(hoop, cx + (RX - r) * Math.cos(d * Math.PI / 180), rcy - (RY - r) * Math.sin(d * Math.PI / 180));
      const rims = part('horn', {zone: 'arm', color: S.gold}), heads = part('core', {zone: 'arm', color: S.drumHead}), tomoe = part('core', {zone: 'arm', color: S.drum}), flash = part('core', {zone: 'arm', color: S.bolt});
      ANG.forEach((d, i) => {
        const x = cx + RX * Math.cos(d * Math.PI / 180), yy = rcy - RY * Math.sin(d * Math.PI / 180);
        ellipse(rims, x, yy, 2.6, 2.6); ellipse(i === lit ? flash : heads, x, yy, 1.6, 1.6); px(tomoe, x, yy);
        if (i === lit) {  // a bolt jumps out of the struck drum
          const ux = Math.cos(d * Math.PI / 180), uy = -Math.sin(d * Math.PI / 180);
          let bx = x + ux * 3, by = yy + uy * 3;
          for (let k = 0; k < 3; k++) { const nx = bx + ux * 2 + (k & 1 ? 1 : -1) * uy, ny = by + uy * 2 - (k & 1 ? 1 : -1) * ux; limb(flash, bx, by, nx, ny, 0.3); bx = nx; by = ny; }
        }
      });
      const legs = part('limb', {zone: 'legs'}); chain(legs, [[cx - 4, y + 1, 2.8], [cx - 10, y + 3, 2.5], [cx - 9, y + 8, 2]]); chain(legs, [[cx + 4, y + 1, 2.8], [cx + 10, y + 2, 2.5], [cx + 12, y + 7, 2]]);
      const cloud = part('far', {zone: 'legs', color: S.storm, pattern: (x, yy) => ((x + 2 * yy + (live ? f >> 2 : 0)) % 7 === 0 ? S.stormLight : null)});
      [[-10, 10, 6, 3.5], [-2, 9.5, 7, 4], [8, 10, 6.5, 3.5], [14, 11, 4, 2.5], [-15, 11, 4, 2.5]].forEach(([dx, dy, rx, ry]) => ellipse(cloud, cx + dx, y + dy, rx, ry));
      const torso = part('body', {zone: 'body'}); ellipse(torso, cx, y - 5, 7, 5.5);
      const bel = part('belly', {zone: 'body'}); ellipse(bel, cx, y - 3, 4, 2.4);
      const cloth = part('body', {zone: 'body', color: S.tiger, pattern: moved((x, yy) => ((x + (yy >> 1)) % 4 === 0 ? S.stripe : null), 0, y)});
      poly(cloth, [[cx - 6, y - 1], [cx + 6, y - 1], [cx + 5, y + 4], [cx, y + 2], [cx - 5, y + 4]]);
      const lh = [cx - 13, y - 15 + (hit ? 3 : 0)], rh = [cx + 13, y - 15 + (hit ? 0 : 3)];
      const arms = part('limb', {zone: 'arm'}); chain(arms, [[cx - 6, y - 8, 2.2], [cx - 11, y - 10, 1.8], [lh[0], lh[1], 1.6]]); chain(arms, [[cx + 6, y - 8, 2.2], [cx + 11, y - 10, 1.8], [rh[0], rh[1], 1.6]]);
      const fists = part('limb', {zone: 'arm'}); ellipse(fists, lh[0], lh[1], 1.8, 1.8); ellipse(fists, rh[0], rh[1], 1.8, 1.8);
      const sticks = part('horn', {zone: 'arm', color: S.stick}); limb(sticks, lh[0], lh[1], lh[0] - 2, lh[1] - 4, 0.5); limb(sticks, rh[0], rh[1], rh[0] + 2, rh[1] - 4, 0.5);
      const hair = part('limb', {zone: 'head', color: S.thunderHair}); poly(hair, [[cx - 6, y - 11], [cx - 10, y - 17], [cx - 5, y - 16], [cx - 4, y - 20], [cx - 1, y - 17], [cx + 1, y - 21], [cx + 3, y - 17], [cx + 6, y - 20], [cx + 6, y - 16], [cx + 10, y - 17], [cx + 6, y - 11]]);
      const head = part('body', {zone: 'head'}); ellipse(head, cx, y - 13, 5, 4.4);
      const horns = part('horn', {zone: 'head'}); poly(horns, [[cx - 4, y - 16], [cx - 5, y - 20], [cx - 2, y - 17]]); poly(horns, [[cx + 4, y - 16], [cx + 5, y - 20], [cx + 2, y - 17]]);
      eyes = [{x: cx - 3, y: y - 14, w: 2, h: 1, glow: S.bolt}, {x: cx + 2, y: y - 14, w: 2, h: 1, glow: S.bolt}];
      mouth = {x: cx - 2, y: y - 11, w: 5, fangs: true};
      a = {head: [cx, y - 21], side: [cx - 15, y + 2], hold: [cx + 9, y + 1], rear: [cx - 18, y + 9], cube: [cx + 26, 4], box: [cx - 21, y - 21, cx + 21, y + 13], float: true};
      break;
    }
  }
  return {parts, eyes, mouth, a, main};
}
