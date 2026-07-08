import { useState, useEffect, useRef } from 'react';
import { AppState, Platform, PermissionsAndroid } from 'react-native';
import HabitBlockerModule from '../../modules/expo-habit-blocker/src/HabitBlockerModule';

/**
 * Manages all native permission state: overlay, usage stats, alarms, notifications.
 * Automatically re-checks permissions when the app returns to foreground.
 */
export function usePermissions() {
  const appStateRef = useRef(AppState.currentState);
  const [hasOverlayPermission, setHasOverlayPermission] = useState(false);
  const [hasUsagePermission, setHasUsagePermission] = useState(false);
  const [hasAlarmPermission, setHasAlarmPermission] = useState(false);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);

  const allGranted =
    hasOverlayPermission && hasUsagePermission && hasAlarmPermission && hasNotificationPermission;

  const checkPermissions = async () => {
    try {
      const overlay = HabitBlockerModule.isOverlayPermissionGranted();
      const usage = HabitBlockerModule.isUsageStatsPermissionGranted();
      const alarm = HabitBlockerModule.isAlarmPermissionGranted();

      let notifications = true;
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        notifications = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
      }

      setHasOverlayPermission(overlay);
      setHasUsagePermission(usage);
      setHasAlarmPermission(alarm);
      setHasNotificationPermission(notifications);
    } catch (e) {
      console.error('Failed to check permissions:', e);
    }
  };

  useEffect(() => {
    checkPermissions();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        checkPermissions();
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);

  const requestOverlay = () => {
    try {
      HabitBlockerModule.requestOverlayPermission();
    } catch (e) {
      throw new Error('Failed to request overlay permission');
    }
  };

  const requestUsage = () => {
    try {
      HabitBlockerModule.requestUsageStatsPermission();
    } catch (e) {
      throw new Error('Failed to request usage access permission');
    }
  };

  const requestAlarm = () => {
    try {
      HabitBlockerModule.requestAlarmPermission();
    } catch (e) {
      throw new Error('Failed to request alarm permission');
    }
  };

  const requestNotification = async () => {
    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        setHasNotificationPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        setHasNotificationPermission(true);
      }
    } catch (e) {
      throw new Error('Failed to request notification permission');
    }
  };

  return {
    hasOverlayPermission,
    hasUsagePermission,
    hasAlarmPermission,
    hasNotificationPermission,
    allGranted,
    requestOverlay,
    requestUsage,
    requestAlarm,
    requestNotification,
  };
}
