/* ---------- clips: animation as data ----------
   A clip says what the creature does over time, as channels. Each channel is a constant, an array indexed by the tick,
   or a function of the tick (one tick = one frame, 8 per second). Channels a clip leaves out keep their default.

     body       ox, oy     shift the whole creature, in cells          (default 0)
                sq         squash it toward the ground, 1 = none     (default 1)
     motion     bob, walk, flap, sway, alt   0 or 1: the phases plans() animate with
                phase      a smooth angle for slithering and floating
                rock       the egg's sideways rock, -1..1
                blink      eyes shut for this frame
                look       which way googly pupils wander, 0..3
     face       face       an eye expression: joy, giggle, wow, look, angry, peek (see face.js)
                mouth      a mouth expression: smile, frown, open, o
     fx         the name of an effect in fx.js, or fx(ctx, t) drawing one over the creature

   A base clip loops for as long as a state lasts (idle, weak, sleep); an event clip plays once on top of it, for len
   ticks, and its channels win. Under reduced motion only the face and fx of an event clip play, and the base is still.
   Themes can replace a clip with their own version: theme.clips = {pat: {...}}. */
'use strict';
const {own} = require('../core/util');

// flips between 0 and 1 every n ticks
const toggle = n => t => Math.floor(t / n) & 1;
// -1, 1, -1, 1... for the first n ticks, then 0: a shake
const shake = n => t => (t < n ? (t & 1 ? 1 : -1) : 0);

/* base clips: what the creature does on its own */
const IDLE = {
  loop: true, bob: toggle(4), walk: toggle(4), flap: toggle(4), sway: toggle(8), alt: toggle(2), phase: t => t * 0.4,
  look: t => Math.floor(t / 4) & 3,
  blink: t => t % 41 < 1 || t % 113 === 60,                                  // twice in a while, out of step
  rock: t => { const w = t % 48 - 43; return w > 0 ? [0, 1, -1, 1, 0][w] : 0; },  // an egg rocks every 6 seconds
};
const BASE = {
  idle: IDLE,
  weak: Object.assign({}, IDLE, {bob: 0}),                                   // critical: too weak to bounce
  sleep: Object.assign({}, IDLE, {bob: 0, walk: 0, flap: 0, sway: 0}),
};

/* event clips: reactions to clicks (see reactionFor in reactions.js), CI, the evolution and the devolution */
const CLIPS = {
  pat: {len: 16, face: 'joy', mouth: 'smile', sq: [0.92, 0.88, 0.92, 0.96], fx: 'hearts'},
  tickle: {len: 14, face: 'giggle', mouth: 'open', ox: shake(12), fx: 'sparks'},
  wave: {len: 14, face: 'joy', mouth: 'smile', sway: t => (t >> 1) & 1, fx: 'twinkle'},
  hop: {len: 10, face: t => (t < 7 ? 'wow' : 'joy'), mouth: t => (t < 7 ? 'o' : 'smile'),
    oy: [0, -2, -4, -5, -5, -4, -2, 0, 0, 0], sq: [1, 1, 1, 1, 1, 1, 1, 0.88, 0.95, 1], walk: t => t & 1},
  tail: {len: 12, face: 'wow', mouth: 'o', oy: [-1, -2, -1], sway: t => t & 1, fx: 'exclaim'},
  flutter: {len: 14, face: 'joy', mouth: 'smile', oy: [-1, -2, -3, -3, -3, -3, -3, -3, -2, -2, -1, -1, 0, 0], flap: t => t & 1},
  look: {len: 16, face: 'look', fx: 'question'},
  angry: {len: 20, face: 'angry', mouth: 'frown', ox: shake(10), fx: 'anger'},
  grumpy: {len: 16, face: 'angry', mouth: 'frown', ox: shake(4), fx: 'anger'},
  stir: {len: 12, face: t => (t >= 2 && t < 10 ? 'peek' : null), ox: shake(2), fx: 'drowsy'},
  wobble: {len: 8, ox: [1, -1, 1, -1, 1, 0, 0, 0], fx: 'poke'},
  flinch: {len: 8, face: 'wow', mouth: 'o', ox: shake(4), fx: 'exclaim'},
  // a red build: startled eyes, a shiver, and a red alarm beside the head
  ciFail: {len: 18, face: t => (t < 12 ? 'wow' : null), mouth: t => (t < 12 ? 'o' : null), ox: shake(12),
    sq: [1, 0.96, 1, 0.96, 1, 0.98], fx: 'alarm'},
  // a fixed build: breathe out, then a small happy hop with bright stars
  ciFixed: {len: 20, face: t => (t < 16 ? 'joy' : null), mouth: t => (t < 5 ? 'smile' : t < 16 ? 'open' : null),
    oy: [0, 0, 0, 0, 0, -1, -2, -2, -1, 0], sq: [0.96, 0.94, 0.96, 0.98, 1], fx: 'relief'},
  // two happy jumps and a burst of stars: the widget plays it when the pet evolves
  evolve: {len: 18, face: t => (t < 14 ? 'joy' : null), mouth: t => (t < 14 ? 'open' : null), flap: t => t & 1,
    oy: [0, -2, -4, -4, -2, 0, 0, -2, -4, -4, -2, 0], sq: [1, 1, 1, 1, 1, 1, 0.88, 1, 1, 1, 1, 1, 0.88, 0.95], fx: 'burst'},
  // a start, a shiver, and it sags while bits of it crumble away: the widget plays it when hunger costs a stage
  devolve: {len: 20, face: t => (t < 8 ? 'wow' : null), mouth: t => (t < 8 ? 'o' : 'frown'), ox: shake(8),
    sq: [1, 1, 1, 0.97, 0.94, 0.91, 0.88, 0.88, 0.88, 0.9, 0.92, 0.94, 0.96, 0.98], fx: 'crumble'},
};

const CHANNELS = ['ox', 'oy', 'sq', 'bob', 'walk', 'flap', 'sway', 'alt', 'phase', 'rock', 'blink', 'look', 'face', 'mouth', 'fx'];
function defineClip(name, clip) {
  const fail = why => { throw new Error(`code.daemon clip "${name}": ${why}`); };
  if (typeof name !== 'string' || !/^[a-z][a-zA-Z0-9-]*$/.test(name)) fail('name must start with a lowercase letter');
  if (!clip || !(clip.len >= 1)) fail('len (ticks) is missing');
  for (const k in clip) if (k !== 'len' && !CHANNELS.includes(k)) fail(`unknown channel "${k}"`);
  CLIPS[name] = clip;
  return clip;
}

// The clip a theme plays under a name: its own version if it has one.
const clipOf = (theme, name) => (theme && theme.clips && own(theme.clips, name) && theme.clips[name]) || (own(CLIPS, name) && CLIPS[name]) || null;

// A channel's value at tick t, or dflt where the clip says nothing.
function channel(clip, key, t, dflt) {
  if (!clip || !own(clip, key)) return dflt;
  const v = clip[key];
  const x = typeof v === 'function' ? v(t) : Array.isArray(v) ? v[t] : v;
  return x === undefined ? dflt : x;
}

module.exports = {BASE, CLIPS, defineClip, clipOf, channel};
