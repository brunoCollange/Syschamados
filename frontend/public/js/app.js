// ── State ─────────────────────────────────────────────────────────────────────
let currentUser = null;
let currentPage = '';
let _previousPage = null;
let _previousParam = null;
let notifInterval = null;
let _lastNotifIds = new Set();
let _cachedNotifs = [];

// ── Auth ──────────────────────────────────────────────────────────────────────
async function doLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const pass = document.getElementById('loginPass').value;
  const btn = document.getElementById('loginBtn');
  const err = document.getElementById('loginError');
  err.style.display = 'none';
  btn.disabled = true; btn.textContent = 'Entrando...';
  try {
    const user = await api.post('/api/auth/login', { username, password: pass });
    currentUser = user;
    initApp();
  } catch (e) {
    err.textContent = e.message || 'Credenciais inválidas. Tente novamente.';
    err.style.display = 'flex';
  } finally {
    btn.disabled = false; btn.textContent = 'Entrar';
  }
}

function quickLogin(username, pass) {
  document.getElementById('loginUsername').value = username;
  document.getElementById('loginPass').value = pass;
  doLogin();
}

async function doLogout() {
  await api.post('/api/auth/logout');
  currentUser = null;
  clearInterval(notifInterval);
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('authPage').style.display = 'flex';
  document.getElementById('loginPass').value = '';
}

async function checkAuth() {
  try {
    currentUser = await api.get('/api/auth/me');
    initApp();
  } catch {
    document.getElementById('authPage').style.display = 'flex';
  }
}

function initApp() {
  document.getElementById('authPage').style.display = 'none';
  document.getElementById('mainApp').style.display = 'flex';
  // Sidebar user info
  document.getElementById('sidebarAvatar').textContent = currentUser.avatar;
  document.getElementById('sidebarAvatar').style.background = currentUser.color;
  document.getElementById('sidebarName').textContent = currentUser.name;
  document.getElementById('sidebarRole').textContent = currentUser.role === 'admin' ? 'Administrador • TI' : 'Usuário';
  // Admin elements
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.setProperty('display', currentUser.role === 'admin' ? 'flex' : 'none', 'important');
  });
  loadNotifications();
  requestNotifPermission();
  notifInterval = setInterval(loadNotifications, 10000);
  const hash = location.hash.replace('#', '');
  if (hash) {
    const [page, param] = hash.split('/');
    showPage(page, param ? Number(param) : null);
  } else {
    showPage('dashboard');
  }
}

// ── Page Router ───────────────────────────────────────────────────────────────
const pageTitles = {
  dashboard: 'Dashboard', tickets: 'Meus Chamados', 'new-ticket': 'Abrir Novo Chamado',
  'all-tickets': 'Todos os Chamados', users: 'Gestão de Usuários',
  history: 'Histórico de Chamados', 'ticket-detail': 'Detalhe do Chamado',
};

function goBack() {
  if (_previousPage) {
    showPage(_previousPage, _previousParam);
  } else {
    showPage('tickets');
  }
}

window.addEventListener('popstate', e => {
  if (e.state && e.state.page) showPage(e.state.page, e.state.param ?? null);
});

function showPage(page, param = null) {
  closeSidebar();
  closeNotifPanel();
  _previousPage = currentPage || null;
  _previousParam = null;
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const active = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (active) active.classList.add('active');
  document.getElementById('pageTitle').textContent = pageTitles[page] || page;
  const content = document.getElementById('pageContent');
  content.innerHTML = '<div class="loading">Carregando...</div>';
  if (page === 'dashboard') renderDashboard(content);
  else if (page === 'tickets') renderTickets(content, false);
  else if (page === 'all-tickets') renderTickets(content, true);
  else if (page === 'new-ticket') renderNewTicket(content);
  else if (page === 'ticket-detail') renderTicketDetail(content, param);
  else if (page === 'users') renderUsers(content);
  else if (page === 'history') renderHistory(content);
  history.pushState({ page, param }, '', param ? `#${page}/${param}` : `#${page}`);
}

// ── Notificações ───────────────────────────────---──────────────────────────────
async function loadNotifications() {
  try {
    const notifs = await api.get('/api/notifications');
    const isFirstLoad = _lastNotifIds.size === 0;

    notifs.filter(n => !n.read && !_lastNotifIds.has(n.id)).forEach(n => {
      // No primeiro carregamento só registra, não dispara aviso
      if (!isFirstLoad) showBrowserNotif(n.title, n.description, n.ticket_id);
    });
    notifs.forEach(n => _lastNotifIds.add(n.id));
    _cachedNotifs = notifs;

    const unread = notifs.filter(n => !n.read).length;
    const dot = document.getElementById('notifDot');
    dot.style.display = unread > 0 ? 'block' : 'none';
    renderNotifList(notifs);
  } catch (e) { console.error('Erro notif:', e); }
}

async function requestNotifPermission() {
  if (!('Notification' in window)) {
    console.warn('Navegador não suporta notificações.');
    return;
  }
  if (Notification.permission === 'default') {
    const result = await Notification.requestPermission();
    if (result !== 'granted') {
      toast('⚠️ Ative as notificações do navegador para receber alertas de novas mensagens.', 'danger');
    }
  }
  if (Notification.permission === 'denied') {
    toast('🔕 Notificações bloqueadas. Ative nas configurações do navegador.', 'danger');
  }
}

function showBrowserNotif(title, body, ticketId) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const n = new Notification(title, { body, icon: '/logoWhitebgblack.png' });
  if (ticketId) n.onclick = () => { window.focus(); showPage('ticket-detail', ticketId); };
}

function renderNotifList(notifs) {
  const list = document.getElementById('notifList');
  if (!notifs || !notifs.length) {
    list.innerHTML = '<div class="notif-empty">Nenhuma notificação</div>'; return;
  }
  list.innerHTML = notifs.map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}" onclick="clickNotif(${n.id}, ${n.ticket_id})">
      ${!n.read ? '<div class="notif-unread-dot"></div>' : '<div style="width:8px"></div>'}
      <div class="notif-item-content">
        <div class="notif-item-title">${esc(n.title)}</div>
        <div class="notif-item-desc">${esc(n.description)}</div>
        <div class="notif-item-time">${formatDate(n.created_at)}</div>
      </div>
    </div>`).join('');
}

async function clickNotif(id, ticketId) {
  await api.put(`/api/notifications/${id}/read`).catch(() => { });
  closeNotifPanel();
  if (ticketId) showPage('ticket-detail', ticketId);
  loadNotifications();
}

async function markAllRead() {
  await api.put('/api/notifications/read-all').catch(() => { });
  loadNotifications();
}

function toggleNotif() {
  const panel = document.getElementById('notifPanel');
  panel.classList.toggle('open');
}
function closeNotifPanel() {
  document.getElementById('notifPanel').classList.remove('open');
}
document.addEventListener('click', e => {
  if (!e.target.closest('#notifPanel') && !e.target.closest('#notifBtn')) closeNotifPanel();
});

// ── Modal ─────────────────────────────────────────────────────────────────────
function showModal(title, bodyHtml, footerHtml = '') {
  document.getElementById('modalTitle').innerHTML = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  document.getElementById('modalFooter').innerHTML = footerHtml;
  document.getElementById('modalOverlay').style.display = 'flex';
}
function closeModal() {
  document.getElementById('modalOverlay').style.display = 'none';
}
function handleModalClick(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function statusLabel(s) {
  return { aberto: 'Aberto', andamento: 'Em Andamento', resolvido: 'Resolvido' }[s] || s;
}

function priorityLabel(p) {
  return { alta: 'Alta', media: 'Média', baixa: 'Baixa' }[p] || p;
}

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str.replace(' ', 'T'));
  if (isNaN(d)) return str;
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString('pt-BR');
}

function formatDateTime(str) {
  if (!str) return '—';
  const [date, time] = str.split(' ');
  if (!date) return '—';
  const [y, m, d] = date.split('-');
  const hora = time ? time.slice(0, 5) : '';
  return hora ? `${d}/${m}/${y} • ${hora}` : `${d}/${m}/${y}`;
}

function badgeStatus(s) {
  return `<span class="badge badge-${s}">${statusLabel(s)}</span>`;
}
function badgePriority(p) {
  return `<span class="badge badge-${p}"><span class="priority-dot pd-${p}"></span>${priorityLabel(p)}</span>`;
}

function previewImage(src) {
  const overlay = document.createElement('div');
  overlay.className = 'image-preview-overlay';
  overlay.innerHTML = `<img src="${src}" alt="Preview">`;
  overlay.onclick = () => overlay.remove();
  document.body.appendChild(overlay);
}

// ── Mobile Sidebar ────────────────────────────────────────────────────────────
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

// ── Init ──────────────────────────────────────────────────────────────────────
checkAuth();