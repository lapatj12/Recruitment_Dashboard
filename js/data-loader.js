/* ==========================================================================
   Excel data loader — reads the three master workbooks directly in the
   browser using SheetJS, so HR only ever has to replace these files:
     data/Recruitment_Requisition.xlsx
     data/Subcontract_Overview.xlsx
     data/Recruitment_Service_Quality_Evaluation.xlsx
   No CSV export step required. Parsing logic mirrors what was verified
   against the real files during development.
   ========================================================================== */

/** Format a cell value for display/storage: Date -> 'YYYY-MM-DD', else trimmed string. */
function xClean(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) {
    const y = v.getFullYear(), m = String(v.getMonth() + 1).padStart(2, '0'), d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(v).trim();
}

/** Light text consolidation only — no reclassification into new categories.
 * Strips a trailing parenthetical (e.g. "ได้งานใหม่ (มิตชูบิชิ)" -> "ได้งานใหม่")
 * so near-duplicate free-text entries group together in charts, without
 * inventing any taxonomy the source data doesn't actually contain. */
function normalizeReasonDetail(v) {
  if (!v) return v;
  return v.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

/** Derives Male/Female from the Thai name-prefix column (นาย = Mr., น.ส./นาง = Ms./Mrs.).
 * Returns '' (unknown) for anything else rather than guessing. */
function genderFromTitle(title) {
  const t = xClean(title);
  if (t === 'นาย') return 'Male';
  if (t === 'น.ส.' || t === 'นาง' || t === 'นางสาว') return 'Female';
  return '';
}

function normCompany(c) {
  c = xClean(c);
  const u = c.toUpperCase();
  if (u === 'HRD' || u === 'HR DIGEST' || u === 'HR-DIGEST') return 'HR Digest';
  return c;
}

/** Fetch and parse an .xlsx file into a SheetJS workbook. Cache-busted so HR's
 * monthly re-uploads (same filename) are picked up immediately. */
async function loadWorkbook(path) {
  const res = await fetch(path + '?v=' + Date.now());
  if (!res.ok) throw new Error('Cannot load ' + path);
  const buf = await res.arrayBuffer();
  return XLSX.read(buf, { type: 'array', cellDates: true });
}

/** Parse Recruitment_Requisition.xlsx -> array of permanent-recruitment row objects. */
function parsePermanentWorkbook(wb) {
  const ws = wb.Sheets['Recruitment'];
  if (!ws) throw new Error('Sheet "Recruitment" not found in Recruitment_Requisition.xlsx');
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
  const monthMap = { 'March': 'Mar', 'June': 'Jun' };
  const out = [];
  for (const row of rows) {
    if (row['Year'] == null && row['Position_Announce'] == null) continue; // blank row
    let month = row['Month'];
    if (month) {
      const m = String(month).trim();
      month = monthMap[m] || m;
    }
    const ptype = xClean(row['Type']);
    let typeGroup = '';
    if (ptype === 'O-General' || ptype === 'S-General') typeGroup = 'General';
    else if (ptype === 'S-Special') typeGroup = 'Special';

    out.push({
      year: xClean(row['Year']), month: xClean(month), location: xClean(row['Location']),
      type: ptype, type_group: typeGroup,
      status: xClean(row['Recruitment Status']),
      position: xClean(row['Position_Announce']) || xClean(row['Position_Request']),
      channel: xClean(row['Recruitment Channel']),
      division: xClean(row['Division']), dept: xClean(row['Dept']), probation_status: xClean(row['Probation Status']),
      approved_date: xClean(row['Approved_Date']), target_date: xClean(row['Target_Date']), final_date: xClean(row['Final Date']),
      diff_days: xClean(row['Diff Date']), kpi: xClean(row['KPI']),
    });
  }
  return out;
}

/** Parse Recruitment_Service_Quality_Evaluation.xlsx -> array of survey response objects.
 * Personal identifiers (Name, Email) are intentionally not extracted — only the
 * fields needed for aggregate reporting (scores, position, comments, date). */
function parseSatisfactionWorkbook(wb) {
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
  if (!rows.length) return [];
  const headers = Object.keys(rows[0]);
  const findHeader = (marker) => headers.find(h => h.includes(marker));

  const hQ1 = findHeader('2.1');   // Recruitment quality: candidates matched requirements
  const hQ2 = findHeader('2.2');   // Recruitment quality: timeline was appropriate
  const hS1 = findHeader('3.1');   // Service: responsive to feedback
  const hS2 = findHeader('3.2');   // Service: kept requester updated
  const hPos = headers.find(h => h.trim() === 'ตำแหน่งที่สรรหา');
  const hImpressed = findHeader('ประทับ');
  const hImprove = findHeader('ปรับปรุง');

  const out = [];
  for (const row of rows) {
    const date = xClean(row['Start time']);
    if (!date) continue;
    out.push({
      date,
      position: xClean(row[hPos]),
      q_quality_1: Number(row[hQ1]) || null,
      q_quality_2: Number(row[hQ2]) || null,
      q_service_1: Number(row[hS1]) || null,
      q_service_2: Number(row[hS2]) || null,
      impressed: xClean(row[hImpressed]),
      improve: xClean(row[hImprove]),
    });
  }
  return out;
}

/** Convenience: load + parse the satisfaction survey workbook in one call. */
async function loadSatisfactionData(path) {
  const wb = await loadWorkbook(path);
  return parseSatisfactionWorkbook(wb);
}

/** Parse Subcontract_Overview.xlsx -> { recruitment, turnover, turnoverMonthly, employees }. */
function parseSubcontractWorkbook(wb) {
  // --- Recruitment ---
  const wsRec = wb.Sheets['Recruitment'];
  const recRows = wsRec ? XLSX.utils.sheet_to_json(wsRec, { defval: null }) : [];
  const recruitment = [];
  for (const row of recRows) {
    if (row['position'] == null) continue;
    recruitment.push({
      year: xClean(row['year']), company: normCompany(row['company']), position: xClean(row['position']),
      work_unit: xClean(row['Work Unit']), dept: xClean(row['Dept']), division: xClean(row['Division']),
      business_line: xClean(row['businessLine']), send_date: xClean(row['Send Requirement']),
      return_date: xClean(row['Return Date']), diff_days: xClean(row['Diff Date']),
      interview_date: xClean(row['interviewDate']), confirm_date: xClean(row['confirmDate']),
      start_date: xClean(row['startDate']), status: xClean(row['status']), hired_age: xClean(row['Hired_Age']),
    });
  }

  // --- Turnover (individual records, anonymized — no name column read) ---
  const wsTurn = wb.Sheets['Turnover'];
  const turnRows = wsTurn ? XLSX.utils.sheet_to_json(wsTurn, { defval: null }) : [];
  const turnover = [];
  for (const row of turnRows) {
    if (row['วันที่มีผล'] == null) continue;
    turnover.push({
      employee_id: xClean(row['รหัสพนักงาน']),
      effective_date: xClean(row['วันที่มีผล']), position: xClean(row['ตำแหน่ง']), division: xClean(row['ฝ่าย']),
      department: xClean(row['ส่วน']), work_unit: xClean(row['หน่วยงาน']), start_date: xClean(row['วันเข้างาน']),
      age: xClean(row['อายุตัว']), tenure_years: xClean(row['อายุงาน']), reason: xClean(row['เหตุผลการลาออก']),
      detail: normalizeReasonDetail(xClean(row['รายละเอียด'])),
    });
  }

  // --- Turnover_Graph (pre-computed monthly summary; range N2:AB20, headers on row 3) ---
  const wsTG = wb.Sheets['Turnover_Graph'];
  const turnoverMonthly = [];
  if (wsTG) {
    const raw = XLSX.utils.sheet_to_json(wsTG, { header: 1, defval: null });
    // Array indices are relative to the sheet's used range (starts at column N),
    // so index 2 = column P ("เดือน"), verified against the source file.
    for (let i = 2; i <= 13; i++) {
      const r = raw[i];
      if (!r) continue;
      const month = xClean(r[2]);
      if (!month) continue;
      turnoverMonthly.push({
        month,
        resigned_2025: xClean(r[3]), headcount_2025: xClean(r[4]), turnover_rate_2025: xClean(r[5]),
        resigned_2026: xClean(r[9]), headcount_2026: xClean(r[10]), turnover_rate_2026: xClean(r[11]),
      });
    }
  }

  // --- Employees (PII stripped: no national ID / phone / email / salary / cost center) ---
  function extractEmployees(sheetName, companyLabel) {
    const ws = wb.Sheets[sheetName];
    if (!ws) return [];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
    const out = [];
    for (const row of rows) {
      if (row['ชื่อนาม-สกุล'] == null) continue;
      out.push({
        company: companyLabel, employee_id: xClean(row['รหัสพนักงาน']), name: xClean(row['ชื่อนาม-สกุล']), position: xClean(row['ตำแหน่ง']),
        division: xClean(row['ฝ่าย']), department: xClean(row['ส่วน']), work_unit: xClean(row['หน่วยงาน']),
        location: xClean(row['สถานที่ทำงาน']), start_date: xClean(row['วันเริ่มงาน']), gender: genderFromTitle(row['คำนำหน้า']),
        age: xClean(row['อายุตัว']), tenure_years: xClean(row['อายุงาน']),
      });
    }
    return out;
  }
  const employees = extractEmployees('รายชื่อพนักงาน Manpower', 'Manpower')
    .concat(extractEmployees('รายชื่อพนักงาน HRD', 'HR Digest'));

  return { recruitment, turnover, turnoverMonthly, employees };
}

/** Convenience: load + parse the permanent-recruitment workbook in one call. */
/** Parse the "Cost Per Hire" sheet in Recruitment_Requisition.xlsx — a hand-built
 * annual cost summary (not a row-per-hire log), so this reads the 3 final
 * cost-per-hire figures per position type by searching for their row labels
 * (resilient to rows being inserted/reordered above them) rather than assuming
 * fixed cell addresses. Returns null if the sheet or expected labels are missing. */
function parseCostPerHireSheet(wb) {
  const ws = wb.Sheets['Cost Per Hire'];
  if (!ws) return null;
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  let context = '';
  for (const row of raw) {
    if (row[0] && String(row[0]).includes('Total Hire')) { context = xClean(row[0]); break; }
  }

  function findRow(markers) {
    for (const row of raw) {
      const label = xClean(row[0]).toLowerCase().replace(/\s+/g, '');
      if (markers.includes(label)) {
        return { exclMedical: xClean(row[1]), inclMedicalMen: xClean(row[2]), inclMedicalWomen: xClean(row[3]) };
      }
    }
    return null;
  }

  const oGeneral = findRow(['o-general']);
  const sGeneral = findRow(['s-general']);
  const sSpecial = findRow(['s-special']);
  if (!oGeneral && !sGeneral && !sSpecial) return null;

  return { context, oGeneral, sGeneral, sSpecial };
}

/** Convenience: load + parse the permanent-recruitment workbook in one call. */
async function loadPermanentData(path) {
  const wb = await loadWorkbook(path);
  return parsePermanentWorkbook(wb);
}

/** Convenience: load + parse the subcontract workbook in one call. */
async function loadSubcontractData(path) {
  const wb = await loadWorkbook(path);
  return parseSubcontractWorkbook(wb);
}
