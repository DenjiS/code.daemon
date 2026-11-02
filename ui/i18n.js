/* code.daemon i18n. Each ui/i18n/<lang>.js file registers a dictionary with I18n.add(); t() looks a key up in the
   chosen language, then in English. Values may hold {placeholders}, a little HTML (<b>, <br>, <code>, links), or plural
   forms as {one, few, many, other}, picked by the number in {n}. Names of stages, forms and so on fall back to the engine. */
(() => {
'use strict';
const LANGS = [
  {id: 'en', name: 'English', tag: 'en'},
  {id: 'ru', name: 'Русский', tag: 'ru'},
  {id: 'es', name: 'Español', tag: 'es'},
  {id: 'de', name: 'Deutsch', tag: 'de'},
  {id: 'pt', name: 'Português (BR)', tag: 'pt-BR'},
  {id: 'zh', name: '简体中文', tag: 'zh-CN'},
  {id: 'ko', name: '한국어', tag: 'ko'},
  {id: 'ja', name: '日本語', tag: 'ja'},
];
const DICT = {};
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const has = id => LANGS.some(l => l.id === id);
function add(id, d) { if (has(id)) DICT[id] = Object.assign(DICT[id] || {}, d); }
// First supported language in a list like navigator.languages ("pt-BR", "zh-CN", "en-US"...), else English.
function detect(list) {
  for (const x of list || []) { const b = String(x || '').toLowerCase().split(/[-_]/)[0]; if (has(b)) return b; }
  return 'en';
}
const tag = id => (LANGS.find(l => l.id === id) || LANGS[0]).tag;
const rules = {};
function form(v, id, n) {
  if (!v || typeof v !== 'object') return v;
  const r = Number.isFinite(+n) ? (rules[id] || (rules[id] = new Intl.PluralRules(tag(id)))).select(+n) : 'other';
  return own(v, r) ? v[r] : v.other;
}
const fill = (s, vars) => vars ? s.replace(/\{(\w+)\}/g, (m, k) => own(vars, k) && vars[k] != null ? String(vars[k]) : m) : s;
function lookup(id, key) {
  if (DICT[id] && own(DICT[id], key)) return DICT[id][key];
  if (DICT.en && own(DICT.en, key)) return DICT.en[key];
  return undefined;
}
function t(id, key, vars) {
  const v = lookup(id, key);
  if (v === undefined) return key;
  return fill(String(form(v, id, vars && vars.n)), vars);
}
// Names the engine knows in English. Translations write body names as they read mid-sentence
// (lowercase except proper names, and German nouns); body() capitalizes the first letter for tables.
function names(id) {
  const P = window.PetCore, L = tag(id);
  const tr = k => { const v = lookup(id, k); return v === undefined ? null : String(v); };
  const cap = s => s.charAt(0).toLocaleUpperCase(L) + s.slice(1);
  return {
    stage: i => tr('stage.' + i) || P.STAGES[i].name,
    body: (i, th) => { const v = tr(`body.${th}.${i}`); return v ? cap(v) : P.stageBody(i, th); },
    bodyLower: (i, th) => tr(`body.${th}.${i}`) || P.stageBody(i, th).toLowerCase(),
    form: k => tr('form.' + k) || P.FORMS[k].name,
    formRule: k => tr('rule.' + k) || P.FORMS[k].rule,
    mut: k => tr('mut.' + k) || P.MUTATIONS[k].name,
    mutRule: k => tr('mrule.' + k) || P.MUTATIONS[k].rule,
    theme: x => tr('theme.' + x) || (P.themes().find(e => e.id === x) || {name: x}).name,
    src: x => tr('src.' + x) || (P.SRC[x] ? P.SRC[x].label : x),
    upper: s => String(s).toLocaleUpperCase(L),
    lower: s => String(s).toLocaleLowerCase(L),
  };
}
// Keys every translation needs for engine names (English comes from the engine itself).
function nameKeys() {
  const P = window.PetCore, k = [];
  P.STAGES.forEach((s, i) => k.push('stage.' + i));
  for (const th of P.themes()) { P.STAGES.forEach((s, i) => k.push(`body.${th.id}.${i}`)); k.push('theme.' + th.id); }
  for (const f in P.FORMS) k.push('form.' + f, 'rule.' + f);
  for (const m in P.MUTATIONS) k.push('mut.' + m, 'mrule.' + m);
  k.push('src.local');
  return k;
}
window.I18n = {LANGS, DICT, add, has, detect, tag, t, names, nameKeys};
})();
