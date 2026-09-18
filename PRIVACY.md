# Privacy Policy — TabToTable AI

*Last updated: 2026-09-15 · Version 0.6.0*

**Single purpose:** TabToTable AI reads the content of tabs you have open, purely so it can build a comparison table from them at your request. It collects nothing beyond what that single purpose requires, and nothing is collected automatically — every scan is a direct action you take (clicking "Build table").

## What data is read

When you click "Build table from open tabs," the extension reads, from each eligible open `http(s)` tab in the current window:
- Page title
- Meta description (`<meta name="description">` / `og:description`)
- The first `H1`/`H2` headings
- Visible body text (capped at 4,000 characters per page)

It does **not** read: browsing history, tabs in other windows, incognito tabs (unless you explicitly allow the extension in incognito), passwords, form field contents, cookies, or any page you have not personally opened.

## Where that data goes

The extracted content is sent **directly from your browser** to the Anthropic API (`api.anthropic.com`) to build the table — using **your own Anthropic API key**, which you provide. It is not sent to, or ever seen by, any TabToTable AI server, because **no such server exists**. There is no backend, no telemetry, and no analytics collection of any kind.

Anthropic processes this request under its own API terms. TabToTable AI's use of the Anthropic API is compliant with Anthropic's **Limited Use** restrictions: data submitted through the API is used only to generate the requested response for you, not to train Anthropic's models by default, and not shared with any third party for advertising or unrelated purposes.

## Where data is stored

Your Anthropic API key, settings, scan results, and 5-item scan history are stored **only** in `chrome.storage.local` — local to your browser profile on your own device. Nothing is synced to a cloud account, and nothing is stored on any server we operate (again: we operate none).

Uninstalling the extension deletes all of this local data.

## What changes if this policy changes

If a future version changes what data is collected or where it is sent, that change will be disclosed here **before** it ships, with the version number and date of the change, and a note in `CHANGELOG.md`.

## Your controls

- **Clear scan history** and **delete all local data** — available anytime in Settings → Danger Zone.
- **Uninstall** the extension — removes all locally stored data immediately.
- **Revoke your Anthropic API key** — at [console.anthropic.com](https://console.anthropic.com/settings/keys), independent of the extension.

## Contact

This is an independent, unpublished (developer-mode) project. For questions, see the project's `README.md`.
