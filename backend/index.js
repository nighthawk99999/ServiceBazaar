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

    // --- SERVER-SIDE VALIDATION ---
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      const isProfessional = await Professional.findById(exists._id);
      if (isProfessional) {
        return res.status(400).json({ error: 'This email is registered as a Professional. Please use a different email.' });
      }
      return res.status(400).json({ error: 'Email already registered' });
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

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ error: 'Email already registered' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({ name, email, password: hashedPassword, phone, role: 'professional' });
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

// Create a new booking
app.post('/api/bookings', auth, async (req, res) => {
  try {
    const isProfessional = await Professional.findById(req.user.id);
    if (isProfessional) {
      return res.status(403).json({ error: 'Professionals are not allowed to book services.' });
    }

    const { serviceId, bookingDate, bookingTime, address, description } = req.body;

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ error: `Service not found.` });
    }

    const newBooking = new Booking({
      user_id: req.user.id,
      service_id: service._id,
      professional_id: service.professional_id,
      schedule: new Date(`${bookingDate}T${bookingTime}`),
      address,
      description,
      status: 'pending'
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
    const isProfessional = await Professional.findById(req.user.id);

    let query;
    if (isProfessional) {
      query = { professional_id: req.user.id };
    } else {
      query = { user_id: req.user.id };
    }

    const bookings = await Booking.find(query)
      .populate('service_id', 'service_name description')
      .populate('user_id', 'name email')
      .populate('professional_id', 'name')
      .sort({ schedule: -1 });
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// ... (The rest of your file should be here)
// Make sure all your other routes like /api/services are included below this line.
// I have omitted them for brevity but they are necessary for your app to function.

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});