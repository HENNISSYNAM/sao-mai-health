import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// VAPID public key - must match the one in edge function
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  subscription: PushSubscription | null;
  permission: NotificationPermission | 'default';
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    subscription: null,
    permission: 'default',
  });
  const [isLoading, setIsLoading] = useState(false);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = 'serviceWorker' in navigator && 
                          'PushManager' in window && 
                          'Notification' in window;
      
      let permission: NotificationPermission = 'default';
      if ('Notification' in window) {
        permission = Notification.permission;
      }

      setState(prev => ({ ...prev, isSupported, permission }));

      // Check existing subscription
      if (isSupported && permission === 'granted') {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            setState(prev => ({ 
              ...prev, 
              isSubscribed: true, 
              subscription 
            }));
          }
        } catch (error) {
          console.error('Error checking subscription:', error);
        }
      }
    };

    checkSupport();
  }, []);

  // Register service worker
  const registerServiceWorker = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service workers not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('Service Worker registered:', registration.scope);
      
      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      toast.error('Trình duyệt không hỗ trợ thông báo');
      return false;
    }

    if (Notification.permission === 'granted') {
      setState(prev => ({ ...prev, permission: 'granted' }));
      return true;
    }

    if (Notification.permission === 'denied') {
      toast.error('Thông báo đã bị chặn. Vui lòng bật trong cài đặt trình duyệt.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    }
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async (subscriberId?: string): Promise<PushSubscription | null> => {
    setIsLoading(true);
    
    try {
      // First request permission
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        setIsLoading(false);
        return null;
      }

      // Register service worker
      const registration = await registerServiceWorker();
      if (!registration) {
        toast.error('Không thể đăng ký Service Worker');
        setIsLoading(false);
        return null;
      }

      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Create new subscription
        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey.buffer as ArrayBuffer
        });
        console.log('Push subscription created:', subscription);
      }

      // Save subscription to database if subscriberId provided
      if (subscriberId && subscription) {
        const subscriptionJson = subscription.toJSON();
        const { error } = await supabase
          .from('stroke_alert_subscribers')
          .update({ 
            push_subscription: JSON.parse(JSON.stringify(subscriptionJson)),
            notification_enabled: true 
          })
          .eq('id', subscriberId);

        if (error) {
          console.error('Error saving subscription:', error);
          toast.error('Không thể lưu đăng ký thông báo');
        } else {
          toast.success('Đã bật thông báo đẩy!');
        }
      }

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        subscription
      }));

      setIsLoading(false);
      return subscription;

    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Không thể đăng ký thông báo đẩy');
      setIsLoading(false);
      return null;
    }
  }, [requestPermission, registerServiceWorker]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (subscriberId?: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      if (state.subscription) {
        await state.subscription.unsubscribe();
      }

      // Update database if subscriberId provided
      if (subscriberId) {
        await supabase
          .from('stroke_alert_subscribers')
          .update({ 
            push_subscription: null,
            notification_enabled: false 
          })
          .eq('id', subscriberId);
      }

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        subscription: null
      }));

      toast.info('Đã tắt thông báo đẩy');
      setIsLoading(false);
      return true;

    } catch (error) {
      console.error('Unsubscribe error:', error);
      setIsLoading(false);
      return false;
    }
  }, [state.subscription]);

  // Send test notification
  const sendTestNotification = useCallback(async () => {
    if (!state.isSubscribed || !state.subscription) {
      toast.error('Chưa đăng ký thông báo');
      return;
    }

    // Send local notification for testing
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🏥 Test thông báo', {
        body: 'Hệ thống cảnh báo đột quỵ đang hoạt động!',
        icon: '/favicon.ico',
        tag: 'test-notification',
        requireInteraction: false
      });
      toast.success('Đã gửi thông báo test!');
    }
  }, [state.isSubscribed, state.subscription]);

  return {
    ...state,
    isLoading,
    subscribe,
    unsubscribe,
    requestPermission,
    registerServiceWorker,
    sendTestNotification
  };
}
