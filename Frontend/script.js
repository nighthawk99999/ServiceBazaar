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
        const jobsContainer = document.getElementById("jobsContainer");
        if (jobsContainer && window.location.pathname.includes('professional_dashboard.html')) {
            initProfessionalDashboardPage(jobsContainer);
        }
        
        // --- Refactored Page Initializers for Clarity and Correctness ---

        const servicesContainer = document.getElementById("servicesContainer"); 
        if (servicesContainer && window.location.pathname.includes('services.html')) {
            initServicesPage(servicesContainer);
        }

        const bookingForm = document.getElementById("bookingForm");
        if (bookingForm) {
            initBookingPage(bookingForm);
        }

        const bookingsContainer = document.getElementById("bookingsContainer");
        if (bookingsContainer && window.location.pathname.includes('mybookings.html')) {
            initMyBookingsPage(bookingsContainer);
            initRatingModal(document.getElementById('ratingForm')); // Initialize the modal functionality
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
            const suggestions = services.filter(service => service.toLowerCase().includes(value));
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
            // Get filter controls
            const serviceSearchInput = document.getElementById('serviceSearchInput');
            const pincodeFilter = document.getElementById('pincodeFilter');
            const ratingFilter = document.getElementById('ratingFilter');
            const sortControl = document.getElementById('sortControl');

            const token = localStorage.getItem('token');
            const isProfessional = localStorage.getItem('isProfessional') === 'true';
            // Check for a search query in the URL
            const urlParams = new URLSearchParams(window.location.search);
            const searchTerm = urlParams.get('search');
            
            // If a search term came from the homepage, populate the new search bar with it
            if (searchTerm) {
                serviceSearchInput.value = searchTerm;
            }
            
            const res = await fetch(`${API_URL}/api/services`);
            if (!res.ok) {
                throw new Error('Failed to fetch services');
            }
            let services = await res.json();

            const renderServices = () => {
                let filteredServices = [...services];

                // 1. Filter by the text in the service search input
                const currentSearchTerm = serviceSearchInput.value.trim();
                if (currentSearchTerm) {
                    const lowerCaseSearchTerm = currentSearchTerm.toLowerCase();
                    filteredServices = filteredServices.filter(service => 
                        service.service_name.toLowerCase().includes(lowerCaseSearchTerm) ||
                        service.description.toLowerCase().includes(lowerCaseSearchTerm) ||
                        (service.professional_id && service.professional_id.name.toLowerCase().includes(lowerCaseSearchTerm))
                    );
                }

                // 2. Filter by pincode
                const pincode = pincodeFilter.value.trim();
                if (pincode && pincode.length === 6) {
                    filteredServices = filteredServices.filter(s => s.professional_id && s.professional_id.location === pincode);
                }

                // 3. Filter by rating
                const minRating = parseFloat(ratingFilter.value);
                if (minRating > 0) {
                    filteredServices = filteredServices.filter(s => (s.average_rating || 0) >= minRating);
                }

                // 4. Sort services
                const sortBy = sortControl.value;
                if (sortBy === 'price_asc') {
                    filteredServices.sort((a, b) => a.price - b.price);
                } else if (sortBy === 'price_desc') {
                    filteredServices.sort((a, b) => b.price - a.price);
                }

                displayServices(filteredServices, token, isProfessional); // Pass token and isProfessional
            };

            // Add event listeners to controls
            // Use 'input' for text fields for a live search/filter experience
            serviceSearchInput.addEventListener('input', renderServices);
            pincodeFilter.addEventListener('input', renderServices);
            // Use 'change' for select dropdowns
            [ratingFilter, sortControl].forEach(el => {
                el.addEventListener('change', renderServices);
            });

            // Initial render
            renderServices();

        } catch (error) {
            console.error('Error fetching services:', error);
            container.innerHTML = '<p>Could not load services. Please try again later.</p>';
        }

        function displayServices(services, token, isProfessional) {
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

                // Safely handle rating display
                const ratingHTML = (service.average_rating)
                    ? `<div class="rating" style="margin-top: 0.5rem;">
                           <i class="fa-solid fa-star"></i> ${service.average_rating.toFixed(1)} (${service.review_count || 0} reviews)
                       </div>`
                    : '<div class="rating" style="margin-top: 0.5rem; font-style: italic; color: #888;">No reviews yet</div>';

                // Safely create the provider link only if a professional exists
                const providerHTML = service.professional_id
                    ? `<a href="professional_profile.html?id=${service.professional_id._id}">${service.professional_id.name}</a>`
                    : 'N/A';

                serviceCard.innerHTML = `
                    <div class="service-card-icon"><i class="fa-solid ${iconClass}"></i></div>
                    <h3>${service.service_name}</h3>
                    <div class="service-card-body">
                        <p>${service.description}</p>
                        ${priceHTML}
                        <p style="margin-top: 1rem; font-size: 0.9rem;">
                            <strong>Provider:</strong> ${providerHTML}
                        </p>
                        ${ratingHTML}
                    </div>
                    ${bookNowButton}
                `;
                container.appendChild(serviceCard);
            });
        }
    }

    // --- BOOKING PAGE SCRIPT ---
    function initBookingPage(bookingForm) {
        const token = localStorage.getItem('token');
        if (!token || localStorage.getItem('isProfessional') === 'true') {
            alert('You must be logged in as a customer to book a service.');
            window.location.href = 'login.html';
            return;
        }

        const serviceNameDisplay = document.getElementById('serviceNameDisplay');
        const serviceIdInput = document.getElementById('serviceId');
        const bookingDateInput = document.getElementById('bookingDate');
        const bookingTimeSelect = document.getElementById('bookingTime');

        // Get service details from URL
        const urlParams = new URLSearchParams(window.location.search);
        const serviceId = urlParams.get('serviceId');
        const serviceName = urlParams.get('serviceName');

        if (!serviceId || !serviceName) {
            alert('No service selected. Redirecting to services page.');
            window.location.href = 'services.html';
            return;
        }

        serviceNameDisplay.textContent = `You are booking: ${decodeURIComponent(serviceName)}`;
        serviceIdInput.value = serviceId;

        // Set the minimum date to today
        const today = new Date().toISOString().split('T')[0];
        bookingDateInput.setAttribute('min', today);

        // --- Generate 15-minute time slots from 9 AM to 8 PM ---
        const generateTimeSlots = () => {
            const startTime = 9 * 60; // 9:00 AM in minutes
            const endTime = 20 * 60;  // 8:00 PM in minutes
            const interval = 15;

            for (let minutes = startTime; minutes <= endTime; minutes += interval) {
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;

                // Format for backend (HH:MM)
                const timeString24 = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
                
                // Format for display (e.g., 8:15 AM)
                const hours12 = hours % 12 === 0 ? 12 : hours % 12;
                const ampm = hours < 12 ? 'AM' : 'PM';
                const timeString12 = `${hours12}:${String(mins).padStart(2, '0')} ${ampm}`;

                const option = new Option(timeString12, timeString24);
                bookingTimeSelect.add(option);
            }
        };

        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const bookingDetails = {
                serviceId: serviceIdInput.value,
                bookingDate: bookingDateInput.value,
                bookingTime: bookingTimeSelect.value,
                address: document.getElementById('address').value,
                phone: document.getElementById('customerPhone').value,
                description: document.getElementById('description').value,
                paymentMethod: document.querySelector('input[name="paymentMethod"]:checked').value
            };

            try {
                const res = await fetch(`${API_URL}/api/bookings`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': token
                    },
                    body: JSON.stringify(bookingDetails)
                });

                const data = await res.json();

                if (res.ok) {
                    if (bookingDetails.paymentMethod === 'cod') {
                        alert('Booking confirmed! Please pay the professional in cash after the service is completed.');
                    } else {
                        alert('Booking confirmed! Your booking is scheduled and can be viewed in "My Bookings".');
                    }
                    window.location.href = 'mybookings.html';
                } else {
                    throw new Error(data.error || 'Failed to create booking.');
                }
            } catch (error) {
                console.error('Booking failed:', error);
                alert(`Booking failed: ${error.message}`);
            }
        });

        generateTimeSlots(); // Call the function to populate the dropdown
    }

    // --- MY BOOKINGS PAGE SCRIPT ---
    function initMyBookingsPage(container) {
        const token = localStorage.getItem('token');
        const notificationsContainer = document.getElementById('notificationsContainer');
    
        // If user is not logged in, redirect to login page
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        // Attach the event listener for rating immediately and only once.
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('rate-btn')) {
                e.stopPropagation(); // Stop the click from bubbling up to the window
                const bookingId = e.target.dataset.bookingId;
                const ratingModal = document.getElementById('ratingModal');
                const ratingBookingIdInput = document.getElementById('ratingBookingId');
                
                ratingBookingIdInput.value = bookingId;
                ratingModal.style.display = 'block';
            }
        });

        // Define the async function to fetch and render data
        const fetchAndRenderBookings = async () => {
            try {
                const res = await fetch(`${API_URL}/api/bookings`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': token
                    }
                });
    
                if (res.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('customerName');
                    window.location.href = 'login.html';
                    return;
                }
    
                if (!res.ok) throw new Error('Failed to fetch bookings');
    
                const bookings = await res.json();
    
                notificationsContainer.innerHTML = '';
                container.innerHTML = '';
                if (bookings.length === 0) {
                    container.innerHTML = '<p>You have no bookings yet.</p>';
                    return;
                }
    
                const acceptedNotifications = bookings.filter(b => b.status === 'accepted' && !sessionStorage.getItem(`notified_${b._id}`));
    
                if (acceptedNotifications.length > 0) {
                    acceptedNotifications.forEach(booking => {
                        const scheduleDate = new Date(booking.schedule).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });
                        const notificationCard = document.createElement('div');
                        notificationCard.className = 'notification-card';
                        const serviceName = booking.service_id ? booking.service_id.service_name : 'a deleted service';
                        let professionalInfoHTML = '<p><strong>Professional:</strong> Information not available.</p>';
                        if (booking.professional_id) {
                            professionalInfoHTML = `<p>
                                <strong>Professional:</strong> ${booking.professional_id.name} <br>
                                <strong>Contact Number:</strong> <a href="tel:${booking.professional_id.phone}">${booking.professional_id.phone || 'Not provided'}</a>
                            </p>`;
                        }
                        notificationCard.innerHTML = `
                            <div class="notification-header">
                                <i class="fa-solid fa-bell"></i>
                                <h3>Your Booking has been Accepted!</h3>
                            </div>
                            <p>Your service for <strong>${serviceName}</strong> scheduled on <strong>${scheduleDate}</strong> has been confirmed by the professional.</p>
                            ${professionalInfoHTML}
                        `;
                        notificationsContainer.appendChild(notificationCard);
                        sessionStorage.setItem(`notified_${booking._id}`, 'true');
                    });
                }
    
                bookings.forEach(booking => {
                    const bookingCard = document.createElement('div');
                    bookingCard.className = 'booking-card';
    
                    const scheduleDate = new Date(booking.schedule).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });
                    const isProfessionalView = localStorage.getItem('isProfessional') === 'true';
    
                    let actionButton = '';
                    if (!isProfessionalView && booking.status === 'completed' && !booking.is_rated) {
                        actionButton = `<button class="btn btn-accent rate-btn" data-booking-id="${booking._id}" style="margin-top: 1rem;">Rate Service</button>`;
                    }
    
                    let relevantPartyInfo;
                    if (isProfessionalView) {
                        relevantPartyInfo = `<p><strong>Customer:</strong> ${booking.user_id.name} (${booking.user_id.email})</p>`;
                    } else {
                        if (booking.professional_id) {
                            if (['accepted', 'completed'].includes(booking.status)) {
                                relevantPartyInfo = `<p><strong>Professional:</strong> ${booking.professional_id.name}<br><strong>Contact:</strong> <a href="tel:${booking.professional_id.phone}">${booking.professional_id.phone || 'Not provided'}</a></p>`;
                            } else {
                                relevantPartyInfo = `<p><strong>Professional:</strong> ${booking.professional_id.name}</p>`;
                            }
                        } else {
                            relevantPartyInfo = `<p><strong>Professional:</strong> N/A</p>`;
                        }
                    }
                    
                    const ratedInfo = !isProfessionalView && booking.is_rated
                        ? `<p style="color: var(--primary-color); font-style: italic; margin-top: 1rem;"><i class="fa-solid fa-star"></i> You have rated this service.</p>`
                        : '';
                    
                    const paymentMethodHTML = booking.paymentMethod 
                        ? `<p><strong>Payment Method:</strong> <span style="text-transform: capitalize; font-weight: bold;">${booking.paymentMethod === 'cod' ? 'Cash on Delivery' : booking.paymentMethod}</span></p>`
                        : '';
    
                    const serviceNameForCard = booking.service_id ? booking.service_id.service_name : 'Deleted Service';
    
                    bookingCard.innerHTML = `
                        <h3>${serviceNameForCard}</h3>
                        <p><strong>Status:</strong> <span class="status-${booking.status}">${booking.status}</span></p>
                        <p><strong>Scheduled for:</strong> ${scheduleDate}</p>
                        ${paymentMethodHTML}
                        ${relevantPartyInfo}
                        ${actionButton}
                        ${ratedInfo}
                    `;
                    container.appendChild(bookingCard);
                });
            } catch (error) {
                console.error('Error fetching bookings:', error);
                container.innerHTML = '<p>Could not load your bookings. Please try again later.</p>';
            }
        };

        fetchAndRenderBookings(); // Call the function to start the process
    }

    // --- RATING MODAL SCRIPT ---
    function initRatingModal(ratingForm) {
        if (!ratingForm) return; // Guard clause in case the form isn't on the page

        const stars = ratingForm.querySelectorAll('.star-rating');
        const ratingValueInput = document.getElementById('ratingValue');
        const ratingModal = document.getElementById('ratingModal');
        const closeModalBtn = document.getElementById('closeRatingModal');

        // --- Add the modal closing logic here ---
        if (closeModalBtn) {
            closeModalBtn.onclick = () => ratingModal.style.display = 'none';
        }
        // Use 'mousedown' to prevent conflicts with other click events
        window.addEventListener('mousedown', (event) => {
            if (event.target === ratingModal) {
                ratingModal.style.display = 'none';
            }
        });

        stars.forEach(star => {
            star.addEventListener('mouseover', () => {
                const hoverValue = star.dataset.value;
                stars.forEach(s => {
                    s.classList.toggle('fas', s.dataset.value <= hoverValue);
                    s.classList.toggle('far', s.dataset.value > hoverValue);
                });
            });

            star.addEventListener('click', () => {
                const clickValue = star.dataset.value;
                ratingValueInput.value = clickValue;
            });
        });

        ratingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const bookingId = document.getElementById('ratingBookingId').value;
            const rating = ratingValueInput.value;
            const reviewText = document.getElementById('reviewText').value;

            if (rating === '0') {
                alert('Please select a star rating.');
                return;
            }

            try {
                // This is a new API endpoint you would need to create on your backend
                const res = await fetch(`${API_URL}/api/reviews`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') },
                    body: JSON.stringify({ bookingId, rating, reviewText })
                });
                if (!res.ok) throw new Error('Failed to submit review.');
                alert('Thank you for your feedback!');
                window.location.reload();
            } catch (error) { alert(`Error: ${error.message}`); }
        });
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

                // Conditionally add action buttons based on status
                let actionButtons = '';
                if (job.status === 'pending') {
                    actionButtons = `
                        <div class="booking-actions">
                            <button class="btn btn-primary btn-accept">Accept</button>
                            <button class="btn btn-accent btn-reject">Reject</button>
                        </div>`;
                } else if (job.status === 'accepted') {
                    actionButtons = `
                        <div class="booking-actions">
                            <button class="btn btn-primary btn-complete">Confirm Payment & Complete</button>
                        </div>`;
                }

                // Conditionally display customer contact info based on job status
                const customerContactInfo = (job.status === 'accepted' || job.status === 'completed') && job.customerPhone
                    ? `<p><strong>Customer Contact:</strong> <a href="tel:${job.customerPhone}">${job.customerPhone}</a></p>`
                    : '';

                // Display Payment Method for professional
                const paymentMethodHTML = job.paymentMethod 
                    ? `<p><strong>Payment Method:</strong> <span style="text-transform: capitalize; font-weight: bold;">${job.paymentMethod === 'cod' ? 'Cash on Delivery' : job.paymentMethod}</span></p>`
                    : '';

                jobCard.innerHTML = `
                    <h3>${job.service_id.service_name}</h3>
                    <p><strong>Status:</strong> <span class="status-${job.status}">${job.status}</span></p>
                    <p><strong>Customer:</strong> ${job.user_id.name} (${job.user_id.email})</p>
                    <p><strong>Scheduled for:</strong> ${scheduleDate}</p>
                    ${paymentMethodHTML}
                    ${customerContactInfo}
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
            if (target.classList.contains('btn-reject')) newStatus = 'rejected';

            if (newStatus) {
                // This block handles 'accept' and 'reject'
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

            if (target.classList.contains('btn-complete')) {
                // This block handles 'complete'
                try {
                    const res = await fetch(`${API_URL}/api/bookings/${jobId}/complete`, {
                        method: 'PATCH',
                        headers: { 'x-auth-token': token, 'Content-Type': 'application/json' }
                    });
                    if (!res.ok) throw new Error('Failed to mark job as complete.');
                    fetchAndRenderJobs(); // Refresh the list of jobs
                } catch (error) {
                    console.error('Error completing job:', error);
                    alert('Could not complete the job. Please try again.');
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
        const toggleContainer = formElement.querySelector('.toggle-container');
        const loginBtn = formElement.querySelector('#loginBtn');
        const registerBtn = formElement.querySelector('#registerBtn');
        const renderCustomerForm = () => {
             if (authMode === 'login') {
                title.innerText = `Welcome Back!`;
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
                title.innerText = `Create Your Account`;
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
                const email = formElement.querySelector('#email').value;
                const password = formElement.querySelector('#password').value;

                const res = await fetch(`${API_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();

                if (res.ok) {
                    // Save token and name, then redirect
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('isProfessional', 'false'); // Explicitly set role
                    localStorage.setItem('customerName', data.name || email);
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
                
                if (res.ok) {
                    const data = await res.json();
                    alert("Account created successfully! Please log in.");
                    loginBtn.click(); // Programmatically switch to the login view
                } else {
                    const data = await res.json();
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
                const email = formElement.querySelector('#email').value;
                const password = formElement.querySelector('#password').value;

                const res = await fetch(`${API_URL}/api/professional/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();

                if (res.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('isProfessional', 'true'); // Set role to professional
                    localStorage.setItem('customerName', data.name || email);
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
                    alert("Professional account created successfully. Your account is under review and will be activated shortly. You can log in once approved.");
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