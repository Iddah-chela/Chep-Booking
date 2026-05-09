import mongoose from 'mongoose';

const agentLeadSchema = new mongoose.Schema(
  {
    agent: {
      type: String,
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
      type: String,
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
    leadType: {
      type: String,
      enum: ['contact', 'viewing', 'booking'],
      default: 'contact',
      index: true,
    },
    preferredMoveInDate: Date,
    preferredViewingDate: Date,
    preferredRoomType: String,
    roomDetails: {
      buildingId: { type: String },
      row: { type: Number },
      col: { type: Number },
      roomType: { type: String },
    },
    // Provisional hold expires at this time for booking/reserve leads
    provisionalHoldUntil: { type: Date },
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
      type: String,
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
