import { STATIC_PHOTO_API_URL } from '/config.js';

/**
 * Carga la imagen del usuario desde localStorage
 */
const loadUserAvatar = () => {
    try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            const avatarImg = document.getElementById('userAvatar');

            if (avatarImg && user.avatar_url) {
                // Construir la URL completa de la imagen
                avatarImg.src = `${STATIC_PHOTO_API_URL}${user.avatar_url}.webp`;
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

class MapSingleton {
    static instance;
    markers = [];

    constructor() {
        // Si ya existe una instancia, retornamos esa misma
        if (MapSingleton.instance) return MapSingleton.instance;

        // Creamos el mapa solo una vez
        this.map = L.map('map').setView([-18.0066, -70.2463], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

        // Guardamos la instancia para futuras llamadas
        MapSingleton.instance = this;
    }

    getMap() {
        return this.map;
    }

    clearMarkers() {
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];
    }

    addMarker(coords, markerOptions, popup) {
        const marker = L.marker(coords, markerOptions).addTo(this.map)
            .bindPopup(popup);
        this.markers.push(marker);
    }
}

// Inicializar mapa
let mapInstance = null;

// Función para obtener greenpoints por categoría
const fetchGreenPointsByCategory = async (categoryId) => {
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`http://localhost:3000/greenpoints/findCategory/${categoryId}`, { headers });
        if (!response.ok) {
            throw new Error('Error al obtener greenpoints');
        }
        const result = await response.json();
        renderGreenPoints(result.greenpoints);
    } catch (error) {
        console.error('Error:', error);
        const container = document.getElementById('resultsContainer');
        container.style.display = 'block';
        container.innerHTML = `<p class="error-msg">Error al cargar los puntos de reciclaje.</p>`;
    }
};

const filteredCategoryPopup = (greenpoint) => {
    console.log(greenpoint)
    //console.log(greenpoint)
    const foto = greenpoint.avatar_url
        ? `<img src="${greenpoint.avatar_url}" class="popup-img" />`
        : `<img src="https://via.placeholder.com/150" class="popup-img" />`;

    const categorias = (greenpoint.categories || [])
        .slice(0, 2) // máximo 2 categorías
        .map(cat => `<span class="popup-cat">${cat.name}</span>`)
        .join('');

    const creador = greenpoint.citizen_name || 'Desconocido';

    return `
        <div class="popup-container">
            ${foto}
            <h3>${greenpoint.description || 'Sin descripción'}</h3>
            <p><strong>Categorías:</strong> ${categorias}</p>
            <p><strong>Creado por:</strong> ${creador}</p>
            <a href="/pages/navigation/posts.html?id=${greenpoint.id_greenpoint}" class="btn btn-primary">Ver más</a>
        </div>
    `;
};


// Función para renderizar los resultados
const renderGreenPoints = (greenpoints) => {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = ''; // Limpiar resultados anteriores
    container.style.display = 'block';

    // Limpiar marcadores del mapa
    if (mapInstance) {
        mapInstance.clearMarkers();
    }

    if (greenpoints.length === 0) {
        container.innerHTML = '<p>No se encontraron puntos de reciclaje para esta categoría.</p>';
        return;
    }

    const list = document.createElement('ul');
    list.className = 'greenpoints-list';

    greenpoints.forEach(gp => {
        // Crear elemento de lista
        const item = document.createElement('li');
        item.className = 'greenpoint-item';
        item.innerHTML = `
            <h3>${gp.description}</h3>
            <p><strong>Horario:</strong> ${gp.hour || 'Sin descripción'}</p>
            <div class="categories">
                ${(gp.categories || []).map(cat => `<span class="category-tag">${cat.name}</span>`).join('') || '<span class="category-tag">Sin categorías</span>'}
            </div>
        `;
        list.appendChild(item);
        drawMarker(mapInstance, gp, filteredCategoryPopup(gp));
    });

    container.appendChild(list);
};



async function cargarGreenPoints(map) {
    try {
        const headers = getAuthHeaders();
        const res = await fetch("http://localhost:3000/greenpoints", { headers }); // tu endpoint
        const data = await res.json();

        map.clearMarkers();

        data.forEach(gp => {
            drawMarker(mapInstance, gp, "dout");
        });

    } catch (err) {
        console.error("Error cargando GreenPoints:", err);
    }
}

async function drawMarker(mapInstance, gp, options) {

    const greenIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    const redIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });


    const icon = gp.status === 'approved' || gp.status === 'pending' || gp.status === 'created'
        ? greenIcon
        : redIcon;

    const lat = gp.coordinates.y || gp.coordinates.latitude;
    const lng = gp.coordinates.x || gp.coordinates.longitude;

    if (lat && lng) {
        mapInstance.addMarker([lat, lng], { icon }, options);
    } else {
        console.warn('Coordenadas inválidas para greenpoint:', gp);
    }
}



// --- Lógica de Notificaciones ---
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : {};
};

const fetchNotifications = async () => {
    try {
        const headers = getAuthHeaders();
        if (!headers['Authorization']) {
            // No hay usuario logueado
            const list = document.getElementById('notificationList');
            if (list) list.innerHTML = '<p class="empty-msg">Inicia sesión para ver tus notificaciones.</p>';
            const badge = document.getElementById('notificationCount');
            if (badge) badge.style.display = 'none';
            return;
        }

        const response = await fetch('http://localhost:3000/notifications', { headers });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                // Token invalido o expirado
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                const list = document.getElementById('notificationList');
                if (list) list.innerHTML = '<p class="empty-msg">Sesión expirada. Inicia sesión nuevamente.</p>';
                return;
            }
            throw new Error('Error al obtener notificaciones');
        }

        const data = await response.json();
        // El backend devuelve { notifications: [], unreadCount: 0, ... }
        // Aseguramos que pasamos el array de notificaciones a renderNotifications
        renderNotifications(data.notifications || []);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        const list = document.getElementById('notificationList');
        if (list) list.innerHTML = '<p class="empty-msg">Error al cargar notificaciones.</p>';
    }
};

const renderNotifications = (notifications) => {
    const list = document.getElementById('notificationList');
    const badge = document.getElementById('notificationCount');

    if (!list) return;

    list.innerHTML = '';

    if (notifications.length === 0) {
        list.innerHTML = '<p class="empty-msg">No tienes notificaciones.</p>';
        return;
    }

    const unreadCount = notifications.filter(n => !n.is_read).length;

    if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }



    notifications.forEach(n => {
        const item = document.createElement('div');
        item.className = `notification-item ${n.is_read ? '' : 'unread'}`;
        item.onclick = () => markAsRead(n.id_notification);

        const date = new Date(n.created_at).toLocaleString();

        item.innerHTML = `
            <p>${n.message}</p>
            <span class="time">${date}</span>
        `;
        list.appendChild(item);
    });
};

const markAsRead = async (id) => {
    try {
        const headers = getAuthHeaders();
        if (!headers['Authorization']) return;

        await fetch(`http://localhost:3000/notifications/${id}/read`, {
            method: 'PATCH',
            headers
        });
        // Recargar notificaciones para actualizar UI
        fetchNotifications();
    } catch (error) {
        console.error('Error marking as read:', error);
    }
};

const markAllAsRead = async () => {
    try {
        const headers = getAuthHeaders();
        if (!headers['Authorization']) return;

        await fetch('http://localhost:3000/notifications/mark-all-read', {
            method: 'PATCH',
            headers
        });
        fetchNotifications();
    } catch (error) {
        console.error('Error marking all as read:', error);
    }
};

// Inicializar cuando el DOM esté listo
const init = () => {
    // Inicializar mapa
    mapInstance = new MapSingleton();
    const map = mapInstance.getMap();

    cargarGreenPoints(mapInstance);
    // Cargar avatar del usuario
    loadUserAvatar();

    // Manejo dinámico para categorías
    document.querySelectorAll('[data-category]').forEach(button => {
        button.addEventListener('click', (e) => {
            const category = e.target.dataset.category;
            const categoryId = e.target.dataset.id;
            console.log(`Filtrar por: ${category} (ID: ${categoryId})`);

            // Aplicar clase "active"
            document.querySelectorAll('[data-category]').forEach(btn => {
                btn.classList.remove('active');
            });
            e.target.classList.add('active');

            // Ocultar búsqueda por geolocalización si está abierta
            const geoContainer = document.getElementById('geolocationSearch');
            const btnGeo = document.getElementById('btn-geolocalizacion');
            if (geoContainer) geoContainer.style.display = 'none';
            if (btnGeo) btnGeo.classList.remove('active');

            // Llamar al backend
            if (categoryId) {
                fetchGreenPointsByCategory(categoryId);
            }
        });
    });

    // --- Inicialización de Notificaciones ---
    const notificationBtn = document.getElementById('notificationBtn');
    const notificationPopup = document.getElementById('notificationPopup');
    const markAllReadBtn = document.getElementById('markAllReadBtn');

    if (notificationBtn && notificationPopup) {
        notificationBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Evitar cierre inmediato
            notificationPopup.classList.toggle('active');
        });

        // Cerrar al hacer click fuera
        document.addEventListener('click', (e) => {
            if (!notificationBtn.contains(e.target) && !notificationPopup.contains(e.target)) {
                notificationPopup.classList.remove('active');
            }
        });
    }

    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            markAllAsRead();
        });
    }

    // Cargar notificaciones iniciales
    fetchNotifications();
    // Polling cada 60 segundos (opcional)
    setInterval(fetchNotifications, 60000);

    // --- Lógica para Geolocalización (Búsqueda Avanzada) ---
    const geoSearchContainer = document.getElementById('geolocationSearch');
    const btnGeoSearch = document.getElementById('btn-geolocalizacion');
    const btnCancelGeo = document.getElementById('btn-cancel-geo');
    const btnSelectMapGeo = document.getElementById('btn-select-map-geo');
    const btnUseCurrentGeo = document.getElementById('btn-use-current-geo');
    const btnSearchGeoAction = document.getElementById('btn-search-geo-action');
    const geoLatInput = document.getElementById('geoLat');
    const geoLngInput = document.getElementById('geoLng');
    let isGeoMapMode = false;
    let tempGeoMarker = null;

    if (btnGeoSearch) {
        btnGeoSearch.addEventListener('click', () => {
            // Mostrar contenedor de geo
            if (geoSearchContainer) geoSearchContainer.style.display = 'block';

            // Ocultar resultados anteriores
            const results = document.getElementById('resultsContainer');
            if (results) results.style.display = 'none';

            // Desactivar otros filtros visualmente
            document.querySelectorAll('[data-category]').forEach(btn => {
                btn.classList.remove('active');
            });
            btnGeoSearch.classList.add('active');
        });
    }

    function disableGeoMapMode() {
        if (isGeoMapMode) {
            isGeoMapMode = false;
            document.getElementById('map').style.cursor = '';
            map.off('click', onGeoMapClick);
            if (btnSelectMapGeo) {
                btnSelectMapGeo.classList.remove('active');
                btnSelectMapGeo.textContent = '📍 Seleccionar en Mapa';
            }
        }
        if (tempGeoMarker) {
            map.removeLayer(tempGeoMarker);
            tempGeoMarker = null;
        }
    }

    if (btnCancelGeo) {
        btnCancelGeo.addEventListener('click', () => {
            if (geoSearchContainer) geoSearchContainer.style.display = 'none';
            if (btnGeoSearch) btnGeoSearch.classList.remove('active');
            // Limpiar inputs
            if (geoLatInput) geoLatInput.value = '';
            if (geoLngInput) geoLngInput.value = '';
            // Limpiar mapa si estaba en modo selección
            disableGeoMapMode();
        });
    }

    function onGeoMapClick(e) {
        const { lat, lng } = e.latlng;
        if (geoLatInput) geoLatInput.value = lat.toFixed(6);
        if (geoLngInput) geoLngInput.value = lng.toFixed(6);

        if (tempGeoMarker) {
            tempGeoMarker.setLatLng(e.latlng);
        } else {
            tempGeoMarker = L.marker(e.latlng, {
                icon: L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                })
            }).addTo(map);
        }
    }

    if (btnSelectMapGeo) {
        btnSelectMapGeo.addEventListener('click', () => {
            isGeoMapMode = !isGeoMapMode;
            if (isGeoMapMode) {
                document.getElementById('map').style.cursor = 'crosshair';
                map.on('click', onGeoMapClick);
                btnSelectMapGeo.classList.add('active');
                btnSelectMapGeo.textContent = '📍 Cancelar Selección';
            } else {
                disableGeoMapMode();
            }
        });
    }

    if (btnUseCurrentGeo) {
        btnUseCurrentGeo.addEventListener('click', () => {
            if (navigator.geolocation) {
                btnUseCurrentGeo.disabled = true;
                btnUseCurrentGeo.textContent = 'Obteniendo...';
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        if (geoLatInput) geoLatInput.value = latitude.toFixed(6);
                        if (geoLngInput) geoLngInput.value = longitude.toFixed(6);

                        // Centrar mapa
                        map.setView([latitude, longitude], 15);

                        // Poner marcador azul
                        if (tempGeoMarker) {
                            tempGeoMarker.setLatLng([latitude, longitude]);
                        } else {
                            tempGeoMarker = L.marker([latitude, longitude], {
                                icon: L.icon({
                                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-shadow.png',
                                    iconSize: [25, 41],
                                    iconAnchor: [12, 41],
                                    popupAnchor: [1, -34],
                                    shadowSize: [41, 41]
                                })
                            }).addTo(map);
                        }

                        btnUseCurrentGeo.disabled = false;
                        btnUseCurrentGeo.textContent = '🎯 Mi Ubicación';
                    },
                    (error) => {
                        console.error('Error:', error);
                        let msg = 'No se pudo obtener la ubicación.';
                        if (error.code === 1) msg = 'Permiso denegado para acceder a la ubicación.';
                        else if (error.code === 2) msg = 'Ubicación no disponible.';
                        else if (error.code === 3) msg = 'Tiempo de espera agotado.';

                        alert(msg);
                        btnUseCurrentGeo.disabled = false;
                        btnUseCurrentGeo.textContent = '🎯 Mi Ubicación';
                    }
                );
            } else {
                alert('Geolocalización no soportada.');
            }
        });
    }

    if (btnSearchGeoAction) {
        btnSearchGeoAction.addEventListener('click', async () => {
            const lat = geoLatInput.value;
            const lng = geoLngInput.value;

            if (!lat || !lng) {
                alert('Por favor ingresa coordenadas o selecciona en el mapa.');
                return;
            }

            try {
                const headers = getAuthHeaders();
                const response = await fetch(`http://localhost:3000/greenpoints/nearby?lat=${lat}&lng=${lng}&radius=5`, { headers });
                if (!response.ok) throw new Error('Error en la búsqueda');

                const data = await response.json();
                console.log('Resultados de búsqueda por ubicación:', data);

                // Renderizar resultados si hay
                if (data.greenpoints) {
                    renderGreenPoints(data.greenpoints);
                }

            } catch (error) {
                console.error('Error:', error);
                alert('Error al buscar greenpoints cercanos.');
            }
        });
    }

    // --- Lógica para Modo Agregar GreenPoint ---
    const toggleBtn = document.getElementById('toggleModeBtn');
    const searchContent = document.getElementById('searchModeContent');
    const addContent = document.getElementById('addModeContent');
    const coordsInput = document.getElementById('gpCoords');
    let isAddMode = false;
    let tempMarker = null;

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            isAddMode = !isAddMode;

            if (isAddMode) {
                // Activar modo agregar
                searchContent.style.display = 'none';
                addContent.style.display = 'block';
                toggleBtn.classList.add('cancel-mode');
                // Cambiar icono a X (usando path)
                toggleBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';

                // Cambiar cursor del mapa
                document.getElementById('map').style.cursor = 'crosshair';

                // Evento click en mapa
                map.on('click', onMapClick);
            } else {
                // Volver a modo búsqueda
                searchContent.style.display = 'block';
                addContent.style.display = 'none';
                toggleBtn.classList.remove('cancel-mode');
                // Restaurar icono +
                toggleBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M11 13H5v-2h6V5h2v6h6v2h-6v6h-2z"/></svg>';

                // Restaurar cursor
                document.getElementById('map').style.cursor = '';

                // Remover evento y marcador temporal
                map.off('click', onMapClick);
                if (tempMarker) {
                    map.removeLayer(tempMarker);
                    tempMarker = null;
                }
                coordsInput.value = '';
            }
        });
    }

    function onMapClick(e) {
        const { lat, lng } = e.latlng;
        coordsInput.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

        if (tempMarker) {
            tempMarker.setLatLng(e.latlng);
        } else {
            tempMarker = L.marker(e.latlng, {
                icon: L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                })
            }).addTo(map);
        }
    }

    // --- Image Preview Logic ---
    const gpImagesInput = document.getElementById('gpImages');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    let selectedImages = []; // Array to store all selected images

    if (gpImagesInput && imagePreviewContainer) {
        gpImagesInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);

            files.forEach(file => {
                if (file.type.startsWith('image/')) {
                    selectedImages.push(file);
                }
            });

            renderImagePreviews();
            // Reset input so the same file can be selected again if needed (though unlikely)
            gpImagesInput.value = '';
        });
    }

    function renderImagePreviews() {
        if (!imagePreviewContainer) return;
        imagePreviewContainer.innerHTML = '';

        selectedImages.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const wrapper = document.createElement('div');
                wrapper.style.position = 'relative';
                wrapper.style.display = 'inline-block';

                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'preview-img';

                const removeBtn = document.createElement('button');
                removeBtn.innerHTML = '&times;';
                removeBtn.style.position = 'absolute';
                removeBtn.style.top = '-5px';
                removeBtn.style.right = '-5px';
                removeBtn.style.background = 'red';
                removeBtn.style.color = 'white';
                removeBtn.style.border = 'none';
                removeBtn.style.borderRadius = '50%';
                removeBtn.style.width = '20px';
                removeBtn.style.height = '20px';
                removeBtn.style.cursor = 'pointer';
                removeBtn.style.fontSize = '14px';
                removeBtn.style.lineHeight = '1';
                removeBtn.onclick = () => {
                    selectedImages.splice(index, 1);
                    renderImagePreviews();
                };

                wrapper.appendChild(img);
                wrapper.appendChild(removeBtn);
                imagePreviewContainer.appendChild(wrapper);
            };
            reader.readAsDataURL(file);
        });
    }

    // --- Manejo de Materiales (Modal) ---
    const materialModal = document.getElementById('materialModal');
    const btnAddMaterial = document.getElementById('btnAddMaterial');
    const btnSaveMaterial = document.getElementById('btnSaveMaterial');
    const materialsList = document.getElementById('materialsList');
    const closeModal = document.querySelector('.close-modal');

    let materials = []; // Array para almacenar materiales temporalmente

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
            renderMaterialsList();
            materialModal.style.display = 'none';
        });
    }

    function renderMaterialsList() {
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

    // Exponer función globalmente para el onclick
    window.removeMaterial = (index) => {
        materials.splice(index, 1);
        renderMaterialsList();
    };


    // --- Manejo del formulario de registro ---
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
                if (selectedImages.length > 0) {
                    console.log('Iniciando subida de imágenes:', selectedImages.length);
                    submitBtn.textContent = 'Subiendo imágenes...';
                    for (const file of selectedImages) {
                        console.log('Subiendo archivo:', file.name);
                        const formData = new FormData();
                        formData.append('photo', file);

                        try {
                            const res = await fetch(`http://localhost:3000/greenpoints/${gpId}/photos`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': headers['Authorization']
                                    // NO Content-Type here, let browser set multipart/form-data boundary
                                },
                                body: formData
                            });
                            console.log('Respuesta subida imagen:', res.status);
                            if (!res.ok) {
                                const errText = await res.text();
                                console.error('Error subiendo imagen:', errText);
                                alert(`Error al subir imagen ${file.name}: ${errText}`);
                            }
                        } catch (err) {
                            console.error('Error de red al subir imagen:', err);
                            alert(`Error de red al subir imagen ${file.name}`);
                        }
                    }
                } else {
                    console.log('No hay imágenes seleccionadas para subir.');
                }

                alert('¡GreenPoint registrado exitosamente con todos los detalles!');

                // Resetear todo
                addForm.reset();
                materials = [];
                selectedImages = []; // Clear images
                renderMaterialsList();
                renderImagePreviews(); // Clear previews
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
};

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}