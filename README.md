# TabToTable AI

**Turn every open browser tab into one AI-built comparison table.**

## What it does

Click the extension icon, optionally describe what you're comparing (e.g. "compare pricing across these CRM tools"), and TabToTable AI reads the content of every open tab in your current browser window and sends it to Claude (Anthropic's AI) to build a clean comparison table. The table opens in a new tab and is sortable, searchable, and exportable to CSV or Markdown. You can also pick exactly which open tabs to include instead of scanning everything, and refine an existing table afterwards with a free-text request (e.g. "only keep free plans" or "sort by price") without re-scanning your tabs. The interface is bilingual (English and Hebrew).

## Install

TabToTable AI is not published on the Chrome Web Store, so installation is manual and Chrome cannot update it by itself (from v0.10.0 it tells you when a newer release exists - see Updates below):

1. Download the latest `.zip` from the [Releases page](https://github.com/ofirshudari1-ship-it/tabtotable-ai/releases/latest).
2. Extract the zip to a folder you'll keep on your computer.
3. Open `chrome://extensions` in Chrome.
4. Turn on **Developer mode** (toggle in the top-right corner).
5. Click **Load unpacked** and select the folder you extracted.

Because this isn't a Chrome Web Store install, Chrome will never update it automatically. To get a new version later, download the new release zip and repeat the steps above (extracting over the same folder, then clicking the reload icon on the extension's card at `chrome://extensions`, works too).

### Updates

From v0.10.0 TabToTable AI checks its own GitHub repository for a newer release and, if there is one, shows a **new version available - download** notice in the popup and in Settings, and a **NEW** badge on the toolbar icon. It never downloads or installs anything by itself.

- At most one check every 12 hours (one HTTPS request to `api.github.com`, this repo only; result cached in `chrome.storage.local`).
- On by default. Turn it off under **Settings > Updates**. **Check now** forces a check.
- No extra browser permission is needed (the extension already holds `<all_urls>`).

## Set up your API key

TabToTable AI needs your own Anthropic API key to work — it does not come with a shared or built-in key:

1. Click the extension icon → **Settings**.
2. If you don't have an Anthropic API key yet, create one at [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys).
3. Paste it (starts with `sk-ant-...`) and click **Save key**. Optionally click **Test connection** to verify it works.

## Key features

- **Compare open tabs**: builds a single comparison table from every eligible `http(s)` tab in the current window.
- **Manual tab picker**: choose exactly which open tabs to include (with a "select all / none" toggle and a live "X/Y selected" counter) instead of scanning everything.
- **Refine after building**: type a free-text follow-up request on the results page to update the table — add a column, filter rows, re-sort — without re-scanning your tabs. Each refine is exactly one explicit API call.
- **Export**: one "Export" menu on the results page — download as CSV or JSON, or copy the table as Markdown.
- **Configurable model and scope**: choose between Claude Sonnet 5 and Haiku 4.5, set a tab-scan limit, a content-depth level (concise/standard/thorough — how much of each page is read), and default output language (auto/Hebrew/English).
- **Keyboard shortcut**: `Alt+Shift+T` opens the popup instantly from any tab (reassignable at `chrome://extensions/shortcuts`).
- **Reliability**: tab content is read in parallel (not one-by-one) for speed, requests time out instead of hanging indefinitely, and a single automatic retry smooths over one-off network hiccups (never on an invalid key, to avoid wasting API calls).

## Privacy

TabToTable AI is **not** a local-only tool: to build a table, it sends the text content of your open tabs to Anthropic's API (`api.anthropic.com`) directly from your browser, using your own API key. No analytics or tracking layer exists. Besides Anthropic, the only other requests are (1) the optional, switch-off-able version check against GitHub described under Updates, and (2) the extension pages load their web fonts from Google Fonts (Google sees your IP address and the font request, nothing else). Your API key and saved results are stored only in `chrome.storage.local` on your own device. Uninstalling the extension removes your saved key and local history.

Because tab content leaves your browser as part of normal operation, avoid running it against tabs containing sensitive or confidential information you wouldn't otherwise send to a third-party AI service.
