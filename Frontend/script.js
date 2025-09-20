document.addEventListener('DOMContentLoaded', () => {

    // --- GLOBAL FUNCTIONS ---
    function updateAuthUI() {
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
            if (accountNameEl) accountNameEl.textContent = ''; // Clear if no user
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

    // --- INITIALIZER ---
    function initPage() {
        updateAuthUI(); // Call on every page load

        const searchInput = document.getElementById("searchInput");
        if (searchInput) {
            initHomePage(searchInput);
        }
        const customerForm = document.getElementById("customerAuthForm");
        if (customerForm) {
            initCustomerLoginPage(customerForm);
        }
        const professionalForm = document.getElementById("professionalAuthForm");
        if (professionalForm) {
            initProfessionalLoginPage(professionalForm);
        }
    }

    // --- HOMEPAGE SCRIPT ---
    function initHomePage(searchInput) {
        const services = [
            "Plumbing", "Electrical", "Masonry", "Carpentry", "Painting",
            "Cleaning", "Appliance Repair", "Gardening & Landscaping"
        ];
        searchInput.addEventListener("input", function () {
            const value = this.value.toLowerCase();
            closeSuggestions();
            if (!value) return;
            const suggestions = services.filter(service => service.toLowerCase().startsWith(value));
            if (suggestions.length === 0) return;
            const suggestionBox = document.createElement("ul");
            suggestionBox.classList.add("suggestions");
            suggestions.forEach(s => {
                const li = document.createElement("li");
                li.textContent = s;
                li.addEventListener("click", () => {
                    searchInput.value = s;
                    closeSuggestions();
                });
                suggestionBox.appendChild(li);
            });
            searchInput.parentNode.appendChild(suggestionBox);
        });
        function closeSuggestions() {
            const oldSuggestions = document.querySelectorAll(".suggestions");
            oldSuggestions.forEach(el => el.remove());
        }
        document.addEventListener("click", function (e) {
            if (!searchInput.contains(e.target)) {
                closeSuggestions();
            }
        });
    }

    // --- CUSTOMER LOGIN PAGE SCRIPT ---
    function initCustomerLoginPage(formElement) {
        let authMode = 'login';
        const formFields = formElement.querySelector("#formFields");
        const title = formElement.parentElement.querySelector("#formTitle");
        const actionBtn = formElement.querySelector("#formActionBtn");
        const loginOptions = formElement.querySelector("#loginOptions");
        const toggleContainer = formElement.querySelector('.toggle-container');
        const loginBtn = formElement.querySelector('#loginBtn');
        const registerBtn = formElement.querySelector('#registerBtn');
        const renderCustomerForm = () => {
             if (authMode === 'login') {
                title.innerText = `Welcome Back!`;
                loginOptions.style.display = 'flex';
                formFields.innerHTML = `
                    <div class="input-group">
                        <input type="text" id="username" placeholder="Username or Email" required>
                        <span class="icon"><i class="fa-solid fa-user"></i></span>
                    </div>
                    <div class="input-group">
                        <input type="password" id="password" placeholder="Password" required>
                        <span class="icon"><i class="fa-solid fa-lock"></i></span>
                    </div>
                `;
                actionBtn.innerText = "Login";
            } else {
                title.innerText = `Create Your Account`;
                loginOptions.style.display = 'none';
                formFields.innerHTML = `
                    <div class="input-group">
                        <input type="text" id="regUsername" placeholder="Full Name" required>
                        <span class="icon"><i class="fa-solid fa-user"></i></span>
                    </div>
                    <div class="input-group">
                        <input type="email" id="regEmail" placeholder="Email Address" required>
                        <span class="icon"><i class="fa-solid fa-envelope"></i></span>
                    </div>
                    <div class="input-group">
                        <input type="password" id="regPassword" placeholder="Create Password" required>
                        <span class="icon"><i class="fa-solid fa-lock"></i></span>
                    </div>
                `;
                actionBtn.innerText = "Create Account";
            }
        };
        loginBtn.addEventListener('click', () => {
            authMode = 'login';
            toggleContainer.classList.remove('register-active');
            loginBtn.classList.add('active');
            registerBtn.classList.remove('active');
            renderCustomerForm();
        });
        registerBtn.addEventListener('click', () => {
            authMode = 'register';
            toggleContainer.classList.add('register-active');
            loginBtn.classList.remove('active');
            registerBtn.classList.add('active');
            renderCustomerForm();
        });
        formElement.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (authMode === 'login') {
                // Customer Login
                const emailOrUsername = formElement.querySelector('#username').value;
                const password = formElement.querySelector('#password').value;
                // Try email first
                let res = await fetch('http://localhost:5000/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: emailOrUsername, password })
                });
                let data = await res.json();
                if (res.ok) {
                    // Save token and name, then redirect
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('customerName', data.name || emailOrUsername);
                    window.location.href = 'index.html';
                    return;
                } else {
                    // Try username as name
                    res = await fetch('http://localhost:5000/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: emailOrUsername, password })
                    });
                    data = await res.json();
                    if (res.ok) {
                        localStorage.setItem('token', data.token);
                        localStorage.setItem('customerName', data.name || emailOrUsername);
                        window.location.href = 'index.html';
                        return;
                    }
                    alert(data.message || data.error);
                }
            } else {
                // Customer Registration
                const name = formElement.querySelector('#regUsername').value;
                const email = formElement.querySelector('#regEmail').value;
                const password = formElement.querySelector('#regPassword').value;
                const res = await fetch('http://localhost:5000/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });
                const data = await res.json();
                alert(data.message || data.error);
            }
        });
        renderCustomerForm();
    }

    // --- PROFESSIONAL LOGIN PAGE SCRIPT ---
    function initProfessionalLoginPage(formElement) {
        let authMode = 'login';
        const formFields = formElement.querySelector("#formFields");
        const title = formElement.parentElement.querySelector("#formTitle");
        const actionBtn = formElement.querySelector("#formActionBtn");
        const toggleContainer = formElement.querySelector('.toggle-container');
        const loginBtn = formElement.querySelector('#loginBtn');
        const registerBtn = formElement.querySelector('#registerBtn');
        const professionalServices = [
            "Plumbing", "Electrical", "Masonry", "Carpentry", "Painting",
            "Cleaning", "Gardening", "Appliance Repair", "Pest Control", "Home Tutoring"
        ];

        const renderProfessionalForm = () => {
            if (authMode === 'login') {
                title.innerText = `Partner Login`;
                formFields.innerHTML = `
                    <div class="input-group">
                        <input type="email" id="email" placeholder="Email Address" required>
                        <span class="icon"><i class="fa-solid fa-envelope"></i></span>
                    </div>
                    <div class="input-group">
                        <input type="password" id="password" placeholder="Password" required>
                        <span class="icon"><i class="fa-solid fa-lock"></i></span>
                    </div>
                `;
                actionBtn.innerText = "Login";
            } else {
                title.innerText = `Join as a Professional`;
                
                let servicesHTML = professionalServices.map(service => {
                    const serviceId = `service-${service.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`;
                    return `
                        <div class="service-tag">
                            <input type="checkbox" id="${serviceId}" name="services" value="${service}">
                            <label for="${serviceId}">${service}</label>
                        </div>
                    `;
                }).join('');

                formFields.innerHTML = `
                    <div class="input-group">
                        <input type="text" id="regFullName" placeholder="Full Name" required>
                        <span class="icon"><i class="fa-solid fa-user"></i></span>
                    </div>
                    <div class="input-group">
                        <input type="email" id="regEmail" placeholder="Email Address" required>
                        <span class="icon"><i class="fa-solid fa-envelope"></i></span>
                    </div>
                    <div class="input-group">
                        <input type="tel" id="regPhone" placeholder="Phone Number" required>
                        <span class="icon"><i class="fa-solid fa-phone"></i></span>
                    </div>
                    <div class="service-selection-container">
                        <span class="service-selection-label">Select Your Services</span>
                        <div class="service-tags-grid">${servicesHTML}</div>
                    </div>
                     <div class="input-group">
                        <input type="text" id="regLocation" placeholder="City / Pincode" required>
                        <span class="icon"><i class="fa-solid fa-map-marker-alt"></i></span>
                    </div>
                    <div class="input-group">
                        <input type="password" id="regPassword" placeholder="Create Password" required>
                        <span class="icon"><i class="fa-solid fa-lock"></i></span>
                    </div>
                `;
                actionBtn.innerText = "Create Professional Account";
            }
        };
        
        loginBtn.addEventListener('click', () => {
            authMode = 'login';
            toggleContainer.classList.remove('register-active');
            loginBtn.classList.add('active');
            registerBtn.classList.remove('active');
            renderProfessionalForm();
        });

        registerBtn.addEventListener('click', () => {
            authMode = 'register';
            toggleContainer.classList.add('register-active');
            loginBtn.classList.remove('active');
            registerBtn.classList.add('active');
            renderProfessionalForm();
        });

        formElement.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (authMode === 'login') {
                // Professional Login
                const email = formElement.querySelector('#email').value;
                const password = formElement.querySelector('#password').value;
                let res = await fetch('http://localhost:5000/api/professional/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                let data = await res.json();
                if (res.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('customerName', data.name || email);
                    window.location.href = 'index.html';
                    return;
                } else {
                    // Try name as login
                    res = await fetch('http://localhost:5000/api/professional/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: email, password })
                    });
                    data = await res.json();
                    if (res.ok) {
                        localStorage.setItem('token', data.token);
                        localStorage.setItem('customerName', data.name || email);
                        window.location.href = 'index.html';
                        return;
                    }
                    alert(data.message || data.error);
                }
            } else {
                // Professional Registration
                const name = formElement.querySelector('#regFullName').value;
                const email = formElement.querySelector('#regEmail').value;
                const password = formElement.querySelector('#regPassword').value;
                const location = formElement.querySelector('#regLocation').value;
                const selectedServices = Array.from(formElement.querySelectorAll('input[name="services"]:checked')).map(cb => cb.value);

                const res = await fetch('http://localhost:5000/api/professional/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password, location, categories: selectedServices })
                });
                const data = await res.json();
                alert(data.message || data.error);
            }
        });

        renderProfessionalForm();
    }

    initPage();
});