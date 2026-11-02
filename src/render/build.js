/* ---------- build: one frame of the pet as pixels ----------
   build(D, f, opts) returns Map(cell index -> color) for frame f (8 per second). opts: {theme, screen, reduced, clip}:
   clip = {name, t, n, gx, gy} plays an event clip (clips.js), t ticks in.

   A frame is drawn in layers, back to front, over the wall: the Committed mutation's contribution graph (marks.js). Every layer gets the same context (see context()): the pet's state,
   the theme's figure for this frame (plan, anchors, palette) and the surface to draw on.
     backdrop     the Night Owl's moon, the Shipper's crate (fixed, behind everything)
     trail        the Streaker's fire                          -- from here on, a click reaction moves the creature
     shadow       on the ground, or motes under a flyer
     parts        the theme's shapes, shaded by role, with Polyglot stripes and the Unreal sheen
     ribs         an exhausted or starving pet's ribs (gaunt.js; its body was thinned in figure())
     face         eyes and mouth: theme.face(ctx), or the default pixel face, then sunken sockets when gaunt
     decor        the stage's own extras: plan.decor(ctx)
     worn, crest  form accessories, crown and the affinity crest over the head
     orbit, shiny, sick, sleep, reaction fx
     glitch       a pet about to devolve flickers (on the finished frame) */
'use strict';
const {CREST_STAGE, FORM_STAGE, PET} = require('../core/rules');
const {C, mix, gray} = require('./colors');
const {paint} = require('./raster');
const {themeOf} = require('./themes');
const {pose} = require('./pose');
const {surface} = require('./surface');
const {withAnchors} = require('./figure');
const {drawEgg} = require('./egg');
const {drawFace} = require('./face');
const {backdrop, trail, worn, crest} = require('./accessories');
const {shadow, orbit, shiny, sick, sleep} = require('./status');
const {playFx} = require('./fx');
const gaunt = require('./gaunt');
const {wall} = require('./marks');

function build(D, f, opts) {
  opts = opts || {};
  const T = themeOf(opts.theme);
  const ctx = context(D, f, opts, T);
  wall(ctx);
  if (ctx.st === 0 && !T.drawsEgg) { drawEgg(ctx); return ctx.buf; }
  figure(ctx);
  backdrop(ctx);
  ctx.move(ctx.pose.ox, ctx.pose.oy, ctx.pose.sq);
  trail(ctx);
  shadow(ctx);
  parts(ctx);
  gaunt.ribs(ctx);
  (T.face || drawFace)(ctx);
  gaunt.sockets(ctx);
  if (ctx.pl.decor) ctx.pl.decor(ctx);
  worn(ctx);
  crest(ctx);
  orbit(ctx);
  shiny(ctx);
  sick(ctx);
  sleep(ctx);
  if (ctx.play) playFx(ctx);
  gaunt.glitch(ctx);
  return ctx.buf;
}

// Everything a layer needs to know about this frame.
function context(D, f, opts, T) {
  const screen = opts.screen || T.screen || '#080A0E', motion = !opts.reduced;
  const P = pose(D, f, opts, T), {st, sleeping, mo} = P, has = D.count > 0, mut = D.mutations || {};
  const lvl = gaunt.level(D, st), cold = st === 0 && has && D.starving;
  // shiny pets turn golden, sick ones turn grey-green, hungry ones lose their color, a cooling egg turns frosty
  const tint = c => {
    let x = c;
    if (mut.shiny) x = mix(x, C.gold, 0.35);
    if (D.sick) x = mix(x, C.sick, D.critical ? 0.6 : 0.4);
    if (lvl) x = gaunt.fade(x, lvl, screen);
    if (cold) x = mix(mix(x, gray(x), 0.4), C.frost, 0.25);
    return x;
  };
  return Object.assign(surface(), {
    D, f, theme: T, st, aff: D.affinity, has, mut, sleeping, motion, screen,
    gaunt: lvl,         // 0 fed, 1 exhausted, 2 starving (gaunt.js)
    form: st >= FORM_STAGE ? D.form : null,
    mo,                 // motion channels for plans(): bob, walk, flap, sway, alt, phase, rock, blink, look, hatch...
    pose: P.pose,       // the whole body: ox, oy, sq, and face and mouth expressions
    play: P.play,       // the event clip playing, {name, t, n, gx, gy}, or null
    clip: P.clip,       // its definition
    ct: P.t,            // its tick
    tint,
    body: tint(PET[D.affinity || 'none']),  // the affinity color
    eye: screen,        // eyes and mouths are holes in the creature
    blink: mo.blink,
    happy: D.mood >= 70 && !sleeping && !D.sick,
    tired: has && D.rest < 50,
    look: mo.look,
  });
}

// The theme's plan for this frame, its anchors, and the palette its parts are shaded with.
function figure(ctx) {
  const pl = gaunt.thin(ctx.theme.plans(ctx.st, ctx.f, ctx.mo), ctx.gaunt);
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
// ctx.owner remembers which part is on top in every cell, for the layers that draw on the body (ribs, sockets).
function parts(ctx) {
  const {D, f, st, aff, form, motion, skin, pal, screen, tint, put, pl} = ctx, owner = ctx.owner = new Map();
  const stripes = form === 'polyglot' && D.srcs30 && D.srcs30.length > 1
    ? (x, y) => mix(PET[D.srcs30[Math.floor(y / 3) % D.srcs30.length]] || skin, skin, 0.35) : null;
  const sheen = aff === 'unreal' && st >= CREST_STAGE ? (x, y) => ((((x - y + (motion ? f * 2 : 0)) % 17) + 17) % 17 < 2 ? mix(skin, '#ffffff', 0.4) : null) : null;
  for (const part of pl.parts) {
    const base = typeof part.color === 'function' ? part.color(skin) : part.color ? tint(part.color) : (pal[part.role] || skin);
    const orn = part.pattern ? (x, y) => { const c = part.pattern(x, y); return c ? tint(c) : null; } : null;
    const extra = part.role === 'body' && !part.color ? (x, y) => (sheen && sheen(x, y)) || (stripes && stripes(x, y)) || (orn && orn(x, y)) || null : orn;
    paint(put, part.m, base, screen, extra, part.role === 'core' || part.flat);
    part.paint = base;
    for (const k of part.m) owner.set(k, part);
  }
}

module.exports = {build};
