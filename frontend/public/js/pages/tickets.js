let ticketFilterStatus = 'todos';
let ticketSearch = '';
let ticketPage = 1;
const TICKETS_PER_PAGE = 10;
let _ticketInterval = null;

async function renderTickets(el, all) {
  ticketFilterStatus = all ? 'aberto' : 'todos'; ticketSearch = ''; ticketPage = 1;

  // Para qualquer polling anterior
  clearInterval(_ticketInterval);

  el.innerHTML = `
    <div class="card" style="padding:14px 20px;margin-bottom:16px">
      <div class="search-bar">
        <input class="search-input" id="ticketSearch" placeholder="Buscar por título, ID ou descrição..." oninput="ticketSearch=this.value;ticketPage=1;loadTicketTable(${all})">
        <select class="filter-select" id="ticketStatus" onchange="ticketFilterStatus=this.value;ticketPage=1;loadTicketTable(${all})">
          <option value="aberto" ${all ? 'selected' : ''}>Aberto</option>
          <option value="andamento">Em Andamento</option>
          <option value="resolvido">Resolvido</option>
          <option value="todos" ${!all ? 'selected' : ''}>Todos os Status</option>
        </select>
        ${currentUser.role === 'admin' ? `<button class="btn btn-outline btn-sm" onclick="window.print()">
        <svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:currentColor"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>
        Imprimir
        </button>` : ''}
        ${currentUser.role === 'admin' ? '<button class="btn btn-primary btn-sm" onclick="showPage(\'new-ticket\')">+ Novo Chamado</button>' : ''}
      </div>
    </div>
    <div class="card" id="ticketsCard">
      <div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Título</th><th>Colaborador</th><th>Categoria</th><th>Prioridade</th><th>Status</th><th>Atualizado</th></tr></thead>
          <tbody id="ticketsBody"><tr><td colspan="7"><div class="loading">Carregando...</div></td></tr></tbody>
        </table>
      </div>
      <div id="ticketsPagination"></div>
    </div>`;

  await loadTicketTable(all);

  // Atualiza a cada 15 segundos enquanto estiver na página
  _ticketInterval = setInterval(() => {
    if (currentPage !== 'tickets' && currentPage !== 'all-tickets') {
      clearInterval(_ticketInterval);
      return;
    }
    loadTicketTable(all);
  }, 15000);
}

async function loadTicketTable(all) {
  const body = document.getElementById('ticketsBody');
  if (!body) return;

  try {
    const params = new URLSearchParams();
    if (ticketFilterStatus !== 'todos') params.set('status', ticketFilterStatus);
    if (ticketSearch) params.set('search', ticketSearch);
    const tickets = await api.get(`/api/tickets?${params}`);
    const statusOrder = { aberto: 0, andamento: 1, resolvido: 2 };
    const data = all
      ? [...tickets].sort((a, b) => (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3) || b.id - a.id)
      : tickets.filter(t => t.user_id === currentUser.id);

    if (!data.length) {
      body.innerHTML = `<tr><td colspan="7"><div class="empty-state">
        <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v4z"/></svg>
        <p>Nenhum chamado encontrado.</p>
      </div></td></tr>`;
      document.getElementById('ticketsPagination').innerHTML = '';
      return;
    }

    const totalPages = Math.ceil(data.length / TICKETS_PER_PAGE);
    if (ticketPage > totalPages) ticketPage = totalPages;
    const start = (ticketPage - 1) * TICKETS_PER_PAGE;
    const page = data.slice(start, start + TICKETS_PER_PAGE);

    body.innerHTML = page.map(t => `
      <tr style="cursor:pointer" onclick="showPage('ticket-detail', ${t.id})">
        <td class="ticket-id-code">${esc(t.code)}</td>
        <td><span class="text-truncate" title="${esc(t.title)}">${esc(t.title)}</span></td>
        <td>${esc(t.collaborator_name || t.user_name)}</td>
        <td>${esc(t.category)}</td>
        <td>${badgePriority(t.priority)}</td>
        <td>${badgeStatus(t.status)}</td>
        <td style="color:var(--gray-400);font-size:12px">${t.updated_at ? t.updated_at.split('T')[0] : (t.created_at || '').split(' ')[0]}</td>
      </tr>`).join('');

    renderTicketsPagination(data.length, totalPages, all);
  } catch (e) {
    body.innerHTML = `<tr><td colspan="7"><div class="alert alert-danger" style="margin:16px">Erro: ${esc(e.message)}</div></td></tr>`;
  }
}

function renderTicketsPagination(total, totalPages, all) {
  const el = document.getElementById('ticketsPagination');
  if (!el) return;
  if (totalPages <= 1) { el.innerHTML = ''; return; }

  const start = (ticketPage - 1) * TICKETS_PER_PAGE + 1;
  const end = Math.min(ticketPage * TICKETS_PER_PAGE, total);

  let btns = '';
  btns += `<button class="page-btn" onclick="gotoTicketPage(${ticketPage - 1},${all})" ${ticketPage === 1 ? 'disabled' : ''}>‹</button>`;
  for (let i = 1; i <= totalPages; i++) {
    if (totalPages > 7 && i > 2 && i < totalPages - 1 && Math.abs(i - ticketPage) > 1) {
      if (i === 3 || i === totalPages - 2) btns += `<button class="page-btn" disabled>…</button>`;
      continue;
    }
    btns += `<button class="page-btn ${i === ticketPage ? 'active' : ''}" onclick="gotoTicketPage(${i},${all})">${i}</button>`;
  }
  btns += `<button class="page-btn" onclick="gotoTicketPage(${ticketPage + 1},${all})" ${ticketPage === totalPages ? 'disabled' : ''}>›</button>`;

  el.innerHTML = `
    <div class="pagination">
      <span>Mostrando ${start}–${end} de ${total} chamados</span>
      <div class="pagination-btns">${btns}</div>
    </div>`;
}

function gotoTicketPage(page, all) {
  ticketPage = page;
  loadTicketTable(all);
  document.getElementById('ticketsCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
