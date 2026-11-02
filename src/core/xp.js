// XP math: what one session is worth, the streak bonus and the daily soft cap.
'use strict';
const {DAY_SOFT_CAP, OVER_CAP_RATE} = require('./rules');

// One session's XP before streak and daily cap. Long sessions and commit bursts grow slowly on purpose.
const sessionXP = s => 12 * Math.log(1 + Math.min(s.min, 480) / 20) + 7 * Math.sqrt(Math.min(s.commits || 0, 50))
  + (s.tests ? 8 : 0) + (s.bug ? 6 : 0) + (s.ship ? 15 : 0);
// streak multiplier: +3% per day in a row, up to +30%
const mult = st => 1 + 0.03 * Math.min(st, 10);
// XP over DAY_SOFT_CAP in one day counts at OVER_CAP_RATE
const softCap = v => v <= DAY_SOFT_CAP ? v : DAY_SOFT_CAP + (v - DAY_SOFT_CAP) * OVER_CAP_RATE;

module.exports = {sessionXP, mult, softCap};
