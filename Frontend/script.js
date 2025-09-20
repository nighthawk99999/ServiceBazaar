document.addEventListener('DOMContentLoaded', () => {

    const API_BASE_URL = 'http://localhost:5000'; // Use local backend for testing

    // --- INITIALIZER ---
    function initPage() {
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const mainNav = document.querySelector('.main-nav');

        if (mobileMenuToggle && mainNav) {
            mobileMenuToggle.addEventListener('click', () => {
                mainNav.classList.toggle('active');
            });
        }

        const heroSearchForm = document.getElementById("heroSearchForm");
        if (heroSearchForm) {
            initHeroSearch(heroSearchForm);
        }

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
        const bookingsContainer = document.getElementById("bookingsContainer");
        if (bookingsContainer) {
            initMyBookingsPage(bookingsContainer);
        }
        const servicesContainer = document.getElementById("servicesContainer");
        if (servicesContainer) {
            initServicesPage(servicesContainer);
        }
    }

    // --- HERO SEARCH SCRIPT (HOMEPAGE) ---
    function initHeroSearch(formElement) {
        formElement.addEventListener('submit', (e) => {
            e.preventDefault();
            const searchInput = formElement.querySelector('#searchInput');
            const searchTerm = searchInput.value.trim();
            if (searchTerm) {
                window.location.href = `services.html?search=${encodeURIComponent(searchTerm)}`;
            }
        });
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

    // --- SERVICES PAGE SCRIPT ---
    async function initServicesPage(container) {
        try {
            // Check for a search query in the URL
            const urlParams = new URLSearchParams(window.location.search);
            const searchTerm = urlParams.get('search');

            const res = await fetch(`${API_BASE_URL}/api/services`);
            if (!res.ok) {
                throw new Error('Failed to fetch services');
            }
            let services = await res.json();

            // If there's a search term, filter the services
            if (searchTerm) {
                const lowerCaseSearchTerm = searchTerm.toLowerCase();
                services = services.filter(service => 
                    service.service_name.toLowerCase().includes(lowerCaseSearchTerm) ||
                    service.description.toLowerCase().includes(lowerCaseSearchTerm)
                );
            }

            if (services.length === 0) {
                container.innerHTML = searchTerm ? `<p>No services found matching "<strong>${searchTerm}</strong>". Try a different search.</p>` : '<p>No services are available at the moment. Please check back later.</p>';
                return;
            }

            container.innerHTML = ''; // Clear the "Loading..." message
            services.forEach(service => {
                const serviceCard = document.createElement('article');
                serviceCard.className = 'service-card-new';

                // A simple way to get an icon based on category
                const getIconClass = (category) => {
                    const cat = category.toLowerCase();
                    if (cat.includes('plumb')) return 'fa-wrench';
                    if (cat.includes('electr')) return 'fa-bolt';
                    if (cat.includes('paint')) return 'fa-paint-roller';
                    if (cat.includes('clean')) return 'fa-broom';
                    return 'fa-toolbox'; // Default icon
                };

                serviceCard.innerHTML = `
                    <div class="service-card-icon"><i class="fa-solid ${getIconClass(service.categories[0] || '')}"></i></div>
                    <h3>${service.service_name}</h3>
                    <div class="service-card-body">
                        <p>${service.description}</p>
                        <p style="margin-top: 1rem; font-size: 0.9rem;"><strong>Provider:</strong> ${service.professional_id.name}</p>
                    </div>
                    <a href="booking.html?service=${encodeURIComponent(service.service_name)}" class="btn btn-primary">Book Now</a>
                `;
                container.appendChild(serviceCard);
            });
        } catch (error) {
            console.error('Error fetching services:', error);
            container.innerHTML = '<p>Could not load services. Please try again later.</p>';
        }
    }

    // --- MY BOOKINGS PAGE SCRIPT ---
    async function initMyBookingsPage(container) {
        const token = localStorage.getItem('token');

        // If user is not logged in, redirect to login page
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/bookings`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token // Send the authentication token
                }
            });

            if (res.status === 401) { // Handle unauthorized access first
                localStorage.removeItem('token');
                localStorage.removeItem('customerName');
                window.location.href = 'login.html';
                return;
            }

            // If the response is not successful, it might be an error or just an empty list.
            if (!res.ok) {
                // We can assume a non-OK status with no bookings means "No bookings yet".
                // A real server error (500) will be caught below.
                const bookings = await res.json().catch(() => []); // Attempt to parse, default to [] on failure
                if (bookings.length === 0) {
                    container.innerHTML = '<p>You have no bookings yet.</p>';
                    return;
                }
                throw new Error('Failed to fetch bookings');
            }

            const bookings = await res.json();

            // Clear the "Loading..." message and render bookings
            container.innerHTML = '';
            bookings.forEach(booking => {
                const bookingCard = document.createElement('div');
                bookingCard.className = 'booking-card';

                const scheduleDate = new Date(booking.schedule).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });

                bookingCard.innerHTML = `
                    <h3>${booking.service_id.service_name}</h3>
                    <p><strong>Status:</strong> <span class="status-${booking.status}">${booking.status}</span></p>
                    <p><strong>Scheduled for:</strong> ${scheduleDate}</p>
                    <p><strong>Customer:</strong> ${booking.user_id.name}</p>
                    <p><strong>Professional:</strong> ${booking.professional_id.name}</p>
                `;
                container.appendChild(bookingCard);
            });

        } catch (error) {
            console.error('Error fetching bookings:', error);
            container.innerHTML = '<p>Could not load your bookings. Please try again later.</p>';
        }
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
                let res = await fetch(`${API_BASE_URL}/api/login`, {
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
                    res = await fetch(`${API_BASE_URL}/api/login`, {
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
                    alert(data.error || 'Invalid credentials.'); // Use the latest error message
                }
            } else {
                // Customer Registration
                const name = formElement.querySelector('#regUsername').value;
                const email = formElement.querySelector('#regEmail').value;
                const password = formElement.querySelector('#regPassword').value;
                const res = await fetch(`${API_BASE_URL}/api/register`, {
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
                        <input type="text" id="username" placeholder="Username or Email" required>
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
                const emailOrUsername = formElement.querySelector('#username').value;
                const password = formElement.querySelector('#password').value;
                let res = await fetch(`${API_BASE_URL}/api/professional/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: emailOrUsername, password })
                });
                let data = await res.json();
                if (res.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('customerName', data.name || emailOrUsername);
                    window.location.href = 'index.html';
                    return;
                } else {
                    // Try name as login
                    res = await fetch(`${API_BASE_URL}/api/professional/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: emailOrUsername, password })
                    });
                    data = await res.json();
                    if (res.ok) {
                        localStorage.setItem('token', data.token); // Save token
                        localStorage.setItem('customerName', data.name || emailOrUsername); // Save name
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

                const res = await fetch(`${API_BASE_URL}/api/professional/register`, {
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