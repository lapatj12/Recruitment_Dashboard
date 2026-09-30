# HR Analytics Dashboards

Static HR dashboards (HTML/CSS/JS) using [Chart.js](https://www.chartjs.org/) for charts and [SheetJS](https://sheetjs.com/) to read Excel files **directly in the browser**. No backend, no database, no CSV export step — HR just replaces the 2 original master Excel files each month.

```
hr-dashboards/
├── index.html                     ← Gateway page (choose a dashboard)
├── permanent.html                  ← Permanent Recruitment Dashboard (5 tabs)
├── subcontract.html                ← Subcontract Overview Dashboard (4 tabs)
├── css/style.css
├── js/
│   ├── common.js                   ← shared helpers (filters, formatting, EN translation lookup)
│   ├── data-loader.js              ← reads & parses the 3 Excel files in-browser
│   ├── permanent.js
│   └── subcontract.js
└── data/
    ├── Recruitment_Requisition.xlsx              ← master file for Permanent Recruitment
    ├── Recruitment_Service_Quality_Evaluation.xlsx ← master file for the Satisfaction tab
    └── Subcontract_Overview.xlsx                  ← master file for Subcontract Overview
```

## ⚠️ Important — read before deploying

Both dashboards now read the **original master Excel files** directly (via SheetJS, in the visitor's browser). This means the full spreadsheets — including any sensitive columns not shown on-screen, such as national ID numbers, phone numbers, emails and salary in `Subcontract_Overview.xlsx` — physically sit inside the `data/` folder of the repository. The dashboard code only *displays* a filtered subset of columns, but anyone with access to the repository can download the raw `.xlsx` file directly and open every column in Excel.

**Because of this, the repository must be set to Private on GitHub.** This is no longer just a recommendation — with the old CSV-only approach the sensitive columns were stripped out before upload, so a public repo was lower-risk; with this simpler 2-file approach, the safety of that data depends entirely on the repository's access setting.

If you'd prefer the previous approach (5 pre-cleaned CSV files, safe even in a public repo, but requiring a monthly export step from HR), let us know and we can switch back — it's a small change.

## Filter dropdown: Select All / Clear

Every multi-select filter across both dashboards (Location, Position, Company, Division, etc.) now has **"Select All"** and **"Clear"** links at the top of its dropdown panel. This makes "everything except one or two items" easy — select all, then uncheck just the ones you don't want — instead of clicking every checkbox individually.

## Deploying to GitHub Pages

1. Create a new GitHub repository — **set it to Private**.
2. **Extract the zip file first**, then upload everything *inside* the `hr-dashboards` folder (not the zip itself) — drag the whole folder into "Add file → Upload files" and GitHub will preserve the `css/`, `js/`, and `data/` subfolders automatically.
3. Go to **Settings → Pages**, set Source to branch `main`, folder `/ (root)`, and Save.
4. Wait 1–2 minutes for the site URL, e.g. `https://<username>.github.io/<repo-name>/`.

> Note: GitHub Pages on a Private repository requires GitHub Pro/Team/Enterprise. If you're on a free personal account, consider Netlify or Vercel instead (both support private static sites on free tiers) — the same folder can be dragged in directly.

## Monthly data update (no CSV export needed)

1. Open the same Excel files you already maintain and update them as usual for the month:
   - `Recruitment_Requisition.xlsx`
   - `Subcontract_Overview.xlsx`
   - `Recruitment_Service_Quality_Evaluation.xlsx` (the satisfaction survey export — new responses just need to be appended as new rows; existing rows/columns should stay in place)
2. On GitHub, go into the `data/` folder and click **"Add file → Upload files"**.
3. Drag in the updated file(s), **keeping the exact same filename** as before, so it overwrites the old version.
4. Click **Commit changes**.
5. Refresh the dashboard — the new numbers, charts and tables appear immediately. No code changes, no CSV conversion, no waiting for a rebuild.

### Permanent Recruitment dashboard tabs
The Permanent Recruitment page is organized into 4 tabs along the top: **Overview** (KPI cards, KPI Performance donuts, status trend, and time-to-hire), **Satisfaction**, **Positions**, and **Analytics**. The Location/Year/Month/Status/KPI filter bar applies to every tab except Satisfaction, which has its own Position/Month filter (since it comes from a separate survey file, not tied to individual requisitions).

The **Positions** tab has its own Position filter and a Satisfaction column — click any row to see a combined detail view (KPI, time-to-hire, and any matching Satisfaction survey feedback for that exact position). The match is by exact position name (trimmed, case-insensitive) between the two files, so keeping position names consistent between `Recruitment_Requisition.xlsx` and `Recruitment_Service_Quality_Evaluation.xlsx` gives the most complete linking.

### What must stay the same in the Excel files

For the dashboards to keep reading the data correctly, please don't rename or restructure these (adding new *rows* is always fine):

**Recruitment_Requisition.xlsx**
- Sheet must still be named `Recruitment`
- Column headers unchanged: `Year, Month, Location, Position_Request, Position_Announce, Type, Recruitment Status, Approved_Date, Target_Date, Final Date, Diff Date, KPI, Recruitment Channel, Division, Dept`
- `Type` column values limited to `O-General`, `S-General`, `S-Special`

**Recruitment_Service_Quality_Evaluation.xlsx**
- Keep the question headers containing "2.1", "2.2" (Recruitment Quality questions) and "3.1", "3.2" (Service questions) somewhere in their text — the dashboard finds each question column by looking for these markers, so exact wording can change but these numbers must stay
- Keep the `ตำแหน่งที่สรรหา`, `Start time` column headers as-is
- Respondent **Name** and **Email** columns are intentionally not read or displayed by the dashboard

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

## Larger text on Permanent (for report screenshots)

KPI card values, panel headers, donut labels, table text and in-chart text (axis labels, data labels) are all larger on the Permanent dashboard — scoped via a `body.page-permanent` CSS class and a page-local `Chart.defaults.font.size` override, so **Subcontract is unaffected**.

## Recruitment tab redesign, round 2 — matching a reference mockup

Adjusted again to match a specific visual reference (modern KPI cards, a monthly bar chart, a donut, a recent-activity table):

- **KPI cards**: Total Requisition, On Process Recruitment (status ≠ "เริ่มงานแล้ว"), Hired, Avg. Hire Time. "Offer Acceptance Rate" from the reference was **not** built — there's no Offer Date/Status data in the source file yet, so it was dropped rather than faked (per direct confirmation). No month-over-month trend arrows either, since the sample size (~22 positions/year) would make those noisy.
- **Joining Per Month** — a simple bar chart of positions started, by month.
- **On-KPI vs Over-KPI** — the SLA breakdown is now a donut (matching the same green/red visual language as the Permanent dashboard's KPI donuts, via a `buildDonutSVG` helper moved to the shared `common.js` so both dashboards can use it), with a per-company %Over-KPI breakdown underneath.
- **Latest Recruitment List** — a table of the 10 most recently started positions (position, work unit, company, lead time, start date, status pill).
- The Recruitment Funnel Overview and the standalone SLA Benchmark Compliance bar chart from the previous round were replaced by the above.

## Recruitment tab redesign — executive dashboard brief

Rebuilt per a specific design brief for a "Recruitment Performance Dashboard":

- **KPI cards**: Total Requisitions, Screening, Interview, Avg. Lead Time. Since this data is per-requisition (not per-candidate), **Screening** and **Interview** are proxied from whether a position has a Return Date / Interview Date on record — not a candidate headcount. This is stated directly in the code comments and matches how the rest of this dashboard is built (no fabricated fields).
- **Recruitment Funnel Overview** — a new horizontal bar showing how many requisitions reached each stage (Requisitions → Screening → Interview → Confirmed → Started), doubling as the "bottleneck" view the brief asked for.
- **Time-to-Hire by Company** (renamed from "Avg. Lead Time") — the primary chart. Per the brief, this one chart uses **KPI-status coloring** (blue if the average meets the 14-day target, red if it doesn't) instead of the company-color scheme used everywhere else on this dashboard, plus a dashed "KPI Target (14 Days)" reference line.
- **Sourcing Status by Company** and **SLA Benchmark Compliance** (renamed from "Recruitment SLA Breakdown") kept as-is, just relabeled per the brief's wording guidance.
- **Ideas to Extend This Report** — originally included a panel on two value-adds (Source of Hire, Offer Acceptance Rate) that weren't built since the underlying columns don't exist yet; removed per follow-up feedback to keep the tab focused.
- **Division filter** added to this tab's filter bar (Company/Division/Status/Year), matching the brief's filter requirements.

## Color consistency, data-source transparency & pipeline timeline (Subcontract)

- **Color consistency**: Manpower and HR Digest now use exactly one color each (teal / violet) everywhere they appear — the headcount donut, all KPI cards, the Employee List pills, the Lead Time chart, and the Reasons-by-Company chart. Previously HR Digest drifted between blue and violet in different places.
- **"Where these numbers come from"**: a collapsible note under the Current Overview KPI cards spells out exactly which sheet, which rows, and whether a year/company filter applies for each number (headcount fields vs. the Net Headcount Change calculation), so the source is never a mystery.
- **Recruitment Lead Time redefined**: now measures **Send JD → Start Date** (the full recruitment cycle) using the `Diff Send jd to Start Date` column, replacing the previous request→confirmed metric everywhere it appeared (the KPI card, the by-company chart, and the SLA breakdown). A few source rows have an invalid (blank-date or negative) figure here — those are excluded from the average rather than distorting it.
- **Recruitment Lead Time, redefined again**: now measures **Send JD → Confirmed Date** using the `Diff Date to Confirmed` column (per further feedback, replacing the earlier Send JD → Start Date version everywhere it appeared — the KPI card, the by-company chart with its 14-day SLA reference line, and the SLA breakdown). Only rows where "Confirmed Date" is actually filled in count — the source formula falls back to today's date when it's blank, which isn't a real duration and would badly inflate the average. Right now that's a small fraction of requests (the KPI card shows exactly how many, e.g. "1 of 22 confirmed"); this will fill out as HR records more Confirmed Dates. The earlier Recruitment Pipeline Timeline chart was removed to keep this tab focused on the one metric that matters.

## Turnover tab rebuild (5 sub-views)

Inspired by a reference HR dashboard, but adapted to what's actually in `Subcontract_Overview.xlsx` — some of the reference's features (Push/Pull reason tagging, job-level/PL, Talent flags, Transfer/Retirement as distinct event types) aren't in the source data and were **not** fabricated. What *was* added:

- **Overview**: headcount + hired/resigned/turnover-rate/net-change KPIs, a headcount-by-month chart, hired-vs-resigned-by-month chart, top 5 divisions by exits, and a monthly summary table.
- **Trend**: the existing dual-axis combo chart (headcount line + % turnover bars, 2025 vs 2026), plus a new net-change-by-month waterfall chart and trend-specific KPIs (latest/peak headcount, YTD net change, highest-exit month).
- **By Department**: hired-vs-resigned per division, plus a division detail table with an estimated turnover %.
- **Reasons**: a reasons-for-leaving ranking (using the more detailed "รายละเอียด" column, lightly de-duplicated — e.g. "ได้งานใหม่ (มิตชูบิชิ)" and "ได้งานใหม่ (โซดิก)" both count as "ได้งานใหม่" — with **no invented categories** like Push/Pull), a reasons-by-company breakdown (Manpower vs HR Digest, per your instruction to use Company rather than a Push/Pull framework), and the existing tenure-of-leavers chart.
- **In-Out List**: a combined, paginated table of every hire and resignation event (position/division/department/date; no personal names, consistent with the rest of the app).

All 5 sub-views share one **Company filter** (Manpower / HR Digest) at the top of the tab, matching how the rest of the dashboard is organized.

**Two things worth knowing:**
1. Each resignation's company is read from its **employee ID prefix** (MAN → Manpower, HRD → HR Digest) — confirmed against the roster to be 100% reliable wherever both are available. A minority of records use an older ID format without that prefix; those fall back to an estimate from division (matched against the current roster), and the handful with no matching division show as "Unknown" rather than a guess.
2. "Current Headcount" (Overview, from the live roster) and the headcount used in the chart/Trend tab (from HR's separately-tracked Turnover_Graph sheet) can differ slightly, since those two parts of the workbook are maintained independently — this is called out directly in the UI rather than silently reconciled.

## Probation Outcome (Overview tab)

Reads the "Probation Status" column from `Recruitment_Requisition.xlsx`. The base for every percentage is **everyone who joined**, i.e. rows whose Recruitment Status is **Effective**. Their Probation Status is then counted as Pass, Not Pass, Resign, Under Review, Not Started or Internal; Effective rows with a blank Probation Status appear as **Not Recorded**, so the cards always add up to the Joined total. The donut shows the full mix with the total joined in the centre; cards are grouped into **Probation Result** (Pass / Not Pass / Resign) and **In Progress / Other** (Under Review / Not Started / Internal / Not Recorded), each showing count and % of joined. Also shown as a column on the Positions tab. Respects the same filters as the rest of the Overview tab.

## Recent narrative improvements

- **Overview tab** now flows: KPI cards → KPI Performance (donut) → time-to-hire → a "Positions to Watch" list (Effective positions that closed Over KPI, worst first — click any row for the same combined KPI + Satisfaction detail as the Positions tab). The monthly status trend chart (bars + total-requested line) was removed from Overview after review — it was too dense for a first screen — and is not shown elsewhere on the page.
- **Analytics tab** now opens with an auto-generated "Key Insights" summary (best/worst month, fastest/slowest location, top channel, Over-KPI rate), a Time-to-Hire trend chart alongside the existing Effective Rate trend and Division breakdown, and a **Cost Per Hire** panel (see below).
- **Subcontract Current Overview** now includes a **Net Headcount Change** card (started − resigned, all-time company-wide) to close the loop between the Recruitment and Turnover tabs.
- **Subcontract Current Overview / Employee List** filters now cascade: picking a Company narrows the Division (and, on Employee List, Department) options to only what actually exists for that company — derived live from the data, no hardcoded org-chart mapping to maintain.
- **Employee List** now includes the internal staff ID (not a national ID — safe to show) and Company/Division/Department filters.

None of this required any change to the update process — it's all computed from data that was already being loaded, or (Cost Per Hire) read from a sheet already in `Recruitment_Requisition.xlsx`.

### Cost Per Hire
Read from the **"Cost Per Hire"** sheet in `Recruitment_Requisition.xlsx`. Unlike the rest of the workbook, this sheet is a hand-built **annual** cost summary (e.g. "Total Hire 2025: 47"), not a row-per-requisition log — so it is shown on the Analytics tab as a standalone panel that does **not** react to the Location/Year/Month/Status/KPI/Position filters above it (there's no such breakdown in the source to filter by). The dashboard reads the final per-type figures by searching for the `O-General` / `S-General` / `S-Special` row labels (not fixed cell positions), so it will keep working even if rows above them are added or reordered next year — as long as those three labels and the 3 numeric columns beside them (excl. medical / incl. medical Men / incl. medical Women) stay in place.

## Refinements after executive review

- **Donut hierarchy**: the "All Positions" KPI donut is now a larger, visually prominent card above a "Breakdown by position type" label, with the Special/General donuts shown smaller underneath as supporting detail — instead of all three being equal-sized and easy to read as redundant.
- **Color clarity caption**: added a short note above the KPI Performance section clarifying that green appears in two related-but-different senses — Effective (a status, shown in the trend chart) and On-KPI (a performance outcome, shown in the donuts) — so it doesn't read as one repeated meaning.
- **"At a Glance: Satisfaction & Cost"**: a new panel at the bottom of the Overview tab surfaces Overall Satisfaction % and blended Avg. Cost Per Hire (both computed independently of the page filters, all-time), each clickable to jump straight to its full tab — so an executive who only opens Overview still sees these two numbers.

## Executive redesign (data labels, KPI restructure, SLA/tenure/turnover)

- **All charts**: data labels now always render with headroom (18% scale padding) and automatically switch between "inside the bar" (white text) and "outside the bar" (dark text) depending on bar height, so labels never get clipped or unreadable regardless of value.
- **Permanent Overview**: Total Requisition is the first KPI card. The combined On-KPI/Over-KPI split is now an **"All Positions" donut** (same style as the Special/General breakdown below it) rather than plain text cards, since a chart reads faster than numbers at a glance. **Every status color is now unified across the whole page** — Effective is the same green in the KPI cards, the "All Positions"/Special/General donuts, the monthly trend chart, and the Positions table status pills; Wait to Join is light green, Cancel is red, everywhere. "Volume" charts that aren't status-based (Recruitment Channel, Requisitions by Division) now share one coordinated blue shade-family instead of an unrelated rainbow per bar.
- **Subcontract Current Overview**: headcount donut now shows both count and % share, with Manpower (teal) and HR Digest (violet) in clearly distinct colors.
- **Subcontract Recruitment tab**: new **SLA Breakdown** panel (SLA = 14 days) comparing On-KPI vs Over-KPI counts and %Over-KPI by service provider.
- **Subcontract Employee Profile & Turnover tab**: added Min/Avg/Max Tenure KPI cards (of the current workforce), and the Turnover Rate Trend chart is now a proper dual-axis combo — line = Active Headcount (left axis), bar = % Turnover (right axis), for 2025 vs 2026.

## Design assumptions

- "On Screening" (Permanent) = `Screening` + `Final Interview` statuses combined
- "Total Requisition" (Permanent) = all positions matching the current filter, any status
- Recruitment Channel chart counts Effective positions only (channels that actually resulted in a hire)
- Monthly turnover rate uses the pre-computed figures from the `Turnover_Graph` sheet (matches what HR already reports) rather than recalculating from individual records

## Probation name list (Overview tab)

Each card in the **Probation Outcome** panel (Pass, Not Pass, Resign, Under Review, Not Started, Internal) is now clickable. Clicking opens a popup listing the people behind that number — Name, Employee ID, Position, Division/Dept, Join Date and Remark — read from the `Name New Employee`, `ID New Employee`, `Join Date` and `Remark` columns of `Recruitment_Requisition.xlsx`. The list uses the same filters as the cards, so its length always matches the card's count.

> Note: this is the only place in the app that shows employee names. Since the data file is served alongside the site, keep the hosting private (internal/HR-only access).
