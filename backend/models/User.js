import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: function() { return this.role === 'professional'; }
  },
  location: {
    type: String,
    required: function() { return this.role === 'professional'; }
  },
  role: {
    type: String,
    enum: ['customer', 'professional', 'admin'],
    default: 'customer'
  },
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

export default User;
