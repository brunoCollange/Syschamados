# Syschamados UMS — Sistema de Chamados de TI

Sistema de chamados profissional para suporte de TI, desenvolvido por Bruno Collange.

---

## Funcionalidades

- Login por **usuário + senha** com perfis Admin (TI) e Usuário
- Login **case-insensitive** — maiúsculas e minúsculas são tratadas como iguais
- Salvamento de senha pelo navegador (Chrome/Edge) via formulário HTML nativo
- Dashboard com estatísticas em tempo real (atualização automática a cada 10s)
- Abertura de chamados com upload de imagens (até 5 arquivos, 10MB cada)
- Chat de atendimento por chamado com atualização em tempo real (polling a cada 5s)
- Chamados resolvidos bloqueiam novas mensagens no chat
- Confirmação visual antes de alterar o status de um chamado
- Notificações internas no sistema (painel de notificações)
- Notificações nativas do navegador/Windows (Web Notifications API)
- Notificação automática a todos os admins quando chamado é aberto
- Notificação automática ao usuário quando chamado é resolvido
- Filtro de chamados por status e busca por título, ID ou descrição
- Suporte a múltiplos status simultâneos no filtro via API
- Gestão completa de usuários: criar, editar, ativar/desativar, redefinir senha
- Validação de duplicidade de nome e usuário ao criar/editar
- Avatar calculado automaticamente a partir do nome do usuário
- Lista de chamados com atualização automática a cada 15s
- Histórico de chamados resolvidos com filtro por mês
- Impressão de chamados e histórico (apenas administradores na lista)
- Datas e horários exibidos no formato brasileiro (dd/mm/aaaa • hh:mm)
- Interface responsiva com suporte para mobile (menu hambúrguer)
- Banco de dados SQLite local (sem configuração extra)
- HTTPS com certificado local via mkcert
- Sessão de login com duração de 8 horas
- Atribuição de responsável TI por chamado (admin)

---

## Pré-requisitos

### Windows
- **Node.js** v20 ou superior → https://nodejs.org
- **mkcert** → https://github.com/FiloSottile/mkcert/releases/latest
- **Visual Studio Build Tools** com workload "Desktop development with C++"

### Linux (Ubuntu Server)
- **Node.js** v20 ou superior
- **mkcert**
- **build-essential** (para compilar o better-sqlite3)

---

## Instalação — Windows

### 1. Instale o Node.js

Baixe e instale o Node.js v20+ em https://nodejs.org. Marque a opção de instalar as ferramentas de build (Build Tools) durante a instalação.

### 2. Instale as dependências do projeto

```cmd
cd C:\ti-desk
npm install
```

### 3. Configure o HTTPS com mkcert

Baixe o `mkcert-v*-windows-amd64.exe`, renomeie para `mkcert.exe` e coloque na pasta `C:\ti-desk`.

No CMD como **Administrador**:

```cmd
cd C:\ti-desk
mkcert -install
mkcert localhost 127.0.0.1 SEU_IP_LOCAL
```

> Substitua `SEU_IP_LOCAL` pelo IP da máquina (ex: `192.168.1.100`).

Isso vai gerar dois arquivos:
- `localhost+2.pem` — certificado
- `localhost+2-key.pem` — chave privada

Verifique no `backend/server.js` se os nomes dos arquivos batem com o que foi gerado:

```js
const cert = fs.readFileSync('./localhost+2.pem');
const key  = fs.readFileSync('./localhost+2-key.pem');
```

### 4. Inicie o servidor

```cmd
npm start
```

### 5. Acesse no navegador

```
https://localhost:3000
https://SEU_IP_LOCAL:3000
```

### 6. Inicialização automática com .bat

Crie um arquivo `Run_ti-desk.bat` na pasta do projeto:

```bat
@echo off
net session >nul 2>&1
if %errorLevel% == 0 (
    cd C:\ti-desk
    echo Iniciando Syschamados...
    npm start
    start https://localhost:3000/
) else (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit
)
```

Execute sempre como **Administrador**.

### 7. Inicialização automática com PM2 (opcional, para rodar em background)

```cmd
npm install -g pm2
pm2 start backend/server.js --name syschamados
pm2 startup
pm2 save
```

---

## Instalação — Linux Ubuntu Server

### 1. Atualize o sistema

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Instale o Node.js v20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verifique:

```bash
node -v
npm -v
```

### 3. Instale as ferramentas de build

```bash
sudo apt install -y build-essential
```

### 4. Copie os arquivos do projeto para o servidor

Sugestão de destino:

```bash
sudo mkdir -p /var/www/ti-desk
sudo chown $USER:$USER /var/www/ti-desk
```

Copie os arquivos via SCP a partir do Windows:

```powershell
scp -r C:\ti-desk\* usuario@SEU_IP:/var/www/ti-desk/
```

### 5. Instale as dependências do projeto

```bash
cd /var/www/ti-desk
npm install
```

### 6. Configure o HTTPS com mkcert

```bash
# Instale o mkcert
sudo apt install -y wget
wget https://github.com/FiloSottile/mkcert/releases/latest/download/mkcert-v1.4.4-linux-amd64 -O mkcert
chmod +x mkcert
sudo mv mkcert /usr/local/bin/

# Instale a CA local
mkcert -install

# Gere o certificado para o IP do servidor
cd /var/www/ti-desk
mkcert localhost 127.0.0.1 SEU_IP_LOCAL
```

> Substitua `SEU_IP_LOCAL` pelo IP da VM (ex: `172.16.0.110`).

Verifique os nomes dos arquivos gerados e confirme no `backend/server.js`:

```js
const cert = fs.readFileSync('./localhost+2.pem');
const key  = fs.readFileSync('./localhost+2-key.pem');
```

### 7. Ajuste as permissões

```bash
sudo chown -R $USER:$USER /var/www/ti-desk
sudo chmod 775 /var/www/ti-desk
```

### 8. Instale o PM2 e inicie o servidor

```bash
sudo npm install -g pm2
cd /var/www/ti-desk
pm2 start backend/server.js --name syschamados
```

### 9. Configure o PM2 para iniciar com o sistema

```bash
pm2 startup
# Execute o comando que o PM2 exibir (começa com sudo env ...)
pm2 save
```

### 10. Acesse no navegador

```
https://SEU_IP_LOCAL:3000
```

### 11. Comandos úteis do PM2

```bash
pm2 status              # Ver status dos processos
pm2 logs syschamados    # Ver logs em tempo real
pm2 restart syschamados # Reiniciar o servidor
pm2 stop syschamados    # Parar o servidor
pm2 delete syschamados  # Remover o processo do PM2
```

---

## Distribuição do certificado para os clientes Windows

Para que o Chrome reconheça o certificado como confiável (necessário para notificações e salvamento de senhas), instale o certificado CA do mkcert em cada máquina que acessar o sistema.

### Exportar o certificado CA do servidor Linux

```bash
# Descubra onde está o CA
mkcert -CAROOT

# Copie para um local acessível (ex: pasta pública do sistema)
cp $(mkcert -CAROOT)/rootCA.pem /var/www/ti-desk/frontend/public/rootCA.crt
```

### Baixar no Windows via SCP

```powershell
scp usuario@SEU_IP:/var/www/ti-desk/frontend/public/rootCA.crt C:\Users\SeuUsuario\Desktop\rootCA.crt
```

### Instalar via script automático

Crie um `instalar-certificado.bat` e distribua via rede (pasta compartilhada Samba, pendrive, etc.):

```bat
@echo off
PowerShell -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'http://SEU_IP:3000/rootCA.crt' -OutFile '$env:TEMP\rootCA.crt'; Import-Certificate -FilePath '$env:TEMP\rootCA.crt' -CertStoreLocation Cert:\LocalMachine\Root"
echo Certificado instalado com sucesso!
pause
```

Execute como **Administrador**. Após instalar, reinicie o Chrome.

---

## Conta padrão

| Perfil | Usuário | Senha |
|---|---|---|
| Administrador TI | admin | admin123 |

> Troque a senha após o primeiro acesso pelo painel de Usuários.

---

## Estrutura do Projeto

```
ti-desk/
├── backend/
│   └── server.js               # Servidor Express + SQLite + HTTPS
├── frontend/
│   └── public/
│       ├── index.html          # SPA principal
│       ├── favicon.ico
│       ├── logoWhite.png       # Logo para o sistema
│       ├── logoWhitebgblack.png # Logo para notificações do navegador
│       ├── css/
│       │   └── style.css       # Estilos completos + responsivo
│       └── js/
│           ├── api.js          # Cliente HTTP
│           ├── app.js          # Roteador + auth + notificações + helpers
│           └── pages/
│               ├── dashboard.js      # Dashboard com polling
│               ├── tickets.js        # Lista de chamados com polling
│               ├── ticket-detail.js  # Detalhe + chat em tempo real
│               ├── new-ticket.js     # Formulário de abertura
│               ├── users.js          # Gestão de usuários
│               └── history.js        # Histórico de chamados resolvidos
├── uploads/                    # Imagens enviadas (criado automaticamente)
├── tidesk.db                   # Banco de dados SQLite (criado automaticamente)
├── localhost+2.pem             # Certificado HTTPS (gerado pelo mkcert)
├── localhost+2-key.pem         # Chave privada HTTPS (gerada pelo mkcert)
└── package.json
```

---

## Banco de Dados

O banco `tidesk.db` é criado automaticamente na raiz do projeto na primeira execução.

### Tabelas

| Tabela | Descrição |
|---|---|
| `users` | Usuários do sistema (id, name, username, password, role, department, avatar, color, active) |
| `tickets` | Chamados (code, title, description, category, priority, status, location, user_id, assigned_to) |
| `ticket_messages` | Mensagens do chat por chamado |
| `ticket_attachments` | Arquivos/imagens anexados a chamados e mensagens |
| `notifications` | Notificações por usuário |

### Zerar todos os chamados (manter usuários)

**Pare o servidor antes!**

```bash
pm2 stop syschamados

sqlite3 /var/www/ti-desk/tidesk.db
```

```sql
DELETE FROM ticket_messages;
DELETE FROM ticket_attachments;
DELETE FROM notifications;
DELETE FROM tickets;
DELETE FROM sqlite_sequence WHERE name IN ('tickets','ticket_messages','ticket_attachments','notifications');
.quit
```

```bash
pm2 start syschamados
```

> No Windows, use o **DB Browser for SQLite** → https://sqlitebrowser.org

---

## API — Rotas disponíveis

### Autenticação
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/login` | Login com username + password |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Retorna usuário logado |

### Chamados
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/tickets` | Lista chamados (filtros: status, month, search) |
| GET | `/api/tickets/months` | Meses com chamados (para filtro) |
| GET | `/api/tickets/history` | Chamados resolvidos (filtro por mês) |
| GET | `/api/tickets/:id` | Detalhe de um chamado com mensagens e anexos |
| POST | `/api/tickets` | Criar chamado (multipart, até 5 imagens) |
| PUT | `/api/tickets/:id/status` | Alterar status: aberto, andamento, resolvido (admin) |
| PUT | `/api/tickets/:id/assign` | Atribuir responsável TI (admin) |

### Mensagens
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/tickets/:id/messages` | Enviar mensagem no chat (até 3 imagens) |

### Notificações
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/notifications` | Lista notificações do usuário (últimas 30) |
| PUT | `/api/notifications/:id/read` | Marca notificação como lida |
| PUT | `/api/notifications/read-all` | Marca todas como lidas |

### Usuários (somente admin)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/users` | Lista todos os usuários |
| POST | `/api/users` | Criar novo usuário |
| PUT | `/api/users/:id` | Editar usuário (atualiza avatar automaticamente) |
| PUT | `/api/users/:id/password` | Redefinir senha |

### Estatísticas
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/stats` | Totais por status + por categoria (admin vê tudo, usuário vê os próprios) |

---

## Categorias de Chamado

- Sistema Salutem
- Impressora
- Requisição
- Sistemas Diversos
- Treinamento
- E-mail
- Rede / Internet
- Hardware
- Telefonia
- Outros

---

## Configurações

### Alterar a porta

No topo do `backend/server.js`:

```js
const PORT = 3000;
```

### Alterar intervalos de atualização automática

| Arquivo | Trecho | Padrão | Descrição |
|---|---|---|---|
| `app.js` | `setInterval(loadNotifications, 10000)` | 10s | Polling de notificações |
| `dashboard.js` | `setInterval(..., 10000)` | 10s | Atualização do dashboard |
| `tickets.js` | `setInterval(..., 15000)` | 15s | Atualização da lista de chamados |
| `ticket-detail.js` | `setInterval(..., 5000)` | 5s | Polling do chat |

---

## Dependências

| Pacote | Versão | Uso |
|---|---|---|
| `express` | ^4.18 | Servidor web |
| `express-session` | ^1.18 | Sessões de login (duração: 8h) |
| `bcryptjs` | ^2.4 | Criptografia de senhas |
| `better-sqlite3` | ^9.4 | Banco de dados SQLite |
| `multer` | ^1.4 | Upload de arquivos |
| `https` | nativo Node.js | Servidor HTTPS |

---

## Modo desenvolvimento (com auto-reload)

```bash
npm run dev
```

> Requer `nodemon` instalado (já está nas devDependencies).

---

## Observações importantes

- Sempre pare o servidor antes de editar o banco diretamente (`pm2 stop syschamados`)
- O campo `username` é case-insensitive no login (LOWER() aplicado no SQLite)
- Chamados com status **Resolvido** não aceitam novas mensagens no chat
- O avatar do usuário é recalculado automaticamente ao salvar alterações no nome
- O botão **Imprimir** na lista de chamados aparece apenas para administradores
- Notificações nativas do Windows requerem HTTPS com certificado confiável instalado
- A sessão expira após 8 horas de inatividade — o usuário é redirecionado ao login
- Ao criar ou editar usuários, nome e username são validados contra duplicatas antes de salvar
