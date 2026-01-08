import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { registerPushToken } from './api';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions
 * Returns true if permissions granted, false otherwise
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    // Check if device is physical (not simulator)
    if (!Device.isDevice) {
      console.warn('Push notifications are not supported on simulators/emulators');
      return false;
    }

    // Check current permission status
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not already granted
    if (existingStatus !== 'granted') {
      try {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: false,
          },
        });
        finalStatus = status;
        
        if (status === 'denied') {
          console.warn('Notification permission denied');
        }
      } catch (requestError: any) {
        console.error('Error requesting notification permissions:', requestError?.message || requestError);
        return false;
      }
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });
      } catch (channelError) {
        console.error('Error configuring notification channel:', channelError);
        // Don't fail if channel setup fails, continue anyway
      }
    }

    return true;
  } catch (error: any) {
    console.error('Error requesting notification permissions:', error?.message || error);
    return false;
  }
}

/**
 * Get Expo push notification token
 * Returns token string or null if unavailable
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.warn('Push notification permission not granted');
      return null;
    }

    // Get project ID from app config (works in both dev and production)
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                     Constants.easConfig?.projectId ||
                     'f2703715-5ab9-4ca7-9c47-8c70ea3fa9a1'; // Fallback
    
    if (!projectId || projectId === 'f2703715-5ab9-4ca7-9c47-8c70ea3fa9a1') {
      console.warn('Using fallback project ID. This may cause issues in production!');
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });

    if (!tokenData || !tokenData.data) {
      console.error('Failed to get push token: token data is null');
      return null;
    }
    
    return tokenData.data;
  } catch (error: any) {
    console.error('Error getting Expo push token:', error?.message || error);
    return null;
  }
}

/**
 * Register push token with backend
 * This should be called after successful login
 */
export async function registerTokenWithBackend(): Promise<boolean> {
  try {
    const token = await getExpoPushToken();
    
    if (!token) {
      console.warn('No push token available to register');
      return false;
    }
    
    const response = await registerPushToken(token);
    
    if (response?.success) {
      return true;
    } else {
      console.error('Failed to register push token: backend returned success: false');
      return false;
    }
  } catch (error: any) {
    console.error('Error registering push token:', error?.response?.data?.message || error?.message || error);
    return false;
  }
}

/**
 * Setup notification listeners
 * Returns cleanup function
 */
export function setupNotificationListeners(
  onNotificationReceived: (notification: Notifications.Notification) => void,
  onNotificationTapped: (notification: Notifications.NotificationResponse) => void
): () => void {
  // Listener for notifications received while app is in foreground
  const receivedListener = Notifications.addNotificationReceivedListener(
    onNotificationReceived
  );

  // Listener for when user taps on a notification
  const responseListener = Notifications.addNotificationResponseReceivedListener(
    onNotificationTapped
  );

  // Return cleanup function
  return () => {
    Notifications.removeNotificationSubscription(receivedListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}

/**
 * Get notification badge count
 */
export async function getBadgeCount(): Promise<number> {
  try {
    return await Notifications.getBadgeCountAsync();
  } catch (error) {
    console.error('Error getting badge count:', error);
    return 0;
  }
}

/**
 * Set notification badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error('Error setting badge count:', error);
  }
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync();
    await setBadgeCount(0);
  } catch (error) {
    console.error('Error clearing notifications:', error);
  }
}

