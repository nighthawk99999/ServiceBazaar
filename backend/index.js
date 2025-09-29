import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import auth from './middleware/auth.js';

// Import models
import User from './models/User.js';
import Professional from './models/Professional.js';
import Service from './models/Service.js';
import Booking from './models/Booking.js';
import Payment from './models/Payment.js';
import Review from './models/Review.js';
import SupportTicket from './models/SupportTicket.js';

dotenv.config();

const app = express();
const PORT = 5000;

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    // Add your frontend's live URL and local development URLs to the list
    const allowedOrigins = ['https://servicebazaar-frontend.onrender.com', 'http://localhost:5500', 'http://127.0.0.1:5500'];
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
    }
    return callback(null, true);
  }
}));
app.use(express.json());

// User registration
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // --- SERVER-SIDE VALIDATION ---
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.role === 'professional') {
        return res.status(400).json({ error: 'This email is registered as a Professional. Please use a different email.' });
      }
      return res.status(400).json({ error: 'This email is already registered as a customer.' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = new User({ name, email, password: hashedPassword, role: 'customer' });
    await user.save();

    const payload = { user: { id: user.id, isProfessional: false } };
    res.status(201).json({ message: 'Customer account created successfully. Please log in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});


// User login (by email)
app.post('/api/login', async (req, res) => {
  try {
    const { email, name, password } = req.body;
    if (!email && !name) {
      return res.status(400).json({ error: 'Email or name is required' });
    }

    const query = email ? { email } : { name };
    const user = await User.findOne(query);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.role === 'professional') {
      return res.status(403).json({ error: 'This is a professional account. Please use the Partner Login.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, name: user.name, userId: user._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Professional registration
app.post('/api/professional/register', async (req, res) => {
  try {
    const { name, email, password, phone, location, categories } = req.body;

    // --- SERVER-SIDE VALIDATION ---
    if (!name || !email || !password || !phone || !location) {
      return res.status(400).json({ error: 'Name, email, password, phone, and location are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit phone number.' });
    }
    if (!/^\d{6}$/.test(location)) {
      return res.status(400).json({ error: 'Please enter a valid 6-digit pincode for the location.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.role === 'customer') {
        return res.status(400).json({ error: 'This email is already registered as a customer. Please use a different email.' });
      }
      return res.status(400).json({ error: 'This email is already registered as a professional.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({ name, email, password: hashedPassword, phone, location, role: 'professional' });
    await user.save();

    const professional = new Professional({ _id: user._id, location, categories: categories || [] });
    await professional.save();

    const payload = { user: { id: user.id, isProfessional: true } };

    res.status(201).json({ message: 'Professional account created successfully. Please log in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});


// Professional login (by email)
app.post('/api/professional/login', async (req, res) => {
  try {
    const { email, name, password } = req.body;
    if (!email && !name) {
      return res.status(400).json({ error: 'Email or name is required' });
    }

    const query = email ? { email } : { name };
    const user = await User.findOne(query);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.role !== 'professional') return res.status(403).json({ error: 'Not a professional account' });

    const payload = { user: { id: user.id, isProfessional: true } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, name: user.name, userId: user._id, professionalId: user._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// ... (The rest of your routes for bookings, services, etc.)

// Create a new service (for professionals)
app.post('/api/services', auth, async (req, res) => {
  try {
    // 1. Check if the user is a professional
    const professional = await Professional.findById(req.user.id);
    if (!professional) {
      return res.status(403).json({ msg: 'Only professionals can add services.' });
    }

    // 2. Get data from request body
    const { service_name, description, price } = req.body;
    if (!service_name || !description || price === undefined) {
      return res.status(400).json({ msg: 'Please provide service name, description, and price.' });
    }
    if (isNaN(price) || price < 0) {
      return res.status(400).json({ msg: 'Please provide a valid, non-negative price.' });
    }

    // 3. Create and save the new service
    const newService = new Service({
      professional_id: req.user.id, // Link service to the logged-in professional
      service_name,
      description,
      price,
    });
    await newService.save();
    res.status(201).json(newService);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get all services for the logged-in professional
app.get('/api/services/my', auth, async (req, res) => {
  try {
    const services = await Service.find({ professional_id: req.user.id });
    if (!services) {
      return res.status(404).json({ msg: 'No services found for this professional.' });
    }
    res.json(services);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Delete a service (for professionals)
app.delete('/api/services/:id', auth, async (req, res) => {
  try {
    // 1. Find the service by ID
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ msg: 'Service not found.' });
    }

    // 2. Check if the logged-in user owns this service
    if (service.professional_id.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized to delete this service.' });
    }

    // 3. Delete the service and any associated bookings
    await Booking.deleteMany({ service_id: req.params.id });
    await Service.findByIdAndDelete(req.params.id);

    res.json({ msg: 'Service and associated bookings removed.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Update a service (for professionals)
app.put('/api/services/:id', auth, async (req, res) => {
  try {
    const { service_name, description, price } = req.body;

    // 1. Find the service by ID
    let service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ msg: 'Service not found.' });
    }

    // 2. Check if the logged-in user owns this service
    if (service.professional_id.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized to update this service.' });
    }

    // 3. Update the fields and save
    service.service_name = service_name || service.service_name;
    service.description = description || service.description;
    if (price !== undefined) {
      if (isNaN(price) || price < 0) {
        return res.status(400).json({ msg: 'Please provide a valid, non-negative price.' });
      }
      service.price = price;
    }
    await service.save();

    res.json(service);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Update booking status (for professionals: accept/reject)
// This route is placed before '/api/bookings/:id' to ensure it's matched correctly.
app.patch('/api/bookings/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;

    // 1. Validate the incoming status
    if (!status || !['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status provided. Must be "accepted" or "rejected".' });
    }

    // 2. Find the booking and verify the professional
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    // 3. Ensure the logged-in user is the correct professional for this booking
    if (booking.professional_id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to update this booking.' });
    }

    // 4. Update the status and save
    booking.status = status;
    await booking.save();

    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Mark a booking as complete (by professional after receiving payment)
app.patch('/api/bookings/:id/complete', auth, async (req, res) => {
  try {
    // 1. Find the booking by its ID
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    // 2. Ensure the logged-in user is the correct professional for this booking
    if (booking.professional_id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to update this booking.' });
    }

    // 3. Ensure the booking has been 'accepted' before it can be 'completed'
    if (booking.status !== 'accepted') {
      return res.status(400).json({ error: `Cannot complete a job with status: ${booking.status}.` });
    }

    // 4. Update the status to 'completed' and save
    booking.status = 'completed';
    await booking.save();

    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Mark a booking as complete (by professional after receiving payment)
app.patch('/api/bookings/:id/complete', auth, async (req, res) => {
  try {
    // 1. Find the booking by its ID
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    // 2. Ensure the logged-in user is the correct professional for this booking
    if (booking.professional_id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to update this booking.' });
    }

    // 3. Ensure the booking has been 'accepted' before it can be 'completed'
    if (booking.status !== 'accepted') {
      return res.status(400).json({ error: `Cannot complete a job with status: ${booking.status}.` });
    }

    // 4. Update the status to 'completed' and save
    booking.status = 'completed';
    await booking.save();

    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Create a new booking
app.post('/api/bookings', auth, async (req, res) => {
  try {
    const isProfessional = await Professional.findById(req.user.id);
    if (isProfessional) {
      return res.status(403).json({ error: 'Professionals are not allowed to book services.' });
    }

    const { serviceId, bookingDate, bookingTime, address, phone, description, paymentMethod } = req.body;

    // --- VALIDATION ---
    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'A valid 10-digit phone number is required.' });
    }

    const bookingDateTime = new Date(`${bookingDate}T${bookingTime}`);
    if (isNaN(bookingDateTime.getTime())) {
      return res.status(400).json({ error: 'Invalid date or time format provided.' });
    }
    // Check if booking time is in the past
    if (bookingDateTime < new Date()) {
      return res.status(400).json({ error: 'Booking date and time cannot be in the past.' });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ error: `Service not found.` });
    }
    
    const newBooking = new Booking({
      user_id: req.user.id,
      service_id: service._id,
      professional_id: service.professional_id,
      schedule: bookingDateTime, // Use the validated date object
      customerPhone: phone,
      address,
      description,
      status: 'pending',
      paymentMethod: paymentMethod || 'cod' // Default to 'cod' if not provided
    });

    const booking = await newBooking.save();
    res.status(201).json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Get all services (public)
app.get('/api/services', async (req, res) => {
  try {
    // 1. Fetch all services and populate the professional's name and location.
    let services = await Service.find().populate('professional_id', 'name location').lean();

    // 2. Filter out services where the professional has been deleted (professional_id is null)
    services = services.filter(service => service.professional_id !== null);

    // 3. For each remaining service, calculate its average rating and review count.
    const servicesWithRatings = await Promise.all(services.map(async (service) => {
      const reviews = await Review.find({ service_id: service._id });
      
      let average_rating = 0;
      if (reviews.length > 0) {
        const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0);
        average_rating = totalRating / reviews.length;
      }

      return {
        ...service,
        average_rating,
        review_count: reviews.length,
      };
    }));
    res.json(servicesWithRatings);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get a single professional's public profile
app.get('/api/professionals/:id', async (req, res) => {
  try {
    const professional = await User.findOne({ _id: req.params.id, role: 'professional' }).select('-password');

    if (!professional) {
      return res.status(404).json({ msg: 'Professional not found.' });
    }

    // Fetch the professional's services and reviews
    const services = await Service.find({ professional_id: req.params.id });
    const reviews = await Review.find({ professional_id: req.params.id })
      .populate('user_id', 'name') // Get the name of the user who left the review
      .sort({ createdAt: -1 }); // Show newest reviews first

    res.json({
      ...professional.toObject(), // Convert mongoose doc to plain object
      services,
      reviews
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get all reviews for a specific service
app.get('/api/reviews/service/:serviceId', async (req, res) => {
  try {
    const reviews = await Review.find({ service_id: req.params.serviceId })
      .populate('user_id', 'name') // Populate user's name
      .sort({ createdAt: -1 }); // Show newest reviews first

    if (!reviews) {
      return res.json([]); // Return an empty array if no reviews are found
    }

    res.json(reviews);
  } catch (err) {
    console.error(err.message);
    // Check for CastError which happens with an invalid ObjectId
    if (err.name === 'CastError') {
      return res.status(400).json({ msg: 'Invalid service ID format.' });
    }
    res.status(500).send('Server Error');
  }
});

// Create a new review for a booking
app.post('/api/reviews', auth, async (req, res) => {
  try {
    const { bookingId, rating, reviewText } = req.body;

    // 1. Validate input
    if (!bookingId || !rating) {
      return res.status(400).json({ msg: 'Booking ID and rating are required.' });
    }
    const numericRating = Number(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ msg: 'Rating must be a number between 1 and 5.' });
    }

    // 2. Find the booking and perform checks
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found.' });
    }
    // Ensure the person leaving the review is the one who made the booking
    if (booking.user_id.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'You are not authorized to review this booking.' });
    }
    // Ensure the booking is completed
    if (booking.status !== 'completed') {
      return res.status(400).json({ msg: 'You can only review completed services.' });
    }
    // Prevent duplicate reviews
    if (booking.is_rated) {
      return res.status(400).json({ msg: 'This service has already been rated.' });
    }

    // 3. Create and save the review
    const newReview = new Review({
      user_id: req.user.id,
      professional_id: booking.professional_id,
      service_id: booking.service_id,
      booking_id: bookingId,
      rating: numericRating,
      comment: reviewText
    });
    await newReview.save();

    // 4. Mark the booking as rated and save
    booking.is_rated = true;
    await booking.save();

    res.status(201).json(newReview);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get all bookings for the authenticated user (customer or professional)
app.get('/api/bookings', auth, async (req, res) => {
  try {
    const isProfessional = await Professional.findById(req.user.id);

    let query;
    if (isProfessional) {
      query = { professional_id: req.user.id };
    } else {
      query = { user_id: req.user.id };
    }

    let bookings = await Booking.find(query)
      .populate('service_id', 'service_name description')
      .populate('user_id', 'name email')
      .populate('professional_id', 'name phone')
      .sort({ schedule: -1 });
    
    // Filter out bookings where the professional or service has been deleted
    bookings = bookings.filter(booking => booking.professional_id && booking.service_id);

    // If the user is a professional, conditionally hide customer phone number on pending jobs
    if (isProfessional) {
      bookings = bookings.map(booking => {
        const bookingObject = booking.toObject(); // Convert Mongoose doc to plain object to modify it
        if (bookingObject.status === 'pending') {
          delete bookingObject.customerPhone;
        }
        return bookingObject;
      });
    }
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});
// ... (The rest of your file should be here)
// Make sure all your other routes like /api/services are included below this line.
// I have omitted them for brevity but they are necessary for your app to function.

if (!process.env.MONGO_URI) {
  console.error('FATAL ERROR: MONGO_URI is not defined in the environment variables.');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB Atlas.');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1); // Exit the process with an error code
  });