import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    user: {
        type: String, // Clerk user ID
        required: true,
        index: true,
    },
    title: {
        type: String,
        required: true,
    },
    body: {
        type: String,
        default: '',
    },
    url: {
        type: String,
        default: '/',
    },
    type: {
        type: String,
        enum: ['message', 'viewing', 'booking', 'system', 'payment'],
        default: 'system',
    },
    read: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

// Auto-delete notifications older than 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
