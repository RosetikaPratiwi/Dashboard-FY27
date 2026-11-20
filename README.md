# Contract Monitoring Dashboard FY27

Static website (HTML, CSS, JS, Chart.js). `index.html` is the sign-in page and `dashboard.html` is the dashboard. It reads `data/data.json` and refreshes itself every 10 minutes.
`data/data.json` holds the **real** data converted from the Excel dashboard (`python scripts/excel_to_json.py <file.xlsm> data/data.json`). `scripts/make_dummy_data.py` makes safe dummy data instead.

## Daily update from the Excel file on SharePoint
GitHub Pages cannot read SharePoint directly (it needs a login). The update path is Excel -> `data/data.json` -> GitHub:

1. **Windows Task Scheduler (simplest).** Sync the SharePoint library to your PC with OneDrive, then schedule daily:
   `scripts\update.bat "C:\...\Dashboard_Kontrak_FY27.xlsm"`. It converts the workbook, commits and pushes; the site updates in about 1 minute.
   Needs Python + `pip install openpyxl`, Git, and a PC that is on at that time.
2. **Power Automate (no PC needed).** A scheduled flow reads the SharePoint file and updates `data/data.json` in the repo through the GitHub connector. Your IT team must allow it.

## Login
`index.html` asks for a username and password; `dashboard.html` redirects back to it when nobody is signed in. Sessions last 8 hours or until the tab is closed, and 5 wrong attempts lock the form for 30 seconds.
Initial account: **admin** / **Dashboard@FY27** - change it before publishing:
`python scripts/make_user.py <username>` prints a line to paste into `USERS` in `js/auth.js` (delete the `admin` line you no longer want).
Note: this is a front-door gate only. On a static host the checks run in the browser, and `data/data.json` is still a public file. Use real access control (for example a private site on your intranet or SSO) if the data must stay confidential.

## Publish
GitHub Desktop -> push -> Settings -> Pages -> Deploy from branch `main` / root.

## Privacy
The login does not hide the data file (see above). This site contains real customer, value and PIC data from the Excel dashboard. The data owner confirmed that it is meant to be readable by everyone, so a public repo and public GitHub Pages are fine.
