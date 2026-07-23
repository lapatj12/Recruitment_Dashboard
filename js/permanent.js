/* ==========================================================================
   Permanent Recruitment Dashboard
   ========================================================================== */

const MONTH_ORDER = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

let RAW = [];
let SAT = [];
let COST = null;
let filters = { location: null, year: null, month: null, status: null, kpi: null, position: null };
let satFilters = { position: null, month: null };
let charts = {};
let activeTab = 'overview';

async function init() {
  const [wbPermanent, SATLoaded] = await Promise.all([
    loadWorkbook('data/Recruitment_Requisition.xlsx'),
    loadSatisfactionData('data/Recruitment_Service_Quality_Evaluation.xlsx'),
  ]);
  RAW = parsePermanentWorkbook(wbPermanent).filter(r => r.position || r.status);
  SAT = SATLoaded;
  COST = parseCostPerHireSheet(wbPermanent);

  buildFilters();
  buildSatFilters();
  initTabs();

  document.getElementById('resetFilters').addEventListener('click', () => {
    Object.keys(msControls).forEach(k => msControls[k].clear());
    filters = { location: null, year: null, month: null, status: null, kpi: null, position: null };
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
      run(renderTrendChart, data);
      run(renderKpiDonuts, data);
      run(renderTTHChart, data);
      run(renderWatchList, data);
      break;
    case 'satisfaction':
      run(renderSatisfactionTab);
      break;
    case 'positions':
      run(renderChannelChart, data);
      run(renderPositionsTable);
      break;
    case 'analytics':
      run(renderInsights, data);
      run(renderEffectiveRateChart, data);
      run(renderTTHTrendChart, data);
      run(renderDivisionChart, data);
      run(renderCostPerHire);
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
    { key: 'position', label: 'Position', field: 'position' },
  ];
  defs.forEach(d => {
    let opts = uniqueSorted(RAW, d.field);
    if (d.key === 'month') opts = MONTH_ORDER.filter(m => opts.includes(m)).concat(opts.filter(o => !MONTH_ORDER.includes(o)));
    const ctrl = buildMultiSelect(bar, d.label, opts, (sel) => {
      filters[d.key] = sel;
      renderAll();
      // Selecting exactly one Position is a strong signal the person wants to drill
      // into that role — auto-open its detail (KPI + matching Satisfaction feedback)
      // instead of making them also click into the Positions tab and find the row.
      if (d.key === 'position' && sel && sel.size === 1) {
        const posName = [...sel][0];
        const matches = applyFilters(RAW).filter(r => r.position === posName);
        if (matches.length) {
          const mostRecent = matches.slice().sort((a, b) => (b.approved_date || '').localeCompare(a.approved_date || ''))[0];
          showPositionDetail(mostRecent);
        }
      }
    });
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
    if (filters.position && !filters.position.has(r.position)) return false;
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

/** "Positions to Watch" — Effective positions that closed Over KPI, worst first.
 * Surfaces the KPI+Satisfaction link (via click → showPositionDetail) right on
 * the Overview tab instead of requiring a trip to the Positions table. */
function renderWatchList(data) {
  const overKpi = data.filter(r => r.status === 'Effective' && r.kpi === 'OVER KPI');
  const withDays = overKpi.map(r => ({ row: r, days: Number(r.diff_days) || 0 }))
    .sort((a, b) => b.days - a.days)
    .slice(0, 8);

  const el = document.getElementById('watchList');
  if (!withDays.length) {
    el.innerHTML = '<div class="watch-empty">No positions closed Over KPI in the current filter — nice work.</div>';
    return;
  }
  el.innerHTML = withDays.map(({ row: r, days }) => {
    const sat = getSatForPosition(r.position);
    return `
      <div class="watch-row" data-position="${r.position.replace(/"/g, '&quot;')}">
        <div class="wr-main">
          <div class="wr-position">${r.position}</div>
          <div class="wr-sub">${r.location} · ${r.channel || 'Unknown channel'}</div>
        </div>
        <div class="wr-stat"><div class="n">${days ? days + 'd' : '–'}</div><div class="lbl">Time-to-Hire</div></div>
        <div class="wr-stat"><div class="n">${sat && sat.pct !== null ? sat.pct + '%' : '–'}</div><div class="lbl">Satisfaction</div></div>
      </div>`;
  }).join('');

  document.querySelectorAll('#watchList .watch-row').forEach(row => {
    row.addEventListener('click', () => {
      const posName = row.dataset.position;
      const match = data.find(r => r.position === posName && r.kpi === 'OVER KPI');
      if (match) showPositionDetail(match);
    });
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

/** Finds satisfaction survey responses that match a recruitment position name
 * (trimmed, case-insensitive exact match). Returns null if there's no match. */
function getSatForPosition(positionName) {
  const key = (positionName || '').trim().toLowerCase();
  if (!key) return null;
  const rows = SAT.filter(r => (r.position || '').trim().toLowerCase() === key);
  if (!rows.length) return null;
  const avg = avgOf(rows, ['q_quality_1', 'q_quality_2', 'q_service_1', 'q_service_2']);
  return { pct: avg !== null ? Math.round(avg / 4 * 100) : null, count: rows.length, rows };
}

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
  document.getElementById('posDetailClose').addEventListener('click', () => {
    document.getElementById('posDetailModal').style.display = 'none';
  });
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

  document.getElementById('posTableBody').innerHTML = pageRows.map((r, i) => {
    const sat = getSatForPosition(r.position);
    return `
    <tr class="clickable-row" data-idx="${i}">
      <td>${r.position}</td>
      <td>${r.location}</td>
      <td>${r.type_group || '–'}</td>
      <td><span class="pill" style="background:${statusColor[r.status] || 'var(--blue-soft);color:var(--blue)'}">${r.status || '–'}</span></td>
      <td>${r.channel || '–'}</td>
      <td class="tnum">${r.approved_date || '–'}</td>
      <td class="tnum">${r.final_date || '–'}</td>
      <td>${r.kpi || '–'}</td>
      <td class="tnum">${sat && sat.pct !== null ? sat.pct + '%' : '–'}</td>
    </tr>`;
  }).join('');

  // attach click handlers referencing the actual row objects (avoids re-parsing HTML)
  document.querySelectorAll('#posTableBody tr').forEach(tr => {
    const r = pageRows[Number(tr.dataset.idx)];
    tr.addEventListener('click', () => showPositionDetail(r));
  });

  document.getElementById('posCount').textContent = `${rows.length.toLocaleString('en-US')} records`;
  document.getElementById('posPageLabel').textContent = `Page ${posPage + 1} / ${totalPages}`;
  document.getElementById('posPrev').disabled = posPage === 0;
  document.getElementById('posNext').disabled = posPage >= totalPages - 1;
}

function showPositionDetail(r) {
  document.getElementById('posDetailTitle').textContent = r.position || 'Unnamed position';
  document.getElementById('posDetailSub').textContent = `${r.location || '–'} · ${r.type_group || '–'} · ${r.status || '–'}`;

  const sat = getSatForPosition(r.position);
  const kpiPillColor = r.kpi === 'ON KPI' ? 'var(--teal-soft);color:var(--teal)' : r.kpi === 'OVER KPI' ? 'var(--rose-soft);color:var(--rose)' : 'var(--line);color:var(--ink-faint)';

  let html = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:18px;">
      <div class="detail-stat"><div class="detail-label">Channel</div><div class="detail-value">${r.channel || '–'}</div></div>
      <div class="detail-stat"><div class="detail-label">Approved → Final</div><div class="detail-value">${r.approved_date || '–'} → ${r.final_date || '–'}</div></div>
      <div class="detail-stat"><div class="detail-label">Time-to-Hire</div><div class="detail-value">${r.diff_days ? r.diff_days + ' days' : '–'}</div></div>
      <div class="detail-stat"><div class="detail-label">KPI</div><div class="detail-value"><span class="pill" style="background:${kpiPillColor}">${r.kpi || 'Not recorded'}</span></div></div>
    </div>
    <h4 style="font-family:var(--font-display); font-size:14px; margin:0 0 10px;">Satisfaction Feedback</h4>`;

  if (!sat) {
    html += `<p style="font-size:13px; color:var(--ink-faint);">No matching satisfaction survey response found for this exact position name.</p>`;
  } else {
    html += `<div class="detail-stat" style="margin-bottom:14px;"><div class="detail-label">Overall Satisfaction (${sat.count} response${sat.count > 1 ? 's' : ''})</div><div class="detail-value" style="font-size:22px;">${sat.pct !== null ? sat.pct + '%' : '–'}</div></div>`;
    const withComments = sat.rows.filter(x => x.impressed || x.improve);
    if (withComments.length) {
      html += `<div class="comments-list" style="max-height:220px;">` + withComments.map(x => `
        <div class="comment-card">
          <div class="comment-head"><span class="comment-position">${x.date}</span></div>
          ${x.impressed ? `<div class="comment-row"><span class="comment-tag good">Liked</span><span>${x.impressed}</span></div>` : ''}
          ${x.improve ? `<div class="comment-row"><span class="comment-tag improve">Suggested</span><span>${x.improve}</span></div>` : ''}
        </div>`).join('') + `</div>`;
    }
  }

  document.getElementById('posDetailBody').innerHTML = html;
  document.getElementById('posDetailModal').style.display = 'flex';
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

function renderTTHTrendChart(data) {
  destroyChart('tthTrend');
  const months = MONTH_ORDER.filter(m => data.some(r => r.month === m));
  const avgs = months.map(m => {
    const rows = data.filter(r => r.month === m && r.status === 'Effective' && r.diff_days !== '' && !isNaN(Number(r.diff_days)));
    return rows.length ? Math.round(rows.reduce((s, r) => s + Number(r.diff_days), 0) / rows.length) : null;
  });

  const ctx = document.getElementById('chartTTHTrend');
  charts.tthTrend = new Chart(ctx, {
    type: 'line',
    data: { labels: months, datasets: [{ label: 'Avg. days', data: avgs, borderColor: CHART_COLORS.blue, backgroundColor: CHART_COLORS.blueSoft, tension: .35, fill: true, pointRadius: 4, spanGaps: true }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        datalabels: { align: 'top', color: CHART_COLORS.ink, font: { weight: '700', size: 11 }, formatter: v => v !== null ? v + 'd' : '' },
        tooltip: { callbacks: { label: (c) => c.parsed.y + ' days average' } }
      },
      scales: { y: { beginAtZero: true, grid: { color: CHART_COLORS.line } }, x: { grid: { display: false } } }
    },
    plugins: [ChartDataLabels]
  });
}

/** Short, auto-generated narrative bullets summarizing the current filter selection —
 * gives the Analytics tab a "so what" instead of just charts. */
function renderInsights(data) {
  const el = document.getElementById('insightList');
  const bullets = [];

  const effective = data.filter(r => r.status === 'Effective');
  const total = data.length;
  if (total) {
    bullets.push(`<strong>${Math.round(effective.length / total * 100)}%</strong> of requisitions in this selection closed Effective (${effective.length} of ${total}).`);
  }

  // Best / worst month by effective rate
  const months = MONTH_ORDER.filter(m => data.some(r => r.month === m));
  const monthRates = months.map(m => {
    const rows = data.filter(r => r.month === m);
    const eff = rows.filter(r => r.status === 'Effective').length;
    return { m, rate: rows.length ? eff / rows.length : 0, n: rows.length };
  }).filter(x => x.n >= 2);
  if (monthRates.length) {
    const best = monthRates.slice().sort((a, b) => b.rate - a.rate)[0];
    const worst = monthRates.slice().sort((a, b) => a.rate - b.rate)[0];
    if (best.m !== worst.m) {
      bullets.push(`<strong>${best.m}</strong> had the strongest Effective rate (${Math.round(best.rate * 100)}%), while <strong>${worst.m}</strong> was the weakest (${Math.round(worst.rate * 100)}%).`);
    }
  }

  // Fastest / slowest location by time-to-hire
  const effWithDays = effective.filter(r => r.diff_days !== '' && !isNaN(Number(r.diff_days)));
  const byLoc = {};
  effWithDays.forEach(r => { (byLoc[r.location] = byLoc[r.location] || []).push(Number(r.diff_days)); });
  const locAvgs = Object.keys(byLoc).map(l => ({ l, avg: byLoc[l].reduce((s, v) => s + v, 0) / byLoc[l].length }));
  if (locAvgs.length > 1) {
    const fastest = locAvgs.slice().sort((a, b) => a.avg - b.avg)[0];
    const slowest = locAvgs.slice().sort((a, b) => b.avg - a.avg)[0];
    bullets.push(`<strong>${fastest.l}</strong> closes positions fastest on average (${Math.round(fastest.avg)} days), vs. <strong>${slowest.l}</strong> at ${Math.round(slowest.avg)} days.`);
  }

  // Top channel
  const byChannel = {};
  effective.forEach(r => { if (r.channel) byChannel[r.channel] = (byChannel[r.channel] || 0) + 1; });
  const topChannel = Object.keys(byChannel).sort((a, b) => byChannel[b] - byChannel[a])[0];
  if (topChannel) {
    bullets.push(`<strong>${topChannel}</strong> is the top hiring channel, responsible for ${byChannel[topChannel]} of ${effective.length} hires.`);
  }

  // Over KPI count
  const overKpi = effective.filter(r => r.kpi === 'OVER KPI');
  if (effective.length) {
    bullets.push(`<strong>${overKpi.length}</strong> Effective position(s) closed Over KPI (${Math.round(overKpi.length / effective.length * 100)}% of Effective hires) — see "Positions to Watch" on the Overview tab.`);
  }

  el.innerHTML = bullets.length
    ? bullets.map(b => `<li><span class="bullet"></span><span>${b}</span></li>`).join('')
    : '<li><span class="bullet"></span><span>Not enough data in the current filter to generate insights.</span></li>';
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

/** Renders the Cost Per Hire summary. This comes from a hand-built annual
 * calculation sheet (not a per-hire log), so it's shown as-is — it does not
 * react to the Location/Year/Month/Status/KPI/Position filters above, since
 * the source data has no such breakdown to filter by. */
function renderCostPerHire() {
  const panel = document.getElementById('costPerHirePanel');
  const context = document.getElementById('costPerHireContext');
  const body = document.getElementById('costPerHireBody');
  if (!panel) return;

  if (!COST || (!COST.oGeneral && !COST.sGeneral && !COST.sSpecial)) {
    context.textContent = 'No Cost Per Hire data found (expected a "Cost Per Hire" sheet in Recruitment_Requisition.xlsx).';
    body.innerHTML = '';
    return;
  }

  context.textContent = (COST.context || 'Annual summary') + ' — not affected by the filters above';

  const types = [
    { key: 'oGeneral', label: 'O-General', color: 'var(--accent)' },
    { key: 'sGeneral', label: 'S-General', color: 'var(--teal)' },
    { key: 'sSpecial', label: 'S-Special', color: 'var(--violet)' },
  ];

  body.innerHTML = `<div class="cost-card-row">` + types.map(t => {
    const c = COST[t.key];
    if (!c) return `<div class="cost-card"><div class="cc-type">${t.label}</div><div class="cc-main">–</div><div class="cc-main-label">No data</div></div>`;
    return `
      <div class="cost-card" style="border-top:3px solid ${t.color};">
        <div class="cc-type">${t.label}</div>
        <div class="cc-main tnum">฿${fmtNum(c.exclMedical)}</div>
        <div class="cc-main-label">Per hire, excl. medical check-up</div>
        <div class="cc-breakdown">
          <div class="cc-row"><span class="cc-lbl">Incl. medical (men)</span><span class="cc-val">฿${fmtNum(c.inclMedicalMen)}</span></div>
          <div class="cc-row"><span class="cc-lbl">Incl. medical (women)</span><span class="cc-val">฿${fmtNum(c.inclMedicalWomen)}</span></div>
        </div>
      </div>`;
  }).join('') + `</div>`;
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
