/* emprestimo.js — Controle de Empréstimos (consome API REST) */

let filtroAtivo = 'all';

const sl = { aberto: 'Em aberto', atrasado: 'Atrasado', vence_logo: 'Vence logo', devolvido: 'Devolvido' };
const sc = { aberto: 'borrowed',  atrasado: 'overdue',  vence_logo: 'soon',       devolvido: 'available' };
const rc = { atrasado: 'row-overdue', vence_logo: 'row-soon' };

// ── Formata data ISO → DD/MM/AAAA ───────────────────────────
function fmtData(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

// ── Estatísticas ─────────────────────────────────────────────
async function updateStats() {
  try {
    const s = await API.get('/emprestimos/stats');
    document.getElementById('cAll').textContent      = s.total      || 0;
    document.getElementById('cBorrowed').textContent = (parseInt(s.aberto||0) + parseInt(s.vence_logo||0));
    document.getElementById('cSoon').textContent     = s.vence_logo || 0;
    document.getElementById('cOver').textContent     = s.atrasado   || 0;
  } catch (_) {}
}

// ── Renderiza tabela ─────────────────────────────────────────
function renderTabela(loans) {
  document.getElementById('empTable').innerHTML = loans.map(l => `
    <tr class="${rc[l.status] || ''}">
      <td style="font-weight:600">${l.livro}</td>
      <td>${l.aluno}</td>
      <td style="font-family:'DM Mono',monospace;font-size:12px;color:var(--text-muted)">${fmtData(l.data_retirada)}</td>
      <td style="font-family:'DM Mono',monospace;font-size:12px;color:var(--text-muted)">${fmtData(l.data_devolucao)}</td>
      <td><span class="badge-status ${sc[l.status] || 'borrowed'}">${sl[l.status] || l.status}</span></td>
      <td>
        ${l.status === 'atrasado'
          ? `<button class="btn btn-danger-soft btn-sm" onclick="notificar(${l.id}, this)">Notificar</button>`
          : ''}
        ${(l.status === 'aberto' || l.status === 'vence_logo')
          ? `<button class="btn btn-ghost btn-sm" onclick="devolver(${l.id}, this)">Devolver</button>`
          : ''}
        ${l.status === 'devolvido'
          ? `<span style="color:var(--success);font-size:12px;font-weight:600">✅ Devolvido</span>`
          : ''}
      </td>
    </tr>
  `).join('');
}

// ── Carrega empréstimos ──────────────────────────────────────
let debounceTimer;
async function carregarEmprestimos(busca = '') {
  try {
    let path = `/emprestimos?status=${filtroAtivo}`;
    if (busca) path += `&busca=${encodeURIComponent(busca)}`;
    const loans = await API.get(path);
    renderTabela(loans);
  } catch (err) {
    showToast(err.message, true);
  }
}

document.getElementById('empSearch').addEventListener('input', function () {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => carregarEmprestimos(this.value.trim()), 300);
});

// ── Filtros ──────────────────────────────────────────────────
function setFilter(f, el) {
  filtroAtivo = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  carregarEmprestimos(document.getElementById('empSearch').value.trim());
}

// ── Devolver ─────────────────────────────────────────────────
async function devolver(id, btn) {
  btn.disabled = true;
  try {
    await API.put(`/emprestimos/${id}/devolver`);
    showToast('✅ Devolução registrada!');
    updateStats();
    carregarEmprestimos(document.getElementById('empSearch').value.trim());
  } catch (err) {
    showToast(err.message, true);
    btn.disabled = false;
  }
}

// ── Notificar ────────────────────────────────────────────────
async function notificar(id, btn) {
  btn.disabled = true;
  try {
    await API.put(`/emprestimos/${id}/notificar`);
    showToast('📧 Notificação registrada!');
    carregarEmprestimos(document.getElementById('empSearch').value.trim());
  } catch (err) {
    showToast(err.message, true);
    btn.disabled = false;
  }
}

// ── Modal novo empréstimo ─────────────────────────────────────
async function openModal() {
  // Carrega livros disponíveis e alunos dinamicamente
  try {
    const [livros, alunos] = await Promise.all([
      API.get('/livros/disponiveis'),
      API.get('/alunos/lista'),
    ]);

    document.getElementById('inpLivro').innerHTML =
      '<option value="">Selecionar livro disponível...</option>' +
      livros.map(l => `<option value="${l.id}">${l.titulo} — ${l.autor}</option>`).join('');

    document.getElementById('inpAluno').innerHTML =
      '<option value="">Selecionar aluno...</option>' +
      alunos.map(a => `<option value="${a.id}">${a.nome} (${a.turma})</option>`).join('');

    document.getElementById('modalOverlay').classList.add('open');
  } catch (err) {
    showToast('Erro ao carregar dados: ' + err.message, true);
  }
}
function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }

async function saveEmp() {
  const livro_id       = parseInt(document.getElementById('inpLivro').value);
  const aluno_id       = parseInt(document.getElementById('inpAluno').value);
  const data_devolucao = document.getElementById('inpDev').value;

  if (!livro_id || !aluno_id || !data_devolucao) { showToast('Preencha todos os campos!', true); return; }

  const btn = document.querySelector('#modalOverlay .btn-primary');
  btn.disabled = true;
  btn.textContent = 'Registrando…';

  try {
    await API.post('/emprestimos', { livro_id, aluno_id, data_devolucao });
    closeModal();
    showToast('✅ Empréstimo registrado!');
    updateStats();
    carregarEmprestimos();
  } catch (err) {
    showToast(err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Registrar';
  }
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg, err = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = err ? 'var(--danger)' : 'var(--success)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

document.getElementById('modalOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });

// Data padrão: hoje + 14 dias
const devolPadrao = new Date();
devolPadrao.setDate(devolPadrao.getDate() + 14);
document.getElementById('inpDev').value = devolPadrao.toISOString().split('T')[0];

// ── Init ─────────────────────────────────────────────────────
updateStats();
carregarEmprestimos();
