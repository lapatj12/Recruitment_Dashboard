/* ==========================================================================
   Subcontract Overview Dashboard
   ========================================================================== */

/** One color per company, used everywhere Manpower/HR Digest appear on this
 * dashboard (KPI cards, donut, pills, every chart) so the same entity always
 * reads as the same color, instead of drifting between teal/blue/violet in
 * different places. */
const COMPANY_COLORS = { 'Manpower': CHART_COLORS.teal, 'HR Digest': CHART_COLORS.violet };
const COMPANY_PILL = {
  'Manpower': 'var(--teal-soft);color:var(--teal)',
  'HR Digest': 'var(--violet-soft);color:var(--violet)',
};

let EMP = [], REC = [], TURN = [], TURN_MONTHLY = [];
let charts = {};
let overviewFilters = { company: null, division: null };
let recruitFilters = { company: null, division: null, status: null, year: null };

async function init() {
  const parsed = await loadSubcontractData('data/Subcontract_Overview.xlsx');
  EMP = parsed.employees;
  REC = parsed.recruitment;
  TURN = parsed.turnover;
  TURN_MONTHLY = parsed.turnoverMonthly;
  EMP = EMP.filter(r => r.name);
  REC = REC.filter(r => r.position);
  TURN = TURN.filter(r => r.effective_date);

  initTabs();
  initOverview();
  initRecruitment();
  initTurnover();
  initEmployeeTable();

  document.getElementById('posModalClose2').addEventListener('click', () => {
    document.getElementById('posModal2').style.display = 'none';
  });
}

function initTabs() {
  const btns = document.querySelectorAll('#tabbar button');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tabpane').forEach(p => p.classList.remove('active'));
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });
}

function showPosModal(title, items) {
  document.getElementById('posModalTitle2').textContent = title;
  const list = document.getElementById('posModalList2');
  list.innerHTML = items.length ? items.map(p => `<li>${p}</li>`).join('') : '<li>No data</li>';
  document.getElementById('posModal2').style.display = 'flex';
}

function destroyChart(key) { if (charts[key]) { charts[key].destroy(); delete charts[key]; } }

/* ---------------------------- TAB 1: Overview ---------------------------- */

let msOverview = {};
function initOverview() {
  const bar = document.getElementById('filterBarOverview');
  const actions = bar.querySelector('.filter-actions');

  const companyCtrl = buildMultiSelect(bar, 'Company', uniqueSorted(EMP, 'company'), sel => {
    overviewFilters.company = sel;
    rebuildDivisionFilter(); // Division options narrow to only what exists for the selected company
    renderOverview();
  });
  bar.insertBefore(bar.lastElementChild, actions);
  msOverview.company = companyCtrl;

  rebuildDivisionFilter();

  document.getElementById('resetOverview').addEventListener('click', () => {
    msOverview.company.clear();
    overviewFilters.company = null;
    rebuildDivisionFilter();
    renderOverview();
  });
  renderOverview();
}

/** Rebuilds the Division filter's option list to only include divisions that
 * actually appear for the currently-selected Company (derived live from the
 * employee data, so it stays correct even if the org structure changes next
 * month — no hardcoded company/division mapping to maintain). */
function rebuildDivisionFilter() {
  const bar = document.getElementById('filterBarOverview');
  const actions = bar.querySelector('.filter-actions');
  if (msOverview.division) { msOverview.division.el.remove(); }

  const scoped = overviewFilters.company ? EMP.filter(r => overviewFilters.company.has(r.company)) : EMP;
  const divisionOpts = uniqueSorted(scoped, 'division');
  overviewFilters.division = null;

  const ctrl = buildMultiSelect(bar, 'Division', divisionOpts, sel => { overviewFilters.division = sel; renderOverview(); }, tr);
  bar.insertBefore(ctrl.el, actions);
  msOverview.division = ctrl;
}

function renderOverview() {
  const data = EMP.filter(r => {
    if (overviewFilters.company && !overviewFilters.company.has(r.company)) return false;
    if (overviewFilters.division && !overviewFilters.division.has(r.division)) return false;
    return true;
  });

  const total = data.length;
  const manpower = data.filter(r => r.company === 'Manpower').length;
  const hrd = data.filter(r => r.company === 'HR Digest').length;
  const ages = data.map(r => Number(r.age)).filter(n => !isNaN(n));
  const tenures = data.map(r => Number(r.tenure_years)).filter(n => !isNaN(n));
  const avgAge = ages.length ? ages.reduce((s,v)=>s+v,0)/ages.length : null;
  const avgTenure = tenures.length ? tenures.reduce((s,v)=>s+v,0)/tenures.length : null;

  const totalStarted = REC.filter(r => r.status === 'เริ่มงานแล้ว' && (!overviewFilters.company || overviewFilters.company.has(r.company))).length;
  // Uses the same source (individual Turnover records) as the Employee Profile & Turnover
  // tab, so the two tabs never show a different "resigned" count for the same period.
  const totalResigned = TURN.filter(r => !overviewFilters.company || overviewFilters.company.has(companyFromId(r.employee_id) || inferCompany(r.division))).length;
  const netChange = totalStarted - totalResigned;

  document.getElementById('kpiOverview').innerHTML = [
    { label: 'Current Total Headcount', value: fmtNum(total), sub: 'employees', color: 'var(--accent)' },
    { label: 'Manpower', value: fmtNum(manpower), sub: total ? fmtPct(manpower/total) : '–', color: 'var(--teal)' },
    { label: 'HR Digest', value: fmtNum(hrd), sub: total ? fmtPct(hrd/total) : '–', color: 'var(--violet)' },
    { label: 'Average Age', value: avgAge !== null ? fmtNum(avgAge) + ' yrs' : '–', sub: 'of current employees', color: 'var(--amber)' },
    { label: 'Average Tenure', value: avgTenure !== null ? fmtNum(avgTenure) + ' yrs' : '–', sub: 'of current employees', color: 'var(--violet)' },
    { label: 'Net Headcount Change', value: (netChange > 0 ? '+' : '') + fmtNum(netChange), sub: `${fmtNum(totalStarted)} started − ${fmtNum(totalResigned)} resigned (all-time)`, color: netChange >= 0 ? 'var(--teal)' : 'var(--rose)' },
  ].map(c => `<div class="kpi-card" style="--bar-color:${c.color}"><div class="label">${c.label}</div><div class="value tnum">${c.value}</div><div class="sub">${c.sub}</div></div>`).join('');
  document.getElementById('kpiOverview').style.gridTemplateColumns = 'repeat(3, 1fr)';

  destroyChart('company');
  charts.company = new Chart(document.getElementById('chartCompany'), {
    type: 'doughnut',
    data: { labels: ['Manpower','HR Digest'], datasets: [{ data: [manpower, hrd], backgroundColor: [COMPANY_COLORS['Manpower'], COMPANY_COLORS['HR Digest']], borderWidth: 0 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '62%',
      plugins: {
        legend: { position: 'bottom' },
        datalabels: {
          color: '#fff', font: { weight: '700', size: 13 }, textAlign: 'center',
          formatter: (v) => v > 0 ? [String(v), Math.round(v / (total || 1) * 100) + '%'] : '',
        }
      }
    },
    plugins: [ChartDataLabels]
  });

  const byDiv = {};
  data.forEach(r => { if (r.division) (byDiv[r.division] = byDiv[r.division] || []).push(r); });
  const divLabels = Object.keys(byDiv).sort((a,b) => byDiv[b].length - byDiv[a].length).slice(0, 8);
  destroyChart('division');
  charts.division = new Chart(document.getElementById('chartDivision'), {
    type: 'bar',
    data: { labels: divLabels.map(tr), datasets: [{ data: divLabels.map(l => byDiv[l].length), backgroundColor: CHART_COLORS.accent, borderRadius: 8, maxBarThickness: 34 }] },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, datalabels: smartBarLabels() },
      scales: { x: graceScale(), y: { grid: { display: false }, ticks: { autoSkip: false, font: { size: 11 } } } }
    },
    plugins: [ChartDataLabels]
  });
}

/* -------------------------- TAB 2: Recruitment -------------------------- */

let msRecruit = {};
function initRecruitment() {
  const bar = document.getElementById('filterBarRecruit');
  const actions = bar.querySelector('.filter-actions');
  [
    { key: 'company', label: 'Company', field: 'company' },
    { key: 'division', label: 'Division', field: 'division' },
    { key: 'status', label: 'Status', field: 'status' },
    { key: 'year', label: 'Year', field: 'year' },
  ].forEach(d => {
    const opts = uniqueSorted(REC, d.field);
    const ctrl = buildMultiSelect(bar, d.label, opts, sel => { recruitFilters[d.key] = sel; renderRecruitment(); }, d.field === 'status' || d.field === 'division' ? tr : (v => v));
    bar.insertBefore(bar.lastElementChild, actions);
    msRecruit[d.key] = ctrl;
  });
  document.getElementById('resetRecruit').addEventListener('click', () => {
    Object.values(msRecruit).forEach(c => c.clear());
    recruitFilters = { company: null, division: null, status: null, year: null };
    renderRecruitment();
  });
  renderRecruitment();
}

function renderRecruitment() {
  const data = REC.filter(r => {
    if (recruitFilters.company && !recruitFilters.company.has(r.company)) return false;
    if (recruitFilters.division && !recruitFilters.division.has(r.division)) return false;
    if (recruitFilters.status && !recruitFilters.status.has(r.status)) return false;
    if (recruitFilters.year && !recruitFilters.year.has(r.year)) return false;
    return true;
  });

  const total = data.length;
  // "Screening" and "Interview" are proxied from the dates actually recorded on each
  // position, since this data is per-requisition (not per-candidate): a position counts
  // as having reached Screening once the agency has returned candidates for it, and
  // Interview once an interview date is on record.
  const screening = data.filter(r => r.return_date).length;
  const interview = data.filter(r => r.interview_date).length;
  // Only counts rows where Confirmed Date is actually filled in — the source formula
  // falls back to today's date when it's blank, which isn't a real completed duration
  // and would badly inflate the average if included.
  const leadRows = data.filter(r => r.confirmed_date);
  const leadDays = leadRows.map(r => Number(r.diff_to_confirmed)).filter(n => !isNaN(n) && n >= 0);
  const avgLead = leadDays.length ? leadDays.reduce((s,v)=>s+v,0)/leadDays.length : null;

  document.getElementById('kpiRecruit').innerHTML = [
    { label: 'Total Requisitions', value: fmtNum(total), sub: 'positions', color: 'var(--accent)' },
    { label: 'Screening', value: fmtNum(screening), sub: total ? fmtPct(screening/total) + ' of requisitions' : '–', color: 'var(--blue)' },
    { label: 'Interview', value: fmtNum(interview), sub: total ? fmtPct(interview/total) + ' of requisitions' : '–', color: 'var(--violet)' },
    { label: 'Avg. Lead Time', value: avgLead !== null ? fmtNum(avgLead) + ' days' : '–', sub: `Send JD → Confirmed (${leadDays.length} of ${total} confirmed)`, color: 'var(--teal)' },
  ].map(c => `<div class="kpi-card" style="--bar-color:${c.color}"><div class="label">${c.label}</div><div class="value tnum">${c.value}</div><div class="sub">${c.sub}</div></div>`).join('');
  document.getElementById('kpiRecruit').style.gridTemplateColumns = 'repeat(4, 1fr)';

  const companiesList = [...new Set(data.map(r => r.company))].filter(Boolean);
  const statuses = [...new Set(data.map(r => r.status))].filter(Boolean);
  const byCompanyStatus = {};
  companiesList.forEach(c => { byCompanyStatus[c] = {}; statuses.forEach(s => byCompanyStatus[c][s] = []); });
  data.forEach(r => { if (r.company && r.status) byCompanyStatus[r.company][r.status].push(r.position); });

  destroyChart('recruitStatus');
  charts.recruitStatus = new Chart(document.getElementById('chartRecruitStatus'), {
    type: 'bar',
    data: {
      labels: companiesList,
      datasets: statuses.map((s, i) => ({
        label: tr(s),
        data: companiesList.map(c => byCompanyStatus[c][s].length),
        backgroundColor: CHART_PALETTE[i % CHART_PALETTE.length],
        borderRadius: 6, stack: 'a',
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      onClick: (evt, els) => {
        if (!els.length) return;
        const el = els[0];
        const company = companiesList[el.index];
        const status = statuses[el.datasetIndex];
        showPosModal(`${company} — ${tr(status)}`, byCompanyStatus[company][status]);
      },
      plugins: {
        legend: { position: 'bottom' },
        datalabels: { display: (c) => c.dataset.data[c.dataIndex] > 0, color: '#fff', font: { weight: '700', size: 11 } },
      },
      scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ...graceScale() } }
    },
    plugins: [ChartDataLabels]
  });

  const byCompanyLead = {};
  data.filter(r => r.confirmed_date).forEach(r => { const d = Number(r.diff_to_confirmed); if (!isNaN(d) && d >= 0) (byCompanyLead[r.company] = byCompanyLead[r.company] || []).push(d); });
  const leadLabels = Object.keys(byCompanyLead);
  const KPI_TARGET = 14;
  const leadAvgs = leadLabels.map(l => Math.round(byCompanyLead[l].reduce((s,v)=>s+v,0)/byCompanyLead[l].length));
  destroyChart('leadTime');
  charts.leadTime = new Chart(document.getElementById('chartLeadTime'), {
    type: 'bar',
    data: {
      labels: leadLabels,
      datasets: [{
        label: 'Avg. Lead Time',
        data: leadAvgs,
        // KPI-status coloring: meets the 14-day target = blue, exceeds it = red.
        // This intentionally overrides the company color scheme used elsewhere, since the
        // point of this specific chart is to flag compliance, not to identify the company.
        backgroundColor: leadAvgs.map(v => v <= KPI_TARGET ? CHART_COLORS.blue : CHART_COLORS.rose),
        borderRadius: 8, maxBarThickness: 60,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        datalabels: smartBarLabels({ formatter: v => v + 'd' }),
      },
      // grace ensures the 14-day line always has headroom to sit inside the chart
      // even when every bar is well below (or above) the target.
      scales: { y: graceScale({ suggestedMax: Math.max(KPI_TARGET, ...leadAvgs) * 1.2 }), x: { grid: { display: false } } }
    },
    plugins: [ChartDataLabels, horizontalRefLinePlugin(KPI_TARGET, { color: CHART_COLORS.ink })]
  });
  document.getElementById('leadTimeLegend').innerHTML = `<span class="pl-item"><span style="display:inline-block;border-top:2px dashed ${CHART_COLORS.ink};width:16px;"></span><span>KPI Target (14 Days)</span></span>`;

  renderFunnelChart(data);

  renderSlaBreakdown(data);
}


/** SLA = 14 days, measured Send JD to Confirmed Date. Only counts rows where
 * Confirmed Date is actually filled in (see the Lead Time KPI note — the
 * source formula falls back to today's date otherwise, which isn't a real
 * duration). Compares On-KPI (<=14d) vs Over-KPI (>14d) counts per service
 * provider, plus the %Over-KPI rate. */
/** Recruitment Funnel Overview — how many requisitions reached each stage.
 * This is per-requisition (not per-candidate), so "Screening"/"Interview" mean
 * "this position had at least one candidate return/interview", not a headcount
 * of candidates — see the KPI card notes for the same caveat. */
function renderFunnelChart(data) {
  const stages = [
    { label: 'Requisitions', value: data.length, color: CHART_COLORS.accent },
    { label: 'Screening', value: data.filter(r => r.return_date).length, color: CHART_COLORS.blue },
    { label: 'Interview', value: data.filter(r => r.interview_date).length, color: CHART_COLORS.violet },
    { label: 'Confirmed', value: data.filter(r => r.confirmed_date).length, color: CHART_COLORS.amber },
    { label: 'Started', value: data.filter(r => r.status === 'เริ่มงานแล้ว').length, color: CHART_COLORS.green },
  ];
  destroyChart('funnel');
  charts.funnel = new Chart(document.getElementById('chartFunnel'), {
    type: 'bar',
    data: { labels: stages.map(s => s.label), datasets: [{ data: stages.map(s => s.value), backgroundColor: stages.map(s => s.color), borderRadius: 6, maxBarThickness: 44 }] },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, datalabels: smartBarLabels() },
      scales: { x: graceScale(), y: { grid: { display: false } } }
    },
    plugins: [ChartDataLabels]
  });
}

/** SLA = 14 days, measured Send JD to Confirmed Date. Only counts rows where
 * Confirmed Date is actually filled in (see the Lead Time KPI note — the
 * source formula falls back to today's date otherwise, which isn't a real
 * duration). Compares On-KPI (<=14d) vs Over-KPI (>14d) counts per service
 * provider, plus the %Over-KPI rate. */
function renderSlaBreakdown(data) {
  const SLA_DAYS = 14;
  const bySla = {};
  data.filter(r => r.confirmed_date).forEach(r => {
    const d = Number(r.diff_to_confirmed);
    if (isNaN(d) || d < 0) return;
    const c = r.company;
    bySla[c] = bySla[c] || { on: 0, over: 0 };
    if (d <= SLA_DAYS) bySla[c].on++; else bySla[c].over++;
  });
  const companies = Object.keys(bySla);

  destroyChart('sla');
  charts.sla = new Chart(document.getElementById('chartSla'), {
    type: 'bar',
    data: {
      labels: companies,
      datasets: [
        { label: `On-KPI (\u226414d)`, data: companies.map(c => bySla[c].on), backgroundColor: CHART_COLORS.green, borderRadius: 6, stack: 'a' },
        { label: `Over-KPI (>14d)`, data: companies.map(c => bySla[c].over), backgroundColor: CHART_COLORS.rose, borderRadius: 6, stack: 'a' },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        datalabels: { display: (c) => c.dataset.data[c.dataIndex] > 0, color: '#fff', font: { weight: '700', size: 11 } },
      },
      scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ...graceScale() } }
    },
    plugins: [ChartDataLabels]
  });

  const summary = document.getElementById('slaSummary');
  if (summary) {
    summary.innerHTML = companies.map(c => {
      const total = bySla[c].on + bySla[c].over;
      const overPct = total ? Math.round(bySla[c].over / total * 100) : 0;
      return `<div class="detail-stat"><div class="detail-label">${c} — % Over-KPI</div><div class="detail-value" style="color:${overPct > 30 ? 'var(--rose)' : 'var(--ink)'}">${overPct}%</div></div>`;
    }).join('');
  }
}

/* --------------------------- TAB 3: Turnover ----------------------------- */

/* ---------------------------- Shared turnover helpers ---------------------------- */

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function monthAbbrFromDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return MONTH_ABBR[d.getMonth()];
}

let _divCompanyMap = null;
/** Division -> company, built once from the current employee roster (majority
 * vote per division). Used to estimate a company for Turnover records, since
 * the Turnover sheet itself doesn't record company directly. */
function divisionToCompanyMap() {
  if (_divCompanyMap) return _divCompanyMap;
  const votes = {};
  EMP.forEach(r => {
    if (!r.division) return;
    votes[r.division] = votes[r.division] || {};
    votes[r.division][r.company] = (votes[r.division][r.company] || 0) + 1;
  });
  _divCompanyMap = {};
  Object.keys(votes).forEach(div => {
    const entries = Object.entries(votes[div]).sort((a, b) => b[1] - a[1]);
    _divCompanyMap[div] = entries[0][0];
  });
  return _divCompanyMap;
}
function inferCompany(division) {
  const map = divisionToCompanyMap();
  return map[division] || 'Unknown';
}

/** Company from the employee ID prefix (MAN### / HRD###) — a direct fact,
 * confirmed to agree 100% with the division-based estimate wherever both are
 * available. Falls back to the division estimate only when the ID doesn't
 * start with a known prefix (older/legacy codes). */
function companyFromId(employeeId) {
  const id = (employeeId || '').toUpperCase();
  if (id.startsWith('MAN')) return 'Manpower';
  if (id.startsWith('HRD')) return 'HR Digest';
  return null;
}

let _turnWithCompany = null;
function turnoverWithCompany() {
  if (_turnWithCompany) return _turnWithCompany;
  _turnWithCompany = TURN.map(r => ({ ...r, company: companyFromId(r.employee_id) || inferCompany(r.division) }));
  return _turnWithCompany;
}

let turnoverFilters = { company: null };
let msTurnover = {};
let turnoverActiveSubtab = 'overview';

function initTurnover() {
  const bar = document.getElementById('filterBarTurnover');
  const actions = bar.querySelector('.filter-actions');
  const ctrl = buildMultiSelect(bar, 'Company', uniqueSorted(EMP, 'company'), sel => {
    turnoverFilters.company = sel;
    renderTurnoverActive();
  });
  bar.insertBefore(ctrl.el, actions);
  msTurnover.company = ctrl;
  document.getElementById('resetTurnoverFilters').addEventListener('click', () => {
    msTurnover.company.clear();
    turnoverFilters.company = null;
    renderTurnoverActive();
  });

  document.querySelectorAll('#turnoverSubtabbar button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#turnoverSubtabbar button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.subtabpane').forEach(p => p.classList.remove('active'));
      document.getElementById('turnover-' + btn.dataset.subtab).classList.add('active');
      turnoverActiveSubtab = btn.dataset.subtab;
      renderTurnoverActive();
    });
  });

  initInOutTable();
  renderTurnoverActive();
}

function renderTurnoverActive() {
  const run = (fn) => { try { fn(); } catch (e) { console.error('Render error in ' + fn.name + ':', e); } };
  switch (turnoverActiveSubtab) {
    case 'overview': run(renderTurnoverOverview); break;
    case 'trend': run(renderTurnoverTrend); break;
    case 'dept': run(renderTurnoverDept); break;
    case 'reasons': run(renderTurnoverReasons); break;
    case 'inout': run(renderInOutTable); break;
  }
}

/** Applies the shared Company filter to hires (REC), resigns (Turnover, with
 * inferred company) and current roster (EMP) consistently. */
function scopedHires() { return REC.filter(r => r.status === 'เริ่มงานแล้ว' && (!turnoverFilters.company || turnoverFilters.company.has(r.company))); }
function scopedResigns() { return turnoverWithCompany().filter(r => !turnoverFilters.company || turnoverFilters.company.has(r.company)); }
function scopedEmp() { return EMP.filter(r => !turnoverFilters.company || turnoverFilters.company.has(r.company)); }

/* ------------------------------- SUB-TAB: Overview -------------------------------- */

function renderTurnoverOverview() {
  const hires = scopedHires(), resigns = scopedResigns(), emp = scopedEmp();
  const headcount = emp.length;
  const netYtd = hires.length - resigns.length;

  const latestRow = [...TURN_MONTHLY].reverse().find(r => r.turnover_rate_2026 !== '');
  const latestRate = latestRow ? Number(latestRow.turnover_rate_2026) : null;

  document.getElementById('kpiTurnoverOverview').innerHTML = [
    { label: 'Current Headcount', value: fmtNum(headcount), sub: 'employees', color: 'var(--blue)' },
    { label: 'Hired', value: '+' + fmtNum(hires.length), sub: 'in current filter', color: 'var(--green)' },
    { label: 'Resigned', value: fmtNum(resigns.length), sub: 'in current filter', color: 'var(--rose)' },
    { label: 'Turnover Rate', value: latestRate !== null ? fmtPct(latestRate) : '–', sub: 'cumulative, company-wide', color: 'var(--amber)' },
    { label: 'Net Change', value: (netYtd > 0 ? '+' : '') + fmtNum(netYtd), sub: 'hired − resigned', color: netYtd >= 0 ? 'var(--green)' : 'var(--rose)' },
  ].map(c => `<div class="kpi-card" style="--bar-color:${c.color}"><div class="label">${c.label}</div><div class="value tnum">${c.value}</div><div class="sub">${c.sub}</div></div>`).join('');

  const use2026 = TURN_MONTHLY.some(r => r.headcount_2026 !== '');
  destroyChart('hcOverview');
  charts.hcOverview = new Chart(document.getElementById('chartHcOverview'), {
    type: 'line',
    data: {
      labels: TURN_MONTHLY.map(r => tr(r.month)),
      datasets: [{
        label: use2026 ? 'Headcount 2026' : 'Headcount 2025',
        data: TURN_MONTHLY.map(r => { const v = use2026 ? r.headcount_2026 : r.headcount_2025; return v !== '' ? Number(v) : null; }),
        borderColor: CHART_COLORS.blue, backgroundColor: CHART_COLORS.blueSoft, fill: true, tension: .3, pointRadius: 4, spanGaps: true,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, datalabels: { align: 'top', color: CHART_COLORS.ink, font: { weight: '700', size: 10 }, formatter: v => v !== null ? fmtNum(v) : '', clamp: true } },
      scales: { y: graceScale(), x: { grid: { display: false } } }
    },
    plugins: [ChartDataLabels]
  });

  const months = MONTH_ABBR;
  const hiredByMonth = months.map(m => hires.filter(r => monthAbbrFromDate(r.start_date) === m).length);
  const resignedByMonth = months.map(m => resigns.filter(r => monthAbbrFromDate(r.effective_date) === m).length);
  destroyChart('inOutMonth');
  charts.inOutMonth = new Chart(document.getElementById('chartInOutMonth'), {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        { label: 'Hired', data: hiredByMonth, backgroundColor: CHART_COLORS.green, borderRadius: 5 },
        { label: 'Resigned', data: resignedByMonth, backgroundColor: CHART_COLORS.rose, borderRadius: 5 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' }, datalabels: smartBarLabels({ size: 10 }) },
      scales: { y: graceScale(), x: { grid: { display: false } } }
    },
    plugins: [ChartDataLabels]
  });

  const byDiv = {};
  resigns.forEach(r => { if (r.division) byDiv[r.division] = (byDiv[r.division] || 0) + 1; });
  const topDivs = Object.keys(byDiv).sort((a, b) => byDiv[b] - byDiv[a]).slice(0, 5);
  destroyChart('topExitDivisions');
  charts.topExitDivisions = new Chart(document.getElementById('chartTopExitDivisions'), {
    type: 'bar',
    data: { labels: topDivs.map(tr), datasets: [{ data: topDivs.map(d => byDiv[d]), backgroundColor: CHART_COLORS.rose, borderRadius: 6, maxBarThickness: 28 }] },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, datalabels: smartBarLabels() },
      scales: { x: graceScale(), y: { grid: { display: false }, ticks: { font: { size: 11 } } } }
    },
    plugins: [ChartDataLabels]
  });

  renderMonthlySummaryTable(hires, resigns, 'monthlySummaryBody');
}

/** Builds the "hired / resigned / net / running headcount" table used by
 * both the Overview and Trend sub-tabs. Running headcount is anchored to the
 * precomputed Turnover_Graph figures (most reliable source), not re-derived. */
function renderMonthlySummaryTable(hires, resigns, tbodyId) {
  const use2026 = TURN_MONTHLY.some(r => r.headcount_2026 !== '');
  const rows = MONTH_ABBR.map((m, i) => {
    const h = hires.filter(r => monthAbbrFromDate(r.start_date) === m).length;
    const r = resigns.filter(x => monthAbbrFromDate(x.effective_date) === m).length;
    const hc = use2026 ? TURN_MONTHLY[i]?.headcount_2026 : TURN_MONTHLY[i]?.headcount_2025;
    return { month: m, hired: h, resigned: r, net: h - r, hc: hc !== '' && hc !== undefined ? Number(hc) : null };
  });
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.month}</td>
      <td class="tnum" style="color:var(--green)">${r.hired ? '+' + r.hired : '–'}</td>
      <td class="tnum" style="color:var(--rose)">${r.resigned ? '-' + r.resigned : '–'}</td>
      <td class="tnum" style="color:${r.net >= 0 ? 'var(--green)' : 'var(--rose)'}">${r.net > 0 ? '+' : ''}${r.net}</td>
      <td class="tnum">${r.hc !== null ? fmtNum(r.hc) : '–'}</td>
    </tr>`).join('');
}

/* -------------------------------- SUB-TAB: Trend ----------------------------------- */

function renderTurnoverTrend() {
  const hires = scopedHires(), resigns = scopedResigns();
  const hcSeries = TURN_MONTHLY.map(r => r.headcount_2026 !== '' ? Number(r.headcount_2026) : (r.headcount_2025 !== '' ? Number(r.headcount_2025) : null)).filter(v => v !== null);
  const latestHc = hcSeries.length ? hcSeries[hcSeries.length - 1] : null;
  const peakHc = hcSeries.length ? Math.max(...hcSeries) : null;
  const netYtd = hires.length - resigns.length;
  const resignsByMonth = MONTH_ABBR.map(m => resigns.filter(r => monthAbbrFromDate(r.effective_date) === m).length);
  const worstIdx = resignsByMonth.indexOf(Math.max(...resignsByMonth));
  const worstMonth = resignsByMonth[worstIdx] > 0 ? MONTH_ABBR[worstIdx] : '–';

  document.getElementById('kpiTurnoverTrend').innerHTML = [
    { label: 'Latest Headcount', value: latestHc !== null ? fmtNum(latestHc) : '–', sub: 'most recent month', color: 'var(--blue)' },
    { label: 'Peak This Year', value: peakHc !== null ? fmtNum(peakHc) : '–', sub: 'highest monthly headcount', color: 'var(--blue)' },
    { label: 'Net Change', value: (netYtd > 0 ? '+' : '') + fmtNum(netYtd), sub: 'hired − resigned, current filter', color: netYtd >= 0 ? 'var(--green)' : 'var(--rose)' },
    { label: 'Highest-Exit Month', value: worstMonth, sub: worstMonth !== '–' ? `${resignsByMonth[worstIdx]} resignation(s)` : 'no resignations', color: 'var(--rose)' },
  ].map(c => `<div class="kpi-card" style="--bar-color:${c.color}"><div class="label">${c.label}</div><div class="value tnum">${c.value}</div><div class="sub">${c.sub}</div></div>`).join('');

  destroyChart('turnoverTrend');
  charts.turnoverTrend = new Chart(document.getElementById('chartTurnoverTrend'), {
    data: {
      labels: TURN_MONTHLY.map(r => tr(r.month)),
      datasets: [
        { type: 'bar', label: '% Turnover 2025', data: TURN_MONTHLY.map(r => r.turnover_rate_2025 !== '' ? Math.round(Number(r.turnover_rate_2025) * 1000) / 10 : null), backgroundColor: CHART_COLORS.roseSoft, borderRadius: 5, yAxisID: 'y1' },
        { type: 'bar', label: '% Turnover 2026', data: TURN_MONTHLY.map(r => r.turnover_rate_2026 !== '' ? Math.round(Number(r.turnover_rate_2026) * 1000) / 10 : null), backgroundColor: CHART_COLORS.rose, borderRadius: 5, yAxisID: 'y1' },
        { type: 'line', label: 'Active Headcount 2025', data: TURN_MONTHLY.map(r => r.headcount_2025 !== '' ? Number(r.headcount_2025) : null), borderColor: CHART_COLORS.blueSoft, backgroundColor: CHART_COLORS.blueSoft, tension: .35, yAxisID: 'y', pointRadius: 3, spanGaps: true },
        { type: 'line', label: 'Active Headcount 2026', data: TURN_MONTHLY.map(r => r.headcount_2026 !== '' ? Number(r.headcount_2026) : null), borderColor: CHART_COLORS.blue, backgroundColor: CHART_COLORS.blue, tension: .35, yAxisID: 'y', pointRadius: 3, spanGaps: true },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        datalabels: {
          display: (c) => c.dataset.type === 'bar' && c.dataset.data[c.dataIndex] !== null && c.dataset.data[c.dataIndex] > 0,
          color: CHART_COLORS.ink, anchor: 'end', align: 'top', font: { weight: '700', size: 10 },
          formatter: v => v + '%', clamp: true,
        },
      },
      scales: {
        y: { beginAtZero: true, position: 'left', grace: '20%', grid: { color: CHART_COLORS.line }, title: { display: true, text: 'Active headcount' } },
        y1: { beginAtZero: true, position: 'right', grace: '25%', grid: { display: false }, title: { display: true, text: '% Turnover' }, ticks: { callback: v => v + '%' } },
        x: { grid: { display: false } }
      }
    },
    plugins: [ChartDataLabels]
  });

  const hiredByMonth = MONTH_ABBR.map(m => hires.filter(r => monthAbbrFromDate(r.start_date) === m).length);
  const netByMonth = MONTH_ABBR.map((m, i) => hiredByMonth[i] - resignsByMonth[i]);
  destroyChart('netChange');
  charts.netChange = new Chart(document.getElementById('chartNetChange'), {
    type: 'bar',
    data: { labels: MONTH_ABBR, datasets: [{ data: netByMonth, backgroundColor: netByMonth.map(v => v >= 0 ? CHART_COLORS.green : CHART_COLORS.rose), borderRadius: 5 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, datalabels: { display: (c) => c.dataset.data[c.dataIndex] !== 0, anchor: 'end', align: (c) => c.dataset.data[c.dataIndex] >= 0 ? 'top' : 'bottom', color: CHART_COLORS.ink, font: { weight: '700', size: 11 }, formatter: v => (v > 0 ? '+' : '') + v } },
      scales: { y: { grid: { color: CHART_COLORS.line }, grace: '20%' }, x: { grid: { display: false } } }
    },
    plugins: [ChartDataLabels]
  });
}

/* ----------------------------- SUB-TAB: By Department ------------------------------ */

function renderTurnoverDept() {
  const hires = scopedHires(), resigns = scopedResigns();
  const divisions = [...new Set([...hires.map(r => r.division), ...resigns.map(r => r.division)])].filter(Boolean);
  const byDiv = divisions.map(d => ({
    division: d,
    hired: hires.filter(r => r.division === d).length,
    resigned: resigns.filter(r => r.division === d).length,
  })).sort((a, b) => (b.hired + b.resigned) - (a.hired + a.resigned)).slice(0, 12);

  destroyChart('deptInOut');
  charts.deptInOut = new Chart(document.getElementById('chartDeptInOut'), {
    type: 'bar',
    data: {
      labels: byDiv.map(d => tr(d.division)),
      datasets: [
        { label: 'Hired', data: byDiv.map(d => d.hired), backgroundColor: CHART_COLORS.green, borderRadius: 5, maxBarThickness: 16 },
        { label: 'Resigned', data: byDiv.map(d => d.resigned), backgroundColor: CHART_COLORS.rose, borderRadius: 5, maxBarThickness: 16 },
      ]
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' }, datalabels: smartBarLabels({ size: 10 }) },
      scales: { x: graceScale(), y: { grid: { display: false }, ticks: { font: { size: 11 } } } }
    },
    plugins: [ChartDataLabels]
  });

  const emp = scopedEmp();
  const empByDiv = {};
  emp.forEach(r => { if (r.division) empByDiv[r.division] = (empByDiv[r.division] || 0) + 1; });
  document.getElementById('deptDetailBody').innerHTML = byDiv.map(d => {
    const current = empByDiv[d.division] || 0;
    const base = current + d.resigned;
    const rate = base ? Math.round(d.resigned / base * 100) : 0;
    return `<tr>
      <td>${tr(d.division)}</td>
      <td class="tnum" style="color:var(--green)">${d.hired ? '+' + d.hired : '–'}</td>
      <td class="tnum" style="color:var(--rose)">${d.resigned ? '-' + d.resigned : '–'}</td>
      <td class="tnum" style="color:${d.hired - d.resigned >= 0 ? 'var(--green)' : 'var(--rose)'}">${d.hired - d.resigned > 0 ? '+' : ''}${d.hired - d.resigned}</td>
      <td class="tnum">${base ? rate + '%' : '–'}</td>
    </tr>`;
  }).join('');
}

/* -------------------------------- SUB-TAB: Reasons --------------------------------- */

function renderTurnoverReasons() {
  const resigns = scopedResigns();
  const withReason = resigns.filter(r => r.detail || r.reason);
  const noReason = resigns.length - withReason.length;

  const reasonCounts = {};
  withReason.forEach(r => { const key = tr(r.detail || r.reason); reasonCounts[key] = (reasonCounts[key] || 0) + 1; });
  const reasonLabels = Object.keys(reasonCounts).sort((a, b) => reasonCounts[b] - reasonCounts[a]);
  const topReason = reasonLabels[0] || '–';

  document.getElementById('kpiReasons').innerHTML = [
    { label: 'Total Resigned', value: fmtNum(resigns.length), sub: 'current filter', color: 'var(--rose)' },
    { label: 'Top Reason', value: topReason, sub: topReason !== '–' ? `${reasonCounts[topReason]} record(s)` : '', color: 'var(--amber)' },
    { label: 'Distinct Reasons', value: fmtNum(reasonLabels.length), sub: 'recorded categories', color: 'var(--blue)' },
    { label: 'No Reason Recorded', value: fmtNum(noReason), sub: resigns.length ? fmtPct(noReason / resigns.length) + ' of resignations' : '–', color: 'var(--gray)' },
  ].map(c => `<div class="kpi-card" style="--bar-color:${c.color}"><div class="label">${c.label}</div><div class="value tnum">${c.value}</div><div class="sub">${c.sub}</div></div>`).join('');

  const topLabels = reasonLabels.slice(0, 10);
  destroyChart('reasons');
  charts.reasons = new Chart(document.getElementById('chartReasons'), {
    type: 'bar',
    data: { labels: topLabels, datasets: [{ data: topLabels.map(l => reasonCounts[l]), backgroundColor: CHART_COLORS.amber, borderRadius: 8, maxBarThickness: 26 }] },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, datalabels: smartBarLabels() },
      scales: { x: graceScale(), y: { grid: { display: false }, ticks: { font: { size: 11 } } } }
    },
    plugins: [ChartDataLabels]
  });

  const top6 = reasonLabels.slice(0, 6);
  const companies = ['Manpower', 'HR Digest'];
  destroyChart('reasonsByCompany');
  charts.reasonsByCompany = new Chart(document.getElementById('chartReasonsByCompany'), {
    type: 'bar',
    data: {
      labels: top6,
      datasets: companies.map((c, i) => ({
        label: c,
        data: top6.map(reason => withReason.filter(r => r.company === c && tr(r.detail || r.reason) === reason).length),
        backgroundColor: COMPANY_COLORS[c],
        borderRadius: 5,
      }))
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' }, datalabels: smartBarLabels({ size: 10 }) },
      scales: { x: graceScale(), y: { grid: { display: false }, ticks: { font: { size: 10 } } } }
    },
    plugins: [ChartDataLabels]
  });

  const tenureBuckets = { '<1 yr': 0, '1-3 yrs': 0, '3-5 yrs': 0, '5-10 yrs': 0, '10+ yrs': 0 };
  resigns.forEach(r => {
    const t = Number(r.tenure_years);
    if (isNaN(t)) return;
    if (t < 1) tenureBuckets['<1 yr']++;
    else if (t < 3) tenureBuckets['1-3 yrs']++;
    else if (t < 5) tenureBuckets['3-5 yrs']++;
    else if (t < 10) tenureBuckets['5-10 yrs']++;
    else tenureBuckets['10+ yrs']++;
  });
  destroyChart('tenure');
  charts.tenure = new Chart(document.getElementById('chartTenure'), {
    type: 'bar',
    data: { labels: Object.keys(tenureBuckets), datasets: [{ data: Object.values(tenureBuckets), backgroundColor: CHART_COLORS.teal, borderRadius: 8, maxBarThickness: 44 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, datalabels: smartBarLabels() },
      scales: { y: graceScale(), x: { grid: { display: false } } }
    },
    plugins: [ChartDataLabels]
  });
}

/* ------------------------------ SUB-TAB: In-Out List -------------------------------- */

let inoutSort = { key: 'date', dir: -1 };
let inoutPage = 0;
const INOUT_PAGE_SIZE = 15;

function initInOutTable() {
  document.getElementById('inoutSearch').addEventListener('input', () => { inoutPage = 0; renderInOutTable(); });
  document.querySelectorAll('#inoutTable thead th').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.key;
      if (inoutSort.key === key) inoutSort.dir *= -1; else { inoutSort.key = key; inoutSort.dir = 1; }
      renderInOutTable();
    });
  });
  document.getElementById('inoutPrev').addEventListener('click', () => { if (inoutPage > 0) { inoutPage--; renderInOutTable(); } });
  document.getElementById('inoutNext').addEventListener('click', () => { inoutPage++; renderInOutTable(); });
}

function renderInOutTable() {
  const hires = scopedHires().map(r => ({ date: r.start_date, type: 'Hired', employee_id: '–', position: r.position, division: r.division, department: r.dept }));
  const resigns = scopedResigns().map(r => ({ date: r.effective_date, type: 'Resigned', employee_id: r.employee_id || '–', position: r.position, division: r.division, department: r.department }));
  let rows = [...hires, ...resigns];

  const q = (document.getElementById('inoutSearch').value || '').trim().toLowerCase();
  if (q) rows = rows.filter(r => [r.employee_id, r.position, r.division, r.department].some(v => (v || '').toLowerCase().includes(q)));

  rows.sort((a, b) => {
    const av = a[inoutSort.key] || '', bv = b[inoutSort.key] || '';
    if (av < bv) return -1 * inoutSort.dir;
    if (av > bv) return 1 * inoutSort.dir;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(rows.length / INOUT_PAGE_SIZE));
  inoutPage = Math.min(inoutPage, totalPages - 1);
  const pageRows = rows.slice(inoutPage * INOUT_PAGE_SIZE, (inoutPage + 1) * INOUT_PAGE_SIZE);

  document.getElementById('inoutTableBody').innerHTML = pageRows.map(r => `
    <tr>
      <td class="tnum">${r.date || '–'}</td>
      <td><span class="pill" style="background:${r.type === 'Hired' ? 'var(--green-soft);color:var(--green)' : 'var(--rose-soft);color:var(--rose)'}">${r.type}</span></td>
      <td class="tnum">${r.employee_id}</td>
      <td>${tr(r.position)}</td>
      <td>${tr(r.division)}</td>
      <td>${tr(r.department)}</td>
    </tr>`).join('');

  document.getElementById('inoutCount').textContent = `${rows.length.toLocaleString('en-US')} records`;
  document.getElementById('inoutPageLabel').textContent = `Page ${inoutPage + 1} / ${totalPages}`;
  document.getElementById('inoutPrev').disabled = inoutPage === 0;
  document.getElementById('inoutNext').disabled = inoutPage >= totalPages - 1;
}


/* ------------------------- TAB 4: Employee list -------------------------- */

let empSort = { key: 'name', dir: 1 };
let empPage = 0;
const EMP_PAGE_SIZE = 15;

let empFilters = { company: null, division: null, department: null };
let msEmp = {};

function initEmployeeTable() {
  buildEmpCompanyFilter();
  rebuildEmpDivisionFilter();
  document.getElementById('resetEmpFilters').addEventListener('click', () => {
    msEmp.company.clear();
    empFilters.company = null;
    rebuildEmpDivisionFilter();
    empPage = 0;
    renderEmployeeTable();
  });

  document.getElementById('empSearch').addEventListener('input', () => { empPage = 0; renderEmployeeTable(); });
  document.querySelectorAll('#empTable thead th').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.key;
      if (empSort.key === key) empSort.dir *= -1; else { empSort.key = key; empSort.dir = 1; }
      renderEmployeeTable();
    });
  });
  document.getElementById('empPrev').addEventListener('click', () => { if (empPage > 0) { empPage--; renderEmployeeTable(); } });
  document.getElementById('empNext').addEventListener('click', () => { empPage++; renderEmployeeTable(); });
  renderEmployeeTable();
}

function buildEmpCompanyFilter() {
  const bar = document.getElementById('filterBarEmployees');
  const actions = bar.querySelector('.filter-actions');
  const ctrl = buildMultiSelect(bar, 'Company', uniqueSorted(EMP, 'company'), sel => {
    empFilters.company = sel;
    rebuildEmpDivisionFilter();
    empPage = 0;
    renderEmployeeTable();
  });
  bar.insertBefore(ctrl.el, actions);
  msEmp.company = ctrl;
}

/** Division options narrow to the selected Company; Department options narrow to
 * the selected Company + Division. Both are derived live from the employee data
 * (no hardcoded org-chart mapping), so they stay correct as the roster changes. */
function rebuildEmpDivisionFilter() {
  const bar = document.getElementById('filterBarEmployees');
  const actions = bar.querySelector('.filter-actions');
  if (msEmp.division) msEmp.division.el.remove();

  const scoped = empFilters.company ? EMP.filter(r => empFilters.company.has(r.company)) : EMP;
  empFilters.division = null;
  const ctrl = buildMultiSelect(bar, 'Division', uniqueSorted(scoped, 'division'), sel => {
    empFilters.division = sel;
    rebuildEmpDepartmentFilter();
    empPage = 0;
    renderEmployeeTable();
  }, tr);
  bar.insertBefore(ctrl.el, actions);
  msEmp.division = ctrl;
  rebuildEmpDepartmentFilter();
}

function rebuildEmpDepartmentFilter() {
  const bar = document.getElementById('filterBarEmployees');
  const actions = bar.querySelector('.filter-actions');
  if (msEmp.department) msEmp.department.el.remove();

  let scoped = empFilters.company ? EMP.filter(r => empFilters.company.has(r.company)) : EMP;
  if (empFilters.division) scoped = scoped.filter(r => empFilters.division.has(r.division));
  empFilters.department = null;
  const ctrl = buildMultiSelect(bar, 'Department', uniqueSorted(scoped, 'department'), sel => {
    empFilters.department = sel;
    empPage = 0;
    renderEmployeeTable();
  }, tr);
  bar.insertBefore(ctrl.el, actions);
  msEmp.department = ctrl;
}

function renderEmployeeTable() {
  const q = document.getElementById('empSearch').value.trim().toLowerCase();
  let rows = EMP.filter(r => {
    if (empFilters.company && !empFilters.company.has(r.company)) return false;
    if (empFilters.division && !empFilters.division.has(r.division)) return false;
    if (empFilters.department && !empFilters.department.has(r.department)) return false;
    if (q && ![r.employee_id, r.name, r.position, r.division, r.department, r.work_unit].some(v => (v || '').toLowerCase().includes(q))) return false;
    return true;
  });

  rows = rows.slice().sort((a, b) => {
    const av = empSort.key === 'age' || empSort.key === 'tenure_years' ? Number(a[empSort.key])||0 : (a[empSort.key]||'');
    const bv = empSort.key === 'age' || empSort.key === 'tenure_years' ? Number(b[empSort.key])||0 : (b[empSort.key]||'');
    if (av < bv) return -1 * empSort.dir;
    if (av > bv) return 1 * empSort.dir;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(rows.length / EMP_PAGE_SIZE));
  empPage = Math.min(empPage, totalPages - 1);
  const pageRows = rows.slice(empPage * EMP_PAGE_SIZE, (empPage + 1) * EMP_PAGE_SIZE);

  document.getElementById('empTableBody').innerHTML = pageRows.map(r => {
    const pillColor = COMPANY_PILL[r.company] || 'var(--gray-soft);color:var(--gray)';
    return `<tr>
      <td><span class="pill" style="background:${pillColor}">${r.company}</span></td>
      <td class="tnum">${r.employee_id || '–'}</td>
      <td>${r.name}</td>
      <td>${tr(r.position)}</td>
      <td>${tr(r.division)}</td>
      <td>${tr(r.department)}</td>
      <td>${tr(r.work_unit)}</td>
      <td>${tr(r.location)}</td>
      <td class="tnum">${r.age || '–'}</td>
      <td class="tnum">${r.tenure_years || '–'}</td>
    </tr>`;
  }).join('');

  document.getElementById('empCount').textContent = `${rows.length.toLocaleString('en-US')} records`;
  document.getElementById('empPageLabel').textContent = `Page ${empPage + 1} / ${totalPages}`;
  document.getElementById('empPrev').disabled = empPage === 0;
  document.getElementById('empNext').disabled = empPage >= totalPages - 1;
}

init();
