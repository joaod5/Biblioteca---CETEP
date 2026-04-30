'use strict';
require('dotenv').config();
const express  = require('express');
const helmet   = require('helmet');
const cors     = require('cors');

const { limiter, sanitizeRequest, errorHandler } = require('./middleware/security');

const rotaLivros      = require('./routes/livros');
const rotaAlunos      = require('./routes/alunos');
const rotaEmprestimos = require('./routes/emprestimos');
const rotaDashboard   = require('./routes/dashboard');
const rotaAdmin       = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Segurança ────────────────────────────────────────────────
app.use(helmet());

// =============================================================
//  CORS — origens permitidas
//
//  CORS_ORIGIN vem do .env (local) ou das variáveis de ambiente
//  do Render (produção).
//
//  Após criar seu frontend no Vercel, coloque a URL aqui:
//  Exemplo: https://biblioteca-cetep.vercel.app
//
//  No Render: Dashboard → seu serviço → Environment
//  → adicione CORS_ORIGIN = https://SEU-PROJETO.vercel.app
// =============================================================
app.use(cors({
  origin: [
    process.env.CORS_ORIGIN,          // URL do Vercel (produção)
    'http://localhost:5500',           // Live Server local
    'http://127.0.0.1:5500',          // Live Server local
  ].filter(Boolean),                  // remove entradas vazias
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));

app.use(limiter);

// ── Parsing ──────────────────────────────────────────────────
app.use(express.json({ limit: '50kb' }));
app.use(sanitizeRequest);

// ── Rotas ────────────────────────────────────────────────────
app.use('/api/livros',      rotaLivros);
app.use('/api/alunos',      rotaAlunos);
app.use('/api/emprestimos', rotaEmprestimos);
app.use('/api/dashboard',   rotaDashboard);
app.use('/api/admin',       rotaAdmin);

// ── Health check ─────────────────────────────────────────────
app.get('/api/ping', (_req, res) => res.json({ ok: true }));

// ── Rota não encontrada ───────────────────────────────────────
app.use((_req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

// ── Tratador de erros global ──────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});