# DELETIONS.md — TabToTable AI

Log of files removed from the project, per `_AUDIT/STANDARDS.md` §"כללי עבודה קשיחים". User explicitly approved cleanup of duplicates/old files in the same request that triggered this restructure (2026-09-14).

## 2026-09-14 — v0.4.0 → v0.5.0 restructure (STANDARDS.md compliance pass)

| File | Reason |
|---|---|
| `INSTALL.md` | Superseded — content merged into the new bilingual `README.md` (he+en), which is the standard's required doc for a Chrome extension's root (§1). No unique content lost. |
| `PROJECT.md` | Superseded — this "index" file is not part of the Chrome-extension folder standard (§1: only CHANGELOG/SPEC/README at root). Version/status now live in CHANGELOG.md and README.md. |
| `extension/README.md` | Superseded — was a short pointer file describing the old `extension/` subfolder layout. That layout no longer exists (files moved to `src/`, `assets/`, `_locales/`); its content is now covered by the root `README.md`. |
| `extension/` (folder) | Restructured away — Chrome-extension standard puts `manifest.json` at the project root with source under `src/background|popup|options|results|shared/`, not nested one level down in a generic `extension/` folder. All files moved, none deleted without a replacement location. |

No build output, generated artifacts, or `.bak`/duplicate files existed in this project before this pass (confirmed by directory listing — 15 files total, single version of each, per `_AUDIT/AUDIT-TabToTable-AI.md`).
