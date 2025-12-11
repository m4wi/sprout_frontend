import { API_URL, STATIC_PHOTO_API_URL } from '/config.js';

// Variable global para almacenar el ID del usuario
let currentUserId = null;

/**
 * Obtiene el token de autenticación del localStorage
 */
const getAuthToken = () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
};

const loadUserAvatar = () => {
    try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            const avatarImg = document.getElementById('userPhoto');

            if (avatarImg && user.avatar_url) {
                // Construir la URL completa de la imagen
                avatarImg.src = `${STATIC_PHOTO_API_URL}${user.avatar_url}`;
                avatarImg.alt = `${user.name || 'Usuario'} ${user.lastname || ''}`;
            } else if (avatarImg) {
                // Imagen por defecto si no hay avatar
                avatarImg.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDEyQzE0Ljc2MTQgMTIgMTcgOS43NjE0MiAxNyA3QzE3IDQuMjM4NTggMTQuNzYxNCAyIDEyIDJDOS4yMzg1OCAyIDcgNC4yMzg1OCA3IDdDNyA5Ljc2MTQyIDkuMjM4NTggMTIgMTIgMTJaIiBmaWxsPSIjNjVBRDJEIi8+CjxwYXRoIGQ9Ik0xMiAxNEMxNS44NjYgMTQgMTkgMTYuMTM0IDIwIDIwSDRDNC45OTk5OSAxNi4xMzQgOC4xMzM5OCAxNCAxMiAxNFoiIGZpbGw9IiM2NUFEMkQiLz4KPC9zdmc+';
            }
        }
    } catch (error) {
        console.error('Error al cargar avatar del usuario:', error);
    }
};


/**
 * Obtiene los datos del usuario desde el backend
 */
const getUserData = async (userId) => {
    try {
        const token = getAuthToken();
        const headers = {
            'Content-Type': 'application/json'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/users/${userId}`, {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        const userData = await response.json();
        return userData;
    } catch (error) {
        console.error('Error al obtener datos del usuario:', error);
        throw error;
    }
};

/**
 * Pobla el formulario con los datos del usuario
 */
const populateForm = (user) => {
    // Guardar el ID del usuario
    currentUserId = user.id_user || user.id;

    // Inputs (value)
    document.getElementById('name').value = user.name || '';
    document.getElementById('lastname').value = user.lastname || '';
    document.getElementById('username').value = user.username || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('phone').value = user.phone || '';
    document.getElementById('user_type').value = user.user_type || '';
    document.getElementById('profile_description').value = user.profile_description || '';
    document.getElementById('direction').value = user.direction || '';

    // Texto (innerText o textContent)
    document.getElementById('userFullname').textContent = `${user.name || ''} ${user.lastname || ''}`.trim() || 'Usuario';
    document.getElementById('userPhone').textContent = user.phone || 'No especificado';
    document.getElementById('userEmail').textContent = user.email || 'No especificado';
    document.getElementById('userDirection').textContent = user.direction || 'No especificado';

    // Imagen
    if (user.avatar_url) {
        document.getElementById('userPhoto').src = `${STATIC_PHOTO_API_URL}${user.avatar_url}`;
    } else {
        document.getElementById('userPhoto').src = 'default.webp';
    }
};

/**
 * Actualiza la información mostrada en el perfil (lado izquierdo)
 */
const updateProfileDisplay = (user) => {
    document.getElementById('userFullname').textContent = `${user.name || ''} ${user.lastname || ''}`.trim() || 'Usuario';
    document.getElementById('userPhone').textContent = user.phone || 'No especificado';
    document.getElementById('userEmail').textContent = user.email || 'No especificado';
    document.getElementById('userDirection').textContent = user.direction || 'No especificado';
};

/**
 * Muestra un mensaje de éxito o error
 */
const showMessage = (message, type = 'success') => {
    // Crear elemento de mensaje si no existe
    let messageDiv = document.getElementById('message');
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.id = 'message';
        messageDiv.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            font-weight: 600;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(messageDiv);
    }

    messageDiv.textContent = message;
    messageDiv.style.backgroundColor = type === 'success' ? '#4caf50' : '#f44336';
    messageDiv.style.color = 'white';

    // Ocultar después de 3 segundos
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            messageDiv.remove();
        }, 300);
    }, 3000);
};

/**
 * Envía los datos del formulario al backend
 */
const updateUserData = async (userId, formData) => {
    try {
        const token = getAuthToken();
        const headers = {
            'Content-Type': 'application/json'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Preparar los datos según los campos permitidos por el backend
        const updateData = {
            name: formData.get('name') || undefined,
            lastname: formData.get('lastname') || undefined,
            email: formData.get('email') || undefined,
            phone: formData.get('phone') || undefined,
            direction: formData.get('direction') || undefined,
            user_type: formData.get('user_type') || undefined,
            profile_description: formData.get('profile_description') || undefined,
            username: formData.get('username') || undefined
        };

        // Eliminar campos undefined
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined || updateData[key] === '') {
                delete updateData[key];
            }
        });
        console.log(updateData);
        const response = await fetch(`${API_URL}/users/update/${userId}`, {
            method: 'PATCH',
            headers: headers,
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
            throw new Error(errorData.error || `Error: ${response.status}`);
        }

        const updatedUser = await response.json();
        return updatedUser;
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        throw error;
    }
};

/**
 * Valida los datos del formulario
 */
const validateForm = (formData) => {
    const name = formData.get('name');
    const lastname = formData.get('lastname');
    const username = formData.get('username');
    const email = formData.get('email');
    const phone = formData.get('phone');
    const password = formData.get('password');

    // Nombres y Apellidos: Solo letras y espacios
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!name || !nameRegex.test(name)) {
        throw new Error('El nombre solo puede contener letras y espacios.');
    }
    if (!lastname || !nameRegex.test(lastname)) {
        throw new Error('El apellido solo puede contener letras y espacios.');
    }

    // Usuario: Alfanumérico (Letras y números), min 3 caracteres
    const usernameRegex = /^[a-zA-Z0-9]+$/;
    if (!username || username.length < 3) {
        throw new Error('El nombre de usuario debe tener al menos 3 caracteres.');
    }
    if (!usernameRegex.test(username)) {
        throw new Error('El nombre de usuario solo puede contener letras y números.');
    }

    // Email: Formato válido
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
        throw new Error('El correo electrónico no es válido.');
    }

    // Teléfono: Opcional, solo números y +, 6-15 dígitos
    if (phone) {
        const phoneRegex = /^\+?[0-9]{6,15}$/;
        if (!phoneRegex.test(phone)) {
            throw new Error('El teléfono debe tener entre 6 y 15 dígitos (puede incluir +).');
        }
    }

    // Contraseña: Opcional, pero si se pone, min 6 chars
    if (password && password.length > 0 && password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres.');
    }

    return true;
};

/**
 * Maneja el envío del formulario
 */
const handleFormSubmit = async (event) => {
    event.preventDefault();

    if (!currentUserId) {
        showMessage('Error: No se pudo identificar al usuario', 'error');
        return;
    }

    const form = event.target;
    const formData = new FormData(form);
    const submitButton = document.getElementById('sendFormButton');

    submitButton.disabled = true;
    submitButton.textContent = 'Guardando...';

    try {
        // Validar antes de enviar
        validateForm(formData);

        const updatedUser = await updateUserData(currentUserId, formData);

        // Actualizar la visualización del perfil
        updateProfileDisplay(updatedUser);

        showMessage('Perfil actualizado exitosamente', 'success');

        // Recargar los datos completos del usuario para asegurar sincronización
        const freshUserData = await getUserData(currentUserId);
        populateForm(freshUserData);

    } catch (error) {
        showMessage(error.message || 'Error al actualizar el perfil', 'error');
        console.error('Error:', error);
    } finally {
        // Rehabilitar el botón
        submitButton.disabled = false;
        submitButton.textContent = 'Guardar Cambios';
    }
};

/**
 * Maneja la subida de la foto de perfil
 */
const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tipo y tamaño
    if (!file.type.startsWith('image/')) {
        showMessage('Por favor selecciona un archivo de imagen válido', 'error');
        return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showMessage('La imagen no debe superar los 5MB', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('photo', file);

    const changePhotoBtn = document.getElementById('changePhoto');
    const originalText = changePhotoBtn.textContent;
    changePhotoBtn.disabled = true;
    changePhotoBtn.textContent = 'Subiendo...';

    try {
        const token = getAuthToken();
        const response = await fetch(`${API_URL}/users/upload-photo/${currentUserId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Error al subir la imagen');
        }

        const data = await response.json();

        // Actualizar la imagen en la interfaz
        const avatarImg = document.getElementById('userPhoto');
        if (avatarImg && data.avatar_url) {
            avatarImg.src = `${STATIC_PHOTO_API_URL}${data.avatar_url}?t=${new Date().getTime()}`; // Cache busting
        }

        // Actualizar localStorage
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            user.avatar_url = data.avatar_url;
            localStorage.setItem('user', JSON.stringify(user));
        }

        showMessage('Foto de perfil actualizada', 'success');

    } catch (error) {
        console.error('Error uploading photo:', error);
        showMessage('Error al actualizar la foto de perfil', 'error');
    } finally {
        changePhotoBtn.disabled = false;
        changePhotoBtn.textContent = originalText;
        event.target.value = ''; // Reset input
    }
};

/**
 * Inicializa la funcionalidad de cambio de foto
 */
const initPhotoUpload = () => {
    const changePhotoBtn = document.getElementById('changePhoto');
    if (!changePhotoBtn) return;

    // Crear input file oculto si no existe
    let fileInput = document.getElementById('photoInput');
    if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'photoInput';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        fileInput.addEventListener('change', handlePhotoUpload);
    }

    changePhotoBtn.onclick = () => fileInput.click();
};

const init = async () => {
    try {
        // Obtener el ID del usuario (por ahora usa 1, pero deberías obtenerlo del token o de la sesión)
        // TODO: Obtener el ID del usuario desde el token JWT o la sesión
        currentUserId = JSON.parse(localStorage.getItem('user')).id_user;
        const user = await getUserData(currentUserId);
        console.log('Usuario cargado:', user);
        populateForm(user);
        initPhotoUpload(); // Inicializar subida de fotos

        // Agregar manejador de evento al formulario
        const form = document.querySelector('form');
        if (form) {
            form.addEventListener('submit', handleFormSubmit);
        }

    } catch (error) {
        console.error('No se pudo cargar el usuario:', error);
        showMessage('Error al cargar los datos del usuario', 'error');
    }
};

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}