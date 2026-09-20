const DEFAULT_MODEL = 'claude-sonnet-5';
const DEFAULT_MAX_TABS = 40;
const MAX_BODY_CHARS = 4000; // fallback when settings.contentDepth is missing/unrecognized
const FREE_MONTHLY_TAB_LIMIT = 150;
const MAX_HISTORY = 5;
const REQUEST_TIMEOUT_MS = 60000; // main table-build/refine calls — long enough for large tab batches
const TEST_TIMEOUT_MS = 15000; // key-test call is a 5-token ping, should fail fast

// How much of each page is read before comparing. "Concise" keeps prompts
// small (faster, cheaper, safer against context limits on a big tab batch);
// "Thorough" reads much more per page for a handful of tabs where nuance
// matters more than speed. Headings scale with it too since a longer page
// tends to have more structure worth surfacing.
const CONTENT_DEPTH = {
  concise: { maxChars: 2000, headings: 6 },
  standard: { maxChars: 4000, headings: 12 },
  thorough: { maxChars: 8000, headings: 20 },
};
function contentDepthOf(settings) {
  return CONTENT_DEPTH[settings?.contentDepth] || CONTENT_DEPTH.standard;
}

const DEFAULT_SETTINGS = {
  model: 'claude-sonnet-5',
  language: 'auto',
  uiLang: 'en',
  maxTabs: 40,
  theme: 'system',
  defaultContext: '',
  fontSize: 'medium',
  contentDepth: 'standard',
};

// User-facing error strings, bilingual (mirrors _locales/*/messages.json keys
// where they overlap; background.js runs with no DOM/fetch access to those
// JSON files being convenient mid-async-chain, so a small local dictionary
// keeps error construction simple).
const MSG = {
  en: {
    noApiKey: 'No API key set. Go to the extension settings.',
    noEligibleTabs: 'No eligible tabs found in this window.',
    tooManyTabs: (n, max) => `${n} tabs open — above the limit of ${max}. Close some and try again.`,
    quotaExceeded: (limit) => `You have used your free monthly quota of ${limit} tabs.`,
    quotaTooLow: (remaining, limit) => `You have ${remaining} tabs left in your quota (of ${limit}). Close some tabs and try again.`,
    pageEmpty: 'empty',
    pageProtected: 'Could not scan this page (protected page)',
    pageErrorPrefix: 'Error: ',
    contentDesc: 'Description: ',
    contentHeadings: 'Headings: ',
    contentBody: 'Content: ',
    contextGiven: (ctx) => `User-provided research context: "${ctx}"`,
    contextMissing: 'The user did not specify a context — infer what the pages have in common and what is worth comparing.',
    networkErr: 'Could not connect to the Anthropic API. Check your internet connection.',
    invalidKey: 'Invalid API key. Check it in settings.',
    rateLimited: 'Anthropic rate limit reached. Try again in a moment.',
    apiErrorPrefix: (status) => `Error from Anthropic API (${status}): `,
    truncated: 'The response was cut off — try with fewer tabs.',
    unparsable: 'Could not parse the model response as a table.',
    badJson: 'The model response was not valid JSON.',
    badTableShape: 'The returned table structure is invalid.',
    testBadFormat: 'Invalid key format — must start with sk-ant-',
    testInvalidKey: 'Invalid key (401).',
    testRateLimited: 'Valid key (rate limit currently active).',
    testHttpError: (status) => `Error ${status}`,
    testNetworkErr: 'Could not connect to Anthropic. Check your internet connection.',
    timeoutErr: 'The request to Anthropic timed out. Try again, or use fewer tabs.',
    noTabsSelected: 'No tabs selected. Pick at least one tab to compare.',
    noTableToRefine: 'No table to refine yet — build one first.',
    noRefineInstruction: 'Type what you want to change in the table.',
  },
  he: {
    noApiKey: 'לא הוגדר מפתח API. עבור להגדרות התוסף.',
    noEligibleTabs: 'לא נמצאו לשוניות מתאימות לסריקה בחלון הזה.',
    tooManyTabs: (n, max) => `יש ${n} לשוניות פתוחות — מעל המגבלה של ${max}. סגור כמה ונסה שוב.`,
    quotaExceeded: (limit) => `עברת את מכסת הלשוניות החינמית החודשית (${limit}).`,
    quotaTooLow: (remaining, limit) => `נותרו לך ${remaining} לשוניות במכסה (מתוך ${limit}). סגור כמה לשוניות ונסה שוב.`,
    pageEmpty: 'ריק',
    pageProtected: 'לא ניתן לסרוק דף זה (דף מוגן)',
    pageErrorPrefix: 'שגיאה: ',
    contentDesc: 'תיאור: ',
    contentHeadings: 'כותרות: ',
    contentBody: 'תוכן: ',
    contextGiven: (ctx) => `הקשר המחקר שסיפק המשתמש: "${ctx}"`,
    contextMissing: 'המשתמש לא ציין הקשר — הסק בעצמך מה משותף לדפים ומה כדאי להשוות.',
    networkErr: 'לא ניתן להתחבר ל-Anthropic API. בדוק חיבור אינטרנט.',
    invalidKey: 'מפתח API לא תקין. בדוק בהגדרות.',
    rateLimited: 'חריגה ממכסת Anthropic (rate limit). נסה שוב בעוד רגע.',
    apiErrorPrefix: (status) => `שגיאה מ-Anthropic API (${status}): `,
    truncated: 'התשובה נחתכה — נסה עם פחות לשוניות.',
    unparsable: 'לא ניתן לפרש את תשובת המודל כטבלה.',
    badJson: 'תשובת המודל לא הייתה JSON תקין.',
    badTableShape: 'מבנה הטבלה שהוחזר לא תקין.',
    testBadFormat: 'פורמט מפתח לא תקין — צריך להתחיל ב-sk-ant-',
    testInvalidKey: 'מפתח לא תקין (401).',
    testRateLimited: 'מפתח תקין (rate limit פעיל).',
    testHttpError: (status) => `שגיאה ${status}`,
    testNetworkErr: 'לא ניתן להתחבר ל-Anthropic. בדוק חיבור אינטרנט.',
    timeoutErr: 'הבקשה ל-Anthropic נתקעה (timeout). נסה שוב, או עם פחות לשוניות.',
    noTabsSelected: 'לא נבחרו לשוניות. בחר לפחות לשונית אחת להשוואה.',
    noTableToRefine: 'אין עדיין טבלה לעדכן — בנה טבלה קודם.',
    noRefineInstruction: 'כתוב מה לשנות בטבלה.',
  },
};
function m(lang) {
  return MSG[lang === 'he' ? 'he' : 'en'];
}

// On first install: open options page if no API key is set
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    const { apiKey } = await chrome.storage.local.get(['apiKey']);
    if (!apiKey) {
      chrome.runtime.openOptionsPage();
    }
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SCAN_TABS') {
    scanAndBuildTable(msg.context || '', msg.tabIds)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }
  if (msg.type === 'REFINE_TABLE') {
    handleRefine(msg.instruction || '')
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }
  if (msg.type === 'GET_USAGE') {
    getUsage()
      .then((usage) => sendResponse({ ...usage, limit: FREE_MONTHLY_TAB_LIMIT }))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }
  if (msg.type === 'GET_TAB_COUNT') {
    getEligibleTabCount()
      .then((count) => sendResponse({ count }))
      .catch(() => sendResponse({ count: 0 }));
    return true;
  }
  if (msg.type === 'GET_TAB_LIST') {
    getEligibleTabs()
      .then((tabs) => sendResponse({ tabs }))
      .catch(() => sendResponse({ tabs: [] }));
    return true;
  }
  if (msg.type === 'GET_HISTORY') {
    chrome.storage.local.get(['scanHistory'], ({ scanHistory }) => {
      sendResponse({ history: scanHistory || [] });
    });
    return true;
  }
  if (msg.type === 'CLEAR_HISTORY') {
    chrome.storage.local.set({ scanHistory: [] }, () => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === 'GET_SETTINGS') {
    chrome.storage.local.get(['settings'], ({ settings }) => {
      sendResponse({ settings: settings || {} });
    });
    return true;
  }
  if (msg.type === 'TEST_API_KEY') {
    chrome.storage.local.get(['settings'], ({ settings }) => {
      testApiKey(msg.apiKey, settings?.uiLang ?? DEFAULT_SETTINGS.uiLang)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ error: err.message }));
    });
    return true;
  }
});

function currentYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function getUsage() {
  const { usage } = await chrome.storage.local.get(['usage']);
  const yearMonth = currentYearMonth();
  if (!usage || usage.yearMonth !== yearMonth) {
    const fresh = { yearMonth, tabsUsed: 0 };
    await chrome.storage.local.set({ usage: fresh });
    return fresh;
  }
  return usage;
}

async function addUsage(tabsScanned) {
  const usage = await getUsage();
  usage.tabsUsed += tabsScanned;
  await chrome.storage.local.set({ usage });
  return usage;
}

async function getEligibleTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  return tabs
    .filter((t) => t.url && /^https?:\/\//.test(t.url))
    .map((t) => ({ id: t.id, title: t.title || t.url, url: t.url, favIconUrl: t.favIconUrl || '' }));
}

async function getEligibleTabCount() {
  return (await getEligibleTabs()).length;
}

async function saveToHistory(entry) {
  const { scanHistory } = await chrome.storage.local.get(['scanHistory']);
  const history = scanHistory || [];
  history.unshift(entry);
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  await chrome.storage.local.set({ scanHistory: history });
}

// Normalize rows: ensure each row has exactly `colCount` cells
function normalizeTable(parsed) {
  const colCount = parsed.columns.length;
  parsed.rows = parsed.rows.map((row) => {
    if (row.length === colCount) return row;
    const normalized = row.slice(0, colCount);
    while (normalized.length < colCount) normalized.push('');
    return normalized;
  });
  return parsed;
}

async function scanAndBuildTable(context, tabIds) {
  const { apiKey, settings } = await chrome.storage.local.get(['apiKey', 'settings']);
  const uiLang = settings?.uiLang ?? DEFAULT_SETTINGS.uiLang;
  const M = m(uiLang);
  if (!apiKey) throw new Error(M.noApiKey);

  const model = settings?.model ?? DEFAULT_MODEL;
  const maxTabs = settings?.maxTabs != null ? settings.maxTabs : DEFAULT_MAX_TABS;
  const language = settings?.language ?? 'auto';
  const depth = contentDepthOf(settings);

  const tabs = await chrome.tabs.query({ currentWindow: true });
  let eligible = tabs.filter((t) => t.url && /^https?:\/\//.test(t.url));

  // A caller (the popup's tab picker) may pass an explicit subset of tab ids
  // instead of always scanning every open tab — Array.isArray guards against
  // an omitted argument (undefined) meaning "use all", vs. an explicit empty
  // array meaning "the user unchecked everything".
  if (Array.isArray(tabIds)) {
    if (tabIds.length === 0) throw new Error(M.noTabsSelected);
    const idSet = new Set(tabIds);
    eligible = eligible.filter((t) => idSet.has(t.id));
  }

  if (eligible.length === 0) {
    throw new Error(M.noEligibleTabs);
  }
  if (eligible.length > maxTabs) {
    throw new Error(M.tooManyTabs(eligible.length, maxTabs));
  }

  const usage = await getUsage();
  const remaining = FREE_MONTHLY_TAB_LIMIT - usage.tabsUsed;
  if (remaining <= 0) {
    throw new Error(M.quotaExceeded(FREE_MONTHLY_TAB_LIMIT));
  }
  if (eligible.length > remaining) {
    throw new Error(M.quotaTooLow(remaining, FREE_MONTHLY_TAB_LIMIT));
  }

  // Extract content from all selected tabs in parallel rather than one at a
  // time — with 20-40 tabs the old sequential `for` loop meant total wait
  // time was the SUM of every injection's round-trip; each injection is
  // independent (separate tab, separate script context) so there is no
  // correctness reason to serialize them. Order is preserved because
  // Promise.all resolves into an array matching `eligible`'s order,
  // regardless of which tab's script finishes first.
  const pages = await Promise.all(
    eligible.map(async (tab) => {
      try {
        const injection = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: extractPageData,
          args: [depth.maxChars, depth.headings],
        });
        return injection[0]?.result || { title: tab.title, url: tab.url, error: M.pageEmpty };
      } catch (e) {
        return { title: tab.title || tab.url, url: tab.url, error: M.pageProtected };
      }
    })
  );

  const table = await callClaude(apiKey, pages, context, model, language, uiLang);
  normalizeTable(table);
  await addUsage(eligible.length);

  const scanEntry = {
    id: Date.now(),
    scanAt: Date.now(),
    context: context || '',
    tabCount: eligible.length,
    title: table.title || (uiLang === 'he' ? 'טבלת השוואה' : 'Comparison Table'),
    model,
    table,
  };

  await saveToHistory(scanEntry);
  await chrome.storage.local.set({
    lastResult: table,
    lastScanAt: scanEntry.scanAt,
    lastContext: context,
    lastTabCount: eligible.length,
    lastModel: model,
  });

  await chrome.tabs.create({ url: chrome.runtime.getURL('src/results/results.html') });
  return { ok: true };
}

function extractPageData(maxChars, headingCount) {
  const title = document.title || '';
  const metaDesc =
    document.querySelector('meta[name="description"]')?.content ||
    document.querySelector('meta[property="og:description"]')?.content ||
    '';
  const headings = Array.from(document.querySelectorAll('h1, h2'))
    .slice(0, headingCount || 12)
    .map((h) => h.innerText.trim())
    .filter(Boolean);
  const bodyText = (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, maxChars);
  return { title, url: location.href, metaDesc, headings, bodyText };
}

// fetch() has no built-in timeout — on a stalled connection (flaky wifi,
// captive portal, a proxy that never responds) the original code could hang
// indefinitely with the popup/results page stuck on "scanning" forever.
// AbortController + setTimeout gives every Anthropic call a hard ceiling.
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Shared POST-to-Anthropic-and-parse-JSON helper used by both the initial
// table build and the follow-up refine call. Retries exactly once, and only
// for failures that are plausibly transient (timeout, network drop, 5xx) —
// never for 401/429/4xx, and never more than once, so a genuinely broken key
// or a real rate limit doesn't silently double the API calls (and cost) of
// a single user action.
async function anthropicRequest(apiKey, body, uiLang, { timeoutMs = REQUEST_TIMEOUT_MS, allowRetry = true } = {}) {
  const M = m(uiLang);

  const attempt = async () => {
    let response;
    try {
      response = await fetchWithTimeout(
        'https://api.anthropic.com/v1/messages',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify(body),
        },
        timeoutMs
      );
    } catch (e) {
      const err = new Error(e.name === 'AbortError' ? M.timeoutErr : M.networkErr);
      err.retryable = true;
      throw err;
    }

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      if (response.status === 401) throw new Error(M.invalidKey);
      if (response.status === 429) throw new Error(M.rateLimited);
      const err = new Error(`${M.apiErrorPrefix(response.status)}${errBody.slice(0, 200)}`);
      if (response.status >= 500) err.retryable = true;
      throw err;
    }

    return response.json();
  };

  try {
    return await attempt();
  } catch (e) {
    if (allowRetry && e.retryable) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return attempt();
    }
    throw e;
  }
}

// Parses the {title, columns, rows} JSON that both the build and refine
// prompts ask Claude to return, sharing the same truncation/malformed-JSON
// error handling either call can hit.
function parseTableResponse(data, uiLang) {
  const M = m(uiLang);
  const text =
    data.content
      ?.filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('') || '';

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(data.stop_reason === 'max_tokens' ? M.truncated : M.unparsable);
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error(data.stop_reason === 'max_tokens' ? M.truncated : M.badJson);
  }

  if (!Array.isArray(parsed.columns) || !Array.isArray(parsed.rows)) {
    throw new Error(M.badTableShape);
  }

  return normalizeTable(parsed);
}

async function callClaude(apiKey, pages, context, model, language, uiLang) {
  const M = m(uiLang);
  const pagesBlock = pages
    .map((p, i) => {
      if (p.error) return `[${i + 1}] ${p.title || p.url}\nURL: ${p.url}\n${M.pageErrorPrefix}${p.error}`;
      return [
        `[${i + 1}] ${p.title}`,
        `URL: ${p.url}`,
        p.metaDesc ? `${M.contentDesc}${p.metaDesc}` : '',
        p.headings?.length ? `${M.contentHeadings}${p.headings.join(' | ')}` : '',
        p.bodyText ? `${M.contentBody}${p.bodyText}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n---\n\n');

  const userInstruction = context ? M.contextGiven(context) : M.contextMissing;

  let langInstruction = '';
  if (language === 'en') {
    langInstruction = '\nWrite the table title, column names and all cell values in English.';
  } else if (language === 'he') {
    langInstruction = '\nכתוב את כותרת הטבלה, שמות העמודות וכל ערכי התאים בעברית.';
  }

  const prompt = `להלן תוכן שנשלף מ-${pages.length} לשוניות פתוחות בדפדפן.
${userInstruction}${langInstruction}

המשימה: הפוך את המידע לטבלת השוואה אחת, ברורה ותמציתית.
- בחר עמודות רלוונטיות (שם/מוצר, מחיר, פיצ'רים עיקריים, יתרון בולט, קישור).
- עמודה ראשונה: שם/כותרת מזהה. עמודה אחרונה: "קישור" עם ה-URL המלא.
- אם דף לא רלוונטי, השמט אותו או ציין זאת.
- החזר אך ורק JSON תקין בפורמט הבא, בלי טקסט נוסף ובלי markdown fences:
{"title": "כותרת קצרה", "columns": ["עמודה1", ...], "rows": [["ערך1", ...], ...]}

תוכן הלשוניות:

${pagesBlock}`;

  const data = await anthropicRequest(
    apiKey,
    { model, max_tokens: 8192, messages: [{ role: 'user', content: prompt }] },
    uiLang
  );

  return parseTableResponse(data, uiLang);
}

// Follow-up refine: takes the existing {title, columns, rows} table plus a
// short free-text instruction ("add a column for X", "only keep the free
// plans", "sort by price") and asks Claude to return an updated table in the
// same shape — one extra API call per click, entirely user-initiated (no
// automatic re-querying), so it doesn't multiply cost on its own.
async function refineTable(apiKey, table, instruction, language, uiLang, model) {
  let langInstruction = '';
  if (language === 'en') {
    langInstruction = '\nWrite the table title, column names and all cell values in English.';
  } else if (language === 'he') {
    langInstruction = '\nכתוב את כותרת הטבלה, שמות העמודות וכל ערכי התאים בעברית.';
  }

  const prompt = `להלן טבלת השוואה קיימת, בפורמט JSON:
${JSON.stringify({ title: table.title, columns: table.columns, rows: table.rows })}

בקשת עדכון מהמשתמש: "${instruction}"${langInstruction}

עדכן את הטבלה לפי הבקשה (למשל: הוספת/הסרת עמודה, סינון שורות, מיון, חישוב/ניתוח נוסף). שמור על שאר הטבלה כפי שהיא אם לא התבקש אחרת.
החזר אך ורק JSON תקין באותו מבנה בדיוק, בלי טקסט נוסף ובלי markdown fences:
{"title": "כותרת קצרה", "columns": ["עמודה1", ...], "rows": [["ערך1", ...], ...]}`;

  const data = await anthropicRequest(
    apiKey,
    { model, max_tokens: 8192, messages: [{ role: 'user', content: prompt }] },
    uiLang
  );

  return parseTableResponse(data, uiLang);
}

async function handleRefine(instruction) {
  const { apiKey, settings, lastResult, lastContext, lastTabCount } = await chrome.storage.local.get([
    'apiKey', 'settings', 'lastResult', 'lastContext', 'lastTabCount',
  ]);
  const uiLang = settings?.uiLang ?? DEFAULT_SETTINGS.uiLang;
  const M = m(uiLang);

  if (!apiKey) throw new Error(M.noApiKey);
  if (!lastResult || !lastResult.columns || !lastResult.rows) throw new Error(M.noTableToRefine);
  const trimmed = instruction.trim();
  if (!trimmed) throw new Error(M.noRefineInstruction);

  const model = settings?.model ?? DEFAULT_MODEL;
  const language = settings?.language ?? 'auto';

  const table = await refineTable(apiKey, lastResult, trimmed, language, uiLang, model);

  const scanEntry = {
    id: Date.now(),
    scanAt: Date.now(),
    context: lastContext || '',
    tabCount: lastTabCount || table.rows.length,
    title: table.title || (uiLang === 'he' ? 'טבלת השוואה (עודכנה)' : 'Comparison Table (refined)'),
    model,
    table,
    refinedFrom: trimmed,
  };

  await saveToHistory(scanEntry);
  await chrome.storage.local.set({ lastResult: table, lastScanAt: scanEntry.scanAt, lastModel: model });

  return { ok: true, table };
}

// Lightweight key test: send a minimal 1-token request to verify auth
async function testApiKey(apiKey, uiLang) {
  const M = m(uiLang);
  if (!apiKey || !apiKey.startsWith('sk-ant-')) {
    return { error: M.testBadFormat };
  }
  let response;
  try {
    response = await fetchWithTimeout(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 5,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      },
      TEST_TIMEOUT_MS
    );
  } catch (e) {
    return { error: M.testNetworkErr };
  }
  if (response.status === 401) return { error: M.testInvalidKey };
  if (response.status === 429) return { ok: true, note: M.testRateLimited };
  if (!response.ok) return { error: M.testHttpError(response.status) };
  return { ok: true };
}
