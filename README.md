# Syschamados UMS

Sistema de chamados de TI desenvolvido para gerenciamento de solicitações internas. Interface web responsiva, sem dependências de banco externo — tudo roda localmente com Node.js e SQLite.

**Desenvolvido por Bruno Collange**

---

## Sumário

- [Requisitos](#requisitos)
- [Instalação](#instalação)
- [Iniciando o sistema](#iniciando-o-sistema)
- [Acesso padrão](#acesso-padrão)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Funcionalidades](#funcionalidades)
- [Perfis de usuário](#perfis-de-usuário)
- [API — Rotas disponíveis](#api--rotas-disponíveis)
- [Configurações técnicas](#configurações-técnicas)

---

## Requisitos

- **Node.js** v18 ou superior — [nodejs.org](https://nodejs.org)
- **npm** (incluído no Node.js)
- Sistema operacional: Windows, Linux ou macOS

---

## Instalação

### 1. Clone ou copie o projeto

```bash
git clone <url-do-repositorio>
cd ti-desk
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Certificado HTTPS (somente Windows — já incluso no projeto)

O projeto já vem com os arquivos `localhost.pem` e `localhost-key.pem` prontos para uso.  
Para que o navegador confie no certificado sem avisos, instale o `rootCA.crt` como autoridade confiável:

1. Dê duplo clique em `rootCA.crt`
2. Clique em **Instalar Certificado**
3. Selecione **Computador Local** → **Autoridades de Certificação Raiz Confiáveis**
4. Confirme e finalize

> Para gerar novos certificados (caso necessário), use o `mkcert.exe` incluído:
> ```
> mkcert.exe -key-file localhost-key.pem -cert-file localhost.pem localhost 127.0.0.1
> ```

### 4. (Opcional) Modo HTTP sem HTTPS

Para usar sem certificado, edite `backend/server.js` e substitua o bloco final:

```js
// Comente o bloco HTTPS:
// https.createServer({ ... }).listen(...)

// Descomente o bloco HTTP:
app.listen(PORT, () => console.log(`TI Desk rodando em http://localhost:${PORT}`));
```

---

## Iniciando o sistema

### Opção A — Script automático (Windows)

Execute o arquivo `Run_ti-desk.bat` como **Administrador**. Ele inicia o servidor e abre o navegador automaticamente em `https://localhost:3000`.

### Opção B — Terminal

```bash
# Produção
npm start

# Desenvolvimento (com hot-reload via nodemon)
npm run dev
```

Acesse: **https://localhost:3000**

> O banco de dados `tidesk.db` e a pasta `uploads/` são criados automaticamente na primeira execução.

---

## Acesso padrão

| Campo   | Valor      |
|---------|------------|
| Usuário | `admin`    |
| Senha   | `admin123` |
| Perfil  | Administrador TI |

> Altere a senha do admin após o primeiro acesso em **Usuários → Redefinir Senha**.

---

## Estrutura do projeto

```
ti-desk/
├── backend/
│   └── server.js          # API REST + servidor Express
├── frontend/
│   └── public/
│       ├── index.html     # SPA — estrutura base
│       ├── css/
│       │   └── style.css  # Estilos globais
│       └── js/
│           ├── api.js     # Helper de requisições HTTP
│           ├── app.js     # Roteamento, autenticação, notificações
│           └── pages/
│               ├── dashboard.js     # Tela inicial com estatísticas
│               ├── tickets.js       # Meus Chamados / Todos os Chamados
│               ├── ticket-detail.js # Detalhe e chat do chamado
│               ├── new-ticket.js    # Abertura de novo chamado
│               ├── users.js         # Gestão de usuários (admin)
│               └── history.js       # Histórico de chamados resolvidos
├── uploads/               # Imagens e arquivos anexados (criado automaticamente)
├── tidesk.db              # Banco SQLite (criado automaticamente)
├── package.json
├── localhost.pem          # Certificado SSL
├── localhost-key.pem      # Chave privada SSL
├── rootCA.crt             # Autoridade certificadora raiz
├── mkcert.exe             # Ferramenta de geração de certificados (Windows)
└── Run_ti-desk.bat        # Inicializador rápido para Windows
```

---

## Funcionalidades

### Autenticação

- Login com usuário e senha
- Sessão com duração de **8 horas**
- Logout com encerramento de sessão no servidor
- Verificação automática de sessão ativa ao carregar a página
- Senha armazenada com hash **bcrypt**

---

### Dashboard

- Contadores em tempo real: **Total**, **Abertos**, **Em Andamento** e **Resolvidos**
- Tabela com os **6 chamados mais recentes**, com linhas clicáveis
- Breakdown de chamados **por categoria** (somente admin)
- Atualização automática a cada **10 segundos**

---

### Meus Chamados

- Lista todos os chamados abertos pelo usuário logado (qualquer perfil)
- **Busca** por título, ID ou descrição
- **Filtro de status**: Aberto, Em Andamento, Resolvido, Todos os Status
- **Paginação** com 10 chamados por página
- Linhas clicáveis para acessar o detalhe
- Atualização automática a cada **15 segundos**

---

### Todos os Chamados *(somente admin)*

- Lista todos os chamados de todos os usuários
- Abre por padrão com filtro **"Aberto"** para priorizar atendimento
- Ordenação por prioridade de status: **Aberto → Em Andamento → Resolvido**
- Mesmos recursos de busca, filtro e paginação da tela "Meus Chamados"
- Atualização automática a cada **15 segundos**

---

### Abrir Novo Chamado

Formulário com os seguintes campos:

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| Nome do Colaborador | Sim | Nome de quem está solicitando o atendimento |
| Título do Chamado | Sim | Resumo do problema |
| Categoria | Sim | Sistema Salutem, Impressora, Requisição, Sistemas Diversos, Treinamento, E-mail, Rede/Internet, Hardware, Telefonia, Outros |
| Prioridade | Sim | Baixa, Média (padrão), Alta |
| Localização / Sala | Sim | Local onde está o equipamento ou colaborador |
| Descrição Detalhada | Sim | Detalhamento completo do problema |
| Imagens / Capturas | Não | Até **5 imagens** (PNG, JPG, GIF, WebP) por drag-and-drop ou clique |

- Código gerado automaticamente no formato `#ANO-XXXX` (ex: `#2026-0001`)
- Notificação automática enviada a todos os administradores ao abrir o chamado

---

### Detalhe do Chamado

- Exibe todas as informações: código, título, colaborador, status, prioridade, categoria, localização, solicitante, datas
- **Anexos** com preview de imagens clicável para ampliar
- Botão **Imprimir** para impressão da página
- Botão **Voltar** que retorna à tela de origem corretamente

#### Chat de Atendimento

- Troca de mensagens em tempo real entre usuário e TI
- Polling automático a cada **5 segundos** para novas mensagens
- Suporte a **anexo de imagens** nas mensagens (até 3 por envio)
- Chat encerrado automaticamente quando o status muda para **Resolvido**
- Identificação visual de mensagens do usuário e da TI

#### Alteração de Status *(somente admin)*

- Botões para alterar para: **Aberto**, **Em Andamento**, **Resolvido**
- Confirmação via modal antes de aplicar a alteração
- Ao resolver, o chamado é fechado e uma notificação é enviada ao solicitante

---

### Histórico de Chamados

- Exibe todos os chamados com status **Resolvido**
- **Filtro por mês** com abas de seleção rápida
- Admin vê o histórico de todos os usuários; usuário vê apenas o seu
- Linhas clicáveis para revisar o detalhe de chamados anteriores

---

### Notificações

- Sino de notificações na barra superior com **badge** de não lidas
- Painel com lista das últimas **30 notificações**
- Atualização automática a cada **10 segundos**
- **Notificação do navegador** (push) ao receber novas atualizações
- Ao clicar em uma notificação, o chamado correspondente é aberto e a notificação marcada como lida
- **Marcação automática como lida** ao abrir o chamado por qualquer caminho
- Botão **"Marcar lidas"** para limpar todas de uma vez

Eventos que geram notificações:

| Evento | Destinatário |
|--------|-------------|
| Novo chamado aberto | Todos os admins |
| Nova mensagem no chat | Todos os outros participantes do chamado |
| Chamado marcado como resolvido | Solicitante do chamado |

---

### Gestão de Usuários *(somente admin)*

- Grid com todos os usuários cadastrados
- **Busca** por nome, usuário ou departamento
- **Criar usuário**: nome, usuário de login, departamento, perfil, senha
- **Editar usuário**: nome, usuário, departamento, perfil, status (ativo/inativo)
- **Ativar / Desativar** usuário diretamente pelo card
- **Redefinir senha** com campo de confirmação
- Avatar gerado automaticamente pelas iniciais do nome
- Usuários inativos não conseguem fazer login

---

## Perfis de usuário

| Recurso | Usuário | Admin |
|---------|:-------:|:-----:|
| Ver os próprios chamados | Sim | Sim |
| Abrir novo chamado | Sim | Sim |
| Ver todos os chamados | Não | Sim |
| Alterar status de chamados | Não | Sim |
| Histórico de chamados | Próprios | Todos |
| Dashboard com estatísticas | Próprias | Completas |
| Gestão de usuários | Não | Sim |
| Imprimir listagem | Não | Sim |

---

## API — Rotas disponíveis

### Autenticação

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Retorna usuário da sessão atual |

### Chamados

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/tickets` | Usuário | Lista chamados (admin vê todos; usuário vê os seus) |
| POST | `/api/tickets` | Usuário | Abre novo chamado (`multipart/form-data`) |
| GET | `/api/tickets/months` | Usuário | Meses com chamados (para filtro de histórico) |
| GET | `/api/tickets/history` | Usuário | Chamados resolvidos com filtro por mês |
| GET | `/api/tickets/:id` | Usuário | Detalhe com mensagens e anexos |
| PUT | `/api/tickets/:id/status` | Admin | Altera status do chamado |
| PUT | `/api/tickets/:id/assign` | Admin | Atribui responsável ao chamado |
| POST | `/api/tickets/:id/messages` | Usuário | Envia mensagem no chat |

### Notificações

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/notifications` | Usuário | Lista as últimas 30 notificações |
| PUT | `/api/notifications/read-all` | Usuário | Marca todas como lidas |
| PUT | `/api/notifications/:id/read` | Usuário | Marca uma notificação como lida |

### Usuários

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/users` | Admin | Lista todos os usuários |
| POST | `/api/users` | Admin | Cria novo usuário |
| PUT | `/api/users/:id` | Admin | Edita dados do usuário |
| PUT | `/api/users/:id/password` | Admin | Redefine senha do usuário |

### Estatísticas

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/stats` | Usuário | Contadores por status (e por categoria para admin) |

---

## Configurações técnicas

| Parâmetro | Valor |
|-----------|-------|
| Porta | `3000` |
| Protocolo | HTTPS (HTTP disponível via configuração) |
| Banco de dados | SQLite (`tidesk.db`) |
| Duração da sessão | 8 horas |
| Tamanho máximo de upload | 10 MB por arquivo |
| Tipos de arquivo aceitos | JPEG, JPG, PNG, GIF, WebP, PDF |
| Arquivos por chamado (abertura) | até 5 |
| Arquivos por mensagem (chat) | até 3 |
| Polling de chat | a cada 5 segundos |
| Polling de notificações | a cada 10 segundos |
| Polling de listagem de chamados | a cada 15 segundos |
| Polling do dashboard | a cada 10 segundos |
