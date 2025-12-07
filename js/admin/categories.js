import { config } from '../../config.js';

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/pages/login.html';
        return;
    }

    const tableBody = document.getElementById('categoriesTableBody');
    const modal = document.getElementById('categoryModal');
    const form = document.getElementById('categoryForm');
    const addBtn = document.getElementById('addCategoryBtn');
    const cancelBtn = document.getElementById('cancelModalBtn');

    async function loadCategories() {
        try {
            const response = await fetch(`${config.API_URL}/api/admin/categories`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Error al cargar categorías');

            const categories = await response.json();
            renderCategories(categories);
        } catch (error) {
            console.error(error);
            alert('Error al cargar categorías');
        }
    }

    function renderCategories(categories) {
        tableBody.innerHTML = categories.map(cat => `
            <tr>
                <td><img src="${cat.icon_url}" alt="" style="width:32px; height:32px; object-fit:contain;"></td>
                <td>${cat.name}</td>
                <td>${cat.description || ''}</td>
                <td><div style="width:20px; height:20px; background:${cat.color_hex}; border-radius:50%;"></div></td>
                <td>
                    <button class="btn btn-warning btn-sm edit-btn" 
                            data-id="${cat.id_category}" 
                            data-name="${cat.name}"
                            data-desc="${cat.description || ''}"
                            data-icon="${cat.icon_url || ''}"
                            data-color="${cat.color_hex || '#000000'}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${cat.id_category}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => openModal(btn.dataset));
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('¿Eliminar categoría?')) {
                    await deleteCategory(btn.dataset.id);
                }
            });
        });
    }

    function openModal(data = null) {
        modal.style.display = 'block';
        if (data && data.id) {
            document.getElementById('modalTitle').textContent = 'Editar Categoría';
            document.getElementById('categoryId').value = data.id;
            document.getElementById('categoryName').value = data.name;
            document.getElementById('categoryDescription').value = data.desc;
            document.getElementById('categoryIcon').value = data.icon;
            document.getElementById('categoryColor').value = data.color;
        } else {
            document.getElementById('modalTitle').textContent = 'Nueva Categoría';
            form.reset();
            document.getElementById('categoryId').value = '';
        }
    }

    addBtn.addEventListener('click', () => openModal());
    cancelBtn.addEventListener('click', () => modal.style.display = 'none');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('categoryId').value;
        const data = {
            name: document.getElementById('categoryName').value,
            description: document.getElementById('categoryDescription').value,
            icon_url: document.getElementById('categoryIcon').value,
            color_hex: document.getElementById('categoryColor').value
        };

        try {
            const url = id
                ? `${config.API_URL}/api/admin/categories/${id}`
                : `${config.API_URL}/api/admin/categories`;

            const method = id ? 'PATCH' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error('Error al guardar');

            modal.style.display = 'none';
            loadCategories();
        } catch (error) {
            console.error(error);
            alert('Error al guardar la categoría');
        }
    });

    async function deleteCategory(id) {
        try {
            const response = await fetch(`${config.API_URL}/api/admin/categories/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Error al eliminar');
            loadCategories();
        } catch (error) {
            console.error(error);
            alert('Error al eliminar');
        }
    }

    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/pages/login.html';
    });

    loadCategories();
});
