const apiKeyInput = document.getElementById('apiKey');
const savedEl = document.getElementById('saved');
const quotaSummary = document.getElementById('quotaSummary');
const maxTabsInput = document.getElementById('maxTabs');
const maxTabsVal = document.getElementById('maxTabsVal');
const keyStatus = document.getElementById('keyStatus');
const dangerFeedback = document.getElementById('dangerFeedback');
const defaultContextInput = document.getElementById('defaultContext');

let currentSettings = {
  model: 'claude-sonnet-5',
  language: 'auto',
  uiLang: 'en',
  maxTabs: 40,
  theme: 'system',
  defaultContext: '',
  fontSize: 'medium',
  contentDepth: 'standard',
};

let i18n = null;
let dangerTimer = null;

// Apply theme to document root
function applyTheme(theme) {
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

async function applyUiLang(lang) {
  i18n = await TTT_I18N.load(lang);
  TTT_I18N.applyToDom(i18n, document);
  refreshQuotaText();
}

// Show inline feedback in the danger zone
function showDangerFeedback(msg) {
  dangerFeedback.textContent = msg;
  clearTimeout(dangerTimer);
  dangerTimer = setTimeout(() => { dangerFeedback.textContent = ''; }, 3000);
}

let lastUsage = null;
function refreshQuotaText() {
  if (!i18n || !lastUsage) return;
  const remaining = Math.max(0, lastUsage.limit - lastUsage.tabsUsed);
  quotaSummary.textContent = i18n.t('options_quotaSummary', [String(lastUsage.tabsUsed), String(lastUsage.limit), String(remaining)]);
}

// Load saved data
chrome.storage.local.get(['apiKey', 'settings', 'firstRun'], async ({ apiKey, settings, firstRun }) => {
  if (apiKey) apiKeyInput.value = apiKey;
  if (settings) currentSettings = { ...currentSettings, ...settings };

  await applyUiLang(currentSettings.uiLang);

  // First-run only: point straight at the one required step and clear the
  // flag so it never shows again once the key is set up.
  if (firstRun) {
    document.getElementById('onboardBanner').hidden = false;
    chrome.storage.local.remove('firstRun');
    apiKeyInput.focus();
  }

  document.querySelectorAll('.model-card').forEach((card) => {
    const selected = card.dataset.model === currentSettings.model;
    card.classList.toggle('selected', selected);
    card.setAttribute('aria-checked', String(selected));
  });

  const langRadio = document.querySelector(`input[name="lang"][value="${currentSettings.language}"]`);
  if (langRadio) langRadio.checked = true;

  maxTabsInput.value = currentSettings.maxTabs;
  maxTabsVal.textContent = currentSettings.maxTabs;

  const themeRadio = document.querySelector(`input[name="theme"][value="${currentSettings.theme}"]`);
  if (themeRadio) themeRadio.checked = true;
  applyTheme(currentSettings.theme);

  const uiLangRadio = document.querySelector(`input[name="uiLang"][value="${currentSettings.uiLang || 'en'}"]`);
  if (uiLangRadio) uiLangRadio.checked = true;

  if (defaultContextInput) defaultContextInput.value = currentSettings.defaultContext || '';

  const fsRadio = document.querySelector(`input[name="fontSize"][value="${currentSettings.fontSize || 'medium'}"]`);
  if (fsRadio) fsRadio.checked = true;

  const depthRadio = document.querySelector(`input[name="contentDepth"][value="${currentSettings.contentDepth || 'standard'}"]`);
  if (depthRadio) depthRadio.checked = true;
});

// Load quota
chrome.runtime.sendMessage({ type: 'GET_USAGE' }, (usage) => {
  if (chrome.runtime.lastError || !usage || usage.error) return;
  lastUsage = usage;
  refreshQuotaText();
});

// Show/hide API key toggle
document.getElementById('toggleVis').addEventListener('click', () => {
  const isPassword = apiKeyInput.type === 'password';
  apiKeyInput.type = isPassword ? 'text' : 'password';
  document.getElementById('toggleVis').textContent = isPassword ? '🙈' : '👁';
});

// Validate API key format
function validateKeyFormat(key) {
  if (!key) return { ok: false, msg: i18n?.t('options_keyEmpty') };
  if (!key.startsWith('sk-ant-')) return { ok: false, msg: i18n?.t('options_keyBadFormat') };
  if (key.length < 40) return { ok: false, msg: i18n?.t('options_keyTooShort') };
  return { ok: true };
}

// Save API key
document.getElementById('save').addEventListener('click', () => {
  const value = apiKeyInput.value.trim();
  const validation = validateKeyFormat(value);
  if (!validation.ok) {
    keyStatus.textContent = validation.msg;
    keyStatus.className = 'key-status error';
    return;
  }
  chrome.storage.local.set({ apiKey: value }, () => {
    savedEl.classList.add('show');
    setTimeout(() => savedEl.classList.remove('show'), 2000);
    keyStatus.textContent = '';
  });
});

// Test API key
document.getElementById('testKey').addEventListener('click', () => {
  const value = apiKeyInput.value.trim();
  const validation = validateKeyFormat(value);
  if (!validation.ok) {
    keyStatus.textContent = validation.msg;
    keyStatus.className = 'key-status error';
    return;
  }
  keyStatus.textContent = i18n?.t('options_testing');
  keyStatus.className = 'key-status testing';
  chrome.runtime.sendMessage({ type: 'TEST_API_KEY', apiKey: value }, (resp) => {
    if (chrome.runtime.lastError || !resp) {
      keyStatus.textContent = i18n?.t('options_testErrPrefix') + 'internal error';
      keyStatus.className = 'key-status error';
      return;
    }
    if (resp.error) {
      keyStatus.textContent = i18n?.t('options_testErrPrefix') + resp.error;
      keyStatus.className = 'key-status error';
    } else {
      keyStatus.textContent = i18n?.t('options_testOk') + (resp.note ? ` (${resp.note})` : '');
      keyStatus.className = 'key-status ok';
    }
  });
});

// Model cards
function selectModelCard(card) {
  document.querySelectorAll('.model-card').forEach((c) => {
    c.classList.remove('selected');
    c.setAttribute('aria-checked', 'false');
  });
  card.classList.add('selected');
  card.setAttribute('aria-checked', 'true');
  currentSettings.model = card.dataset.model;
  saveSettings();
}
document.querySelectorAll('.model-card').forEach((card) => {
  card.addEventListener('click', () => selectModelCard(card));
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectModelCard(card); }
  });
});

// Table output language
document.querySelectorAll('input[name="lang"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    currentSettings.language = radio.value;
    saveSettings();
  });
});

// Max tabs slider
maxTabsInput.addEventListener('input', () => {
  maxTabsVal.textContent = maxTabsInput.value;
  currentSettings.maxTabs = parseInt(maxTabsInput.value, 10);
  saveSettings();
});

// Theme
document.querySelectorAll('input[name="theme"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    currentSettings.theme = radio.value;
    applyTheme(radio.value);
    saveSettings();
  });
});

// UI Language
document.querySelectorAll('input[name="uiLang"]').forEach((radio) => {
  radio.addEventListener('change', async () => {
    currentSettings.uiLang = radio.value;
    saveSettings();
    await applyUiLang(radio.value);
  });
});

// Default context
if (defaultContextInput) {
  defaultContextInput.addEventListener('input', () => {
    currentSettings.defaultContext = defaultContextInput.value;
    saveSettings();
  });
}

// Font size
document.querySelectorAll('input[name="fontSize"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    currentSettings.fontSize = radio.value;
    saveSettings();
  });
});

// Content depth (how much of each page's text is sent to Claude per tab)
document.querySelectorAll('input[name="contentDepth"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    currentSettings.contentDepth = radio.value;
    saveSettings();
  });
});

// Keyboard shortcut — Chrome only exposes the shortcuts editor at its own
// dedicated internal page; there's no API to open or edit it from an
// extension page directly.
const openShortcutsLink = document.getElementById('openShortcuts');
if (openShortcutsLink) {
  openShortcutsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });
}

function saveSettings() {
  chrome.storage.local.set({ settings: currentSettings });
}

// Danger zone — all using inline feedback instead of alert/confirm dialogs
document.getElementById('resetQuota').addEventListener('click', () => {
  if (!confirm(i18n?.t('options_resetQuotaConfirm'))) return;
  const yearMonth = new Date().toISOString().slice(0, 7);
  chrome.storage.local.set({ usage: { yearMonth, tabsUsed: 0 } }, () => {
    lastUsage = { tabsUsed: 0, limit: lastUsage?.limit || 150 };
    refreshQuotaText();
    showDangerFeedback(i18n?.t('options_resetQuotaDone'));
  });
});

document.getElementById('clearHistory').addEventListener('click', () => {
  if (!confirm(i18n?.t('options_clearHistoryConfirm'))) return;
  chrome.runtime.sendMessage({ type: 'CLEAR_HISTORY' }, (resp) => {
    if (chrome.runtime.lastError || !resp) {
      showDangerFeedback(i18n?.t('options_clearHistoryErr'));
      return;
    }
    showDangerFeedback(i18n?.t('options_clearHistoryDone'));
  });
});

document.getElementById('clearAll').addEventListener('click', () => {
  if (!confirm(i18n?.t('options_clearAllConfirm'))) return;
  chrome.storage.local.clear(() => {
    apiKeyInput.value = '';
    quotaSummary.textContent = '';
    keyStatus.textContent = '';
    currentSettings = { model: 'claude-sonnet-5', language: 'auto', uiLang: 'en', maxTabs: 40, theme: 'system', defaultContext: '', fontSize: 'medium', contentDepth: 'standard' };
    document.querySelectorAll('input[name="contentDepth"]').forEach((r) => { r.checked = r.value === 'standard'; });
    showDangerFeedback(i18n?.t('options_clearAllDone'));
  });
});
