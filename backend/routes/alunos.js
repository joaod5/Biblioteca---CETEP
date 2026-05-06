'use strict';
const router = require('express').Router();
const { body, param, validationResult } = require('express-validator');
const db     = require('../config/db');

function validate(req, res, next) {
  const erros = validationResult(req);
  if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });
  next();
}

// ── GET /alunos ──────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const busca = req.query.busca ? `%${req.query.busca}%` : '%';
    const [rows] = await db.query(
      `SELECT a.id, a.codigo, a.nome, a.turma, a.ano, a.status,
              COUNT(e.id) AS livros_em_maos
       FROM alunos a
       LEFT JOIN emprestimos e ON e.aluno_id = a.id
         AND e.status IN ('aberto','vence_logo','atrasado')
       WHERE a.nome LIKE ? OR a.codigo LIKE ? OR a.turma LIKE ?
       GROUP BY a.id
       ORDER BY a.nome`,
      [busca, busca, busca]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// ── GET /alunos/lista ────────────────────────────────────────
// Lista simplificada para selects de empréstimo
router.get('/lista', async (_req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT id, codigo, nome, turma FROM alunos ORDER BY nome`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// ── GET /alunos/:id ──────────────────────────────────────────
router.get('/:id',
  param('id').isInt({ min: 1 }),
  validate,
  async (req, res, next) => {
    try {
      const [[aluno]] = await db.query(
        `SELECT id, codigo, nome, turma, ano, status, criado_em FROM alunos WHERE id = ?`,
        [req.params.id]
      );
      if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado.' });

      const [emprestimos] = await db.query(
        `SELECT livro, data_retirada, data_devolucao, status
         FROM vw_emprestimos
         WHERE aluno_id = ?
         ORDER BY data_retirada DESC`,
        [req.params.id]
      );
      res.json({ ...aluno, emprestimos });
    } catch (err) { next(err); }
  }
);

// ── POST /alunos ─────────────────────────────────────────────
router.post('/',
  body('nome').isLength({ min: 3, max: 100 }).withMessage('Nome inválido (mínimo 3 letras).'),
  body('turma').isLength({ min: 2, max: 10 }).withMessage('Turma inválida.'),
  body('ano').isInt({ min: 2020, max: 2100 }).withMessage('Ano inválido.'),
  validate,
  async (req, res, next) => {
    try {
      const { nome, turma, ano } = req.body;

      const [dup] = await db.query(
        `SELECT id FROM alunos WHERE nome = ? AND turma = ? AND ano = ? LIMIT 1`,
        [nome, turma, ano]
      );
      if (dup.length) return res.status(409).json({ erro: 'Aluno já cadastrado nessa turma/ano.' });

      const [[{ ultimo }]] = await db.query(`SELECT MAX(id) AS ultimo FROM alunos`);
      const codigo = 'A' + String((ultimo || 0) + 1).padStart(3, '0');

      const [[{ id }]] = await db.query(
        `INSERT INTO alunos (codigo, nome, turma, ano) VALUES (?, ?, ?, ?) RETURNING id`,
        [codigo, nome, turma, ano]
      );
      res.status(201).json({ id, codigo, nome, turma, ano, status: 'ok' });
    } catch (err) { next(err); }
  }
);

// ── PUT /alunos/:id ──────────────────────────────────────────
router.put('/:id',
  param('id').isInt({ min: 1 }),
  body('nome').optional().isLength({ min: 3, max: 100 }),
  body('turma').optional().isLength({ min: 2, max: 10 }),
  body('ano').optional().isInt({ min: 2020, max: 2100 }),
  validate,
  async (req, res, next) => {
    try {
      const { nome, turma, ano } = req.body;
      const campos = [];
      const valores = [];
      if (nome)  { campos.push('nome = ?');  valores.push(nome); }
      if (turma) { campos.push('turma = ?'); valores.push(turma); }
      if (ano)   { campos.push('ano = ?');   valores.push(ano); }
      if (!campos.length) return res.status(400).json({ erro: 'Nenhum campo para atualizar.' });
      valores.push(req.params.id);
      await db.query(`UPDATE alunos SET ${campos.join(', ')} WHERE id = ?`, valores);
      res.json({ mensagem: 'Aluno atualizado.' });
    } catch (err) { next(err); }
  }
);

module.exports = router;