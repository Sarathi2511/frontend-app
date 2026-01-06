import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
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
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permissions not granted');
      return false;
    }

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
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
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'f2703715-5ab9-4ca7-9c47-8c70ea3fa9a1', // From app.json
    });

    return tokenData.data;
  } catch (error) {
    console.error('Error getting Expo push token:', error);
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

    await registerPushToken(token);
    console.log('Push token registered successfully');
    return true;
  } catch (error) {
    console.error('Error registering push token with backend:', error);
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

