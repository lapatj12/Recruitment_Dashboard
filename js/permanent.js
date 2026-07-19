/* ==========================================================================
   Permanent Recruitment Dashboard
   ========================================================================== */

const MONTH_ORDER = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const STATUS_COLORS = {
  'Effective': CHART_COLORS.teal, 'Wait to Join': CHART_COLORS.amber,
  'Screening': CHART_COLORS.blue, 'Final Interview': CHART_COLORS.blueSoft,
  'Cancel': CHART_COLORS.rose, 'Hold': CHART_COLORS.inkFaint || '#B7BFC9'
};

let RAW = [];
let filters = { location: null, year: null, month: null, status: null, kpi: null };
let charts = {};

async function init() {
  RAW = await loadPermanentData('data/Recruitment_Requisition.xlsx');
  RAW = RAW.filter(r => r.position || r.status); // drop fully blank rows

  buildFilters();
  document.getElementById('resetFilters').addEventListener('click', () => {
    Object.keys(msControls).forEach(k => msControls[k].clear());
    filters = { location: null, year: null, month: null, status: null, kpi: null };
    render();
  });

  document.getElementById('posModalClose').addEventListener('click', () => {
    document.getElementById('posModal').style.display = 'none';
  });

  render();
}

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
    const ctrl = buildMultiSelect(bar, d.label, opts, (sel) => { filters[d.key] = sel; render(); });
    bar.insertBefore(bar.lastElementChild, actions); // keep "reset" button pinned to the end
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

function render() {
  const data = applyFilters(RAW);
  renderKPIs(data);
  renderTypeChart(data);
  renderChannelChart(data);
  renderTrendChart(data);
  renderTTHChart(data);
}

function renderKPIs(data) {
  const total = data.length;
  const effective = data.filter(r => r.status === 'Effective').length;
  const waitToJoin = data.filter(r => r.status === 'Wait to Join').length;
  const onScreening = data.filter(r => r.status === 'Screening' || r.status === 'Final Interview').length;

  const effRows = data.filter(r => r.status === 'Effective' && r.diff_days !== '' && !isNaN(Number(r.diff_days)));
  const avgTTH = effRows.length ? effRows.reduce((s, r) => s + Number(r.diff_days), 0) / effRows.length : null;

  const cards = [
    { label: 'Total Requisition', value: fmtNum(total), sub: 'All positions matching filters', color: 'var(--accent)' },
    { label: 'Effective', value: fmtNum(effective), sub: total ? fmtPct(effective/total) + ' of total' : '–', color: 'var(--teal)' },
    { label: 'Wait to Join', value: fmtNum(waitToJoin), sub: 'Awaiting start date', color: 'var(--amber)' },
    { label: 'On Screening', value: fmtNum(onScreening), sub: 'In interview / screening', color: 'var(--blue)' },
    { label: 'Avg. Time-to-Hire', value: avgTTH !== null ? fmtNum(avgTTH) + ' days' : '–', sub: 'From Approved to Final (Effective)', color: 'var(--violet)' },
  ];

  const grid = document.getElementById('kpiGrid');
  grid.innerHTML = cards.map(c => `
    <div class="kpi-card" style="--bar-color:${c.color}">
      <div class="label">${c.label}</div>
      <div class="value tnum">${c.value}</div>
      <div class="sub">${c.sub}</div>
    </div>`).join('');
}

function showPositionModal(title, positions) {
  document.getElementById('posModalTitle').textContent = title;
  const list = document.getElementById('posModalList');
  if (!positions.length) {
    list.innerHTML = '<li>No positions found</li>';
  } else {
    list.innerHTML = positions.map(p => `<li>${p}</li>`).join('');
  }
  document.getElementById('posModal').style.display = 'flex';
}

function destroyChart(key) { if (charts[key]) { charts[key].destroy(); delete charts[key]; } }

function renderTypeChart(data) {
  destroyChart('type');
  const effective = data.filter(r => r.status === 'Effective');
  const general = effective.filter(r => r.type_group === 'General');
  const special = effective.filter(r => r.type_group === 'Special');

  const ctx = document.getElementById('chartType');
  charts.type = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['General', 'Special'],
      datasets: [{
        label: 'Number of positions (Effective)',
        data: [general.length, special.length],
        backgroundColor: [CHART_COLORS.accent, CHART_COLORS.teal],
        borderRadius: 8, maxBarThickness: 70,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      onClick: (evt, els) => {
        if (!els.length) return;
        const idx = els[0].index;
        const group = idx === 0 ? general : special;
        showPositionModal((idx === 0 ? 'General' : 'Special') + ' — Position list', group.map(r => r.position));
      },
      plugins: {
        legend: { display: false },
        datalabels: { anchor: 'end', align: 'top', color: CHART_COLORS.ink, font: { weight: '700', size: 13 } },
        tooltip: { callbacks: { label: (c) => c.parsed.y + ' position(s) — click to see the list' } }
      },
      scales: { y: { beginAtZero: true, grid: { color: CHART_COLORS.line } }, x: { grid: { display: false } } }
    },
    plugins: [ChartDataLabels]
  });
}

function renderChannelChart(data) {
  destroyChart('channel');
  const effective = data.filter(r => r.status === 'Effective' && r.channel);
  const byChannel = {};
  effective.forEach(r => { (byChannel[r.channel] = byChannel[r.channel] || []).push(r.position); });
  const labels = Object.keys(byChannel).sort((a,b) => byChannel[b].length - byChannel[a].length);
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
        borderRadius: 8, maxBarThickness: 46,
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

function renderTTHChart(data) {
  destroyChart('tth');
  const effRows = data.filter(r => r.status === 'Effective' && r.diff_days !== '' && !isNaN(Number(r.diff_days)));
  const byLoc = {};
  effRows.forEach(r => { (byLoc[r.location] = byLoc[r.location] || []).push(Number(r.diff_days)); });
  const labels = Object.keys(byLoc);
  const avgs = labels.map(l => Math.round(byLoc[l].reduce((s,v)=>s+v,0) / byLoc[l].length));

  const ctx = document.getElementById('chartTTH');
  charts.tth = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Avg. days', data: avgs, backgroundColor: CHART_COLORS.blue, borderRadius: 8, maxBarThickness: 60 }]
    },
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

init();
