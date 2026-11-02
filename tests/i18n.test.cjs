// Every translation covers every English string, with the same placeholders, markup and links.
// English = ui/i18n/en.js + the static text of widget.html (data-i18n*) + engine names (stages, forms, themes...).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const {ROOT} = require('./helpers.cjs');
const UI = path.join(ROOT, 'ui');

global.window = global;
window.PetCore = require(path.join(UI, 'pet-core.js'));
require(path.join(UI, 'i18n.js'));
const I = window.I18n;
const page = fs.readFileSync(path.join(UI, 'widget.html'), 'utf8');
for (const m of page.matchAll(/<script src="i18n\/(\w+)\.js"><\/script>/g)) require(path.join(UI, 'i18n', m[1] + '.js'));

// static keys from the page, with their English
const pageKeys = {};
for (const m of page.matchAll(/data-i18n(-html|-title|-ph|-aria)?="([\w.]+)"/g)) pageKeys[m[2]] = true;
const keys = new Set([...Object.keys(I.DICT.en), ...Object.keys(pageKeys), ...I.nameKeys()]);
const vals = v => v && typeof v === 'object' ? Object.values(v) : [String(v)];
const holes = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
const tags = s => [...s.matchAll(/<\/?(\w+)/g)].map(m => m[0]).sort().join(' ');
const hrefs = s => [...s.matchAll(/href="([^"]*)"/g)].map(m => m[1]).sort().join(' ');
const EXTRA = {'st.next': ['STAGE'], 'st.max': ['STAGE']};  // values a translation may use that English does not

test('every language in the list has a dictionary file and covers every key', () => {
  for (const l of I.LANGS) {
    assert.ok(I.DICT[l.id], `${l.id}: no dictionary`);
    if (l.id === 'en') continue;
    const d = I.DICT[l.id];
    const missing = [...keys].filter(k => !(k in d));
    assert.deepStrictEqual(missing, [], `${l.id}: missing keys`);
    const extra = Object.keys(d).filter(k => !keys.has(k));
    assert.deepStrictEqual(extra, [], `${l.id}: keys English doesn't have`);
  }
});

test('translations keep placeholders, markup and links', () => {
  const html = {};
  for (const m of page.matchAll(/data-i18n-html="([\w.]+)">([\s\S]*?)<\/(span|p)>/g)) html[m[1]] = m[2];
  for (const l of I.LANGS) {
    if (l.id === 'en') continue;
    for (const k of keys) {
      const en = I.DICT.en[k] !== undefined ? vals(I.DICT.en[k]).join(' ') : (html[k] || '');
      const allowed = new Set([...holes(en), ...(EXTRA[k] || [])]);
      for (const v of vals(I.DICT[l.id][k])) {
        for (const h of holes(v)) assert.ok(allowed.has(h), `${l.id} ${k}: unknown placeholder {${h}}`);
        if (en) {
          assert.strictEqual(tags(v), tags(vals(I.DICT.en[k] !== undefined ? I.DICT.en[k] : en)[0]), `${l.id} ${k}: markup differs`);
          assert.strictEqual(hrefs(v), hrefs(en), `${l.id} ${k}: links differ`);
        }
      }
    }
  }
});

test('plural forms pick by the number', () => {
  assert.strictEqual(I.t('ru', 'w.how.peek', {n: 21}), '21 сессия');
  assert.strictEqual(I.t('ru', 'w.how.peek', {n: 3}), '3 сессии');
  assert.strictEqual(I.t('ru', 'w.how.peek', {n: 5}), '5 сессий');
  assert.strictEqual(I.t('en', 'w.how.peek', {n: 1}), '1 session');
  assert.strictEqual(I.t('de', 'nope.key'), 'nope.key');
  assert.strictEqual(I.detect(['pt-BR', 'en']), 'pt');
  assert.strictEqual(I.detect(['fr-FR']), 'en');
});
