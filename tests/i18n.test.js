// node tests/i18n.test.js - regression test for the named-placeholder bug fixed in v0.10.0
// (messages like "$REMAINING$/$LIMIT$ tabs remaining" used to render literally).
const fs = require('fs');
const path = require('path');
const assert = require('assert');
global.chrome = { runtime: { getURL: (p) => path.join(__dirname, '..', p) } };
global.fetch = async (p) => ({ json: async () => JSON.parse(fs.readFileSync(p, 'utf8')) });
global.document = {};
(0, eval)(fs.readFileSync(path.join(__dirname, '..', 'src', 'shared', 'i18n.js'), 'utf8') + ';global.TTT_I18N=TTT_I18N;');
(async () => {
  const en = await TTT_I18N.load('en');
  const he = await TTT_I18N.load('he');
  assert.strictEqual(en.t('popup_quotaRemaining', ['12', '150']), '12/150 tabs remaining this month');
  assert.strictEqual(en.t('options_quotaSummary', [5, 150, 145]), 'Free quota: 5/150 used (145 remaining)');
  assert.strictEqual(he.t('results_rowsFiltered', ['3', '10']), '3/10 שורות');
  assert.strictEqual(en.t('popup_scanBtn'), 'Build table from open tabs');
  assert.strictEqual(en.t('no_such_key'), 'no_such_key');
  for (const lang of [en, he]) for (const k of Object.keys(lang.messages)) {
    const s = lang.t(k, ['A', 'B', 'C']);
    assert(!/\$[A-Z_]+\$/.test(s), `${k} still has an unresolved placeholder: ${s}`);
  }
  console.log('i18n tests: all passed');
})().catch((e) => { console.error(e); process.exit(1); });
