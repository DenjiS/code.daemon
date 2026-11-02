// The rules of the game: sources, stages, forms, mutations, and the numbers that tune XP.
'use strict';
const SOURCES = [
  {id: 'github', label: 'GitHub', crest: 'Brancher'},
  {id: 'gitlab', label: 'GitLab', crest: 'Pipeliner'},
  {id: 'local', label: 'Local', crest: 'Shell'},
  {id: 'unity', label: 'Unity', crest: 'Builder'},
  {id: 'unreal', label: 'Unreal', crest: 'Shader'},
];
const SRC = Object.fromEntries(SOURCES.map(s => [s.id, s]));
const STAGES = [
  {name: 'EGG',         xp: 0,     body: 'Egg'},
  {name: 'BIT',         xp: 60,    body: 'Slime'},
  {name: 'NIBBLE',      xp: 250,   body: 'Crawler'},
  {name: 'BYTE',        xp: 650,   body: 'Biped'},
  {name: 'WORD',        xp: 1300,  body: 'Kaiju'},
  {name: 'PROCESS',     xp: 2300,  body: 'Runner'},
  {name: 'THREAD',      xp: 3800,  body: 'Wyrm'},
  {name: 'DAEMON',      xp: 5800,  body: 'Imp'},
  {name: 'SERVICE',     xp: 8500,  body: 'Wyvern'},
  {name: 'KERNEL',      xp: 13000, body: 'Dragon'},
  {name: 'SINGULARITY', xp: 30000, body: 'Ascended'},
];
const MAX_STAGE = STAGES.length - 1;
const CREST_STAGE = 2, FORM_STAGE = 4;
const FORMS = {
  core:     {name: 'Core',      rule: 'Balanced habits'},
  guardian: {name: 'Guardian',  rule: 'Tests in 30%+ of sessions: carries a shield'},
  debugger: {name: 'Debugger',  rule: 'Bug fixes in 35%+ of sessions: holds a wrench'},
  owl:      {name: 'Night Owl', rule: '25%+ of sessions end 23:00-05:00: ear tufts, glowing eyes, a moon'},
  shipper:  {name: 'Shipper',   rule: '3+ shipped sessions in 30 days: keeps a crate with a flag'},
  streaker: {name: 'Streaker',  rule: '7+ day streak when it evolved: trails fire'},
  polyglot: {name: 'Polyglot',  rule: '4+ sources in 30 days: striped in their colors'},
  vibe:     {name: 'Vibecoder', rule: '10+ commits per session on average: headphones and floating notes'},
};
const MUTATIONS = {
  shiny:   {name: 'Shiny',   rule: 'Coded 30 days in a row at some point'},
  cursed:  {name: 'Cursed',  rule: 'Coded on a Friday the 13th'},
  crowned: {name: 'Crowned', rule: '1000 commits'},
};
const PET = {github: '#8E9BFF', gitlab: '#FF9B5E', local: '#4ADBC3', unity: '#B4E15C', unreal: '#E78CF7', none: '#C7CFDA'};
const FIX_XP = 15;
const DAY_SOFT_CAP = 90, OVER_CAP_RATE = 0.15;
// late night, 23:00-05:00 local time: the Night Owl form and REST both count it
const isLate = ms => { const h = new Date(ms).getHours(); return h >= 23 || h < 5; };

module.exports = {SOURCES, SRC, STAGES, MAX_STAGE, CREST_STAGE, FORM_STAGE, FORMS, MUTATIONS, PET, FIX_XP, DAY_SOFT_CAP, OVER_CAP_RATE, isLate};
