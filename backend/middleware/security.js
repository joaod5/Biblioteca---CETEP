'use strict';
const rateLimit = require('express-rate-limit');

/**
 * Rate limiter geral — 200 req / 15 min por IP.
 * Para uma escola local, isso é mais que suficiente.
 */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas requisições. Tente novamente em alguns minutos.' },
});

/**
 * Sanitiza uma string removendo caracteres perigosos.
 * Usado como camada extra além dos prepared statements.
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>"'%;()&+]/g, '');
}

/**
 * Middleware que sanitiza body, query e params automaticamente.
 */
function sanitizeRequest(req, _res, next) {
  const sanitizeObj = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'string') obj[key] = sanitizeString(obj[key]);
      else if (typeof obj[key] === 'object') sanitizeObj(obj[key]);
    }
  };
  sanitizeObj(req.body);
  sanitizeObj(req.query);
  sanitizeObj(req.params);
  next();
}

/**
 * Resposta padronizada de erro — nunca vaza stack trace para o cliente.
 */
function errorHandler(err, req, res, _next) {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err.message);
  const status = err.status || 500;
  res.status(status).json({ erro: err.message || 'Erro interno do servidor.' });
}

module.exports = { limiter, sanitizeRequest, errorHandler };