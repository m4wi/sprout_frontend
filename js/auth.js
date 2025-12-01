// ---- Abrir / cerrar modales ----
function abrirModal(tipo) {
    document.getElementById("overlay").classList.remove("hidden");
    document.getElementById(`modal-${tipo}`).classList.remove("hidden");
}
function cerrarModal(tipo) {
    document.getElementById("overlay").classList.add("hidden");
    document.getElementById(`modal-${tipo}`).classList.add("hidden");
}
function cambiarModal(actual, siguiente) {
    cerrarModal(actual);
    abrirModal(siguiente);
}
document.getElementById("overlay").addEventListener("click", () => {
    document.querySelectorAll("[id^='modal-']").forEach(m => m.classList.add("hidden"));
    document.getElementById("overlay").classList.add("hidden");
});

// ---- Entrar como invitado ----
function entrarInvitado() {
    alert("Ingresaste como Invitado 🚀");
    cerrarModal("login");
}

// Función para guardar token
function guardarToken(token, usuario) {
    localStorage.setItem("token", token);
    localStorage.setItem("usuario", JSON.stringify(usuario));
    mostrarUsuario(usuario.username);
}


function cerrarSesion() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    document.getElementById("user-info").classList.add("hidden");
    document.getElementById("auth-buttons").classList.remove("hidden");
}

function mostrarUsuario(usuario) {
    // Ocultar botones de login/signup
    document.getElementById("auth-buttons").classList.add("hidden");
    // Mostrar info del usuario
    document.getElementById("user-name").textContent = usuario;
    document.getElementById("user-info").classList.remove("hidden");
}


// ---- Manejo del formulario de login ----
document.getElementById("form-login").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const msg = document.getElementById("loginMsg");
    msg.textContent = "Enviando...";
    msg.className = "text-gray-500";

    const datos = {
        username: form.username.value.trim(),
        password: form.password.value
    };
    console.log(datos)
    try {
        const res = await fetch("http://localhost:3000/api/login", {  // ✅ actualizado
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });

        if (!res.ok) throw new Error("Error en el login");
        const data = await res.json();
        msg.textContent = "✅ Inicio de sesión exitoso";
        msg.className = "text-green-600";
        console.log("Usuario:", data.usuario);
        guardarToken(data.token, data.usuario);
        setTimeout(() => cerrarModal("login"), 1000);
    } catch (err) {
        msg.textContent = "❌ Credenciales inválidas o error de conexión";
        msg.className = "text-red-600";
    }
});

// ---- Manejo del formulario de registro ----
document.getElementById("form-register").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const msg = document.getElementById("registerMsg");
    msg.textContent = "Enviando...";
    msg.className = "text-gray-500";

    const datos = {
        username: form.username.value.trim(),
        password: form.password.value,
        tipo: form.tipo.value
    };

    try {
        const res = await fetch("http://localhost:3000/api/usuarios", {  // ✅ actualizado
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });

        if (!res.ok) throw new Error("Error en el registro");
        const data = await res.json();
        msg.textContent = "✅ Usuario registrado correctamente";
        msg.className = "text-green-600";
        console.log("Nuevo usuario:", data);
        form.reset();
        guardarToken(data.token, data.usuario);
        setTimeout(() => cambiarModal("register", "login"), 1500);
    } catch (err) {
        msg.textContent = "❌ No se pudo registrar el usuario";
        msg.className = "text-red-600";
    }
});