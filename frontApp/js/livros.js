/* livros.js — Acervo de Livros (consome API REST) */

const statusLabel = { disponivel: 'Disponível', emprestado: 'Emprestado', atrasado: 'Atrasado' };
const statusClass = { disponivel: 'available',  emprestado: 'borrowed',   atrasado: 'overdue'  };

// cache dos livros carregados (evita XSS em onclick com strings)
let livrosCache = {};
let editId = null;

// ── Renderiza tabela ─────────────────────────────────────────
function renderTabela(livros) {
  const noRes = document.getElementById('noResults');
  if (!livros.length) {
    document.getElementById('booksTable').innerHTML = '';
    noRes.style.display = 'block';
    return;
  }
  noRes.style.display = 'none';
  livrosCache = {};
  livros.forEach(l => { livrosCache[l.id] = l; });

  document.getElementById('booksTable').innerHTML = livros.map(l => `
    <tr>
      <td style="font-family:'DM Mono',monospace;font-size:12px;color:var(--text-muted)">${l.codigo}</td>
      <td><div class="book-name">${l.titulo}</div></td>
      <td style="color:var(--text-muted)">${l.autor}</td>
      <td style="color:var(--text-muted)">${l.categoria}</td>
      <td><span class="badge-status ${statusClass[l.status] || 'borrowed'}">${statusLabel[l.status] || l.status}</span></td>
      <td><button class="btn btn-ghost btn-sm" onclick="openEdit(${l.id})">Editar</button></td>
    </tr>
  `).join('');
}

// ── Carrega livros ───────────────────────────────────────────
let debounceTimer;
async function carregarLivros(busca = '') {
  try {
    const path = busca ? `/livros?busca=${encodeURIComponent(busca)}` : '/livros';
    const livros = await API.get(path);
    document.getElementById('searchTerm').textContent = busca;
    renderTabela(livros);
  } catch (err) {
    showToast(err.message, true);
  }
}

document.getElementById('bookSearch').addEventListener('input', function () {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => carregarLivros(this.value.trim()), 300);
});

// ── Carrega categorias no select ─────────────────────────────
async function carregarCategorias(selecionarId = null) {
  try {
    const cats = await API.get('/livros/categorias/lista');
    const sel  = document.getElementById('inpCateg');
    sel.innerHTML = '<option value="">Selecionar categoria...</option>' +
      cats.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
    if (selecionarId) sel.value = selecionarId;
  } catch (_) {}
}

// ── Modal: novo livro ────────────────────────────────────────
async function openModal() {
  editId = null;
  document.querySelector('#modalOverlay h3').textContent = '📖 Cadastrar Novo Livro';
  document.querySelector('#modalOverlay .btn-primary').textContent = 'Salvar Livro';
  document.getElementById('inpNome').value  = '';
  document.getElementById('inpAutor').value = '';
  await carregarCategorias();
  document.getElementById('modalOverlay').classList.add('open');
}

// ── Modal: editar livro ──────────────────────────────────────
async function openEdit(id) {
  const livro = livrosCache[id];
  if (!livro) return;
  editId = id;
  document.querySelector('#modalOverlay h3').textContent = '✏️ Editar Livro';
  document.querySelector('#modalOverlay .btn-primary').textContent = 'Atualizar';
  document.getElementById('inpNome').value  = livro.titulo;
  document.getElementById('inpAutor').value = livro.autor;
  await carregarCategorias(livro.categoria_id);
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  editId = null;
}

// ── Salvar / Atualizar ───────────────────────────────────────
async function saveBook() {
  const titulo       = document.getElementById('inpNome').value.trim();
  const autor        = document.getElementById('inpAutor').value.trim();
  const categoria_id = parseInt(document.getElementById('inpCateg').value);

  if (!titulo || !autor || !categoria_id) {
    showToast('Preencha todos os campos!', true);
    return;
  }

  const btn = document.querySelector('#modalOverlay .btn-primary');
  btn.disabled    = true;
  btn.textContent = editId ? 'Atualizando…' : 'Salvando…';

  try {
    if (editId) {
      await API.put(`/livros/${editId}`, { titulo, autor, categoria_id });
      showToast('✅ Livro atualizado!');
    } else {
      await API.post('/livros', { titulo, autor, categoria_id });
      showToast('✅ Livro cadastrado!');
    }
    closeModal();
    carregarLivros(document.getElementById('bookSearch').value.trim());
  } catch (err) {
    showToast(err.message, true);
  } finally {
    btn.disabled    = false;
    btn.textContent = editId ? 'Atualizar' : 'Salvar Livro';
  }
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg, err = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = 'toast show' + (err ? ' error' : '');
  setTimeout(() => t.classList.remove('show'), 3000);
}

document.getElementById('modalOverlay').addEventListener('click',
  e => { if (e.target === e.currentTarget) closeModal(); });

// ── Init ─────────────────────────────────────────────────────
carregarLivros();