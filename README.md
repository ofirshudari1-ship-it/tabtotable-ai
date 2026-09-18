# TabToTable AI

*A Chrome extension that turns every open tab into one AI-built comparison table.*
*תוסף כרום שהופך כל לשונית פתוחה לטבלת השוואה אחת בבניית AI.*

Version 0.6.0 · Manifest V3 · Not yet published (developer-mode install only) — see [SPEC.md](SPEC.md).

---

## English

### What it does

Click the extension icon, optionally describe what you're comparing, and TabToTable AI reads every open `http(s)` tab in the current window, sends the content to Claude, and opens a new tab with a clean comparison table — sortable, searchable, exportable to CSV/Markdown.

### Install (developer mode — the extension is not yet in the Chrome Web Store)

1. Open `chrome://extensions` and turn on **Developer mode** (top-right toggle).
2. Click **Load unpacked**.
3. Select the **root folder of this project** (`TabToTable-AI/` — the one containing `manifest.json`), not a subfolder.
4. The extension appears in your list with its icon. Pin it to the toolbar via the puzzle-piece icon next to the address bar.

### Set up your API key

1. Click the extension icon → **Settings**.
2. If you don't have an Anthropic API key yet, create one at [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys).
3. Paste it (starts with `sk-ant-...`) and click **Save key**. Optionally click **Test connection** to verify it works.

Your key is stored only in `chrome.storage.local` and sent only, directly, to `api.anthropic.com` — see [PRIVACY.md](PRIVACY.md).

### First use

1. Open a few tabs you want to compare (e.g. 3-5 competitor sites).
2. Click the extension icon.
3. (Optional) Type a short context line, e.g. "Compare pricing across CRM tools."
4. Click **Build table from open tabs**.
5. A new tab opens with the table in a few seconds. Export to CSV or copy as Markdown from there.

### Settings available

Interface language (English/Hebrew), table output language (auto/Hebrew/English), AI model (Sonnet 5 / Haiku 4.5), tab scan limit (5-40), default context text, table font size, theme (system/light/dark), and data controls (reset quota, clear history, delete all data).

### Update after a code change

`chrome://extensions` → click the refresh icon (⟳) on the TabToTable AI card. A full reinstall is only needed if `manifest.json` permissions changed.

### Uninstall

`chrome://extensions` → **Remove**. This deletes your saved API key and local results — everything is stored only in the extension's own local storage.

### Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "No API key set" | Key was never saved, or was cleared on reinstall | Go to Settings and save it |
| "Invalid API key" | Typo, expired key, or no credit on the Anthropic account | Check the key at console.anthropic.com |
| "Could not scan this page" next to a tab | Protected page (`chrome://`, local PDF, extension store) | Expected — that page is just skipped |
| "You have used your free monthly quota" | Over 150 tabs scanned this month | Wait for next month's reset, or close some tabs first |
| Network / "Could not connect" error | No internet, or Anthropic API temporarily down | Check connection and retry |

Full technical details: [SPEC.md](SPEC.md). Data handling: [PRIVACY.md](PRIVACY.md). License terms: [EULA.md](EULA.md).

---

## עברית

### מה זה עושה

לוחצים על אייקון התוסף, אופציונלית מתארים מה משווים, ו-TabToTable AI קורא כל לשונית `http(s)` פתוחה בחלון הנוכחי, שולח את התוכן ל-Claude, ופותח לשונית חדשה עם טבלת השוואה מסודרת — ניתנת למיון, חיפוש, וייצוא ל-CSV/Markdown.

### התקנה (מצב מפתח — התוסף עדיין לא בחנות Chrome Web Store)

1. פתחו את `chrome://extensions` והפעילו **מצב מפתח** (Developer mode, מתג בפינה הימנית העליונה).
2. לחצו על **Load unpacked** (טען ללא הרחבה).
3. בחרו את **תיקיית השורש של הפרויקט** (`TabToTable-AI/` — זו שמכילה את `manifest.json`), לא תת-תיקייה.
4. התוסף יופיע ברשימה עם האייקון שלו. הצמידו אותו לסרגל הכלים דרך אייקון הפאזל ליד שורת הכתובת.

### הגדרת מפתח API

1. לחצו על אייקון התוסף ← **הגדרות**.
2. אם אין לכם מפתח Anthropic עדיין — צרו אחד ב-[console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys).
3. הדביקו אותו (מתחיל ב-`sk-ant-...`) ולחצו **שמור מפתח**. אופציונלית לחצו **בדוק חיבור** לוודא שהוא עובד.

המפתח נשמר רק ב-`chrome.storage.local` ונשלח רק, ישירות, ל-`api.anthropic.com` — ראו [PRIVACY.md](PRIVACY.md).

### שימוש ראשון

1. פתחו כמה לשוניות שרוצים להשוות (למשל 3-5 אתרי מתחרים).
2. לחצו על אייקון התוסף.
3. (אופציונלי) כתבו שורת הקשר קצרה, למשל "השוואת תמחור בין כלי CRM".
4. לחצו **בנה טבלה מהלשוניות הפתוחות**.
5. תוך מספר שניות תיפתח לשונית חדשה עם הטבלה. אפשר לייצא ל-CSV או להעתיק כ-Markdown משם.

### הגדרות זמינות

שפת ממשק (עברית/אנגלית), שפת פלט הטבלה (אוטומטי/עברית/אנגלית), מודל AI (Sonnet 5 / Haiku 4.5), מגבלת לשוניות לסריקה (5-40), טקסט הקשר ברירת מחדל, גודל טקסט בטבלה, תמה (מערכת/בהיר/כהה), ובקרות נתונים (איפוס מכסה, מחיקת היסטוריה, מחיקת כל הנתונים).

### עדכון אחרי שינוי קוד

`chrome://extensions` ← לחצו על אייקון הרענון (⟳) בכרטיס TabToTable AI. התקנה מחדש מלאה נדרשת רק אם הרשאות `manifest.json` השתנו.

### הסרה

`chrome://extensions` ← **Remove**. זה מוחק את מפתח ה-API השמור והתוצאות המקומיות — הכול שמור רק באחסון המקומי של התוסף עצמו.

### פתרון תקלות נפוצות

| תופעה | סיבה סבירה | פתרון |
|---|---|---|
| "לא הוגדר מפתח API" | לא נשמר מפתח, או שנמחק בהתקנה מחדש | עברו להגדרות ושמרו אותו |
| "מפתח API לא תקין" | שגיאת הקלדה, מפתח שפג תוקפו, או אין יתרה בחשבון | בדקו את המפתח ב-console.anthropic.com |
| "לא ניתן היה לסרוק דף זה" ליד לשונית | דף מוגן (`chrome://`, PDF מקומי, חנות התוספים) | תקין — הדף פשוט יידלג |
| "עברת את מכסת הלשוניות החינמית החודשית" | נצרכו מעל 150 לשוניות החודש | המתינו לאיפוס החודש הבא, או סגרו לשוניות |
| שגיאת רשת / "לא ניתן להתחבר" | אין אינטרנט, או Anthropic API זמנית לא זמין | בדקו חיבור ונסו שוב |

פירוט טכני מלא: [SPEC.md](SPEC.md). טיפול בנתונים: [PRIVACY.md](PRIVACY.md). תנאי רישיון: [EULA.md](EULA.md).
