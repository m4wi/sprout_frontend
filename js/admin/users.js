import { config } from '../../config.js';

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/pages/login.html';
        return;
    }

    const tableBody = document.getElementById('usersTableBody');

    async function loadUsers() {
        try {
            const response = await fetch(`${config.API_URL}/api/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Error al cargar usuarios');

            const users = await response.json();
            renderUsers(users);
        } catch (error) {
            console.error(error);
            alert('Error al cargar usuarios');
        }
    }

    function renderUsers(users) {
        tableBody.innerHTML = users.map(user => `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="width: 32px; height: 32px; background: #ddd; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            ${user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div>${user.name} ${user.lastname}</div>
                            <div style="font-size: 0.8rem; color: var(--text-secondary)">@${user.username}</div>
                        </div>
                    </div>
                </td>
                <td>${user.email || 'N/A'}</td>
                <td><span class="status-badge" style="background: rgba(255,255,255,0.1)">${user.user_type}</span></td>
                <td>
                    <span class="status-badge ${user.active ? 'status-active' : 'status-inactive'}">
                        ${user.active ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn ${user.active ? 'btn-danger' : 'btn-primary'} btn-sm toggle-status-btn" 
                            data-id="${user.id_user}" 
                            data-active="${user.active}">
                        ${user.active ? '<i class="fas fa-ban"></i> Banear' : '<i class="fas fa-check"></i> Activar'}
                    </button>
                    <!-- <button class="btn btn-warning btn-sm notify-btn" data-id="${user.id_user}">
                        <i class="fas fa-bell"></i>
                    </button> -->
                </td>
            </tr>
        `).join('');

        // Add event listeners to buttons
        document.querySelectorAll('.toggle-status-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const currentActive = btn.dataset.active === 'true';
                await toggleUserStatus(id, !currentActive);
            });
        });
    }

    async function toggleUserStatus(id, newStatus) {
        if (!confirm(`¿Estás seguro de que deseas ${newStatus ? 'activar' : 'desactivar'} a este usuario?`)) return;

        try {
            const response = await fetch(`${config.API_URL}/api/admin/users/${id}/ban`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ active: newStatus })
            });

            if (!response.ok) throw new Error('Error al actualizar estado');

            await loadUsers(); // Reload table
        } catch (error) {
            console.error(error);
            alert('Error al actualizar el estado del usuario');
        }
    }

    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/pages/login.html';
    });

    loadUsers();
});
