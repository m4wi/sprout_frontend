const API_BASE = 'http://57.154.66.87:3000';

const listActive = document.getElementById('list-active');
const listFinished = document.getElementById('list-finished');

function renderList(container, items, isActive) {
    container.innerHTML = '';
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'list-item';

        const badgeClass = isActive ? 'badge reserved' : 'badge finished';
        const badgeText = isActive ? 'Reservado' : 'Finalizado';

        // Format date
        const dateObj = new Date(item.created_at);
        const dateStr = dateObj.toLocaleDateString();

        // Icons
        const trashIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M7 21q-.825 0-1.412-.587T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.587 1.413T17 21zM17 6H7v13h10zM9 17h2V8H9zm4 0h2V8h-2zM7 6v13z"/></svg>`;
        const closeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/></svg>`;

        div.innerHTML = `
            <div class="item-header">
                <div>
                    <p class="item-title">${item.description || 'Sin título'}</p>
                    <p class="item-date">${dateStr}</p>
                </div>
                <div class="item-actions">
                    <span class="${badgeClass}">${badgeText}</span>
                    <button class="action-btn" title="${isActive ? 'Cancelar Reserva' : 'Eliminar'}">
                        ${isActive ? trashIcon : closeIcon}
                    </button>
                </div>
            </div>
        `;

        const btn = div.querySelector('.action-btn');
        btn.onclick = (e) => {
            e.stopPropagation();
            if (isActive) {
                // Handle Trash (Cancel Reservation)
                if (confirm('¿Estás seguro de cancelar esta reserva?')) {
                    // Ideally call API to cancel
                    console.log('Cancelling reservation for greenpoint:', item.id_greenpoint);
                    // For now, just remove from UI to simulate
                    div.remove();
                }
            } else {
                // Handle X (Remove from list)
                if (confirm('¿Eliminar de la lista?')) {
                    div.remove();
                }
            }
        };

        div.onclick = () => {
            document.querySelectorAll('.list-item').forEach(el => el.classList.remove('active-item'));
            div.classList.add('active-item');
            loadDetails(item);
        };
        container.appendChild(div);
    });
}

let socket;
let currentGreenpointId = null;
let currentUser = null;

// Initialize Socket
function initSocket() {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Decode user info from token (simple decode)
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        currentUser = payload;
    } catch (e) {
        console.error('Error decoding token', e);
    }

    socket = io(API_BASE, {
        auth: { token }
    });

    socket.on('connect', () => {
        console.log('Connected to chat server');
        if (currentGreenpointId) {
            socket.emit('join_room', { greenpoint_id: currentGreenpointId });
        }
    });

    socket.on('new_message', (msg) => {
        // Only append if it belongs to the current chat
        // (Though room logic handles this, extra safety or UI update)
        appendMessage(msg);
    });

    socket.on('error', (err) => {
        console.error('Socket error:', err);
    });
}

// Chat UI Functions
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.querySelector('.chat-input');
const sendBtn = document.querySelector('.btn-send');

function appendMessage(msg) {
    if (!chatMessages) return;

    const div = document.createElement('div');
    const isMe = msg.sender_id === currentUser.id;
    div.className = `message ${isMe ? 'sent' : 'received'}`;
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

// Send Message Logic
function sendMessage() {
    const content = chatInput.value.trim();
    if (!content || !currentGreenpointId || !socket) return;

    socket.emit('send_message', {
        greenpoint_id: currentGreenpointId,
        content
    });

    chatInput.value = '';
}

if (sendBtn) {
    sendBtn.onclick = sendMessage;
}
if (chatInput) {
    chatInput.onkeypress = (e) => {
        if (e.key === 'Enter') sendMessage();
    };
}


// --- Existing Logic Updated ---

let currentCitizenData = null;

// Modal Elements
const modal = document.getElementById('profile-modal');
const modalCloseBtn = document.querySelector('.modal-close');
const btnProfile = document.querySelector('.btn-profile');

// Modal Functions
function openProfileModal() {
    if (!currentCitizenData || !modal) return;

    // Populate Modal
    document.getElementById('modal-avatar').src = currentCitizenData.avatar_url
        ? `${API_BASE}/profile_photo/${currentCitizenData.avatar_url}.webp`
        : `https://api.dicebear.com/7.x/initials/svg?seed=${currentCitizenData.username}`;

    document.getElementById('modal-name').textContent = `${currentCitizenData.name} ${currentCitizenData.lastname}`;
    document.getElementById('modal-username').textContent = `@${currentCitizenData.username}`;
    document.getElementById('modal-email').textContent = currentCitizenData.email || 'No especificado';
    document.getElementById('modal-phone').textContent = currentCitizenData.phone || 'No especificado';
    document.getElementById('modal-address').textContent = currentCitizenData.direction || 'No especificado';
    document.getElementById('modal-type').textContent = currentCitizenData.user_type || 'Ciudadano';
    document.getElementById('modal-desc').textContent = currentCitizenData.profile_description || 'Sin descripción';

    // Show Modal
    modal.classList.add('active');
}

function closeProfileModal() {
    if (modal) modal.classList.remove('active');
}

// Event Listeners
if (btnProfile) btnProfile.onclick = openProfileModal;
if (modalCloseBtn) modalCloseBtn.onclick = closeProfileModal;
if (modal) {
    modal.onclick = (e) => {
        if (e.target === modal) closeProfileModal();
    };
}

// --- Existing Logic Updated ---

async function loadDetails(basicItem) {
    console.log('Loading details for', basicItem.id_greenpoint);
    currentGreenpointId = basicItem.id_greenpoint;
    currentCitizenData = null; // Reset current data

    // Join Socket Room
    if (socket && socket.connected) {
        socket.emit('join_room', { greenpoint_id: currentGreenpointId });
    }

    // Load Chat History
    loadChatHistory(currentGreenpointId);

    try {
        const res = await fetch(`${API_BASE}/greenpoints/fulldata/${basicItem.id_greenpoint}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!res.ok) {
            console.error('Error loading details');
            return;
        }

        const item = await res.json();

        let userName = 'Usuario';
        let avatarUrl = null;
        const citizenId = item.id_citizen || basicItem.id_citizen;

        if (citizenId) {
            try {
                const userRes = await fetch(`${API_BASE}/users/${citizenId}`);
                if (userRes.ok) {
                    const userData = await userRes.json();
                    currentCitizenData = userData; // Store for modal
                    userName = `${userData.name} ${userData.lastname}`;
                    avatarUrl = userData.avatar_url;
                }
            } catch (uErr) {
                console.error('Error fetching citizen:', uErr);
            }
        }

        const citizenName = document.getElementById('citizen-name');
        if (citizenName) citizenName.textContent = userName;

        const citizenAvatar = document.querySelector('#citizen-avatar');
        if (citizenAvatar) {
            citizenAvatar.src = avatarUrl ? `${API_BASE}/profile_photo/${avatarUrl}.webp` : `https://api.dicebear.com/7.x/initials/svg?seed=${userName}`;
        }

        // Update Details
        const detailsContainer = document.getElementById('greenpoint-details');
        if (!detailsContainer) return;

        detailsContainer.querySelector('.details-title').textContent = item.description || basicItem.description;
        detailsContainer.querySelector('.details-meta').textContent = `Publicado el ${new Date(item.created_at).toLocaleDateString()}`;
        detailsContainer.querySelector('.details-desc').textContent = item.description || '';

        // Update Categories
        const catContainer = detailsContainer.querySelector('.category-tags');
        if (catContainer) {
            const cats = item.categories || [];
            catContainer.innerHTML = cats.map(c => `<span class="category-tag" style="background-color:${c.color || '#22c55e'}">${c.name}</span>`).join('');
        }

        // Update Materials
        const tbody = detailsContainer.querySelector('tbody');
        if (tbody) {
            const mats = item.materials || [];
            tbody.innerHTML = mats.map(m => `<tr><td>${m.name || m.description}</td><td>${m.quantity} ${m.unit}</td><td>${m.description || '-'}</td></tr>`).join('');
        }

        // Photos
        const photoGrid = detailsContainer.querySelector('.photo-grid');
        if (photoGrid) {
            const photos = item.photos || [];
            photoGrid.className = `photo-grid ${photos.length === 1 ? 'one' : photos.length === 2 ? 'two' : 'three'}`;
            photoGrid.innerHTML = '';

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
                photoGrid.appendChild(wrapper);
            }
        }

    } catch (err) {
        console.error('Error fetching full details:', err);
    }
}

async function getMyBookings() {
    try {
        const res = await fetch(`${API_BASE}/api/reserved-greenpoints`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (!res.ok) throw new Error('Failed to fetch bookings');
        return await res.json();
    } catch (error) {
        console.error(error);
        return [];
    }
}

(async () => {
    initSocket(); // Init socket on load

    const books = await getMyBookings();
    console.log('Bookings:', books);

    // Filter by status
    const active = books.filter(b => b.status === 'reserved');
    const finished = books.filter(b => b.status === 'terminated');

    if (listActive) renderList(listActive, active, true);
    if (listFinished) renderList(listFinished, finished, false);

    // Load first item if exists
    if (active.length > 0) {
        loadDetails(active[0]);
        setTimeout(() => {
            const first = listActive.querySelector('.list-item');
            if (first) first.classList.add('active-item');
        }, 0);
    } else if (finished.length > 0) {
        loadDetails(finished[0]);
        setTimeout(() => {
            const first = listFinished.querySelector('.list-item');
            if (first) first.classList.add('active-item');
        }, 0);
    }
})();