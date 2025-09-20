document.addEventListener("DOMContentLoaded", function() {
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

    // This function runs *after* the header is loaded into the page
    function setupHeaderUI() {
        const accountName = localStorage.getItem('customerName');
        const loginLink = document.getElementById('loginLink');
        const myBookingsLink = document.getElementById('myBookingsLink');
        const accountNameEl = document.getElementById('accountName');
        const logoutDropdown = document.getElementById('logoutDropdown');
        const logoutBtn = document.getElementById('logoutBtn');

        if (accountName) {
            if (accountNameEl) accountNameEl.textContent = accountName;
            if (loginLink) loginLink.style.display = 'none';
            if (myBookingsLink) myBookingsLink.style.display = 'inline';
        } else {
            if (loginLink) loginLink.style.display = 'inline';
            if (myBookingsLink) myBookingsLink.style.display = 'none';
            if (accountNameEl) accountNameEl.textContent = '';
        }

        if (accountNameEl) {
            accountNameEl.onclick = function(e) {
                e.stopPropagation();
                if (logoutDropdown) {
                    logoutDropdown.style.display = logoutDropdown.style.display === 'block' ? 'none' : 'block';
                }
            };
            document.addEventListener('click', function() {
                if (logoutDropdown) {
                    logoutDropdown.style.display = 'none';
                }
            });
        }

        if (logoutBtn) {
            logoutBtn.onclick = function() {
                localStorage.removeItem('customerName');
                localStorage.removeItem('token');
                window.location.href = 'index.html';
            };
        }
    }

    // Load header, and once it's done, run the UI setup. Then load footer.
    loadComponent('body > header:first-of-type', 'header.html', setupHeaderUI);
    loadComponent('body > footer:first-of-type', 'footer.html');
});