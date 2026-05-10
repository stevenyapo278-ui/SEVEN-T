import { useState, useEffect } from 'react';
import api from '../services/api';

const VAPID_PUBLIC_KEY = 'BCz37gL7SOa3QpUcYebNAQ3vFV6k6rIGOK_3Lt5HTgK4mbW1i9brXCtZmE4T3I6IQZ15wAMG6EIrtradwfl3k4k';

export const usePushNotifications = () => {
    const [permission, setPermission] = useState(Notification.permission);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [subscription, setSubscription] = useState(null);

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                registration.pushManager.getSubscription().then(sub => {
                    setSubscription(sub);
                    setIsSubscribed(!!sub);
                });
            });
        }
    }, []);

    const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    };

    const subscribe = async () => {
        if (!('serviceWorker' in navigator)) return;

        try {
            const registration = await navigator.serviceWorker.ready;
            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });

            // Register with backend
            await api.post('/notifications/push-token', {
                token: sub,
                platform: 'web'
            });

            setSubscription(sub);
            setIsSubscribed(true);
            setPermission(Notification.permission);
            return true;
        } catch (error) {
            console.error('Push subscription error:', error);
            return false;
        }
    };

    const unsubscribe = async () => {
        if (!subscription) return;

        try {
            await subscription.unsubscribe();
            
            // Remove from backend
            await api.delete('/notifications/push-token', {
                data: { token: subscription }
            });

            setSubscription(null);
            setIsSubscribed(false);
            return true;
        } catch (error) {
            console.error('Push unsubscription error:', error);
            return false;
        }
    };

    return {
        permission,
        isSubscribed,
        subscribe,
        unsubscribe
    };
};
