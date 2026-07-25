/* ==========================================================================
   Shared helpers used by both dashboards
   ========================================================================== */

/* Translation lookup for recurring Thai category values found in the source
 * spreadsheets (division / department / work unit / position / reason /
 * status / month names). Free-text personal names are intentionally left
 * untranslated. Unmapped values fall back to the original string unchanged. */
const TH_EN = {
  // Divisions
  'ฝ่ายกลยุทธ์การตลาด': 'Marketing Strategy Division',
  'ฝ่ายตรวจสอบคุณภาพ': 'Quality Inspection Division',
  'ฝ่ายทรัพยากรบุคคลและบริหาร': 'HR & Administration Division',
  'ฝ่ายบริการลูกค้า': 'Customer Service Division',
  'ฝ่ายผลิต - นวนคร': 'Production Division - Nava Nakorn',
  'ฝ่ายวิศวกรรมการผลิต': 'Production Engineering Division',
  'ฝ่ายอะไหล่': 'Parts Division',
  'ฝ่าย GRC และตรวจสอบภายใน': 'GRC & Internal Audit Division',
  // Departments
  'ศูนย์อบรมสยามคูโบต้า': 'Siam Kubota Training Center',
  'ส่วนกระจายอะไหล่': 'Parts Distribution Department',
  'ส่วนการผลิตชิ้นส่วน': 'Parts Manufacturing Department',
  'ส่วนการผลิตผลิตภัณฑ์': 'Product Manufacturing Department',
  'ส่วนขายและการตลาดอะไหล่ในประเทศ': 'Domestic Parts Sales & Marketing Department',
  'ส่วนตรวจสอบคุณภาพ - นวนคร': 'Quality Inspection Department - Nava Nakorn',
  'ส่วนตรวจสอบคุณภาพ-นวนคร': 'Quality Inspection Department - Nava Nakorn',
  'ส่วนทรัพยากรบุคคล - นวนคร': 'Human Resources Department - Nava Nakorn',
  'ส่วนบริหาร - นวนคร': 'Administration Department - Nava Nakorn',
  'ส่วนบริหารการตลาด': 'Marketing Management Department',
  'ส่วนบริหารคลังอะไหล่และนวัตกรรม': 'Parts Warehouse & Innovation Management Department',
  'ส่วนบริหารงานขายในประเทศ และวางแผนขาย': 'Domestic Sales Administration & Sales Planning Department',
  'ส่วนบริหารลูกค้าสัมพันธ์': 'Customer Relationship Management Department',
  'ส่วนพัฒนาช่องทางจัดจำหน่ายสินค้า': 'Distribution Channel Development Department',
  'ส่วนพัฒนาและวางแผนอะไหล่': 'Parts Development & Planning Department',
  'ส่วนวางแผนและควบคุมการผลิต - นวนคร': 'Production Planning & Control Department - Nava Nakorn',
  'ส่วนวิศวกรรมกระบวนการผลิต - นวนคร': 'Manufacturing Process Engineering Department - Nava Nakorn',
  'ส่วนวิศวกรรมจัดการโครงการ': 'Project Management Engineering Department',
  'ส่วนโซลูชั่นบริการด้านเทคนิค': 'Technical Service Solutions Department',
  // Work units
  'การตลาดแทรกเตอร์ในประเทศ': 'Domestic Tractor Marketing',
  'การบริหารทรัพยากรบุคคลและสรรหา': 'HR Management & Recruitment',
  'ซ่อมบำรุง': 'Maintenance',
  'ตรวจสอบคุณภาพ - ชิ้นส่วน': 'Quality Inspection - Parts',
  'ตรวจสอบคุณภาพ - ผลิตภัณฑ์': 'Quality Inspection - Products',
  'ธุรการขาย': 'Sales Administration',
  'บริการสำนักงาน': 'Office Services',
  'บริการโรงงาน': 'Plant Services',
  'บริหารคลังอะไหล่': 'Parts Warehouse Management',
  'บริหารระบบโลจิสติกส์': 'Logistics System Management',
  'บริหารและวางแผนการจัดเตรียมอะไหล่': 'Parts Preparation Management & Planning',
  'ประกอบ - เครื่องยนต์': 'Assembly - Engine',
  'ประกอบ - เครื่องอัดฟางและรถไถ': 'Assembly - Balers & Tractors',
  'ผลิตชิ้นส่วน - เพลาลูกเบี้ยว': 'Parts Manufacturing - Camshaft',
  'ผลิตชิ้นส่วนรถไถ': 'Tractor Parts Manufacturing',
  'ผลิตชิ้นส่วนอมตะชิตี้': 'Amata City Parts Manufacturing',
  'ผลิตชิ้นส่วนเครื่องยนต์': 'Engine Parts Manufacturing',
  'พัฒนากระบวนการผลิต - นวนคร': 'Manufacturing Process Development - Nava Nakorn',
  'พัฒนางานขายผู้แทนจำหน่าย': 'Dealer Sales Development',
  'พัฒนาระบบคลังอะไหล่อัตโนมัติ': 'Automated Parts Warehouse System Development',
  'พัฒนาสื่อด้านบริการ': 'Service Media Development',
  'ยูทิลิตี้': 'Utilities',
  'วิศวกรรมเครื่องมือ': 'Tooling Engineering',
  'ศูนย์กระจายสินค้านวนคร': 'Nava Nakorn Distribution Center',
  'ศูนย์กระจายอะไหล่ภูมิภาคRegional Parts Center Management"': 'Regional Parts Distribution Center Management',
  'ศูนย์ลูกค้าสัมพันธ์และสิทธิประโยชน์ในประเทศ': 'Domestic Customer Relations & Benefits Center',
  'สนับสนุนการผลิต - ธุรกิจใหม่': 'Production Support - New Business',
  'สนับสนุนงานขายในประเทศ': 'Domestic Sales Support',
  'สนับสนุนเครือข่าย': 'Network Support',
  'ส่งเสริมการตรวจสอบคุณภาพ': 'Quality Inspection Promotion',
  'โลจิสติกส์ชิ้นส่วน': 'Parts Logistics',
  'โลจิสติกส์อะไหล่': 'Parts Logistics',
  // Positions
  'ช่าง': 'Technician',
  'พนักงานOperator': 'Operator',
  'พนักงานคลังอะไหล่': 'Parts Warehouse Staff',
  'พนักงานธุรการ': 'Admin Staff',
  'พนักงานศูนย์กระจายอะไหล่': 'Parts Distribution Center Staff',
  // Locations / provinces
  'จ.ฉะเชิงเทรา': 'Chachoengsao',
  'จ.ชัยนาท': 'Chai Nat',
  'จ.นครราชสีมา': 'Nakhon Ratchasima',
  'จ.สุราษฏร์ธานี': 'Surat Thani',
  'จ.อุดรธานี': 'Udon Thani',
  'จ.เพชรบูรณ์': 'Phetchabun',
  'จ.แพร่': 'Phrae',
  // Business lines
  'สายงานการผลิต': 'Manufacturing Business Line',
  'สายงานขาย การตลาดและบริการ': 'Sales, Marketing & Service Business Line',
  // Recruitment status (subcontract)
  'เริ่มงานแล้ว': 'Started',
  'รอสรรหา': 'Sourcing',
  'นัดสัมภาษณ์': 'Interview Scheduled',
  'รอเริ่มงาน': 'Pending Start',
  // Turnover reasons
  'กลับบ้านต่างจังหวัด': 'Relocated to hometown',
  'ครอบครัว': 'Family reasons',
  'ปัญหาส่วนตัว': 'Personal reasons',
  'ศึกษาต่อ': 'Further education',
  'สุขภาพ': 'Health reasons',
  'อื่น ๆ': 'Other',
  'อื่นๆ': 'Other',
  // Months (Thai abbreviations used in the Turnover_Graph summary sheet)
  'ม.ค.': 'Jan', 'ก.พ.': 'Feb', 'มี.ค.': 'Mar', 'เม.ย.': 'Apr',
  'พ.ค.': 'May', 'มิ.ย.': 'Jun', 'ก.ค.': 'Jul', 'ส.ค.': 'Aug',
  'ก.ย.': 'Sep', 'ต.ค.': 'Oct', 'พ.ย.': 'Nov', 'ธ.ค.': 'Dec',
};

/** Translate a known Thai category value to English; unmapped values (including
 * personal names, and values already in English) are returned unchanged. */
function tr(value) {
  if (value === null || value === undefined) return value;
  const v = String(value).trim();
  return TH_EN[v] !== undefined ? TH_EN[v] : v;
}

/** Load a CSV file (relative path) and return array of row objects. */
async function loadCSV(path) {
  const res = await fetch(path + '?v=' + Date.now()); // cache-bust so monthly HR updates show immediately
  if (!res.ok) throw new Error('Cannot load ' + path);
  const text = await res.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: false });
  return parsed.data.map(r => {
    const clean = {};
    Object.keys(r).forEach(k => clean[k.trim()] = (r[k] === undefined || r[k] === null) ? '' : String(r[k]).trim());
    return clean;
  });
}

/** Build a multi-select dropdown filter.
 * container: DOM node to render into
 * label: display label
 * options: array of string values (raw/underlying values used for filtering)
 * onChange: callback(selectedSetOrNull) -> null means "all"
 * labelFn: optional function(value) -> display text (defaults to tr(value))
 */
function buildMultiSelect(container, label, options, onChange, labelFn) {
  labelFn = labelFn || tr;
  const wrap = document.createElement('div');
  wrap.className = 'filter-field';
  const lab = document.createElement('label');
  lab.textContent = label;
  wrap.appendChild(lab);

  const dd = document.createElement('div');
  dd.className = 'msdd';
  const btn = document.createElement('button');
  btn.className = 'msdd-btn';
  btn.type = 'button';
  btn.innerHTML = `<span class="txt">All</span>`;
  dd.appendChild(btn);

  const panel = document.createElement('div');
  panel.className = 'msdd-panel';
  const selected = new Set();

  options.forEach(opt => {
    if (opt === '' || opt === null || opt === undefined) return;
    const row = document.createElement('label');
    row.className = 'msdd-opt';
    row.innerHTML = `<input type="checkbox" value="${opt}"> <span>${labelFn(opt)}</span>`;
    const cb = row.querySelector('input');
    cb.addEventListener('change', () => {
      if (cb.checked) selected.add(opt); else selected.delete(opt);
      refreshBtn();
      onChange(selected.size ? selected : null);
    });
    panel.appendChild(row);
  });

  function refreshBtn() {
    if (selected.size === 0) {
      btn.innerHTML = `<span class="txt">All</span>`;
    } else {
      btn.innerHTML = `<span class="txt">${[...selected].slice(0,2).map(labelFn).join(', ')}${selected.size>2 ? ' +'+(selected.size-2) : ''}</span><span class="count">${selected.size}</span>`;
    }
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.msdd.open').forEach(n => { if (n !== dd) n.classList.remove('open'); });
    dd.classList.toggle('open');
  });
  document.addEventListener('click', () => dd.classList.remove('open'));
  panel.addEventListener('click', e => e.stopPropagation());

  dd.appendChild(panel);
  wrap.appendChild(dd);
  container.appendChild(wrap);

  return {
    clear: () => { selected.clear(); panel.querySelectorAll('input').forEach(i => i.checked = false); refreshBtn(); },
    getSelected: () => selected,
    el: wrap
  };
}

function uniqueSorted(rows, field) {
  return [...new Set(rows.map(r => r[field]).filter(v => v))].sort((a,b)=>tr(a).localeCompare(tr(b),'en'));
}

function fmtNum(n) {
  if (n === null || n === undefined || isNaN(n)) return '–';
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: 1 });
}

function fmtPct(n) {
  if (n === null || n === undefined || isNaN(n)) return '–';
  return (Number(n) * 100).toFixed(1) + '%';
}

/** Shared Chart.js color palette matching the CSS tokens */
const CHART_COLORS = {
  accent: '#E15A2B', accentSoft: '#F0B48F',
  teal: '#2F7A6B', tealSoft: '#8FC4B8',
  blue: '#3C6E8F', blueSoft: '#93B9CE',
  amber: '#D9A441', amberSoft: '#EBCA8B',
  rose: '#C1443A', roseSoft: '#DE9089',
  violet: '#6B5B95', violetSoft: '#AFA3CC',
  green: '#2E8B57', greenSoft: '#A9D8BC', greenLight: '#7FBF95',
  black: '#15171C', blackSoft: '#C7C9CE', gray: '#8A93A3', graySoft: '#D8DBE0',
  ink: '#1B2130', inkSoft: '#5B6472', line: '#E7E2D6'
};
const CHART_PALETTE = [CHART_COLORS.accent, CHART_COLORS.teal, CHART_COLORS.blue, CHART_COLORS.amber, CHART_COLORS.violet, CHART_COLORS.rose, CHART_COLORS.accentSoft, CHART_COLORS.tealSoft];

Chart.defaults.font.family = "'Sarabun','Inter',sans-serif";
Chart.defaults.color = CHART_COLORS.inkSoft;
Chart.defaults.plugins.tooltip.backgroundColor = '#1B2130';
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.titleFont = { weight: '600' };
Chart.defaults.plugins.tooltip.cornerRadius = 8;
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.boxWidth = 8;

/** Generates a single-hue set of shades (darkest/most-opaque first) for ranked
 * bar charts, so "other dimension" charts (channel, division, etc.) read as one
 * coordinated color family instead of an unrelated rainbow per bar. */
function monoShades(hex, count) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return Array.from({ length: count }, (_, i) => {
    const t = count > 1 ? i / (count - 1) : 0;
    const alpha = 1 - t * 0.55;
    return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
  });
}

/** A value-axis scale config with headroom so tall bars/points never crowd the
 * frame edge — use for the linear (value) axis on every bar/line chart.
 * `grace` reserves extra space above the data's max automatically. */
function graceScale(extra = {}) {
  return { beginAtZero: true, grace: '18%', grid: { color: CHART_COLORS.line }, ...extra };
}

/** Datalabels config that keeps labels legible at any bar height/length:
 * bars close to the axis max get their label placed just inside the bar tip
 * (white, high-contrast); shorter bars get it placed just outside (dark ink).
 * Works for both vertical and horizontal bars since 'start'/'end' are
 * orientation-agnostic in chartjs-plugin-datalabels.
 * `formatter`: value -> display string. `max`: fixed number, or omitted to
 * auto-detect from the dataset each render. */
function smartBarLabels({ formatter, max, size = 11 } = {}) {
  const fmt = formatter || (v => (v === null || v === undefined || v === '') ? '' : Math.round(v));
  const getMax = (ctx) => max || Math.max(...ctx.dataset.data.map(x => Number(x) || 0), 1);
  return {
    display: (ctx) => {
      const v = ctx.dataset.data[ctx.dataIndex];
      return v !== null && v !== undefined && v !== '' && Number(v) !== 0;
    },
    anchor: 'end',
    align: (ctx) => (Number(ctx.dataset.data[ctx.dataIndex]) || 0) / getMax(ctx) > 0.85 ? 'start' : 'end',
    color: (ctx) => (Number(ctx.dataset.data[ctx.dataIndex]) || 0) / getMax(ctx) > 0.85 ? '#fff' : CHART_COLORS.ink,
    font: { weight: '700', size },
    formatter: fmt,
    clamp: true,
  };
}
