import webPush from "web-push";
import PushSubscription from "../models/pushSubscription.js";

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webPush.setVapidDetails(
        `mailto:${process.env.EMAIL_USER || 'PataKeja@gmail.com'}`,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

/**
 * Send a push notification to a specific user.
 * Handles multiple subscriptions (e.g. multiple devices/browsers).
 * Silently removes expired/invalid subscriptions.
 * 
 * @param {string} userId - The user ID to send the notification to
 * @param {object} payload - { title, body, url, icon, tag }
 *   - title: notification title
 *   - body: notification body text
 *   - url: URL to open when notification is clicked
 *   - icon: optional icon URL
 *   - tag: optional tag for notification grouping / replacement
 */
export const sendPushNotification = async (userId, payload) => {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
        return; // Push not configured
    }

    try {
        const subscriptions = await PushSubscription.find({ user: userId });
        if (!subscriptions.length) {
            console.log(`[Push] No subscriptions found for user ${userId}`);
            return;
        }

        const data = JSON.stringify({
            title: payload.title || 'PataKeja',
            body: payload.body || '',
            url: payload.url || '/',
            icon: payload.icon || '/icons/icon-192.png',
            tag: payload.tag || undefined,
            ...(payload.actions   ? { actions: payload.actions }     : {}),
            ...(payload.actionUrls ? { actionUrls: payload.actionUrls } : {})
        });

        const results = await Promise.allSettled(
            subscriptions.map(sub =>
                webPush.sendNotification(
                    { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
                    data
                ).catch(async (err) => {
                    // 410 Gone or 404 Not Found = subscription expired, remove it
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        await PushSubscription.deleteOne({ _id: sub._id });
                        console.log(`[Push] Removed expired subscription for user ${userId}`);
                    } else {
                        console.warn(`[Push] Failed to send to user ${userId}:`, err.statusCode || err.message);
                    }
                })
            )
        );

        const sent = results.filter(r => r.status === 'fulfilled').length;
        if (sent > 0) {
            console.log(`[Push] Sent notification to user ${userId} (${sent}/${subscriptions.length} devices)`);
        }
    } catch (err) {
        console.warn('[Push] Error sending notification:', err.message);
    }
};

/**
 * Send push notification to multiple users at once.
 * @param {string[]} userIds
 * @param {object} payload - same as sendPushNotification
 */
export const sendPushToMany = async (userIds, payload) => {
    await Promise.allSettled(
        userIds.map(id => sendPushNotification(id, payload))
    );
};
