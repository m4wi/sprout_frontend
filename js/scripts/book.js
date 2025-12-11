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

function renderDetailsSkeleton() {
    const container = document.getElementById('greenpoint-details');
    if (!container) return;

    container.innerHTML = `
        <div class="skeleton-block" style="height:32px; width:60%; background:#e0e0e0; border-radius:4px; margin-bottom:16px;"></div>
        <div class="skeleton-block" style="height:20px; width:40%; background:#e0e0e0; border-radius:4px; margin-bottom:24px;"></div>
        
        <div class="photo-grid three" style="pointer-events:none;">
            <div style="background:#e0e0e0; width:100%; height:100%;"></div>
            <div style="background:#e0e0e0; width:100%; height:100%;"></div>
            <div style="background:#e0e0e0; width:100%; height:100%;"></div>
        </div>

        <div style="display:flex; gap:8px; margin-bottom:24px;">
            <div style="height:24px; width:80px; background:#e0e0e0; border-radius:16px;"></div>
            <div style="height:24px; width:80px; background:#e0e0e0; border-radius:16px;"></div>
        </div>

        <div style="height:16px; width:100%; background:#e0e0e0; border-radius:4px; margin-bottom:8px;"></div>
        <div style="height:16px; width:90%; background:#e0e0e0; border-radius:4px; margin-bottom:8px;"></div>
        <div style="height:16px; width:95%; background:#e0e0e0; border-radius:4px; margin-bottom:24px;"></div>

        <div style="height:100px; width:100%; background:#e0e0e0; border-radius:8px;"></div>
    `;
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

    // Set Loader 2 (Full Panel)
    const detailsContainer = document.getElementById('greenpoint-details');
    if (detailsContainer) {
        detailsContainer.innerHTML = `
            <div style="display:flex; flex-direction:column; justify-content:center; align-items:center; width:100%; height:100%; min-height:300px;">
                 <img src="/assets/gif/loader2.gif" style="width:200px; height:200px; mix-blend-mode:multiply; opacity:0.8;">
                 <p style="color:#6b7280; font-size:0.9rem; margin-top:10px;">Cargando detalles...</p>
            </div>
        `;
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

        // Reconstruct Content
        if (!detailsContainer) return;

        const photos = item.photos || [];
        const photoGridClass = `photo-grid ${photos.length === 1 ? 'one' : photos.length === 2 ? 'two' : 'three'}`;

        let photoHTML = '';
        const displayCount = Math.min(photos.length, 3);
        for (let i = 0; i < displayCount; i++) {
            const url = photos[i].url.startsWith('http') ? photos[i].url : `${API_URL}/greenpoint_photo/${photos[i].url}`;
            let overlay = '';
            if (i === 2 && photos.length > 3) {
                overlay = `<div class="more-overlay">+${photos.length - 3}</div>`;
            }
            photoHTML += `<div class="photo-wrapper"><img class="photo-item" src="${url}">${overlay}</div>`;
        }

        const cats = item.categories || [];
        const catsHTML = cats.map(c => `<span class="category-tag" style="background-color:${c.color || '#22c55e'}">${c.name}</span>`).join('');

        const mats = item.materials || [];
        const matsHTML = mats.map(m => `<tr><td>${m.name || m.description}</td><td>${m.quantity} ${m.unit}</td><td>${m.description || '-'}</td></tr>`).join('');

        detailsContainer.innerHTML = `
            <h3 class="details-title">${item.description || basicItem.description}</h3>
            <p class="details-meta">Publicado el ${new Date(item.created_at).toLocaleDateString()}</p>

            <div class="${photoGridClass}">
                ${photoHTML}
            </div>

            <div class="category-tags">
                ${catsHTML}
            </div>

            <p class="details-desc">${item.description || ''}</p>

            <table class="material-table">
                <thead>
                    <tr>
                        <th>Material</th>
                        <th>Cantidad</th>
                        <th>Descripción</th>
                    </tr>
                </thead>
                <tbody>
                    ${matsHTML}
                </tbody>
            </table>

            <div class="details-meta">
                <p><strong>Ubicación:</strong> ${item.direction || 'No especificada'}</p>
                <p><strong>Horario:</strong> ${item.schedule_days || 'Lunes a Viernes de'} ${item.hour || '9-5'}</p>
            </div>
        `;
        console.log(item);
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
    renderDetailsSkeleton();

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
    } else {
        renderDetailsSkeleton();
    }
})();