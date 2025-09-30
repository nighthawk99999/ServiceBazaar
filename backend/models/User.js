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
    required: function() { return this.role === 'professional'; } // Required only if the user is a professional
  },
  location: {
    type: String, // Storing pincode as a string
    required: function() { return this.role === 'professional'; }
  },
  role: {
    type: String,
    enum: ['customer', 'professional', 'admin'],
    default: 'customer'
  },
}, {
  timestamps: true,
  // Use a different name for the schema object if you're also defining a variable named UserSchema
});

const User = mongoose.model('User', UserSchema);

export default User;
