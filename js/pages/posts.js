const API_BASE = 'http://localhost:3000';
const token = localStorage.getItem('token');
const userStr = localStorage.getItem('user');
const currentUser = userStr ? JSON.parse(userStr) : null;
const currentUserId = currentUser?.id_user || currentUser?.id_usuario || currentUser?.id || null;

const filterButtons = document.querySelectorAll('.filter-btn');
const feedContainer = document.getElementById('feedContainer');
const feedSection = document.getElementById('feedSection');
const chatContainer = document.getElementById('chatContainer');
const chatSection = document.getElementById('chatSection');
const chatMessages = document.getElementById('chatMessages');
const chatSendBtn = document.getElementById('chatSendBtn');
const chatMessageInput = document.getElementById('chatMessageInput');
const chatAvatar = document.getElementById('chatAvatar');
const chatUsername = document.getElementById('chatUsername');
const chatSubtitle = document.getElementById('chatSubtitle');
const mainContainer = document.getElementById('mainContainer');

let feedData = [];
let myReservations = [];
let activeChat = null;

// State for "Mis Publicaciones"
let myPage = 1;
const myLimit = 5;
let myTotalPages = 1;

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : {};
};


// Socket & Chat Helpers
let socket;

function initSocket() {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (typeof io !== 'undefined') {
        socket = io(API_BASE, {
            auth: { token }
        });

        socket.on('connect', () => {
            console.log('Connected to chat server');
            if (activeChat && activeChat.greenpointId) {
                socket.emit('join_room', { greenpoint_id: activeChat.greenpointId });
            }
        });

        socket.on('new_message', (msg) => {
            // Only append if it belongs to the current chat
            // We can check room or just append if activeChat matches
            if (activeChat && activeChat.greenpointId) {
                appendMessage(msg);
            }
        });

        socket.on('error', (err) => {
            console.error('Socket error:', err);
        });
    }
}

function appendMessage(msg) {
    if (!chatMessages) return;

    const div = document.createElement('div');
    // Check sender. msg.sender_id vs currentUser.id (or id_user)
    const myId = currentUser.id || currentUser.id_user;
    const isMe = msg.sender_id === myId;

    div.className = `msg ${isMe ? 'msg-out' : 'msg-in'}`;
    div.textContent = msg.content;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function loadChatHistory(greenpointId) {
    if (!chatMessages) return;
    chatMessages.innerHTML = '<div style="text-align:center; color:#888;">Cargando chat...</div>';

    try {
        const res = await fetch(`${API_BASE}/greenpoints/${greenpointId}/chat`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!res.ok) {
            if (res.status === 404) {
                chatMessages.innerHTML = '<div style="text-align:center; color:#888;">Inicio del chat</div>';
                return;
            }
            throw new Error('Error loading chat');
        }

        const data = await res.json();
        const messages = data.messages || [];

        chatMessages.innerHTML = '';
        if (messages.length === 0) {
            chatMessages.innerHTML = '<div style="text-align:center; color:#888;">No hay mensajes aún.</div>';
        } else {
            messages.forEach(msg => appendMessage(msg));
        }
    } catch (err) {
        console.error(err);
        chatMessages.innerHTML = '<div style="text-align:center; color:red;">Error al cargar mensajes.</div>';
    }
}

// Inject CSS for new features
const style = document.createElement('style');
style.textContent = `
  .photo-grid {
    display: grid;
    gap: 4px;
    width: 100%;
    height: 300px;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 1rem;
    cursor: pointer;
  }
  .photo-grid.one { grid-template-columns: 1fr; }
  .photo-grid.two { grid-template-columns: 1fr 1fr; }
  .photo-grid.three { grid-template-columns: 2fr 1fr; grid-template-rows: 1fr 1fr; }
  
  .photo-item { width: 100%; height: 100%; object-fit: cover; }
  .photo-grid.three .photo-item:nth-child(1) { grid-row: 1 / 3; }
  
  .photo-wrapper { position: relative; width: 100%; height: 100%; }
  .more-overlay {
    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5); color: white;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.5rem; font-weight: bold;
  }

  .category-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 1rem; }
  .category-tag {
    padding: 4px 12px; border-radius: 16px; color: white; font-size: 0.85rem; font-weight: 500;
  }

  .material-table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; font-size: 0.9rem; }
  .material-table th, .material-table td { padding: 8px; border-bottom: 1px solid #eee; text-align: left; }
  .material-table th { font-weight: 600; color: #555; }

  .pagination-controls { display: flex; justify-content: center; gap: 10px; margin-top: 20px; padding-bottom: 20px; }
  .page-btn { padding: 8px 16px; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 4px; }
  .page-btn.active { background: #007bff; color: white; border-color: #007bff; }
  .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .carousel-modal {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.9); z-index: 1000;
    display: flex; align-items: center; justify-content: center;
  }
  .carousel-img { max-width: 90%; max-height: 90vh; object-fit: contain; }
  .carousel-close { position: absolute; top: 20px; right: 20px; color: white; font-size: 2rem; cursor: pointer; }
  .carousel-prev, .carousel-next {
    position: absolute; top: 50%; transform: translateY(-50%);
    color: white; font-size: 2rem; cursor: pointer; padding: 20px;
  }
  .carousel-prev { left: 20px; }
  .carousel-next { right: 20px; }

  .edit-btn {
    background-color: #6c757d;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    margin-right: 8px;
  }
  .edit-btn:hover {
    background-color: #5a6268;
  }

  /* Chat Skeleton */
  .chat-skeleton {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 15px;
      height: 100%;
      justify-content: center;
      opacity: 0.6;
  }
  .skel-row { display: flex; gap: 10px; align-items: center; margin-bottom: 20px; }
  .skel-avatar { width: 40px; height: 40px; border-radius: 50%; background: #e0e0e0; }
  .skel-text-col { flex: 1; display: flex; flex-direction: column; gap: 8px; }
  .skel-line { height: 10px; background: #e0e0e0; border-radius: 4px; width: 100%; }
  .skel-line.short { width: 60%; }
  .skel-msg { height: 40px; width: 80%; background: #e0e0e0; border-radius: 8px; margin-bottom: 10px; }
  .skel-msg.right { align-self: flex-end; background: #d1e7dd; }
`;
document.head.appendChild(style);

function restoreChatUI() {
    const chatSection = document.getElementById('chatSection');
    if (!chatSection) return;

    // Check if chatContainer already exists and is valid
    if (document.getElementById('chatContainer')) return;

    chatSection.innerHTML = `
        <div id="chatContainer" class="chatbox">
            <div class="chat-header">
                <div class="chat-user">
                    <img id="chatAvatar" class="avatar" src="" alt="" style="display:none">
                    <div>
                        <div id="chatUsername" class="username"></div>
                        <div id="chatSubtitle" class="subtitle"></div>
                    </div>
                </div>
            </div>
            <div id="chatMessages" class="chat-messages">
                <!-- Skeleton State -->
                <div class="chat-skeleton">
                    <div class="skel-row">
                        <div class="skel-avatar"></div>
                        <div class="skel-text-col">
                            <div class="skel-line"></div>
                            <div class="skel-line short"></div>
                        </div>
                    </div>
                    <div class="skel-msg"></div>
                    <div class="skel-msg right"></div>
                    <div class="skel-msg"></div>
                    <div class="text-center text-gray-400 text-sm mt-4">Selecciona un chat para comenzar</div>
                </div>
            </div>
            <div class="chat-input">
                <input id="chatMessageInput" type="text" placeholder="Escribe un mensaje">
                <button id="chatSendBtn">Enviar</button>
            </div>
        </div>
        <!-- Modal for Materials (Restored) -->
        <div id="materialModal" class="modal" style="display:none;">
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h3>Agregar Material</h3>
                <div class="form-group">
                    <label>Cantidad</label>
                    <input type="number" id="matQuantity" step="0.001" required>
                </div>
                <div class="form-group">
                    <label>Unidad</label>
                    <select id="matUnit" style="padding: 0.75rem; border-radius: 12px; border: 2px solid #e8f5e9;">
                        <option value="kg">Kg</option>
                        <option value="unit">Unidad</option>
                        <option value="lt">Litros</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Descripción</label>
                    <input type="text" id="matDescription" placeholder="Detalles del material">
                </div>
                <button type="button" id="btnSaveMaterial" class="primary-btn">Guardar Material</button>
            </div>
        </div>
    `;

    // Re-bind global variables
    const newChatContainer = document.getElementById('chatContainer');
    const newChatMessages = document.getElementById('chatMessages');
    const newChatSendBtn = document.getElementById('chatSendBtn');
    const newChatMessageInput = document.getElementById('chatMessageInput');
    const newChatAvatar = document.getElementById('chatAvatar');
    const newChatUsername = document.getElementById('chatUsername');
    const newChatSubtitle = document.getElementById('chatSubtitle');

    // Re-attach event listeners
    if (newChatSendBtn) {
        newChatSendBtn.addEventListener('click', () => {
            const text = newChatMessageInput.value.trim();
            if (!text) return; // Allow sending even if no active chat for demo? No, check activeChat

            // If skeleton is present, clear it on first message? 
            // Or better, only allow sending if activeChat is set.
            if (!activeChat) {
                alert('Selecciona una publicación para chatear');
                return;
            }

            const bubble = document.createElement('div');
            bubble.className = 'msg msg-out';
            bubble.textContent = text;
            newChatMessages.appendChild(bubble);
            newChatMessageInput.value = '';
            newChatMessages.scrollTop = newChatMessages.scrollHeight;
        });
    }
}

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

function openCarousel(photos, startIndex = 0) {
    if (!photos || photos.length === 0) return;

    let currentIndex = startIndex;
    const modal = document.createElement('div');
    modal.className = 'carousel-modal';

    const img = document.createElement('img');
    img.className = 'carousel-img';
    img.src = photos[currentIndex].url.startsWith('http') ? photos[currentIndex].url : `${API_BASE}/greenpoint_photo/${photos[currentIndex].url}`;

    const closeBtn = document.createElement('div');
    closeBtn.className = 'carousel-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => modal.remove();

    const prevBtn = document.createElement('div');
    prevBtn.className = 'carousel-prev';
    prevBtn.innerHTML = '&#10094;';
    prevBtn.onclick = (e) => {
        e.stopPropagation();
        currentIndex = (currentIndex - 1 + photos.length) % photos.length;
        img.src = photos[currentIndex].url.startsWith('http') ? photos[currentIndex].url : `${API_BASE}/greenpoint_photo/${photos[currentIndex].url}`;
    };

    const nextBtn = document.createElement('div');
    nextBtn.className = 'carousel-next';
    nextBtn.innerHTML = '&#10095;';
    nextBtn.onclick = (e) => {
        e.stopPropagation();
        currentIndex = (currentIndex + 1) % photos.length;
        img.src = photos[currentIndex].url.startsWith('http') ? photos[currentIndex].url : `${API_BASE}/greenpoint_photo/${photos[currentIndex].url}`;
    };

    modal.appendChild(closeBtn);
    modal.appendChild(img);
    if (photos.length > 1) {
        modal.appendChild(prevBtn);
        modal.appendChild(nextBtn);
    }

    modal.onclick = () => modal.remove();
    document.body.appendChild(modal);
}

async function renderMyPosts(page = 1) {
    feedContainer.innerHTML = '<div style="text-align:center; padding: 20px;">Cargando mis publicaciones...</div>';

    try {
        const res = await fetch(`${API_BASE}/greenpoints/users/${currentUserId}?page=${page}&limit=${myLimit}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Error fetching my posts');

        const data = await res.json();
        const posts = data.greenpoints || [];
        myTotalPages = data.pagination.totalPages;
        myPage = data.pagination.currentPage;

        feedContainer.innerHTML = '';
        const list = document.createElement('div');
        list.className = 'cards';

        for (const gp of posts) {
            const card = document.createElement('article');
            card.className = 'card';

            // Header
            const header = document.createElement('div');
            header.className = 'card-header';

            const userSection = document.createElement('div');
            userSection.className = 'user-section';

            const avatar = document.createElement('img');
            avatar.className = 'avatar';
            avatar.src = currentUser?.avatar_url ? `${API_BASE}/profile_photo/${currentUser.avatar_url}.webp` : 'https://api.dicebear.com/7.x/initials/svg?seed=' + (currentUser?.username || 'user');

            const hinfo = document.createElement('div');
            const uname = document.createElement('div');
            uname.className = 'username';
            uname.textContent = `${currentUser.name || ''} ${currentUser.lastname || ''}`.trim() || currentUser.username;
            const utime = document.createElement('div');
            utime.className = 'subtitle';
            utime.textContent = timeAgo(gp.created_at);

            hinfo.appendChild(uname);
            hinfo.appendChild(utime);
            userSection.appendChild(avatar);
            userSection.appendChild(hinfo);

            header.appendChild(userSection);

            // Header Actions
            const headerActions = document.createElement('div');
            headerActions.className = 'header-actions';

            // View Reservations
            const viewResBtn = document.createElement('button');
            viewResBtn.className = 'header-action-btn';
            viewResBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>';
            viewResBtn.title = 'Ver Reservas';
            viewResBtn.onclick = () => {
                renderReservationsList(gp.id_greenpoint);
            };

            // Edit
            const editBtn = document.createElement('button');
            editBtn.className = 'header-action-btn';
            editBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
            editBtn.title = 'Editar';
            editBtn.onclick = async () => {
                try {
                    const headers = getAuthHeaders();
                    const response = await getGreenPointData(gp.id_greenpoint);
                    renderEditForm(response);
                    fillForm(response);
                } catch (error) {
                    console.error(error);
                }
            };

            // Delete
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'header-action-btn';
            deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';
            deleteBtn.title = 'Eliminar';
            deleteBtn.onclick = async () => {
                if (confirm('¿Estás seguro de eliminar esta publicación?')) {
                    await deleteGreenPoint(gp.id_greenpoint);
                    renderMyPosts(myPage);
                }
            };

            headerActions.appendChild(viewResBtn);

            // Chat Button (Only if reserved)
            if (gp.status === 'reserved') {
                const chatBtn = document.createElement('button');
                chatBtn.className = 'header-action-btn';
                chatBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
                chatBtn.title = 'Ir al Chat';
                chatBtn.onclick = () => {
                    // Restore chat UI if hidden
                    restoreChatUI();
                    const restoredChat = document.getElementById('chatContainer');
                    if (restoredChat) restoredChat.style.display = '';

                    // Start chat with this greenpoint
                    // We need to pass a user object, but for 'my posts', the other user is the collector.
                    // We might not have collector info here directly if 'gp' doesn't include it.
                    // But startChat usually expects a user object to display name/avatar.
                    // Let's check if 'gp' has collector info or if we need to fetch it.
                    // Assuming startChat handles it or we pass a placeholder.
                    // Actually, startChat expects (user).
                    // If we are the owner, we want to chat with the collector.
                    // Let's try to pass a constructed object or fetch details.

                    // Quick fix: Pass a dummy object or try to use what we have.
                    // Ideally, we should fetch the reservation to get the collector.
                    // But for now, let's just open the chat window and load history.

                    // We can reuse startChat logic but we need the other user's info for the header.
                    // Let's fetch the reservation details first to get the collector.
                    fetchReservationAndStartChat(gp.id_greenpoint);
                };
                headerActions.appendChild(chatBtn);
            }

            headerActions.appendChild(editBtn);
            headerActions.appendChild(deleteBtn);

            header.appendChild(headerActions);

            const body = document.createElement('div');
            body.className = 'card-body';

            // Photos Grid
            const photos = gp.photos || [];
            if (photos.length > 0) {
                const grid = document.createElement('div');
                grid.className = `photo-grid ${photos.length === 1 ? 'one' : photos.length === 2 ? 'two' : 'three'}`;

                const displayCount = Math.min(photos.length, 3);
                for (let i = 0; i < displayCount; i++) {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'photo-wrapper';
                    const img = document.createElement('img');
                    img.className = 'photo-item';
                    img.src = photos[i].url.startsWith('http') ? photos[i].url : `${API_BASE}/greenpoint_photo/${photos[i].url}`;

                    wrapper.appendChild(img);

                    // Overlay for 3+ photos on the 3rd item
                    if (i === 2 && photos.length > 3) {
                        const overlay = document.createElement('div');
                        overlay.className = 'more-overlay';
                        overlay.textContent = `+${photos.length - 3}`;
                        wrapper.appendChild(overlay);
                    }

                    grid.appendChild(wrapper);
                }
                grid.onclick = () => openCarousel(photos);
                body.appendChild(grid);
            }

            // Categories Tags
            const categories = gp.categories || [];
            if (categories.length > 0) {
                const tags = document.createElement('div');
                tags.className = 'category-tags';
                categories.forEach(cat => {
                    const tag = document.createElement('span');
                    tag.className = 'category-tag';
                    tag.textContent = cat.name;
                    tag.style.backgroundColor = cat.color || '#28a745';
                    tags.appendChild(tag);
                });
                body.appendChild(tags);
            }

            const desc = document.createElement('p');
            desc.textContent = gp.description || '';
            body.appendChild(desc);

            // Materials Table
            const materials = gp.materials || [];
            if (materials.length > 0) {
                const table = document.createElement('table');
                table.className = 'material-table';
                table.innerHTML = `
          <thead>
            <tr>
              <th>Material</th>
              <th>Cantidad</th>
              <th>Descripción</th>
            </tr>
          </thead>
          <tbody>
            ${materials.map(m => `
              <tr>
                <td>${m.description || 'Material'}</td>
                <td>${m.quantity} ${m.unit}</td>
                <td>${m.description || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        `;
                body.appendChild(table);
            }

            // Additional Details
            const details = document.createElement('div');
            details.className = 'details';
            details.innerHTML = `
        <div><strong>Horario:</strong> ${gp.hour || 'Sin horario'}</div>
        <div><strong>Dirección:</strong> ${gp.direction || 'Sin dirección'}</div>
      `;
            body.appendChild(details);

            // Actions
            const actions = document.createElement('div');
            actions.className = 'card-actions';

            // Toggle Comments Button
            const toggleCommentsBtn = document.createElement('button');
            toggleCommentsBtn.className = 'chat-btn';
            toggleCommentsBtn.textContent = 'Ver Comentarios';
            toggleCommentsBtn.onclick = () => {
                const isHidden = commentsWrap.style.display === 'none';
                commentsWrap.style.display = isHidden ? 'grid' : 'none';
                toggleCommentsBtn.textContent = isHidden ? 'Ocultar Comentarios' : 'Ver Comentarios';
            };

            actions.appendChild(toggleCommentsBtn);

            // Comments Section
            const commentsWrap = document.createElement('div');
            commentsWrap.className = 'comments';
            commentsWrap.style.display = 'none'; // Hidden by default

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
        }

        feedContainer.appendChild(list);

        // Pagination Controls
        if (myTotalPages > 1) {
            const pagDiv = document.createElement('div');
            pagDiv.className = 'pagination-controls';

            const prev = document.createElement('button');
            prev.className = 'page-btn';
            prev.textContent = 'Anterior';
            prev.disabled = myPage === 1;
            prev.onclick = () => renderMyPosts(myPage - 1);

            const next = document.createElement('button');
            next.className = 'page-btn';
            next.textContent = 'Siguiente';
            next.disabled = myPage === myTotalPages;
            next.onclick = () => renderMyPosts(myPage + 1);

            pagDiv.appendChild(prev);

            // Page numbers
            for (let i = 1; i <= myTotalPages; i++) {
                const pBtn = document.createElement('button');
                pBtn.className = `page-btn ${i === myPage ? 'active' : ''}`;
                pBtn.textContent = i;
                pBtn.onclick = () => renderMyPosts(i);
                pagDiv.appendChild(pBtn);
            }

            pagDiv.appendChild(next);
            feedContainer.appendChild(pagDiv);
        }

    } catch (err) {
        console.error(err);
        feedContainer.innerHTML = '<div style="text-align:center; color:red;">Error al cargar mis publicaciones</div>';
    }
}


async function getGreenPointData(id) {
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${API_BASE}/greenpoints/fulldata/${id}`, {
            method: 'GET',
            headers: headers
        });
        if (!response.ok) throw new Error('Error al obtener datos del punto verde');
        return await response.json();
    } catch (error) {
        console.error(error);
        return null;
    }
}


// State for "Todos"
let allPage = 1;
const allLimit = 5;
let allTotalPages = 1;

async function renderFeed(page = 1) {
    feedContainer.innerHTML = '<div style="text-align:center; padding: 20px;">Cargando publicaciones...</div>';

    try {
        const res = await fetch(`${API_BASE}/greenpoints/posts?page=${page}&limit=${allLimit}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Error al cargar publicaciones');

        const data = await res.json();
        const posts = data.greenpoints || [];
        allTotalPages = data.pagination.totalPages;
        allPage = data.pagination.currentPage;

        feedContainer.innerHTML = '';
        const list = document.createElement('div');
        list.className = 'cards';

        // Filter out my own posts from the main feed if needed, 
        // but the API returns everything. The user requirement implies "Todos" usually means everything except mine or literally everything.
        // The previous logic filtered out current user's posts: `gp.id_citizen !== currentUserId`
        // We will maintain that client-side filtering preference if desired, but since we are paginating, 
        // filtering client-side might mess up page size. 
        // However, the user said "similar structure to my publications", implying the visual structure.
        // Let's render what the API gives us, but maybe visually distinguish or just render them.
        // The original code did: `const data = feedData.filter(gp => gp.id_citizen !== currentUserId);`
        // If we want to strictly follow "Todos" usually implies public feed of others. 
        // For now, I will render all returned by API, but if it's mine, buttons will adapt (as per logic).

        // Actually, to respect the "feed" concept, usually you see others' posts. 
        // But with server-side pagination, we can't easily filter client-side without having gaps.
        // I will render all, and the button logic handles "Tu publicación".

        for (const gp of posts) {
            // Optional: Skip my own posts if strictly desired, but better to show them with "Tu publicación"
            // if (gp.id_citizen === currentUserId) continue;

            const card = document.createElement('article');
            card.className = 'card';

            // Header
            const header = document.createElement('div');
            header.className = 'card-header';

            const userSection = document.createElement('div');
            userSection.className = 'user-section';

            // We need user info. The API view 'view_greenpoints_details' has id_citizen but maybe not name/avatar?
            // The view has: g.* which includes id_citizen. 
            // We need to fetch user details or ensure the view has them. 
            // The previous code fetched user for each card: `const user = await fetchUser(gp.id_citizen);`
            // This is N+1 but we'll keep it to minimize backend changes unless requested.
            const user = await fetchUser(gp.id_citizen);

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
            userSection.appendChild(avatar);
            userSection.appendChild(hinfo);

            header.appendChild(userSection);

            // Header Actions
            const headerActions = document.createElement('div');
            headerActions.className = 'header-actions';

            // Report Button (Only if not my post)
            if (gp.id_citizen !== currentUserId) {
                const reportBtn = document.createElement('button');
                reportBtn.className = 'header-action-btn';
                reportBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>';
                reportBtn.title = 'Reportar';
                reportBtn.style.color = '#ef4444';
                reportBtn.onclick = () => openReportModal(gp.id_greenpoint);
                headerActions.appendChild(reportBtn);
            }

            header.appendChild(headerActions);

            const body = document.createElement('div');
            body.className = 'card-body';

            // Photos Grid
            const photos = gp.photos || [];
            if (photos.length > 0) {
                const grid = document.createElement('div');
                grid.className = `photo-grid ${photos.length === 1 ? 'one' : photos.length === 2 ? 'two' : 'three'}`;

                const displayCount = Math.min(photos.length, 3);
                for (let i = 0; i < displayCount; i++) {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'photo-wrapper';
                    const img = document.createElement('img');
                    img.className = 'photo-item';
                    img.src = photos[i].url.startsWith('http') ? photos[i].url : `${API_BASE}/greenpoint_photo/${photos[i].url}`;

                    wrapper.appendChild(img);

                    if (i === 2 && photos.length > 3) {
                        const overlay = document.createElement('div');
                        overlay.className = 'more-overlay';
                        overlay.textContent = `+${photos.length - 3}`;
                        wrapper.appendChild(overlay);
                    }

                    grid.appendChild(wrapper);
                }
                grid.onclick = () => openCarousel(photos);
                body.appendChild(grid);
            } else {
                // Fallback image if no photos, or just nothing? Original had a fallback unsplash image.
                // Let's keep it clean, if no photos, maybe just description.
            }

            // Categories Tags
            const categories = gp.categories || [];
            if (categories.length > 0) {
                const tags = document.createElement('div');
                tags.className = 'category-tags';
                categories.forEach(cat => {
                    const tag = document.createElement('span');
                    tag.className = 'category-tag';
                    tag.textContent = cat.name;
                    tag.style.backgroundColor = cat.color || '#28a745';
                    tags.appendChild(tag);
                });
                body.appendChild(tags);
            }

            const desc = document.createElement('p');
            desc.textContent = gp.description || '';
            body.appendChild(desc);

            // Materials Table
            const materials = gp.materials || [];
            if (materials.length > 0) {
                const table = document.createElement('table');
                table.className = 'material-table';
                table.innerHTML = `
            <thead>
                <tr>
                <th>Material</th>
                <th>Cantidad</th>
                <th>Descripción</th>
                </tr>
            </thead>
            <tbody>
                ${materials.map(m => `
                <tr>
                    <td>${m.description || 'Material'}</td>
                    <td>${m.quantity} ${m.unit}</td>
                    <td>${m.description || '-'}</td>
                </tr>
                `).join('')}
            </tbody>
            `;
                body.appendChild(table);
            }

            // Additional Details
            const details = document.createElement('div');
            details.className = 'details';
            details.innerHTML = `
            <div><strong>Horario:</strong> ${gp.hour || 'Sin horario'}</div>
            <div><strong>Dirección:</strong> ${gp.direction || 'Sin dirección'}</div>
        `;
            body.appendChild(details);

            // Actions
            const actions = document.createElement('div');
            actions.className = 'card-actions';
            const reserveBtn = document.createElement('button');
            reserveBtn.className = 'reserve-btn';

            // Logic for button state
            let btnText = 'Reservar';
            let btnClass = '';
            let btnDisabled = false;

            if (currentUserId && gp.id_citizen === currentUserId) {
                btnText = 'Tu publicación';
                btnClass = 'btn-blue';
                btnDisabled = true;
            }
            else if (gp.status === 'reserved') {
                btnText = 'Reservado';
                btnClass = 'btn-orange';
                btnDisabled = true;
            }
            else if (currentUserId && myReservations.some(r => r.id_greenpoint === gp.id_greenpoint && r.status === 'pending')) {
                btnText = 'Pendiente';
                btnClass = 'btn-yellow';
                btnDisabled = true;
                console.log(gp.id_greenpoint);
            }
            //else if (gp.id_collector && gp.id_collector !== currentUserId) {
            //    btnText = 'No disponible';
            //    btnDisabled = true;
            //    reserveBtn.style.opacity = '0.5';
            //}

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
                // Ensure UI is restored if missing
                restoreChatUI();

                // Start chat with the owner of the greenpoint
                startChat(user, gp.id_greenpoint);
            });

            // Toggle Comments Button
            const toggleCommentsBtn = document.createElement('button');
            toggleCommentsBtn.className = 'chat-btn';
            toggleCommentsBtn.textContent = 'Ver Comentarios';
            toggleCommentsBtn.onclick = () => {
                const isHidden = commentsWrap.style.display === 'none';
                commentsWrap.style.display = isHidden ? 'grid' : 'none';
                toggleCommentsBtn.textContent = isHidden ? 'Ocultar Comentarios' : 'Ver Comentarios';
            };

            actions.appendChild(reserveBtn);
            actions.appendChild(chatBtn);
            actions.appendChild(toggleCommentsBtn);

            // Comments Section
            const commentsWrap = document.createElement('div');
            commentsWrap.className = 'comments';
            commentsWrap.style.display = 'none'; // Hidden by default
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
        }
        feedContainer.appendChild(list);

        // Pagination Controls for All Posts
        if (allTotalPages > 1) {
            const pagDiv = document.createElement('div');
            pagDiv.className = 'pagination-controls';

            const prev = document.createElement('button');
            prev.className = 'page-btn';
            prev.textContent = 'Anterior';
            prev.disabled = allPage === 1;
            prev.onclick = () => renderFeed(allPage - 1);

            const next = document.createElement('button');
            next.className = 'page-btn';
            next.textContent = 'Siguiente';
            next.disabled = allPage === allTotalPages;
            next.onclick = () => renderFeed(allPage + 1);

            pagDiv.appendChild(prev);

            for (let i = 1; i <= allTotalPages; i++) {
                const pBtn = document.createElement('button');
                pBtn.className = `page-btn ${i === allPage ? 'active' : ''}`;
                pBtn.textContent = i;
                pBtn.onclick = () => renderFeed(i);
                pagDiv.appendChild(pBtn);
            }

            pagDiv.appendChild(next);
            feedContainer.appendChild(pagDiv);
        }

    } catch (err) {
        console.error(err);
        feedContainer.innerHTML = '<div style="text-align:center; color:red;">Error al cargar publicaciones</div>';
    }
}

chatSendBtn.addEventListener('click', () => {
    const text = chatMessageInput.value.trim();
    if (!text || !activeChat) return;

    // Determine GreenPoint ID: 
    // If we are in 'My Posts' mode (owner chatting with collector), activeChat.greenpointId is set.
    // If we are in 'Feed' mode (collector chatting with owner), activeChat might be the owner user object, 
    // but we need the greenpoint ID. 
    // In 'startChat' (feed mode), we should probably attach the GP ID to activeChat as well.
    // Let's assume activeChat has greenpointId property now.

    const gpId = activeChat.greenpointId;

    if (!gpId) {
        console.error('No GreenPoint ID found for chat');
        return;
    }

    // Emit via socket
    if (socket && socket.connected) {
        socket.emit('send_message', {
            greenpoint_id: gpId,
            content: text
        });
    }

    // Optimistic UI update (optional, as socket will echo back)
    // But let's wait for echo to avoid duplicates if we don't handle IDs
    // For now, clear input
    chatMessageInput.value = '';
});

filterButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Hide edit container if exists when switching tabs
        const editContainer = document.getElementById('editContainer');
        if (editContainer) editContainer.remove();

        if (btn.dataset.filter === 'mine') {
            if (chatContainer) chatContainer.style.display = 'none';
            if (mainContainer) mainContainer.style.gridTemplateColumns = ' 250px 3fr 2fr'
            await renderMyPosts(1);
        } else {
            restoreChatUI();
            const restoredChat = document.getElementById('chatContainer');
            if (restoredChat) restoredChat.style.display = '';

            if (mainContainer) mainContainer.style.gridTemplateColumns = ' 250px 1fr 350px'
            renderFeed(1);
        }
    });
});



const createEditForm = () =>
    `
    <div class="filters-section">
        <h2>Registrar Nuevo GreenPoint</h2>
        <p>Selecciona la ubicación en el mapa y completa los datos.</p>
        <form id="editGreenpointForm" class="add-form">
        <!-- Basic Info -->
        <div class="form-group">
            <label>Descripción</label>
            <input type="text" id="gpDescription" placeholder="Ej: Contenedor en la plaza" required>
        </div>
        <div class="form-group">
            <label>Dirección</label>
            <input type="text" id="gpDirection" placeholder="Ej: Av. Bolognesi 123" required>
        </div>
        <div class="form-group">
            <label>Horario de Atención</label>
            <input type="text" id="gpHour" placeholder="Ej: 9:00 AM - 6:00 PM">
        </div>
        <div class="form-group">
            <label>Fecha de Recogida</label>
            <input type="date" id="gpDateCollect">
        </div>

        <!-- Categories -->
        <div class="form-group">
            <label>Categorías</label>
            <div class="checkbox-group" id="gpCategoriesContainer">
                <label><input type="checkbox" value="1"> Plástico</label>
                <label><input type="checkbox" value="2"> Cartón</label>
                <label><input type="checkbox" value="3"> Metal</label>
                <label><input type="checkbox" value="4"> Vidrio</label>
                <label><input type="checkbox" value="5"> Papel</label>
            </div>
        </div>

        <!-- Materials -->
        <div class="form-group">
            <label>Materiales</label>
            <ul id="materialsList" class="materials-list">
                <!-- Items added via modal will appear here -->
            </ul>
            <button type="button" id="btnAddMaterial" class="secondary-btn">+ Agregar Material</button>
        </div>

        <!-- Images -->
        <div class="form-group">
            <label>Imágenes</label>
            <input type="file" id="gpImages" multiple accept="image/*">
        </div>

        <div class="form-map__button">
            <div class="form-group">
                <label>Coordenadas</label>
                <input type="text"  id="gpCoords" placeholder="Selecciona en el mapa" readonly required>
            </div>

            <input type="button" class="map-select" value="Abrir Mapa" onclick="openFormMap()">
        </div>
        <button type="submit" class="submit-btn">Actualizar GreenPoint</button>
    </form>
  </div>
`
let rendedEditForm = false;

let materials = [];

function renderEditForm(gp) {
    // Ensure the third column is visible and has space
    if (mainContainer) mainContainer.style.gridTemplateColumns = '250px 3fr 2fr';

    // Hide chat container
    if (chatContainer) chatContainer.style.display = 'none';

    // Remove existing edit container
    const existing = document.getElementById('editContainer');
    if (existing) existing.remove();


    if (!rendedEditForm) {
        chatSection.insertAdjacentHTML('beforeend', createEditForm(gp));
        rendedEditForm = true;
    } else {
        chatSection.innerHTML = '';
        chatSection.insertAdjacentHTML('beforeend', createEditForm(gp));
    }


    const materialModal = document.getElementById('materialModal');
    const btnAddMaterial = document.getElementById('btnAddMaterial');
    const btnSaveMaterial = document.getElementById('btnSaveMaterial');
    const materialsList = document.getElementById('materialsList');
    const closeModal = document.querySelector('.close-modal');

    if (btnAddMaterial && materialModal) {
        btnAddMaterial.addEventListener('click', () => {
            materialModal.style.display = 'flex';
            // Limpiar inputs del modal
            document.getElementById('matQuantity').value = '';
            document.getElementById('matDescription').value = '';
        });
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            materialModal.style.display = 'none';
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === materialModal) {
            materialModal.style.display = 'none';
        }
    });

    if (btnSaveMaterial) {
        btnSaveMaterial.addEventListener('click', () => {
            const quantity = parseFloat(document.getElementById('matQuantity').value);
            const unit = document.getElementById('matUnit').value;
            const description = document.getElementById('matDescription').value;

            if (isNaN(quantity) || quantity <= 0) {
                alert('Ingresa una cantidad válida.');
                return;
            }

            const material = { quantity, unit, description };
            materials.push(material);

            // Actualizar UI
            renderMaterialsList(materialsList, materials);
            materialModal.style.display = 'none';
        });
    }
}







function renderMaterialsList(materialsList, materials) {
    if (!materialsList) return;
    materialsList.innerHTML = '';
    materials.forEach((mat, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
                <span>${mat.quantity} ${mat.unit} - ${mat.description || ''}</span>
                <button type="button" style="color:red; background:none; border:none; cursor:pointer;" onclick="removeMaterial(${index})">❌</button>
            `;
        materialsList.appendChild(li);
    });
}


window.removeMaterial = (index) => {
    const materialsList = document.getElementById('materialsList');
    materials.splice(index, 1);
    renderMaterialsList(materialsList, materials);
};


function fillForm(greenpoint) {

    function renderLocalMaterialsList(materials) {
        if (!materialsList) return;
        materialsList.innerHTML = '';
        materials.forEach((mat, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${mat.quantity} ${mat.unit} - ${mat.description || ''}</span>
                <button type="button" style="color:red; background:none; border:none; cursor:pointer;" onclick="removeMaterial(${index})">❌</button>
            `;
            materialsList.appendChild(li);
        });
    }

    const description = document.getElementById('gpDescription');
    const direction = document.getElementById('gpDirection');
    const hour = document.getElementById('gpHour');
    const date_collect = document.getElementById('gpDateCollect');
    const coordsInput = document.getElementById('gpCoords');
    const checkboxes = document.querySelectorAll('#gpCategoriesContainer input[type="checkbox"]');
    const materialsList = document.getElementById('materialsList');

    const categoryIds = greenpoint.categories.map(cat => cat.id);
    checkboxes.forEach(cb => {
        cb.checked = categoryIds.includes(parseInt(cb.value));
    });
    description.value = greenpoint.description;
    direction.value = greenpoint.direction;
    hour.value = greenpoint.hour;
    date_collect.value = greenpoint.date_collect.substring(0, 10);
    coordsInput.value = `${greenpoint.coordinates.x},${greenpoint.coordinates.y}`;
    materials = greenpoint.materials;
    renderLocalMaterialsList(greenpoint.materials);

    // const imagesInput = document.getElementById('gpImages');



    //const [lat, lng] = coordsInput.split(',').map(s => parseFloat(s.trim()));

    // const submitBtn = addForm.querySelector('.submit-btn');
    //submitBtn.disabled = true;
    //submitBtn.textContent = 'Procesando...';
}



const editForm = document.getElementById('editGreenpointForm');
if (editForm) {
    // Remove existing listeners to avoid duplicates if renderEditForm is called multiple times
    const newEditForm = editForm.cloneNode(true);
    editForm.parentNode.replaceChild(newEditForm, editForm);

    newEditForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const userStr = localStorage.getItem('user');
        if (!userStr) {
            alert('Debes iniciar sesión.');
            return;
        }

        // Validations
        const coordsStr = document.getElementById('gpCoords').value;
        if (!coordsStr) {
            alert('Selecciona una ubicación en el mapa.');
            return;
        }

        const selectedCategories = Array.from(document.querySelectorAll('.checkbox-group input:checked'))
            .map(cb => parseInt(cb.value));

        if (selectedCategories.length === 0) {
            alert('Selecciona al menos una categoría.');
            return;
        }

        const description = document.getElementById('gpDescription').value;
        const direction = document.getElementById('gpDirection').value;
        const hour = document.getElementById('gpHour').value;
        const date_collect = document.getElementById('gpDateCollect').value;
        const imagesInput = document.getElementById('gpImages');

        const [lat, lng] = coordsStr.split(',').map(s => parseFloat(s.trim()));

        const submitBtn = newEditForm.querySelector('.submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Actualizando...';

        try {
            const headers = getAuthHeaders();
            const gpId = gp.id_greenpoint;

            // 1. Update Basic Info
            const updatePayload = {
                description,
                direction,
                hour,
                date_collect,
                coordinates: { latitude: lat, longitude: lng },
                // status: 'created' // Optional: reset status if needed
            };

            const res = await fetch(`${API_BASE}/greenpoints/${gpId}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(updatePayload)
            });

            if (!res.ok) throw new Error('Error al actualizar información básica');

            // 2. Update Categories
            await fetch(`${API_BASE}/greenpoints/${gpId}/categories`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ categoryIds: selectedCategories })
            });

            // 3. Add NEW Materials (Filter out existing ones to avoid duplicates if logic allows, 
            // but here we only have the list 'materials'. 
            // Ideally we should distinguish between new and existing. 
            // For now, we'll assume 'materials' array contains what the user wants.
            // However, the backend 'createManyMaterial' inserts. 
            // We need to filter those that don't have an ID or handle this better.
            // As a simplification matching 'insert' form: we only add *newly added* materials from the session.
            // But 'materials' array currently holds ALL materials (loaded from DB + new).
            // We need to identify which are new.
            const newMaterials = materials.filter(m => !m.id_greenpoint_material);

            if (newMaterials.length > 0) {
                await fetch(`${API_BASE}/greenpoints/${gpId}/materials`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ materials: newMaterials })
                });
            }

            // 4. Upload NEW Images
            if (imagesInput.files.length > 0) {
                submitBtn.textContent = 'Subiendo imágenes...';
                for (const file of imagesInput.files) {
                    const formData = new FormData();
                    formData.append('photo', file);

                    await fetch(`${API_BASE}/greenpoints/${gpId}/photos`, {
                        method: 'POST',
                        headers: {
                            'Authorization': headers['Authorization']
                        },
                        body: formData
                    });
                }
            }

            alert('¡GreenPoint actualizado exitosamente!');

            // Refresh feed or UI
            // renderFeed(); // If available
            window.location.reload(); // Simple refresh to show changes

        } catch (error) {
            console.error('Error al actualizar:', error);
            alert('Error al actualizar: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Actualizar GreenPoint';
        }
    });
}


// Map Modal Logic
let formMap;
let formMarker;
let tempCoords = null;

window.openFormMap = function () {
    const modal = document.getElementById('mapModal');
    modal.style.display = 'flex';

    // Initialize map if not already done
    if (!formMap) {
        initFormMap();
    } else {
        formMap.invalidateSize();
    }
}

function initFormMap() {
    // Default to Tacna
    const defaultLat = -18.0146;
    const defaultLng = -70.2525;

    formMap = L.map('formMapContainer').setView([defaultLat, defaultLng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(formMap);

    formMap.on('click', onMapClick);
}

function onMapClick(e) {
    const { lat, lng } = e.latlng;
    tempCoords = { lat, lng };

    if (formMarker) {
        formMarker.setLatLng(e.latlng);
    } else {
        formMarker = L.marker(e.latlng).addTo(formMap);
    }
}

// Modal Buttons
document.addEventListener('DOMContentLoaded', () => {
    const cancelBtn = document.getElementById('cancelMapBtn');
    const confirmBtn = document.getElementById('confirmMapBtn');
    const modal = document.getElementById('mapModal');

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            // Reset temp marker if needed, or keep it? 
            // Usually cancel means discard changes, but here we just close.
        });
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            if (tempCoords) {
                const coordsInput = document.getElementById('gpCoords');
                if (coordsInput) {
                    coordsInput.value = `${tempCoords.lat.toFixed(6)}, ${tempCoords.lng.toFixed(6)}`;
                }
                modal.style.display = 'none';
            } else {
                alert('Por favor selecciona una ubicación en el mapa');
            }
        });
    }
});



async function acceptReservation(reservationId) {
    try {
        const headers = getAuthHeaders();
        const res = await fetch(`${API_BASE}/api/reservations/${reservationId}/accept`, {
            method: 'PATCH',
            headers: headers
        });
        if (!res.ok) throw new Error('Error al aceptar reserva');
        return true;
    } catch (err) {
        console.error(err);
        alert('Error al aceptar la reserva');
        return false;
    }
}

async function renderReservationsList(greenpointId) {
    const chatSection = document.getElementById('chatSection');
    // Save original content if needed? For now just overwrite as per request.
    chatSection.innerHTML = '<div style="padding:20px; text-align:center;">Cargando reservas...</div>';

    try {
        const headers = getAuthHeaders();
        const res = await fetch(`${API_BASE}/api/greenpoints/${greenpointId}/reservations?status=pending`, {
            headers: headers
        });

        if (!res.ok) throw new Error('Error al obtener reservas');

        const data = await res.json();
        const reservations = data.reservations || [];

        chatSection.innerHTML = '';

        const container = document.createElement('div');
        container.className = 'chatbox';

        const header = document.createElement('div');
        header.className = 'chat-header';
        header.innerHTML = '<h3>Interesados</h3>';
        container.appendChild(header);

        const list = document.createElement('div');
        list.className = 'chat-messages';

        if (reservations.length === 0) {
            list.innerHTML = '<div style="padding:20px; text-align:center; color:#666;">No hay reservas pendientes.</div>';
        } else {
            for (const r of reservations) {
                const item = document.createElement('div');
                item.className = 'reservation-item';
                item.style.cssText = 'padding: 10px; border-bottom: 1px solid #eee; display: flex; flex-direction: column; gap: 10px;';

                // User Info
                const userDiv = document.createElement('div');
                userDiv.style.cssText = 'display: flex; align-items: center; gap: 10px;';

                const avatar = document.createElement('img');
                avatar.className = 'avatar sm';
                avatar.src = r.collector_avatar ? `${API_BASE}/profile_photo/${r.collector_avatar}.webp` : 'https://api.dicebear.com/7.x/initials/svg?seed=' + (r.collector_username || 'user');

                const info = document.createElement('div');
                const name = document.createElement('div');
                name.className = 'username';
                name.textContent = `${r.collector_name || ''} ${r.collector_lastname || ''}`.trim() || r.collector_username;
                const time = document.createElement('div');
                time.className = 'subtitle';
                time.textContent = timeAgo(r.created_at);

                info.appendChild(name);
                info.appendChild(time);
                userDiv.appendChild(avatar);
                userDiv.appendChild(info);

                // Buttons
                const actionsDiv = document.createElement('div');
                actionsDiv.style.cssText = 'display: flex; gap: 10px;';

                const profileBtn = document.createElement('button');
                profileBtn.textContent = 'Ver Perfil';
                profileBtn.className = 'secondary-btn';
                profileBtn.style.fontSize = '0.8rem';
                profileBtn.style.padding = '0.4rem 0.8rem';
                profileBtn.onclick = () => alert(`Ver perfil de: ${r.collector_username}`);

                const acceptBtn = document.createElement('button');
                acceptBtn.textContent = 'Aceptar';
                acceptBtn.className = 'submit-btn'; // Use submit-btn style (green)
                acceptBtn.style.fontSize = '0.8rem';
                acceptBtn.style.padding = '0.4rem 0.8rem';
                acceptBtn.onclick = async () => {
                    if (confirm(`¿Aceptar a ${r.collector_username} como recolector?`)) {
                        const success = await acceptReservation(r.id_reservation);
                        if (success) {
                            alert('Reserva aceptada exitosamente');
                            renderReservationsList(greenpointId); // Refresh list
                            renderMyPosts(myPage); // Refresh posts to show "Aceptado" status
                        }
                    }
                };

                actionsDiv.appendChild(profileBtn);
                actionsDiv.appendChild(acceptBtn);

                item.appendChild(userDiv);
                item.appendChild(actionsDiv);
                list.appendChild(item);
            }
        }

        container.appendChild(list);
        chatSection.appendChild(container);

    } catch (error) {
        console.error(error);
        chatSection.innerHTML = '<div style="padding:20px; text-align:center; color:red;">Error al cargar reservas</div>';
    }
}

async function deleteGreenPoint(id) {
    try {
        const headers = getAuthHeaders();
        const res = await fetch(`${API_BASE}/greenpoints/${id}`, {
            method: 'PATCH',
            headers: headers,
            body: JSON.stringify({
                status: 'deleted'
            })
        });
        if (!res.ok) throw new Error('Error al eliminar greenpoint');
        return true;
    } catch (err) {
        console.error(err);
        alert('Error al eliminar la publicación');
        return false;
    }
}


async function fetchReservationAndStartChat(greenpointId) {
    try {
        const headers = getAuthHeaders();
        const res = await fetch(`${API_BASE}/api/greenpoints/${greenpointId}/reservations?status=accepted`, {
            headers
        });

        if (!res.ok) throw new Error('Error al obtener información del chat');

        const data = await res.json();
        const reservations = data.reservations || [];
        const accepted = reservations.find(r => r.status === 'accepted') || (reservations.length > 0 && reservations[0].status === 'accepted' ? reservations[0] : null);

        if (accepted) {
            const collector = {
                id: accepted.id_collector,
                username: accepted.collector_username,
                avatar_url: accepted.collector_avatar
            };

            activeChat = collector;
            activeChat.greenpointId = greenpointId;

            const chatAvatar = document.getElementById('chatAvatar');
            const chatUsername = document.getElementById('chatUsername');
            const chatSubtitle = document.getElementById('chatSubtitle');

            if (chatAvatar) {
                chatAvatar.src = collector.avatar_url
                    ? `${API_BASE}/profile_photo/${collector.avatar_url}.webp`
                    : `https://api.dicebear.com/7.x/initials/svg?seed=${collector.username}`;
                chatAvatar.style.display = 'block';
            }
            if (chatUsername) chatUsername.textContent = collector.username;
            if (chatSubtitle) chatSubtitle.textContent = 'Recolector';

            loadChatHistory(greenpointId);

            if (socket && socket.connected) {
                socket.emit('join_room', { greenpoint_id: greenpointId });
            }

            if (chatContainer) chatContainer.style.display = 'flex';
            if (mainContainer) mainContainer.style.gridTemplateColumns = '250px 3fr 2fr';

        } else {
            alert('No se encontró un recolector asignado para este GreenPoint.');
        }

    } catch (err) {
        console.error(err);
        alert('Error al iniciar el chat: ' + err.message);
    }
}

(async () => {
    initSocket();
    await fetchMyReservations();
    renderFeed(1);
})();


// Report Modal Logic
function openReportModal(greenpointId) {
    const modal = document.getElementById('reportModal');
    const form = document.getElementById('reportForm');
    const gpIdInput = document.getElementById('reportGreenpointId');

    if (modal && form && gpIdInput) {
        gpIdInput.value = greenpointId;
        form.reset();
        modal.style.display = 'flex';
    }
}

const reportModal = document.getElementById('reportModal');
const closeReportModal = document.getElementById('closeReportModal');
const reportForm = document.getElementById('reportForm');

if (closeReportModal) {
    closeReportModal.onclick = () => reportModal.style.display = 'none';
}

if (reportModal) {
    window.onclick = (event) => {
        if (event.target == reportModal) {
            reportModal.style.display = "none";
        }
    }
}

if (reportForm) {
    reportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id_greenpoint = document.getElementById('reportGreenpointId').value;
        const type = document.getElementById('reportType').value;
        const message = document.getElementById('reportMessage').value;

        try {
            const res = await fetch(`${API_BASE}/reports`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ id_greenpoint, type, message })
            });

            if (res.ok) {
                alert('Reporte enviado correctamente.');
                reportModal.style.display = 'none';
            } else {
                const err = await res.json();
                alert('Error al enviar reporte: ' + (err.error || 'Desconocido'));
            }
        } catch (error) {
            console.error(error);
            alert('Error de conexión al enviar reporte.');
        }
    });
}

