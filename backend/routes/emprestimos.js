'use strict';
const router = require('express').Router();
const { body, param, validationResult } = require('express-validator');
const db     = require('../config/db');

function validate(req, res, next) {
  const erros = validationResult(req);
  if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });
  next();
}

// ── GET /emprestimos ─────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { busca, status } = req.query;
    let sql    = `SELECT * FROM vw_emprestimos WHERE 1=1`;
    const vals = [];

    if (status && status !== 'all') {
      sql += ` AND status = ?`;
      vals.push(status);
    }
    if (busca) {
      sql += ` AND (livro LIKE ? OR aluno LIKE ?)`;
      vals.push(`%${busca}%`, `%${busca}%`);
    }
    sql += ` ORDER BY data_retirada DESC`;

    const [rows] = await db.query(sql, vals);
    res.json(rows);
  } catch (err) { next(err); }
});

// ── GET /emprestimos/stats ───────────────────────────────────
router.get('/stats', async (_req, res, next) => {
  try {
    const [[stats]] = await db.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'aberto')     AS aberto,
        COUNT(*) FILTER (WHERE status = 'vence_logo') AS vence_logo,
        COUNT(*) FILTER (WHERE status = 'atrasado')   AS atrasado,
        COUNT(*) FILTER (WHERE status = 'devolvido')  AS devolvido
      FROM emprestimos
    `);
    res.json(stats);
  } catch (err) { next(err); }
});

// ── POST /emprestimos ────────────────────────────────────────
router.post('/',
  body('livro_id').isInt({ min: 1 }).withMessage('Livro inválido.'),
  body('aluno_id').isInt({ min: 1 }).withMessage('Aluno inválido.'),
  body('data_devolucao').isDate().withMessage('Data de devolução inválida.'),
  validate,
  async (req, res, next) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const { livro_id, aluno_id, data_devolucao } = req.body;

      // Verifica se o livro está disponível
      const [[livro]] = await conn.query(
        `SELECT id, status FROM livros WHERE id = ? FOR UPDATE`,
        [livro_id]
      );
      if (!livro) { await conn.rollback(); return res.status(404).json({ erro: 'Livro não encontrado.' }); }
      if (livro.status !== 'disponivel') { await conn.rollback(); return res.status(409).json({ erro: 'Livro não está disponível.' }); }

      // Verifica se aluno existe
      const [[aluno]] = await conn.query(`SELECT id FROM alunos WHERE id = ?`, [aluno_id]);
      if (!aluno) { await conn.rollback(); return res.status(404).json({ erro: 'Aluno não encontrado.' }); }

      // Determina status inicial
      const hoje = new Date();
      const devol = new Date(data_devolucao);
      const diffDias = Math.ceil((devol - hoje) / 86400000);
      const status = diffDias <= 3 ? 'vence_logo' : 'aberto';

      // Cria empréstimo
      const [[{ id }]] = await conn.query(
        `INSERT INTO emprestimos (livro_id, aluno_id, data_devolucao, status) VALUES (?, ?, ?, ?) RETURNING id`,
        [livro_id, aluno_id, data_devolucao, status]
      );

      // Atualiza status do livro e aluno
      await conn.query(`UPDATE livros SET status = 'emprestado' WHERE id = ?`, [livro_id]);
      await conn.query(`UPDATE alunos SET status = 'com_livro' WHERE id = ? AND status = 'ok'`, [aluno_id]);

      await conn.commit();
      res.status(201).json({ id, mensagem: 'Empréstimo registrado.' });
    } catch (err) {
      await conn.rollback();
      next(err);
    } finally {
      conn.release();
    }
  }
);

// ── PUT /emprestimos/:id/devolver ────────────────────────────
router.put('/:id/devolver',
  param('id').isInt({ min: 1 }),
  validate,
  async (req, res, next) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [[emp]] = await conn.query(
        `SELECT * FROM emprestimos WHERE id = ? FOR UPDATE`,
        [req.params.id]
      );
      if (!emp) { await conn.rollback(); return res.status(404).json({ erro: 'Empréstimo não encontrado.' }); }
      if (emp.status === 'devolvido') { await conn.rollback(); return res.status(409).json({ erro: 'Livro já foi devolvido.' }); }

      await conn.query(
        `UPDATE emprestimos SET status = 'devolvido', data_devolvido = CURRENT_DATE WHERE id = ?`,
        [req.params.id]
      );

      // Libera o livro
      await conn.query(`UPDATE livros SET status = 'disponivel' WHERE id = ?`, [emp.livro_id]);

      // Recalcula status do aluno: se não tem mais empréstimos ativos, volta p/ 'ok'
      const [[{ ativos }]] = await conn.query(
        `SELECT COUNT(*) AS ativos FROM emprestimos
         WHERE aluno_id = ? AND status IN ('aberto','vence_logo','atrasado')`,
        [emp.aluno_id]
      );
      if (!Number(ativos)) {
        await conn.query(`UPDATE alunos SET status = 'ok' WHERE id = ?`, [emp.aluno_id]);
      }

      await conn.commit();
      res.json({ mensagem: 'Devolução registrada.' });
    } catch (err) {
      await conn.rollback();
      next(err);
    } finally {
      conn.release();
    }
  }
);

// ── PUT /emprestimos/:id/notificar ───────────────────────────
router.put('/:id/notificar',
  param('id').isInt({ min: 1 }),
  validate,
  async (req, res, next) => {
    try {
      await db.query(
        `UPDATE emprestimos SET notificado = TRUE WHERE id = ?`,
        [req.params.id]
      );
      res.json({ mensagem: 'Notificação registrada.' });
    } catch (err) { next(err); }
  }
);

// ── PUT /emprestimos/notificar-todos ─────────────────────────
router.put('/notificar-todos/atrasos', async (_req, res, next) => {
  try {
    await db.query(`UPDATE emprestimos SET notificado = TRUE WHERE status = 'atrasado'`);
    res.json({ mensagem: 'Todos os atrasos foram marcados como notificados.' });
  } catch (err) { next(err); }
});

module.exports = router;
