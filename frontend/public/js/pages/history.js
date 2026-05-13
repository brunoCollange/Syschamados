let historyMonth = '';

async function renderHistory(el) {
  el.innerHTML = '<div class="loading">Carregando histórico...</div>';
  try {
    const months = await api.get('/api/tickets/months');
    // Começa sem filtro de mês (mostra todos)
    historyMonth = '';

    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
        <div style="font-size:13px;color:var(--gray-500)">Selecione um mês para filtrar o histórico</div>
        <button class="btn btn-outline btn-sm" onclick="window.print()">
          <svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:currentColor"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>
          Imprimir Histórico
        </button>
      </div>
      <div class="month-tabs">
        <div class="month-tab active" onclick="selectHistoryMonth('',this)">Todos</div>
        ${months.map(m => `
          <div class="month-tab" onclick="selectHistoryMonth('${m.month}',this)">
            ${formatMonthLabel(m.month)}
          </div>`).join('')}
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Título</th>
                <th>Colaborador</th>
                <th>Categoria</th>
                <th>Prioridade</th>
                <th>Status</th>
                <th>Aberto em</th>
              </tr>
            </thead>
            <tbody id="historyBody"><tr><td colspan="8"><div class="loading">Carregando...</div></td></tr></tbody>
          </table>
        </div>
      </div>`;
    loadHistoryTable();
  } catch (e) {
    el.innerHTML = `<div class="alert alert-danger">Erro: ${esc(e.message)}</div>`;
  }
}

async function loadHistoryTable() {
  const body = document.getElementById('historyBody');
  if (!body) return;
  body.innerHTML = '<tr><td colspan="8"><div class="loading">Carregando...</div></td></tr>';
  try {
    const params = new URLSearchParams();
    if (historyMonth) params.set('month', historyMonth);

    const tickets = await api.get(`/api/tickets/history?${params}`);

    if (!tickets.length) {
      body.innerHTML = '<tr><td colspan="8"><div class="empty-state"><p>Nenhum chamado encerrado neste período.</p></div></td></tr>';
      return;
    }

    body.innerHTML = tickets.map(t => `
      <tr style="cursor:pointer" onclick="showPage('ticket-detail',${t.id})">
        <td class="ticket-id-code">${esc(t.code)}</td>
        <td><span class="text-truncate" title="${esc(t.title)}">${esc(t.title)}</span></td>
        <td>${esc(t.collaborator_name || t.user_name)}</td>
        <td>${esc(t.category)}</td>
        <td>${badgePriority(t.priority)}</td>
        <td>${badgeStatus(t.status)}</td>
        <td style="color:var(--gray-500);font-size:12px">${(t.created_at || '').split(' ')[0]}</td>
        <td style="color:var(--gray-500);font-size:12px">${t.closed_at ? (t.closed_at.split('T')[0] || t.closed_at.split(' ')[0]) : '—'}</td>
      </tr>`).join('');
  } catch (e) {
    body.innerHTML = `<tr><td colspan="8"><div class="alert alert-danger" style="margin:16px">Erro: ${esc(e.message)}</div></td></tr>`;
  }
}

function selectHistoryMonth(month, el) {
  historyMonth = month;
  document.querySelectorAll('.month-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  loadHistoryTable();
}

function formatMonthLabel(ym) {
  if (!ym) return 'Todos';
  const [year, month] = ym.split('-');
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${months[parseInt(month, 10) - 1]} ${year}`;
}
