document.addEventListener('DOMContentLoaded', () => {

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
        if (bookingsContainer && window.location.pathname.includes('mybookings.html')) {
            initMyBookingsPage(bookingsContainer); // Only run on the customer's "My Bookings" page
        }
        const jobsContainer = document.getElementById("jobsContainer");
        if (jobsContainer && window.location.pathname.includes('professional_dashboard.html')) {
            initProfessionalDashboardPage(jobsContainer);
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
            const token = localStorage.getItem('token');
            const isProfessional = localStorage.getItem('isProfessional') === 'true';
            // Check for a search query in the URL
            const urlParams = new URLSearchParams(window.location.search);
            const searchTerm = urlParams.get('search');

            const res = await fetch(`${API_URL}/api/services`);
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

                const iconClass = 'fa-toolbox'; // Default icon for all services now

                // Determine which "Book Now" button to show based on user status
                let bookNowButton;
                if (!token) {
                    // Not logged in
                    bookNowButton = `<a href="login.html" class="btn btn-primary" onclick="alert('Please log in or create an account to book a service.');">Book Now</a>`;
                } else if (isProfessional) {
                    // Logged in as a professional
                    bookNowButton = `<a href="#" class="btn btn-primary professional-book-notice" onclick="event.preventDefault(); alert('Please log in as a customer to book services.');">Book Now</a>`;
                } else {
                    // Logged in as a customer
                    bookNowButton = `<a href="booking.html?serviceId=${service._id}&serviceName=${encodeURIComponent(service.service_name)}" class="btn btn-primary">Book Now</a>`;
                }

                // Safely handle the price display
                const priceHTML = (service.price !== undefined && service.price !== null)
                    ? `<p style="font-size: 1.2rem; font-weight: bold; color: var(--primary-color); margin-top: 1rem;">₹${Number(service.price).toLocaleString('en-IN')}</p>`
                    : ''; // If no price, don't show anything

                serviceCard.innerHTML = `
                    <div class="service-card-icon"><i class="fa-solid ${iconClass}"></i></div>
                    <h3>${service.service_name}</h3>
                    <div class="service-card-body">
                        <p>${service.description}</p>
                        ${priceHTML}
                        <p style="margin-top: 1rem; font-size: 0.9rem;"><strong>Provider:</strong> ${service.professional_id ? service.professional_id.name : 'N/A'}</p>
                    </div>
                    ${bookNowButton}
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
            const res = await fetch(`${API_URL}/api/bookings`, {
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

            if (!res.ok) {
                throw new Error('Failed to fetch bookings');
            }

            const bookings = await res.json();

            container.innerHTML = '';
            if (bookings.length === 0) {
                container.innerHTML = '<p>You have no bookings yet.</p>';
                return;
            }

            bookings.forEach(booking => {
                const bookingCard = document.createElement('div');
                bookingCard.className = 'booking-card';

                const scheduleDate = new Date(booking.schedule).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });
                const isProfessionalView = localStorage.getItem('isProfessional') === 'true';

                // Conditionally show the other party's information
                const relevantPartyInfo = isProfessionalView
                    ? `<p><strong>Customer:</strong> ${booking.user_id.name} (${booking.user_id.email})</p>`
                    : `<p><strong>Professional:</strong> ${booking.professional_id.name}</p>`;
                
                bookingCard.innerHTML = `
                    <h3>${booking.service_id.service_name}</h3>
                    <p><strong>Status:</strong> <span class="status-${booking.status}">${booking.status}</span></p>
                    <p><strong>Scheduled for:</strong> ${scheduleDate}</p>
                    <p><strong>Address:</strong> ${booking.address}</p>
                    <p><strong>Description:</strong> ${booking.description}</p>
                    ${relevantPartyInfo}
                `;
                container.appendChild(bookingCard);
            });

        } catch (error) {
            console.error('Error fetching bookings:', error);
            container.innerHTML = '<p>Could not load your bookings. Please try again later.</p>';
        }
    }

    // --- PROFESSIONAL DASHBOARD SCRIPT ---
    async function initProfessionalDashboardPage(container) {
        const token = localStorage.getItem('token');

        // Redirect to login if not authenticated
        if (!token) {
            window.location.href = 'login_professional.html';
            return;
        }

        const fetchAndRenderJobs = async () => {
            try {
                const res = await fetch(`${API_URL}/api/bookings`, {
                    headers: {
                        'x-auth-token': token,
                        'Content-Type': 'application/json'
                    }
                });

                if (!res.ok) throw new Error('Failed to fetch jobs.');

                const jobs = await res.json();
                renderJobs(jobs);

            } catch (error) {
                console.error('Error fetching jobs:', error);
                container.innerHTML = '<p>Could not load your jobs. Please try again later.</p>';
            }
        };

        function renderJobs(jobs) {
            container.innerHTML = ''; // Clear loading message
            if (jobs.length === 0) {
                container.innerHTML = '<p>You have no jobs yet. Ensure your services are set up to receive bookings.</p>';
                return;
            }

            jobs.forEach(job => {
                const jobCard = document.createElement('div');
                jobCard.className = 'booking-card';
                jobCard.dataset.jobId = job._id; // Add job ID for updates

                const scheduleDate = new Date(job.schedule).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });

                // Conditionally add action buttons if the status is 'pending'
                const actionButtons = job.status === 'pending' ? `
                    <div class="booking-actions">
                        <button class="btn btn-primary btn-accept">Accept</button>
                        <button class="btn btn-accent btn-reject">Reject</button>
                    </div>
                ` : '';

                jobCard.innerHTML = `
                    <h3>${job.service_id.service_name}</h3>
                    <p><strong>Status:</strong> <span class="status-${job.status}">${job.status}</span></p>
                    <p><strong>Customer:</strong> ${job.user_id.name} (${job.user_id.email})</p>
                    <p><strong>Scheduled for:</strong> ${scheduleDate}</p>
                    <p><strong>Customer Address:</strong> ${job.address}</p>
                    <p><strong>Job Details:</strong> ${job.description}</p>
                    ${actionButtons}
                `;
                container.appendChild(jobCard);
            });
        }

        // Event delegation for handling accept/reject clicks
        container.addEventListener('click', async (e) => {
            const target = e.target;
            const card = target.closest('.booking-card');
            if (!card) return;

            const jobId = card.dataset.jobId;
            let newStatus = null;

            if (target.classList.contains('btn-accept')) newStatus = 'accepted';
            else if (target.classList.contains('btn-reject')) newStatus = 'rejected';

            if (newStatus) {
                try {
                    const res = await fetch(`${API_URL}/api/bookings/${jobId}/status`, {
                        method: 'PATCH',
                        headers: { 'x-auth-token': token, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: newStatus })
                    });
                    if (!res.ok) throw new Error('Failed to update status.');
                    fetchAndRenderJobs(); // Refresh the list of jobs
                } catch (error) {
                    console.error('Error updating job status:', error);
                    alert('Could not update the job status. Please try again.');
                }
            }
        });

        fetchAndRenderJobs();
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
                        <input type="password" id="regPassword" placeholder="Create Password" required minlength="8" title="Password must be at least 8 characters long.">
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

                // Determine if input is likely an email
                const isEmail = emailOrUsername.includes('@');
                const loginPayload = isEmail ? { email: emailOrUsername, password } : { name: emailOrUsername, password };

                const res = await fetch(`${API_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(loginPayload)
                });
                const data = await res.json();

                if (res.ok) {
                    // Save token and name, then redirect
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('isProfessional', 'false'); // Explicitly set role
                    localStorage.setItem('customerName', data.name || emailOrUsername);
                    window.location.href = 'index.html';
                } else if (res.status === 403) {
                    alert('This is a professional account. Please use the Partner Login page.');
                } else {
                    alert(data.error || 'Invalid credentials. Please try again.');
                }
            } else {
                // Customer Registration
                const name = formElement.querySelector('#regUsername').value;
                const email = formElement.querySelector('#regEmail').value;
                const password = formElement.querySelector('#regPassword').value;
                const res = await fetch(`${API_URL}/api/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });
                const data = await res.json();
                
                if (res.ok) {
                    alert(data.message); // e.g., "Account created successfully. Please log in."
                    loginBtn.click(); // Programmatically switch to the login view
                } else {
                    alert(data.error || 'Registration failed. Please try again.');
                }
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
                
                let servicesHTML = SERVICE_CATEGORIES.map(service => {
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
                        <input type="tel" id="regPhone" placeholder="10-Digit Phone Number" required pattern="[0-9]{10}" maxlength="10" title="Please enter a valid 10-digit phone number.">
                        <span class="icon"><i class="fa-solid fa-phone"></i></span>
                    </div>
                    <div class="service-selection-container">
                        <span class="service-selection-label">Select Your Services</span>
                        <div class="service-tags-grid">${servicesHTML}</div>
                    </div>
                     <div class="input-group">
                        <input type="tel" id="regLocation" placeholder="6-Digit Pincode" required pattern="[0-9]{6}" maxlength="6" title="Please enter a valid 6-digit pincode.">
                        <span class="icon"><i class="fa-solid fa-map-marker-alt"></i></span>
                    </div>
                    <div class="input-group">
                        <input type="password" id="regPassword" placeholder="Create Password" required minlength="8" title="Password must be at least 8 characters long.">
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

                const isEmail = emailOrUsername.includes('@');
                const loginPayload = isEmail ? { email: emailOrUsername, password } : { name: emailOrUsername, password };

                const res = await fetch(`${API_URL}/api/professional/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(loginPayload)
                });
                const data = await res.json();

                if (res.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('isProfessional', 'true'); // Set role to professional
                    localStorage.setItem('customerName', data.name || emailOrUsername);
                    window.location.href = 'index.html';
                } else if (res.status === 403) {
                    alert('This is a customer account. Please use the Customer Login page.');
                } else {
                    alert(data.error || 'Invalid credentials. Please try again.');
                }
            } else {
                // Professional Registration
                const name = formElement.querySelector('#regFullName').value;
                const email = formElement.querySelector('#regEmail').value;
                const password = formElement.querySelector('#regPassword').value;
                const phone = formElement.querySelector('#regPhone').value;
                const location = formElement.querySelector('#regLocation').value;
                const selectedServices = Array.from(formElement.querySelectorAll('input[name="services"]:checked')).map(cb => cb.value);

                const res = await fetch(`${API_URL}/api/professional/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password, phone, location, categories: selectedServices })
                });
                const data = await res.json();

                if (res.ok) {
                    alert(data.message); // e.g., "Professional account created successfully. Please log in."
                    loginBtn.click(); // Programmatically switch to the login view
                } else {
                    alert(data.error || 'Registration failed. Please try again.');
                }
            }
        });

        renderProfessionalForm();
    }

    initPage();
});