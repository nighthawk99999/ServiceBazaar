import mongoose from 'mongoose';

const BookingSchema = new mongoose.Schema({
  user_id: { // FK to User
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  service_id: { // FK to Service
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
  },
  schedule: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending',
  },
}, { timestamps: true });

const Booking = mongoose.model('Booking', BookingSchema);

export default Booking;
