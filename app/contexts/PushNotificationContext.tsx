import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import {
  requestNotificationPermissions,
  getExpoPushToken,
  registerTokenWithBackend,
  setupNotificationListeners,
  setBadgeCount,
} from '../utils/notifications';
import { unregisterPushToken } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PushNotificationContextType {
  isRegistered: boolean;
  hasPermission: boolean;
  registerToken: () => Promise<boolean>;
  unregisterToken: () => Promise<void>;
}

const PushNotificationContext = createContext<PushNotificationContextType | undefined>(undefined);

export const usePushNotifications = () => {
  const context = useContext(PushNotificationContext);
  if (!context) {
    // Return a default context to prevent crashes if used outside provider
    console.warn('usePushNotifications must be used within a PushNotificationProvider');
    return {
      isRegistered: false,
      hasPermission: false,
      registerToken: async () => false,
      unregisterToken: async () => {},
    };
  }
  return context;
};

interface PushNotificationProviderProps {
  children: React.ReactNode;
}

export const PushNotificationProvider: React.FC<PushNotificationProviderProps> = ({ children }) => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const listenersCleanupRef = useRef<(() => void) | null>(null);

  // Request permissions on app start (before login)
  useEffect(() => {
    let isMounted = true;

    const requestInitialPermissions = async () => {
      try {
        const permissionGranted = await requestNotificationPermissions();
        if (isMounted) {
          setHasPermission(permissionGranted);
        }
      } catch (error) {
        console.error('Error requesting initial notification permissions:', error);
      }
    };

    // Request permissions immediately on mount
    requestInitialPermissions();

    return () => {
      isMounted = false;
    };
  }, []);

  // Register token when user logs in (check periodically)
  useEffect(() => {
    let isMounted = true;
    let checkInterval: ReturnType<typeof setInterval> | null = null;

    const initializeNotifications = async () => {
      try {
        // Check if user is logged in
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          return; // Don't register if not logged in
        }

        // Check if we already have permission
        if (!hasPermission) {
          // Try requesting again if we don't have permission yet
          const permissionGranted = await requestNotificationPermissions();
          if (isMounted) {
            setHasPermission(permissionGranted);
          }
          if (!permissionGranted) {
            console.warn('Cannot register push token: permissions not granted');
            return;
          }
        }

        // Register token with backend
        const registered = await registerTokenWithBackend();
        if (isMounted) {
          setIsRegistered(registered);
          // Stop checking once registered
          if (registered && checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
          }
        }
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    };

    // Check immediately
    initializeNotifications();

    // Also check periodically (in case user logs in)
    checkInterval = setInterval(() => {
      if (isMounted) {
        initializeNotifications();
      }
    }, 3000); // Check every 3 seconds

    return () => {
      isMounted = false;
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [hasPermission]);

  // Setup notification listeners
  useEffect(() => {
    if (!hasPermission) return;

    const handleNotificationReceived = (notification: Notifications.Notification) => {
      // Handle notification received while app is in foreground
      console.log('Notification received:', notification);
      
      // You can update badge count or show in-app notification here
      // The notification will be shown automatically based on handler config
    };

    const handleNotificationTapped = (response: Notifications.NotificationResponse) => {
      // Handle notification tap - navigate to relevant screen
      const data = response.notification.request.content.data;
      console.log('Notification tapped:', data);

      // Deep linking based on notification type
      if (data?.type) {
        switch (data.type) {
          case 'order_assigned_to_me':
          case 'order_status_updated':
          case 'order_status_pending_to_dc':
          case 'order_status_dc_to_invoice':
          case 'order_status_invoice_to_dispatched':
            if (data.orderId) {
              router.push(`/orders/my-orders`);
            } else {
              router.push('/orders');
            }
            break;
          case 'order_created':
          case 'order_deleted':
          case 'order_reassigned':
            router.push('/orders');
            break;
          case 'product_low_stock':
          case 'product_out_of_stock':
          case 'product_created':
          case 'product_updated':
          case 'product_deleted':
            router.push('/products');
            break;
          case 'staff_created':
          case 'staff_updated':
          case 'staff_deleted':
            router.push('/staff');
            break;
          default:
            // Navigate to dashboard for unknown types
            router.push('/dashboard');
        }
      }
    };

    // Setup listeners
    const cleanup = setupNotificationListeners(
      handleNotificationReceived,
      handleNotificationTapped
    );

    listenersCleanupRef.current = cleanup;

    return () => {
      if (cleanup) cleanup();
    };
  }, [hasPermission]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      // When app comes to foreground, refresh token if needed
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground
        const token = await AsyncStorage.getItem('token');
        if (token && hasPermission) {
          // Refresh token registration
          await registerTokenWithBackend();
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [hasPermission]);

  const registerToken = async (): Promise<boolean> => {
    try {
      const permissionGranted = await requestNotificationPermissions();
      setHasPermission(permissionGranted);

      if (!permissionGranted) {
        return false;
      }

      const registered = await registerTokenWithBackend();
      setIsRegistered(registered);
      return registered;
    } catch (error) {
      console.error('Error registering push token:', error);
      return false;
    }
  };

  const unregisterToken = async (): Promise<void> => {
    try {
      await unregisterPushToken();
      setIsRegistered(false);
    } catch (error) {
      console.error('Error unregistering push token:', error);
    }
  };

  const value: PushNotificationContextType = {
    isRegistered,
    hasPermission,
    registerToken,
    unregisterToken,
  };

  return (
    <PushNotificationContext.Provider value={value}>
      {children}
    </PushNotificationContext.Provider>
  );
};

export default PushNotificationProvider;

