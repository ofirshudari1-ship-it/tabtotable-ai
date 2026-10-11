// Unit test for src/shared/update-check.js (no browser needed): node tests/update-check.test.js
const path = require("path");
const assert = require("assert");
const store = {};
let badge = null, calls = 0, mode = "ok", tag = "v9.9.9", htmlUrl;
global.self = global;
global.chrome = {
  runtime: { getManifest: () => ({ version: "1.0.0" }) },
  storage: { local: {
    get: async (keys) => { const o = {}; keys.forEach((k) => { if (k in store) o[k] = store[k]; }); return o; },
    set: async (o) => Object.assign(store, o),
  } },
  action: { setBadgeText: async ({ text }) => { badge = text; }, setBadgeBackgroundColor: async () => {} },
};
global.fetch = async (url, opts) => {
  calls++;
  assert(url.startsWith("https://api.github.com/repos/"), "only api.github.com");
  assert.strictEqual(opts.credentials, "omit");
  if (mode === "fail") throw new Error("offline");
  if (mode === "500") return { ok: false, status: 500 };
  return { ok: true, json: async () => ({ tag_name: tag, html_url: htmlUrl }) };
};
require(path.join(__dirname, "..", "src", "shared", "update-check.js"));
const U = global.ExtUpdate;
(async () => {
  assert.strictEqual(U.compareVersions("1.14.0", "1.13.0"), 1);
  assert.strictEqual(U.compareVersions("v1.13.0", "1.13.0"), 0);
  assert.strictEqual(U.compareVersions("1.9.9", "1.13.0"), -1);
  assert.strictEqual(U.compareVersions("1.2.3-beta", "1.0.0"), null);
  htmlUrl = "https://github.com/" + U.REPO + "/releases/tag/v9.9.9";
  let s = await U.check();
  assert.strictEqual(calls, 1); assert.strictEqual(s.latest, "9.9.9");
  let v = await U.getView();
  assert(v.showNotice && v.available); assert.strictEqual(badge, "NEW");
  await U.check(); assert.strictEqual(calls, 1, "cached within 12h");
  await U.dismiss(); v = await U.getView();
  assert(!v.showNotice && v.available); assert.strictEqual(badge, "");
  await U.setEnabled(false); const before = calls; await U.check(); assert.strictEqual(calls, before, "off = no request");
  v = await U.getView(); assert(!v.available && !v.enabled);
  await U.setEnabled(true); assert.strictEqual(calls, before + 1, "re-enable checks now");
  // hostile html_url falls back to repo releases page
  htmlUrl = "https://evil.example/x"; await U.check({ force: true });
  v = await U.getView(); assert(v.url.startsWith("https://github.com/" + U.REPO + "/releases/"));
  // failure keeps previous data, marks not ok, retries after 1h
  mode = "fail"; await U.check({ force: true }); v = await U.getView();
  assert(!v.ok && v.latest === "9.9.9");
  store.updateCheckState.checkedAt = Date.now() - 2 * 3600e3; const c2 = calls; await U.check(); assert.strictEqual(calls, c2 + 1, "retry after 1h on failure");
  // tag garbage ignored
  mode = "ok"; tag = "nightly"; await U.check({ force: true }); v = await U.getView(); assert(!v.ok);
  // same/older version -> no notice
  tag = "1.0.0"; await U.check({ force: true }); v = await U.getView(); assert(!v.available);
  console.log("update-check tests: all passed");
})().catch((e) => { console.error(e); process.exit(1); });
