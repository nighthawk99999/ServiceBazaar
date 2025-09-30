import mongoose from 'mongoose';

const SupportTicketSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'closed'],
    default: 'open',
  },
  subject: {
    type: String,
    required: true,
  },
}, { timestamps: true });

const SupportTicket = mongoose.model('SupportTicket', SupportTicketSchema);

export default SupportTicket;
