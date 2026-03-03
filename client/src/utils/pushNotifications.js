import axios from 'axios';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

/**
 * Convert a base64 VAPID key to a Uint8Array for the Push API.
 */
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

/**
 * Check if push notifications are supported in this browser.
 */
export function isPushSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Get current notification permission state.
 * @returns {'granted' | 'denied' | 'default'}
 */
export function getPermissionState() {
    if (!isPushSupported()) return 'denied';
    return Notification.permission;
}

/**
 * Subscribe the user to push notifications.
 * 1. Requests notification permission
 * 2. Subscribes via the service worker's PushManager
 * 3. Sends the subscription to the backend
 * 
 * @param {Function} getToken - function to get auth token
 * @returns {boolean} true if subscribed successfully
 */
export async function subscribeToPush(getToken) {
    console.log('[Push] subscribeToPush() called');

    if (!isPushSupported()) {
        console.warn('[Push] ❌ Push notifications not supported in this browser');
        return false;
    }
    console.log('[Push] ✅ Push is supported');

    try {
        // Request permission
        console.log('[Push] Requesting notification permission...');
        const permission = await Notification.requestPermission();
        console.log('[Push] Permission result:', permission);
        if (permission !== 'granted') {
            console.warn('[Push] ❌ Permission not granted:', permission);
            return false;
        }

        // Get SW registration (with timeout — hangs forever if SW failed to register)
        console.log('[Push] Waiting for service worker...');
        const registration = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Service worker not ready after 10s')), 10000))
        ]);
        console.log('[Push] ✅ Service worker ready:', registration.scope);

        // Check for existing subscription
        let subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            console.log('[Push] Found existing PushManager subscription:', subscription.endpoint.substring(0, 60) + '...');
        } else {
            console.log('[Push] No existing subscription, creating new one...');
            console.log('[Push] VAPID key available?', !!VAPID_PUBLIC_KEY, VAPID_PUBLIC_KEY ? '(length: ' + VAPID_PUBLIC_KEY.length + ')' : '(MISSING!)');
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
            console.log('[Push] ✅ New subscription created:', subscription.endpoint.substring(0, 60) + '...');
        }

        // Send subscription to backend
        console.log('[Push] Getting auth token...');
        const token = await getToken();
        if (!token) {
            console.warn('[Push] ❌ No auth token, cannot save subscription');
            return false;
        }
        console.log('[Push] ✅ Got auth token');

        // Use toJSON() which provides keys in base64url format (required by web-push)
        const subJson = subscription.toJSON();
        console.log('[Push] Sending subscription to backend...');
        console.log('[Push] Subscription keys present:', !!subJson.keys?.p256dh, !!subJson.keys?.auth);

        const { data } = await axios.post('/api/notifications/subscribe', {
            endpoint: subJson.endpoint,
            keys: {
                p256dh: subJson.keys.p256dh,
                auth: subJson.keys.auth
            }
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('[Push] Backend response:', data);

        if (data.success) {
            console.log('[Push] ✅ Subscribed successfully!');
            localStorage.setItem('PataKeja_push_enabled', 'true');
            return true;
        }

        console.warn('[Push] ❌ Backend returned failure:', data.message);
        return false;
    } catch (err) {
        console.error('[Push] ❌ Subscription failed:', err);
        return false;
    }
}

/**
 * Unsubscribe from push notifications.
 * @param {Function} getToken
 */
export async function unsubscribeFromPush(getToken) {
    if (!isPushSupported()) return;

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
            // Notify backend
            const token = await getToken();
            if (token) {
                await axios.post('/api/notifications/unsubscribe', {
                    endpoint: subscription.endpoint
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                }).catch(() => {});
            }

            // Unsubscribe locally
            await subscription.unsubscribe();
        }

        localStorage.removeItem('PataKeja_push_enabled');
        console.log('[Push] Unsubscribed');
    } catch (err) {
        console.error('[Push] Unsubscribe failed:', err.message);
    }
}

/**
 * Silently re-subscribe if user previously opted in (e.g. after page reload).
 * Does not prompt — only re-subscribes if permission is already granted.
 * @param {Function} getToken
 */
export async function resubscribeIfNeeded(getToken) {
    if (!isPushSupported()) return;
    if (Notification.permission !== 'granted') {
        console.log('[Push] resubscribe skipped: permission is', Notification.permission);
        return;
    }
    if (localStorage.getItem('PataKeja_push_enabled') !== 'true') {
        console.log('[Push] resubscribe skipped: not previously enabled');
        return;
    }

    try {
        console.log('[Push] Re-subscribing (page reload)...');
        const registration = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((_, reject) => setTimeout(() => reject(new Error('SW not ready')), 10000))
        ]);
        let subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
        }

        // Re-send to backend in case it was lost
        const token = await getToken();
        if (!token) {
            console.warn('[Push] resubscribe: no auth token');
            return;
        }

        const subJson = subscription.toJSON();
        const { data } = await axios.post('/api/notifications/subscribe', {
            endpoint: subJson.endpoint,
            keys: {
                p256dh: subJson.keys.p256dh,
                auth: subJson.keys.auth
            }
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('[Push] Re-subscribe result:', data?.success ? 'saved' : data?.message);
    } catch (err) {
        console.warn('[Push] resubscribe failed:', err.message);
    }
}
