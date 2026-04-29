# 📚 Biblioteca CETEP — Sistema de Gestão

Sistema de biblioteca escolar com frontend HTML/CSS/JS e backend Node.js + MySQL.

---

## 📁 Estrutura do Projeto

```
biblioteca-cetep/
├── banco.sql                   ← Script completo do banco MySQL
├── backend/
│   ├── .env.example            ← Copie para .env e configure
│   ├── package.json
│   ├── server.js               ← Entrada do servidor
│   ├── config/
│   │   └── db.js               ← Pool de conexões MySQL
│   ├── middleware/
│   │   └── security.js         ← Rate limiting, sanitização, error handler
│   └── routes/
│       ├── livros.js           ← GET/POST/PUT /api/livros
│       ├── alunos.js           ← GET/POST/PUT /api/alunos
│       ├── emprestimos.js      ← GET/POST/PUT /api/emprestimos
│       └── dashboard.js        ← GET /api/dashboard/stats|busca|atrasos
└── frontApp/
    ├── js/
    │   ├── api.js              ← Utilitário fetch compartilhado
    │   ├── aluno.js
    │   ├── livros.js
    │   ├── emprestimo.js
    │   ├── atraso.js
    │   └── dashboard.js
    ├── css/                    ← Estilos originais (não alterados)
    └── view/                   ← Páginas HTML (com api.js injetado)
```

---

## ⚙️ Passo a Passo para Rodar

### 1. Banco de Dados MySQL

```bash
# Acesse o MySQL como root
mysql -u root -p

# Execute o script completo
SOURCE /caminho/para/banco.sql;
```

> O script cria o banco, tabelas, views, procedure, evento agendado e o usuário da aplicação.

**⚠️ Importante:** No arquivo `banco.sql`, troque a senha do usuário `biblioteca_app`:
```sql
IDENTIFIED BY 'SenhaForte#2026'  →  IDENTIFIED BY 'SuaSenhaReal'
```

Para o evento automático funcionar, ative o agendador no MySQL:
```sql
SET GLOBAL event_scheduler = ON;
```
Ou adicione ao `my.cnf`:
```
[mysqld]
event_scheduler=ON
```

---

### 2. Backend Node.js

```bash
cd backend

# Instale as dependências
npm install

# Configure o ambiente
cp .env.example .env
# Edite o .env com suas credenciais reais

# Inicie o servidor
npm start         # produção
npm run dev       # desenvolvimento (nodemon)
```

O servidor sobe em `http://localhost:3001`.

---

### 3. Frontend

Abra as páginas com um servidor HTTP simples (não funciona direto como `file://` por causa do CORS):

```bash
# Opção 1 — VS Code: instale "Live Server" e clique em "Go Live"

# Opção 2 — Python (na pasta frontApp)
cd frontApp
python3 -m http.server 5500

# Opção 3 — Node
npx serve frontApp -l 5500
```

Acesse: `http://localhost:5500/view/dashboard.html`

---

## 🔒 Segurança Implementada

| Camada | O que protege |
|---|---|
| **Usuário MySQL separado** | A aplicação nunca usa root; só tem permissão de SELECT/INSERT/UPDATE nas tabelas necessárias |
| **Prepared Statements** | Previne 100% de SQL Injection — nenhuma query monta strings com dados do usuário |
| **Helmet.js** | Define headers HTTP seguros (CSP, HSTS, X-Frame-Options, etc.) |
| **CORS restrito** | Só aceita requisições da origem configurada em `CORS_ORIGIN` |
| **Rate Limiting** | 200 req/15min por IP — impede abuso mesmo em rede local |
| **express-validator** | Valida e rejeita dados inválidos antes de chegar no banco |
| **Sanitização de inputs** | Remove caracteres `< > " ' % ; ( ) & +` de body/query/params |
| **Payload limit** | Body JSON limitado a 50kb — impede ataques de payload gigante |
| **Error handler global** | Nunca retorna stack traces para o cliente |
| **Transações MySQL** | Operações de empréstimo/devolução são atômicas (rollback em caso de erro) |

---

## 🌐 Endpoints da API

### Livros
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/livros` | Lista todos (suporta `?busca=`) |
| GET | `/api/livros/disponiveis` | Só os disponíveis (para selects) |
| GET | `/api/livros/:id` | Detalhe de um livro |
| GET | `/api/livros/categorias/lista` | Lista categorias |
| POST | `/api/livros` | Cadastra novo livro |
| PUT | `/api/livros/:id` | Edita livro |

### Alunos
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/alunos` | Lista todos (suporta `?busca=`) |
| GET | `/api/alunos/lista` | Lista simplificada para selects |
| GET | `/api/alunos/:id` | Detalhe + histórico de empréstimos |
| POST | `/api/alunos` | Cadastra aluno |
| PUT | `/api/alunos/:id` | Edita aluno |

### Empréstimos
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/emprestimos` | Lista (suporta `?status=` e `?busca=`) |
| GET | `/api/emprestimos/stats` | Contadores por status |
| POST | `/api/emprestimos` | Registra novo empréstimo |
| PUT | `/api/emprestimos/:id/devolver` | Registra devolução |
| PUT | `/api/emprestimos/:id/notificar` | Marca como notificado |
| PUT | `/api/emprestimos/notificar-todos/atrasos` | Notifica todos os atrasados |

### Dashboard
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/dashboard/stats` | Totais de livros, alunos e empréstimos |
| GET | `/api/dashboard/busca?q=` | Busca global (livros + alunos) |
| GET | `/api/dashboard/atrasos` | Lista empréstimos em atraso |

---

## 📋 Dependências do Backend

```
express            → Servidor HTTP
mysql2             → Driver MySQL com suporte a Promises
dotenv             → Variáveis de ambiente (.env)
helmet             → Headers de segurança HTTP
cors               → Controle de origem das requisições
express-rate-limit → Limite de requisições por IP
express-validator  → Validação de dados de entrada
```
