'use strict';
const router  = require('express').Router();
const { body, param, validationResult } = require('express-validator');
const db      = require('../config/db');

// Helper: retorna os erros de validação ou passa adiante
function validate(req, res, next) {
  const erros = validationResult(req);
  if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });
  next();
}

// ── GET /livros ─────────────────────────────────────────────
// Lista todos os livros com categoria e status.
// Suporta ?busca=termo para filtrar.
router.get('/', async (req, res, next) => {
  try {
    const busca = req.query.busca ? `%${req.query.busca}%` : '%';
    const [rows] = await db.query(
      `SELECT l.id, l.codigo, l.titulo, l.autor,
              c.nome AS categoria, l.status, l.criado_em
       FROM livros l
       JOIN categorias c ON c.id = l.categoria_id
       WHERE l.titulo LIKE ? OR l.autor LIKE ? OR c.nome LIKE ?
       ORDER BY l.titulo`,
      [busca, busca, busca]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// ── GET /livros/disponiveis ─────────────────────────────────
// Retorna só os livros disponíveis para empréstimo (usado nos selects)
router.get('/disponiveis', async (_req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT id, codigo, titulo, autor FROM livros WHERE status = 'disponivel' ORDER BY titulo`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// ── GET /livros/categorias/lista ─────────────────────────────
router.get('/categorias/lista', async (_req, res, next) => {
  try {
    const [rows] = await db.query(`SELECT id, nome FROM categorias ORDER BY nome`);
    res.json(rows);
  } catch (err) { next(err); }
});

// ── GET /livros/:id ─────────────────────────────────────────
router.get('/:id',
  param('id').isInt({ min: 1 }),
  validate,
  async (req, res, next) => {
    try {
      const [rows] = await db.query(
        `SELECT l.id, l.codigo, l.titulo, l.autor,
                c.nome AS categoria, l.status, l.criado_em
         FROM livros l
         JOIN categorias c ON c.id = l.categoria_id
         WHERE l.id = ?`,
        [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ erro: 'Livro não encontrado.' });
      res.json(rows[0]);
    } catch (err) { next(err); }
  }
);

// ── POST /livros ────────────────────────────────────────────
router.post('/',
  body('titulo').isLength({ min: 2, max: 200 }).withMessage('Título inválido.'),
  body('autor').isLength({ min: 2, max: 150 }).withMessage('Autor inválido.'),
  body('categoria_id').isInt({ min: 1 }).withMessage('Categoria inválida.'),
  validate,
  async (req, res, next) => {
    try {
      const { titulo, autor, categoria_id } = req.body;

      // Verifica duplicata
      const [dup] = await db.query(
        `SELECT id FROM livros WHERE titulo = ? AND autor = ? LIMIT 1`,
        [titulo, autor]
      );
      if (dup.length) return res.status(409).json({ erro: 'Livro já cadastrado.' });

      // Gera código sequencial
      const [[{ ultimo }]] = await db.query(`SELECT MAX(id) AS ultimo FROM livros`);
      const codigo = 'L' + String((ultimo || 0) + 1).padStart(3, '0');

      const [result] = await db.query(
        `INSERT INTO livros (codigo, titulo, autor, categoria_id) VALUES (?, ?, ?, ?)`,
        [codigo, titulo, autor, categoria_id]
      );
      res.status(201).json({ id: result.insertId, codigo, titulo, autor, categoria_id, status: 'disponivel' });
    } catch (err) { next(err); }
  }
);

// ── PUT /livros/:id ─────────────────────────────────────────
router.put('/:id',
  param('id').isInt({ min: 1 }),
  body('titulo').optional().isLength({ min: 2, max: 200 }),
  body('autor').optional().isLength({ min: 2, max: 150 }),
  body('categoria_id').optional().isInt({ min: 1 }),
  validate,
  async (req, res, next) => {
    try {
      const { titulo, autor, categoria_id } = req.body;
      const campos = [];
      const valores = [];
      if (titulo)       { campos.push('titulo = ?');       valores.push(titulo); }
      if (autor)        { campos.push('autor = ?');        valores.push(autor); }
      if (categoria_id) { campos.push('categoria_id = ?'); valores.push(categoria_id); }
      if (!campos.length) return res.status(400).json({ erro: 'Nenhum campo para atualizar.' });
      valores.push(req.params.id);
      await db.query(`UPDATE livros SET ${campos.join(', ')} WHERE id = ?`, valores);
      res.json({ mensagem: 'Livro atualizado.' });
    } catch (err) { next(err); }
  }
);

module.exports = router;