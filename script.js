const DEFAULT_SETTINGS = {
  dashboardName: 'SINSAMUT KLINMEE',
  profileName: 'Sinsamut and My Gang',
  currency: '฿',
  theme: 'dark'
};

const DEFAULT_CATEGORIES = {
  income: [
    'YouTube Ads',
    'สปอนเซอร์',
    'Affiliate',
    'งานถ่ายวิดีโอ',
    'ขายของ',
    'รีวิวสินค้า',
    'คอร์สออนไลน์',
    'ไลฟ์สด / Super Chat',
    'ขายภาพ / ฟุตเทจ',
    'ที่ปรึกษาคอนเทนต์',
    'ค่าลิขสิทธิ์',
    'รายได้อื่นๆ'
  ],
  expense: [
    'เงินเดือนทีมงาน',
    'ค่าเดินทาง',
    'ค่าอาหารทีมงาน',
    'ค่าอุปกรณ์',
    'ค่าที่พัก',
    'ค่าโปรโมท',
    'ค่าเช่าสตูดิโอ',
    'ค่าซอฟต์แวร์',
    'ค่าอินเทอร์เน็ต / โทรศัพท์',
    'ค่าพร็อพ / ฉาก',
    'ค่าตัดต่อ',
    'ค่ากล้อง / ไฟ / เสียง',
    'ภาษี / ค่าธรรมเนียม',
    'เงินสำรองฉุกเฉิน',
    'อื่นๆ'
  ]
};

const clone = value => JSON.parse(JSON.stringify(value));
const months = [];
const demo = [];
const legacyDemoTitles = new Set([
  'YouTube Ads (พ.ค. 2025)',
  'สปอนเซอร์รีวิวสินค้า',
  'ค่าน้ำมัน',
  'เงินเดือนโค้ชซน',
  'ค่าอาหารทีมงาน',
  'ค่าอุปกรณ์ถ่ายทำ',
  'ค่าจ้างตัดต่อ',
  'งานถ่ายวิดีโอ'
]);
const dataModeVersion = 'production-empty-v1';

applyDataModeMigration();
let entries = loadEntries();
let categories = load('ytFinanceCategories', DEFAULT_CATEGORIES);
let settings = load('ytFinanceSettings', DEFAULT_SETTINGS);
let activeView = 'dashboard';
let selectedMonth = getCurrentMonthKey();

const $ = id => document.getElementById(id);
const saveEntries = () => localStorage.setItem('ytFinanceEntries', JSON.stringify(entries));
const saveCategories = () => localStorage.setItem('ytFinanceCategories', JSON.stringify(categories));
const saveSettings = () => localStorage.setItem('ytFinanceSettings', JSON.stringify(settings));
const fmt = n => `${settings.currency || '฿'} ${Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function load(key, fallback) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    return saved ? mergeFallback(saved, fallback) : clone(fallback);
  } catch {
    return clone(fallback);
  }
}

function applyDataModeMigration() {
  if (localStorage.getItem('ytFinanceDataMode') === dataModeVersion) return;
  localStorage.setItem('ytFinanceEntries', '[]');
  localStorage.setItem('ytFinanceDataMode', dataModeVersion);
}

function loadEntries() {
  try {
    const saved = JSON.parse(localStorage.getItem('ytFinanceEntries') || 'null');
    if (!Array.isArray(saved)) return [];
    const isOnlyLegacyDemo = saved.length > 0 && saved.every(entry => legacyDemoTitles.has(entry.title));
    if (isOnlyLegacyDemo) {
      localStorage.setItem('ytFinanceEntries', '[]');
      return [];
    }
    return saved;
  } catch {
    return [];
  }
}

function mergeFallback(saved, fallback) {
  if (Array.isArray(fallback)) return saved;
  const merged = { ...clone(fallback), ...saved };
  Object.keys(fallback).forEach(key => {
    if (Array.isArray(fallback[key]) && Array.isArray(saved[key])) {
      merged[key] = [...fallback[key], ...saved[key].filter(item => !fallback[key].includes(item))];
    }
  });
  return merged;
}

function init() {
  $('date').valueAsDate = new Date();
  document.querySelectorAll('nav a').forEach(link => link.addEventListener('click', () => setView(link.dataset.view)));
  $('monthFilter').addEventListener('change', () => {
    selectedMonth = $('monthFilter').value;
    render();
  });
  $('type').addEventListener('change', updateCategories);
  $('entryForm').addEventListener('submit', addEntry);
  $('categoryForm').addEventListener('submit', addCategory);
  $('settingsForm').addEventListener('submit', saveSettingsForm);
  $('printBtn').addEventListener('click', printReport);
  $('resetBtn').addEventListener('click', resetDemo);
  hydrateSettingsForm();
  applySettings();
  updateMonthFilter();
  updateCategories();
  renderCategories();
  setView('dashboard');
  render();
}

function setView(view) {
  activeView = view;
  document.querySelectorAll('nav a').forEach(link => link.classList.toggle('active', link.dataset.view === view));
  document.querySelectorAll('[data-section]').forEach(section => {
    section.hidden = !section.dataset.section.split(' ').includes(view);
  });
  if (view === 'income') $('type').value = 'income';
  if (view === 'expense' || view === 'salary') $('type').value = 'expense';
  if (view === 'salary') $('category').value = 'เงินเดือนทีมงาน';
  updateCategories();
  requestAnimationFrame(() => render());
}

function updateCategories() {
  const selected = $('category').value;
  const type = $('type').value;
  const list = categories[type] || [];
  $('category').innerHTML = list.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  if (list.includes(selected)) $('category').value = selected;
  if (activeView === 'salary' && list.includes('เงินเดือนทีมงาน')) $('category').value = 'เงินเดือนทีมงาน';
}

function addEntry(e) {
  e.preventDefault();
  const entry = {
    date: $('date').value,
    title: $('title').value.trim(),
    type: $('type').value,
    category: $('category').value,
    amount: +$('amount').value,
    note: $('note').value.trim()
  };
  entries.unshift(entry);
  selectedMonth = getEntryMonthKey(entry) || selectedMonth;
  saveEntries();
  e.target.reset();
  $('date').valueAsDate = new Date();
  updateMonthFilter();
  updateCategories();
  render();
  showToast('เพิ่มรายการแล้ว');
}

function del(i) {
  entries.splice(i, 1);
  saveEntries();
  updateMonthFilter();
  render();
  showToast('ลบรายการแล้ว');
}

function addCategory(e) {
  e.preventDefault();
  const type = $('newCategoryType').value;
  const name = $('newCategoryName').value.trim();
  if (!name) return;
  if (categories[type].some(cat => cat.toLowerCase() === name.toLowerCase())) {
    showToast('มีหมวดหมู่นี้แล้ว');
    return;
  }
  categories[type].push(name);
  saveCategories();
  e.target.reset();
  renderCategories();
  updateCategories();
  showToast('เพิ่มหมวดหมู่แล้ว');
}

function removeCategory(type, name) {
  const used = entries.some(entry => entry.type === type && entry.category === name);
  if (used) {
    showToast('ลบไม่ได้ เพราะมีรายการใช้หมวดนี้อยู่');
    return;
  }
  categories[type] = categories[type].filter(cat => cat !== name);
  saveCategories();
  renderCategories();
  updateCategories();
}

function renderCategories() {
  $('incomeCategoryList').innerHTML = renderCategoryPills('income');
  $('expenseCategoryList').innerHTML = renderCategoryPills('expense');
}

function renderCategoryPills(type) {
  return categories[type].map(name => {
    const locked = DEFAULT_CATEGORIES[type].includes(name);
    const button = locked ? '' : `<button type="button" onclick="removeCategory('${type}', '${escapeJs(name)}')">×</button>`;
    return `<span class="pill">${escapeHtml(name)}${button}</span>`;
  }).join('');
}

function hydrateSettingsForm() {
  $('settingDashboardName').value = settings.dashboardName;
  $('settingProfileName').value = settings.profileName;
  $('settingCurrency').value = settings.currency;
  $('settingTheme').value = settings.theme;
}

function saveSettingsForm(e) {
  e.preventDefault();
  settings = {
    dashboardName: $('settingDashboardName').value.trim() || DEFAULT_SETTINGS.dashboardName,
    profileName: $('settingProfileName').value.trim() || DEFAULT_SETTINGS.profileName,
    currency: $('settingCurrency').value.trim() || DEFAULT_SETTINGS.currency,
    theme: $('settingTheme').value
  };
  saveSettings();
  applySettings();
  render();
  showToast('บันทึกการตั้งค่าแล้ว');
}

function applySettings() {
  $('dashboardTitle').textContent = settings.dashboardName;
  $('profileName').textContent = settings.profileName;
  document.body.classList.toggle('compactTheme', settings.theme === 'compact');
}

function printReport() {
  document.querySelector('.heroText p').dataset.reportMonth = getMonthLabel(selectedMonth);
  window.print();
}

function resetDemo() {
  entries = [];
  saveEntries();
  selectedMonth = getCurrentMonthKey();
  updateMonthFilter();
  render();
  showToast('ล้างข้อมูลแล้ว');
}

function render() {
  const visibleEntries = getVisibleEntries();
  const income = sum(visibleEntries.filter(e => e.type === 'income'));
  const expense = sum(visibleEntries.filter(e => e.type === 'expense'));
  const profit = income - expense;
  $('incomeTotal').textContent = fmt(income);
  $('expenseTotal').textContent = fmt(expense);
  $('netProfit').textContent = fmt(profit);
  $('yearProfit').textContent = fmt(profit);
  $('sponsorTotal').textContent = fmt(sum(visibleEntries.filter(e => e.category === 'สปอนเซอร์')));
  $('travelTotal').textContent = fmt(sum(visibleEntries.filter(e => e.category === 'ค่าเดินทาง')));
  $('salaryTotal').textContent = fmt(sum(visibleEntries.filter(e => e.category === 'เงินเดือนทีมงาน')));
  $('miniIncome').textContent = fmt(income);
  $('miniExpense').textContent = fmt(expense);
  $('miniProfit').textContent = fmt(profit);
  renderTable();
  drawBar();
  drawDonut();
}

function renderTable() {
  let rows = getVisibleEntries();
  if (activeView === 'income') rows = rows.filter(e => e.type === 'income');
  if (activeView === 'expense') rows = rows.filter(e => e.type === 'expense');
  if (activeView === 'salary') rows = rows.filter(e => e.category === 'เงินเดือนทีมงาน');
  $('tbody').innerHTML = rows.map((e) => {
    const i = entries.indexOf(e);
    return `<tr><td>${new Date(e.date).toLocaleDateString('th-TH')}</td><td>${escapeHtml(e.title)}</td><td><span class="tag ${e.type}">${e.type === 'income' ? 'รายรับ' : 'รายจ่าย'}</span></td><td>${escapeHtml(e.category)}</td><td>${e.type === 'income' ? fmt(e.amount) : '-'}</td><td>${e.type === 'expense' ? fmt(e.amount) : '-'}</td><td>${escapeHtml(e.note || '')}</td><td><button class="del" type="button" onclick="del(${i})">⌫</button></td></tr>`;
  }).join('');
}

function sum(arr) {
  return arr.reduce((a, b) => a + (+b.amount || 0), 0);
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getEntryMonthKey(entry) {
  if (!entry.date) return '';
  const date = new Date(entry.date);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(key) {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
}

function updateMonthFilter() {
  const monthKeys = new Set([getCurrentMonthKey(), ...entries.map(getEntryMonthKey).filter(Boolean)]);
  const sortedKeys = [...monthKeys].sort((a, b) => b.localeCompare(a));
  if (!sortedKeys.includes(selectedMonth)) selectedMonth = sortedKeys[0] || getCurrentMonthKey();
  $('monthFilter').innerHTML = sortedKeys.map(key => `<option value="${key}">${getMonthLabel(key)}</option>`).join('');
  $('monthFilter').value = selectedMonth;
}

function getVisibleEntries() {
  return entries.filter(entry => getEntryMonthKey(entry) === selectedMonth);
}

function getMonthlyTotals() {
  const monthMap = new Map();
  getVisibleEntries().forEach(entry => {
    if (!entry.date) return;
    const date = new Date(entry.date);
    if (Number.isNaN(date.getTime())) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap.has(key)) {
      monthMap.set(key, {
        label: date.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' }),
        income: 0,
        expense: 0
      });
    }
    monthMap.get(key)[entry.type === 'income' ? 'income' : 'expense'] += +entry.amount || 0;
  });
  return [...monthMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value);
}

function setupCanvas(canvas) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(320, Math.floor(rect.width || canvas.parentElement.clientWidth || 320));
  const height = Math.max(210, Math.floor(rect.height || 210));
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  return { ctx, w: width, h: height };
}

function drawBar() {
  const c = $('barChart');
  if (!c || c.closest('[hidden]')) return;
  const { ctx, w, h } = setupCanvas(c);
  const monthly = getMonthlyTotals();
  if (!monthly.length) {
    ctx.fillStyle = '#aeb4bf';
    ctx.font = '20px Kanit';
    ctx.textAlign = 'center';
    ctx.fillText('ยังไม่มีข้อมูลรายรับรายจ่าย', w / 2, h / 2);
    ctx.textAlign = 'left';
    return;
  }
  const max = Math.max(...monthly.map(m => Math.max(m.income, m.expense)), 1) * 1.18;
  const top = 34;
  const left = 34;
  const right = 12;
  const bottom = 34;
  const base = h - bottom;
  const plotW = w - left - right;
  const plotH = base - top;
  const gap = plotW / monthly.length;
  const barW = Math.max(8, Math.min(18, (gap - 12) / 2));
  ctx.strokeStyle = '#343944';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = base - i * plotH / 4;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(w - right, y);
    ctx.stroke();
  }
  monthly.forEach((m, i) => {
    const center = left + gap * i + gap / 2;
    const x = center - barW - 3;
    const bh = m.income / max * plotH;
    const eh = m.expense / max * plotH;
    ctx.fillStyle = '#61d36b';
    ctx.fillRect(x, base - bh, barW, bh);
    ctx.fillStyle = '#f25b57';
    ctx.fillRect(x + barW + 6, base - eh, barW, eh);
    ctx.fillStyle = '#c8ccd4';
    ctx.font = '11px Kanit';
    ctx.textAlign = 'center';
    ctx.fillText(m.label, center, base + 20);
  });
  ctx.textAlign = 'left';
  ctx.font = '13px Kanit';
  ctx.fillStyle = '#61d36b';
  ctx.fillText('■ รายรับ', left, 20);
  ctx.fillStyle = '#f25b57';
  ctx.fillText('■ รายจ่าย', left + 92, 20);
}

function drawDonut() {
  const c = $('donutChart');
  if (!c || c.closest('[hidden]')) return;
  const { ctx, w, h } = setupCanvas(c);
  const visibleEntries = getVisibleEntries();
  const cats = categories.expense.map(cat => ({ cat, val: sum(visibleEntries.filter(e => e.type === 'expense' && e.category === cat)) })).filter(x => x.val > 0);
  const total = sum(cats);
  const colors = ['#f25252', '#65d6a6', '#c94fd9', '#ffbd35', '#61b6ff', '#8f88a8', '#f084c5', '#49c7c1', '#d6d65d', '#ff8d45'];
  let start = -Math.PI / 2;
  const chartX = Math.min(160, w * 0.32);
  const chartY = h / 2;
  const radius = Math.min(72, h * 0.36, w * 0.22);
  const hole = radius * 0.52;
  if (!total) {
    ctx.fillStyle = '#aeb4bf';
    ctx.font = '24px Kanit';
    ctx.textAlign = 'center';
    ctx.fillText('ยังไม่มีรายจ่าย', w / 2, h / 2);
    ctx.textAlign = 'left';
    return;
  }
  cats.forEach((x, i) => {
    const a = x.val / total * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(chartX, chartY);
    ctx.arc(chartX, chartY, radius, start, start + a);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    start += a;
  });
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(chartX, chartY, hole, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#fff';
  ctx.font = '16px Kanit';
  ctx.textAlign = 'center';
  ctx.fillText('รวม', chartX, chartY - 8);
  ctx.fillText('100%', chartX, chartY + 16);
  ctx.textAlign = 'left';
  const legendX = Math.min(w - 210, chartX + radius + 34);
  cats.slice(0, 7).forEach((x, i) => {
    const percent = total ? (x.val / total * 100).toFixed(1) : '0.0';
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(legendX, 22 + i * 25, 13, 13);
    ctx.fillStyle = '#e7eaf0';
    ctx.font = '14px Kanit';
    ctx.fillText(`${x.cat} ${percent}%`, legendX + 21, 34 + i * 25);
  });
}

function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.hidden = true, 1800);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function escapeJs(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

init();
