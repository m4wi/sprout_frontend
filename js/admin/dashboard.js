import { config } from '../../config.js';

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/pages/login.html';
        return;
    }

    // Verify admin access (simple client-side check, real check is on API)
    // You might want to decode the token here to check role if available

    try {
        const response = await fetch(`${config.API_URL}/api/admin/users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 403 || response.status === 401) {
            alert('Acceso denegado');
            window.location.href = '/pages/index.html';
            return;
        }

        const users = await response.json();

        // Update stats
        document.getElementById('totalUsers').textContent = users.length;

        // Mock other stats for now as endpoints are not ready
        document.getElementById('totalGreenpoints').textContent = '...';
        document.getElementById('pendingReports').textContent = '...';

    } catch (error) {
        console.error('Error loading dashboard:', error);
    }

    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/pages/login.html';
    });
});
