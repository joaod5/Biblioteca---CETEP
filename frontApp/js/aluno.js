/* aluno.js — Cadastro de Alunos (consome API REST) */

const avatarColors = ['#3B82F6','#8B5CF6','#EC4899','#F59E0B','#10B981','#EF4444','#06B6D4','#6366F1'];

const statusLabel = { ok: 'Sem pendência', com_livro: 'Com livro', atrasado: 'Em atraso' };

function getInitials(name) { return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase(); }
function getColor(codigo)  { return avatarColors[parseInt(codigo.replace('A', '')) % avatarColors.length]; }

// ── Estatísticas ─────────────────────────────────────────────
function updateStats(alunos) {
  document.getElementById('sTotal').textContent = alunos.length;
  document.getElementById('sWith').textContent  = alunos.filter(s => s.status === 'com_livro').length;
  document.getElementById('sOk').textContent    = alunos.filter(s => s.status === 'ok').length;
  document.getElementById('sOver').textContent  = alunos.filter(s => s.status === 'atrasado').length;
}

// ── Renderiza tabela ─────────────────────────────────────────
function renderTabela(alunos) {
  updateStats(alunos);
  document.getElementById('alunoTable').innerHTML = alunos.map(s => `
    <tr>
      <td>
        <div class="student-cell">
          <div class="student-avatar" style="background:${getColor(s.codigo)}">${getInitials(s.nome)}</div>
          <div><div class="student-name">${s.nome}</div><div class="student-id">${s.codigo}</div></div>
        </div>
      </td>
      <td><span style="background:var(--bg);padding:3px 8px;border-radius:6px;font-size:12px;font-weight:600;color:var(--text-muted)">${s.turma} · ${s.ano}</span></td>
      <td><div class="books-count"><span>${s.livros_em_maos || 0}</span>${(s.livros_em_maos || 0) === 1 ? 'livro' : 'livros'}</div></td>
      <td><span class="badge-status ${s.status}">${statusLabel[s.status] || s.status}</span></td>
      <td><button class="btn btn-ghost btn-sm" onclick="showDetail(${s.id})">Ver detalhes</button></td>
    </tr>
  `).join('');
}

// ── Carrega alunos do backend ────────────────────────────────
let debounceTimer;
async function carregarAlunos(busca = '') {
  try {
    const path = busca ? `/alunos?busca=${encodeURIComponent(busca)}` : '/alunos';
    const alunos = await API.get(path);
    renderTabela(alunos);
  } catch (err) {
    showToast(err.message, true);
  }
}

// ── Busca com debounce ───────────────────────────────────────
document.getElementById('alunoSearch').addEventListener('input', function () {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => carregarAlunos(this.value.trim()), 300);
});

// ── Modal cadastro ───────────────────────────────────────────
function openModal()  { document.getElementById('modalOverlay').classList.add('open'); }
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  ['inpNome','inpSobre','inpTurma','inpAno'].forEach(id => document.getElementById(id).value = '');
}

async function saveAluno() {
  const nome  = document.getElementById('inpNome').value.trim();
  const sobre = document.getElementById('inpSobre').value.trim();
  const turma = document.getElementById('inpTurma').value.trim();
  const ano   = parseInt(document.getElementById('inpAno').value.trim()) || new Date().getFullYear();

  if (!nome || !sobre || !turma) { showToast('Preencha nome, sobrenome e turma!', true); return; }

  const btn = document.querySelector('#modalOverlay .btn-primary');
  btn.disabled = true;
  btn.textContent = 'Salvando…';

  try {
    await API.post('/alunos', { nome: `${nome} ${sobre}`, turma, ano });
    closeModal();
    showToast('✅ Aluno cadastrado com sucesso!');
    carregarAlunos();
  } catch (err) {
    showToast(err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Cadastrar';
  }
}

// ── Modal detalhe ────────────────────────────────────────────
async function showDetail(id) {
  try {
    const s = await API.get(`/alunos/${id}`);
    document.getElementById('dAvatar').style.background = getColor(s.codigo);
    document.getElementById('dAvatar').textContent      = getInitials(s.nome);
    document.getElementById('dName').textContent        = s.nome;
    document.getElementById('dMeta').textContent        = `${s.codigo} · Turma ${s.turma} · ${s.ano}`;

    const booksHtml = s.emprestimos && s.emprestimos.length
      ? s.emprestimos.map(e => `
          <div class="detail-book-item">
            <div>
              <div class="db-title">${e.livro}</div>
              <div class="db-date">Retirada: ${e.data_retirada} — Devolução: ${e.data_devolucao}</div>
            </div>
            <span class="badge-status ${e.status === 'atrasado' ? 'atrasado' : 'com_livro'}">
              ${e.status === 'atrasado' ? 'Atrasado' : 'Emprestado'}
            </span>
          </div>`).join('')
      : '<div class="no-books">Nenhum livro emprestado no momento ✅</div>';

    document.getElementById('dBooks').innerHTML = booksHtml;
    document.getElementById('detailOverlay').classList.add('open');
  } catch (err) {
    showToast(err.message, true);
  }
}
function closeDetail() { document.getElementById('detailOverlay').classList.remove('open'); }

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg, err = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (err ? ' error' : '');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Listeners ────────────────────────────────────────────────
document.getElementById('modalOverlay').addEventListener('click',  e => { if (e.target === e.currentTarget) closeModal(); });
document.getElementById('detailOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeDetail(); });

// ── Init ─────────────────────────────────────────────────────
carregarAlunos();