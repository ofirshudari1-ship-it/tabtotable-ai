# CHANGELOG — TabToTable AI

כל שינוי משמעותי בתוסף מתועד כאן. פורמט תאריכים: YYYY-MM-DD.
Every notable change to the extension is logged here (Keep a Changelog format). Date format: YYYY-MM-DD.

## [0.7.0] — 2026-09-15

### הקשר / Context
עדכון פיצ'רים מבוסס מחקר מתחרים קצר (Arc Browser, Perplexity Comet, Dia, Sider, Merlin AI, Monica AI — ספטמבר 2026): הכיוון המשותף אצל כל דפדפני/תוספי ה-AI המובילים ב-2026 הוא (א) "לשוחח עם הטאבים שלך" בהמשכיות אחרי תוצאה ראשונית (Dia, Comet), ולא רק שאילתה חד-פעמית, ו-(ב) ניהול/בחירת טאבים ממוקד (Arc) במקום "הכול או כלום". שני הפיצ'רים החדשים למטה מיישמים בדיוק את שתי המגמות האלה, בהיקף שמתאים לכלי חד-מטרתי (השוואת טאבים ל-Claude) ולא מעתיק פיצ'ר-פיצ'ר כלי כללי.<br>
*English:* This round follows a short competitor scan (Arc Browser, Perplexity Comet, Dia, Sider, Merlin AI, Monica AI — Sept 2026). The common 2026 pattern across leading AI browsers/extensions is (a) continuing to "chat with your tabs" after the first result (Dia, Comet) instead of a one-shot query, and (b) deliberate tab curation (Arc) instead of always-everything. The two additions below implement exactly those two patterns, scoped to a single-purpose tool (compare open tabs via Claude) rather than copying general-assistant feature bloat.

### נוסף / Added
- **בחירת לשוניות ידנית (Tab Picker) בפופאפ:** סעיף מתקפל חדש מתחת לשדה ההקשר, מציג רשימת כל הלשוניות הזכאיות בחלון (favicon+כותרת) עם checkbox לכל אחת, "בחר הכול"/"בטל הכול", ומונה "X/Y נבחרו". ברירת המחדל היא כל הלשוניות מסומנות (זהה להתנהגות הקודמת) — המשתמש פשוט מסנן מה לא רלוונטי לפני שהוא שולח משהו ל-Claude API, במקום לסגור לשוניות ולפתוח מחדש. `background.js`: `SCAN_TABS` מקבל עכשיו `tabIds` אופציונלי; `GET_TAB_LIST` חדש מחזיר את הרשימה. אם הרשימה עדיין נטענת כשלוחצים "בנה טבלה", הפופאפ נופל בחזרה ל"כל הלשוניות" כדי לא לשבור את ההתנהגות הקיימת.<br>
  *English:* New collapsible "tabs to compare" section in the popup — lists every eligible tab (favicon+title) with a checkbox, Select all/none, and an "X/Y selected" counter. Defaults to everything checked (matches prior behavior). Lets the user exclude noise tabs before spending an API call, instead of closing/reopening tabs. `background.js` gained an optional `tabIds` on `SCAN_TABS` and a new `GET_TAB_LIST` message; if the list is still loading when Scan is clicked, the popup falls back to "all tabs" so the picker can never silently under-scan.
- **עדכון/Refine לאחר בנייה (Results page):** שורת "✨ עדכן את הטבלה" מתחת לטבלה — המשתמש מקליד בקשה חופשית ("הוסף עמודת שנת ייסוד", "השאר רק תוכניות חינמיות", "מיין לפי מחיר") ומקבל טבלה מעודכנת בלי לבנות הכול מחדש מהלשוניות. כל לחיצה = קריאת API אחת בדיוק, יזומה במפורש על ידי המשתמש (לא אוטומטית, לא כפולה) — עומד בדרישת "לא להכפיל קריאות API בלי שליטת משתמש ברורה". `background.js`: `REFINE_TABLE` חדש + `refineTable()`/`handleRefine()`, שולח את הטבלה הקיימת + הבקשה בחזרה ל-Claude ושומר תוצאה חדשה בהיסטוריה (לא דורס את המקור).<br>
  *English:* "✨ Refine this table" row below the results table — free-text request ("add a founding-year column", "only keep free plans", "sort by price") returns an updated table without re-scanning tabs. Exactly one API call per click, explicitly user-initiated (never automatic, never doubled) — satisfies the "don't multiply API calls without clear user control" constraint from the brief. `background.js` gained `REFINE_TABLE` + `refineTable()`/`handleRefine()`, which sends the existing table + the request back to Claude and saves the result as a new history entry (the original scan is preserved, not overwritten).

### שופר (ביצועים/עמידות) / Improved (performance/robustness)
- **חילוץ תוכן מהלשוניות במקביל, לא ברצף:** `scanAndBuildTable()` השתמש ב-`for` loop סדרתי עם `await` בכל איטרציה — זמן ההמתנה הכולל היה **סכום** זמני התגובה של כל הזרקת סקריפט, אחד-אחד. הוחלף ב-`Promise.all`, ששולח את כל ההזרקות בו-זמנית ומחכה לכולן יחד — עם 20-40 לשוניות פתוחות זה חיסכון משמעותי בזמן לפני שהבקשה ל-Claude בכלל יוצאת. סדר העמודים נשמר (Promise.all שומר סדר, לא תלוי מי מסיים ראשון).<br>
  *English:* `scanAndBuildTable()` used a sequential `for` loop with `await` per tab — total wait time was the **sum** of every script-injection round-trip. Replaced with `Promise.all`, firing every injection concurrently; with 20-40 open tabs this meaningfully cuts the time before the Claude request even goes out. Page order is preserved regardless of which tab's script finishes first.
- **Timeout על כל קריאה ל-Anthropic API:** ל-`fetch()` אין timeout מובנה — על חיבור תקוע (Wi-Fi לא יציב, captive portal, proxy שלא עונה) הקוד הקודם יכול היה להיתקע לנצח עם "סורק..." על המסך. נוסף `AbortController`+`setTimeout` (60 שניות לבנייה/עדכון, 15 שניות לבדיקת מפתח) עם הודעת שגיאה ידידותית דו-לשונית חדשה.<br>
  *English:* `fetch()` has no built-in timeout — a stalled connection (flaky wifi, captive portal, an unresponsive proxy) could previously hang forever with the UI stuck on "scanning...". Added `AbortController`+`setTimeout` (60s for build/refine calls, 15s for the key-test ping) with a new bilingual friendly timeout message.
- **ניסיון חוזר יחיד על כשל זמני:** כשלים שסבירים כ"זמניים" (timeout, ניתוק רשת, 5xx משרת Anthropic) מקבלים ניסיון חוזר **אחד** אחרי השהיה קצרה — לא על 401/429/4xx (אלה כשלים אמיתיים, לא כדאי לנסות שוב ולשלם קריאה נוספת על מפתח שבור). כך משתמש לא רואה כשל חד-פעמי-אקראי בלי שום סיבה טובה, אבל גם לא משלם כפול על מפתח לא תקין.<br>
  *English:* Failures that are plausibly transient (timeout, dropped connection, Anthropic 5xx) get exactly one retry after a short delay — never for 401/429/4xx (those are real failures; retrying just doubles the cost of a broken key). Smooths over a one-off network hiccup without silently doubling API spend on a genuinely bad key.
- קוד ה-fetch שוכפל בין `callClaude`/`testApiKey`/הפונקציה החדשה `refineTable` — אוחד ל-`fetchWithTimeout()`/`anthropicRequest()`/`parseTableResponse()` משותפים, כדי שתיקון עתידי (timeout, retry, פרסור JSON) לא יצטרך להתעדכן בשלושה מקומות בנפרד.<br>
  *English:* The fetch/error-handling logic was duplicated across `callClaude`/`testApiKey`/the new `refineTable`; consolidated into shared `fetchWithTimeout()`/`anthropicRequest()`/`parseTableResponse()` helpers so a future fix (timeout, retry, JSON parsing) doesn't need three separate edits.

### עיצוב / UI polish
- טבלת התוצאות מקבלת אנימציית כניסה עדינה (fade+slide, 280ms, מכבד `prefers-reduced-motion`) בכל רינדור — כולל אחרי עדכון/refine, כדי שהעדכון "יורגש".<br>
  *English:* The results table now fades/slides in on every render (280ms, respects `prefers-reduced-motion`) — including after a refine, so the update is visually legible.
- כפתורים מקבלים משוב `:active` עדין (`scale(0.98)`) בכל שלושת המסכים, דרך `brand.css` המשותף.<br>
  *English:* Buttons get a subtle `:active` press feedback (`scale(0.98)`) across all three screens, via the shared `brand.css`.
- שורת ה-refine ("✨") מעומעמת (`opacity`) בזמן קריאת API, במקום להיעלם/לקפוץ — משוב ברור ש"עובד על זה" בלי לטלטל את הפריסה.<br>
  *English:* The refine row dims (`opacity`) while the API call is in flight instead of disappearing or jumping — clear "working on it" feedback without layout shift.

**פלטת הצבעים לא שונתה** (כפי שהתבקש) — הצבע הקיים בפועל בקוד הוא ענבר/זהב (`--accent: #F0A202`), **לא** כחול `#3f6fd9`/נייבי `#132a63` כפי שצוין בבריף; לא נמצאה שום התייחסות לצבעים האלה בפרויקט. שמרנו על הפלטה הקיימת בפועל ולא נגענו בה כלל, בהתאם לכוונה של "אל תשנה את המיתוג הקיים" — אבל שווה לוודא מול Ofir אם יש כוונה עתידית לשנות לכחול/נייבי במודע.<br>
*English:* **The color palette was not changed** (as instructed) — the palette actually in the code is amber/gold (`--accent: #F0A202`), **not** blue `#3f6fd9`/navy `#132a63` as stated in the brief; no reference to those colors exists anywhere in the project. Left the real existing palette untouched, honoring the "don't change existing branding" intent — but worth confirming with Ofir whether a deliberate future move to blue/navy was intended.

## [0.6.0] — 2026-09-15

### תוקן (RTL/i18n — ביקורת מלאה מול `_AUDIT/STANDARDS.md`) / Fixed (RTL/i18n — full audit against `_AUDIT/STANDARDS.md`)
- **עברית קשיחה בדף התוצאות שנשארה גם בממשק אנגלי:** `<h1 id="title">`, כפתורי הדפסה/היסטוריה, placeholder החיפוש וה-title של כפתור "נקה חיפוש" ב-`results.html` היו טקסט עברי מוטבע ב-HTML במקום מפתחות `data-i18n` — כך שבממשק אנגלי (ברירת המחדל!) משתמש היה רואה "טבלת השוואה"/"הדפסה"/"היסטוריה" בעברית עד שה-JS דרס אותם (ולא דרס בכלל את ה-`title` של כפתור הניקוי). כל חמשת המקומות הומרו ל-`data-i18n`/`data-i18n-title`/`data-i18n-placeholder` אמיתיים, כך ש-`TTT_I18N.applyToDom` הוא מקור האמת היחיד — לא JS מפוזר שדורס חלק מהמקומות ומפספס אחרים. </br>
  *English:* Several strings in `results.html` (comparison-table title fallback, Print/History buttons, search placeholder, clear-search button's `title`) were hardcoded Hebrew baked into the markup instead of `data-i18n` keys — meaning an English-UI user would briefly (or, for the clear-search tooltip, permanently) see Hebrew text. All five were converted to proper `data-i18n`/`data-i18n-title`/`data-i18n-placeholder` attributes so `TTT_I18N.applyToDom` is the single source of truth.
- **`text-align: right` קשיח בטבלת התוצאות:** `th`/`td` בדף התוצאות היו מיושרים לימין תמיד, גם בממשק אנגלי (LTR) — תוקן ל-`text-align: start` (לוגי, עוקב אחרי `dir`). גם `.sort-icon { margin-right }` הומר ל-`margin-inline-end`.<br>
  *English:* Table cells were force-right-aligned even in the English (LTR) UI — fixed to logical `text-align: start`. `.sort-icon`'s physical `margin-right` converted to `margin-inline-end`.
- **`.tab-chip` padding לא-סימטרי פיזי:** `padding: 3px 10px 3px 8px` (ימין/שמאל קשיחים) הומר ל-`padding-inline: 8px 10px` הלוגי, כך שהאיזון הוויזואלי סביב הנקודה+הטקסט נשמר גם ב-RTL.<br>
  *English:* `.tab-chip`'s physical asymmetric padding converted to logical `padding-inline`, preserving the intended visual balance in both directions.

### נוסף / Added
- **אייקון 32×32 חסר:** נוצר `assets/icons/icon32.png` (מיוצא מ-128px, LANCZOS) ונוסף ל-`action.default_icon` ב-`manifest.json` — התוסף עכשיו עומד במפרט המדויק של `_AUDIT/STANDARDS.md` §15.4 (16/32 לסרגל הכלים, 48/128 לעמוד ההרחבות). זה היה מסומן כמגבלה ידועה ב-`SPEC.md` §11 מאז v0.5.0.<br>
  *English:* Missing `icon32.png` created (exported from the 128px source) and wired into `action.default_icon` — the extension now meets the exact Chrome icon spec (16/32 toolbar, 48/128 store/management page). Previously a documented known gap.
- **`build/build.ps1`** — סקריפט build/validation בפקודה אחת (STANDARDS §9): מאמת JSON של manifest+locales, מריץ `node --check` על כל קובצי JS, מוודא ש-4 גדלי האייקון קיימים, מוודא שכל `__MSG_*__` נפתר בשתי השפות, ומארז מחדש ZIP יחיד בשורש (מוחק גרסאות ישנות קודם). הורץ בפועל בסבב הזה — לא רק נכתב.<br>
  *English:* One-command build/validation script — validates manifest+locale JSON, runs `node --check` on every JS file, confirms all 4 icon sizes exist, confirms every `__MSG_*__` placeholder resolves in both languages, and repackages a single root ZIP (deleting stale versioned ZIPs first). Actually executed this round, not just written.
- **CSP hardening:** נוסף `base-uri 'self'` ל-`content_security_policy.extension_pages` ב-`manifest.json`, בנוסף ל-`script-src`/`object-src` הקיימים — מונע הזרקת `<base>` tag שתשנה יעד URLs יחסיים בדפי התוסף.<br>
  *English:* Added `base-uri 'self'` to the manifest's extension-pages CSP alongside the existing `script-src`/`object-src`, closing off `<base>`-tag injection as a way to redirect relative URLs on extension pages.

### שונה / Changed
- גרסה 0.5.0 → 0.6.0 ב-`manifest.json`, ה-badge בפופאפ, `brand.css`, `SPEC.md`, `README.md`, `PRIVACY.md`, `EULA.md` — כולם בפעולה אחת, לפי כלל סנכרון הגרסה המלא.<br>
  *English:* Version bumped 0.5.0 → 0.6.0 across `manifest.json`, the popup version badge, `brand.css`, `SPEC.md`, `README.md`, `PRIVACY.md`, `EULA.md` — synchronized in one pass, per the hard version-sync rule.
- **`TabToTable-AI-v0.5.0.zip` הוחלף ב-`TabToTable-AI-v0.6.0.zip`** — נבנה מחדש בפועל דרך `build/build.ps1` (לא רק שינוי שם), מכיל רק את 16 הקבצים הדרושים בזמן ריצה (אין `.md`, אין `site/`, אין `store/`, אין `build/`).<br>
  *English:* `TabToTable-AI-v0.5.0.zip` replaced with a freshly rebuilt `TabToTable-AI-v0.6.0.zip` (not just renamed) — contains only the 16 runtime files, no docs/site/store/build folders.

## [0.5.0] — 2026-09-14
### שונה — שדרוג מבני מלא לתקן הארגוני (`_AUDIT/STANDARDS.md`)
- **מבנה תיקייה חדש:** `manifest.json` עבר לשורש הפרויקט; קוד המקור אורגן תחת `src/background/`, `src/popup/`, `src/options/`, `src/results/`, `src/shared/` (במקום תיקיית `extension/` שטוחה אחת). אייקונים ל-`assets/icons/`, דף הנחיתה ל-`site/`.
- **i18n אמיתי דרך `_locales/`:** הוחלף המנגנון הידני (`uiLang` בלבד ב-JS) ב-`_locales/en/messages.json` + `_locales/he/messages.json` תקניים של Chrome — משמשים גם את שדות ה-manifest (`__MSG_appName__`/`__MSG_appDesc__`) וגם, דרך `src/shared/i18n.js` חדש שטוען את אותם קבצים בזמן ריצה, מאפשרים מתג שפה חי בתוך הפופאפ/הגדרות/תוצאות (74 מפתחות מתורגמים, מאומת שאין מפתח חסר בשתי השפות).
- **ברירת מחדל: אנגלית** (במקום עברית) — בכל הדפים (popup/options/results) ובmanifest (`default_locale: "en"`), בהתאם לכלל האחיד של הפרויקט.
- **הודעות שגיאה דו-לשוניות:** כל השגיאות שנזרקות מ-`background.js` (מפתח לא תקין, מכסה, שגיאות רשת/API) עכשיו נבחרות לפי `settings.uiLang` במקום להיות קבועות בעברית.
### נוסף
- **`PRIVACY.md`** — מדיניות פרטיות מלאה: אילו נתונים נקראים, לאן נשלחים (רק Anthropic, ישירות מהדפדפן), הצהרת תאימות ל-Limited Use של Anthropic, ואיפה הכול מאוחסן. נדרש לפני דדליין אכיפת Chrome Web Store ב-1.8.2026.
- **`EULA.md`** — הסכם רישיון קצר (AS IS, ללא אחריות, אחריות המשתמש על מפתח ה-API שלו).
- **קישורי "משפטי"** (Privacy/EULA) בתחתית דף ההגדרות.
- **`DELETIONS.md`** — יומן מחיקות קבצים לפי כלל העבודה הקשיח.
- **`dir="auto"`** בשדות טקסט חופשיים (הקשר בפופאפ/הגדרות, חיפוש בתוצאות) — מונע "קפיצת צד" בהקלדת טקסט מעורב עברית/אנגלית.
- **`focus-visible` גלובלי** על כפתורים, קישורים, שדות טווח (range), ותוויות segmented — ניווט מקלדת מלא ונראה בכל שלושת המסכים.
- **`store/LISTING.md`** — תיאור מוכן לחנות Chrome Web Store, עברית+אנגלית (טרם צילומי מסך).
- **`README.md`** מאוחד ודו-לשוני (he+en) — מחליף את `INSTALL.md` ו-`extension/README.md`.
### תוקן
- **`<html dir>` דינמי:** `direction: inherit` ב-`brand.css` במקום `rtl` קשיח — עוקב אחרי `dir` שנקבע ב-JS לפי שפת הממשק בפועל, לא נעול לעברית.
- **מיון בטבלת תוצאות:** `Intl.Collator` לפי שפת הממשק בפועל במקום `localeCompare('he')` קשיח.
- **תאריכים/שעות בהיסטוריה ותוצאות:** `Intl` locale דינמי (`he-IL`/`en-US`) לפי שפת ממשק, לא `he-IL` קשיח.
### הוסר
- `INSTALL.md`, `PROJECT.md`, `extension/README.md` — מוזגו/הוחלפו, ראו `DELETIONS.md` לפירוט מלא.
- הרשאת `activeTab` מיותרת מ-`manifest.json` (כבר מכוסה על ידי `tabs`+`<all_urls>`).

## [0.4.0] — 2026-09-14
### אבטחה
- **CSP מפורשת ב-manifest:** `script-src 'self'; object-src 'self'` — הצהרת מדיניות אבטחה מפורשת לדפי התוסף (Manifest V3).
- **פתיחת הגדרות אוטומטית בהתקנה:** `chrome.runtime.onInstalled` בודק שמפתח API מוגדר — אם לא, פותח את דף ההגדרות אוטומטית.
### נוסף
- **שפת ממשק (he/en):** הגדרת ממשק Hebrew/English — כפתורים, תצוגת מכסה, כותרות, הודעות שגיאה, שדה חיפוש — הכל מתורגם בהתאם.
- **הקשר ברירת מחדל:** שדה בהגדרות שמולא מראש בתיבת הפופאפ — ניתן לשינוי לפני כל סריקה.
- **גודל טקסט בטבלה:** בחירת small/בינוני/large לתצוגת הטבלה בדף התוצאות.
- **keyboard focus לmodel-cards:** `tabindex="0"`, `role="radio"`, `aria-checked`, Enter/Space ייבחרו כרטיס.
- **Accent bar בפופאפ:** רצועה ויזואלית בגוון הזהב בחלק העליון — משפרת זיהוי מיתוגי.
- **`kbd` component ב-brand.css:** סטייל לכפתורי קיצורי מקלדת.
- **`DEFAULT_SETTINGS` ב-background.js:** אובייקט הגדרות ברירת מחדל מרוכז.
### שונה
- גרסה 0.4.0 ב-manifest.json ובadge הפופאפ.

## [0.3.1] — 2026-09-14
### תוקן
- **XSS prevention:** שמות עמודות מ-Claude API מוכנסים עכשיו דרך DOM (`createTextNode`) ולא `innerHTML`.
- **`lastScanEl` popup:** מבנה DOM methods במקום `innerHTML` עם נתוני תאריך/זמן.
- **`chrome.runtime.lastError`:** הוסיפו guard ב-`GET_TAB_COUNT` ו-`GET_HISTORY` callbacks.
- **row normalization:** `normalizeTable()` ב-background — שורות עם מספר תאים שונה מהעמודות נחתכות/ממולאות אוטומטית.
- **`maxTabs` fallback:** שימוש ב-`?? DEFAULT_MAX_TABS` במקום `||` (מניעת התנהגות לא צפויה עם ערך 0).
- **`lastModel` saved:** background שומר איזה מודל השתמש בסריקה, מוצג בשורת ה-meta.
### נוסף
- **כפתור הצג/הסתר API key** בהגדרות (👁/🙈).
- **Validate פורמט מפתח** לפני שמירה/בדיקה — חייב להתחיל ב-`sk-ant-` ולהיות לפחות 40 תווים.
- **כפתור "בדוק חיבור"** — שולח בקשה קצרה ל-Haiku ומחזיר ✓/✗ ישירות בממשק (ללא alert).
- **פידבק inline** בכל פעולות אזור המסוכן — ללא `alert()`.
- **כפתור `✕` לסגירת פאנל היסטוריה** בדף התוצאות.
- **כפתור ניקוי חיפוש (✕)** מופיע כשיש טקסט בשדה החיפוש.
- **כפתור "🖨 הדפסה"** בדף התוצאות, עם @media print שמסתיר כפתורי פעולה.
- **כפתור העתקת URL** (⎘) ליד כל קישור בטבלה — לחיצה מעתיקה את ה-URL ללוח.
- **Keyboard accessibility:** `tabindex=0` + `Enter`/`Space` על כותרות עמודות לצורך מיון.
- **Escape בשדה חיפוש** — מנקה את החיפוש ומחזיר מיקוד.
- **שם המודל ב-meta** של דף התוצאות (Sonnet / Haiku).
- **CSS `@media print`** — הסתרת פאנלים לא רלוונטיים בהדפסה.

## [0.3.0] — 2026-09-13
### נוסף
- **ספירת לשוניות חיה בפופאפ** — chip מראה כמה לשוניות מוכנות לסריקה עוד לפני הלחיצה.
- **"סריקה קודמת" בפופאפ** — מציג מתי בוצעה הסריקה האחרונה עם קישור מהיר לתוצאות.
- **Enter מפעיל סריקה** — מקש Enter בשדה ההקשר מבצע סריקה מיידית.
- **בורר מודל AI בהגדרות** — בחירה בין Claude Sonnet 5 (מומלץ) ל-Claude Haiku 4.5 (מהיר+זול).
- **שפת הטבלה** — בחירה בין אוטומטי / עברית / English; התוסף מנחה את Claude בהתאם.
- **מגבלת לשוניות** — סליידר בהגדרות לקביעת כמות הלשוניות המקסימלית לסריקה (5–40).
- **תמה** — בחירה בין מערכת / בהיר / כהה; משפיעה על כל מסכי התוסף.
- **אזור מסוכן בהגדרות** — כפתורים לאיפוס מכסה, מחיקת היסטוריה, ומחיקת כל הנתונים.
- **מיון עמודות בטבלה** — לחיצה על כותרת עמודה ממיינת לפי א-ב / 0-9, לחיצה שנייה הופכת.
- **חיפוש חי בטבלה** — שדה חיפוש מסנן שורות בזמן אמת, עם מונה שורות גלוי/סה"כ.
- **קליק להעתקת תא** — לחיצה על כל תא מעתיקה את תוכנו ללוח עם Toast הודעה.
- **ייצוא Markdown** — כפתור "Markdown" מעתיק את הטבלה כולה בפורמט Markdown ללוח.
- **היסטוריית 5 סריקות** — כפתור "היסטוריה" בדף התוצאות מציג את 5 הסריקות האחרונות; לחיצה על כל פריט טוענת את הטבלה ההיסטורית.
### שונה
- background.js קורא הגדרות (`settings`) מהאחסון המקומי ומשתמש ב-model/maxTabs/language שנבחרו.

## [0.2.0] — 2026-09-13
### שונה
- שדרוג עיצובי מלא לכל מסכי התוסף (פופאפ, הגדרות, תוצאות) כדי שיתאימו לזהות הוויזואלית של דף הנחיתה: פונטים (Assistant + IBM Plex Mono), צבע הדגשה ענברי (`#F0A202`), תמיכה אוטומטית ב-Light/Dark לפי `prefers-color-scheme`.
- כל שלושת המסכים משתפים כעת קובץ עיצוב אחד — `extension/brand.css` — במקום עיצוב כפול בכל קובץ HTML בנפרד.
- הפופאפ מציג כעת פס התקדמות ויזואלי למכסה החודשית (לא רק טקסט), ומצב טעינה (spinner) על הכפתור בזמן סריקה — במקום רק נעילת הכפתור.
- מסך ההגדרות מציג כעת גם סיכום ניצול מכסה.
### תוקן
- **מספר הגרסה ב-`manifest.json` היה תקוע על 0.1.0** למרות שינויי 0.1.1/0.1.2 בפועל — לא עודכן בזמנו. תוקן ומסונכרן כעת ל-0.2.0.

## [0.1.2] — 2026-09-13
### תוקן
- תשובה חתוכה מ-Claude (`max_tokens` נמוך מדי) גרמה לפעמים ל-JSON לא תקין ולשגיאה לא ברורה. הועלה ל-8192 טוקנים, ונוספה הודעת שגיאה ברורה כש-`stop_reason` הוא `max_tokens` ("נסה עם פחות לשוניות").
- חוסן בפענוח תשובת ה-API — סינון רק בלוקים מסוג `text` (מנע הזרקת `undefined` לתשובה).
- שגיאת רשת (למשל דפדפן לא מחובר) הייתה מוצגת כשגיאת JS גולמית — עכשיו הודעה ברורה בעברית.
- נוספה הודעה ייעודית לשגיאת 429 (rate limit) מ-Anthropic.

## [0.1.1] — 2026-09-10
### נוסף
- אייקונים אמיתיים לתוסף (16/48/128px), במקום אייקון ברירת מחדל של כרום.
- מכסת שימוש חינמית חודשית: 150 לשוניות סריקה, נספרת ומתאפסת אוטומטית מדי חודש (`chrome.storage.local`), מוצגת בפופאפ ("X/150 נותרו").
- חסימת סריקה כשחורגים מהמכסה, עם הודעה על תוכנית "מחקר עומק" עתידית בתשלום.

## [0.1.0] — 2026-09-10
### נוסף — גרסת MVP ראשונה
- תוסף כרום (Manifest V3) שסורק את כל הלשוניות הפתוחות בחלון הנוכחי (עד 40).
- חילוץ תוכן מכל לשונית: כותרת, תיאור מטא, כותרות H1/H2, טקסט גוף (עד 4,000 תווים).
- שליחת התוכן ל-Claude API (`claude-sonnet-5`) ובניית טבלת השוואה בפורמט JSON (`columns` + `rows`).
- מסך תוצאות (`results.html`) עם טבלה, קישורים חיים לכל מקור, וייצוא ל-CSV (תואם עברית/RTL).
- מסך הגדרות לשמירת מפתח Anthropic API מקומית בלבד.

---

## תבנית לשימוש עתידי

```
## [x.y.z] — YYYY-MM-DD
### נוסף
- ...
### שונה
- ...
### תוקן
- ...
```

**תזכורת:** כל שדרוג גרסה חייב לכלול עדכון גם ב-[PROJECT.md](PROJECT.md) (מספר גרסה נוכחית) וגם בדף הנחיתה אם השינוי משפיע על תכונות/תמחור המוצג שם.
