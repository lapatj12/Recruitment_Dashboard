/* ==========================================================================
   Subcontract Overview Dashboard
   ========================================================================== */

let EMP = [], REC = [], TURN = [], TURN_MONTHLY = [];
let charts = {};
let overviewFilters = { company: null, division: null };
let recruitFilters = { company: null, status: null, year: null };

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
  [
    { key: 'company', label: 'Company', field: 'company' },
    { key: 'division', label: 'Division', field: 'division' },
  ].forEach(d => {
    const opts = uniqueSorted(EMP, d.field);
    const ctrl = buildMultiSelect(bar, d.label, opts, sel => { overviewFilters[d.key] = sel; renderOverview(); }, d.field === 'division' ? tr : (v => v));
    bar.insertBefore(bar.lastElementChild, actions);
    msOverview[d.key] = ctrl;
  });
  document.getElementById('resetOverview').addEventListener('click', () => {
    Object.values(msOverview).forEach(c => c.clear());
    overviewFilters = { company: null, division: null };
    renderOverview();
  });
  renderOverview();
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
  const totalResigned = TURN_MONTHLY.reduce((s, r) => s + (Number(r.resigned_2025) || 0) + (Number(r.resigned_2026) || 0), 0);
  const netChange = totalStarted - totalResigned;

  document.getElementById('kpiOverview').innerHTML = [
    { label: 'Current Total Headcount', value: fmtNum(total), sub: 'employees', color: 'var(--accent)' },
    { label: 'Manpower', value: fmtNum(manpower), sub: total ? fmtPct(manpower/total) : '–', color: 'var(--teal)' },
    { label: 'HR Digest', value: fmtNum(hrd), sub: total ? fmtPct(hrd/total) : '–', color: 'var(--blue)' },
    { label: 'Average Age', value: avgAge !== null ? fmtNum(avgAge) + ' yrs' : '–', sub: 'of current employees', color: 'var(--amber)' },
    { label: 'Average Tenure', value: avgTenure !== null ? fmtNum(avgTenure) + ' yrs' : '–', sub: 'of current employees', color: 'var(--violet)' },
    { label: 'Net Headcount Change', value: (netChange > 0 ? '+' : '') + fmtNum(netChange), sub: `${fmtNum(totalStarted)} started − ${fmtNum(totalResigned)} resigned (all-time, company-wide)`, color: netChange >= 0 ? 'var(--teal)' : 'var(--rose)' },
  ].map(c => `<div class="kpi-card" style="--bar-color:${c.color}"><div class="label">${c.label}</div><div class="value tnum">${c.value}</div><div class="sub">${c.sub}</div></div>`).join('');
  document.getElementById('kpiOverview').style.gridTemplateColumns = 'repeat(3, 1fr)';

  destroyChart('company');
  charts.company = new Chart(document.getElementById('chartCompany'), {
    type: 'doughnut',
    data: { labels: ['Manpower','HR Digest'], datasets: [{ data: [manpower, hrd], backgroundColor: [CHART_COLORS.teal, CHART_COLORS.blue], borderWidth: 0 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '62%',
      plugins: {
        legend: { position: 'bottom' },
        datalabels: { color: '#fff', font: { weight: '700', size: 13 }, formatter: (v) => v > 0 ? v : '' }
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
      plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'right', color: CHART_COLORS.ink, font: { weight: '700', size: 12 } } },
      scales: { x: { beginAtZero: true, grid: { color: CHART_COLORS.line } }, y: { grid: { display: false }, ticks: { autoSkip: false, font: { size: 11 } } } }
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
    { key: 'status', label: 'Status', field: 'status' },
    { key: 'year', label: 'Year', field: 'year' },
  ].forEach(d => {
    const opts = uniqueSorted(REC, d.field);
    const ctrl = buildMultiSelect(bar, d.label, opts, sel => { recruitFilters[d.key] = sel; renderRecruitment(); }, d.field === 'status' ? tr : (v => v));
    bar.insertBefore(bar.lastElementChild, actions);
    msRecruit[d.key] = ctrl;
  });
  document.getElementById('resetRecruit').addEventListener('click', () => {
    Object.values(msRecruit).forEach(c => c.clear());
    recruitFilters = { company: null, status: null, year: null };
    renderRecruitment();
  });
  renderRecruitment();
}

function renderRecruitment() {
  const data = REC.filter(r => {
    if (recruitFilters.company && !recruitFilters.company.has(r.company)) return false;
    if (recruitFilters.status && !recruitFilters.status.has(r.status)) return false;
    if (recruitFilters.year && !recruitFilters.year.has(r.year)) return false;
    return true;
  });

  const total = data.length;
  const started = data.filter(r => r.status === 'เริ่มงานแล้ว').length; // 'เริ่มงานแล้ว' = Started
  const leadDays = data.map(r => Number(r.diff_days)).filter(n => !isNaN(n));
  const avgLead = leadDays.length ? leadDays.reduce((s,v)=>s+v,0)/leadDays.length : null;
  const companies = new Set(data.map(r => r.company)).size;

  document.getElementById('kpiRecruit').innerHTML = [
    { label: 'Total Requests', value: fmtNum(total), sub: 'positions', color: 'var(--accent)' },
    { label: 'Started', value: fmtNum(started), sub: total ? fmtPct(started/total) : '–', color: 'var(--teal)' },
    { label: 'Avg. Lead Time', value: avgLead !== null ? fmtNum(avgLead) + ' days' : '–', sub: 'From request to confirmed', color: 'var(--blue)' },
    { label: 'Service Providers', value: fmtNum(companies), sub: 'companies', color: 'var(--amber)' },
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
      scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, grid: { color: CHART_COLORS.line } } }
    },
    plugins: [ChartDataLabels]
  });

  const byCompanyLead = {};
  data.forEach(r => { const d = Number(r.diff_days); if (!isNaN(d)) (byCompanyLead[r.company] = byCompanyLead[r.company] || []).push(d); });
  const leadLabels = Object.keys(byCompanyLead);
  destroyChart('leadTime');
  charts.leadTime = new Chart(document.getElementById('chartLeadTime'), {
    type: 'bar',
    data: { labels: leadLabels, datasets: [{ data: leadLabels.map(l => Math.round(byCompanyLead[l].reduce((s,v)=>s+v,0)/byCompanyLead[l].length)), backgroundColor: CHART_COLORS.violet, borderRadius: 8, maxBarThickness: 60 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'top', color: CHART_COLORS.ink, font: { weight: '700', size: 13 }, formatter: v => v + ' days' } },
      scales: { y: { beginAtZero: true, grid: { color: CHART_COLORS.line } }, x: { grid: { display: false } } }
    },
    plugins: [ChartDataLabels]
  });
}

/* --------------------------- TAB 3: Turnover ----------------------------- */

function initTurnover() {
  const resigned2025 = TURN_MONTHLY.reduce((s,r) => s + (Number(r.resigned_2025)||0), 0);
  const resigned2026 = TURN_MONTHLY.reduce((s,r) => s + (Number(r.resigned_2026)||0), 0);
  const latestRow2026 = [...TURN_MONTHLY].reverse().find(r => r.turnover_rate_2026 !== '');
  const latestTurnoverRate = latestRow2026 ? Number(latestRow2026.turnover_rate_2026) : null;

  const resignedAges = TURN.map(r => Number(r.age)).filter(n => !isNaN(n));
  const avgResignedAge = resignedAges.length ? resignedAges.reduce((s,v)=>s+v,0)/resignedAges.length : null;
  const currentAges = EMP.map(r => Number(r.age)).filter(n => !isNaN(n));
  const avgCurrentAge = currentAges.length ? currentAges.reduce((s,v)=>s+v,0)/currentAges.length : null;

  document.getElementById('kpiTurnover').innerHTML = [
    { label: 'Resigned YTD 2025', value: fmtNum(resigned2025), sub: 'employees', color: 'var(--rose)' },
    { label: 'Resigned YTD 2026', value: fmtNum(resigned2026), sub: 'employees (YTD)', color: 'var(--rose)' },
    { label: 'Latest % Turnover (2026)', value: latestTurnoverRate !== null ? fmtPct(latestTurnoverRate) : '–', sub: 'Cumulative to date', color: 'var(--amber)' },
    { label: 'Avg. Age of Leavers', value: avgResignedAge !== null ? fmtNum(avgResignedAge) + ' yrs' : '–', sub: 'vs. current employees ' + (avgCurrentAge !== null ? fmtNum(avgCurrentAge)+' yrs' : '–'), color: 'var(--blue)' },
  ].map(c => `<div class="kpi-card" style="--bar-color:${c.color}"><div class="label">${c.label}</div><div class="value tnum">${c.value}</div><div class="sub">${c.sub}</div></div>`).join('');
  document.getElementById('kpiTurnover').style.gridTemplateColumns = 'repeat(4, 1fr)';

  destroyChart('turnoverTrend');
  charts.turnoverTrend = new Chart(document.getElementById('chartTurnoverTrend'), {
    data: {
      labels: TURN_MONTHLY.map(r => tr(r.month)),
      datasets: [
        { type: 'bar', label: 'Resigned 2025', data: TURN_MONTHLY.map(r => Number(r.resigned_2025)||0), backgroundColor: CHART_COLORS.roseSoft, borderRadius: 5, yAxisID: 'y' },
        { type: 'bar', label: 'Resigned 2026', data: TURN_MONTHLY.map(r => r.resigned_2026 !== '' ? Number(r.resigned_2026) : null), backgroundColor: CHART_COLORS.rose, borderRadius: 5, yAxisID: 'y' },
        { type: 'line', label: '% Turnover 2025', data: TURN_MONTHLY.map(r => r.turnover_rate_2025 !== '' ? Number(r.turnover_rate_2025)*100 : null), borderColor: CHART_COLORS.blueSoft, backgroundColor: CHART_COLORS.blueSoft, tension: .35, yAxisID: 'y1', pointRadius: 3 },
        { type: 'line', label: '% Turnover 2026', data: TURN_MONTHLY.map(r => r.turnover_rate_2026 !== '' ? Number(r.turnover_rate_2026)*100 : null), borderColor: CHART_COLORS.blue, backgroundColor: CHART_COLORS.blue, tension: .35, yAxisID: 'y1', pointRadius: 3 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        datalabels: { display: (c) => c.dataset.type === 'bar' && c.dataset.data[c.dataIndex] > 0, color: CHART_COLORS.ink, anchor: 'end', align: 'top', font: { weight: '700', size: 10 } },
      },
      scales: {
        y: { beginAtZero: true, position: 'left', grid: { color: CHART_COLORS.line }, title: { display: true, text: 'Number of leavers' } },
        y1: { beginAtZero: true, position: 'right', grid: { display: false }, title: { display: true, text: 'Cumulative % turnover' }, ticks: { callback: v => v + '%' } },
        x: { grid: { display: false } }
      }
    },
    plugins: [ChartDataLabels]
  });

  const reasonCounts = {};
  TURN.forEach(r => { if (r.reason) { const key = tr(r.reason); reasonCounts[key] = (reasonCounts[key]||0) + 1; } });
  const reasonLabels = Object.keys(reasonCounts).sort((a,b) => reasonCounts[b]-reasonCounts[a]).slice(0, 8);
  destroyChart('reasons');
  charts.reasons = new Chart(document.getElementById('chartReasons'), {
    type: 'bar',
    data: { labels: reasonLabels, datasets: [{ data: reasonLabels.map(l => reasonCounts[l]), backgroundColor: CHART_COLORS.amber, borderRadius: 8, maxBarThickness: 30 }] },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'right', color: CHART_COLORS.ink, font: { weight: '700', size: 12 } } },
      scales: { x: { beginAtZero: true, grid: { color: CHART_COLORS.line } }, y: { grid: { display: false }, ticks: { font: { size: 11 } } } }
    },
    plugins: [ChartDataLabels]
  });

  const tenureBuckets = { '<1 yr': 0, '1-3 yrs': 0, '3-5 yrs': 0, '5-10 yrs': 0, '10+ yrs': 0 };
  TURN.forEach(r => {
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
      plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'top', color: CHART_COLORS.ink, font: { weight: '700', size: 13 } } },
      scales: { y: { beginAtZero: true, grid: { color: CHART_COLORS.line } }, x: { grid: { display: false } } }
    },
    plugins: [ChartDataLabels]
  });
}

/* ------------------------- TAB 4: Employee list -------------------------- */

let empSort = { key: 'name', dir: 1 };
let empPage = 0;
const EMP_PAGE_SIZE = 15;

function initEmployeeTable() {
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

function renderEmployeeTable() {
  const q = document.getElementById('empSearch').value.trim().toLowerCase();
  let rows = EMP.filter(r => !q || [r.name, r.position, r.division, r.department, r.work_unit].some(v => (v||'').toLowerCase().includes(q)));

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
    const pillColor = r.company === 'Manpower' ? 'var(--teal-soft);color:var(--teal)' : 'var(--blue-soft);color:var(--blue)';
    return `<tr>
      <td><span class="pill" style="background:${pillColor}">${r.company}</span></td>
      <td>${r.name}</td>
      <td>${tr(r.position)}</td>
      <td>${tr(r.division)}</td>
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
