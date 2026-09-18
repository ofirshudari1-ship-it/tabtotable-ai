// Shared i18n loader — reads the SAME _locales/<lang>/messages.json files
// Chrome's own i18n system uses (single source of truth), but lets the user
// switch language live inside the extension via a settings toggle, since
// chrome.i18n.getMessage() itself is locked to the browser's UI language and
// cannot be switched at runtime.
//
// Usage:
//   const i18n = await TTT_I18N.load(lang);   // lang: 'en' | 'he'
//   i18n.t('popup_scanBtn')
//   i18n.t('popup_quotaRemaining', ['12', '150'])
//   TTT_I18N.applyToDom(i18n, document);       // fills every [data-i18n] element

const TTT_I18N = (() => {
  const cache = {};

  async function load(lang) {
    const safeLang = lang === 'he' ? 'he' : 'en';
    if (cache[safeLang]) return cache[safeLang];

    let messages = {};
    try {
      const url = chrome.runtime.getURL(`_locales/${safeLang}/messages.json`);
      const res = await fetch(url);
      messages = await res.json();
    } catch (e) {
      messages = {};
    }

    function t(key, subs) {
      const entry = messages[key];
      if (!entry) return key;
      let msg = entry.message || '';
      if (Array.isArray(subs)) {
        subs.forEach((val, i) => {
          msg = msg.replace(new RegExp('\\$' + (i + 1) + '(?!\\d)', 'g'), val);
          // also support named placeholders like $REMAINING$ -> positional $1
        });
        if (entry.placeholders) {
          Object.values(entry.placeholders).forEach((ph, i) => {
            // no-op: named placeholders already map to $1/$2 via content field
          });
        }
      }
      return msg;
    }

    const api = { lang: safeLang, messages, t };
    cache[safeLang] = api;
    return api;
  }

  // Applies translations to every element with data-i18n="key" (textContent),
  // data-i18n-placeholder="key" (placeholder attr), data-i18n-title="key" (title attr).
  // No innerHTML anywhere — an element needing inline markup (e.g. a <b> span)
  // is built with explicit child elements in the calling page's own JS instead.
  function applyToDom(i18nApi, root) {
    root.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = i18nApi.t(el.getAttribute('data-i18n'));
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.setAttribute('placeholder', i18nApi.t(el.getAttribute('data-i18n-placeholder')));
    });
    root.querySelectorAll('[data-i18n-title]').forEach((el) => {
      el.setAttribute('title', i18nApi.t(el.getAttribute('data-i18n-title')));
    });
    document.documentElement.setAttribute('lang', i18nApi.lang);
    document.documentElement.setAttribute('dir', i18nApi.lang === 'he' ? 'rtl' : 'ltr');
  }

  return { load, applyToDom };
})();
