const TYPE_LABEL = { employee: 'Funcionário', visitor: 'Visitante', contractor: 'Prestador' };
const TYPE_CLASS  = { employee: 'b-employee',  visitor: 'b-visitor',  contractor: 'b-contractor' };
const AVATAR_BG   = { employee: '#E1F5EE', visitor: '#E6F1FB', contractor: '#FAEEDA' };
const AVATAR_CLR  = { employee: '#085041', visitor: '#0C447C', contractor: '#633806' };

// ── Helpers ─────────────────────────────────────────────

function initials(name) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

let searchTimer = null;
function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadPortaria, 280);
}

// ── API ──────────────────────────────────────────────────

async function api(path, opts = {}) {
  const r = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error || 'Erro na requisição');
  }
  return r.json();
}

// ── Stats ────────────────────────────────────────────────

async function loadStats() {
  const s = await api('/api/stats');
  document.getElementById('s-total').textContent  = s.total;
  document.getElementById('s-inside').textContent = s.inside;
  document.getElementById('s-today').textContent  = s.today;
}

// ── Portaria ─────────────────────────────────────────────

async function loadPortaria() {
  const q = document.getElementById('search').value;
  const users = await api('/api/users' + (q ? `?q=${encodeURIComponent(q)}` : ''));
  const grid = document.getElementById('portaria-grid');

  if (!users.length) {
    grid.innerHTML = '<div class="empty">Nenhum usuário encontrado.</div>';
    loadStats();
    return;
  }

  grid.innerHTML = users.map(u => `
    <div class="ucard ${u.inside ? 'inside' : ''}">
      <div class="avatar" style="background:${AVATAR_BG[u.type]||'#eee'};color:${AVATAR_CLR[u.type]||'#333'}">${initials(u.name)}</div>
      <div class="uname">${u.name}</div>
      <span class="badge ${TYPE_CLASS[u.type]}">${TYPE_LABEL[u.type]}</span>
      ${u.doc ? `<div style="font-size:11px;color:var(--text2)">${u.doc}</div>` : ''}
      <span class="badge ${u.inside ? 'b-inside' : 'b-outside'}">${u.inside ? 'Dentro' : 'Fora'}</span>
      <button class="btn ${u.inside ? 'btn-red' : 'btn-green'} btn-full" onclick="toggleAccess(${u.id})">
        ${u.inside ? 'Registrar saída' : 'Registrar entrada'}
      </button>
    </div>`).join('');

  loadStats();
}

async function toggleAccess(id) {
  await api(`/api/users/${id}/toggle`, { method: 'POST' });
  loadPortaria();
}

// ── Cadastro ─────────────────────────────────────────────

async function createUser() {
  const name = document.getElementById('reg-name').value.trim();
  if (!name) { toast('Informe o nome do usuário'); return; }

  await api('/api/users', {
    method: 'POST',
    body: JSON.stringify({
      name,
      doc:  document.getElementById('reg-doc').value.trim(),
      type: document.getElementById('reg-type').value,
      obs:  document.getElementById('reg-obs').value.trim(),
    }),
  });

  document.getElementById('reg-name').value = '';
  document.getElementById('reg-doc').value  = '';
  document.getElementById('reg-obs').value  = '';
  toast('Usuário cadastrado!');
  loadUserList();
}

async function loadUserList() {
  const users = await api('/api/users');
  const el = document.getElementById('ulist');

  if (!users.length) {
    el.innerHTML = '<div class="empty">Nenhum usuário cadastrado.</div>';
    return;
  }

  el.innerHTML = users.map(u => `
    <div class="ulist-item">
      <div class="avatar" style="background:${AVATAR_BG[u.type]||'#eee'};color:${AVATAR_CLR[u.type]||'#333'};width:38px;height:38px;font-size:13px">${initials(u.name)}</div>
      <div class="ulist-info">
        <div class="ulist-name">${u.name}</div>
        <div class="ulist-sub">${TYPE_LABEL[u.type]}${u.doc ? ' · ' + u.doc : ''}${u.obs ? ' · ' + u.obs : ''}</div>
      </div>
      <button class="btn" style="font-size:12px;color:var(--red);border-color:var(--red)" onclick="deleteUser(${u.id})">Remover</button>
    </div>`).join('');
}

async function deleteUser(id) {
  if (!confirm('Remover este usuário?')) return;
  await api(`/api/users/${id}`, { method: 'DELETE' });
  toast('Usuário removido.');
  loadUserList();
  loadPortaria();
}

// ── Histórico ─────────────────────────────────────────────

async function loadLog() {
  const type = document.getElementById('f-type').value;
  const log = await api('/api/log' + (type ? `?type=${type}` : ''));
  const el = document.getElementById('log-list');

  if (!log.length) {
    el.innerHTML = '<div class="empty">Nenhum registro ainda.</div>';
    return;
  }

  el.innerHTML = log.map(l => `
    <div class="log-row">
      <div class="dot ${l.event_type === 'entry' ? 'dot-in' : 'dot-out'}"></div>
      <div class="log-name">${l.user_name}</div>
      <span class="badge ${TYPE_CLASS[l.user_type]}">${TYPE_LABEL[l.user_type]}</span>
      <span class="log-event" style="color:${l.event_type === 'entry' ? 'var(--green)' : 'var(--red)'}">
        ${l.event_type === 'entry' ? 'Entrada' : 'Saída'}
      </span>
      <span class="log-time">${fmtDate(l.timestamp)}</span>
    </div>`).join('');
}

async function clearLog() {
  if (!confirm('Limpar todo o histórico de acessos?')) return;
  await api('/api/log', { method: 'DELETE' });
  toast('Histórico limpo.');
  loadLog();
  loadStats();
}

// ── Backups ───────────────────────────────────────────────

async function createBackup() {
  const btn = document.getElementById('btn-backup');
  btn.disabled = true;
  btn.textContent = 'Criando...';
  try {
    const b = await api('/api/backup', { method: 'POST' });
    toast(`Backup criado: ${b.filename}`);
    loadBackupList();
  } catch (e) {
    toast('Erro ao criar backup: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Criar backup agora';
  }
}

async function loadBackupList() {
  const data = await api('/api/backup');
  const el = document.getElementById('backup-list');

  if (!data.backups.length) {
    el.innerHTML = '<div class="empty">Nenhum backup encontrado.</div>';
    return;
  }

  el.innerHTML = data.backups.map(b => `
    <div class="backup-item">
      <div class="backup-item-info">
        <div class="backup-item-name">${b.filename}</div>
        <div class="backup-item-meta">${fmtDate(b.created_at)} · ${fmtBytes(b.size_bytes)}</div>
      </div>
      <button class="btn" onclick="restoreBackup('${b.filename}')" style="font-size:12px">Restaurar</button>
      <a class="btn" href="/api/backup/${encodeURIComponent(b.filename)}/download" style="font-size:12px;text-decoration:none">Baixar</a>
      <button class="btn" onclick="deleteBackup('${b.filename}')" style="font-size:12px;color:var(--red);border-color:var(--red)">Excluir</button>
    </div>`).join('');
}

async function restoreBackup(filename) {
  if (!confirm(`Restaurar o backup "${filename}"?\nO banco atual será substituído.`)) return;
  try {
    await api(`/api/backup/${encodeURIComponent(filename)}/restore`, { method: 'POST' });
    toast('Backup restaurado com sucesso!');
    loadPortaria();
    loadStats();
  } catch (e) {
    toast('Erro ao restaurar: ' + e.message);
  }
}

async function deleteBackup(filename) {
  if (!confirm(`Excluir o backup "${filename}"?`)) return;
  await api(`/api/backup/${encodeURIComponent(filename)}`, { method: 'DELETE' });
  toast('Backup excluído.');
  loadBackupList();
}

// ── Tabs ──────────────────────────────────────────────────

function showTab(id) {
  const tabs = ['portaria', 'cadastro', 'historico', 'backups'];
  document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', tabs[i] === id));
  document.querySelectorAll('.section').forEach(s => s.classList.toggle('active', s.id === id));

  if (id === 'portaria')  loadPortaria();
  if (id === 'cadastro')  loadUserList();
  if (id === 'historico') loadLog();
  if (id === 'backups')   loadBackupList();
}

// ── Init ──────────────────────────────────────────────────
loadPortaria();
