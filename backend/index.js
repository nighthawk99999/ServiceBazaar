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


app.use(cors());
app.use(express.json());

// Serve static files from the Frontend folder

// (Static file serving removed for cloud deployment)


// MongoDB Atlas connection
mongoose.connect(process.env.MONGO_URI);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// User registration
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) {
      // Check if this email is already registered as a professional
      const isProfessional = await Professional.findById(exists._id);
      if (isProfessional) {
        return res.status(400).json({ error: 'This email is registered as a Professional. Please use a different email.' });
      }
      return res.status(400).json({ error: 'Email already registered' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: 'User registered!', userId: user._id });
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

    // --- FIX: Block professionals from using the customer login ---
    const isProfessional = await Professional.findById(user._id);
    if (isProfessional) {
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
    const { name, email, password, phone, location, categories } = req.body; // Added phone
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ error: 'Email already registered' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({ name, email, password: hashedPassword, phone }); // Add phone to User model
    await user.save();

    const professional = new Professional({ _id: user._id, location, categories: categories || [] }); // Link to User and save categories
    await professional.save();

    res.status(201).json({ message: 'Professional registered!', userId: user._id, professionalId: professional._id });
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

    const professional = await Professional.findById(user._id);
    if (!professional) return res.status(403).json({ error: 'Not a professional account' });

    const payload = { user: { id: user.id, isProfessional: true } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, name: user.name, userId: user._id, professionalId: professional._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Create a new booking
app.post('/api/bookings', auth, async (req, res) => {
  try {
    // --- NEW VALIDATION ---
    // Check if the user making the request is a professional
    const isProfessional = await Professional.findById(req.user.id);
    if (isProfessional) {
      return res.status(403).json({ error: 'Professionals are not allowed to book services.' });
    }

    const { serviceId, bookingDate, bookingTime, address, description } = req.body;

    // Find the service by its ID to get the professional's ID
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ error: `Service not found.` });
    }

    const newBooking = new Booking({
      user_id: req.user.id, // Set user ID from authenticated user
      service_id: service._id,
      professional_id: service.professional_id, // Add the professional's ID
      schedule: new Date(`${bookingDate}T${bookingTime}`), // Combine date and time
      address, // Save the address
      description, // Save the job description
      status: 'pending' // Default status
    });

    const booking = await newBooking.save();
    res.status(201).json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Get all bookings for the authenticated user (customer or professional)
app.get('/api/bookings', auth, async (req, res) => {
  try {
    // Check if the authenticated user is a professional
    const isProfessional = await Professional.findById(req.user.id);

    let query;
    if (isProfessional) {
      // If professional, find bookings where they are the provider
      query = { professional_id: req.user.id };
    } else {
      // If customer, find bookings they created
      query = { user_id: req.user.id };
    }

    const bookings = await Booking.find(query)
      .populate('service_id', 'service_name description') // Add service details
      .populate('user_id', 'name email') // Add customer details
      .populate('professional_id', 'name') // Add professional's name
      .sort({ schedule: -1 }); // Sort by upcoming schedule
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Create a new service (Professional only)
app.post('/api/services', auth, async (req, res) => {
  try {
    const { service_name, description, categories } = req.body;

    // Check if the authenticated user is a professional
    const professional = await Professional.findById(req.user.id);
    if (!professional) {
      return res.status(403).json({ msg: 'Only professionals can create services' });
    }

    const newService = new Service({
      professional_id: req.user.id,
      service_name,
      description,
      categories,
    });

    const service = await newService.save();
    res.status(201).json(service);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Get all services
app.get('/api/services', async (req, res) => {
  try {
    const services = await Service.find().populate('professional_id', 'name email'); // Populate professional details
    res.json(services);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Get services for the logged-in professional
app.get('/api/services/my', auth, async (req, res) => {
  try {
    // Check if the user is a professional
    const professional = await Professional.findById(req.user.id);
    if (!professional) {
      return res.status(403).json({ msg: 'Access denied. Not a professional.' });
    }

    // Find services created by this professional
    const services = await Service.find({ professional_id: req.user.id }).sort({ createdAt: -1 });
    res.json(services);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Get a single service by ID
app.get('/api/services/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).populate('professional_id', 'name email');
    if (!service) {
      return res.status(404).json({ msg: 'Service not found' });
    }
    res.json(service);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Update a service (Professional only, and only their own service)
app.put('/api/services/:id', auth, async (req, res) => {
  try {
    const { service_name, description, categories } = req.body;

    let service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ msg: 'Service not found' });
    }

    // Check if the professional owns the service
    if (service.professional_id.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    service.service_name = service_name || service.service_name;
    service.description = description || service.description;
    service.categories = categories || service.categories;

    await service.save();
    res.json(service);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Delete a service (Professional only, and only their own service)
app.delete('/api/services/:id', auth, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ msg: 'Service not found' });
    }

    // Check if the professional owns the service
    if (service.professional_id.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    await service.deleteOne(); // Use deleteOne() instead of remove()
    res.json({ msg: 'Service removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Create a new payment
app.post('/api/payments', auth, async (req, res) => {
  try {
    const { booking_id, status } = req.body;

    const newPayment = new Payment({
      booking_id,
      status,
    });

    const payment = await newPayment.save();
    res.status(201).json(payment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Get a single payment by ID
app.get('/api/payments/:id', auth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate('booking_id');
    if (!payment) {
      return res.status(404).json({ msg: 'Payment not found' });
    }
    res.json(payment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Update payment status
app.put('/api/payments/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;

    let payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ msg: 'Payment not found' });
    }

    payment.status = status || payment.status;

    await payment.save();
    res.json(payment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Create a new review
app.post('/api/reviews', auth, async (req, res) => {
  try {
    const { booking_id, rating, comment } = req.body;

    // Check if a review already exists for this booking
    const existingReview = await Review.findOne({ booking_id });
    if (existingReview) {
      return res.status(400).json({ msg: 'This booking has already been reviewed' });
    }

    const newReview = new Review({
      user_id: req.user.id,
      booking_id,
      rating,
      comment,
    });

    const review = await newReview.save();
    res.status(201).json(review);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Get a single review by ID
app.get('/api/reviews/:id', async (req, res) => {
  try {
    const review = await Review.findById(req.params.id).populate('user_id', 'name email').populate('booking_id');
    if (!review) {
      return res.status(404).json({ msg: 'Review not found' });
    }
    res.json(review);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Get review by booking ID
app.get('/api/reviews/booking/:booking_id', async (req, res) => {
  try {
    const review = await Review.findOne({ booking_id: req.params.booking_id }).populate('user_id', 'name email').populate('booking_id');
    if (!review) {
      return res.status(404).json({ msg: 'Review not found for this booking' });
    }
    res.json(review);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Create a new support ticket
app.post('/api/support-tickets', auth, async (req, res) => {
  try {
    const { subject } = req.body;

    const newSupportTicket = new SupportTicket({
      user_id: req.user.id,
      subject,
    });

    const supportTicket = await newSupportTicket.save();
    res.status(201).json(supportTicket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Get all support tickets (Professional only)
app.get('/api/support-tickets', auth, async (req, res) => {
  try {
    const professional = await Professional.findById(req.user.id);
    if (!professional) {
      return res.status(403).json({ msg: 'Only professionals can view all support tickets' });
    }

    const supportTickets = await SupportTicket.find().populate('user_id', 'name email').sort({ createdAt: -1 });
    res.json(supportTickets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Get all support tickets for a specific user
app.get('/api/support-tickets/user/:user_id', auth, async (req, res) => {
  try {
    // Check if the authenticated user is the owner of the tickets or a professional
    const isProfessional = await Professional.findById(req.user.id);
    if (req.user.id !== req.params.user_id && !isProfessional) {
      return res.status(401).json({ msg: 'User not authorized to view these tickets' });
    }

    const supportTickets = await SupportTicket.find({ user_id: req.params.user_id }).populate('user_id', 'name email').sort({ createdAt: -1 });
    res.json(supportTickets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Get a single support ticket by ID
app.get('/api/support-tickets/:id', auth, async (req, res) => {
  try {
    const supportTicket = await SupportTicket.findById(req.params.id).populate('user_id', 'name email');
    if (!supportTicket) {
      return res.status(404).json({ msg: 'Support ticket not found' });
    }

    // Check if the authenticated user is the owner of the ticket or a professional
    const isProfessional = await Professional.findById(req.user.id);
    if (supportTicket.user_id.toString() !== req.user.id && !isProfessional) {
      return res.status(401).json({ msg: 'User not authorized to view this ticket' });
    }

    res.json(supportTicket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Update support ticket status (Professional only)
app.put('/api/support-tickets/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;

    const professional = await Professional.findById(req.user.id);
    if (!professional) {
      return res.status(403).json({ msg: 'Only professionals can update support ticket status' });
    }

    let supportTicket = await SupportTicket.findById(req.params.id);
    if (!supportTicket) {
      return res.status(404).json({ msg: 'Support ticket not found' });
    }

    supportTicket.status = status || supportTicket.status;

    await supportTicket.save();
    res.json(supportTicket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Protected route
app.get('/api/auth/user', auth, async (req, res) => {
  try {
    // req.user is set by the auth middleware
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const professional = await Professional.findById(req.user.id);
    const isProfessional = !!professional;

    res.json({ ...user.toObject(), isProfessional });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});