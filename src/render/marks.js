/* ---------- marks: mutations drawn on the screen itself ----------
   wall(ctx): the Committed mutation. A dim contribution graph on the wall behind the pet: your real commits of the
   last 29 weeks, one column a week (this week on the right), one row a day (Monday on top), four greens by how many.
   It is drawn first, on the fixed screen, so the pet and every other effect stay in front of it, and dim enough to
   read as a backdrop. It keeps clear of the Night Owl's moon in the top left corner. */
'use strict';
const {dayIdx} = require('../core/util');
const {mix} = require('./colors');
const {GW} = require('./raster');

const GREENS = ['#0E4429', '#006D32', '#26A641', '#39D353'];
const WEEKS = 29, X0 = 4, Y0 = 9;  // 29 columns two cells apart fill the width; 7 rows from y 9 to 21
const level = n => (n >= 10 ? 3 : n >= 6 ? 2 : n >= 3 ? 1 : 0);

// commits a day, from the pet's sessions; a made-up week pattern when there are none to read (previews, tests)
function days(D) {
  const by = new Map();
  if (D.sorted && Number.isFinite(D.now)) { for (const s of D.sorted) { const d = dayIdx(s.at); by.set(d, (by.get(d) || 0) + (s.commits || 0)); } return by; }
  const today = dayIdx(Date.UTC(2026, 10, 2));
  for (let i = 0; i < WEEKS * 7; i++) if ((i * 7 + (i % 5) * 3) % 4) by.set(today - i, (i * 13) % 12 + 1);
  return by;
}

function wall(ctx) {
  const {D, mut, put0, screen, form} = ctx;
  if (!mut.committed) return;
  const by = days(D), now = Number.isFinite(D.now) ? D.now : Date.UTC(2026, 10, 2);
  const today = dayIdx(now), wd = (new Date(now).getDay() + 6) % 7;  // Monday 0
  for (let c = 0; c < WEEKS; c++) for (let r = 0; r < 7; r++) {
    const day = today - wd + r - (WEEKS - 1 - c) * 7, n = by.get(day) || 0;
    if (day > today || !n) continue;
    const x = X0 + c * 2, y = Y0 + r * 2;
    if (form === 'owl' && x < 10 && y < 14) continue;
    if (x < GW) put0(x, y, mix(GREENS[level(n)], screen, 0.35));
  }
}

module.exports = {wall};
