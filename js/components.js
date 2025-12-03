async function loadComponent(id, file) {
    try {
        const response = await fetch(file);
        if (response.ok) {
            const html = await response.text();
            document.getElementById(id).innerHTML = html;

            // Initialize header scripts if we just loaded the header
            if (id === 'header-container') {
                initHeader();
            }
        } else {
            console.error(`Error loading component ${file}: ${response.statusText}`);
        }
    } catch (error) {
        console.error(`Error loading component ${file}:`, error);
    }
}

function initHeader() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navMenu = document.querySelector('.nav-menu');

    if (mobileMenuBtn && navMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }
}

const init = () => {
    loadComponent('header-container', '/components/header.html');
    // Future: loadComponent('footer-container', '/components/footer.html');
    console.log('Components loaded');
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
