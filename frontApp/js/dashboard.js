/* dashboard.js — Dashboard principal (consome API REST) */

const input   = document.getElementById('globalSearch');
const results = document.getElementById('searchResults');

// ── Busca global com debounce ────────────────────────────────
let debounceTimer;
input.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  const q = input.value.trim();
  if (!q) { results.classList.remove('show'); return; }
  debounceTimer = setTimeout(() => buscarGlobal(q), 300);
});

async function buscarGlobal(q) {
  try {
    const { livros, alunos } = await API.get(`/dashboard/busca?q=${encodeURIComponent(q)}`);
    if (!livros.length && !alunos.length) { results.classList.remove('show'); return; }

    let html = '';
    if (livros.length) {
      html += `<div class="sr-group"><div class="sr-group-title">📖 Livros</div>`;
      livros.forEach(l => {
        html += `<div class="sr-item"><div class="sr-icon">📖</div>
                 <div><div class="sr-text">${l.name}</div>
                 <div class="sr-sub">${l.author} · ${l.categoria}</div></div></div>`;
      });
      html += `</div>`;
    }
    if (livros.length && alunos.length) html += `<div class="sr-divider"></div>`;
    if (alunos.length) {
      html += `<div class="sr-group"><div class="sr-group-title">👨‍🎓 Alunos</div>`;
      alunos.forEach(a => {
        html += `<div class="sr-item"><div class="sr-icon">👤</div>
                 <div><div class="sr-text">${a.name}</div>
                 <div class="sr-sub">ID: ${a.codigo} · ${a.turma}</div></div></div>`;
      });
      html += `</div>`;
    }
    results.innerHTML = html;
    results.classList.add('show');
  } catch (_) {
    results.classList.remove('show');
  }
}

document.addEventListener('click', e => {
  if (!document.getElementById('searchWrap').contains(e.target)) results.classList.remove('show');
});

// ── Cards de estatísticas do dashboard ──────────────────────
async function carregarStats() {
  try {
    const { livros, alunos, emprestimos } = await API.get('/dashboard/stats');

    // Livros
    const elLivrosTotal = document.getElementById('statLivrosTotal');
    const elLivrosDisp  = document.getElementById('statLivrosDisp');
    const elLivrosEmp   = document.getElementById('statLivrosEmp');
    if (elLivrosTotal) elLivrosTotal.textContent = livros.total      || 0;
    if (elLivrosDisp)  elLivrosDisp.textContent  = livros.disponiveis|| 0;
    if (elLivrosEmp)   elLivrosEmp.textContent   = livros.emprestados|| 0;

    // Alunos
    const elAlunosTotal = document.getElementById('statAlunosTotal');
    const elAlunosCom   = document.getElementById('statAlunosCom');
    if (elAlunosTotal) elAlunosTotal.textContent = alunos.total    || 0;
    if (elAlunosCom)   elAlunosCom.textContent   = alunos.com_livro|| 0;

    // Empréstimos
    const elEmpTotal    = document.getElementById('statEmpTotal');
    const elEmpAtrasado = document.getElementById('statEmpAtrasado');
    if (elEmpTotal)    elEmpTotal.textContent    = emprestimos.total    || 0;
    if (elEmpAtrasado) elEmpAtrasado.textContent = emprestimos.atrasados|| 0;
  } catch (err) {
  console.error('carregarStats falhou:', err);
}
}

// ── Init ─────────────────────────────────────────────────────
carregarStats();
