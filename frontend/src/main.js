import { io } from 'socket.io-client';
import Chart from 'chart.js/auto';

// ─── CONFIG ────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || ''; 
const API = API_URL + '/api';
let token = localStorage.getItem('cm_token');
let socket = null;
let isMonitoring = false;
let alerts = [];

// Chart instances
let miniChart, liveChart, memChart, historyChart;

// Data buffers
const MAX_POINTS = 30;
const liveLabels = [];
const liveCpuData = [];
const miniLabels = [];
const miniCpuData = [];

// ─── DOM HELPERS ───────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const show = (el) => el?.classList.remove('hidden');
const hide = (el) => el?.classList.add('hidden');

function toast(msg, type = 'info') {
  const c = $('toast-container');
  const t = document.createElement('div');
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

// ─── AUTH ──────────────────────────────────────────────────────
function setLoading(btn, loading) {
  const span = btn.querySelector('span');
  const loader = btn.querySelector('.btn-loader');
  if (loading) { span.style.opacity = '0'; show(loader); btn.disabled = true; }
  else { span.style.opacity = '1'; hide(loader); btn.disabled = false; }
}

async function apiPost(endpoint, data) {
  const res = await fetch(`${API}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function apiGet(endpoint) {
  const res = await fetch(`${API}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

async function apiPatch(endpoint) {
  const res = await fetch(`${API}${endpoint}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

// Switch between login/register
$('go-register').addEventListener('click', (e) => {
  e.preventDefault();
  $('login-form').classList.remove('active');
  $('register-form').classList.add('active');
});
$('go-login').addEventListener('click', (e) => {
  e.preventDefault();
  $('register-form').classList.remove('active');
  $('login-form').classList.add('active');
});

// LOGIN
$('login-btn').addEventListener('click', async () => {
  const email = $('login-email').value.trim();
  const password = $('login-password').value;
  const errEl = $('login-error');
  errEl.classList.add('hidden');

  if (!email || !password) {
    errEl.textContent = 'Please fill in all fields.';
    errEl.classList.remove('hidden');
    return;
  }
  setLoading($('login-btn'), true);
  const data = await apiPost('/auth/login', { email, password });
  setLoading($('login-btn'), false);

  if (data.success) {
    token = data.token;
    localStorage.setItem('cm_token', token);
    showDashboard(data.user);
    toast('Welcome back, ' + data.user.name + '!', 'success');
  } else {
    errEl.textContent = data.error || 'Login failed.';
    errEl.classList.remove('hidden');
  }
});

// REGISTER
$('register-btn').addEventListener('click', async () => {
  const name = $('reg-name').value.trim();
  const email = $('reg-email').value.trim();
  const password = $('reg-password').value;
  const errEl = $('register-error');
  errEl.classList.add('hidden');

  if (!name || !email || !password) {
    errEl.textContent = 'Please fill in all fields.';
    errEl.classList.remove('hidden');
    return;
  }
  if (password.length < 6) {
    errEl.textContent = 'Password must be at least 6 characters.';
    errEl.classList.remove('hidden');
    return;
  }
  setLoading($('register-btn'), true);
  const data = await apiPost('/auth/register', { name, email, password });
  setLoading($('register-btn'), false);

  if (data.success) {
    token = data.token;
    localStorage.setItem('cm_token', token);
    showDashboard(data.user);
    toast('Account created! Welcome, ' + data.user.name, 'success');
  } else {
    errEl.textContent = data.error || 'Registration failed.';
    errEl.classList.remove('hidden');
  }
});

// LOGOUT
$('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('cm_token');
  token = null;
  stopMonitoring();
  hide($('dashboard'));
  show($('auth-screen'));
  toast('Logged out successfully.', 'info');
});

// ─── DASHBOARD ─────────────────────────────────────────────────
function showDashboard(user) {
  hide($('auth-screen'));
  show($('dashboard'));
  $('user-name').textContent = user.name;
  $('user-role').textContent = user.role;
  $('user-avatar').textContent = user.name.charAt(0).toUpperCase();
  initCharts();
  loadSummary();
  loadAlerts();
  loadHistory(1);
  navigateTo('overview');
}

// Auto-login if token exists
async function autoLogin() {
  if (!token) return;
  try {
    const data = await apiGet('/auth/me');
    if (data.success) showDashboard(data.user);
    else { localStorage.removeItem('cm_token'); token = null; }
  } catch { localStorage.removeItem('cm_token'); token = null; }
}

// ─── NAVIGATION ────────────────────────────────────────────────
function navigateTo(page) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
  $(`page-${page}`)?.classList.add('active');
  $(`nav-${page}`)?.classList.add('active');
  $('page-title').textContent = { overview: 'Overview', live: 'Live Monitor', history: 'History', alerts: 'Alerts', analysis: 'Analysis' }[page];
}

document.querySelectorAll('.nav-item').forEach((item) => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo(item.dataset.page);
  });
});

// ─── CHARTS ────────────────────────────────────────────────────
const chartDefaults = {
  borderWidth: 2,
  pointRadius: 0,
  tension: 0.4,
  fill: true,
};

function initCharts() {
  const gridColor = 'rgba(255,255,255,0.05)';
  const textColor = '#7b8ba4';

  // Mini chart (overview)
  miniChart = new Chart($('mini-chart'), {
    type: 'line',
    data: {
      labels: miniLabels,
      datasets: [{
        label: 'CPU %',
        data: miniCpuData,
        borderColor: '#4f9cf9',
        backgroundColor: 'rgba(79,156,249,0.08)',
        ...chartDefaults,
      }],
    },
    options: chartOptions(gridColor, textColor, 100),
  });

  // Live chart
  liveChart = new Chart($('live-chart'), {
    type: 'line',
    data: {
      labels: liveLabels,
      datasets: [
        { label: 'Total CPU %', data: liveCpuData, borderColor: '#4f9cf9', backgroundColor: 'rgba(79,156,249,0.1)', ...chartDefaults },
      ],
    },
    options: chartOptions(gridColor, textColor, 100),
  });

  // Memory doughnut
  memChart = new Chart($('mem-chart'), {
    type: 'doughnut',
    data: {
      labels: ['Used', 'Free'],
      datasets: [{ data: [0, 100], backgroundColor: ['#9f7aea', 'rgba(255,255,255,0.05)'], borderWidth: 0, hoverOffset: 6 }],
    },
    options: {
      cutout: '70%',
      plugins: { legend: { labels: { color: textColor, font: { family: 'Inter' } } } },
    },
  });

  // History chart
  historyChart = new Chart($('history-chart'), {
    type: 'bar',
    data: {
      labels: [],
      datasets: [
        { label: 'CPU Load %', data: [], backgroundColor: (ctx) => ctx.raw > 80 ? 'rgba(252,129,129,0.7)' : 'rgba(79,156,249,0.6)', borderRadius: 4 },
      ],
    },
    options: chartOptions(gridColor, textColor, 100),
  });
}

function chartOptions(gridColor, textColor, max) {
  return {
    animation: { duration: 400 },
    responsive: true,
    scales: {
      x: { grid: { color: gridColor }, ticks: { color: textColor, maxTicksLimit: 8, font: { family: 'JetBrains Mono', size: 10 } } },
      y: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'JetBrains Mono', size: 10 } }, min: 0, max },
    },
    plugins: { legend: { display: false } },
  };
}

function pushData(labels, data, label, value, max = MAX_POINTS) {
  labels.push(label);
  data.push(value);
  if (labels.length > max) { labels.shift(); data.shift(); }
}

// ─── SOCKET.IO MONITORING ──────────────────────────────────────
function startMonitoring() {
  if (isMonitoring) return;
  socket = io(API_URL || '/', { auth: { token } });

  socket.on('connect', () => {
    isMonitoring = true;
    socket.emit('start-monitoring');
    $('connection-status').className = 'status-pill connected';
    $('connection-status').innerHTML = '<span class="status-dot"></span> Connected';
    hide($('start-monitor-btn'));
    show($('stop-monitor-btn'));
    toast('Monitoring started!', 'success');
  });

  socket.on('metrics', (m) => {
    updateOverview(m);
    updateLiveCharts(m);
    updateAnalysis(m);
    $('last-updated').textContent = 'Updated: ' + new Date(m.timestamp).toLocaleTimeString();

    if (m.isSpiking) {
      $('connection-status').className = 'status-pill spiking';
      $('connection-status').innerHTML = '<span class="status-dot"></span> ⚠ CPU Spike!';
      addAlert(m);
    } else {
      $('connection-status').className = 'status-pill connected';
      $('connection-status').innerHTML = '<span class="status-dot"></span> Connected';
    }
  });

  socket.on('disconnect', () => {
    isMonitoring = false;
    $('connection-status').className = 'status-pill disconnected';
    $('connection-status').innerHTML = '<span class="status-dot"></span> Disconnected';
    show($('start-monitor-btn'));
    hide($('stop-monitor-btn'));
  });
}

function stopMonitoring() {
  if (socket) { socket.emit('stop-monitoring'); socket.disconnect(); socket = null; }
  isMonitoring = false;
  $('connection-status').className = 'status-pill disconnected';
  $('connection-status').innerHTML = '<span class="status-dot"></span> Disconnected';
  show($('start-monitor-btn'));
  hide($('stop-monitor-btn'));
  toast('Monitoring stopped.', 'info');
}

$('start-monitor-btn').addEventListener('click', startMonitoring);
$('stop-monitor-btn').addEventListener('click', stopMonitoring);

// ─── UPDATE UI FROM METRICS ────────────────────────────────────
function updateOverview(m) {
  const cpu = m.cpu.totalLoad;
  const mem = m.memory.usedPercent;
  const temp = m.temperature;

  $('ov-cpu').textContent = cpu.toFixed(1) + '%';
  $('ov-cpu').style.color = cpu > 80 ? 'var(--accent-red)' : cpu > 60 ? 'var(--accent-yellow)' : 'var(--accent-green)';
  $('ov-mem').textContent = mem.toFixed(1) + '%';
  $('ov-temp').textContent = (temp || '--') + (temp ? ' °C' : '');
  $('ov-spike').textContent = m.isSpiking ? '🔴 SPIKE' : '🟢 Normal';
  $('ov-spike').style.color = m.isSpiking ? 'var(--accent-red)' : 'var(--accent-green)';

  // Rings
  $('cpu-ring-fill').setAttribute('stroke-dasharray', `${cpu}, 100`);
  $('mem-ring-fill').setAttribute('stroke-dasharray', `${mem}, 100`);

  // Mini chart
  const t = new Date(m.timestamp).toLocaleTimeString();
  pushData(miniLabels, miniCpuData, t, cpu);
  miniChart.update();

  // Core bars
  const container = $('core-bars');
  container.innerHTML = m.cpu.cores.map((c) => `
    <div class="core-bar-item">
      <span class="core-label">Core ${c.core}</span>
      <div class="core-bar-track"><div class="core-bar-fill" style="width:${c.load}%"></div></div>
      <span class="core-pct">${c.load.toFixed(1)}%</span>
    </div>`).join('');
}

function updateLiveCharts(m) {
  const t = new Date(m.timestamp).toLocaleTimeString();
  pushData(liveLabels, liveCpuData, t, m.cpu.totalLoad);
  liveChart.update();

  // Memory doughnut
  memChart.data.datasets[0].data = [m.memory.usedPercent, 100 - m.memory.usedPercent];
  memChart.update();

  // Process list
  const list = $('process-list');
  if (m.topProcesses?.length) {
    list.innerHTML = m.topProcesses.map((p, i) => `
      <div class="process-item">
        <span class="process-rank">#${i + 1}</span>
        <span class="process-name">${p.name}</span>
        <span class="process-cpu ${p.cpu > 30 ? 'high' : ''}">${p.cpu.toFixed(1)}%</span>
      </div>`).join('');
  }
}

function updateAnalysis(m) {
  const el = $('live-analysis');
  const status = m.isSpiking ? '🔴 SPIKE DETECTED' : '🟢 Normal';
  const used = (m.memory.used / 1024 / 1024 / 1024).toFixed(2);
  const total = (m.memory.total / 1024 / 1024 / 1024).toFixed(2);
  el.innerHTML = `
    ▶ Timestamp   : ${new Date(m.timestamp).toLocaleString()}<br>
    ▶ CPU Load    : ${m.cpu.totalLoad.toFixed(2)}%  (User: ${m.cpu.userLoad}% | System: ${m.cpu.systemLoad}%)<br>
    ▶ Memory      : ${used} GB / ${total} GB (${m.memory.usedPercent}%)<br>
    ▶ Temperature : ${m.temperature || 'N/A'} °C<br>
    ▶ Status      : ${status}<br>
    ▶ Top Process : ${m.topProcesses?.[0]?.name || 'N/A'} @ ${m.topProcesses?.[0]?.cpu?.toFixed(2) || 0}% CPU
  `;
}

// ─── ALERTS ────────────────────────────────────────────────────
function addAlert(m) {
  const alert = {
    _id: Date.now().toString(),
    type: 'CPU_SPIKE',
    message: `CPU spike detected! Load at ${m.cpu.totalLoad.toFixed(1)}%`,
    value: m.cpu.totalLoad,
    threshold: 80,
    resolved: false,
    createdAt: m.timestamp,
  };
  alerts.unshift(alert);
  renderAlerts();
  updateAlertBadge();

  // Persist to DB
  fetch(`${API}/alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ type: alert.type, message: alert.message, value: alert.value, threshold: 80 }),
  });

  toast(`⚠ CPU Spike: ${m.cpu.totalLoad.toFixed(1)}%`, 'warning');
}

async function loadAlerts() {
  const data = await apiGet('/alerts');
  if (data.success) { alerts = data.alerts; renderAlerts(); updateAlertBadge(); }
}

function renderAlerts() {
  const list = $('alerts-list');
  $('alert-count').textContent = `${alerts.length} alert${alerts.length !== 1 ? 's' : ''}`;
  if (!alerts.length) {
    list.innerHTML = '<p class="empty-state">No alerts yet. Start monitoring to detect CPU spikes.</p>';
    return;
  }
  list.innerHTML = alerts.map((a) => `
    <div class="alert-item ${a.resolved ? 'resolved' : ''}" id="alert-${a._id}">
      <span class="alert-icon">⚠️</span>
      <div class="alert-body">
        <div class="alert-msg">${a.message}</div>
        <div class="alert-time">${new Date(a.createdAt).toLocaleString()}</div>
        <div class="alert-val">CPU: ${a.value?.toFixed ? a.value.toFixed(1) : a.value}% | Threshold: ${a.threshold}%</div>
      </div>
      ${!a.resolved ? `<button class="resolve-btn" onclick="resolveAlert('${a._id}')">✓ Resolve</button>` : '<span style="color:var(--accent-green);font-size:0.78rem">✓ Resolved</span>'}
    </div>`).join('');
}

window.resolveAlert = async (id) => {
  await apiPatch(`/alerts/${id}/resolve`);
  const a = alerts.find((x) => x._id === id);
  if (a) { a.resolved = true; renderAlerts(); updateAlertBadge(); }
  toast('Alert resolved.', 'success');
};

function updateAlertBadge() {
  const unresolved = alerts.filter((a) => !a.resolved).length;
  const badge = $('alert-badge');
  if (unresolved > 0) { badge.textContent = unresolved; show(badge); }
  else hide(badge);
}

// ─── HISTORY ───────────────────────────────────────────────────
async function loadHistory(hours) {
  const data = await apiGet(`/metrics?hours=${hours}`);
  if (!data.success || !data.metrics.length) {
    historyChart.data.labels = [];
    historyChart.data.datasets[0].data = [];
    historyChart.update();
    return;
  }
  const sorted = [...data.metrics].reverse();
  historyChart.data.labels = sorted.map((m) => new Date(m.recordedAt).toLocaleTimeString());
  historyChart.data.datasets[0].data = sorted.map((m) => m.cpuLoad);
  historyChart.update();
}

async function loadSummary() {
  const data = await apiGet('/metrics/summary');
  if (data.success) {
    $('sum-total').textContent = data.summary.totalRecords;
    $('sum-spikes').textContent = data.summary.totalSpikes;
    $('sum-avg').textContent = data.summary.avgCpuLoad + '%';
    $('sum-max').textContent = data.summary.maxCpuLoad + '%';
  }
}

$('history-filter').addEventListener('change', (e) => loadHistory(e.target.value));

// ─── BOOT ──────────────────────────────────────────────────────
autoLogin();
