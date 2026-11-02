/* ---------- forms ---------- */
'use strict';
const {DAY, dayIdx} = require('./util');
const {isLate} = require('./rules');

// Each trait's score against its own threshold (1 = qualifies), from the 30 days before t. No scores below 3 sessions.
function traitScores(seen, t) {
  const w = seen.filter(s => s.at <= t && t - s.at < 30 * DAY);
  if (w.length < 3) return {n: w.length, score: null};
  const n = w.length, share = f => w.filter(f).length / n;
  const days = new Set(w.map(s => dayIdx(s.at)));
  let streak = 0; const td = dayIdx(t); while (days.has(td - streak)) streak++;
  const score = {
    guardian: share(s => s.tests) / 0.30,
    debugger: share(s => s.bug) / 0.35,
    owl: share(s => isLate(s.at)) / 0.25,
    shipper: w.filter(s => s.ship).length / 3,
    streaker: streak / 7,
    polyglot: new Set(w.map(s => s.src)).size / 4,
    vibe: (w.reduce((a, s) => a + (s.commits || 0), 0) / n) / 10,
  };
  return {n, score};
}
function traitAt(seen, t) {
  const {score} = traitScores(seen, t);
  if (!score) return 'core';
  let best = 'core', bv = 1;
  for (const k in score) if (score[k] >= bv && score[k] > (score[best] || 0)) { best = k; bv = score[k]; }
  return best;
}

module.exports = {traitScores, traitAt};
