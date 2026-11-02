// Accent colors every theme's overlays share (forms, crests, status marks), and color math.
'use strict';
const C = {steel: '#A9B8C9', steelDark: '#5C6B7C', white: '#FFFFFF', wood: '#B7834C', woodDark: '#7A5230', moon: '#E8E4C9',
  red: '#FF5A3C', orange: '#FF9B3C', yellow: '#FFE27A', gold: '#FFD24A', gem: '#FF5A7A', sick: '#8FA08A', drop: '#7FC8FF',
  alarm: '#FF5A5A', curse: '#FF4D4D', spark: '#FFF6C8', horn: '#ECE4CF', tongue: '#FF6F7D', note: '#F5F0FF', eyeWhite: '#F2F4F8', frost: '#A9C6DE'};
const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
// the grey of the same brightness
const gray = c => { const [r, g, b] = hex(c), v = Math.round(0.3 * r + 0.59 * g + 0.11 * b).toString(16).padStart(2, '0'); return '#' + v + v + v; };

module.exports = {C, mix, gray};
