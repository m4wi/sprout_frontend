// Centrado en Tacna

class MapSingleton {
  static instance;

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
}


var map = new MapSingleton().getMap()
let greenpointMarkers = [];
// Tiles oscuros (Carto Dark)



const popup1 = (gp) => `
  <div class="p-4 text-center">
    <h3 class="text-lg font-semibold text-gray-800 mb-2">${gp.descripcion}</h3>
    <p class="text-sm text-gray-600 mb-4">Estado: <span class="font-medium">${gp.estado}</span></p>
    
    <div class="flex justify-center gap-3">
        
      <button 
        onclick=reservarGreenPoint('${gp.id}')
        id="gp-adpopup-${gp.id}" 
        class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition">
        Añadir
      </button>
      <button
        onclick=cancelarGreenPoint('${gp.id}')
        id="gp-cancelpopup-${gp.id}" 
        class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition">
        Cancelar
      </button>
    </div>
  </div>
`


async function reservarGreenPoint(idGreenPoint) {
  // Recuperar datos del recolector desde localStorage
  const usuario = JSON.parse(localStorage.getItem("usuario"));
  if (!usuario || !usuario.id) {
    alert("❌ No hay un usuario autenticado.");
    return;
  }

  const idRecolector = usuario.id;
  console.log(idRecolector)
  try {
    const res = await fetch(`http://localhost:3000/greenpoints/${idGreenPoint}/recolector`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_recolector: idRecolector })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Error al reservar greenpoint");
    }

    const data = await res.json();
    console.log("✅ GreenPoint reservado:", data);

    alert("GreenPoint reservado correctamente ✅");
  } catch (err) {
    console.error("Error al reservar el greenpoint:", err);
    alert("❌ No se pudo reservar el greenpoint.");
  }
}



async function cancelarGreenPoint(idGreenPoint) {
  try {
    // Obtener el token del localStorage
    const token = localStorage.getItem('token') || JSON.parse(localStorage.usuario)?.token;

    if (!token) {
      alert('No se encontró el token. Por favor inicia sesión nuevamente.');
      return;
    }

    // Enviar petición PATCH con autenticación
    const res = await fetch(`http://localhost:3000/greenpoints/${idGreenPoint}/estado`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // 🔒 encabezado de autenticación
      },
      body: JSON.stringify({ estado: 'pendiente' })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `Error al cancelar el greenpoint (${res.status})`);
    }

    const data = await res.json();
    console.log('✅ GreenPoint cancelado:', data);
    alert('GreenPoint cancelado correctamente.');

  } catch (err) {
    console.error('❌ Error al cancelar GreenPoint:', err);
    alert('❌ No se pudo cancelar el greenpoint.');
  }
}



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



async function cargarGreenPoints() {
  try {
    const res = await fetch("http://localhost:3000/greenpoints"); // tu endpoint
    const data = await res.json();

    // Primero eliminamos los markers anteriores
    greenpointMarkers.forEach(marker => map.removeLayer(marker));
    greenpointMarkers = [];

    // Crear nuevos markers
    data.forEach(gp => {
      const icon = gp.estado === 'pendiente'
        ? greenIcon
        : redIcon;

      const marker = L.marker(gp.coord, { icon })
        .addTo(map)
        .bindPopup(popup1(gp));
      greenpointMarkers.push(marker);
    });

  } catch (err) {
    console.error("Error cargando GreenPoints:", err);
  }
}



map.on('click', function (e) {
  greenPointFormCoords = [e.latlng.lat, e.latlng.lng]
  console.log("Coordenadas:", greenPointFormCoords);
});


function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject("Geolocalización no soportada por este navegador.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        resolve([lat, lng]);
      },
      (error) => {
        reject(error.message);
      }
    );
  });
}


async function mostrarUbicacion() {
  try {
    const coords = await getCurrentLocation();
    console.log(coords);

    // Ejemplo: centrar mapa de Leaflet y colocar marcador
    // map.setView([lat, lng], 15);
    // L.marker([lat, lng]).addTo(map).bindPopup("Tu ubicación").openPopup();

  } catch (error) {
    console.error("No se pudo obtener la ubicación:", error);
  }
}

// Llamada

/**
 * Funciones por parte del recolector, en el apartado
 * de transaccion de greenpoint
 */

function closeGreenpoint() {

}

function getGreenPoint() {

}

/**
 * Funciones por parte del productor, en el apartado
 * de transaccion de greenpoint
 */

function createGreenPoint() {

}

function deleteGreenPoint() {

}

function modifyGreenPoint() {

}

function getGreenPoint() {

}