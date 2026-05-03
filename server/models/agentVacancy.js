import mongoose from 'mongoose';

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
    moveInDate: Date,
    availabilityFrom: {
      type: Date,
    },
    availabilityTo: {
      type: Date,
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
      // Default to 72 hours from now
      default: () => new Date(Date.now() + 72 * 60 * 60 * 1000),
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

// Index for finding active vacancies by expiry
agentVacancySchema.index({ isActive: 1, expiresAt: 1 });

// TTL index to auto-delete expired vacancies (optional, can be handled manually)
agentVacancySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Middleware to set expiresAt if not provided and auto-expire contacted vacancies
agentVacancySchema.pre('save', function (next) {
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
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
