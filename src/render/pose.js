/* ---------- pose: where the creature is in its animation at frame f ----------
   The base clip for its state (idle, weak when CI is critical, sleep) loops on the frame counter; an event clip passed
   as opts.clip = {name, t, ...} (t ticks since it started; n, gx, gy for clicks) plays on top for its len ticks.
   build() and hitTest() both take the pose from here, so clicks land on what is on screen. */
'use strict';
const {clamp} = require('../core/util');
const {STAGES, MAX_STAGE} = require('../core/rules');
const {themeOf} = require('./themes');
const {BASE, clipOf, channel} = require('./clips');

const MOTION = ['bob', 'walk', 'flap', 'sway', 'alt', 'phase', 'rock', 'blink', 'look'];

// Returns {st, sleeping, motion, mo, pose, play, clip, t}:
//   mo     what plans() animate with: the MOTION channels, plus hatch (0..1), has (any sessions), motion, sleeping, mut
//   pose   the whole body: ox, oy, sq, and the face and mouth expressions (null for none)
//   play   the event clip instance playing (opts.clip), clip its definition, t its tick
function pose(D, f, opts, T) {
  const st = Math.min(D.stage, MAX_STAGE), has = D.count > 0, motion = !opts.reduced, mut = D.mutations || {};
  const sleeping = has && st > 0 && D.energy < 20;
  const base = BASE[sleeping ? 'sleep' : D.critical ? 'weak' : 'idle'];
  const clip = opts.clip ? clipOf(T, opts.clip.name) : null, play = clip ? opts.clip : null;
  const t = clip ? clamp(play.t | 0, 0, clip.len - 1) : 0;
  const mo = {hatch: clamp(D.xp / STAGES[1].xp, 0, 1), has, motion, sleeping, mut};
  for (const k of MOTION) mo[k] = motion ? channel(clip, k, t, channel(base, k, f, 0)) : 0;
  const body = {ox: 0, oy: 0, sq: 1, face: channel(clip, 'face', t, null), mouth: channel(clip, 'mouth', t, null)};
  if (motion) { body.ox = channel(clip, 'ox', t, 0); body.oy = channel(clip, 'oy', t, 0); body.sq = channel(clip, 'sq', t, 1); }
  return {st, sleeping, motion, mo, pose: body, play, clip, t};
}

// The clip a theme (by id) plays under a name, for the widget to know how long it lasts.
const clipFor = (themeId, name) => clipOf(themeOf(themeId), name);

module.exports = {pose, clipFor};
