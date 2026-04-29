'use strict';
require('dotenv').config();
const { Pool } = require('pg');

// =============================================================
//  CONEXÃO COM O BANCO — PostgreSQL via Supabase
//
//  A variável DB_URL vem do arquivo .env (local) ou das
//  variáveis de ambiente do Render (produção).
//
//  Formato da URL:
//  postgresql://postgres:[SENHA]@db.[ID].supabase.co:5432/postgres
//
//  Onde encontrar no Supabase:
//  → seu projeto → Settings → Database → Connection string → URI
// =============================================================
const pool = new Pool({
  connectionString: process.env.DB_URL,

  // SSL é obrigatório no Supabase
  ssl: { rejectUnauthorized: false },

  max: 10,          // máximo de conexões simultâneas
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Testa a conexão ao iniciar o servidor
pool.connect()
  .then(client => {
    console.log('✅ Banco de dados conectado (PostgreSQL/Supabase)');
    client.release();
  })
  .catch(err => {
    console.error('❌ Erro ao conectar no banco:', err.message);
    process.exit(1);
  });

// =============================================================
//  HELPER: query compatível com o restante do código
//
//  O mysql2 retorna [rows, fields].
//  O pg retorna { rows, rowCount, ... }.
//
//  Este helper padroniza o retorno para [rows] igual ao mysql2,
//  então nenhuma rota precisa ser alterada.
// =============================================================
const db = {
  // pool.query normal — retorna [rows]
  query: async (sql, params = []) => {
    // Converte placeholders: mysql usa ?, postgres usa $1 $2 ...
    let i = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++i}`);
    const result = await pool.query(pgSql, params);
    return [result.rows, result.fields];
  },

  // Retorna uma conexão para transações manuais (BEGIN/COMMIT/ROLLBACK)
  getConnection: async () => {
    const client = await pool.connect();
    return {
      query: async (sql, params = []) => {
        let i = 0;
        const pgSql = sql.replace(/\?/g, () => `$${++i}`);
        const result = await client.query(pgSql, params);
        return [result.rows, result.fields];
      },
      beginTransaction: () => client.query('BEGIN'),
      commit:           () => client.query('COMMIT'),
      rollback:         () => client.query('ROLLBACK'),
      release:          () => client.release(),
    };
  },
};

module.exports = db;