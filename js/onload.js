const $ = (ElementId) => document.getElementById(ElementId);
const $$ = (ElementClassName) => document.getElementsByClassName(ElementClassName)

document.addEventListener("DOMContentLoaded", () => {
    const usuario = JSON.parse(localStorage.getItem("usuario"));
    if (usuario) mostrarUsuario(usuario.username);
});


const toggle = $('themeToggle');
const html = document.documentElement;

toggle.addEventListener("click", () => {
    html.classList.toggle("dark");
});