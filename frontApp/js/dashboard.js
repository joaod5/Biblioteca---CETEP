/* dashboard.js — Dashboard principal (consome API REST) */

const input   = document.getElementById('globalSearch');
const results = document.getElementById('searchResults');

function fmtData(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

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

// ── Cards de estatísticas ────────────────────────────────────
async function carregarStats() {
  try {
    const { livros, alunos, emprestimos } = await API.get('/dashboard/stats');

    document.getElementById('statLivrosTotal').textContent = livros.total       || 0;
    document.getElementById('statLivrosEmp').textContent   = livros.emprestados || 0;
    document.getElementById('statEmpAtrasado').textContent = emprestimos.atrasados || 0;

    document.getElementById('subLivros').textContent  = `${livros.disponiveis || 0} disponíveis`;
    document.getElementById('subEmp').textContent     = `${emprestimos.em_aberto || 0} em aberto`;
    document.getElementById('subAtraso').innerHTML    = emprestimos.atrasados > 0
      ? `<span class="trend down">⚠ Atenção necessária</span>`
      : `<span class="trend up">✓ Tudo em dia</span>`;
  } catch (err) {
    console.error('carregarStats falhou:', err);
  }
}

// ── Notificações dinâmicas ───────────────────────────────────
async function carregarNotificacoes() {
  const lista = document.getElementById('notifsList');
  try {
    const [atrasos, vencendo] = await Promise.all([
      API.get('/dashboard/atrasos'),
      API.get('/emprestimos?status=vence_logo'),
    ]);

    let html = '';

    atrasos.slice(0, 3).forEach(a => {
      html += `
        <div class="notif danger">
          <span class="notif-icon">⚠️</span>
          <div class="notif-body">
            <div class="notif-title">Livro "${a.livro}" está em atraso</div>
            <div class="notif-sub">Aluno: ${a.aluno} · ${a.dias_atraso} dia${a.dias_atraso !== 1 ? 's' : ''} em atraso</div>
          </div>
        </div>`;
    });

    vencendo.slice(0, 2).forEach(v => {
      html += `
        <div class="notif warning">
          <span class="notif-icon">⏰</span>
          <div class="notif-body">
            <div class="notif-title">Livro "${v.livro}" vence em breve</div>
            <div class="notif-sub">Aluno: ${v.aluno} · Devolução: ${fmtData(v.data_devolucao)}</div>
          </div>
        </div>`;
    });

    if (!html) {
      html = `
        <div class="notif" style="border-left-color:var(--success);background:var(--success-bg)">
          <span class="notif-icon">✅</span>
          <div class="notif-body">
            <div class="notif-title">Tudo em ordem!</div>
            <div class="notif-sub">Nenhum atraso ou vencimento próximo no momento.</div>
          </div>
        </div>`;
    }

    lista.innerHTML = html;
  } catch (_) {
    lista.innerHTML = '';
  }
}

// ── Tabela de empréstimos ativos ─────────────────────────────
async function carregarTabelaDashboard() {
  const sc = { aberto: 'borrowed', vence_logo: 'soon', atrasado: 'overdue', devolvido: 'available' };
  const sl = { aberto: 'Em aberto', vence_logo: 'Vence logo', atrasado: 'Atrasado', devolvido: 'Devolvido' };

  try {
    const todos   = await API.get('/emprestimos');
    const ativos  = todos.filter(e => e.status !== 'devolvido').slice(0, 6);
    const tbody   = document.getElementById('dashTable');

    if (!ativos.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">Nenhum empréstimo ativo</td></tr>`;
      return;
    }

    tbody.innerHTML = ativos.map(e => `
      <tr>
        <td><div class="book-name">${e.livro}</div></td>
        <td>${e.aluno}</td>
        <td><span class="badge-status ${sc[e.status] || 'borrowed'}">${sl[e.status] || e.status}</span></td>
        <td style="font-family:'DM Mono',monospace;font-size:12px;color:var(--text-muted)">${fmtData(e.data_devolucao)}</td>
        <td><a href="emprestimos.html" class="btn btn-ghost btn-sm">Ver</a></td>
      </tr>`).join('');
  } catch (_) {}
}

// ── Reset / Apagar dados ─────────────────────────────────────
let _resetRota = '';

function openResetModal(rota, nome, desc) {
  _resetRota = rota;
  document.getElementById('resetTitle').textContent = `Apagar ${nome}?`;
  document.getElementById('resetDesc').textContent  = desc;
  document.getElementById('resetConfirmInput').value = '';
  document.getElementById('btnResetConfirm').disabled = true;
  document.getElementById('resetOverlay').classList.add('open');
  setTimeout(() => document.getElementById('resetConfirmInput').focus(), 100);
}

function closeResetModal() {
  document.getElementById('resetOverlay').classList.remove('open');
}

document.getElementById('resetConfirmInput').addEventListener('input', function () {
  document.getElementById('btnResetConfirm').disabled = this.value !== 'CONFIRMAR';
});

async function executarReset() {
  try {
    await API.delete(`/admin/${_resetRota}`);
    closeResetModal();
    showToast('Dados apagados com sucesso.');
    setTimeout(() => location.reload(), 1200);
  } catch (_) {
    showToast('Erro ao apagar dados. Tente novamente.');
  }
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Init ─────────────────────────────────────────────────────
carregarStats();
carregarNotificacoes();
carregarTabelaDashboard();