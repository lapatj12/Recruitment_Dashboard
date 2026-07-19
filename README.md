# HR Analytics Dashboards

Static HR dashboards (HTML/CSS/JS) using [Chart.js](https://www.chartjs.org/) for charts and [SheetJS](https://sheetjs.com/) to read Excel files **directly in the browser**. No backend, no database, no CSV export step — HR just replaces the 2 original master Excel files each month.

```
hr-dashboards/
├── index.html                     ← Gateway page (choose a dashboard)
├── permanent.html                  ← Permanent Recruitment Dashboard
├── subcontract.html                ← Subcontract Overview Dashboard
├── css/style.css
├── js/
│   ├── common.js                   ← shared helpers (filters, formatting, EN translation lookup)
│   ├── data-loader.js              ← reads & parses the 2 Excel files in-browser
│   ├── permanent.js
│   └── subcontract.js
└── data/
    ├── Recruitment_Requisition.xlsx   ← master file for Permanent Recruitment
    └── Subcontract_Overview.xlsx      ← master file for Subcontract Overview
```

## ⚠️ Important — read before deploying

Both dashboards now read the **original master Excel files** directly (via SheetJS, in the visitor's browser). This means the full spreadsheets — including any sensitive columns not shown on-screen, such as national ID numbers, phone numbers, emails and salary in `Subcontract_Overview.xlsx` — physically sit inside the `data/` folder of the repository. The dashboard code only *displays* a filtered subset of columns, but anyone with access to the repository can download the raw `.xlsx` file directly and open every column in Excel.

**Because of this, the repository must be set to Private on GitHub.** This is no longer just a recommendation — with the old CSV-only approach the sensitive columns were stripped out before upload, so a public repo was lower-risk; with this simpler 2-file approach, the safety of that data depends entirely on the repository's access setting.

If you'd prefer the previous approach (5 pre-cleaned CSV files, safe even in a public repo, but requiring a monthly export step from HR), let us know and we can switch back — it's a small change.

## Deploying to GitHub Pages

1. Create a new GitHub repository — **set it to Private**.
2. **Extract the zip file first**, then upload everything *inside* the `hr-dashboards` folder (not the zip itself) — drag the whole folder into "Add file → Upload files" and GitHub will preserve the `css/`, `js/`, and `data/` subfolders automatically.
3. Go to **Settings → Pages**, set Source to branch `main`, folder `/ (root)`, and Save.
4. Wait 1–2 minutes for the site URL, e.g. `https://<username>.github.io/<repo-name>/`.

> Note: GitHub Pages on a Private repository requires GitHub Pro/Team/Enterprise. If you're on a free personal account, consider Netlify or Vercel instead (both support private static sites on free tiers) — the same folder can be dragged in directly.

## Monthly data update (no CSV export needed)

1. Open the same 2 Excel files you already maintain (`Recruitment_Requisition.xlsx` and `Subcontract_Overview.xlsx`) and update them as usual for the month.
2. On GitHub, go into the `data/` folder and click **"Add file → Upload files"**.
3. Drag in the updated file(s), **keeping the exact same filename** as before, so it overwrites the old version.
4. Click **Commit changes**.
5. Refresh the dashboard — the new numbers, charts and tables appear immediately. No code changes, no CSV conversion, no waiting for a rebuild.

### What must stay the same in the Excel files

For the dashboards to keep reading the data correctly, please don't rename or restructure these (adding new *rows* is always fine):

**Recruitment_Requisition.xlsx**
- Sheet must still be named `Recruitment`
- Column headers unchanged: `Year, Month, Location, Position_Request, Position_Announce, Type, Recruitment Status, Approved_Date, Target_Date, Final Date, Diff Date, KPI, Recruitment Channel`
- `Type` column values limited to `O-General`, `S-General`, `S-Special`

**Subcontract_Overview.xlsx**
- Sheets must stay named exactly: `Recruitment`, `Turnover`, `Turnover_Graph`, `รายชื่อพนักงาน Manpower`, `รายชื่อพนักงาน HRD`
- `company` column values: `Manpower` or `HRD` (both map automatically to "HR Digest" for display)
- The `Turnover_Graph` sheet's summary table must stay in its current position (columns P–Y, header row 3, data starting row 4) since the dashboard reads that exact cell range

If a sheet or column is renamed, that section of the dashboard will simply show no data (it won't crash) — just rename it back or let us know and we'll update the parser.

## Automatic English translation of data values

Department, division, position and reason-for-leaving values that are recorded in Thai in the source spreadsheets are automatically translated to English for display, using a lookup table built from the current data (e.g. "ฝ่ายผลิต - นวนคร" → "Production Division - Nava Nakorn"). Employee names are **not** translated — real names are left as-is.

If next month's file introduces a brand-new department/position name not seen before, it will simply display in Thai (safe fallback, nothing breaks) until the lookup table is extended — just send us the updated file and we'll add the new terms.

## Additional recommended metrics (already built in)

- **Permanent:** Avg. Time-to-Hire (5th KPI card), Time-to-Hire by location, monthly status trend
- **Subcontract:** Avg. lead time per service provider, headcount by division/company, tenure distribution of leavers, top resignation reasons

Possible future additions (not yet built, would need more source data):
- **SLA Compliance %** for Permanent, if a target-SLA column is added
- **90/180-day Retention Rate** for Subcontract, if early-leaver dates are tracked
- **Cost per Hire**, if recruitment spend by channel is tracked

## Design assumptions

- "On Screening" (Permanent) = `Screening` + `Final Interview` statuses combined
- "Total Requisition" (Permanent) = all positions matching the current filter, any status
- Recruitment Channel chart counts Effective positions only (channels that actually resulted in a hire)
- Monthly turnover rate uses the pre-computed figures from the `Turnover_Graph` sheet (matches what HR already reports) rather than recalculating from individual records
