async function renderUsers(el) {
  try {
    const users = await api.get('/api/users');
    el.innerHTML = `
      <div class="card" style="padding:14px 20px;margin-bottom:16px">
        <div class="search-bar">
          <input class="search-input" placeholder="Buscar usuário..." oninput="filterUsersUI(this.value)" style="flex:1">
          <button class="btn btn-primary btn-sm" onclick="openNewUserModal()">+ Novo Usuário</button>
        </div>
      </div>
      <div class="user-grid" id="userGrid">
        ${users.map(u => userCardHTML(u)).join('')}
      </div>`;
    window._usersCache = users;
  } catch (e) {
    el.innerHTML = `<div class="alert alert-danger">Erro ao carregar usuários: ${esc(e.message)}</div>`;
  }
}

function filterUsersUI(q) {
  if (!window._usersCache) return;
  const data = q ? window._usersCache.filter(u =>
    u.name.toLowerCase().includes(q.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(q.toLowerCase()) ||   // ← era email, agora username
    (u.department || '').toLowerCase().includes(q.toLowerCase())
  ) : window._usersCache;
  document.getElementById('userGrid').innerHTML = data.map(u => userCardHTML(u)).join('');
}

function userCardHTML(u) {
  return `
    <div class="user-card" id="user-card-${u.id}">
      <div class="user-card-avatar" style="background:${esc(u.color || '#1a56db')}">${esc(u.avatar || '?')}</div>
      <div class="user-card-info">
        <div class="user-card-name" title="${esc(u.name)}">${esc(u.name)}</div>
        <div class="user-card-email" title="${esc(u.username)}">${esc(u.username)}</div>
        <div class="user-card-meta">
          <span class="badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}">${u.role === 'admin' ? 'Admin' : 'Usuário'}</span>
          <span class="badge ${u.active ? 'badge-resolvido' : 'badge-inactive'}">${u.active ? 'Ativo' : 'Inativo'}</span>
          ${u.department ? `<span class="user-card-dept">· ${esc(u.department)}</span>` : ''}
        </div>
      </div>
      <div class="user-card-actions">
        <button class="btn btn-outline btn-icon btn-sm" onclick="openEditUserModal(${u.id})" title="Editar">
          <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
        </button>
        <button class="btn btn-outline btn-icon btn-sm" onclick="toggleUserActive(${u.id}, ${u.active})" title="${u.active ? 'Desativar' : 'Ativar'}">
          <svg viewBox="0 0 24 24"><path d="${u.active
      ? 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z'
      : 'M12 1C8.676 1 6 3.676 6 7v1H4v15h16V8h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v1H8V7c0-2.276 1.724-4 4-4zm0 9c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z'
    }" fill="currentColor"/></svg>
        </button>
        <button class="btn btn-outline btn-icon btn-sm" onclick="openPasswordModal(${u.id})" title="Redefinir senha">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-key-fill" viewBox="0 0 16 16">
          <path d="M3.5 11.5a3.5 3.5 0 1 1 3.163-5H14L15.5 8 14 9.5l-1-1-1 1-1-1-1 1-1-1-1 1H6.663a3.5 3.5 0 0 1-3.163 2M2.5 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2"/>
          </svg>
        </button>
      </div>
    </div>`;
}

function openNewUserModal() {
  showModal('Novo Usuário', `
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Nome Completo *</label>
        <input class="form-control" id="nu-name" placeholder="Nome Sobrenome">
      </div>
      <div class="form-group">
        <label class="form-label">Usuário *</label>
        <input class="form-control" id="nu-username" type="text" placeholder="nome.sobrenome">
      </div>
      <div class="form-group">
        <label class="form-label">Departamento</label>
        <input class="form-control" id="nu-dept" placeholder="Ex: Financeiro, RH...">
      </div>
      <div class="form-group">
        <label class="form-label">Perfil</label>
        <select class="form-control" id="nu-role">
          <option value="user">Usuário</option>
          <option value="admin">Administrador TI</option>
        </select>
      </div>
      <div class="form-group form-full">
        <label class="form-label">Senha *</label>
        <input class="form-control" type="password" id="nu-pass" placeholder="Mínimo 6 caracteres">
      </div>
    </div>
    <div id="nu-error" class="alert alert-danger" style="display:none"></div>`,
    `<button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-primary" onclick="createUser()">Criar Usuário</button>`
  );
}

async function createUser() {
  const name = document.getElementById('nu-name').value.trim();
  const username = document.getElementById('nu-username').value.trim();
  const pass = document.getElementById('nu-pass').value;
  const err = document.getElementById('nu-error');
  err.style.display = 'none';
  if (!name || !username || !pass) { err.textContent = 'Preencha todos os campos obrigatórios.'; err.style.display = 'flex'; return; }
  if (pass.length < 6) { err.textContent = 'A senha deve ter ao menos 6 caracteres.'; err.style.display = 'flex'; return; }
  const duplicate = window._usersCache?.find(u =>
    u.name.toLowerCase() === name.toLowerCase() ||
    u.username.toLowerCase() === username.toLowerCase()
  );
  if (duplicate) {
    err.textContent = duplicate.name.toLowerCase() === name.toLowerCase()
      ? 'Já existe um usuário com esse nome.'
      : 'Já existe um usuário com esse nome de usuário (login).';
    err.style.display = 'flex';
    return;
  }
  try {
    await api.post('/api/users', { name, username, password: pass, role: document.getElementById('nu-role').value, department: document.getElementById('nu-dept').value });
    closeModal();
    toast('Usuário criado com sucesso!', 'success');
    showPage('users');
  } catch (e) {
    err.textContent = e.message;
    err.style.display = 'flex';
  }
}

async function openEditUserModal(userId) {
  const u = window._usersCache?.find(x => x.id === userId);
  if (!u) return;
  showModal(`Editar — ${esc(u.name)}`, `
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Nome Completo *</label>
        <input class="form-control" id="eu-name" value="${esc(u.name)}">
      </div>
      <div class="form-group">
        <label class="form-label">Usuário *</label>
        <input class="form-control" id="eu-username" type="text" value="${esc(u.username || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Departamento</label>
        <input class="form-control" id="eu-dept" value="${esc(u.department || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Perfil</label>
        <select class="form-control" id="eu-role">
          <option value="user" ${u.role === 'user' ? 'selected' : ''}>Usuário</option>
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Administrador TI</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-control" id="eu-active">
          <option value="1" ${u.active ? 'selected' : ''}>Ativo</option>
          <option value="0" ${!u.active ? 'selected' : ''}>Inativo</option>
        </select>
      </div>
    </div>
    <div id="eu-error" class="alert alert-danger" style="display:none"></div>`,
    `<button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-primary" onclick="saveUser(${userId})">Salvar Alterações</button>`
  );
}

async function saveUser(userId) {
  const err = document.getElementById('eu-error');
  err.style.display = 'none';
  try {
    const name = document.getElementById('eu-name').value.trim();
    const username = document.getElementById('eu-username').value.trim();

    const duplicate = window._usersCache?.find(u => u.id !== userId && (
      u.name.toLowerCase() === name.toLowerCase() ||
      u.username.toLowerCase() === username.toLowerCase()
    ));
    if (duplicate) {
      err.textContent = duplicate.name.toLowerCase() === name.toLowerCase()
        ? 'Já existe um usuário com esse nome.'
        : 'Já existe um usuário com esse nome de usuário (login).';
      err.style.display = 'flex';
      return;
    }
    await api.put(`/api/users/${userId}`, {
      name,
      username,
      role: document.getElementById('eu-role').value,
      department: document.getElementById('eu-dept').value.trim(),
      active: document.getElementById('eu-active').value === '1',
    });
    closeModal();
    toast('Usuário atualizado!', 'success');
    showPage('users');
  } catch (e) {
    err.textContent = e.message;
    err.style.display = 'flex';
  }
}

async function toggleUserActive(userId, currentActive) {
  const u = window._usersCache?.find(x => x.id === userId);
  if (!u) return;
  const action = currentActive ? 'desativar' : 'ativar';
  if (!confirm(`Confirma ${action} o usuário ${u.name}?`)) return;
  try {
    await api.put(`/api/users/${userId}`, { name: u.name, username: u.username, role: u.role, department: u.department, active: !currentActive });
    toast(`Usuário ${currentActive ? 'desativado' : 'ativado'} com sucesso.`, 'success');
    showPage('users');
  } catch (e) { toast('Erro: ' + e.message, 'danger'); }
}

function openPasswordModal(userId) {
  const u = window._usersCache?.find(x => x.id === userId);
  showModal(`Redefinir Senha — ${esc(u?.name || '')}`, `
    <div class="form-group">
      <label class="form-label">Nova Senha *</label>
      <input class="form-control" type="password" id="np-pass" placeholder="Mínimo 6 caracteres">
    </div>
    <div class="form-group">
      <label class="form-label">Confirmar Nova Senha *</label>
      <input class="form-control" type="password" id="np-confirm" placeholder="Repita a senha">
    </div>
    <div id="np-error" class="alert alert-danger" style="display:none"></div>`,
    `<button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-primary" onclick="savePassword(${userId})">Salvar Senha</button>`
  );
}

async function savePassword(userId) {
  const pass = document.getElementById('np-pass').value;
  const confirm = document.getElementById('np-confirm').value;
  const err = document.getElementById('np-error');
  err.style.display = 'none';
  if (pass.length < 6) { err.textContent = 'Senha muito curta (mínimo 6 caracteres).'; err.style.display = 'flex'; return; }
  if (pass !== confirm) { err.textContent = 'As senhas não coincidem.'; err.style.display = 'flex'; return; }
  try {
    await api.put(`/api/users/${userId}/password`, { password: pass });
    closeModal();
    toast('Senha redefinida com sucesso!', 'success');
  } catch (e) { err.textContent = e.message; err.style.display = 'flex'; }
}
