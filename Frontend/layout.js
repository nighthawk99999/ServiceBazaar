document.addEventListener("DOMContentLoaded", function() {
    // --- GLOBAL CONFIGURATION ---
    // Dynamically set the API_URL based on the hostname.
    // This allows the same frontend code to work for both local development and production.
    const getApiUrl = () => {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            // We are in a local development environment.
            return 'http://localhost:5000';
        } else {
            // We are in a production environment (e.g., on Render).
            // Replace this with your actual backend URL on Render.
            return 'https://servicebazaar-backend.onrender.com'; 
        }
    };
    window.API_URL = getApiUrl();

    window.SERVICE_CATEGORIES = [
        "Plumbing", "Electrical", "Masonry", "Carpentry", "Painting",
        "Cleaning", "Gardening", "Appliance Repair", "Pest Control", "Home Tutoring"
    ];

    // Function to fetch and insert HTML content
    const loadComponent = (selector, url, callback) => {
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error(`Failed to load ${url}: ${response.statusText}`);
                return response.text();
            })
            .then(data => {
                const element = document.querySelector(selector);
                if (element) {
                    element.innerHTML = data;
                }
                // Execute the callback function after the component is loaded
                if (callback) {
                    callback();
                }
            })
            .catch(error => console.error(`Error loading component ${url}:`, error));
    };
    function capitalizeName(name) {
        if (!name) return '';
        return name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    }

    // This function runs *after* the header is loaded into the page
    function setupHeaderUI() {
        const accountName = localStorage.getItem('customerName');
        const isProfessional = localStorage.getItem('isProfessional') === 'true';
        const loginLink = document.getElementById('loginLink');
        const myBookingsLink = document.getElementById('myBookingsLink');
        const professionalDashboardLink = document.getElementById('professionalDashboardLink');
        const userProfile = document.getElementById('userProfile');
        const userProfileTrigger = document.getElementById('userProfileTrigger');
        const userDropdown = document.getElementById('userDropdown');
        const accountNameEl = document.getElementById('accountName');
        const logoutBtn = document.getElementById('logoutBtn');

        if (accountName) {
            if (accountNameEl) accountNameEl.textContent = capitalizeName(accountName);
            if (loginLink) loginLink.style.display = 'none';
            if (userProfile) userProfile.style.display = 'flex';
            if (isProfessional) {
                if (professionalDashboardLink) professionalDashboardLink.style.display = 'inline';
                if (myBookingsLink) myBookingsLink.style.display = 'none'; // Hide for professionals
            } else {
                if (myBookingsLink) myBookingsLink.style.display = 'inline';
            }
        } else {
            if (loginLink) loginLink.style.display = 'inline';
            if (userProfile) userProfile.style.display = 'none';
            if (myBookingsLink) myBookingsLink.style.display = 'none';
            if (accountNameEl) accountNameEl.textContent = '';
        }

        if (userProfileTrigger) {
            userProfileTrigger.onclick = function(e) {
                e.stopPropagation();
                userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
            };
        }

        // Close dropdown if clicking outside
        document.addEventListener('click', function() {
            if (userDropdown) userDropdown.style.display = 'none';
        });

        if (logoutBtn) {
            logoutBtn.onclick = function() {
                localStorage.removeItem('customerName');
                localStorage.removeItem('token');
                localStorage.removeItem('isProfessional');
                window.location.href = 'index.html';
            };
        }
    }

    // Load header, and once it's done, run the UI setup. Then load footer.
    loadComponent('body > header:first-of-type', 'header.html', setupHeaderUI);
    loadComponent('body > footer:first-of-type', 'footer.html');
});