import mongoose from "mongoose";

const pushSubscriptionSchema = new mongoose.Schema({
    user: {
        type: String,
        ref: "User",
        required: true,
        index: true
    },
    endpoint: {
        type: String,
        required: true
    },
    keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true }
    }
}, { timestamps: true });

// One subscription per endpoint per user
pushSubscriptionSchema.index({ user: 1, endpoint: 1 }, { unique: true });

const PushSubscription = mongoose.model("PushSubscription", pushSubscriptionSchema);
export default PushSubscription;
