import mongoose from 'mongoose';

const agentLeadSchema = new mongoose.Schema(
  {
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    vacancy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AgentVacancy',
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Student contact info (in case not registered user)
    studentInfo: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String },
    },
    message: {
      type: String,
      maxlength: 500,
    },
    preferredMoveInDate: Date,
    preferredRoomType: String,
    status: {
      type: String,
      enum: ['new', 'contacted', 'viewed', 'pending', 'booked', 'not-fit', 'no-response'],
      default: 'new',
      index: true,
    },
    agentNotes: {
      type: String,
      maxlength: 500,
    },
    outcome: {
      type: String,
      enum: ['pending', 'viewed', 'booked', 'not-fit', 'no-response'],
    },
    outcomeMarkedAt: Date,
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Track agent communication
    lastContactedAt: Date,
    contactMethod: {
      type: String,
      enum: ['whatsapp', 'phone', 'email', 'in-app'],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
agentLeadSchema.index({ agent: 1, createdAt: -1 });
agentLeadSchema.index({ agent: 1, status: 1 });
agentLeadSchema.index({ vacancy: 1 });
agentLeadSchema.index({ student: 1 });
agentLeadSchema.index({ agent: 1, isRead: 1 });

export default mongoose.model('AgentLead', agentLeadSchema);
