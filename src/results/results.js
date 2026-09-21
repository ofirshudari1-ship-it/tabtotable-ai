const host = document.getElementById('tableHost');
const titleEl = document.getElementById('title');
const metaEl = document.getElementById('meta');
const exportBtn = document.getElementById('exportBtn');
const exportMenu = document.getElementById('exportMenu');
const printBtn = document.getElementById('printBtn');
const historyBtn = document.getElementById('historyBtn');
const historyPanel = document.getElementById('historyPanel');
const searchRow = document.getElementById('searchRow');
const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');
const rowCountEl = document.getElementById('rowCount');
const toast = document.getElementById('toast');
const refineRow = document.getElementById('refineRow');
const refineInput = document.getElementById('refineInput');
const refineBtn = document.getElementById('refineBtn');
const refineStatus = document.getElementById('refineStatus');

let currentResult = null;
let sortState = { col: -1, dir: 1 };
let allRows = [];
let toastTimer = null;
let historyVisible = false;
let isLoadedFromHistory = false;
let i18n = null;
let localeTag = 'en-US';

function tr(key, subs) {
  return i18n ? i18n.t(key, subs) : key;
}

// Toast helper
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
}

// Clipboard helper (fallback for extension pages)
function copyText(text) {
  navigator.clipboard.writeText(text)
    .then(() => showToast(tr('results_copied')))
    .catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      showToast(tr('results_copied'));
    });
}

// Build table DOM from a result object
function renderTable(result) {
  currentResult = result;
  host.innerHTML = '';
  sortState = { col: -1, dir: 1 };
  allRows = result.rows.map((r) => [...r]);

  titleEl.textContent = result.title || tr('results_defaultTitle');

  const table = document.createElement('table');

  // thead — use DOM elements to avoid XSS from Claude-generated column names
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  result.columns.forEach((col, i) => {
    const th = document.createElement('th');
    th.tabIndex = 0;
    th.dataset.col = i;
    th.setAttribute('role', 'button');
    th.setAttribute('aria-sort', 'none');
    th.title = tr('results_sortHint', [col]);

    const icon = document.createElement('i');
    icon.className = 'sort-icon';
    icon.textContent = '↕';
    th.appendChild(icon);
    th.appendChild(document.createTextNode(col));

    const clickSort = () => sortBy(i, table);
    th.addEventListener('click', clickSort);
    th.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clickSort(); }
    });
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  // tbody
  const tbody = document.createElement('tbody');
  buildBodyRows(tbody, allRows);
  table.appendChild(tbody);

  const tableWrap = document.createElement('div');
  tableWrap.className = 'table-wrap';
  tableWrap.appendChild(table);
  host.appendChild(tableWrap);

  // Show search bar
  searchRow.hidden = false;
  updateRowCount(allRows.length, allRows.length);

  exportBtn.disabled = false;

  refineRow.hidden = false;
}

function buildBodyRows(tbody, rows) {
  tbody.innerHTML = '';
  rows.forEach((row) => {
    const tr_ = document.createElement('tr');
    row.forEach((cell) => {
      const td = document.createElement('td');
      const text = String(cell ?? '');

      if (/^https?:\/\//.test(text.trim())) {
        // URL cell: link + copy button
        const wrap = document.createElement('div');
        wrap.className = 'link-cell';

        const a = document.createElement('a');
        a.href = text.trim();
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = 'link';
        a.textContent = text.trim();
        wrap.appendChild(a);

        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-url';
        copyBtn.title = tr('results_copyUrl');
        copyBtn.textContent = '⎘';
        copyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          copyText(text.trim());
        });
        wrap.appendChild(copyBtn);

        td.appendChild(wrap);
      } else {
        td.textContent = text;
        td.className = 'copyable';
        td.title = tr('results_copyCell');
        // Keyboard-reachable, not just mouse: a plain <td> has no built-in
        // focus/activation, so a keyboard-only user could click every
        // sortable header but never copy a cell without these three lines.
        td.tabIndex = 0;
        td.setAttribute('role', 'button');
        const activate = () => copyText(text);
        td.addEventListener('click', activate);
        td.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
        });
      }
      tr_.appendChild(td);
    });
    tbody.appendChild(tr_);
  });
}

function sortBy(colIndex, table) {
  const tbody = table.querySelector('tbody');
  if (sortState.col === colIndex) {
    sortState.dir *= -1;
  } else {
    sortState.col = colIndex;
    sortState.dir = 1;
  }

  const collator = new Intl.Collator(i18n?.lang === 'he' ? 'he' : 'en');
  const sorted = [...allRows].sort((a, b) => {
    const av = String(a[colIndex] ?? '').toLowerCase();
    const bv = String(b[colIndex] ?? '').toLowerCase();
    const parseNum = (v) => parseFloat(v.replace(/[^\d.]/g, ''));
    const an = parseNum(av), bn = parseNum(bv);
    if (!isNaN(an) && !isNaN(bn)) return sortState.dir * (an - bn);
    return sortState.dir * collator.compare(av, bv);
  });

  buildBodyRows(tbody, sorted);
  applySearch(searchInput.value);

  // Update header sort icons + aria-sort (screen-reader affordance)
  table.querySelectorAll('thead th').forEach((th, i) => {
    th.classList.remove('sort-asc', 'sort-desc');
    const icon = th.querySelector('.sort-icon');
    if (!icon) return;
    if (i === colIndex) {
      th.classList.add(sortState.dir === 1 ? 'sort-asc' : 'sort-desc');
      icon.textContent = sortState.dir === 1 ? '↑' : '↓';
      th.setAttribute('aria-sort', sortState.dir === 1 ? 'ascending' : 'descending');
    } else {
      icon.textContent = '↕';
      th.setAttribute('aria-sort', 'none');
    }
  });
}

function applySearch(query) {
  const q = query.trim().toLowerCase();
  const tbody = host.querySelector('tbody');
  const dataRows = tbody ? Array.from(tbody.querySelectorAll('tr:not(.no-matches-row)')) : [];
  let visible = 0;
  dataRows.forEach((tr_) => {
    const matches = !q || Array.from(tr_.querySelectorAll('td')).some((td) =>
      td.textContent.toLowerCase().includes(q)
    );
    tr_.classList.toggle('hidden-row', !matches);
    if (matches) visible++;
  });
  updateRowCount(visible, dataRows.length);
  clearSearch.hidden = !q;
  toggleNoMatchesRow(tbody, q && visible === 0 && dataRows.length > 0);
}

// Inline "no rows match" row shown INSIDE the table (spans every column) so
// the table frame stays visible and the message sits where the missing rows
// would be, instead of the whole table area collapsing to nothing.
function toggleNoMatchesRow(tbody, show) {
  if (!tbody) return;
  let row = tbody.querySelector('.no-matches-row');
  if (!show) {
    if (row) row.remove();
    return;
  }
  if (row) return;
  const colCount = currentResult?.columns?.length || 1;
  row = document.createElement('tr');
  row.className = 'no-matches-row';
  const td = document.createElement('td');
  td.colSpan = colCount;
  td.textContent = tr('results_noMatches');
  row.appendChild(td);
  tbody.appendChild(row);
}

function updateRowCount(visible, total) {
  rowCountEl.textContent = visible === total
    ? tr('results_rowsAll', [String(total)])
    : tr('results_rowsFiltered', [String(visible), String(total)]);
}

searchInput.addEventListener('input', () => applySearch(searchInput.value));

clearSearch.addEventListener('click', () => {
  searchInput.value = '';
  applySearch('');
  searchInput.focus();
});

// Keyboard shortcuts: Ctrl+F → focus search, Escape → clear search
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    if (searchRow.hidden) return;
    e.preventDefault();
    searchInput.focus();
    searchInput.select();
  }
  if (e.key === 'Escape' && document.activeElement === searchInput) {
    searchInput.value = '';
    applySearch('');
  }
});

// CSV export
function buildCsv(result) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [
    result.columns.map(escape).join(','),
    ...result.rows.map((r) => r.map(escape).join(',')),
  ];
  return '﻿' + lines.join('\r\n');
}

function downloadFile(content, mime, extension) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(currentResult.title || 'tabtotable').replace(/[^\w֐-׿\-]+/g, '_')}.${extension}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Markdown export (copy to clipboard — handy for pasting straight into docs/chat)
function buildMarkdown(result) {
  const sep = result.columns.map(() => '---').join(' | ');
  const lines = [
    `# ${result.title || 'TabToTable'}`,
    '',
    '| ' + result.columns.join(' | ') + ' |',
    '| ' + sep + ' |',
    ...result.rows.map((r) => '| ' + r.map((c) => String(c ?? '').replace(/\|/g, '\\|')).join(' | ') + ' |'),
  ];
  return lines.join('\n');
}

// JSON export (download) — the raw {title, columns, rows} shape, useful for
// piping into another tool/script rather than reading by eye.
function buildJson(result) {
  return JSON.stringify({ title: result.title, columns: result.columns, rows: result.rows }, null, 2);
}

// Export dropdown: CSV + JSON download a file, Markdown copies to the
// clipboard (kept as copy since that's the common way people reuse a
// markdown table — pasting into a doc/chat rather than opening a .md file).
function closeExportMenu() {
  exportMenu.hidden = true;
  exportBtn.setAttribute('aria-expanded', 'false');
}

exportBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = !exportMenu.hidden;
  if (isOpen) {
    closeExportMenu();
  } else {
    exportMenu.hidden = false;
    exportBtn.setAttribute('aria-expanded', 'true');
  }
});

exportMenu.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-format]');
  if (!btn || !currentResult) return;
  const format = btn.dataset.format;
  if (format === 'csv') {
    downloadFile(buildCsv(currentResult), 'text/csv', 'csv');
    // CSV was the one export path with zero feedback — JSON and Markdown
    // both toast on success, CSV silently did nothing visible.
    showToast(tr('results_csvDownloaded'));
  } else if (format === 'json') {
    downloadFile(buildJson(currentResult), 'application/json', 'json');
    showToast(tr('results_jsonCopied'));
  } else if (format === 'md') {
    copyText(buildMarkdown(currentResult));
    showToast(tr('results_mdCopied'));
  }
  closeExportMenu();
});

document.addEventListener('click', (e) => {
  if (!exportMenu.hidden && !e.target.closest('.dropdown')) closeExportMenu();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !exportMenu.hidden) {
    closeExportMenu();
    exportBtn.focus();
  }
});

// Print
printBtn.addEventListener('click', () => window.print());

// Follow-up refine: ask Claude to adjust the just-built table (add/remove a
// column, filter rows, re-sort, add an analysis column, ...) without
// rebuilding from scratch. One explicit user-initiated API call per click —
// disabled while in flight so a double-click can't fire it twice.
let refining = false;

function setRefineStatus(text, kind) {
  refineStatus.textContent = text;
  refineStatus.className = 'refine-status' + (kind ? ' ' + kind : '');
}

const refineBtnLabel = refineBtn.textContent;

// Same spinner-in-button pattern as the popup's scan button, instead of a
// dimmed table being the only sign that something is happening.
function setRefiningNow(isRefining) {
  refineBtn.innerHTML = '';
  if (isRefining) {
    const spinner = document.createElement('span');
    spinner.className = 'spinner';
    refineBtn.appendChild(spinner);
    refineBtn.append(tr('results_refining'));
  } else {
    refineBtn.append(refineBtnLabel);
  }
}

function doRefine() {
  if (refining) return;
  const instruction = refineInput.value.trim();
  if (!instruction) {
    setRefineStatus(tr('results_refineEmpty'), 'error');
    return;
  }
  if (!currentResult) return;

  refining = true;
  refineBtn.disabled = true;
  refineInput.disabled = true;
  setRefiningNow(true);
  const tableWrap = host.querySelector('.table-wrap');
  if (tableWrap) tableWrap.classList.add('busy');
  setRefineStatus(tr('results_refining'), '');

  chrome.runtime.sendMessage({ type: 'REFINE_TABLE', instruction }, (response) => {
    refining = false;
    refineBtn.disabled = false;
    refineInput.disabled = false;
    setRefiningNow(false);
    if (tableWrap) tableWrap.classList.remove('busy');

    if (chrome.runtime.lastError) {
      setRefineStatus(tr('popup_errPrefix') + chrome.runtime.lastError.message, 'error');
      return;
    }
    if (!response || response.error) {
      setRefineStatus(tr('popup_errPrefix') + (response ? response.error : 'unknown'), 'error');
      return;
    }

    renderTable(response.table);
    const when = new Date().toLocaleString(localeTag);
    metaEl.textContent = `${tr('results_builtFrom', [String(response.table.rows.length)])} · ${when} · "${instruction}"`;
    refineInput.value = '';
    setRefineStatus(tr('results_refineDone'), 'ok');
    window.scrollTo(0, 0);
  });
}

refineBtn.addEventListener('click', doRefine);
refineInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doRefine();
});

// History panel
historyBtn.addEventListener('click', () => {
  historyVisible = !historyVisible;
  if (historyVisible) {
    renderHistory();
    historyPanel.hidden = false;
    historyBtn.textContent = tr('results_historyClose');
  } else {
    historyPanel.hidden = true;
    historyBtn.textContent = tr('results_history');
  }
});

function renderHistory() {
  historyPanel.innerHTML = '';

  const hdr = document.createElement('div');
  hdr.className = 'history-header';

  const h3 = document.createElement('h3');
  h3.textContent = tr('results_historyTitle');
  hdr.appendChild(h3);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'history-close';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', () => {
    historyPanel.hidden = true;
    historyVisible = false;
    historyBtn.textContent = tr('results_history');
  });
  hdr.appendChild(closeBtn);
  historyPanel.appendChild(hdr);

  chrome.runtime.sendMessage({ type: 'GET_HISTORY' }, (resp) => {
    if (chrome.runtime.lastError) return;
    const items = resp?.history || [];
    const list = document.createElement('div');
    list.className = 'history-list';

    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'history-empty';
      empty.textContent = tr('results_histEmpty');
      list.appendChild(empty);
    } else {
      items.forEach((item, idx) => {
        const div = document.createElement('div');
        div.className = 'history-item' + (idx === 0 && !isLoadedFromHistory ? ' active' : '');
        // Keyboard-reachable like every other row action here — a plain
        // click handler on a <div> is invisible to Tab/Enter.
        div.tabIndex = 0;
        div.setAttribute('role', 'button');

        const date = new Date(item.scanAt);
        const dateStr = date.toLocaleDateString(localeTag, { day: 'numeric', month: 'short' });
        const timeStr = date.toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit' });

        const titleSpan = document.createElement('span');
        titleSpan.className = 'history-item-title';
        titleSpan.textContent = item.title;

        const metaSpan = document.createElement('span');
        metaSpan.className = 'history-item-meta';
        metaSpan.textContent = `${dateStr} ${timeStr} · ${item.tabCount} ${tr('popup_lastScanTabsSuffix')}`;

        div.appendChild(titleSpan);
        div.appendChild(metaSpan);
        const activate = () => {
          document.querySelectorAll('.history-item').forEach((d) => d.classList.remove('active'));
          div.classList.add('active');
          loadHistoryEntry(item);
        };
        div.addEventListener('click', activate);
        div.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
        });
        list.appendChild(div);
      });
    }

    historyPanel.appendChild(list);
  });
}

function loadHistoryEntry(item) {
  isLoadedFromHistory = true;
  renderTable(item.table);
  const date = new Date(item.scanAt);
  let meta = `${tr('results_builtFrom', [String(item.tabCount)])} · ${date.toLocaleString(localeTag)}`;
  if (item.context) meta += ` · "${item.context}"`;
  if (item.model) meta += ` · ${item.model.includes('haiku') ? 'Haiku' : 'Sonnet'}`;
  metaEl.textContent = meta;
  window.scrollTo(0, 0);
}

async function init() {
  const { settings, lastResult, lastScanAt, lastTabCount, lastContext, lastModel } = await chrome.storage.local.get([
    'settings', 'lastResult', 'lastScanAt', 'lastTabCount', 'lastContext', 'lastModel',
  ]);

  const theme = settings?.theme || 'system';
  if (theme !== 'system') {
    document.documentElement.setAttribute('data-theme', theme);
  }
  const fontSize = settings?.fontSize || 'medium';
  if (fontSize !== 'medium') {
    document.documentElement.setAttribute('data-fontsize', fontSize);
  }

  const lang = settings?.uiLang || 'en';
  localeTag = lang === 'he' ? 'he-IL' : 'en-US';
  i18n = await TTT_I18N.load(lang);
  // Applies every data-i18n / data-i18n-title / data-i18n-placeholder element,
  // including the title/buttons/search placeholder that used to be hardcoded
  // Hebrew strings in results.html — this is now the single source of truth
  // for their text regardless of which language is active.
  TTT_I18N.applyToDom(i18n, document);

  if (!lastResult || !lastResult.columns || !lastResult.rows) {
    host.innerHTML = '';
    const empty = document.createElement('div');
    empty.id = 'empty';

    const icon = document.createElement('span');
    icon.className = 'empty-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '📊';
    empty.appendChild(icon);

    const text = document.createElement('span');
    text.className = 'empty-text';
    text.textContent = tr('results_empty');
    empty.appendChild(text);

    host.appendChild(empty);
    exportBtn.disabled = true;
    return;
  }

  renderTable(lastResult);

  const when = lastScanAt ? new Date(lastScanAt).toLocaleString(localeTag) : '';
  const modelLabel = lastModel ? (lastModel.includes('haiku') ? ' · Haiku' : ' · Sonnet') : '';
  let metaText = `${tr('results_builtFrom', [String(lastTabCount || lastResult.rows.length)])} · ${when}${modelLabel}`;
  if (lastContext) metaText += ` · "${lastContext}"`;
  metaEl.textContent = metaText;
}

init();
