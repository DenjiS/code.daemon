/* ---------- build: one frame of the pet as pixels ----------
   build(D, f, opts) returns Map(cell index -> color) for frame f (8 per second). opts: {theme, screen, reduced, react}.

   A frame is drawn in layers, back to front. Every layer gets the same context (see context()): the pet's state,
   the theme's figure for this frame (plan, anchors, palette) and the surface to draw on.
     backdrop     the Night Owl's moon, the Shipper's crate (fixed, behind everything)
     trail        the Streaker's fire                          -- from here on, a click reaction moves the creature
     shadow       on the ground, or motes under a flyer
     parts        the theme's shapes, shaded by role, with Polyglot stripes and the Unreal sheen
     face         eyes and mouth: theme.face(ctx), or the default pixel face
     decor        the stage's own extras: plan.decor(ctx)
     worn, crest  form accessories, crown and the affinity crest over the head
     orbit, shiny, sick, sleep, reaction fx */
'use strict';
const {clamp, own} = require('../core/util');
const {MAX_STAGE, CREST_STAGE, FORM_STAGE, PET} = require('../core/rules');
const {C, mix} = require('./colors');
const {paint} = require('./raster');
const {themeOf} = require('./themes');
const {REACTIONS, motionOf} = require('./reactions');
const {surface} = require('./surface');
const {withAnchors} = require('./figure');
const {drawEgg} = require('./egg');
const {drawFace} = require('./face');
const {backdrop, trail, worn, crest} = require('./accessories');
const {shadow, orbit, shiny, sick, sleep} = require('./status');
const {reactFx} = require('./fx');

function build(D, f, opts) {
  opts = opts || {};
  const T = themeOf(opts.theme);
  const ctx = context(D, f, opts, T);
  if (ctx.st === 0 && !T.drawsEgg) { drawEgg(ctx); return ctx.buf; }
  figure(ctx);
  backdrop(ctx);
  ctx.move(ctx.rp.ox, ctx.rp.oy, ctx.rp.sq);
  trail(ctx);
  shadow(ctx);
  parts(ctx);
  (T.face || drawFace)(ctx);
  if (ctx.pl.decor) ctx.pl.decor(ctx);
  worn(ctx);
  crest(ctx);
  orbit(ctx);
  shiny(ctx);
  sick(ctx);
  sleep(ctx);
  if (ctx.react) reactFx(ctx);
  return ctx.buf;
}

// Everything a layer needs to know about this frame.
function context(D, f, opts, T) {
  const screen = opts.screen || T.screen || '#080A0E', motion = !opts.reduced;
  const st = Math.min(D.stage, MAX_STAGE), has = D.count > 0, mut = D.mutations || {};
  const sleeping = has && st > 0 && D.energy < 20;
  const {mo, rp} = motionOf(D, f, opts);
  const react = T.reacts && opts.react && own(REACTIONS, opts.react.kind) ? opts.react : null;
  // shiny pets turn golden, sick ones turn grey-green
  const tint = c => { let x = c; if (mut.shiny) x = mix(x, C.gold, 0.35); if (D.sick) x = mix(x, C.sick, D.critical ? 0.6 : 0.4); return x; };
  return Object.assign(surface(), {
    D, f, theme: T, st, aff: D.affinity, has, mut, sleeping, motion, screen,
    form: st >= FORM_STAGE ? D.form : null,
    mo,                 // idle motion: bob, walk, flap, sway, alt, phase
    rp,                 // the reaction's pose: ox, oy, sq, face, mouth
    react,              // the reaction playing, if this theme reacts: {kind, t, n, gx, gy}
    rt: react ? clamp(react.t | 0, 0, REACTIONS[react.kind].len - 1) : 0,
    tint,
    body: tint(PET[D.affinity || 'none']),  // the affinity color
    eye: screen,        // eyes and mouths are holes in the creature
    blink: motion && ((f % 41) < 1 || (f % 113) === 60),
    happy: D.mood >= 70 && !sleeping && !D.sick,
    tired: has && D.rest < 50,
    look: motion ? (f >> 2) & 3 : 0,
  });
}

// The theme's plan for this frame, its anchors, and the palette its parts are shaded with.
function figure(ctx) {
  const pl = ctx.theme.plans(ctx.st, ctx.f, ctx.mo);
  ctx.pl = pl;
  ctx.A = pl.a = withAnchors(pl.a, pl.parts);
  ctx.M = pl.mouth;
  // skin: the creature's own color if the plan brings one (Slavic, Asian), otherwise the affinity color
  const skin = ctx.skin = pl.main ? ctx.tint(pl.main) : ctx.body, screen = ctx.screen;
  ctx.pal = {
    body: skin, limb: mix(skin, screen, 0.16), far: mix(skin, screen, 0.42), belly: mix(skin, '#ffffff', 0.38),
    membrane: mix(skin, screen, 0.5), horn: mix(C.horn, skin, 0.18), core: '#FFFFFF', eyeWhite: C.eyeWhite,
  };
}

// Each part shaded by its role, or in its own color: a color, or one made from the skin, as skin => color.
// Parts can carry an ornament pattern.
// Body parts in the affinity color also wear the Polyglot's source stripes and the Unreal sheen.
function parts(ctx) {
  const {D, f, st, aff, form, motion, skin, pal, screen, tint, put, pl} = ctx;
  const stripes = form === 'polyglot' && D.srcs30 && D.srcs30.length > 1
    ? (x, y) => mix(PET[D.srcs30[Math.floor(y / 3) % D.srcs30.length]] || skin, skin, 0.35) : null;
  const sheen = aff === 'unreal' && st >= CREST_STAGE ? (x, y) => ((((x - y + (motion ? f * 2 : 0)) % 17) + 17) % 17 < 2 ? mix(skin, '#ffffff', 0.4) : null) : null;
  for (const part of pl.parts) {
    const base = typeof part.color === 'function' ? part.color(skin) : part.color ? tint(part.color) : (pal[part.role] || skin);
    const orn = part.pattern ? (x, y) => { const c = part.pattern(x, y); return c ? tint(c) : null; } : null;
    const extra = part.role === 'body' && !part.color ? (x, y) => (sheen && sheen(x, y)) || (stripes && stripes(x, y)) || (orn && orn(x, y)) || null : orn;
    paint(put, part.m, base, screen, extra, part.role === 'core' || part.flat);
  }
}

module.exports = {build};
