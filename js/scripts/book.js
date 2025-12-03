const API_BASE = 'http://localhost:3000';

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

async function loadDetails(basicItem) {
    console.log('Loading details for', basicItem.id_greenpoint);

    // Show loading or skeleton if needed
    // For now, we just fetch

    try {
        const res = await fetch(`${API_BASE}/greenpoints/fulldata/${basicItem.id_greenpoint}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!res.ok) {
            console.error('Error loading details');
            return;
        }

        const item = await res.json();

        // Update User
        // The full data might have user info. If not, we might need another fetch or use what we have.
        // Assuming fulldata returns { ..., user: { name, ... }, materials: [], categories: [] }
        // Based on posts.js, it seems to return a structure. Let's adapt.

        // If the API doesn't return nested user object, we might need to fetch user. 
        // But let's try to map what we can.

        const citizenName = document.getElementById('citizen-name');
        // Fallback if user data is missing in fulldata response
        const userName = item.user?.name || item.username || 'Usuario';
        if (citizenName) citizenName.textContent = userName;

        const citizenAvatar = document.querySelector('#citizen-avatar');
        if (citizenAvatar) {
            const avatarUrl = item.user?.avatar_url || item.avatar_url;
            citizenAvatar.src = avatarUrl ? `${API_BASE}/profile_photo/${avatarUrl}.webp` : `https://api.dicebear.com/7.x/initials/svg?seed=${userName}`;
        }

        // Update Details
        const detailsContainer = document.getElementById('greenpoint-details');
        if (!detailsContainer) return;

        detailsContainer.querySelector('.details-title').textContent = item.description || basicItem.description;
        detailsContainer.querySelector('.details-meta').textContent = `Publicado el ${new Date(item.created_at).toLocaleDateString()}`;
        detailsContainer.querySelector('.details-desc').textContent = item.description || ''; // Description might be same as title in this DB design?

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
                img.src = photos[i].url.startsWith('http') ? photos[i].url : `${API_BASE}/greenpoint_photo/${photos[i].url}.webp`;
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