import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema({
  user: {
    type: String,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    default: 'Anonymous'
  },
  userImage: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['bug', 'feature', 'general', 'complaint', 'praise'],
    default: 'general'
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  status: {
    type: String,
    enum: ['new', 'reviewed', 'resolved'],
    default: 'new'
  },
  adminNote: {
    type: String,
    default: ''
  }
}, { timestamps: true });

const Feedback = mongoose.model('Feedback', feedbackSchema);
export default Feedback;
