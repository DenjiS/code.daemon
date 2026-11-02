/*
  code.daemon pet engine. Shared by the desktop widget (ui/widget.html) and the
  GitHub profile Action (render.cjs). No dependencies; works in a browser and in Node.

  - XP with diminishing returns and a daily soft cap, replayed in time order
  - 11 stages, each with its own creature body
  - branching forms, locked at the moment each evolution happens
  - rare mutations from your whole history
  - build health from CI results, with a bonus when you fix a red build
  - a 64 x 48 pixel renderer with themes, click reactions, and an animated SVG card

  core/    stats from coding sessions: rules, XP, forms, CI, GitHub scanning
  render/  pixels: raster primitives, the theme registry, build() and its layers, reactions, the SVG card
  themes/  the themes, one file each

  tools/build.cjs bundles this folder into ui/pet-core.js and the profile Action's copy: `npm run build`.
*/
'use strict';
const {DAY, HOUR, clamp, dayIdx} = require('./core/util');
const {SOURCES, SRC, STAGES, MAX_STAGE, CREST_STAGE, FORM_STAGE, FORMS, MUTATIONS, PET, FIX_XP, DAY_SOFT_CAP, OVER_CAP_RATE, isLate} = require('./core/rules');
const {sessionXP, mult} = require('./core/xp');
const {SESSION_GAP, commitKey, sessionStart, rescanFrom, valid, detectKind, toSessions} = require('./core/sessions');
const {traitScores, traitAt} = require('./core/forms');
const {derive, gainFor, statusInfo, statusLine} = require('./core/derive');
const {ciFromRollup, ciFromPipeline, updateCI} = require('./core/ci');
const {Q_REPO, Q_HIST, scanGitHubRepo} = require('./core/github');
const {mix} = require('./render/colors');
const {GW, GH} = require('./render/raster');
const {defineTheme, themes, hasTheme, stageBody, themeColors} = require('./render/themes');
const {build} = require('./render/build');
const {REACTIONS, reactionFor, canReact, hitTest} = require('./render/reactions');
const {renderSVG} = require('./render/svg');

// The themes, in picker order.
defineTheme(require('./themes/classic'));
defineTheme(require('./themes/derp'));
defineTheme(require('./themes/slavic'));
defineTheme(require('./themes/asian'));
defineTheme(require('./themes/demonic'));
defineTheme(require('./themes/succubus'));

module.exports = {
  // rules
  DAY, HOUR, SOURCES, SRC, STAGES, MAX_STAGE, CREST_STAGE, FORM_STAGE, FORMS, MUTATIONS, PET, FIX_XP, DAY_SOFT_CAP, OVER_CAP_RATE,
  isLate, clamp, dayIdx,
  // stats from sessions
  sessionXP, mult, valid, derive, gainFor, traitScores, traitAt, statusInfo, statusLine,
  SESSION_GAP, sessionStart, rescanFrom, commitKey, detectKind, toSessions,
  ciFromRollup, ciFromPipeline, updateCI, Q_REPO, Q_HIST, scanGitHubRepo,
  // pixels
  GW, GH, mix, build, renderSVG, REACTIONS, reactionFor, canReact, hitTest,
  defineTheme, themes, hasTheme, stageBody, themeColors,
};
