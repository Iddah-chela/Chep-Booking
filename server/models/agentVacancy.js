import mongoose from 'mongoose';

const cellSchema = new mongoose.Schema({
  type: { type: String, enum: ['empty', 'room', 'common'], default: 'empty' },
  roomType: String,
  pricePerMonth: Number,
  amenities: [String],
  isVacant: Boolean,
  isBooked: { type: Boolean, default: false },
  isMoveOutSoon: { type: Boolean, default: false },
  availableFrom: { type: Date, default: null }
}, { _id: false });

const buildingSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  rows: { type: Number, required: true },
  cols: { type: Number, required: true },
  grid: [[cellSchema]],
  gatePosition: {
    row: Number,
    col: Number,
    side: { type: String, enum: ['top', 'bottom', 'left', 'right'], default: 'bottom' }
  }
}, { _id: false });

const agentVacancySchema = new mongoose.Schema(
  {
    agent: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      maxlength: 120,
      default: '',
    },
    location: {
      area: { type: String, required: true },
      city: { type: String, required: true },
      coordinates: {
        latitude: { type: Number },
        longitude: { type: Number },
      },
    },
    googleMapsUrl: {
      type: String,
      default: '',
    },
    rent: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
    },
    roomType: {
      type: String,
      enum: ['single', 'double', 'shared', 'studio', 'bedsitter', 'apartment'],
      required: true,
    },
    availableRooms: {
      type: Number,
      required: true,
      min: 1,
    },
    description: {
      type: String,
      maxlength: 1000,
    },
    amenities: [String],
    photos: [
      {
        url: String,
        publicId: String, // Cloudinary ID for deletion
      },
    ],
    videos: [
      {
        url: String,
        publicId: String, // Cloudinary ID for deletion
        thumbnail: String, // Thumbnail image URL
        duration: Number, // Duration in seconds
      },
    ],
    buildings: {
      type: [buildingSchema],
      default: []
    },
    moveInDate: Date,
    availabilityFrom: {
      type: Date,
    },
    availabilityTo: {
      type: Date,
    },
    // Optional contact fields supplied by the posting agent
    contactPhone: {
      type: String,
      default: ''
    },
    whatsappNumber: {
      type: String,
      default: ''
    },
    minBookingLeadDays: {
      type: Number,
      default: 2,
      min: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
      // Keep agent listings long-lived by default; use refresh/reopen to extend further.
      default: () => new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000),
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'contacted', 'booked', 'expired'],
      default: 'open',
      index: true,
    },
    contactedAt: {
      type: Date,
      default: null,
    },
    stats: {
      viewCount: { type: Number, default: 0 },
      leadCount: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// Index for finding active vacancies quickly
agentVacancySchema.index({ isActive: 1, expiresAt: 1 });

// TTL index intentionally not used for agent listings so they behave like landlord posts.
// Older deployments may still have the index in MongoDB and may need a one-time drop.

// Middleware to set expiresAt if not provided and auto-expire contacted vacancies
agentVacancySchema.pre('save', function (next) {
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000);
  }

  // Auto-expire "contacted" status after 7 days
  if (this.status === 'contacted' && this.contactedAt) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (this.contactedAt < sevenDaysAgo) {
      this.status = 'open';
      this.contactedAt = null;
    }
  }

  next();
});

export default mongoose.model('AgentVacancy', agentVacancySchema);
