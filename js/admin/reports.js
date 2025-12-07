import { config } from '../../config.js';

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/pages/login.html';
        return;
    }

    const tableBody = document.getElementById('reportsTableBody');

    async function loadReports() {
        try {
            const response = await fetch(`${config.API_URL}/api/admin/reports`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Error al cargar reportes');

            const reports = await response.json();
            renderReports(reports);
        } catch (error) {
            console.error(error);
            alert('Error al cargar reportes');
        }
    }

    function renderReports(reports) {
        tableBody.innerHTML = reports.map(report => `
            <tr>
                <td>${report.username} (${report.email || 'N/A'})</td>
                <td>${report.type}</td>
                <td>${report.message}</td>
                <td>${new Date(report.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-primary btn-sm resolve-btn" data-id="${report.id_report}">
                        <i class="fas fa-check"></i> Resolver
                    </button>
                </td>
            </tr>
        `).join('');

        document.querySelectorAll('.resolve-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                if (confirm('¿Marcar este reporte como resuelto (se eliminará)?')) {
                    await deleteReport(id);
                }
            });
        });
    }

    async function deleteReport(id) {
        try {
            const response = await fetch(`${config.API_URL}/api/admin/reports/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Error al eliminar reporte');

            await loadReports();
        } catch (error) {
            console.error(error);
            alert('Error al eliminar el reporte');
        }
    }

    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/pages/login.html';
    });

    loadReports();
});
