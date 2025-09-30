import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema({
  user_id: { // FK to User
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  booking_id: { // FK to Booking
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    unique: true, // A booking can have at most one review
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  comment: {
    type: String,
  },
}, { timestamps: true });

const Review = mongoose.model('Review', ReviewSchema);

export default Review;
