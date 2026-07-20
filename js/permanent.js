/* ==========================================================================
   Permanent Recruitment Dashboard
   ========================================================================== */

const MONTH_ORDER = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

let RAW = [];
let SAT = [];
let filters = { location: null, year: null, month: null, status: null, kpi: null };
let satFilters = { position: null, month: null };
let charts = {};
let activeTab = 'overview';

async function init() {
  [RAW, SAT] = await Promise.all([
    loadPermanentData('data/Recruitment_Requisition.xlsx'),
    loadSatisfactionData('data/Recruitment_Service_Quality_Evaluation.xlsx'),
  ]);
  RAW = RAW.filter(r => r.position || r.status);

  buildFilters();
  buildSatFilters();
  initTabs();

  document.getElementById('resetFilters').addEventListener('click', () => {
    Object.keys(msControls).forEach(k => msControls[k].clear());
    filters = { location: null, year: null, month: null, status: null, kpi: null };
    renderAll();
  });
  document.getElementById('resetSatFilters').addEventListener('click', () => {
    Object.keys(msSatControls).forEach(k => msSatControls[k].clear());
    satFilters = { position: null, month: null };
    renderSatisfactionTab();
  });
  document.getElementById('posModalClose').addEventListener('click', () => {
    document.getElementById('posModal').style.display = 'none';
  });
  initPositionsTable();

  renderAll();
}

/* ------------------------------- Tabs ------------------------------------ */

function initTabs() {
  const btns = document.querySelectorAll('#tabbar button');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tabpane').forEach(p => p.classList.remove('active'));
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      activeTab = btn.dataset.tab;
      document.getElementById('filterBar').style.display = (activeTab === 'satisfaction') ? 'none' : 'flex';
      renderActiveTab();
    });
  });
  document.getElementById('filterBar').style.display = 'flex';
}

/** Renders only the currently-visible tab's charts. Charts are deliberately never
 * created while their canvas is display:none (Chart.js can't size them correctly),
 * so each tab's charts are (re)built the moment that tab becomes active. */
function renderActiveTab() {
  const data = applyFilters(RAW);
  const run = (fn, ...args) => { try { fn(...args); } catch (e) { console.error('Render error in ' + fn.name + ':', e); } };
  switch (activeTab) {
    case 'overview':
      run(renderKPIs, data);
      run(renderKpiDonuts, data);
      run(renderTrendChart, data);
      run(renderTTHChart, data);
      break;
    case 'satisfaction':
      run(renderSatisfactionTab);
      break;
    case 'positions':
      run(renderChannelChart, data);
      run(renderPositionsTable);
      break;
    case 'analytics':
      run(renderEffectiveRateChart, data);
      run(renderDivisionChart, data);
      break;
  }
}

/* ---------------------------- Shared filters ------------------------------ */

let msControls = {};
function buildFilters() {
  const bar = document.getElementById('filterBar');
  const actions = bar.querySelector('.filter-actions');

  const defs = [
    { key: 'location', label: 'Location', field: 'location' },
    { key: 'year', label: 'Year', field: 'year' },
    { key: 'month', label: 'Month', field: 'month' },
    { key: 'status', label: 'Status', field: 'status' },
    { key: 'kpi', label: 'KPI', field: 'kpi' },
  ];
  defs.forEach(d => {
    let opts = uniqueSorted(RAW, d.field);
    if (d.key === 'month') opts = MONTH_ORDER.filter(m => opts.includes(m)).concat(opts.filter(o => !MONTH_ORDER.includes(o)));
    const ctrl = buildMultiSelect(bar, d.label, opts, (sel) => { filters[d.key] = sel; renderAll(); });
    bar.insertBefore(bar.lastElementChild, actions);
    msControls[d.key] = ctrl;
  });
}

function applyFilters(rows) {
  return rows.filter(r => {
    if (filters.location && !filters.location.has(r.location)) return false;
    if (filters.year && !filters.year.has(r.year)) return false;
    if (filters.month && !filters.month.has(r.month)) return false;
    if (filters.status && !filters.status.has(r.status)) return false;
    if (filters.kpi && !filters.kpi.has(r.kpi)) return false;
    return true;
  });
}

function renderAll() {
  renderActiveTab();
}

function showPositionModal(title, positions) {
  document.getElementById('posModalTitle').textContent = title;
  const list = document.getElementById('posModalList');
  list.innerHTML = positions.length ? positions.map(p => `<li>${p}</li>`).join('') : '<li>No positions found</li>';
  document.getElementById('posModal').style.display = 'flex';
}

function destroyChart(key) { if (charts[key]) { charts[key].destroy(); delete charts[key]; } }

/* ------------------------------- TAB: Overview ---------------------------- */

function renderKPIs(data) {
  const total = data.length;
  const effective = data.filter(r => r.status === 'Effective').length;
  const waitToJoin = data.filter(r => r.status === 'Wait to Join').length;
  const onScreening = data.filter(r => r.status === 'Screening' || r.status === 'Final Interview').length;

  const effRows = data.filter(r => r.status === 'Effective' && r.diff_days !== '' && !isNaN(Number(r.diff_days)));
  const avgTTH = effRows.length ? effRows.reduce((s, r) => s + Number(r.diff_days), 0) / effRows.length : null;

  const cards = [
    { label: 'Total Requisition', value: fmtNum(total), sub: 'All positions matching filters', color: 'var(--accent)' },
    { label: 'Effective', value: fmtNum(effective), sub: total ? fmtPct(effective / total) + ' of total' : '–', color: 'var(--teal)' },
    { label: 'Wait to Join', value: fmtNum(waitToJoin), sub: 'Awaiting start date', color: 'var(--amber)' },
    { label: 'On Screening', value: fmtNum(onScreening), sub: 'In interview / screening', color: 'var(--blue)' },
    { label: 'Avg. Time-to-Hire', value: avgTTH !== null ? fmtNum(avgTTH) + ' days' : '–', sub: 'From Approved to Final (Effective)', color: 'var(--violet)' },
  ];

  document.getElementById('kpiGrid').innerHTML = cards.map(c => `
    <div class="kpi-card" style="--bar-color:${c.color}">
      <div class="label">${c.label}</div>
      <div class="value tnum">${c.value}</div>
      <div class="sub">${c.sub}</div>
    </div>`).join('');
}

function renderTrendChart(data) {
  destroyChart('trend');
  const months = MONTH_ORDER.filter(m => data.some(r => r.month === m));
  const statuses = ['Effective', 'Wait to Join', 'Screening', 'Final Interview', 'Hold', 'Cancel'];
  const datasets = statuses.map((s, i) => ({
    label: s,
    data: months.map(m => data.filter(r => r.month === m && r.status === s).length),
    backgroundColor: CHART_PALETTE[i % CHART_PALETTE.length],
    borderRadius: 5, stack: 'a',
  }));

  const ctx = document.getElementById('chartTrend');
  charts.trend = new Chart(ctx, {
    type: 'bar',
    data: { labels: months, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        datalabels: { display: (c) => c.dataset.data[c.dataIndex] > 0, color: '#fff', font: { weight: '700', size: 10 } },
      },
      scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, grid: { color: CHART_COLORS.line } } }
    },
    plugins: [ChartDataLabels]
  });
}

/* ------------------------------- TAB: KPI Report --------------------------- */

function renderKpiDonuts(data) {
  const effective = data.filter(r => r.status === 'Effective');
  renderKpiDonutCard('donutWrapSpecial', 'legendSpecial', effective.filter(r => r.type_group === 'Special'));
  renderKpiDonutCard('donutWrapGeneral', 'legendGeneral', effective.filter(r => r.type_group === 'General'));
}

/** Builds a 2-segment donut ring as inline SVG (no <canvas>/Chart.js involved).
 * This avoids a class of environment-specific failures where some browsers/security
 * software block canvas 2D context creation ("can't acquire context from the given
 * item"), which otherwise breaks Chart.js silently. */
function buildDonutSVG(onKpi, overKpi) {
  const total = onKpi + overKpi;
  const r = 40, cx = 50, cy = 50, sw = 14;
  const circumference = 2 * Math.PI * r;
  if (!total) {
    return `<svg viewBox="0 0 100 100" width="148" height="148">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${CHART_COLORS.line}" stroke-width="${sw}"/>
    </svg>`;
  }
  const onLen = (onKpi / total) * circumference;
  const overLen = (overKpi / total) * circumference;
  return `<svg viewBox="0 0 100 100" width="148" height="148" style="transform:rotate(-90deg)">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${CHART_COLORS.line}" stroke-width="${sw}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${CHART_COLORS.teal}" stroke-width="${sw}"
      stroke-dasharray="${onLen} ${circumference - onLen}" stroke-dashoffset="0"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${CHART_COLORS.rose}" stroke-width="${sw}"
      stroke-dasharray="${overLen} ${circumference - overLen}" stroke-dashoffset="${-onLen}"/>
  </svg>`;
}

function renderKpiDonutCard(wrapId, legendId, rows) {
  const onKpi = rows.filter(r => r.kpi === 'ON KPI').length;
  const overKpi = rows.filter(r => r.kpi === 'OVER KPI').length;
  const total = onKpi + overKpi;
  const pct = total ? Math.round((onKpi / total) * 100) : 0;
  const daysVals = rows.map(r => Number(r.diff_days)).filter(n => !isNaN(n));
  const avgDays = daysVals.length ? Math.round(daysVals.reduce((s, v) => s + v, 0) / daysVals.length) : null;

  const wrap = document.getElementById(wrapId);
  wrap.innerHTML = buildDonutSVG(onKpi, overKpi) +
    `<div class="donut-center-label"><div class="pct">${total ? pct + '%' : '–'}</div><div class="cap">ON KPI</div></div>`;

  const legend = document.getElementById(legendId);
  legend.innerHTML = `
    <li><span class="dot" style="background:${CHART_COLORS.teal}"></span><span class="lbl">On KPI</span><span class="val">${onKpi}</span><span class="sub">${total ? Math.round(onKpi / total * 100) + '%' : ''}</span></li>
    <li><span class="dot" style="background:${CHART_COLORS.rose}"></span><span class="lbl">Over KPI</span><span class="val">${overKpi}</span><span class="sub">${total ? Math.round(overKpi / total * 100) + '%' : ''}</span></li>
    <li><span class="dot" style="background:${CHART_COLORS.line}"></span><span class="lbl">Avg days</span><span class="val">${avgDays !== null ? avgDays + 'd' : '–'}</span></li>
  `;
}

function renderTTHChart(data) {
  destroyChart('tth');
  const effRows = data.filter(r => r.status === 'Effective' && r.diff_days !== '' && !isNaN(Number(r.diff_days)));
  const byLoc = {};
  effRows.forEach(r => { (byLoc[r.location] = byLoc[r.location] || []).push(Number(r.diff_days)); });
  const labels = Object.keys(byLoc);
  const avgs = labels.map(l => Math.round(byLoc[l].reduce((s, v) => s + v, 0) / byLoc[l].length));

  const ctx = document.getElementById('chartTTH');
  charts.tth = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Avg. days', data: avgs, backgroundColor: CHART_COLORS.blue, borderRadius: 8, maxBarThickness: 60 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        datalabels: { anchor: 'end', align: 'top', color: CHART_COLORS.ink, font: { weight: '700', size: 13 }, formatter: v => v + ' days' },
        tooltip: { callbacks: { label: (c) => c.parsed.y + ' days average' } }
      },
      scales: { y: { beginAtZero: true, grid: { color: CHART_COLORS.line } }, x: { grid: { display: false } } }
    },
    plugins: [ChartDataLabels]
  });
}

/* ------------------------------- TAB: Positions ---------------------------- */

function renderChannelChart(data) {
  destroyChart('channel');
  const effective = data.filter(r => r.status === 'Effective' && r.channel);
  const byChannel = {};
  effective.forEach(r => { (byChannel[r.channel] = byChannel[r.channel] || []).push(r.position); });
  const labels = Object.keys(byChannel).sort((a, b) => byChannel[b].length - byChannel[a].length);
  const counts = labels.map(l => byChannel[l].length);

  const ctx = document.getElementById('chartChannel');
  charts.channel = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Number hired',
        data: counts,
        backgroundColor: labels.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]),
        borderRadius: 8, maxBarThickness: 40,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      onClick: (evt, els) => {
        if (!els.length) return;
        const idx = els[0].index;
        const label = labels[idx];
        showPositionModal('Channel: ' + label, byChannel[label]);
      },
      plugins: {
        legend: { display: false },
        datalabels: { anchor: 'end', align: 'right', color: CHART_COLORS.ink, font: { weight: '700', size: 12 } },
        tooltip: { callbacks: { label: (c) => c.parsed.x + ' position(s) — click to see the list' } }
      },
      scales: { x: { beginAtZero: true, grid: { color: CHART_COLORS.line } }, y: { grid: { display: false } } }
    },
    plugins: [ChartDataLabels]
  });
}

let posSort = { key: 'approved_date', dir: -1 };
let posPage = 0;
const POS_PAGE_SIZE = 15;

function initPositionsTable() {
  document.getElementById('posSearch').addEventListener('input', () => { posPage = 0; renderPositionsTable(); });
  document.querySelectorAll('#posTable thead th').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.key;
      if (posSort.key === key) posSort.dir *= -1; else { posSort.key = key; posSort.dir = 1; }
      renderPositionsTable();
    });
  });
  document.getElementById('posPrev').addEventListener('click', () => { if (posPage > 0) { posPage--; renderPositionsTable(); } });
  document.getElementById('posNext').addEventListener('click', () => { posPage++; renderPositionsTable(); });
}

function renderPositionsTable() {
  const q = (document.getElementById('posSearch').value || '').trim().toLowerCase();
  let rows = applyFilters(RAW).filter(r => !q || [r.position, r.location, r.channel, r.status].some(v => (v || '').toLowerCase().includes(q)));

  rows = rows.slice().sort((a, b) => {
    const av = a[posSort.key] || '', bv = b[posSort.key] || '';
    if (av < bv) return -1 * posSort.dir;
    if (av > bv) return 1 * posSort.dir;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(rows.length / POS_PAGE_SIZE));
  posPage = Math.min(posPage, totalPages - 1);
  const pageRows = rows.slice(posPage * POS_PAGE_SIZE, (posPage + 1) * POS_PAGE_SIZE);

  const statusColor = { 'Effective': 'var(--teal-soft);color:var(--teal)', 'Cancel': 'var(--rose-soft);color:var(--rose)', 'Hold': 'var(--amber-soft);color:var(--amber)' };

  document.getElementById('posTableBody').innerHTML = pageRows.map(r => `
    <tr>
      <td>${r.position}</td>
      <td>${r.location}</td>
      <td>${r.type_group || '–'}</td>
      <td><span class="pill" style="background:${statusColor[r.status] || 'var(--blue-soft);color:var(--blue)'}">${r.status || '–'}</span></td>
      <td>${r.channel || '–'}</td>
      <td class="tnum">${r.approved_date || '–'}</td>
      <td class="tnum">${r.final_date || '–'}</td>
      <td>${r.kpi || '–'}</td>
    </tr>`).join('');

  document.getElementById('posCount').textContent = `${rows.length.toLocaleString('en-US')} records`;
  document.getElementById('posPageLabel').textContent = `Page ${posPage + 1} / ${totalPages}`;
  document.getElementById('posPrev').disabled = posPage === 0;
  document.getElementById('posNext').disabled = posPage >= totalPages - 1;
}

/* ------------------------------- TAB: Analytics ---------------------------- */

function renderEffectiveRateChart(data) {
  destroyChart('effRate');
  const months = MONTH_ORDER.filter(m => data.some(r => r.month === m));
  const rates = months.map(m => {
    const rows = data.filter(r => r.month === m);
    const eff = rows.filter(r => r.status === 'Effective').length;
    return rows.length ? Math.round(eff / rows.length * 100) : 0;
  });

  const ctx = document.getElementById('chartEffectiveRate');
  charts.effRate = new Chart(ctx, {
    type: 'line',
    data: { labels: months, datasets: [{ label: '% Effective', data: rates, borderColor: CHART_COLORS.teal, backgroundColor: CHART_COLORS.tealSoft, tension: .35, fill: true, pointRadius: 4 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        datalabels: { align: 'top', color: CHART_COLORS.ink, font: { weight: '700', size: 11 }, formatter: v => v + '%' },
        tooltip: { callbacks: { label: (c) => c.parsed.y + '% Effective' } }
      },
      scales: { y: { beginAtZero: true, max: 100, grid: { color: CHART_COLORS.line }, ticks: { callback: v => v + '%' } }, x: { grid: { display: false } } }
    },
    plugins: [ChartDataLabels]
  });
}

function renderDivisionChart(data) {
  destroyChart('division');
  const byDiv = {};
  data.forEach(r => { if (r.division) (byDiv[r.division] = byDiv[r.division] || []).push(r); });
  const labels = Object.keys(byDiv).sort((a, b) => byDiv[b].length - byDiv[a].length).slice(0, 8);

  const ctx = document.getElementById('chartDivision');
  charts.division = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ data: labels.map(l => byDiv[l].length), backgroundColor: CHART_COLORS.violet, borderRadius: 8, maxBarThickness: 34 }] },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'right', color: CHART_COLORS.ink, font: { weight: '700', size: 12 } } },
      scales: { x: { beginAtZero: true, grid: { color: CHART_COLORS.line } }, y: { grid: { display: false }, ticks: { autoSkip: false, font: { size: 11 } } } }
    },
    plugins: [ChartDataLabels]
  });
}

/* ------------------------------- TAB: Satisfaction -------------------------- */

let msSatControls = {};
function buildSatFilters() {
  const bar = document.getElementById('filterBarSat');
  const actions = bar.querySelector('.filter-actions');
  const monthsAvail = uniqueSorted(SAT.map(r => ({ month_key: r.date.slice(0, 7) })), 'month_key');

  const posOpts = uniqueSorted(SAT, 'position');
  const ctrl1 = buildMultiSelect(bar, 'Position', posOpts, sel => { satFilters.position = sel; renderSatisfactionTab(); });
  bar.insertBefore(bar.lastElementChild, actions);
  msSatControls.position = ctrl1;

  const ctrl2 = buildMultiSelect(bar, 'Month', monthsAvail, sel => { satFilters.month = sel; renderSatisfactionTab(); }, (v) => v);
  bar.insertBefore(bar.lastElementChild, actions);
  msSatControls.month = ctrl2;
}

function applySatFilters(rows) {
  return rows.filter(r => {
    if (satFilters.position && !satFilters.position.has(r.position)) return false;
    if (satFilters.month && !satFilters.month.has(r.date.slice(0, 7))) return false;
    return true;
  });
}

function avgOf(rows, keys) {
  const vals = [];
  rows.forEach(r => keys.forEach(k => { if (r[k] !== null && !isNaN(r[k])) vals.push(r[k]); }));
  return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
}

function renderSatisfactionTab() {
  const data = applySatFilters(SAT);

  const overallAvg = avgOf(data, ['q_quality_1', 'q_quality_2', 'q_service_1', 'q_service_2']);
  const qualityAvg = avgOf(data, ['q_quality_1', 'q_quality_2']);
  const serviceAvg = avgOf(data, ['q_service_1', 'q_service_2']);
  const toPct = (v) => v !== null ? Math.round(v / 4 * 100) : null;

  const cards = [
    { label: 'Overall Satisfaction', value: overallAvg !== null ? toPct(overallAvg) + '%' : '–', sub: `${data.length} response(s)`, color: 'var(--accent)' },
    { label: 'Recruitment Quality', value: qualityAvg !== null ? toPct(qualityAvg) + '%' : '–', sub: 'Candidate fit & timeline', color: 'var(--teal)' },
    { label: 'Service', value: serviceAvg !== null ? toPct(serviceAvg) + '%' : '–', sub: 'Responsiveness & updates', color: 'var(--blue)' },
    { label: 'Total Responses', value: fmtNum(data.length), sub: 'In current filter', color: 'var(--amber)' },
  ];
  const grid = document.getElementById('kpiSatisfaction');
  grid.innerHTML = cards.map(c => `<div class="kpi-card" style="--bar-color:${c.color}"><div class="label">${c.label}</div><div class="value tnum">${c.value}</div><div class="sub">${c.sub}</div></div>`).join('');
  grid.style.gridTemplateColumns = 'repeat(4, 1fr)';

  destroyChart('satQuestions');
  const qLabels = ['Candidate fit (2.1)', 'Timeline (2.2)', 'Responsive to feedback (3.1)', 'Kept updated (3.2)'];
  const qKeys = ['q_quality_1', 'q_quality_2', 'q_service_1', 'q_service_2'];
  const qPct = qKeys.map(k => { const v = avgOf(data, [k]); return v !== null ? Math.round(v / 4 * 100) : 0; });
  charts.satQuestions = new Chart(document.getElementById('chartSatQuestions'), {
    type: 'bar',
    data: { labels: qLabels, datasets: [{ data: qPct, backgroundColor: [CHART_COLORS.teal, CHART_COLORS.tealSoft, CHART_COLORS.blue, CHART_COLORS.blueSoft], borderRadius: 8, maxBarThickness: 34 }] },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'right', color: CHART_COLORS.ink, font: { weight: '700', size: 12 }, formatter: v => v + '%' } },
      scales: { x: { beginAtZero: true, max: 100, grid: { color: CHART_COLORS.line }, ticks: { callback: v => v + '%' } }, y: { grid: { display: false }, ticks: { font: { size: 11 } } } }
    },
    plugins: [ChartDataLabels]
  });

  destroyChart('satTrend');
  const monthKeys = [...new Set(data.map(r => r.date.slice(0, 7)))].sort();
  const trendPct = monthKeys.map(mk => {
    const rows = data.filter(r => r.date.slice(0, 7) === mk);
    const v = avgOf(rows, ['q_quality_1', 'q_quality_2', 'q_service_1', 'q_service_2']);
    return v !== null ? Math.round(v / 4 * 100) : null;
  });
  charts.satTrend = new Chart(document.getElementById('chartSatTrend'), {
    type: 'line',
    data: { labels: monthKeys, datasets: [{ label: '% Overall', data: trendPct, borderColor: CHART_COLORS.accent, backgroundColor: CHART_COLORS.accentSoft, tension: .35, fill: true, pointRadius: 4 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        datalabels: { align: 'top', color: CHART_COLORS.ink, font: { weight: '700', size: 11 }, formatter: v => v !== null ? v + '%' : '' },
      },
      scales: { y: { beginAtZero: true, max: 100, grid: { color: CHART_COLORS.line }, ticks: { callback: v => v + '%' } }, x: { grid: { display: false } } }
    },
    plugins: [ChartDataLabels]
  });

  const list = document.getElementById('satCommentsList');
  const withComments = data.filter(r => r.impressed || r.improve).slice().sort((a, b) => b.date.localeCompare(a.date));
  list.innerHTML = withComments.length ? withComments.map(r => `
    <div class="comment-card">
      <div class="comment-head">
        <span class="comment-position">${r.position || 'Unspecified position'}</span>
        <span class="comment-date">${r.date}</span>
      </div>
      ${r.impressed ? `<div class="comment-row"><span class="comment-tag good">Liked</span><span>${r.impressed}</span></div>` : ''}
      ${r.improve ? `<div class="comment-row"><span class="comment-tag improve">Suggested</span><span>${r.improve}</span></div>` : ''}
    </div>
  `).join('') : '<p style="color:var(--ink-faint); font-size:13px;">No comments in the current filter.</p>';
}

init();
