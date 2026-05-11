let _dashInterval = null;

async function renderDashboard(el) {
  clearInterval(_dashInterval);

  await loadDashboard(el);

  _dashInterval = setInterval(() => {
    if (currentPage !== 'dashboard') {
      clearInterval(_dashInterval);
      return;
    }
    loadDashboard(el);
  }, 10000); //10 segundos
}

async function loadDashboard(el) {
  try {
    const [stats, tickets] = await Promise.all([
      api.get('/api/stats'),
      api.get('/api/tickets?status=todos'),
    ]);
    const recent = tickets.slice(0, 6);

    el.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon si-blue">
          <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v4z"/></svg>
        </div>
        <div class="stat-label">Total de Chamados</div>
        <div class="stat-value">${stats.total}</div>
        <div class="stat-sub">Histórico completo</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon si-red">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        </div>
        <div class="stat-label">Abertos</div>
        <div class="stat-value">${stats.aberto}</div>
        <div class="stat-sub">Aguardando atendimento</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon si-yellow">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 5h2v6h-2zm0 8h2v2h-2z"/></svg>
        </div>
        <div class="stat-label">Em Andamento</div>
        <div class="stat-value">${stats.andamento}</div>
        <div class="stat-sub">Sendo atendidos</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon si-green">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
        </div>
        <div class="stat-label">Resolvidos</div>
        <div class="stat-value">${stats.resolvido}</div>
        <div class="stat-sub">Solucionados</div>
      </div>
    </div>

    ${stats.by_category ? `
    <div class="card" style="margin-bottom:20px">
      <div class="card-header"><div class="card-title">Chamados por Categoria</div></div>
      <div class="card-body" style="display:flex;flex-wrap:wrap;gap:12px">
        ${stats.by_category.map(c => `
          <div style="flex:1;min-width:120px;background:var(--gray-50);border-radius:var(--radius);padding:12px 16px;border:1px solid var(--gray-200)">
            <div style="font-size:11px;color:var(--gray-400);font-weight:700;text-transform:uppercase;margin-bottom:4px">${esc(c.category)}</div>
            <div style="font-size:22px;font-weight:800;color:var(--primary)">${c.total}</div>
          </div>`).join('')}
      </div>
    </div>` : ''}

    <div class="card">
      <div class="card-header">
        <div class="card-title">Chamados Recentes</div>
        <button class="btn btn-outline btn-sm" onclick="showPage('${currentUser.role === 'admin' ? 'all-tickets' : 'tickets'}')">Ver todos</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Título</th><th>Solicitante</th><th>Categoria</th><th>Prioridade</th><th>Status</th><th>Data</th><th></th></tr></thead>
          <tbody>
            ${recent.length ? recent.map(t => `
              <tr>
                <td class="ticket-id-code">${esc(t.code)}</td>
                <td><span class="text-truncate" title="${esc(t.title)}">${esc(t.title)}</span></td>
                <td>${esc(t.user_name)}</td>
                <td>${esc(t.category)}</td>
                <td>${badgePriority(t.priority)}</td>
                <td>${badgeStatus(t.status)}</td>
                <td style="color:var(--gray-400)">${t.created_at ? t.created_at.split(' ')[0] : ''}</td>
                <td><button class="btn btn-outline btn-sm" onclick="showPage('ticket-detail', ${t.id})">Ver</button></td>
              </tr>`).join('')
            : '<tr><td colspan="8"><div class="empty-state"><p>Nenhum chamado ainda.</p></div></td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
  } catch (e) {
    el.innerHTML = `<div class="alert alert-danger">Erro ao carregar dashboard: ${esc(e.message)}</div>`;
  }
}