let ticketFilterStatus = 'todos';
let ticketSearch = '';
let _ticketInterval = null;

async function renderTickets(el, all) {
  ticketFilterStatus = 'todos'; ticketSearch = '';

  // Para qualquer polling anterior
  clearInterval(_ticketInterval);

  el.innerHTML = `
    <div class="card" style="padding:14px 20px;margin-bottom:16px">
      <div class="search-bar">
        <input class="search-input" id="ticketSearch" placeholder="Buscar por título, ID ou descrição..." oninput="ticketSearch=this.value;loadTicketTable(${all})">
        <select class="filter-select" id="ticketStatus" onchange="ticketFilterStatus=this.value;loadTicketTable(${all})">
          <option value="todos">Todos os Status</option>
          <option value="aberto">Aberto</option>
          <option value="andamento">Em Andamento</option>
          <option value="resolvido">Resolvido</option>
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
          <thead><tr><th>ID</th><th>Título</th><th>Solicitante</th><th>Categoria</th><th>Prioridade</th><th>Status</th><th>Atualizado</th><th></th></tr></thead>
          <tbody id="ticketsBody"><tr><td colspan="8"><div class="loading">Carregando...</div></td></tr></tbody>
        </table>
      </div>
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
    const data = all ? tickets : tickets.filter(t => currentUser.role === 'admin' || t.user_id === currentUser.id);

    if (!data.length) {
      body.innerHTML = `<tr><td colspan="8"><div class="empty-state">
        <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v4z"/></svg>
        <p>Nenhum chamado encontrado.</p>
      </div></td></tr>`;
      return;
    }

    body.innerHTML = data.map(t => `
      <tr>
        <td class="ticket-id-code">${esc(t.code)}</td>
        <td><span class="text-truncate" title="${esc(t.title)}">${esc(t.title)}</span></td>
        <td>${esc(t.user_name)}</td>
        <td>${esc(t.category)}</td>
        <td>${badgePriority(t.priority)}</td>
        <td>${badgeStatus(t.status)}</td>
        <td style="color:var(--gray-400);font-size:12px">${t.updated_at ? t.updated_at.split('T')[0] : (t.created_at || '').split(' ')[0]}</td>
        <td><button class="btn btn-outline btn-sm" onclick="showPage('ticket-detail', ${t.id})">Ver</button></td>
      </tr>`).join('');
  } catch (e) {
    body.innerHTML = `<tr><td colspan="8"><div class="alert alert-danger" style="margin:16px">Erro: ${esc(e.message)}</div></td></tr>`;
  }
}