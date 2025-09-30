import mongoose from 'mongoose';

const ProfessionalSchema = new mongoose.Schema({
  _id: { // This will be the user_id from the User model
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  categories: {
    type: [String],
    default: [],
  },
  is_verified: {
    type: Boolean,
    default: false,
  },
  avg_rating: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

const Professional = mongoose.model('Professional', ProfessionalSchema);

export default Professional;
