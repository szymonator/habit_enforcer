import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Alert } from 'react-native';
import { homeStyles } from '../styles/homeStyles';
import { permissionsStyles as styles } from '../styles/permissionsStyles';

/**
 * Collapsible card showing the status of all required native permissions.
 * Auto-expands when any permission is missing.
 */
export default function PermissionsCard({
  hasOverlayPermission,
  hasUsagePermission,
  hasAlarmPermission,
  hasNotificationPermission,
  allGranted,
  requestOverlay,
  requestUsage,
  requestAlarm,
  requestNotification,
}) {
  const [expanded, setExpanded] = useState(!allGranted);

  // Sync collapse state when all permissions are granted/revoked
  React.useEffect(() => {
    setExpanded(!allGranted);
  }, [allGranted]);

  const handleRequest = (requestFn, errorMessage) => {
    try {
      requestFn();
    } catch (e) {
      Alert.alert('Error', errorMessage);
    }
  };

  const handleRequestNotification = async () => {
    try {
      await requestNotification();
    } catch (e) {
      Alert.alert('Error', 'Failed to request notification permission');
    }
  };

  return (
    <View style={homeStyles.card}>
      <TouchableOpacity
        style={styles.dropdownHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.dropdownHeaderTitleRow}>
          <Text style={homeStyles.cardTitle}>Native Permissions</Text>
          <View
            style={[
              styles.statusBadge,
              allGranted ? styles.badgeSuccess : styles.badgeDanger,
              { marginLeft: 8 },
            ]}
          >
            <Text style={styles.badgeText}>
              {allGranted ? 'All Active' : 'Requires Attention'}
            </Text>
          </View>
        </View>
        <Text style={styles.dropdownToggleText}>
          {expanded ? 'Hide ▲' : 'Show ▼'}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.dropdownContent}>
          <PermissionRow
            label="Draw Over Other Apps"
            description="Allows the overlay to cover the screen and enforce your habit."
            granted={hasOverlayPermission}
            buttonLabel="Grant Overlay Access"
            onRequest={() => handleRequest(requestOverlay, 'Failed to request overlay permission')}
          />

          <View style={homeStyles.divider} />

          <PermissionRow
            label="Usage Statistics Access"
            description="Allows tracking usage of the target app to know when you finish the habit."
            granted={hasUsagePermission}
            buttonLabel="Grant Usage Access"
            onRequest={() => handleRequest(requestUsage, 'Failed to request usage access permission')}
          />

          <View style={homeStyles.divider} />

          <PermissionRow
            label="Alarms & Reminders"
            description="Allows launching the blocker precisely at your scheduled time."
            granted={hasAlarmPermission}
            buttonLabel="Grant Alarm Access"
            onRequest={() => handleRequest(requestAlarm, 'Failed to request alarm permission')}
          />

          {Platform.OS === 'android' && Platform.Version >= 33 && (
            <>
              <View style={homeStyles.divider} />
              <PermissionRow
                label="System Notifications"
                description="Allows displaying the real-time remaining time in a silent status bar notification."
                granted={hasNotificationPermission}
                buttonLabel="Grant Notification Access"
                onRequest={handleRequestNotification}
              />
            </>
          )}
        </View>
      )}
    </View>
  );
}

/**
 * Single permission row with status badge and grant button.
 */
function PermissionRow({ label, description, granted, buttonLabel, onRequest }) {
  return (
    <View style={styles.permissionItem}>
      <View style={styles.permissionHeader}>
        <Text style={styles.permissionLabel}>{label}</Text>
        <View style={[styles.statusBadge, granted ? styles.badgeSuccess : styles.badgeDanger]}>
          <Text style={styles.badgeText}>{granted ? 'Granted' : 'Missing'}</Text>
        </View>
      </View>
      <Text style={styles.permissionDescription}>{description}</Text>
      {!granted && (
        <TouchableOpacity style={homeStyles.buttonSecondary} onPress={onRequest}>
          <Text style={homeStyles.buttonSecondaryText}>{buttonLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
