// Locale checks (run by build.ps1):
//  1. en/he have exactly the same keys
//  2. every key used via data-i18n*="..." in HTML or i18n.t('...') in JS exists
//  3. every named placeholder $NAME$ in a message is declared in "placeholders"
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const load = (l) => JSON.parse(fs.readFileSync(path.join(root, '_locales', l, 'messages.json'), 'utf8'));
const en = load('en');
const he = load('he');
const problems = [];
const onlyEn = Object.keys(en).filter((k) => !(k in he));
const onlyHe = Object.keys(he).filter((k) => !(k in en));
if (onlyEn.length) problems.push('only in en: ' + onlyEn.join(', '));
if (onlyHe.length) problems.push('only in he: ' + onlyHe.join(', '));
for (const [lang, m] of [['en', en], ['he', he]]) {
  for (const [k, v] of Object.entries(m)) {
    const declared = Object.keys(v.placeholders || {}).map((x) => x.toLowerCase());
    for (const mm of String(v.message).matchAll(/\$([A-Za-z0-9_@]+)\$/g)) {
      if (!declared.includes(mm[1].toLowerCase())) problems.push(`${lang}:${k} uses $${mm[1]}$ without a placeholder declaration`);
    }
  }
}
const used = new Set();
(function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p);
    else if (/\.(html|js)$/.test(f.name) && f.name !== 'i18n.js' && f.name !== 'update-check.js') {
      const t = fs.readFileSync(p, 'utf8');
      for (const m of t.matchAll(/data-i18n(?:-[a-z]+)?="([\w.\-]+)"/g)) used.add(m[1]);
      for (const m of t.matchAll(/\bi18n\.t\(\s*'([\w.\-]+)'/g)) used.add(m[1]);
    }
  }
})(path.join(root, 'src'));
for (const k of used) if (!(k in en)) problems.push('used but undefined: ' + k);
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(Object.keys(en).length + ' keys en=he; ' + used.size + ' referenced keys defined; placeholders OK');
