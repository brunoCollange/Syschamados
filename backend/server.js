const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const https = require('https');
const Database = require('better-sqlite3');

const app = express();
const PORT = 3000;

// ── Database ──────────────────────────────────────────────────────────────────
const db = new Database(path.join(__dirname, '..', 'tidesk.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT UNIQUE,
    email TEXT,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    department TEXT,
    avatar TEXT,
    color TEXT DEFAULT '#1a56db',
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'media',
    status TEXT NOT NULL DEFAULT 'aberto',
    impact TEXT,
    location TEXT,
    user_id INTEGER NOT NULL,
    assigned_to INTEGER,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime')),
    closed_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS ticket_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (ticket_id) REFERENCES tickets(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS ticket_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    message_id INTEGER,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mimetype TEXT,
    size INTEGER,
    uploaded_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (ticket_id) REFERENCES tickets(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    ticket_id INTEGER,
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (ticket_id) REFERENCES tickets(id)
  );
`);

// Migração: adiciona coluna collaborator_name se ainda não existir
try { db.exec('ALTER TABLE tickets ADD COLUMN collaborator_name TEXT'); } catch(e) {}

// Cria usuário admin padrão se não existir
const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(`INSERT INTO users (name, username, email, password, role, department, avatar, color) VALUES (?,?,?,?,?,?,?,?)`)
    .run('Administrador', 'admin', 'admin@empresa.com', hash, 'admin', 'TI', 'AD', '#1a56db');
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'x9#kL2mQpZ7vRnTw4yBdEuAoWsJcFhGi',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 } // 8h
}));

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend/public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// File upload config
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf/;
    cb(null, allowed.test(file.mimetype));
  }
});

// ── Auth Middleware ───────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Não autenticado' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.userId || req.session.userRole !== 'admin')
    return res.status(403).json({ error: 'Acesso negado' });
  next();
}

// ── Auth Routes ───────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?) AND active = 1').get(username);
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'Credenciais inválidas' });
    req.session.userId = user.id;
    req.session.userRole = user.role;
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, color: user.color, department: user.department });
  } catch (e) {
    console.error('Erro em /api/auth/login:', e.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, email, role, avatar, color, department FROM users WHERE id = ?').get(req.session.userId);
    res.json(user);
  } catch (e) {
    console.error('Erro em /api/auth/me:', e.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ── Ticket Routes ─────────────────────────────────────────────────────────────

// CORRIGIDO: usa lastIndexOf('-') para pegar apenas o número final,
// independente de quantos hífens o código tiver.
function nextCode() {
  const year = new Date().getFullYear();
  const last = db.prepare(`SELECT code FROM tickets WHERE code LIKE ? ORDER BY id DESC LIMIT 1`).get(`#${year}-%`);
  if (!last) return `#${year}-0001`;
  const lastDash = last.code.lastIndexOf('-');
  const num = parseInt(last.code.substring(lastDash + 1), 10) + 1;
  return `#${year}-${String(num).padStart(4, '0')}`;
}

// Lista geral de tickets (com suporte a múltiplos status separados por vírgula)
app.get('/api/tickets', requireAuth, (req, res) => {
  try {
    const { status, month, search } = req.query;
    let sql = `SELECT t.*, u.name as user_name, u.avatar, u.color, u.department,
      a.name as assigned_name
      FROM tickets t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN users a ON t.assigned_to = a.id
      WHERE 1=1`;
    const params = [];

    if (req.session.userRole !== 'admin') {
      sql += ' AND t.user_id = ?'; params.push(req.session.userId);
    }

    // Suporte a múltiplos status: ex: status=resolvido
    if (status && status !== 'todos') {
      const statusList = status.split(',').map(s => s.trim()).filter(Boolean);
      if (statusList.length === 1) {
        sql += ' AND t.status = ?';
        params.push(statusList[0]);
      } else {
        sql += ` AND t.status IN (${statusList.map(() => '?').join(',')})`;
        params.push(...statusList);
      }
    }

    if (month) { sql += ` AND strftime('%Y-%m', t.created_at) = ?`; params.push(month); }
    if (search) {
      sql += ' AND (t.title LIKE ? OR t.code LIKE ? OR t.description LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    sql += ' ORDER BY t.id DESC';
    res.json(db.prepare(sql).all(...params));
  } catch (e) {
    console.error('Erro em GET /api/tickets:', e.message);
    res.status(500).json({ error: 'Erro ao buscar chamados' });
  }
});

// CORRIGIDO: rota de meses declarada ANTES de /:id para não ser capturada por ela
app.get('/api/tickets/months', requireAuth, (req, res) => {
  try {
    const isAdmin = req.session.userRole === 'admin';
    let sql = `SELECT DISTINCT strftime('%Y-%m', created_at) as month FROM tickets`;
    const params = [];
    if (!isAdmin) {
      sql += ` WHERE user_id = ?`;
      params.push(req.session.userId);
    }
    sql += ' ORDER BY month DESC';
    res.json(db.prepare(sql).all(...params));
  } catch (e) {
    console.error('Erro em GET /api/tickets/months:', e.message);
    res.status(500).json({ error: 'Erro ao buscar meses' });
  }
});

// NOVO: rota dedicada para o histórico (chamados resolvidos)
app.get('/api/tickets/history', requireAuth, (req, res) => {
  try {
    const { month } = req.query;
    const isAdmin = req.session.userRole === 'admin';

    let sql = `SELECT t.*, u.name as user_name, u.avatar, u.color, u.department,
      a.name as assigned_name
      FROM tickets t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN users a ON t.assigned_to = a.id
      WHERE t.status IN ('resolvido')`;
    const params = [];

    if (!isAdmin) {
      sql += ' AND t.user_id = ?';
      params.push(req.session.userId);
    }
    if (month) {
      sql += ` AND strftime('%Y-%m', t.created_at) = ?`;
      params.push(month);
    }

    sql += ' ORDER BY t.id DESC';
    res.json(db.prepare(sql).all(...params));
  } catch (e) {
    console.error('Erro em GET /api/tickets/history:', e.message);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});

app.get('/api/tickets/:id', requireAuth, (req, res) => {
  try {
    const t = db.prepare(`SELECT t.*, u.name as user_name, u.avatar as user_avatar, u.color as user_color, u.department,
      a.name as assigned_name FROM tickets t JOIN users u ON t.user_id = u.id LEFT JOIN users a ON t.assigned_to = a.id
      WHERE t.id = ?`).get(req.params.id);
    if (!t) return res.status(404).json({ error: 'Não encontrado' });
    if (req.session.userRole !== 'admin' && t.user_id !== req.session.userId)
      return res.status(403).json({ error: 'Acesso negado' });
    t.messages = db.prepare(`SELECT m.*, u.name as user_name, u.avatar, u.color, u.role
      FROM ticket_messages m JOIN users u ON m.user_id = u.id WHERE m.ticket_id = ? ORDER BY m.id`).all(t.id);
    t.attachments = db.prepare('SELECT * FROM ticket_attachments WHERE ticket_id = ? ORDER BY id').all(t.id);
    res.json(t);
  } catch (e) {
    console.error('Erro em GET /api/tickets/:id:', e.message);
    res.status(500).json({ error: 'Erro ao buscar chamado' });
  }
});

app.post('/api/tickets', requireAuth, upload.array('files', 5), (req, res) => {
  try {
    const { title, description, category, priority, location, collaborator_name } = req.body;
    if (!title || !description) return res.status(400).json({ error: 'Título e descrição são obrigatórios' });
    if (!collaborator_name) return res.status(400).json({ error: 'O nome do colaborador é obrigatório' });

    const code = nextCode();
    const info = db.prepare(`INSERT INTO tickets (code, title, description, category, priority, impact, location, collaborator_name, user_id) VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(code, title, description, category || 'Outros', priority || 'media', null, location, collaborator_name, req.session.userId);
    const ticketId = info.lastInsertRowid;

    if (req.files?.length) {
      const attStmt = db.prepare('INSERT INTO ticket_attachments (ticket_id, filename, original_name, mimetype, size) VALUES (?,?,?,?,?)');
      req.files.forEach(f => attStmt.run(ticketId, f.filename, f.originalname, f.mimetype, f.size));
    }

    const admins = db.prepare("SELECT id FROM users WHERE role = 'admin' AND active = 1").all();
    const requester = db.prepare('SELECT name FROM users WHERE id = ?').get(req.session.userId);
    const notifStmt = db.prepare('INSERT INTO notifications (user_id, title, description, ticket_id) VALUES (?,?,?,?)');
    admins.forEach(a => notifStmt.run(a.id, 'Novo chamado aberto', `${code} — ${requester.name}: ${title}`, ticketId));

    res.json({ id: ticketId, code });
  } catch (e) {
    console.error('Erro em POST /api/tickets:', e.message);
    res.status(500).json({ error: 'Erro ao criar chamado' });
  }
});

app.put('/api/tickets/:id/status', requireAdmin, (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['aberto', 'andamento', 'resolvido'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Status inválido' });

    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Não encontrado' });

    const closedAt = (status === 'resolvido') ? new Date().toISOString() : null;
    db.prepare(`UPDATE tickets SET status = ?, updated_at = datetime('now','localtime'), closed_at = ? WHERE id = ?`)
      .run(status, closedAt, req.params.id);

    if (status === 'resolvido') {
      const notifStmt = db.prepare('INSERT INTO notifications (user_id, title, description, ticket_id) VALUES (?,?,?,?)');
      notifStmt.run(ticket.user_id, 'Chamado resolvido! ✅', `Ticket ID: ${ticket.code} — solucionado!`, ticket.id);
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('Erro em PUT /api/tickets/:id/status:', e.message);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

app.put('/api/tickets/:id/assign', requireAdmin, (req, res) => {
  try {
    const { assigned_to } = req.body;
    db.prepare(`UPDATE tickets SET assigned_to = ?, updated_at = datetime('now','localtime') WHERE id = ?`).run(assigned_to || null, req.params.id);
    res.json({ ok: true });
  } catch (e) {
    console.error('Erro em PUT /api/tickets/:id/assign:', e.message);
    res.status(500).json({ error: 'Erro ao atribuir chamado' });
  }
});

// ── Messages ──────────────────────────────────────────────────────────────────
app.post('/api/tickets/:id/messages', requireAuth, upload.array('files', 3), (req, res) => {
  try {
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Não encontrado' });
    if (req.session.userRole !== 'admin' && ticket.user_id !== req.session.userId)
      return res.status(403).json({ error: 'Acesso negado' });

    if (ticket.status === 'resolvido')
      return res.status(403).json({ error: 'Chamado resolvido. Não é possível enviar mensagens.' });

    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Mensagem obrigatória' });

    const info = db.prepare('INSERT INTO ticket_messages (ticket_id, user_id, message) VALUES (?,?,?)').run(ticket.id, req.session.userId, message.trim());
    const msgId = info.lastInsertRowid;

    if (req.files?.length) {
      const attStmt = db.prepare('INSERT INTO ticket_attachments (ticket_id, message_id, filename, original_name, mimetype, size) VALUES (?,?,?,?,?,?)');
      req.files.forEach(f => attStmt.run(ticket.id, msgId, f.filename, f.originalname, f.mimetype, f.size));
    }

    db.prepare(`UPDATE tickets SET updated_at = datetime('now','localtime') WHERE id = ?`).run(ticket.id);

    const newMsg = db.prepare(`SELECT m.*, u.name as user_name, u.avatar, u.color, u.role FROM ticket_messages m JOIN users u ON m.user_id = u.id WHERE m.id = ?`).get(msgId);

    // Notifica os outros participantes do chamado
    const sender = req.session.userId;
    const notifStmt = db.prepare('INSERT INTO notifications (user_id, title, description, ticket_id) VALUES (?,?,?,?)');
    const titulo = `💬 Nova mensagem — ${ticket.code}`;
    const remetente = db.prepare('SELECT username FROM users WHERE id = ?').get(sender);
    const descricao = `${remetente.username} enviou uma mensagem no chamado.`;

    // Se quem enviou é admin, notifica o dono do chamado
    if (req.session.userRole === 'admin') {
      if (ticket.user_id !== sender) {
        notifStmt.run(ticket.user_id, titulo, descricao, ticket.id);
      }
    } else {
      // Se quem enviou é usuário, notifica todos os admins
      const admins = db.prepare("SELECT id FROM users WHERE role = 'admin' AND active = 1").all();
      admins.forEach(a => {
        if (a.id !== sender) notifStmt.run(a.id, titulo, descricao, ticket.id);
      });
    }

    res.json(newMsg);
  } catch (e) {
    console.error('Erro em POST /api/tickets/:id/messages:', e.message);
    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
});

// ── Notifications ─────────────────────────────────────────────────────────────
app.get('/api/notifications', requireAuth, (req, res) => {
  try {
    const notifs = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 30').all(req.session.userId);
    res.json(notifs);
  } catch (e) {
    console.error('Erro em GET /api/notifications:', e.message);
    res.status(500).json({ error: 'Erro ao buscar notificações' });
  }
});

app.put('/api/notifications/read-all', requireAuth, (req, res) => {
  try {
    db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.session.userId);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.put('/api/notifications/:id/read', requireAuth, (req, res) => {
  try {
    db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.session.userId);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ── Users (Admin) ─────────────────────────────────────────────────────────────
app.get('/api/users', requireAdmin, (req, res) => {
  try {
    const users = db.prepare('SELECT id, name, username, email, role, department, avatar, color, active, created_at FROM users ORDER BY id').all();
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

app.post('/api/users', requireAdmin, (req, res) => {
  const { name, username, email, password, role, department } = req.body;
  if (!name || !username || !password) return res.status(400).json({ error: 'Campos obrigatórios: nome, usuário, senha' });
  const avatar = name.split(' ').slice(0, 2).map(w => w[0].toUpperCase()).join('');
  const colors = ['#1a56db', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#db2777'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  try {
    const hash = bcrypt.hashSync(password, 10);
    const info = db.prepare('INSERT INTO users (name, username, email, password, role, department, avatar, color) VALUES (?,?,?,?,?,?,?,?)').run(name, username, email, hash, role || 'user', department, avatar, color);
    res.json({ id: info.lastInsertRowid, name, username, email, role, department, avatar, color, active: 1 });
  } catch (e) {
    res.status(400).json({ error: 'Usuário ou e-mail já cadastrado' });
  }
});

app.put('/api/users/:id', requireAdmin, (req, res) => {
  try {
    const { name, username, email, role, department, active } = req.body;
    const avatar = name.split(' ').slice(0, 2).map(w => w[0].toUpperCase()).join('');
    db.prepare('UPDATE users SET name=?, username=?, email=?, role=?, department=?, active=?, avatar=? WHERE id=?').run(name, username, email, role, department, active ? 1 : 0, avatar, req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

app.put('/api/users/:id/password', requireAdmin, (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ error: 'Senha muito curta (mínimo 6 caracteres)' });
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao atualizar senha' });
  }
});

// ── Stats ─────────────────────────────────────────────────────────────────────
// CORRIGIDO: substituído interpolação direta de uid por parâmetro ? para evitar SQL injection
app.get('/api/stats', requireAuth, (req, res) => {
  try {
    const isAdmin = req.session.userRole === 'admin';
    const uid = req.session.userId;

    const baseWhere = isAdmin ? '' : 'AND t.user_id = ?';
    const baseParams = isAdmin ? [] : [uid];

    const count = (extraWhere, extraParams = []) => {
      const sql = `SELECT COUNT(*) as c FROM tickets t WHERE 1=1 ${baseWhere} ${extraWhere}`;
      return db.prepare(sql).get(...baseParams, ...extraParams).c;
    };

    const stats = {
      total: count(''),
      aberto: count("AND t.status = 'aberto'"),
      andamento: count("AND t.status = 'andamento'"),
      resolvido: count("AND t.status = 'resolvido'"),
    };

    if (isAdmin) {
      stats.by_category = db.prepare(`SELECT category, COUNT(*) as total FROM tickets GROUP BY category ORDER BY total DESC`).all();
      stats.by_priority = db.prepare(`SELECT priority, COUNT(*) as total FROM tickets GROUP BY priority`).all();
    }

    res.json(stats);
  } catch (e) {
    console.error('Erro em GET /api/stats:', e.message);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// Fecha o banco corretamente ao encerrar o servidor
process.on('SIGINT', () => { db.close(); process.exit(0); });
process.on('SIGTERM', () => { db.close(); process.exit(0); });


// // HTTPS
https.createServer({
  key: fs.readFileSync(path.join(__dirname, '..', 'localhost-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '..', 'localhost.pem')),
}, app).listen(PORT, () => console.log(`TI Desk rodando em https://localhost:${PORT}`));


// HTTP
// app.listen(PORT, () => console.log(`TI Desk rodando em http://localhost:${PORT}`));