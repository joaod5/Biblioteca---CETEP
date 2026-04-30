/* api.js — utilitário compartilhado por todas as páginas
   Centraliza a URL base, tratamento de erros e toggle da sidebar mobile. */

const API = (() => {
  // Em produção, troque pela URL do Render após o deploy
  const BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3001/api'
    : 'https://biblioteca-cetep.onrender.com/api';

  async function request(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(BASE + path, opts);
    const data = await res.json();

    if (!res.ok) {
      // Lança o erro retornado pelo backend (nunca expõe stack)
      const msg = data.erro || (data.erros && data.erros[0]?.msg) || 'Erro desconhecido.';
      throw new Error(msg);
    }
    return data;
  }

  return {
    get:    (path)        => request('GET',    path),
    post:   (path, body)  => request('POST',   path, body),
    put:    (path, body)  => request('PUT',    path, body),
    delete: (path)        => request('DELETE', path),
  };
})();

function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
  const ov = document.getElementById('sidebarOverlay');
  if (ov) ov.classList.toggle('open');
}
