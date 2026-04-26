import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

interface PWAContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  installApp: () => Promise<void>;
  notificationPermission: NotificationPermission;
  isSubscribed: boolean;
  isPushSupported: boolean;
  subscribeToPush: () => Promise<boolean>;
  unsubscribeFromPush: () => Promise<void>;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

// VAPID key for push notifications
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isPushSupported, setIsPushSupported] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      toast.success('DJ Flowerz App installed successfully!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Push notification support check
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsPushSupported(supported);
    
    if (supported) {
      checkSubscription();
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      setIsSubscribed(!!sub);
      setSubscription(sub);
    } catch (e) {
      console.error('Error checking push subscription:', e);
    }
  };

  const installApp = async () => {
    if (!deferredPrompt) {
      toast.error('Installation not available at this moment.');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  const subscribeToPush = async () => {
    try {
      if (!isPushSupported) throw new Error('Push notifications not supported');

      const registration = await navigator.serviceWorker.ready;
      
      // Request permission
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission !== 'granted') throw new Error('Permission denied');

      if (!VAPID_PUBLIC_KEY) {
        console.warn('VAPID_PUBLIC_KEY is missing. Push subscription might fail.');
        // If no VAPID key, we can still show local notifications if permission is granted
        toast.success('Notifications enabled!');
        return true;
      }

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      // Save to backend
      const apiBase = import.meta.env.VITE_STORAGE_WORKER_URL || 'https://api.djflowerz.co.ke';
      await fetch(`${apiBase}/api/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub)
      });

      setSubscription(sub);
      setIsSubscribed(true);
      toast.success('Push notifications enabled!');
      return true;
    } catch (error: any) {
      console.error('Push subscription error:', error);
      toast.error(error.message || 'Failed to enable notifications.');
      return false;
    }
  };

  const unsubscribeFromPush = async () => {
    if (!subscription) return;
    try {
      await subscription.unsubscribe();
      const apiBase = import.meta.env.VITE_STORAGE_WORKER_URL || 'https://api.djflowerz.co.ke';
      await fetch(`${apiBase}/api/push/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });
      setIsSubscribed(false);
      setSubscription(null);
      toast.info('Push notifications disabled.');
    } catch (e) {
      console.error('Unsubscribe error:', e);
    }
  };

  return (
    <PWAContext.Provider
      value={{
        isInstallable,
        isInstalled,
        installApp,
        notificationPermission,
        isSubscribed,
        isPushSupported,
        subscribeToPush,
        unsubscribeFromPush
      }}
    >
      {children}
    </PWAContext.Provider>
  );
};

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (context === undefined) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};

// Utility for key conversion
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
