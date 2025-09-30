import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import auth from './middleware/auth.js';
import User from './models/User.js';
import Professional from './models/Professional.js';
import Service from './models/Service.js';
import Booking from './models/Booking.js';
import Review from './models/Review.js';

dotenv.config();

const app = express();
const PORT = 5000;

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const allowedOrigins = ['https://servicebazaar-frontend.onrender.com', 'http://localhost:5500', 'http://127.0.0.1:5500'];
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
    }
    return callback(null, true);
  }
}));
app.use(express.json());

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
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

app.post('/api/professional/register', async (req, res) => {
  try {
    const { name, email, password, phone, location, categories } = req.body;
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

app.post('/api/services', auth, async (req, res) => {
  try {
    const professional = await Professional.findById(req.user.id);
    if (!professional) {
      return res.status(403).json({ msg: 'Only professionals can add services.' });
    }

    const { service_name, description, price } = req.body;
    if (!service_name || !description || price === undefined) {
      return res.status(400).json({ msg: 'Please provide service name, description, and price.' });
    }
    if (isNaN(price) || price < 0) {
      return res.status(400).json({ msg: 'Please provide a valid, non-negative price.' });
    }

    const newService = new Service({
      professional_id: req.user.id,
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

app.delete('/api/services/:id', auth, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ msg: 'Service not found.' });
    }

    if (service.professional_id.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized to delete this service.' });
    }

    await Booking.deleteMany({ service_id: req.params.id });
    await Service.findByIdAndDelete(req.params.id);

    res.json({ msg: 'Service and associated bookings removed.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

app.put('/api/services/:id', auth, async (req, res) => {
  try {
    const { service_name, description, price } = req.body;

    let service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ msg: 'Service not found.' });
    }

    if (service.professional_id.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized to update this service.' });
    }

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

app.patch('/api/bookings/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status provided. Must be "accepted" or "rejected".' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    if (booking.professional_id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to update this booking.' });
    }

    booking.status = status;
    await booking.save();

    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.patch('/api/bookings/:id/complete', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    if (booking.professional_id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to update this booking.' });
    }
    if (booking.status !== 'accepted') {
      return res.status(400).json({ error: `Cannot complete a job with status: ${booking.status}.` });
    }

    booking.status = 'completed';
    await booking.save();

    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.post('/api/bookings', auth, async (req, res) => {
  try {
    const isProfessional = await Professional.findById(req.user.id);
    if (isProfessional) {
      return res.status(403).json({ error: 'Professionals are not allowed to book services.' });
    }

    const { serviceId, bookingDate, bookingTime, address, phone, description, paymentMethod } = req.body;

    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'A valid 10-digit phone number is required.' });
    }

    const bookingDateTime = new Date(`${bookingDate}T${bookingTime}`);
    if (isNaN(bookingDateTime.getTime())) {
      return res.status(400).json({ error: 'Invalid date or time format provided.' });
    }
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
      schedule: bookingDateTime,
      customerPhone: phone,
      address,
      description,
      status: 'pending',
      paymentMethod: paymentMethod || 'cod'
    });

    const booking = await newBooking.save();
    res.status(201).json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.get('/api/services', async (req, res) => {
  try {
    const servicesWithRatings = await Service.aggregate([
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'service_id',
          as: 'reviews'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'professional_id',
          foreignField: '_id',
          as: 'professional_info'
        }
      },
      { $unwind: { path: '$professional_info', preserveNullAndEmptyArrays: false } },
      {
        $addFields: {
          average_rating: { $avg: '$reviews.rating' },
          review_count: { $size: '$reviews' },
          'professional_id.name': '$professional_info.name',
          'professional_id.location': '$professional_info.location'
        }
      },
      { $project: { reviews: 0, professional_info: 0 } }
    ]);
    res.json(servicesWithRatings);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

app.get('/api/professionals/:id', async (req, res) => {
  try {
    const professional = await User.findOne({ _id: req.params.id, role: 'professional' }).select('-password');

    if (!professional) {
      return res.status(404).json({ msg: 'Professional not found.' });
    }

    const services = await Service.find({ professional_id: req.params.id });
    const reviews = await Review.find({ professional_id: req.params.id })
      .populate('user_id', 'name')
      .sort({ createdAt: -1 });

    res.json({
      _id: professional._id,
      name: professional.name,
      location: professional.location,
      createdAt: professional.createdAt,
      services,
      reviews
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

app.get('/api/reviews/service/:serviceId', async (req, res) => {
  try {
    const reviews = await Review.find({ service_id: req.params.serviceId })
      .populate('user_id', 'name')
      .sort({ createdAt: -1 });

    if (!reviews) {
      return res.json([]);
    }
    res.json(reviews);
  } catch (err) {
    console.error(err.message);
    if (err.name === 'CastError') {
      return res.status(400).json({ msg: 'Invalid service ID format.' });
    }
    res.status(500).send('Server Error');
  }
});

app.post('/api/reviews', auth, async (req, res) => {
  try {
    const { bookingId, rating, reviewText } = req.body;

    if (!bookingId || !rating) {
      return res.status(400).json({ msg: 'Booking ID and rating are required.' });
    }
    const numericRating = Number(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ msg: 'Rating must be a number between 1 and 5.' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found.' });
    }
    if (booking.user_id.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'You are not authorized to review this booking.' });
    }
    if (booking.status !== 'completed') {
      return res.status(400).json({ msg: 'You can only review completed services.' });
    }
    if (booking.is_rated) {
      return res.status(400).json({ msg: 'This service has already been rated.' });
    }
    const newReview = new Review({
      user_id: req.user.id,
      professional_id: booking.professional_id,
      service_id: booking.service_id,
      booking_id: bookingId,
      rating: numericRating,
      comment: reviewText
    });
    await newReview.save();
    booking.is_rated = true;
    await booking.save();

    res.status(201).json(newReview);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

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
    bookings = bookings.filter(booking => booking.professional_id && booking.service_id);
    if (isProfessional) {
      bookings = bookings.map(booking => {
        const bookingObject = booking.toObject(); 
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
    process.exit(1);
  });