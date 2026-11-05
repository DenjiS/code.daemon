/* ---------- accessories: what forms and the affinity add around the creature ----------
   All placed on the plan's anchors (a.head, a.side, a.hold, a.rear, a.cube, a.box), so they fit every theme. */
'use strict';
const {clamp} = require('../core/util');
const {CREST_STAGE} = require('../core/rules');
const {C, mix} = require('./colors');
const {GW, G} = require('./raster');

// Behind the creature, on the fixed screen: the Night Owl's moon and the Shipper's crate.
function backdrop(ctx) {
  const {form, A, sprite, put, mo, body} = ctx;
  if (form === 'owl') sprite(['.###.', '##...', '#....', '#....', '##...', '.###.'], 3, 6, {'#': C.moon});
  if (form === 'shipper' && !A.float) {
    const x0 = Math.max(0, Math.round(A.box[0] - 10)), y0 = G - 5;
    sprite(['bbbbbbb', 'bhbbbhb', 'bbhbhbb', 'bbbhbbb', 'bbhbhbb', 'bhbbbhb'], x0, y0, {b: C.wood, h: C.woodDark});
    for (let y = y0 - 6; y < y0; y++) put(x0 + 6, y, C.steel);
    sprite(['ff.', 'fff', 'ff.'], x0 + 7, y0 - 6 + mo.alt, {f: body});
  }
}

// The Streaker's fire trail behind its rear.
function trail(ctx) {
  const {form, A, sprite, put, mo, body, screen} = ctx;
  if (form !== 'streaker') return;
  const [rx, ry] = A.rear;
  const flame = mo.alt ? ['..y..', '.yoy.', 'oyyyo', 'oryro', '.rrr.'] : ['.y...', '.yo..', 'oyyo.', 'oryro', '.rrr.'];
  sprite(flame, rx - 6, ry - 3, {r: C.red, o: C.orange, y: C.yellow});
  for (let i = 0; i < 3 + mo.walk; i++) { put(rx - 8 - i, ry + 3, mix(body, screen, 0.4)); put(rx - 7 - i, ry - 3, mix(body, screen, 0.55)); }
}

// Held and worn: the Guardian's shield, the Debugger's wrench, the Night Owl's ear tufts, the Vibecoder's headphones.
function worn(ctx) {
  const {form, A, sprite, put, st, f, pal, body} = ctx;
  if (form === 'guardian') { const [sx, sy] = A.side; sprite(['sssssss', 'swww+ws', 'sw+++ws', 'sww+wws', '.sw+ws.', '..sws..', '...s...'], sx - 3, sy - 3, {s: C.steel, w: C.steelDark, '+': C.white}); }
  if (form === 'debugger') {
    const [hx, hy] = A.hold;
    [[0, 0], [-1, -1], [-2, -2], [-3, -3]].forEach(([dx, dy]) => put(hx + dx, hy + dy, C.steel));
    [[-4, -4], [-5, -4], [-4, -5], [-6, -5], [-5, -6], [-6, -3], [-3, -6], [-7, -6], [-6, -7]].forEach(([dx, dy]) => put(hx + dx, hy + dy, C.steel));
    put(hx - 5, hy - 5, C.steelDark);
  }
  if (form === 'owl') { const [hx, hy] = A.head; put(hx - 4, hy + 1, pal.body); put(hx - 5, hy, pal.body); put(hx - 5, hy - 1, pal.limb); put(hx + 4, hy + 1, pal.body); put(hx + 5, hy, pal.body); put(hx + 5, hy - 1, pal.limb); }
  if (form === 'vibe') {
    const [hx, hy] = A.head, w = st >= 9 ? 8 : 6, band = mix('#2A2F3A', body, 0.15);
    for (let x = hx - w + 1; x <= hx + w - 1; x++) { const t = (x - hx) / w; put(x, Math.round(hy + 2 - (1 - t * t) * 3), band); }
    for (const s of [-1, 1]) for (let j = 0; j < 4; j++) { put(hx + s * w, hy + 2 + j, band); put(hx + s * (w + 1), hy + 2 + j, mix(C.gem, band, 0.3)); }
    const nt = (f >> 1) % 8, nx = hx + w + 3 + (nt >> 2), ny = hy - 1 - nt;
    sprite(['.##', '.#.', '##.'], nx, ny, {'#': C.note});
    if (nt > 3) sprite(['#', '#', '#'], hx - w - 4, hy + 4 - nt, {'#': mix(C.note, body, 0.4)});
  }
}

// Over the head: the crown of a Crowned pet, then the crest of the dominant source, in the affinity color.
function crest(ctx) {
  const {A, sprite, put, top, st, f, D, aff, mut, mo, motion, body, screen} = ctx;
  let [tx, ty] = A.head;
  const crowned = mut.crowned && st >= CREST_STAGE, gap = crowned ? 3 : 0;
  const L = clamp(ty - gap - 4, 3, 6), spark = motion ? ((f >> 2) % 5) : 0;
  const rise = Math.max(crowned ? 2 : 0, st < CREST_STAGE ? 0
    : aff === 'github' ? gap + L + 2 : aff === 'gitlab' ? gap + 4.5
    : aff === 'local' ? gap + 3 : aff === 'unreal' && spark === 2 ? gap + 4 : 0);
  const dy = top(ty - rise) - (ty - rise);
  // Tall pets keep their silhouette: only an overflowing crown/crest moves beside the head.
  if (dy) { tx += tx < GW / 2 ? 14 : -14; ty += dy; }
  if (crowned) { sprite(['y.y.y.y', 'yyygyyy', 'yyyyyyy'], tx - 3, ty - 2, {y: C.gold, g: C.gem}); ty -= 3; }
  if (st < CREST_STAGE) return;
  const hi = mix(body, '#ffffff', 0.6), sh = mix(body, screen, 0.42), deep = mix(body, screen, 0.75);
  if (aff === 'github') {  // a branching antenna
    for (let i = 1; i <= L; i++) put(tx, ty - i, sh);
    for (let i = 2; i < L; i++) put(tx + Math.min(3, i - 1), ty - i - 1, sh);
    const p = motion ? ((f >> 3) & 1) : 0;
    sprite(['nn', 'nn'], tx - 0.5, ty - L - 2, {n: p ? hi : body}); sprite(['nn', 'nn'], tx + 2.5, ty - L - 2, {n: p ? body : hi});
  } else if (aff === 'gitlab') {  // a pipeline whose stages light up in turn, the last one red while CI fails
    put(tx, ty - 1, sh); put(tx, ty - 2, sh);
    for (let x = tx - 6; x <= tx + 6; x++) put(x, ty - 3, deep);
    const j = D.sick ? -1 : (motion ? ((f >> 2) % 4) : 3);
    [-6, 0, 6].forEach((o, k) => { const c = D.sick && k === 2 ? C.alarm : k < j ? body : k === j ? hi : sh; sprite(['cc', 'cc'], tx + o - 0.5, ty - 4.5, {c}); });
  } else if (aff === 'local') {  // a blinking cursor
    put(tx, ty - 1, sh); put(tx, ty - 2, sh); put(tx, ty - 3, (!motion || mo.alt) ? hi : sh);
  } else if (aff === 'unity') {  // a floating cube
    const [ux, uy] = A.cube, cb = motion ? ((f >> 2) & 1) : 0;
    sprite(['...hhh...', '.hhhhhhh.', 'hhhhhhhhh', 'bbhhhhhss', 'bbbbhssss', 'bbbbbssss', 'bbbbbssss', '.bbbbsss.', '...bbs...'], ux - 4, top(uy + cb), {h: hi, b: body, s: sh});
  } else if (aff === 'unreal') {  // a sparkle that hops around the creature
    const [x0, y0, x1, y1] = A.box;
    const sp = [[x0 - 1, y0 + 3], [x1 + 1, y0 + 8], [tx + 3, ty - 3], [x0 + 1, y1 - 6], [x1 - 2, y1 - 3]];
    const [sx, y] = sp[spark], sy = top(y - 1) + 1;
    put(sx, sy, hi); put(sx - 1, sy, sh); put(sx + 1, sy, sh); put(sx, sy - 1, sh); put(sx, sy + 1, sh);
  }
}

module.exports = {backdrop, trail, worn, crest};
