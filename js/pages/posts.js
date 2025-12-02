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
`;
document.head.appendChild(style);

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
    img.src = photos[currentIndex].url.startsWith('http') ? photos[currentIndex].url : `${API_BASE}/greenpoint_photo/${photos[currentIndex].url}.webp`;

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
        img.src = photos[currentIndex].url.startsWith('http') ? photos[currentIndex].url : `${API_BASE}/greenpoint_photo/${photos[currentIndex].url}.webp`;
    };

    const nextBtn = document.createElement('div');
    nextBtn.className = 'carousel-next';
    nextBtn.innerHTML = '&#10095;';
    nextBtn.onclick = (e) => {
        e.stopPropagation();
        currentIndex = (currentIndex + 1) % photos.length;
        img.src = photos[currentIndex].url.startsWith('http') ? photos[currentIndex].url : `${API_BASE}/greenpoint_photo/${photos[currentIndex].url}.webp`;
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
                alert('Funcionalidad de ver reservas en construcción');
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
                    img.src = photos[i].url.startsWith('http') ? photos[i].url : `${API_BASE}/greenpoint_photo/${photos[i].url}.webp`;

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
            if (gp.id_citizen === currentUserId) continue;

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
                    img.src = photos[i].url.startsWith('http') ? photos[i].url : `${API_BASE}/greenpoint_photo/${photos[i].url}.webp`;

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
            else if (currentUserId && gp.id_collector === currentUserId) {
                btnText = 'Aceptado';
                btnClass = 'btn-orange';
                btnDisabled = true;
            }
            else if (currentUserId && myReservations.some(r => r.id_greenpoint === gp.id_greenpoint && r.status === 'pending')) {
                btnText = 'Pendiente';
                btnClass = 'btn-yellow';
                btnDisabled = true;
            }
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
                // Scroll to chat or open modal? Original just set activeChat.
                // Assuming the chat container is visible in this view.
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

        // Hide edit container if exists when switching tabs
        const editContainer = document.getElementById('editContainer');
        if (editContainer) editContainer.remove();

        if (btn.dataset.filter === 'mine') {
            if (chatContainer) chatContainer.style.display = 'none';
            if (mainContainer) mainContainer.style.gridTemplateColumns = ' 250px 3fr 2fr'
            await renderMyPosts(1);
        } else {
            if (chatContainer) chatContainer.style.display = '';
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
        <form id="addGreenpointForm" class="add-form">
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



const addForm = document.getElementById('addGreenpointForm');
if (addForm) {
    addForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Obtener usuario del localStorage
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            alert('Debes iniciar sesión para registrar un GreenPoint.');
            return;
        }
        const user = JSON.parse(userStr);
        const id_citizen = user.id_user || user.id;

        // Validaciones básicas
        const coordsStr = coordsInput.value;
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

        // Obtener datos del formulario
        const description = document.getElementById('gpDescription').value;
        const direction = document.getElementById('gpDirection').value;
        const hour = document.getElementById('gpHour').value;
        const date_collect = document.getElementById('gpDateCollect').value;
        const imagesInput = document.getElementById('gpImages');

        const [lat, lng] = coordsStr.split(',').map(s => parseFloat(s.trim()));

        const submitBtn = addForm.querySelector('.submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Procesando...';

        try {
            const headers = getAuthHeaders();
            if (!headers['Authorization']) {
                alert('No hay sesión activa.');
                return;
            }

            // 1. Crear GreenPoint
            submitBtn.textContent = 'Creando GreenPoint...';
            const gpPayload = {
                id_category: selectedCategories[0], // Principal
                coordinates: { latitude: lat, longitude: lng },
                description,
                id_citizen,
                hour,
                direction,
                date_collect
            };

            const gpResponse = await fetch('http://localhost:3000/greenpoints', {
                method: 'POST',
                headers,
                body: JSON.stringify(gpPayload)
            });

            if (!gpResponse.ok) {
                const err = await gpResponse.json();
                throw new Error(err.error || 'Error al crear GreenPoint');
            }

            const newGp = await gpResponse.json();
            const gpId = newGp.id_greenpoint;
            console.log('GreenPoint creado:', gpId);

            // 2. Asignar Categorías (si hay más de una o para asegurar)
            if (selectedCategories.length > 0) {
                submitBtn.textContent = 'Asignando categorías...';
                await fetch(`http://localhost:3000/greenpoints/${gpId}/categories`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ categoryIds: selectedCategories })
                });
            }

            // 3. Asignar Materiales
            if (materials.length > 0) {
                submitBtn.textContent = 'Registrando materiales...';
                await fetch(`http://localhost:3000/greenpoints/${gpId}/materials`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ materials })
                });
            }

            // 4. Subir Imágenes
            if (imagesInput.files.length > 0) {
                submitBtn.textContent = 'Subiendo imágenes...';
                for (const file of imagesInput.files) {
                    const formData = new FormData();
                    formData.append('photo', file);

                    await fetch(`http://localhost:3000/greenpoints/${gpId}/photos`, {
                        method: 'POST',
                        headers: {
                            'Authorization': headers['Authorization']
                        },
                        body: formData
                    });
                }
            }

            alert('¡GreenPoint registrado exitosamente con todos los detalles!');

            // Resetear todo
            addForm.reset();
            materials = [];
            renderMaterialsList();
            coordsInput.value = '';
            if (tempMarker) {
                map.removeLayer(tempMarker);
                tempMarker = null;
            }

            // Volver al mapa
            toggleBtn.click();
            cargarGreenPoints(mapInstance);

        } catch (error) {
            console.error('Error en el proceso:', error);
            alert('Ocurrió un error: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Registrar GreenPoint';
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

(async () => {
    await fetchMyReservations();
    renderFeed(1);
})();

