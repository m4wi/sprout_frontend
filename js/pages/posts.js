const API_BASE = 'http://localhost:3000';
const token = localStorage.getItem('token');
const userStr = localStorage.getItem('usuario');
const currentUser = userStr ? JSON.parse(userStr) : null;
const currentUserId = currentUser?.id_user || currentUser?.id_usuario || currentUser?.id || null;

const filterButtons = document.querySelectorAll('.filter-btn');
const feedContainer = document.getElementById('feedContainer');
const chatContainer = document.getElementById('chatContainer');
const chatMessages = document.getElementById('chatMessages');
const chatSendBtn = document.getElementById('chatSendBtn');
const chatMessageInput = document.getElementById('chatMessageInput');
const chatAvatar = document.getElementById('chatAvatar');
const chatUsername = document.getElementById('chatUsername');
const chatSubtitle = document.getElementById('chatSubtitle');

let feedData = [];
let myReservations = [];
let activeChat = null;

function timeAgo(ts) {
  const d = new Date(ts);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'hace ' + diff + 's';
  if (diff < 3600) return 'hace ' + Math.floor(diff / 60) + 'm';
  if (diff < 86400) return 'hace ' + Math.floor(diff / 3600) + 'h';
  return d.toLocaleDateString();
}

async function fetchAllGreenpoints() {
  const res = await fetch(`${API_BASE}/greenpoints`);
  if (!res.ok) throw new Error('Error al cargar publicaciones');
  const data = await res.json();
  feedData = data.filter(gp => gp.status !== 'deleted');
}

async function fetchMyReservations() {
  if (!token) return;
  try {
    const res = await fetch(`${API_BASE}/api/reservations/my-reservations`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      myReservations = data.reservations || [];
    }
  } catch (e) {
    console.error('Error fetching reservations', e);
  }
}

async function fetchUser(id) {
  const res = await fetch(`${API_BASE}/users/${id}`);
  if (!res.ok) return null;
  return await res.json();
}

async function fetchComments(greenpointId) {
  const res = await fetch(`${API_BASE}/greenpoints/${greenpointId}/comments`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data?.comments) ? data.comments : [];
}

async function postComment(greenpointId, content) {
  if (!token) return null;
  const res = await fetch(`${API_BASE}/greenpoints/${greenpointId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ content })
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.comment || null;
}

async function createReservation(greenpointId) {
  if (!token) return false;
  const res = await fetch(`${API_BASE}/api/greenpoints/${greenpointId}/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ message: 'Solicitud de reserva' })
  });
  return res.ok;
}

function renderFeed(filter = 'all') {
  feedContainer.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'cards';
  const data = filter === 'mine' && currentUserId ? feedData.filter(gp => gp.id_citizen === currentUserId) : feedData.filter(gp => gp.id_citizen !== currentUserId);
  data.forEach(async gp => {
    const card = document.createElement('article');
    card.className = 'card';

    const user = await fetchUser(gp.id_citizen);
    const header = document.createElement('div');
    header.className = 'card-header';
    const avatar = document.createElement('img');
    avatar.className = 'avatar';
    avatar.src = user?.avatar_url ? `${API_BASE}/profile_photo/${user.avatar_url}.webp` : 'https://api.dicebear.com/7.x/initials/svg?seed=' + (user?.username || 'user');
    const hinfo = document.createElement('div');
    const uname = document.createElement('div');
    uname.className = 'username';
    uname.textContent = user ? `${user.name || ''} ${user.lastname || ''}`.trim() || (user.username || 'usuario') : 'usuario';
    const utime = document.createElement('div');
    utime.className = 'subtitle';
    utime.textContent = timeAgo(gp.created_at);
    hinfo.appendChild(uname);
    hinfo.appendChild(utime);
    header.appendChild(avatar);
    header.appendChild(hinfo);

    const body = document.createElement('div');
    body.className = 'card-body';
    const img = document.createElement('img');
    img.className = 'gp-image';
    img.src = 'https://images.unsplash.com/photo-1524594154231-9ded9b63e84c?w=800&auto=format&fit=crop&q=60';
    try {
      const photosRes = await fetch(`${API_BASE}/greenpoints/${gp.id_greenpoint}/photos`);
      if (photosRes.ok) {
        const photos = await photosRes.json();
        if (Array.isArray(photos) && photos.length > 0 && photos[0].url) {
          img.src = `${API_BASE}${photos[0].url}`;
        }
      }
    } catch { }
    const desc = document.createElement('p');
    desc.textContent = gp.description || '';
    const details = document.createElement('div');
    details.className = 'details';
    const materialText = Array.isArray(gp.categories) && gp.categories.length ? gp.categories.join(', ') : 'Sin datos';
    const firstMat = Array.isArray(gp.materials) && gp.materials.length ? gp.materials[0] : null;
    const cantidadText = firstMat ? `${firstMat.quantity || ''} ${firstMat.unit || ''} ${firstMat.description || ''}`.trim() : 'Sin datos';
    details.innerHTML = `
      <div><strong>Descripción:</strong> ${gp.description || ''}</div>
      <div><strong>Material:</strong> ${materialText}</div>
      <div><strong>Cantidad:</strong> ${cantidadText}</div>
      <div><strong>Horario:</strong> ${gp.hour || 'Sin horario'}</div>
      <div><strong>Teléfono:</strong> ${gp.phone || 'Sin teléfono'}</div>
      <div><strong>Dirección:</strong> ${gp.direction || 'Sin dirección'}</div>
    `;
    body.appendChild(img);
    body.appendChild(desc);
    body.appendChild(details);

    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const reserveBtn = document.createElement('button');
    reserveBtn.className = 'reserve-btn';

    // Logic for button state
    let btnText = 'Reservar';
    let btnClass = '';
    let btnDisabled = false;

    // 1. My publication
    if (currentUserId && gp.id_citizen === currentUserId) {
      btnText = 'Tu publicación';
      btnClass = 'btn-blue';
      btnDisabled = true;
    }
    // 2. Accepted (I am the collector)
    else if (currentUserId && gp.id_collector === currentUserId) {
      btnText = 'Aceptado';
      btnClass = 'btn-orange';
      btnDisabled = true;
    }
    // 3. Pending (I have a reservation but not accepted yet)
    else if (currentUserId && myReservations.some(r => r.id_greenpoint === gp.id_greenpoint && r.status === 'pending')) {
      btnText = 'Pendiente';
      btnClass = 'btn-yellow';
      btnDisabled = true;
    }
    // 4. Someone else accepted (id_collector is set but not me)
    else if (gp.id_collector && gp.id_collector !== currentUserId) {
      btnText = 'No disponible';
      btnDisabled = true;
      reserveBtn.style.opacity = '0.5';
    }

    reserveBtn.textContent = btnText;
    if (btnClass) reserveBtn.classList.add(btnClass);
    reserveBtn.disabled = btnDisabled;

    if (!btnDisabled) {
      reserveBtn.addEventListener('click', async () => {
        reserveBtn.disabled = true;
        const ok = await createReservation(gp.id_greenpoint);
        if (ok) {
          reserveBtn.textContent = 'Pendiente';
          reserveBtn.classList.add('btn-yellow');
          // Update local state
          myReservations.push({ id_greenpoint: gp.id_greenpoint, status: 'pending' });
        } else {
          reserveBtn.textContent = 'Error';
          reserveBtn.disabled = false;
        }
      });
    }

    const chatBtn = document.createElement('button');
    chatBtn.className = 'chat-btn';
    chatBtn.textContent = 'Chat';
    chatBtn.addEventListener('click', () => {
      activeChat = { user, greenpoint: gp };
      chatAvatar.src = avatar.src;
      chatUsername.textContent = uname.textContent;
      chatSubtitle.textContent = 'Conversación';
      chatMessages.innerHTML = '';
    });
    if (currentUserId && gp.id_citizen === currentUserId) {
      const editBtn = document.createElement('button');
      editBtn.className = 'chat-btn';
      editBtn.textContent = 'Editar';
      editBtn.addEventListener('click', () => {
        window.location.href = `/pages/new.html?id=${gp.id_greenpoint}`;
      });
      actions.appendChild(editBtn);
    }

    actions.appendChild(reserveBtn);
    actions.appendChild(chatBtn);

    const commentsWrap = document.createElement('div');
    commentsWrap.className = 'comments';
    const commentsList = document.createElement('div');
    commentsList.className = 'comments-list';
    const comments = await fetchComments(gp.id_greenpoint);
    comments.forEach(cm => {
      const item = document.createElement('div');
      item.className = 'comment-item';
      const cavatar = document.createElement('img');
      cavatar.className = 'avatar sm';
      cavatar.src = cm.user_avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=' + (cm.username || 'user');
      const cbody = document.createElement('div');
      const cname = document.createElement('div');
      cname.className = 'username';
      cname.textContent = cm.username || 'usuario';
      const ctext = document.createElement('div');
      ctext.className = 'comment-text';
      ctext.textContent = cm.content;
      cbody.appendChild(cname);
      cbody.appendChild(ctext);
      item.appendChild(cavatar);
      item.appendChild(cbody);
      commentsList.appendChild(item);
    });
    const commentForm = document.createElement('div');
    commentForm.className = 'comment-form';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Escribe un comentario';
    const send = document.createElement('button');
    send.textContent = 'Comentar';
    send.addEventListener('click', async () => {
      if (!input.value.trim()) return;
      const created = await postComment(gp.id_greenpoint, input.value.trim());
      if (created) {
        input.value = '';
        const item = document.createElement('div');
        item.className = 'comment-item';
        const cavatar = document.createElement('img');
        cavatar.className = 'avatar sm';
        cavatar.src = currentUser?.avatar_url || 'https://api.dicebear.com/7.x/initials/svg?seed=' + (currentUser?.username || 'yo');
        const cbody = document.createElement('div');
        const cname = document.createElement('div');
        cname.className = 'username';
        cname.textContent = currentUser?.username || 'yo';
        const ctext = document.createElement('div');
        ctext.className = 'comment-text';
        ctext.textContent = created.content;
        cbody.appendChild(cname);
        cbody.appendChild(ctext);
        item.appendChild(cavatar);
        item.appendChild(cbody);
        commentsList.appendChild(item);
      }
    });
    commentForm.appendChild(input);
    commentForm.appendChild(send);

    commentsWrap.appendChild(commentsList);
    commentsWrap.appendChild(commentForm);

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(actions);
    card.appendChild(commentsWrap);

    list.appendChild(card);
  });
  feedContainer.appendChild(list);
}

chatSendBtn.addEventListener('click', () => {
  const text = chatMessageInput.value.trim();
  if (!text || !activeChat) return;
  const bubble = document.createElement('div');
  bubble.className = 'msg msg-out';
  bubble.textContent = text;
  chatMessages.appendChild(bubble);
  chatMessageInput.value = '';
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

filterButtons.forEach(btn => {
  btn.addEventListener('click', async () => {
    filterButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    await fetchAllGreenpoints();
    renderFeed(btn.dataset.filter);
  });
});

(async () => {
  await Promise.all([fetchAllGreenpoints(), fetchMyReservations()]);
  renderFeed('all');
})();

