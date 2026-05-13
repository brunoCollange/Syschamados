let newTicketFiles = [];

function renderNewTicket(el) {
  newTicketFiles = [];
  el.innerHTML = `
    <div class="card" style="max-width:760px">
      <div class="card-header">
        <div class="card-title">Novo Chamado</div>
      </div>
      <div class="card-body">
        <div class="alert alert-info" style="margin-bottom:20px">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
          Preencha todas as informações para agilizar o atendimento. Quanto mais detalhes, mais rápido será resolvido!
        </div>

        <div class="form-grid">
          <div class="form-group form-full">
            <label class="form-label">Nome do Colaborador *</label>
            <input type="text" class="form-control" id="nt-collaborator" placeholder="Ex: Maria Santos, João Silva...">
          </div>
          <div class="form-group form-full">
            <label class="form-label">Título do Chamado *</label>
            <input type="text" class="form-control" id="nt-title" placeholder="Ex: Sem acesso à internet, Problemas com sistema...">
          </div>
          <div class="form-group">
            <label class="form-label">Categoria *</label>
            <select class="form-control" id="nt-cat">
              <option>Sistema Salutem</option>
              <option>Impressora</option>
              <option>Requisição</option>
              <option>Sistemas Diversos</option>
              <option>Treinamento</option>
              <option>E-mail</option>
              <option>Rede / Internet</option>
              <option>Hardware</option>
              <option>Telefonia</option>
              <option>Outros</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Prioridade *</label>
            <select class="form-control" id="nt-priority">
              <option value="baixa">Baixa — Não urgente</option>
              <option value="media" selected>Média — Normal</option>
              <option value="alta">Alta — Urgente / Bloqueia trabalho</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Localização / Sala *</label>
            <input type="text" class="form-control" id="nt-location" placeholder="Ex: Consultório 1, Recepção, Faturamento...">
          </div>
          <div class="form-group form-full">
            <label class="form-label">Descrição Detalhada *</label>
            <textarea class="form-control" id="nt-desc" rows="6" placeholder="Descreva o problema com o máximo de detalhes:
• Quando o problema começou?
• Mensagens de erro que apareceram?
• O que você já tentou fazer para resolver?
• O problema é constante ou intermitente?"></textarea>
          </div>
          <div class="form-group form-full">
            <label class="form-label">Imagens / Capturas de Tela</label>
            <div class="upload-area" id="uploadArea" onclick="document.getElementById('nt-files').click()"
                 ondragover="event.preventDefault();this.classList.add('dragover')"
                 ondragleave="this.classList.remove('dragover')"
                 ondrop="handleDrop(event)">
              <svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg>
              <div class="upload-label">Arraste imagens aqui ou clique para selecionar</div>
              <div class="upload-sub">PNG, JPG, GIF, WebP — até 10MB cada</div>
            </div>
            <input type="file" id="nt-files" accept="image/*" multiple style="display:none" onchange="handleNewTicketFiles(this)">
            <div class="file-list" id="nt-file-preview"></div>
          </div>
        </div>

        <div id="nt-error" class="alert alert-danger" style="display:none"></div>

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:8px">
          <button class="btn btn-outline" onclick="showPage('tickets')">Cancelar</button>
          <button class="btn btn-primary" id="nt-submit" onclick="submitNewTicket()">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/></svg>
            Enviar Chamado
          </button>
        </div>
      </div>
    </div>`;
}

function handleNewTicketFiles(input) {
  Array.from(input.files).forEach(f => { if (newTicketFiles.length < 5) newTicketFiles.push(f); });
  renderNewTicketPreviews();
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById('uploadArea').classList.remove('dragover');
  Array.from(e.dataTransfer.files).forEach(f => { if (f.type.startsWith('image/') && newTicketFiles.length < 5) newTicketFiles.push(f); });
  renderNewTicketPreviews();
}

function renderNewTicketPreviews() {
  document.getElementById('nt-file-preview').innerHTML = newTicketFiles.map((f, i) => `
    <div class="file-thumb">
      <img src="${URL.createObjectURL(f)}" alt="${esc(f.name)}">
      <button class="file-remove" onclick="removeNewTicketFile(${i})">×</button>
    </div>`).join('');
}
function removeNewTicketFile(i) { newTicketFiles.splice(i, 1); renderNewTicketPreviews(); }

async function submitNewTicket() {
  const title = document.getElementById('nt-title').value.trim();
  const desc = document.getElementById('nt-desc').value.trim();
  const err = document.getElementById('nt-error');
  err.style.display = 'none';

  const collaborator = document.getElementById('nt-collaborator').value.trim();
  if (!collaborator) { err.textContent = 'O nome do colaborador é obrigatório.'; err.style.display = 'flex'; return; }
  if (!title) { err.textContent = 'O título é obrigatório.'; err.style.display = 'flex'; return; }
  if (!desc) { err.textContent = 'A descrição é obrigatória.'; err.style.display = 'flex'; return; }
  const location = document.getElementById('nt-location').value.trim();
  if (!location) { err.textContent = 'A localização é obrigatória.'; err.style.display = 'flex'; return; }

  const btn = document.getElementById('nt-submit');
  btn.disabled = true; btn.textContent = 'Enviando...';

  try {
    const fd = new FormData();
    fd.append('collaborator_name', collaborator);
    fd.append('title', title);
    fd.append('description', desc);
    fd.append('category', document.getElementById('nt-cat').value);
    fd.append('priority', document.getElementById('nt-priority').value);
    fd.append('location', document.getElementById('nt-location').value);
    newTicketFiles.forEach(f => fd.append('files', f));

    const res = await api.post('/api/tickets', fd, true);
    loadNotifications();
    showModal('✅ Chamado Aberto com Sucesso!',
      `<div class="alert alert-success" style="margin-bottom:16px">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
        Chamado <strong>${esc(res.code)}</strong> registrado!
      </div>
      <p style="font-size:13px;color:var(--gray-600);line-height:1.7">
        Sua solicitação foi enviada. Você receberá uma notificação quando houver alguma atualização no seu chamado.
      </p>`,
      `<button class="btn btn-outline" onclick="closeModal();showPage('tickets')">Meus chamados</button>
       <button class="btn btn-primary" onclick="closeModal();showPage('ticket-detail',${res.id})">Visualizar</button>`
    );
  } catch (e) {
    err.textContent = 'Erro ao criar chamado: ' + e.message;
    err.style.display = 'flex';
    btn.disabled = false; btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/></svg> Enviar Chamado';
  }
}
