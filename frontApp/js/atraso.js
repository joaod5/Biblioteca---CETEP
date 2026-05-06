/* atraso.js — Painel de Atrasos (consome API REST) */

function getDaysClass(d) {
  if (d >= 10) return 'critical';
  if (d >= 7)  return 'high';
  return 'medium';
}

function fmtData(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

// ── Estatísticas ─────────────────────────────────────────────
function updateStats(overdues) {
  const maxDias  = overdues.length ? Math.max(...overdues.map(o => o.dias_atraso)) : 0;
  const alunos   = new Set(overdues.map(o => o.aluno_id)).size;
  document.getElementById('overdueCount').textContent = overdues.length;
  document.getElementById('statTotal').textContent    = overdues.length;
  document.getElementById('statMax').textContent      = maxDias;
  document.getElementById('statAlunos').textContent   = alunos;
}

// ── Render ───────────────────────────────────────────────────
let todosAtrasos = [];

function renderTabela(data) {
  updateStats(data);
  document.getElementById('atTable').innerHTML = data.map(o => `
    <tr>
      <td style="font-weight:600">${o.livro}</td>
      <td>${o.aluno}</td>
      <td style="font-family:'DM Mono',monospace;font-size:12px;color:var(--text-muted)">${fmtData(o.data_devolucao)}</td>
      <td><span class="overdue-days ${getDaysClass(o.dias_atraso)}">${o.dias_atraso} dia${o.dias_atraso !== 1 ? 's' : ''}</span></td>
      <td>${o.notificado
        ? '<span style="color:var(--success);font-size:12px;font-weight:600">✅ Sim</span>'
        : '<span style="color:var(--text-light);font-size:12px">— Não</span>'}</td>
      <td style="display:flex;gap:8px;align-items:center">
        <button class="btn-notify ${o.notificado ? 'sent' : ''}" onclick="notificar(${o.id}, this)">
          ${o.notificado ? '✅ Notificado' : '📧 Notificar'}
        </button>
        <button class="btn btn-ghost btn-sm" onclick="devolver(${o.id}, this)">Devolvido</button>
      </td>
    </tr>
  `).join('');
}

// ── Carrega atrasos ──────────────────────────────────────────
let debounceTimer;
async function carregarAtrasos(busca = '') {
  try {
    todosAtrasos = await API.get('/dashboard/atrasos');
    const filtrado = busca
      ? todosAtrasos.filter(o =>
          o.livro.toLowerCase().includes(busca.toLowerCase()) ||
          o.aluno.toLowerCase().includes(busca.toLowerCase()))
      : todosAtrasos;
    renderTabela(filtrado);
  } catch (err) {
    showToast(err.message);
  }
}

document.getElementById('atSearch').addEventListener('input', function () {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const busca = this.value.trim();
    const filtrado = busca
      ? todosAtrasos.filter(o =>
          o.livro.toLowerCase().includes(busca.toLowerCase()) ||
          o.aluno.toLowerCase().includes(busca.toLowerCase()))
      : todosAtrasos;
    renderTabela(filtrado);
  }, 250);
});

// ── Ordenar por dias ─────────────────────────────────────────
let sortDesc = true;
function sortByDays() {
  todosAtrasos.sort((a, b) => sortDesc ? b.dias_atraso - a.dias_atraso : a.dias_atraso - b.dias_atraso);
  sortDesc = !sortDesc;
  renderTabela(todosAtrasos);
}

// ── Notificar individual ─────────────────────────────────────
async function notificar(id, btn) {
  if (btn.classList.contains('sent')) return;
  btn.disabled = true;
  try {
    await API.put(`/emprestimos/${id}/notificar`);
    showToast('📧 Notificação registrada!');
    carregarAtrasos();
  } catch (err) {
    showToast(err.message);
    btn.disabled = false;
  }
}

// ── Notificar todos ──────────────────────────────────────────
async function notifyAll() {
  try {
    await API.put('/emprestimos/notificar-todos/atrasos');
    showToast(`📧 Todos os atrasos marcados como notificados!`);
    carregarAtrasos();
  } catch (err) {
    showToast(err.message);
  }
}

// ── Devolver (registra no backend) ───────────────────────────
async function devolver(id, btn) {
  btn.disabled = true;
  try {
    await API.put(`/emprestimos/${id}/devolver`);
    showToast('✅ Devolução registrada!');
    carregarAtrasos();
  } catch (err) {
    showToast(err.message);
    btn.disabled = false;
  }
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = 'var(--success)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Init ─────────────────────────────────────────────────────
carregarAtrasos();