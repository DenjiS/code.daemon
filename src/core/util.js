// Small helpers shared by the engine and the renderer.
'use strict';
const DAY = 864e5, HOUR = 36e5;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dayIdx = ms => { const d = new Date(ms); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY); };
// o has its own property k: never one inherited from Object.prototype, like "constructor"
const own = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

module.exports = {DAY, HOUR, clamp, dayIdx, own};
