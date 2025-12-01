const API_BASE = 'http://localhost:3000';

const token = localStorage.getItem('token');
const usuarioStr = localStorage.getItem('usuario');
const usuario = usuarioStr ? JSON.parse(usuarioStr) : null;

const listEl = document.getElementById('collectorList');
const detailsEl = document.getElementById('detailsPanel');
const chatEl = document.getElementById('chatPanel');
const searchInput = document.getElementById('searchInput');

let myGreenpoints = [];
let currentSelection = null;

async function fetchMyCollections(status) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const url = new URL(`${API_BASE}/greenpoints/myCollections`);
  if (status) url.searchParams.set('status', status);
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error('No se pudieron cargar tus greenpoints');
  const data = await res.json();
  return data.greenpoints || [];
}

async function fetchGreenpoint(id) {
  const res = await fetch(`${API_BASE}/greenpoints/${id}`);
  if (!res.ok) throw new Error('No se pudo cargar el greenpoint');
  return await res.json();
}

async function fetchMaterials(id) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${API_BASE}/greenpoints/${id}/materials`, { headers });
  if (!res.ok) return { materials: [] };
  return await res.json();
}

async function fetchCategories(id) {
  const res = await fetch(`${API_BASE}/greenpoints/${id}/categories`);
  if (!res.ok) return [];
  return await res.json();
}

async function fetchChat(id) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${API_BASE}/greenpoints/${id}/chat`, { headers });
  if (!res.ok) return null;
  return await res.json();
}

async function sendChatMessage(greenpointId, content) {
  const headers = token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' };
  const res = await fetch(`${API_BASE}/greenpoints/${greenpointId}/chat/message`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content })
  });
  if (!res.ok) return null;
  return await res.json();
}

function renderList(items) {
  const q = (searchInput?.value || '').toLowerCase();
  const filtered = items.filter(gp => (gp.description || '').toLowerCase().includes(q));

  listEl.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'results-container';

  filtered.forEach(gp => {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.style.cursor = 'pointer';
    card.innerHTML = `
      <div>
        <p class="result-title">${gp.description || 'Sin descripción'}</p>
        <p class="result-subtitle">Estado: ${gp.status || 'N/A'}</p>
        <p class="result-subtitle">${gp.direction || ''}</p>
      </div>
    `;
    card.addEventListener('click', () => selectGreenpoint(gp.id_greenpoint));
    container.appendChild(card);
  });

  listEl.appendChild(container);
}

function renderDetails(gp, materials, categories, citizen) {
  const mats = (materials?.materials || []).map(m => `${m.quantity} ${m.unit || ''} ${m.description || ''}`.trim());
  const cats = (categories || []).map(c => c.name);

  detailsEl.innerHTML = `
    <div class="card">
      <div class="card-header">
        <img class="avatar" src="${citizen?.avatar_url ? citizen.avatar_url : 'https://api.dicebear.com/7.x/initials/svg?seed=' + (citizen?.username || 'user')}" />
        <div>
          <div class="username">${citizen ? `${citizen.name || ''} ${citizen.lastname || ''}`.trim() || (citizen.username || 'usuario') : 'usuario'}</div>
          <div class="subtitle">${new Date(gp.created_at).toLocaleString()}</div>
        </div>
      </div>
      <div class="card-body">
        <p>${gp.description || ''}</p>
        <div class="details">
          <div><strong>Dirección:</strong> ${gp.direction || 'Sin dirección'}</div>
          <div><strong>Horario:</strong> ${gp.hour || 'Sin horario'}</div>
          <div><strong>Materiales:</strong> ${mats.length ? mats.join(', ') : 'Sin materiales'}</div>
          <div><strong>Categorías:</strong> ${cats.length ? cats.join(', ') : 'Sin categorías'}</div>
        </div>
      </div>
    </div>
  `;
}

function renderChat(chat, greenpointId) {
  chatEl.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'chat-box';

  const header = document.createElement('div');
  header.className = 'chat-header';
  header.textContent = 'Chat del GreenPoint';
  box.appendChild(header);

  const msgs = document.createElement('div');
  msgs.className = 'chat-messages';
  (chat?.messages || []).forEach(m => {
    const bubble = document.createElement('div');
    bubble.className = m.sender_id === (usuario?.id_user || usuario?.id) ? 'msg msg-out' : 'msg msg-in';
    bubble.textContent = m.content;
    msgs.appendChild(bubble);
  });
  box.appendChild(msgs);

  const form = document.createElement('div');
  form.className = 'chat-input';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Escribe un mensaje...';
  const btn = document.createElement('button');
  btn.textContent = 'Enviar';
  btn.disabled = !token;
  btn.addEventListener('click', async () => {
    const content = input.value.trim();
    if (!content) return;
    btn.disabled = true;
    const created = await sendChatMessage(greenpointId, content);
    if (created) {
      const bubble = document.createElement('div');
      bubble.className = 'msg msg-out';
      bubble.textContent = created.content;
      msgs.appendChild(bubble);
      input.value = '';
      msgs.scrollTop = msgs.scrollHeight;
    }
    btn.disabled = false;
  });
  form.appendChild(input);
  form.appendChild(btn);
  box.appendChild(form);

  chatEl.appendChild(box);
}

async function selectGreenpoint(id) {
  currentSelection = id;
  try {
    const [gp, mats, cats] = await Promise.all([
      fetchGreenpoint(id),
      fetchMaterials(id),
      fetchCategories(id)
    ]);

    // Obtener datos del ciudadano/publicador
    let citizen = null;
    try {
      if (gp?.id_citizen) {
        const r = await fetch(`${API_BASE}/users/${gp.id_citizen}`);
        if (r.ok) citizen = await r.json();
      }
    } catch {}

    renderDetails(gp, mats, cats, citizen);

    const chat = await fetchChat(id);
    renderChat(chat, id);
  } catch (e) {
    detailsEl.innerHTML = '<p class="error-msg">No se pudo cargar los detalles.</p>';
    chatEl.innerHTML = '<p class="error-msg">No se pudo cargar el chat.</p>';
  }
}

async function init() {
  try {
    myGreenpoints = await fetchMyCollections();
    renderList(myGreenpoints);
  } catch (e) {
    listEl.innerHTML = '<p class="error-msg">Error al cargar tus greenpoints.</p>';
  }
}

searchInput?.addEventListener('input', () => renderList(myGreenpoints));

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
