import mongoose from 'mongoose';

const ServiceSchema = new mongoose.Schema({
  professional_id: { // FK to Professional (which is User's _id)
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the User model, as Professional's _id is User's _id
    required: true,
  },
  service_name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  categories: {
    type: [String], // Array of Strings
    required: true,
  },
}, { timestamps: true });

const Service = mongoose.model('Service', ServiceSchema);

export default Service;
