const scanBtn = document.getElementById('scan');
const scanLabel = document.getElementById('scanLabel');
const statusEl = document.getElementById('status');
const contextInput = document.getElementById('context');
const openOptions = document.getElementById('openOptions');
const quotaText = document.getElementById('quotaText');
const quotaBadge = document.getElementById('quotaBadge');
const quotaFill = document.getElementById('quotaFill');
const tabChip = document.getElementById('tabChip');
const tabCountEl = document.getElementById('tabCount');
const lastScanEl = document.getElementById('lastScan');
const tabPickerToggle = document.getElementById('tabPickerToggle');
const tabPickerToggleLabel = document.getElementById('tabPickerToggleLabel');
const tabPicker = document.getElementById('tabPicker');
const tabPickerList = document.getElementById('tabPickerList');
const tabPickerCount = document.getElementById('tabPickerCount');
const tabPickerAll = document.getElementById('tabPickerAll');
const tabPickerNone = document.getElementById('tabPickerNone');

let i18n = null;
let allTabs = []; // [{id, title, url, favIconUrl}]
let selectedTabIds = new Set();
let tabsLoaded = false; // guards against a click racing ahead of GET_TAB_LIST — see doScan()

function isScanningNow(isScanning) {
  scanBtn.disabled = isScanning;
  contextInput.disabled = isScanning;
  scanLabel.innerHTML = '';
  if (isScanning) {
    const spinner = document.createElement('span');
    spinner.className = 'spinner';
    scanLabel.appendChild(spinner);
    scanLabel.append(i18n.t('popup_scanning'));
  } else {
    scanLabel.append(i18n.t('popup_scanBtn'));
  }
}

function setStatus(text, kind) {
  statusEl.textContent = text;
  statusEl.className = 'status-msg' + (kind ? ' ' + kind : '');
}

async function init() {
  const { settings, apiKey, lastScanAt, lastTabCount, lastResult } = await chrome.storage.local.get([
    'settings', 'apiKey', 'lastScanAt', 'lastTabCount', 'lastResult',
  ]);

  const theme = settings?.theme || 'system';
  if (theme !== 'system') {
    document.documentElement.setAttribute('data-theme', theme);
  }

  const lang = settings?.uiLang || 'en';
  i18n = await TTT_I18N.load(lang);
  TTT_I18N.applyToDom(i18n, document);
  isScanningNow(false);
  quotaBadge.textContent = i18n.t('popup_quotaLabel');
  quotaText.textContent = i18n.t('popup_quotaFailed');

  if (settings?.defaultContext && !contextInput.value) {
    contextInput.value = settings.defaultContext;
  }

  if (!apiKey) {
    setStatus(i18n.t('popup_noKey'), 'error');
  }

  // Last scan info — DOM methods only (no innerHTML with dynamic data)
  if (lastScanAt && lastResult) {
    const date = new Date(lastScanAt);
    const localeTag = lang === 'he' ? 'he-IL' : 'en-US';
    const timeStr = date.toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString(localeTag, { day: 'numeric', month: 'short' });
    const countStr = String(lastTabCount || '?');

    lastScanEl.hidden = false;
    lastScanEl.textContent = '';

    const prefix = document.createTextNode(
      `${i18n.t('popup_lastScanPrefix')}${dateStr}, ${timeStr} (${countStr} ${i18n.t('popup_lastScanTabsSuffix')}) `
    );
    const viewLink = document.createElement('a');
    viewLink.href = '#';
    viewLink.textContent = i18n.t('popup_lastScanView');
    viewLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: chrome.runtime.getURL('src/results/results.html') });
    });

    lastScanEl.appendChild(prefix);
    lastScanEl.appendChild(viewLink);
  }

  refreshQuota();
  loadTabPicker();
}

async function loadTabPicker() {
  chrome.runtime.sendMessage({ type: 'GET_TAB_LIST' }, (resp) => {
    if (chrome.runtime.lastError || !resp) return;
    allTabs = resp.tabs || [];
    selectedTabIds = new Set(allTabs.map((t) => t.id)); // all selected by default — same behavior as before the picker existed
    tabsLoaded = true;

    tabCountEl.textContent = i18n.t('popup_tabsCount', [String(allTabs.length)]);
    tabChip.style.opacity = '1';

    renderTabPicker();
  });
}

function renderTabPicker() {
  updateTabPickerLabel();
  tabPickerCount.textContent = i18n.t('popup_pickerSelectedCount', [String(selectedTabIds.size), String(allTabs.length)]);

  tabPickerList.innerHTML = '';
  if (allTabs.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'tabpicker-empty';
    empty.textContent = i18n.t('popup_pickerEmpty');
    tabPickerList.appendChild(empty);
    return;
  }

  allTabs.forEach((tab) => {
    const item = document.createElement('label');
    item.className = 'tabpicker-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selectedTabIds.has(tab.id);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selectedTabIds.add(tab.id);
      else selectedTabIds.delete(tab.id);
      updateTabPickerLabel();
      tabPickerCount.textContent = i18n.t('popup_pickerSelectedCount', [String(selectedTabIds.size), String(allTabs.length)]);
    });
    item.appendChild(checkbox);

    if (tab.favIconUrl) {
      const icon = document.createElement('img');
      icon.src = tab.favIconUrl;
      icon.alt = '';
      icon.addEventListener('error', () => icon.remove());
      item.appendChild(icon);
    }

    const label = document.createElement('span');
    label.textContent = tab.title || tab.url;
    label.title = tab.url;
    item.appendChild(label);

    tabPickerList.appendChild(item);
  });
}

function updateTabPickerLabel() {
  tabPickerToggleLabel.textContent = selectedTabIds.size === allTabs.length
    ? i18n.t('popup_pickerToggleAll', [String(allTabs.length)])
    : i18n.t('popup_pickerToggleSome', [String(selectedTabIds.size), String(allTabs.length)]);
}

tabPickerToggle.addEventListener('click', () => {
  const expanded = tabPickerToggle.getAttribute('aria-expanded') === 'true';
  tabPickerToggle.setAttribute('aria-expanded', String(!expanded));
  tabPicker.hidden = expanded;
});

tabPickerAll.addEventListener('click', () => {
  selectedTabIds = new Set(allTabs.map((t) => t.id));
  renderTabPicker();
});

tabPickerNone.addEventListener('click', () => {
  selectedTabIds = new Set();
  renderTabPicker();
});

function refreshQuota() {
  chrome.runtime.sendMessage({ type: 'GET_USAGE' }, (usage) => {
    if (!i18n) return;
    if (chrome.runtime.lastError || !usage || usage.error) {
      quotaText.textContent = i18n.t('popup_quotaFailed');
      return;
    }
    const remaining = Math.max(0, usage.limit - usage.tabsUsed);
    const pct = Math.min(100, Math.round((usage.tabsUsed / usage.limit) * 100));
    quotaText.textContent = i18n.t('popup_quotaRemaining', [String(remaining), String(usage.limit)]);
    quotaFill.style.width = pct + '%';
    quotaFill.classList.toggle('low', remaining <= usage.limit * 0.15);
  });
}

function doScan() {
  chrome.storage.local.get(['apiKey'], ({ apiKey }) => {
    if (!apiKey) {
      setStatus(i18n.t('popup_noKey'), 'error');
      return;
    }
    if (tabsLoaded && selectedTabIds.size === 0) {
      setStatus(i18n.t('popup_pickerNoneSelected'), 'error');
      return;
    }
    // If the tab list hasn't finished loading yet, fall back to the
    // pre-picker behavior (scan every eligible tab) rather than sending an
    // empty selection that would wrongly look like "user unchecked all".
    const tabIds = tabsLoaded ? Array.from(selectedTabIds) : undefined;
    isScanningNow(true);
    setStatus('', '');
    chrome.runtime.sendMessage(
      { type: 'SCAN_TABS', context: contextInput.value.trim(), tabIds },
      (response) => {
        isScanningNow(false);
        if (chrome.runtime.lastError) {
          setStatus(i18n.t('popup_errPrefix') + chrome.runtime.lastError.message, 'error');
          return;
        }
        if (!response || response.error) {
          setStatus(i18n.t('popup_errPrefix') + (response ? response.error : 'unknown'), 'error');
          return;
        }
        setStatus(i18n.t('popup_done'), 'ok');
        refreshQuota();
      }
    );
  });
}

openOptions.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

scanBtn.addEventListener('click', doScan);
contextInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doScan();
});

init();
