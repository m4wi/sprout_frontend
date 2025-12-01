const greenPointForm = $('greenpointForm');
const greenPointFormMaterials = [];
let greenPointFormCoords = []


greenPointForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const greenPointName = $('greenPointName');
    // const descripcion = $("greenPointDescription");

    const data = {
        name: greenPointName.value,
        coord: greenPointFormCoords,
        materials: greenPointFormMaterials,
        descripcion: greenPointName.value
    }
    try {
        const res = await fetch("http://localhost:3000/greenpoints", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + localStorage.getItem("token") // tu token guardado al loguear
            },
            body: JSON.stringify(data)
        });

        if (!res.ok) throw new Error("Error guardando GreenPoint");
        const result = await res.json();
        alert("✅ GreenPoint guardado con ID: " + result.greenpointId);
        greenPointForm.reset();
        greenPointFormMaterials.length = 0;
        renderLista(); // limpia la lista de materiales
    } catch (err) {
        console.error(err);
        alert("❌ No se pudo guardar el GreenPoint");
    }
    console.log(data);
})


function mostrarOpciones2() {
    const appOptions = $("appOptions");
    appOptions.classList.toggle("hidden");
}





// Datos falsos de materiales
const catalogo = [
    { id: 1, nombre: "Plástico", tipo: "Plástico", descripcion: "Botellas, envases, bolsas." },
    { id: 2, nombre: "Vidrio", tipo: "Vidrio", descripcion: "Botellas, frascos." },
    { id: 3, nombre: "Papel", tipo: "Papel", descripcion: "Hojas, periódicos, cuadernos." },
    { id: 4, nombre: "Cartón", tipo: "Cartón", descripcion: "Cajas, embalajes." },
    { id: 5, nombre: "Aluminio", tipo: "Metal", descripcion: "Latas de bebidas y alimentos." },
    { id: 6, nombre: "Hierro", tipo: "Metal", descripcion: "Clavos, herramientas, chatarra." },
    { id: 7, nombre: "Cobre", tipo: "Metal", descripcion: "Cables eléctricos, tuberías." },
    { id: 8, nombre: "Orgánico", tipo: "Orgánico", descripcion: "Restos de comida, cáscaras, hojas." },
    { id: 9, nombre: "Textiles", tipo: "Textil", descripcion: "Ropa, telas." },
    { id: 10, nombre: "Electrónicos", tipo: "E-Waste", descripcion: "Celulares, computadoras, cargadores." }
];

let materialesAgregados = [];
let coordenadas = null;

const buscar = $("buscar");
const selectMaterial = $("materiales");
const itemsDiv = $("items");

// Inicializar select
function mostrarOpciones(filtro = "") {
    selectMaterial.innerHTML = "";
    catalogo
        .filter(m => m.nombre.toLowerCase().includes(filtro.toLowerCase()))
        .forEach(m => {
            const option = document.createElement("option");
            option.value = m.id;
            option.textContent = m.nombre;
            selectMaterial.appendChild(option);
        });
}
mostrarOpciones();

buscar.addEventListener("input", () => {
    mostrarOpciones(buscar.value);
});

// Agregar material
function agregarMaterial() {
    const id = selectMaterial.value;
    const nombre = selectMaterial.options[selectMaterial.selectedIndex].text;
    const unidad = $("unidad").value;
    const cantidad = $('greenPointMaterialQuantity').value;

    greenPointFormMaterials.push({ id, nombre, cantidad, unidad });
    renderLista();
}

function renderLista() {
    itemsDiv.innerHTML = "";
    greenPointFormMaterials.forEach((m, i) => {
        const div = document.createElement("div");
        div.className = "list-item";
        div.textContent = `${m.nombre} (x${m.cantidad} ${m.unidad})`;
        itemsDiv.appendChild(div);
    });
}

// Seleccionar coordenadas
function seleccionarGreenPoint() {
    $("coord").textContent =
        `Coordenadas: (${greenPointFormCoords[0]}, ${greenPointFormCoords[1]})`;
}

// Guardar
function guardarGreenPoint() {
    const greenpoint = {
        materiales: materialesAgregados,
        coordenadas
    };
    console.log("Guardando GreenPoint:", greenpoint);
    alert("GreenPoint guardado (ver consola)");
}

const sugerenciasDiv = $("sugerencias");

buscar.addEventListener("input", () => {
    const filtro = buscar.value.toLowerCase();
    sugerenciasDiv.innerHTML = "";
    if (filtro) {
        catalogo
            .filter(m => m.nombre.toLowerCase().includes(filtro))
            .forEach(m => {
                const opcion = document.createElement("div");
                opcion.textContent = m.nombre;
                opcion.onclick = () => {
                    buscar.value = m.nombre;
                    mostrarOpciones(m.nombre);
                    sugerenciasDiv.innerHTML = "";
                };
                sugerenciasDiv.appendChild(opcion);
            });
    }
});
buscar.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
        e.preventDefault();
        const match = catalogo.find(m =>
            m.nombre.toLowerCase().startsWith(buscar.value.toLowerCase())
        );
        if (match) {
            buscar.value = match.nombre; // autocompleta
            mostrarOpciones(match.nombre);
        }
    }
});


