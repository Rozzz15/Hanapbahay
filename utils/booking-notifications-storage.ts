import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Web-compatible storage functions
const getStorage = () => {
  if (Platform.OS === 'web') {
    return {
      getItem: (key: string) => {
        if (typeof window !== 'undefined') {
          return Promise.resolve(window.localStorage.getItem(key));
        }
        return Promise.resolve(null);
      },
      setItem: (key: string, value: string) => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, value);
        }
        return Promise.resolve();
      },
      removeItem: (key: string) => {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(key);
        }
        return Promise.resolve();
      },
    };
  }
  return AsyncStorage;
};

const STORAGE_KEY_PREFIX = 'booking_notifications_shown_';

/**
 * Get the storage key for a specific user's shown notifications
 */
const getStorageKey = (userId: string): string => {
  return `${STORAGE_KEY_PREFIX}${userId}`;
};

/**
 * Load shown booking notifications for a user from persistent storage
 */
export async function loadShownBookingNotifications(userId: string): Promise<Set<string>> {
  try {
    const storage = getStorage();
    const key = getStorageKey(userId);
    const data = await storage.getItem(key);
    
    if (data) {
      const notifications = JSON.parse(data) as string[];
      console.log(`📥 Loaded ${notifications.length} shown booking notifications for user ${userId}`);
      return new Set(notifications);
    }
    
    console.log(`📥 No shown booking notifications found for user ${userId}`);
    return new Set();
  } catch (error) {
    console.error('❌ Error loading shown booking notifications:', error);
    return new Set();
  }
}

/**
 * Save shown booking notifications for a user to persistent storage
 */
export async function saveShownBookingNotifications(
  userId: string,
  notifications: Set<string>
): Promise<void> {
  try {
    const storage = getStorage();
    const key = getStorageKey(userId);
    const notificationsArray = Array.from(notifications);
    await storage.setItem(key, JSON.stringify(notificationsArray));
    console.log(`💾 Saved ${notificationsArray.length} shown booking notifications for user ${userId}`);
  } catch (error) {
    console.error('❌ Error saving shown booking notifications:', error);
  }
}

/**
 * Mark a booking notification as shown and save to persistent storage
 */
export async function markBookingNotificationAsShown(
  userId: string,
  bookingId: string,
  status: 'approved' | 'rejected',
  currentNotifications: Set<string>
): Promise<Set<string>> {
  const notificationKey = `${bookingId}-${status}`;
  const updatedNotifications = new Set(currentNotifications);
  updatedNotifications.add(notificationKey);
  
  // Save to persistent storage
  await saveShownBookingNotifications(userId, updatedNotifications);
  
  return updatedNotifications;
}

/**
 * Check if a booking notification has been shown before
 */
export function hasBookingNotificationBeenShown(
  bookingId: string,
  status: 'approved' | 'rejected',
  shownNotifications: Set<string>
): boolean {
  const notificationKey = `${bookingId}-${status}`;
  return shownNotifications.has(notificationKey);
}

