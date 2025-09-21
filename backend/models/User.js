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
    required: false, // Optional for customers, but provided for professionals
  },
}, {
  timestamps: true,
  // Use a different name for the schema object if you're also defining a variable named UserSchema
});

const User = mongoose.model('User', UserSchema);

export default User;
