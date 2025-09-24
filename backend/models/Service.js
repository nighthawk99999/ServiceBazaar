import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  professional_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
  price: {
    type: Number,
    required: true,
    min: 0,
  },
}, { timestamps: true });

const Service = mongoose.model('Service', serviceSchema);

export default Service;