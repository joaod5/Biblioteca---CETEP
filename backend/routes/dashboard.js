'use strict';
const router = require('express').Router();
const db     = require('../config/db');

// ── GET /dashboard/stats ─────────────────────────────────────
router.get('/stats', async (_req, res, next) => {
  try {
    const [[livros]] = await db.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'disponivel') AS disponiveis,
        COUNT(*) FILTER (WHERE status = 'emprestado') AS emprestados,
        COUNT(*) FILTER (WHERE status = 'atrasado')   AS atrasados
      FROM livros
    `);
    const [[alunos]] = await db.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'com_livro') AS com_livro,
        COUNT(*) FILTER (WHERE status = 'ok')        AS ok,
        COUNT(*) FILTER (WHERE status = 'atrasado')  AS atrasados
      FROM alunos
    `);
    const [[emprestimos]] = await db.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status IN ('aberto','vence_logo')) AS em_aberto,
        COUNT(*) FILTER (WHERE status = 'atrasado')               AS atrasados
      FROM emprestimos
      WHERE status != 'devolvido'
    `);
    res.json({ livros, alunos, emprestimos });
  } catch (err) { next(err); }
});

// ── GET /dashboard/busca?q=termo ─────────────────────────────
router.get('/busca', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json({ livros: [], alunos: [] });
    const like = `%${q}%`;
    const [livros] = await db.query(
      `SELECT l.id, l.titulo AS name, l.autor AS author, c.nome AS categoria
       FROM livros l JOIN categorias c ON c.id = l.categoria_id
       WHERE l.titulo LIKE ? OR l.autor LIKE ? LIMIT 5`,
      [like, like]
    );
    const [alunos] = await db.query(
      `SELECT id, codigo, nome AS name, turma FROM alunos WHERE nome LIKE ? OR codigo LIKE ? LIMIT 5`,
      [like, like]
    );
    res.json({ livros, alunos });
  } catch (err) { next(err); }
});

// ── GET /dashboard/atrasos ───────────────────────────────────
router.get('/atrasos', async (_req, res, next) => {
  try {
    const [rows] = await db.query(`SELECT * FROM vw_atrasos ORDER BY dias_atraso DESC`);
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;