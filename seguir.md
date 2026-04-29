# Deploy — Biblioteca CETEP

Stack gratuita: **Supabase** (PostgreSQL) + **Render** (Node.js) + **Vercel** (frontend estático)

---

## Passo 1 — Banco de Dados (Supabase)

1. Crie conta em supabase.com → **New project**
2. Dê um nome, escolha a região mais próxima (ex: South America) e anote a senha
3. Menu lateral → **SQL Editor** → Cole TODO o conteúdo de `banco_postgres.sql` e clique **Run**
4. Copie a connection string:
   - Menu lateral → **Settings → Database**
   - Seção **Connection string** → aba **URI**
   - Formato: `postgresql://postgres:[SENHA]@db.[ID].supabase.co:5432/postgres`
5. (Opcional) Atualização automática de status todo dia à meia-noite:
   - **Database → Extensions** → ative `pg_cron`
   - **SQL Editor** execute:
     ```sql
     SELECT cron.schedule('status-diario', '0 0 * * *', 'SELECT atualizar_status_emprestimos()');
     ```

---

## Passo 2 — Backend (Render)

1. Faça push do projeto para o GitHub (ou GitLab)
2. Crie conta em render.com → **New → Web Service**
3. Conecte o repositório e configure:

   | Campo | Valor |
   |-------|-------|
   | Root Directory | `backend` |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Instance Type | **Free** |

4. Aba **Environment** → adicione as variáveis:

   | Variável | Valor |
   |----------|-------|
   | `DB_URL` | A connection string copiada do Supabase |
   | `PORT` | `3001` |
   | `CORS_ORIGIN` | (deixe em branco por enquanto — preencha após o Passo 3) |

5. Clique **Deploy** → aguarde o log mostrar `Servidor rodando`
6. Copie a URL do serviço (ex: `https://biblioteca-cetep-abc.onrender.com`)

---

## Passo 3 — Frontend (Vercel)

Antes de subir, abra [frontApp/js/api.js](frontApp/js/api.js) e substitua na linha do BASE:

```js
: 'https://SEU-BACKEND.onrender.com/api'
```

pela URL real do Render (ex: `https://biblioteca-cetep-abc.onrender.com/api`)

1. Crie conta em vercel.com → **Add New → Project**
2. Importe o repositório e configure:

   | Campo | Valor |
   |-------|-------|
   | Root Directory | `frontApp` |
   | Framework Preset | **Other** |
   | Build Command | *(deixe vazio)* |
   | Output Directory | `.` |

3. Clique **Deploy**
4. Copie a URL (ex: `https://biblioteca-cetep.vercel.app`)

---

## Passo 4 — Fechar o CORS

Volte ao Render → **Environment** → atualize:

```
CORS_ORIGIN = https://biblioteca-cetep.vercel.app
```

Clique **Save Changes** — o serviço reinicia automaticamente.

---

## Resumo dos links para trocar

| Arquivo / Lugar | O que trocar |
|-----------------|-------------|
| [frontApp/js/api.js](frontApp/js/api.js) linha `BASE` | URL do Render |
| Render → Environment → `DB_URL` | Connection string do Supabase |
| Render → Environment → `CORS_ORIGIN` | URL do Vercel |

---

## Desenvolvimento local

```bash
# 1. Configure o backend
cd backend
cp .env.example .env
# Edite .env: coloque sua DB_URL do Supabase e CORS_ORIGIN=http://localhost:5500

npm install
npm run dev        # inicia em http://localhost:3001

# 2. Frontend
# Abra com o Live Server do VS Code ou:
# cd frontApp && python -m http.server 5500
# Acesse: http://localhost:5500/view/dashboard.html
```

O [frontApp/js/api.js](frontApp/js/api.js) detecta automaticamente `localhost` e usa
`http://localhost:3001/api` — sem precisar mudar nada para desenvolvimento.
