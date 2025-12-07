import { config } from '../../config.js';

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/pages/login.html';
        return;
    }

    const tableBody = document.getElementById('greenpointsTableBody');

    async function loadGreenpoints() {
        try {
            const response = await fetch(`${config.API_URL}/api/admin/greenpoints`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Error al cargar greenpoints');

            const greenpoints = await response.json();
            renderGreenpoints(greenpoints);
        } catch (error) {
            console.error(error);
            alert('Error al cargar greenpoints');
        }
    }

    function renderGreenpoints(greenpoints) {
        tableBody.innerHTML = greenpoints.map(gp => `
            <tr>
                <td>${gp.description || 'Sin descripción'}</td>
                <td>${gp.citizen_name || 'Desconocido'}</td>
                <td>${gp.categories ? gp.categories.join(', ') : 'N/A'}</td>
                <td>
                    <span class="status-badge ${gp.status === 'approved' ? 'status-active' : 'status-inactive'}">
                        ${gp.status}
                    </span>
                </td>
                <td>${new Date(gp.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${gp.id_greenpoint}">
                        <i class="fas fa-trash"></i>
                    </button>
                    <!-- Edit button could be added here -->
                </td>
            </tr>
        `).join('');

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                if (confirm('¿Estás seguro de eliminar este punto verde?')) {
                    await deleteGreenpoint(id);
                }
            });
        });
    }

    async function deleteGreenpoint(id) {
        try {
            const response = await fetch(`${config.API_URL}/api/admin/greenpoints/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Error al eliminar');

            await loadGreenpoints();
        } catch (error) {
            console.error(error);
            alert('Error al eliminar el punto verde');
        }
    }

    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/pages/login.html';
    });

    loadGreenpoints();
});
