/* ---------- CI ---------- */
'use strict';
const {DAY} = require('./util');
const {FIX_XP} = require('./rules');

function ciFromRollup(state) {
  if (state === 'SUCCESS') return 'pass';
  if (state === 'FAILURE' || state === 'ERROR') return 'fail';
  if (state === 'PENDING' || state === 'EXPECTED') return 'run';
  return null;
}
function ciFromPipeline(status) {
  if (status === 'success') return 'pass';
  if (status === 'failed') return 'fail';
  if (['running', 'pending', 'created', 'preparing', 'waiting_for_resource', 'scheduled'].indexOf(status) >= 0) return 'run';
  return null;
}
// Merges freshly observed CI results into the stored map. A red -> green change on the same branch earns a
// "build fixed" event, at most once per repo per day. Moving from a red branch to a green one is not a fix.
function updateCI(prev, observed, now) {
  const ci = Object.assign({}, prev || {}), events = [];
  for (const key in observed) {
    const o = observed[key], old = ci[key];
    if (!o || !o.s) { delete ci[key]; continue; }
    const at = o.at || now, ref = o.ref || undefined;
    const p = old && (!old.ref || !ref || old.ref === ref) ? old : null;  // entries saved before refs were tracked count as the same branch
    const lastFix = (old && old.lastFix) || undefined;
    const wasRed = !!(p && (p.s === 'fail' || p.wasFail));
    if (o.s === 'fail') ci[key] = {s: 'fail', at, ref, since: p && p.s === 'fail' ? p.since : at, lastFix};
    else if (o.s === 'run') ci[key] = {s: 'run', at, ref, wasFail: wasRed, since: wasRed ? p.since : undefined, lastFix};
    else {
      const fix = wasRed && !(lastFix && at - lastFix < DAY);
      ci[key] = {s: 'pass', at, ref, lastFix: fix ? at : lastFix};
      if (fix) events.push({id: 'fix:' + key + ':' + at, kind: 'fix', repo: key, at, xp: FIX_XP});
    }
  }
  return {ci, events};
}

module.exports = {ciFromRollup, ciFromPipeline, updateCI};
