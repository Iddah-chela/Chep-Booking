import PushSubscription from "../models/pushSubscription.js";

// Subscribe — save push subscription for the authenticated user
export const subscribePush = async (req, res) => {
    try {
        const userId = req.user._id;
        const { endpoint, keys } = req.body;

        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return res.json({ success: false, message: "Invalid subscription data" });
        }

        // Upsert: update if same endpoint exists, otherwise create
        await PushSubscription.findOneAndUpdate(
            { user: userId, endpoint },
            { user: userId, endpoint, keys },
            { upsert: true, new: true }
        );

        console.log(`[Push] Subscription saved for user ${userId}`);
        res.json({ success: true, message: "Push subscription saved" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Unsubscribe — remove push subscription
export const unsubscribePush = async (req, res) => {
    try {
        const userId = req.user._id;
        const { endpoint } = req.body;

        if (!endpoint) {
            return res.json({ success: false, message: "Endpoint required" });
        }

        await PushSubscription.deleteOne({ user: userId, endpoint });
        res.json({ success: true, message: "Push subscription removed" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Get VAPID public key (no auth required)
export const getVapidPublicKey = async (req, res) => {
    res.json({
        success: true,
        publicKey: process.env.VAPID_PUBLIC_KEY || null
    });
};
