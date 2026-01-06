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
    console.log('=== Requesting Notification Permissions ===');
    
    // Check if device is physical (not simulator)
    if (!Device.isDevice) {
      console.warn('Push notifications are not supported on simulators/emulators');
      return false;
    }

    console.log('Device is physical, proceeding with permission request...');

    // Check current permission status
    const { status: existingStatus, canAskAgain } = await Notifications.getPermissionsAsync();
    console.log('Current permission status:', existingStatus);
    console.log('Can ask again:', canAskAgain);
    
    let finalStatus = existingStatus;

    // Request permission if not already granted
    if (existingStatus !== 'granted') {
      console.log('Permission not granted, requesting...');
      try {
        const { status, canAskAgain: newCanAskAgain } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: false,
          },
        });
        finalStatus = status;
        console.log('Permission request result:', status);
        console.log('Can ask again after request:', newCanAskAgain);
        
        if (status === 'denied' && !newCanAskAgain) {
          console.error('Permission permanently denied. User must enable in settings.');
        }
      } catch (requestError: any) {
        console.error('Error during permission request:', requestError);
        console.error('Error details:', {
          message: requestError?.message,
          code: requestError?.code,
        });
        return false;
      }
    } else {
      console.log('Permission already granted');
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permissions not granted. Final status:', finalStatus);
      return false;
    }

    console.log('Permission granted! Configuring notification channel...');

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
        console.log('Android notification channel configured');
      } catch (channelError) {
        console.error('Error configuring notification channel:', channelError);
        // Don't fail if channel setup fails, continue anyway
      }
    }

    console.log('=== Permission Request Complete: SUCCESS ===');
    return true;
  } catch (error: any) {
    console.error('=== Permission Request Complete: FAILED ===');
    console.error('Error requesting notification permissions:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
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

    console.log('Getting Expo push token with projectId:', projectId);
    
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });

    console.log('Expo push token obtained:', tokenData.data?.substring(0, 50) + '...');
    return tokenData.data;
  } catch (error: any) {
    console.error('Error getting Expo push token:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
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

    console.log('Registering push token with backend...');
    console.log('Token format:', token.startsWith('ExponentPushToken[') ? 'ExponentPushToken' : 
                token.startsWith('ExpoPushToken[') ? 'ExpoPushToken' : 'Unknown');
    
    await registerPushToken(token);
    console.log('Push token registered successfully with backend');
    return true;
  } catch (error: any) {
    console.error('Error registering push token with backend:', error);
    console.error('Error details:', {
      message: error?.message,
      response: error?.response?.data,
      status: error?.response?.status,
    });
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

