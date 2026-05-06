'use strict';
const router = require('express').Router();
const db     = require('../config/db');

router.delete('/livros', async (req, res) => {
  try {
    // Empréstimos dependem de livros, precisa apagar junto
    await db.query('TRUNCATE emprestimos, livros RESTART IDENTITY CASCADE');
    res.json({ ok: true });
  } catch (err) {
    console.error('admin/livros error:', err);
    res.status(500).json({ erro: 'Erro ao apagar livros.' });
  }
});

router.delete('/alunos', async (req, res) => {
  try {
    // Empréstimos dependem de alunos, precisa apagar junto
    await db.query('TRUNCATE emprestimos, alunos RESTART IDENTITY CASCADE');
    res.json({ ok: true });
  } catch (err) {
    console.error('admin/alunos error:', err);
    res.status(500).json({ erro: 'Erro ao apagar alunos.' });
  }
});

router.delete('/emprestimos', async (req, res) => {
  try {
    await db.query('TRUNCATE emprestimos RESTART IDENTITY');
    res.json({ ok: true });
  } catch (err) {
    console.error('admin/emprestimos error:', err);
    res.status(500).json({ erro: 'Erro ao apagar empréstimos.' });
  }
});

router.delete('/tudo', async (req, res) => {
  try {
    await db.query('TRUNCATE emprestimos, livros, alunos RESTART IDENTITY CASCADE');
    res.json({ ok: true });
  } catch (err) {
    console.error('admin/tudo error:', err);
    res.status(500).json({ erro: 'Erro ao apagar todos os dados.' });
  }
});

module.exports = router;