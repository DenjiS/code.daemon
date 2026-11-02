/* ---------- theme registry ----------
   A theme is one file in src/themes/ that exports one object; src/index.js registers it with defineTheme(),
   and the picker lists themes in that order. Every theme draws its creatures from shapes, frame by frame.

     id        lowercase letters, digits and dashes; the saved setting and PET_THEME use it
     name      English name (translations: 'theme.<id>' and 'body.<id>.<stage>' in ui/i18n/*.js)
     accent    color of its chip in the theme picker (optional)
     screen, dot   its own screen and dot-grid colors (optional; otherwise the widget's)
     bodies    11 creature names, one per stage (optional; otherwise STAGES[st].body)

     plans(st, f, mo)  the creature for stage st at frame f, moving as mo says (motionOf in reactions.js: bob, walk,
                       flap, sway, alt, phase, hatch). Returns a figure {parts, eyes, mouth, a, main?, decor?}:
                         parts  shapes in drawing order, from partList() in figure.js: part(role, {zone, color, pattern, flat})
                                role picks the shading: body, limb, far, belly, membrane, horn, core, eyeWhite.
                                color: its own color instead of the role's, or skin => color to derive it from the skin
                                (Succubus: hair and outfit follow the affinity); pattern(x, y): ornament color or null;
                                flat: no shading; zone: what a click there touches (head, body, arm, legs, tail, wing, egg).
                         eyes   [{x, y, w, h}] pixel eyes (optional glow, slit, spark), or one {visor: true}
                         mouth  {x, y, w} with optional color (lips), fangs, tooth, teeth (a color), tongue
                         a      anchors: head (top of the head), side, hold (hand), rear, cube (Unity crest), box [x0, y0, x1, y1],
                                float: true for flyers. Any left out are placed around the parts' bounding box.
                         main   the creature's own body color (otherwise the affinity color)
                         decor(ctx)  extras drawn over the face for this stage (decor.js, egg.js have some)
     face(ctx)  draws the eyes and mouth itself, instead of the default pixel face (Derpy's googly eyes)
     drawsEgg   plans() draws stage 0 too (otherwise the default egg is used)
     reacts     answers clicks: its parts carry zones (see reactions.js)

   ctx, the context every layer and hook gets, is described in build.js. */
'use strict';
const {STAGES} = require('../core/rules');

const DEFAULT_THEME = 'classic';
const registry = new Map();

function defineTheme(theme) {
  const fail = why => { throw new Error(`code.daemon theme "${theme && theme.id}": ${why}`); };
  if (!theme || typeof theme.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(theme.id)) fail('id must be lowercase letters, digits and dashes');
  if (registry.get(theme.id) === theme) return theme;  // the same module registered twice
  if (registry.has(theme.id)) fail('a theme with this id is already defined');
  if (typeof theme.name !== 'string' || !theme.name) fail('name is missing');
  if (typeof theme.plans !== 'function') fail('plans(st, f, mo) is missing');
  if (theme.face !== undefined && typeof theme.face !== 'function') fail('face must be a function');
  if (theme.bodies && theme.bodies.length !== STAGES.length) fail(`bodies needs ${STAGES.length} names, one per stage`);
  registry.set(theme.id, theme);
  return theme;
}

// All defined themes, in picker order.
const themes = () => [...registry.values()];
const hasTheme = id => typeof id === 'string' && registry.has(id);
// Unknown ids draw as the default theme, so a stale setting never leaves the screen empty.
const themeOf = id => registry.get(id) || registry.get(DEFAULT_THEME);
const stageBody = (st, id) => (themeOf(id).bodies || [])[st] || STAGES[st].body;
const themeColors = id => { const T = themeOf(id); return T.screen ? {screen: T.screen, dot: T.dot} : null; };

module.exports = {defineTheme, themes, hasTheme, themeOf, stageBody, themeColors};
