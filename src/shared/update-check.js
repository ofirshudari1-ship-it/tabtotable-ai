// TabToTable AI - optional "new version available" notice.
//
// TabToTable AI is distributed as a GitHub-Release ZIP loaded unpacked, so Chrome
// cannot update it by itself. This module asks GitHub for the LATEST release
// number of this extension's own repository and, if it is newer than the
// installed version, lets the UI show a "download" notice.
//
// Privacy / safety contract (keep in sync with PRIVACY.md and the Settings text):
//   - one hardcoded HTTPS URL (api.github.com, this repo only), GET, no cookies,
//     no referrer, no custom identifiers - nothing about the user is sent;
//   - at most once per 12 hours (cached in chrome.storage.local), 1 hour retry
//     after a failure; never runs while the user has switched it off;
//   - the response is only used to read a version number and a release link,
//     and the link must point back to this repo on github.com;
//   - the extension never downloads, installs or runs anything by itself.
(function (global) {
  "use strict";

  var REPO = "ofirshudari1-ship-it/tabtotable-ai";
  var API_URL = "https://api.github.com/repos/" + REPO + "/releases/latest";
  var RELEASE_URL_PREFIX = "https://github.com/" + REPO + "/releases/";
  var KEY_STATE = "updateCheckState";
  var KEY_ENABLED = "updateCheckEnabled"; // absent or true = on (default)
  var INTERVAL_MS = 12 * 60 * 60 * 1000;
  var RETRY_MS = 60 * 60 * 1000;
  var TIMEOUT_MS = 8000;

  function parseVersion(v) {
    var m = /^v?(\d{1,6})\.(\d{1,6})\.(\d{1,6})$/.exec(String(v == null ? "" : v).trim());
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
  }

  // 1 if a > b, -1 if a < b, 0 if equal, null if either is not a plain x.y.z.
  function compareVersions(a, b) {
    var pa = parseVersion(a);
    var pb = parseVersion(b);
    if (!pa || !pb) return null;
    for (var i = 0; i < 3; i++) {
      if (pa[i] > pb[i]) return 1;
      if (pa[i] < pb[i]) return -1;
    }
    return 0;
  }

  function currentVersion() {
    return chrome.runtime.getManifest().version;
  }

  async function isEnabled() {
    try {
      var r = await chrome.storage.local.get([KEY_ENABLED]);
      return r[KEY_ENABLED] !== false;
    } catch (e) {
      return true;
    }
  }

  async function readState() {
    try {
      var r = await chrome.storage.local.get([KEY_STATE]);
      var s = r[KEY_STATE];
      return s && typeof s === "object" ? s : {};
    } catch (e) {
      return {};
    }
  }

  async function writeState(state) {
    try {
      await chrome.storage.local.set({ [KEY_STATE]: state });
    } catch (e) {
      /* storage unavailable - the notice simply will not persist */
    }
  }

  async function fetchLatest() {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS);
    try {
      var res = await fetch(API_URL, {
        method: "GET",
        headers: { Accept: "application/vnd.github+json" },
        cache: "no-store",
        credentials: "omit",
        referrerPolicy: "no-referrer",
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      var data = await res.json();
      var version = String((data && data.tag_name) || "").replace(/^v/, "");
      if (!parseVersion(version)) throw new Error("unexpected tag");
      var url = String((data && data.html_url) || "");
      if (url.indexOf(RELEASE_URL_PREFIX) !== 0) url = "https://github.com/" + REPO + "/releases/latest";
      return { version: version, url: url };
    } finally {
      clearTimeout(timer);
    }
  }

  // Runs the check unless it ran recently. Never throws.
  async function check(opts) {
    var force = !!(opts && opts.force);
    var state = await readState();
    if (!force) {
      if (!(await isEnabled())) return state;
      var age = Date.now() - (state.checkedAt || 0);
      var wait = state.ok === false ? RETRY_MS : INTERVAL_MS;
      if (state.checkedAt && age >= 0 && age < wait) return state;
    }
    var next = { checkedAt: Date.now(), dismissedVersion: state.dismissedVersion || null };
    try {
      var latest = await fetchLatest();
      next.ok = true;
      next.latest = latest.version;
      next.url = latest.url;
    } catch (e) {
      next.ok = false;
      next.latest = state.latest || null;
      next.url = state.url || null;
    }
    await writeState(next);
    await applyBadge();
    return next;
  }

  async function getView() {
    var state = await readState();
    var enabled = await isEnabled();
    var cur = currentVersion();
    var newer = compareVersions(state.latest, cur) === 1;
    return {
      enabled: enabled,
      current: cur,
      latest: state.latest || null,
      url: state.url || "https://github.com/" + REPO + "/releases/latest",
      checkedAt: state.checkedAt || 0,
      ok: state.ok !== false,
      available: enabled && newer,
      showNotice: enabled && newer && state.dismissedVersion !== state.latest,
    };
  }

  // Toolbar badge: "NEW" only while a not-dismissed newer version exists.
  async function applyBadge() {
    try {
      if (!chrome.action || !chrome.action.setBadgeText) return;
      var v = await getView();
      if (v.showNotice) {
        await chrome.action.setBadgeBackgroundColor({ color: "#E8590C" });
        await chrome.action.setBadgeText({ text: "NEW" });
      } else {
        await chrome.action.setBadgeText({ text: "" });
      }
    } catch (e) {
      /* badge is cosmetic */
    }
  }

  async function dismiss() {
    var state = await readState();
    state.dismissedVersion = state.latest || null;
    await writeState(state);
    await applyBadge();
  }

  async function setEnabled(on) {
    try {
      await chrome.storage.local.set({ [KEY_ENABLED]: !!on });
    } catch (e) { /* ignore */ }
    if (on) {
      return check({ force: true });
    }
    await applyBadge();
    return readState();
  }

  global.ExtUpdate = {
    check: check,
    getView: getView,
    dismiss: dismiss,
    setEnabled: setEnabled,
    applyBadge: applyBadge,
    compareVersions: compareVersions,
    parseVersion: parseVersion,
    REPO: REPO,
  };
})(typeof self !== "undefined" ? self : this);
