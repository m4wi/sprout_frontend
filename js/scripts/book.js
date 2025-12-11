import { API_URL, STATIC_PHOTO_API_URL } from '/config.js';

const listActive = document.getElementById('list-active');
const listFinished = document.getElementById('list-finished');

function renderSkeletonList(container, count = 3) {
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const div = document.createElement('div');
        div.className = 'list-item skeleton-item';
        div.style.pointerEvents = 'none';
        div.innerHTML = `
            <div class="item-header" style="opacity:0.6">
                <div style="width:100%">
                    <div style="height:15px; width:60%; background:#e0e0e0; margin-bottom:5px; border-radius:4px;"></div>
                    <div style="height:12px; width:30%; background:#e0e0e0; border-radius:4px;"></div>
                </div>
                <div class="item-actions">
                    <div style="width:60px; height:20px; background:#e0e0e0; border-radius:12px;"></div>
                </div>
            </div>
        `;
        container.appendChild(div);
    }
}

function renderList(container, items, isActive) {
    container.innerHTML = '';
    if (items.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#888;">No hay items.</div>';
        return;
    }

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
                    <button class="action-btn" title="${isActive ? 'Cancelar Reserva' : 'Eliminar'}" style="display:none"> <!-- Hiding delete for now per context -->
                        ${isActive ? trashIcon : closeIcon}
                    </button>
                    ${isActive ? `<button class="finish-btn" title="Finalizar" style="background:#22c55e; color:white; border:none; padding:4px 8px; border-radius:6px; cursor:pointer;" onclick="finishGreenPoint(${item.id_greenpoint}, event)">✓</button>` : ''}
                </div>
            </div>
        `;

        // We bind onclick logic
        div.onclick = () => {
            document.querySelectorAll('.list-item').forEach(el => el.classList.remove('active-item'));
            div.classList.add('active-item');
            loadDetails(item);
        };
        container.appendChild(div);
    });
}

// Global finish function
window.finishGreenPoint = async (id, e) => {
    e.stopPropagation();
    if (!confirm('¿Marcar como finalizado? Esto confirmará que la recolección fue exitosa.')) return;

    try {
        const res = await fetch(`${API_URL}/greenpoints/${id}/finish`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (res.ok) {
            alert('Greenpoint finalizado!');
            location.reload(); // Simple reload to refresh lists
        } else {
            const err = await res.json();
            alert('Error: ' + (err.error || 'No se pudo finalizar'));
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión');
    }
};

let socket;
let currentGreenpointId = null;
let currentUser = null;

// Initialize Socket
function initSocket() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        currentUser = payload;
    } catch (e) {
        console.error('Error decoding token', e);
    }

    socket = io(API_URL, {
        auth: { token }
    });

    socket.on('connect', () => {
        console.log('Connected to chat server');
        if (currentGreenpointId) {
            socket.emit('join_room', { greenpoint_id: currentGreenpointId });
        }
    });

    socket.on('new_message', (msg) => {
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

    // Skeleton for chat
    chatMessages.innerHTML = `
        <div style="padding:20px; display:flex; flex-direction:column; gap:10px; opacity:0.6;">
            <div style="height:40px; width:70%; background:#e0e0e0; border-radius:10px; align-self:flex-start;"></div>
            <div style="height:40px; width:60%; background:#e0e0e0; border-radius:10px; align-self:flex-end;"></div>
            <div style="height:40px; width:50%; background:#e0e0e0; border-radius:10px; align-self:flex-start;"></div>
        </div>
    `;

    try {
        const res = await fetch(`${API_URL}/greenpoints/${greenpointId}/chat`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!res.ok) {
            if (res.status === 404) {
                // Empty chat state
                chatMessages.innerHTML = `
                    <div class="chat-empty-state" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#888;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" style="margin-bottom:10px; opacity:0.5;"><path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                        <p>Sin mensajes. ¡Inicia la conversación!</p>
                    </div>
                `;
                return;
            }
            throw new Error('Error loading chat');
        }

        const data = await res.json();
        const messages = data.messages || [];

        chatMessages.innerHTML = '';
        if (messages.length === 0) {
            chatMessages.innerHTML = `
                    <div class="chat-empty-state" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#888;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" style="margin-bottom:10px; opacity:0.5;"><path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                        <p>Sin mensajes. ¡Inicia la conversación!</p>
                    </div>
                `;
        } else {
            messages.forEach(msg => appendMessage(msg));
        }
    } catch (err) {
        console.error(err);
        chatMessages.innerHTML = '<div style="text-align:center; color:red;">Error al cargar mensajes.</div>';
    }
}

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
        ? `${API_URL}/profile_photo/${currentCitizenData.avatar_url}`
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
    currentGreenpointId = basicItem.id_greenpoint;
    currentCitizenData = null; // Reset current data

    // Disable profile button initially
    if (btnProfile) {
        btnProfile.style.opacity = '0.5';
        btnProfile.style.pointerEvents = 'none';
    }

    // Set Loader 2
    const detailsContainer = document.getElementById('greenpoint-details');
    if (detailsContainer) {
        // Find existing structure to preserve or overwrite?
        // We want to update content, but while loading, maybe show overlay or clear critical fields?
        // Let's use an overlay or replace key areas.
        // For simplicity, we can show loader in the main text area or image area.
        // Or overlay the whole right panel? The request says "add loader 2 al momento de cargar info".
        // Let's put it in the photo grid container or description temporarily.
        const photoGrid = detailsContainer.querySelector('.photo-grid');
        if (photoGrid) {
            photoGrid.innerHTML = `
                <div style="display:flex; justify-content:center; align-items:center; width:100%; height:200px; mix-blend-mode:multiply;">
                    <img src="/assets/gif/wired-lineal-1683-recycling-hover-cycle-2.webp" width="80" height="80">
                </div>
            `;
        }
    }

    // Join Socket Room
    if (socket && socket.connected) {
        socket.emit('join_room', { greenpoint_id: currentGreenpointId });
    }

    // Load Chat History
    loadChatHistory(currentGreenpointId);

    try {
        const res = await fetch(`${API_URL}/greenpoints/fulldata/${basicItem.id_greenpoint}`, {
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
                const userRes = await fetch(`${API_URL}/users/${citizenId}`);
                if (userRes.ok) {
                    const userData = await userRes.json();
                    currentCitizenData = userData; // Store for modal
                    userName = `${userData.name} ${userData.lastname}`;
                    avatarUrl = userData.avatar_url;

                    // Enable profile button
                    if (btnProfile) {
                        btnProfile.style.opacity = '1';
                        btnProfile.style.pointerEvents = 'auto';
                    }
                }
            } catch (uErr) {
                console.error('Error fetching citizen:', uErr);
            }
        }

        const citizenName = document.getElementById('citizen-name');
        if (citizenName) citizenName.textContent = userName;

        const citizenAvatar = document.querySelector('#citizen-avatar');
        if (citizenAvatar) {
            citizenAvatar.src = avatarUrl ? `${API_URL}/profile_photo/${avatarUrl}` : `https://api.dicebear.com/7.x/initials/svg?seed=${userName}`;
        }

        // Update Details
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
                img.src = photos[i].url.startsWith('http') ? photos[i].url : `${API_URL}/greenpoint_photo/${photos[i].url}`;
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
        const res = await fetch(`${API_URL}/api/reserved-greenpoints`, {
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

    // Render Skeletons initially
    if (listActive) renderSkeletonList(listActive, 3);
    if (listFinished) renderSkeletonList(listFinished, 3);

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