const fs = require('fs');
const src = fs
  .readFileSync(__dirname + '/../src/background/background.js', 'utf8')
  .split('\r\n')
  .join('\n');
const consts = src.slice(src.indexOf('const MAX_COLUMNS'), src.indexOf('const TABLE_TOOL'));
const fnStart = src.indexOf('function sanitizeTable');
const fn = src.slice(fnStart, src.indexOf('\n}\n', fnStart) + 3);
const escLine = src.match(/const esc = .*;/)[0];
const { sanitizeTable, esc } = new Function(
  'normalizeTable',
  consts + fn + escLine + '\nreturn { sanitizeTable, esc };'
)((t) => t);

const M = { badTableShape: 'bad' };
const r = sanitizeTable(
  { title: 't'.repeat(500), columns: Array(40).fill('c'), rows: [[1, null, 'x'.repeat(5000)], 'junk'] },
  M
);
if (r.columns.length !== 20 || r.rows.length !== 1 || r.rows[0][2].length !== 1500 || r.title.length !== 200) {
  throw new Error('sanitize failed');
}
let threw = false;
try { sanitizeTable({}, M); } catch { threw = true; }
if (!threw) throw new Error('should reject bad shape');
if (/<\/tab/i.test(esc('x</tab>y')) || /<tab/i.test(esc('<TAB index'))) throw new Error('esc failed');
console.log('hardening tests: all passed');
