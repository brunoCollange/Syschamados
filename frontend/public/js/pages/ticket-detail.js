let _chatInterval = null;
let _lastMessageId = 0;

async function renderTicketDetail(el, ticketId) {
  try {
    const t = await api.get(`/api/tickets/${ticketId}`);
    const canEdit = currentUser.role === 'admin';

    el.innerHTML = `
      <div style="margin-bottom:14px">
        <button class="btn btn-outline btn-sm" onclick="history.back()">← Voltar</button>
        <button class="btn btn-outline btn-sm" style="margin-left:8px" onclick="window.print()">🖨 Imprimir</button>
      </div>

      <div class="ticket-detail-header">
        <div class="ticket-code">${esc(t.code)} · Aberto em ${(t.created_at || '').split(' ')[0]}</div>
        <div class="ticket-title-text">${esc(t.title)}</div>
        <div class="ticket-meta">
          <div class="ticket-meta-item">
            <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            ${esc(t.user_name)}
          </div>
          ${t.department ? `<div class="ticket-meta-item">${esc(t.department)}</div>` : ''}
          <div class="ticket-meta-item">${esc(t.category)}</div>
          ${badgePriority(t.priority)}
          ${badgeStatus(t.status)}
        </div>
      </div>

      <div class="ticket-layout">
        <!-- MAIN -->
        <div class="ticket-main">
          <!-- Description -->
          <div class="card">
            <div class="card-header"><div class="card-title">Descrição do Problema</div></div>
            <div class="card-body">
              <p style="font-size:14px;line-height:1.7;white-space:pre-wrap;color:var(--gray-700)">${esc(t.description)}</p>
              ${t.attachments && t.attachments.length ? `
                <div style="margin-top:16px">
                  <div class="section-label">Anexos (${t.attachments.length})</div>
                  <div class="attachments-list">
                    ${t.attachments.map(a => {
      const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(a.filename);
      if (isImg) return `<img class="attachment-img" src="/uploads/${esc(a.filename)}" alt="${esc(a.original_name)}" onclick="previewImage('/uploads/${esc(a.filename)}')" title="${esc(a.original_name)}">`;
      return `<div class="attachment-item" onclick="window.open('/uploads/${esc(a.filename)}','_blank')">
                        <svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>
                        ${esc(a.original_name)}
                      </div>`;
    }).join('')}
                  </div>
                </div>` : ''}
            </div>
          </div>

          <!-- Messages -->
          <div class="card">
            <div class="card-header"><div class="card-title">Chat de Atendimento</div></div>
            <div class="card-body">
              <div class="messages-list" id="messagesList">
                ${t.messages && t.messages.length ? t.messages.map(m => messageHTML(m)).join('') :
        '<div style="text-align:center;padding:16px;color:var(--gray-400);font-size:13px">Nenhuma mensagem ainda. Seja o primeiro a escrever!</div>'}
              </div>
              <hr class="divider">
              ${t.status === 'resolvido' ? `
              <div class="alert alert-info" style="justify-content:center;font-size:13px">
                ✅ Este chamado foi resolvido e não aceita mais mensagens.
              </div>` : `
              <div style="margin-top:0">
                <div class="section-label" style="margin-bottom:6px">Nova Mensagem</div>
                <textarea class="reply-textarea" id="replyText" placeholder="Digite sua mensagem..."></textarea>
                <div style="display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap">
                  <label class="btn btn-outline btn-sm" style="cursor:pointer">
                    <svg viewBox="0 0 24 24"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>
                    Anexar imagem
                    <input type="file" id="replyFile" accept="image/*" multiple style="display:none" onchange="previewReplyFiles()">
                  </label>
                  <div id="replyFilePreview" class="file-list" style="flex:1"></div>
                  <button class="btn btn-primary btn-sm" onclick="sendReply(${t.id})">Enviar Resposta</button>
                </div>
              </div>`}
            </div>
          </div>
        </div>

        <!-- SIDEBAR -->
        <div class="ticket-sidebar-col">
          <div class="ticket-info-card">
            <div class="info-card-title">Informações do Chamado</div>
            <div class="info-row"><span class="info-label">Status</span>${badgeStatus(t.status)}</div>
            <div class="info-row"><span class="info-label">Prioridade</span>${badgePriority(t.priority)}</div>
            <div class="info-row"><span class="info-label">Categoria</span><span class="info-value-truncate" title="${esc(t.category)}">${esc(t.category)}</span></div>
            <div class="info-row"><span class="info-label">Localização</span><span class="info-value-truncate" title="${esc(t.location || '—')}">${esc(t.location || '—')}</span></div>
           <div class="info-row"><span class="info-label">Solicitante</span><span class="info-value-truncate" title="${esc(t.user_name)}">${esc(t.user_name)}</span></div>
            <div class="info-row"><span class="info-label">Aberto em</span><span>${formatDateTime(t.created_at)}</span></div>
            <div class="info-row"><span class="info-label">Atualizado</span><span>${formatDateTime(t.updated_at)}</span></div>
            ${t.assigned_name ? `<div class="info-row"><span class="info-label">Responsável TI</span><span class="info-value-truncate" title="${esc(t.assigned_name)}">${esc(t.assigned_name)}</span></div>` : ''}
          </div>

          ${canEdit ? `
          <div class="ticket-info-card">
            <div class="info-card-title">Alterar Status</div>
            <div class="status-btns">
              <button class="status-btn sb-aberto"    onclick="changeStatus(${t.id},'aberto')">Aberto</button>
              <button class="status-btn sb-andamento" onclick="changeStatus(${t.id},'andamento')">Em Andamento</button>
              <button class="status-btn sb-resolvido" onclick="changeStatus(${t.id},'resolvido')">Resolvido</button>
            </div>
          </div>` : ''}
        </div>
      </div>`;
    // Inicia polling do chat
    clearInterval(_chatInterval);
    _lastMessageId = t.messages?.length ? t.messages[t.messages.length - 1].id : 0;
    _chatInterval = setInterval(() => pollNewMessages(t.id), 5000);
  } catch (e) {
    el.innerHTML = `<div class="alert alert-danger">Erro ao carregar chamado: ${esc(e.message)}</div>`;
  }
}

async function pollNewMessages(ticketId) {
  // Para o polling se o usuário saiu da página do ticket
  if (currentPage !== 'ticket-detail') {
    clearInterval(_chatInterval);
    return;
  }
  const list = document.getElementById('messagesList');
  if (!list) { clearInterval(_chatInterval); return; }

  try {
    const t = await api.get(`/api/tickets/${ticketId}`);
    const newMsgs = t.messages?.filter(m => m.id > _lastMessageId) || [];
    if (newMsgs.length) {
      newMsgs.forEach(m => { list.innerHTML += messageHTML(m); });
      list.scrollTop = list.scrollHeight;
      _lastMessageId = newMsgs[newMsgs.length - 1].id;
    }
  } catch (e) { console.error('Erro polling chat:', e); }
}

function messageHTML(m) {
  const isAdmin = m.role === 'admin';
  return `
    <div class="message ${isAdmin ? 'from-admin' : ''}">
      <div class="msg-avatar" style="background:${esc(m.color || '#1a56db')}">${esc(m.avatar || '?')}</div>
      <div class="msg-bubble">
        <div class="msg-name">${esc(m.user_name)}${isAdmin ? ' <span style="font-size:10px;color:var(--primary);font-weight:500">· TI</span>' : ''}</div>
        <div class="msg-text">${esc(m.message)}</div>
        <div class="msg-time">${m.created_at ? m.created_at : ''}</div>
      </div>
    </div>`;
}

let replyFiles = [];
function previewReplyFiles() {
  const input = document.getElementById('replyFile');
  replyFiles = Array.from(input.files);
  const preview = document.getElementById('replyFilePreview');
  preview.innerHTML = replyFiles.map((f, i) => `
    <div class="file-thumb" style="width:60px;height:60px">
      <img src="${URL.createObjectURL(f)}" alt="${esc(f.name)}">
      <button class="file-remove" onclick="removeReplyFile(${i})">×</button>
    </div>`).join('');
}
function removeReplyFile(i) {
  replyFiles.splice(i, 1);
  document.getElementById('replyFilePreview').innerHTML = replyFiles.map((f, j) => `
    <div class="file-thumb" style="width:60px;height:60px">
      <img src="${URL.createObjectURL(f)}" alt="${esc(f.name)}">
      <button class="file-remove" onclick="removeReplyFile(${j})">×</button>
    </div>`).join('');
}

async function sendReply(ticketId) {
  const text = document.getElementById('replyText').value.trim();
  if (!text) { toast('Digite uma mensagem antes de enviar.', 'danger'); return; }
  const btn = document.querySelector('[onclick*="sendReply"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }
  try {
    const fd = new FormData();
    fd.append('message', text);
    replyFiles.forEach(f => fd.append('files', f));
    const msg = await api.post(`/api/tickets/${ticketId}/messages`, fd, true);
    document.getElementById('replyText').value = '';
    replyFiles = [];
    document.getElementById('replyFilePreview').innerHTML = '';
    const list = document.getElementById('messagesList');
    list.innerHTML += messageHTML(msg);
    list.scrollTop = list.scrollHeight;
    _lastMessageId = msg.id; // evita que o polling exiba novamente esta mensagem
    toast('Mensagem enviada!', 'success');
  } catch (e) {
    toast('Erro ao enviar: ' + e.message, 'danger');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Enviar Resposta'; }
  }
}

function changeStatus(ticketId, status) {
  const label = statusLabel(status);

  const statusColors = {
    aberto: { bg: '#dbeafe', border: '#1a56db' },
    andamento: { bg: '#fff3cd', border: '#f59e0b' },
    resolvido: { bg: '#d1fae5', border: '#059669' },
  };
  const style = statusColors[status] || { bg: '#f3f4f6', border: '#6b7280', icon: '❓' };

  const modalBody = document.getElementById('modalBody');
  const modalFooter = document.getElementById('modalFooter');
  const modalTitle = document.getElementById('modalTitle');

  modalTitle.textContent = 'Confirmar alteração de status';

  modalBody.innerHTML = `
    <div style="
      display:flex;
      flex-direction:column;
      align-items:center;
      gap:16px;
      padding:8px 0 4px;
      text-align:center;
    ">
      <div>
        <p style="margin:0;font-size:15px;color:var(--gray-700)">
          Deseja realmente alterar o status para:
          <span style="
          display:inline-block;
          padding:4px 14px;border-radius:20px;
          background:${style.bg};border:1px solid ${style.border};
          font-weight:600;font-size:14px;color:${style.border};
          ">${label}</span> ?
        </p>
      </div>
    </div>`;

  modalFooter.innerHTML = `
    <button class="btn btn-outline btn-sm" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary btn-sm" id="confirmStatusBtn" onclick="_confirmChangeStatus(${ticketId}, '${status}')">
      Confirmar
    </button>`;

  document.getElementById('modalOverlay').style.display = 'flex';
}

async function _confirmChangeStatus(ticketId, status) {
  const btn = document.getElementById('confirmStatusBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }
  try {
    await api.put(`/api/tickets/${ticketId}/status`, { status });
    closeModal();
    toast(`Status alterado para "${statusLabel(status)}"`, 'success');
    loadNotifications();
    showPage('ticket-detail', ticketId);
    clearInterval(_chatInterval);
  } catch (e) {
    toast('Erro: ' + e.message, 'danger');
    if (btn) { btn.disabled = false; btn.textContent = 'Confirmar'; }
  }
}