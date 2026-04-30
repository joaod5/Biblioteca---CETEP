'use strict';
const router = require('express').Router();
const db     = require('../config/db');

// DELETE /api/admin/reset — apaga todos os registros de emprestimos, livros e alunos
router.delete('/reset', async (req, res) => {
  try {
    await db.query('TRUNCATE emprestimos, livros, alunos RESTART IDENTITY CASCADE');
    res.json({ ok: true });
  } catch (err) {
    console.error('admin/reset error:', err);
    res.status(500).json({ erro: 'Erro ao limpar os dados.' });
  }
});

module.exports = router;
