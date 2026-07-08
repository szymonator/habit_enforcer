import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  AppState,
  ActivityIndicator,
  FlatList,
  Alert,
  StatusBar,
  Platform,
  PermissionsAndroid
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import HabitBlockerModule from './modules/expo-habit-blocker/src/HabitBlockerModule';
import Slider from '@react-native-community/slider';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function App() {
  const [appState, setAppState] = useState(AppState.currentState);
  const [hasOverlayPermission, setHasOverlayPermission] = useState(false);
  const [hasUsagePermission, setHasUsagePermission] = useState(false);
  const [hasAlarmPermission, setHasAlarmPermission] = useState(false);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);
  const [isScrollEnabled, setIsScrollEnabled] = useState(true);
  const [showPermissionsDropdown, setShowPermissionsDropdown] = useState(false);

  // Automatically toggle dropdown open when permissions check finishes and some are missing
  useEffect(() => {
    const allGranted = hasOverlayPermission && hasUsagePermission && hasAlarmPermission && hasNotificationPermission;
    setShowPermissionsDropdown(!allGranted);
  }, [hasOverlayPermission, hasUsagePermission, hasAlarmPermission, hasNotificationPermission]);
  
  const [apps, setApps] = useState([]);
  const [filteredApps, setFilteredApps] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [showAppPicker, setShowAppPicker] = useState(false);

  const [durationMinutes, setDurationMinutes] = useState('15');
  const [triggerHour, setTriggerHour] = useState('20');
  const [triggerMinute, setTriggerMinute] = useState('00');
  const [showTimePicker, setShowTimePicker] = useState(false);

  const getTimeObject = () => {
    const d = new Date();
    d.setHours(parseInt(triggerHour, 10) || 0);
    d.setMinutes(parseInt(triggerMinute, 10) || 0);
    d.setSeconds(0);
    return d;
  };

  const onTimeChange = (event, selectedDate) => {
    setShowTimePicker(false);
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      setTriggerHour(hours);
      setTriggerMinute(minutes);
    }
  };

  const [schedules, setSchedules] = useState([]);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [viewMode, setViewMode] = useState('home'); // 'home' or 'edit'

  const SCHEDULES_FILE = FileSystem.documentDirectory + 'schedules.json';

  const loadSchedules = async () => {
    try {
      const info = await FileSystem.getInfoAsync(SCHEDULES_FILE);
      if (info.exists) {
        const content = await FileSystem.readAsStringAsync(SCHEDULES_FILE);
        const parsed = JSON.parse(content);
        setSchedules(parsed || []);
      } else {
        setSchedules([]);
      }
    } catch (e) {
      console.error('Failed to load schedules:', e);
      setSchedules([]);
    }
  };

  const saveSchedules = async (newSchedules) => {
    try {
      await FileSystem.writeAsStringAsync(SCHEDULES_FILE, JSON.stringify(newSchedules));
      setSchedules(newSchedules);
    } catch (e) {
      console.error('Failed to save schedules:', e);
    }
  };

  const handleDeleteSchedule = async (id) => {
    Alert.alert(
      'Delete Schedule',
      'Are you sure you want to delete this scheduled block?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              HabitBlockerModule.cancelDailyBlock(id);
              const filtered = schedules.filter(s => s.id !== id);
              await saveSchedules(filtered);
              Alert.alert('Deleted', 'Scheduled block removed successfully.');
            } catch (e) {
              Alert.alert('Error', 'Failed to cancel native alarm.');
            }
          }
        }
      ]
    );
  };

  const handleEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
    setTriggerHour(schedule.hour);
    setTriggerMinute(schedule.minute);
    setSelectedApp(schedule.targetApp);
    setDurationMinutes(schedule.durationMinutes);
    setViewMode('edit');
  };

  const handleAddNewSchedule = () => {
    setEditingSchedule(null);
    setTriggerHour('20');
    setTriggerMinute('00');
    setSelectedApp(null);
    setDurationMinutes('15');
    setViewMode('edit');
  };

  const [trackWidth, setTrackWidth] = useState(300);
  const allowedValues = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

  const getPercentage = () => {
    const mins = parseInt(durationMinutes, 10) || 0;
    const index = allowedValues.indexOf(mins);
    if (index === -1) {
      let closestIdx = 15;
      let minDiff = 9999;
      allowedValues.forEach((val, idx) => {
        const diff = Math.abs(val - mins);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });
      return (closestIdx / (allowedValues.length - 1)) * 100;
    }
    return (index / (allowedValues.length - 1)) * 100;
  };

  const handleSliderTouch = (event) => {
    const { locationX } = event.nativeEvent;
    const pct = Math.max(0, Math.min(1, locationX / trackWidth));
    const index = Math.round(pct * (allowedValues.length - 1));
    setDurationMinutes(allowedValues[index].toString());
  };

  useEffect(() => {
    // Initial permission check & schedules load
    checkPermissions();
    loadSchedules();

    // Re-check permissions when app comes back to foreground
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        checkPermissions();
      }
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, [appState]);

  const checkPermissions = async () => {
    try {
      const overlay = HabitBlockerModule.isOverlayPermissionGranted();
      const usage = HabitBlockerModule.isUsageStatsPermissionGranted();
      const alarm = HabitBlockerModule.isAlarmPermissionGranted();
      
      let notifications = true;
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        notifications = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      }

      setHasOverlayPermission(overlay);
      setHasUsagePermission(usage);
      setHasAlarmPermission(alarm);
      setHasNotificationPermission(notifications);
    } catch (e) {
      console.error('Failed to check permissions:', e);
    }
  };

  const requestOverlay = () => {
    try {
      HabitBlockerModule.requestOverlayPermission();
    } catch (e) {
      Alert.alert('Error', 'Failed to request overlay permission');
    }
  };

  const requestUsage = () => {
    try {
      HabitBlockerModule.requestUsageStatsPermission();
    } catch (e) {
      Alert.alert('Error', 'Failed to request usage access permission');
    }
  };

  const requestAlarm = () => {
    try {
      HabitBlockerModule.requestAlarmPermission();
    } catch (e) {
      Alert.alert('Error', 'Failed to request alarm permission');
    }
  };

  const requestNotification = async () => {
    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        setHasNotificationPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        setHasNotificationPermission(true);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to request notification permission');
    }
  };

  const loadApps = () => {
    setIsLoadingApps(true);
    setShowAppPicker(true);
    // Use setTimeout to allow UI to render spinner before heavy pm query
    setTimeout(() => {
      try {
        const appList = HabitBlockerModule.getInstalledApps();
        setApps(appList);
        setFilteredApps(appList);
      } catch (e) {
        Alert.alert('Error', 'Failed to get installed apps');
      } finally {
        setIsLoadingApps(false);
      }
    }, 100);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (!text) {
      setFilteredApps(apps);
      return;
    }
    const filtered = apps.filter((app) =>
      app.label.toLowerCase().includes(text.toLowerCase()) ||
      app.packageName.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredApps(filtered);
  };

  const handleSelectApp = (app) => {
    setSelectedApp(app);
    setShowAppPicker(false);
    setSearchQuery('');
  };

  const handleStartTest = () => {
    if (!selectedApp) {
      Alert.alert('Target App Required', 'Please select a target app first.');
      return;
    }
    if (!hasOverlayPermission || !hasUsagePermission) {
      Alert.alert('Permissions Required', 'Both permissions must be granted to run the blocker.');
      return;
    }

    try {
      // Start testing immediately with a 1-minute (60 seconds) goal duration
      HabitBlockerModule.startBlockService(selectedApp.packageName, 60, true);
      Alert.alert(
        'Test Block Started',
        `A 1-minute test block is active. Open ${selectedApp.label} to run down the timer. Exiting the app will block the screen.`,
        [{ text: 'OK' }]
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to start test block service');
    }
  };

  const handleStopService = () => {
    try {
      HabitBlockerModule.stopBlockService();
      Alert.alert('Success', 'Blocker service stopped successfully.');
    } catch (e) {
      Alert.alert('Error', 'Failed to stop service');
    }
  };

  const handleScheduleBlock = async () => {
    if (!selectedApp) {
      Alert.alert('Target App Required', 'Please select a target app first.');
      return;
    }
    if (!hasOverlayPermission || !hasUsagePermission || !hasAlarmPermission) {
      Alert.alert('Permissions Required', 'All native permissions must be granted to schedule the blocker.');
      return;
    }

    const mins = parseInt(durationMinutes, 10);
    const hour = parseInt(triggerHour, 10);
    const minute = parseInt(triggerMinute, 10);

    if (isNaN(mins) || mins <= 0) {
      Alert.alert('Invalid Duration', 'Please enter a valid habit goal duration.');
      return;
    }
    if (isNaN(hour) || hour < 0 || hour > 23 || isNaN(minute) || minute < 0 || minute > 59) {
      Alert.alert('Invalid Time', 'Please enter a valid trigger time (0-23 hours, 0-59 minutes).');
      return;
    }

    let targetId = Date.now();
    let updatedSchedules = [...schedules];

    if (editingSchedule) {
      targetId = editingSchedule.id;
      const index = updatedSchedules.findIndex(s => s.id === targetId);
      if (index > -1) {
        updatedSchedules[index] = {
          ...updatedSchedules[index],
          hour: triggerHour,
          minute: triggerMinute,
          targetApp: selectedApp,
          durationMinutes: durationMinutes
        };
      }
    } else {
      updatedSchedules.push({
        id: targetId,
        hour: triggerHour,
        minute: triggerMinute,
        targetApp: selectedApp,
        durationMinutes: durationMinutes
      });
    }

    try {
      const durationSeconds = mins * 60;
      HabitBlockerModule.scheduleDailyBlock(targetId, hour, minute, selectedApp.packageName, durationSeconds);
      
      await saveSchedules(updatedSchedules);
      
      Alert.alert(
        'Schedule Saved',
        `Daily habit blocker scheduled for ${triggerHour}:${triggerMinute} daily.\nTarget app: ${selectedApp.label}\nGoal: ${mins} minutes.`,
        [{ text: 'Great' }]
      );
      
      setViewMode('home');
      setEditingSchedule(null);
    } catch (e) {
      Alert.alert('Error', 'Failed to schedule daily block');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Habit Enforcer</Text>
          <Text style={styles.subtitle}>Block distractions, build daily routines</Text>
        </View>

        {!showAppPicker ? (
          viewMode === 'home' ? (
            <View style={{ flex: 1 }}>
              <ScrollView 
                contentContainerStyle={styles.scrollContainer}
                scrollEnabled={isScrollEnabled}
              >
                {/* Permissions Card */}
                <View style={styles.card}>
                  <TouchableOpacity 
                    style={styles.dropdownHeader}
                    onPress={() => setShowPermissionsDropdown(!showPermissionsDropdown)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.dropdownHeaderTitleRow}>
                      <Text style={styles.cardTitle}>Native Permissions</Text>
                      <View style={[
                        styles.statusBadge, 
                        (hasOverlayPermission && hasUsagePermission && hasAlarmPermission && hasNotificationPermission) ? styles.badgeSuccess : styles.badgeDanger,
                        { marginLeft: 8 }
                      ]}>
                        <Text style={styles.badgeText}>
                          {(hasOverlayPermission && hasUsagePermission && hasAlarmPermission && hasNotificationPermission) ? 'All Active' : 'Requires Attention'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.dropdownToggleText}>
                      {showPermissionsDropdown ? 'Hide ▲' : 'Show ▼'}
                    </Text>
                  </TouchableOpacity>

                  {showPermissionsDropdown && (
                    <View style={styles.dropdownContent}>
                      <View style={styles.permissionItem}>
                        <View style={styles.permissionHeader}>
                          <Text style={styles.permissionLabel}>Draw Over Other Apps</Text>
                          <View style={[styles.statusBadge, hasOverlayPermission ? styles.badgeSuccess : styles.badgeDanger]}>
                            <Text style={styles.badgeText}>{hasOverlayPermission ? 'Granted' : 'Missing'}</Text>
                          </View>
                        </View>
                        <Text style={styles.permissionDescription}>
                          Allows the overlay to cover the screen and enforce your habit.
                        </Text>
                        {!hasOverlayPermission && (
                          <TouchableOpacity style={styles.buttonSecondary} onPress={requestOverlay}>
                            <Text style={styles.buttonSecondaryText}>Grant Overlay Access</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={styles.divider} />

                      <View style={styles.permissionItem}>
                        <View style={styles.permissionHeader}>
                          <Text style={styles.permissionLabel}>Usage Statistics Access</Text>
                          <View style={[styles.statusBadge, hasUsagePermission ? styles.badgeSuccess : styles.badgeDanger]}>
                            <Text style={styles.badgeText}>{hasUsagePermission ? 'Granted' : 'Missing'}</Text>
                          </View>
                        </View>
                        <Text style={styles.permissionDescription}>
                          Allows tracking usage of the target app to know when you finish the habit.
                        </Text>
                        {!hasUsagePermission && (
                          <TouchableOpacity style={styles.buttonSecondary} onPress={requestUsage}>
                            <Text style={styles.buttonSecondaryText}>Grant Usage Access</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={styles.divider} />

                      <View style={styles.permissionItem}>
                        <View style={styles.permissionHeader}>
                          <Text style={styles.permissionLabel}>Alarms & Reminders</Text>
                          <View style={[styles.statusBadge, hasAlarmPermission ? styles.badgeSuccess : styles.badgeDanger]}>
                            <Text style={styles.badgeText}>{hasAlarmPermission ? 'Granted' : 'Missing'}</Text>
                          </View>
                        </View>
                        <Text style={styles.permissionDescription}>
                          Allows launching the blocker precisely at your scheduled time.
                        </Text>
                        {!hasAlarmPermission && (
                          <TouchableOpacity style={styles.buttonSecondary} onPress={requestAlarm}>
                            <Text style={styles.buttonSecondaryText}>Grant Alarm Access</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {Platform.OS === 'android' && Platform.Version >= 33 && (
                        <>
                          <View style={styles.divider} />
                          
                          <View style={styles.permissionItem}>
                            <View style={styles.permissionHeader}>
                              <Text style={styles.permissionLabel}>System Notifications</Text>
                              <View style={[styles.statusBadge, hasNotificationPermission ? styles.badgeSuccess : styles.badgeDanger]}>
                                <Text style={styles.badgeText}>{hasNotificationPermission ? 'Granted' : 'Missing'}</Text>
                              </View>
                            </View>
                            <Text style={styles.permissionDescription}>
                              Allows displaying the real-time remaining time in a silent status bar notification.
                            </Text>
                            {!hasNotificationPermission && (
                              <TouchableOpacity style={styles.buttonSecondary} onPress={requestNotification}>
                                <Text style={styles.buttonSecondaryText}>Grant Notification Access</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </>
                      )}
                    </View>
                  )}
                </View>

                {/* Schedules List */}
                <Text style={styles.sectionTitle}>Daily Habit Schedules</Text>
                
                {schedules.length === 0 ? (
                  <View style={styles.emptyStateContainer}>
                    <Text style={styles.emptyStateTitle}>No habits scheduled yet</Text>
                    <Text style={styles.emptyStateText}>
                      Tap the "+" button below to schedule your daily habit block!
                    </Text>
                  </View>
                ) : (
                  schedules.map((item) => (
                    <View key={item.id} style={styles.scheduleCard}>
                      <View style={styles.scheduleInfo}>
                        <Text style={styles.scheduleTime}>{item.hour}:{item.minute}</Text>
                        <View style={styles.scheduleDetails}>
                          <Text style={styles.scheduleAppName} numberOfLines={1}>
                            {item.targetApp.label}
                          </Text>
                          <Text style={styles.scheduleDuration}>
                            Goal: {item.durationMinutes} mins
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.scheduleActions}>
                        <TouchableOpacity 
                          style={[styles.actionIconButton, { marginRight: 12 }]} 
                          onPress={() => handleEditSchedule(item)}
                        >
                          <Text style={styles.actionIconTextEdit}>Edit</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={styles.actionIconButton} 
                          onPress={() => handleDeleteSchedule(item.id)}
                        >
                          <Text style={styles.actionIconTextDelete}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>

              {/* Floating Action Button (FAB) */}
              <TouchableOpacity 
                style={styles.fab} 
                onPress={handleAddNewSchedule}
                activeOpacity={0.8}
              >
                <Text style={styles.fabText}>+</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Edit / Create Screen */
            <ScrollView 
              contentContainerStyle={styles.scrollContainer}
              scrollEnabled={isScrollEnabled}
            >
              <View style={styles.editHeaderRow}>
                <TouchableOpacity style={styles.backButton} onPress={() => setViewMode('home')}>
                  <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.editTitle}>
                  {editingSchedule ? 'Edit Daily Habit' : 'New Daily Habit'}
                </Text>
              </View>

              {/* Config Card */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Habit Target Config</Text>
                
                <Text style={styles.inputLabel}>1. Select Target App</Text>
                <TouchableOpacity style={styles.appSelector} onPress={loadApps}>
                  <Text style={selectedApp ? styles.appSelectorTextActive : styles.appSelectorTextPlaceholder}>
                    {selectedApp ? `${selectedApp.label} (${selectedApp.packageName})` : 'Choose stretching/habit app...'}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.inputLabel}>2. Daily Goal Duration: {durationMinutes} minutes</Text>
                <View style={styles.sliderContainer}>
                  <Slider
                    style={{ width: '100%', height: 40 }}
                    minimumValue={0}
                    maximumValue={allowedValues.length - 1}
                    step={1}
                    value={allowedValues.indexOf(parseInt(durationMinutes, 10)) === -1 ? 15 : allowedValues.indexOf(parseInt(durationMinutes, 10))}
                    onSlidingStart={() => setIsScrollEnabled(false)}
                    onValueChange={(val) => {
                      setDurationMinutes(allowedValues[val].toString());
                    }}
                    onSlidingComplete={() => setIsScrollEnabled(true)}
                    minimumTrackTintColor="#6366F1"
                    maximumTrackTintColor="#334155"
                    thumbTintColor="#F8FAFC"
                  />
                  <View style={styles.sliderLabels}>
                    <Text style={styles.sliderLabelText}>0m</Text>
                    <Text style={styles.sliderLabelText}>15m</Text>
                    <Text style={styles.sliderLabelText}>30m</Text>
                    <Text style={styles.sliderLabelText}>45m</Text>
                    <Text style={styles.sliderLabelText}>60m</Text>
                  </View>
                </View>

                <Text style={styles.inputLabel}>3. Daily Block Trigger Time</Text>
                <TouchableOpacity 
                  style={styles.timeSelectorButton}
                  onPress={() => setShowTimePicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.timeSelectorValue}>{triggerHour}:{triggerMinute}</Text>
                  <Text style={styles.timeSelectorLabel}>Tap to change trigger time (physical clock dialog)</Text>
                </TouchableOpacity>

                {showTimePicker && (
                  <DateTimePicker
                    value={getTimeObject()}
                    mode="time"
                    is24Hour={true}
                    display="clock"
                    onValueChange={onTimeChange}
                  />
                )}
              </View>

              {/* Actions Card */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Enforcement Controls</Text>
                
                <TouchableOpacity style={styles.buttonPrimary} onPress={handleScheduleBlock}>
                  <Text style={styles.buttonPrimaryText}>
                    {editingSchedule ? 'Update Daily Block' : 'Save & Schedule Daily Block'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.actionButtonRow}>
                  <TouchableOpacity style={[styles.buttonSecondary, { flex: 1, marginRight: 8 }]} onPress={handleStartTest}>
                    <Text style={styles.buttonSecondaryText}>Test Block Instantly</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.buttonDanger, { flex: 1 }]} onPress={handleStopService}>
                    <Text style={styles.buttonDangerText}>Force Stop Service</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          )
        ) : (
          /* App Picker Modal-like UI */
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Target App</Text>
              <TouchableOpacity style={styles.pickerCloseButton} onPress={() => setShowAppPicker(false)}>
                <Text style={styles.pickerCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchBar}
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Search apps..."
              placeholderTextColor="#64748B"
            />

            {isLoadingApps ? (
              <View style={styles.spinnerContainer}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={styles.spinnerText}>Scanning device apps...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredApps}
                keyExtractor={(item) => item.packageName}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.appItem} onPress={() => handleSelectApp(item)}>
                    <Text style={styles.appItemLabel}>{item.label}</Text>
                    <Text style={styles.appItemPackage}>{item.packageName}</Text>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.pickerDivider} />}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No launchable applications found.</Text>
                }
              />
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F1F5F9',
    marginBottom: 16,
  },
  permissionItem: {
    marginVertical: 4,
  },
  permissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  permissionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  permissionDescription: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 12,
    lineHeight: 18,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  badgeSuccess: {
    backgroundColor: '#065F46',
  },
  badgeDanger: {
    backgroundColor: '#7F1D1D',
  },
  badgeText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 12,
    marginBottom: 8,
  },
  appSelector: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 14,
    justifyContent: 'center',
  },
  appSelectorTextPlaceholder: {
    color: '#64748B',
    fontSize: 14,
  },
  appSelectorTextActive: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#F8FAFC',
    fontSize: 14,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInputWrapper: {
    flex: 1,
  },
  timeInputLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  timeInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#F8FAFC',
    fontSize: 16,
    textAlign: 'center',
  },
  timeInputColon: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F1F5F9',
    marginHorizontal: 12,
    marginTop: 16,
  },
  buttonPrimary: {
    backgroundColor: '#6366F1',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonPrimaryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  actionButtonRow: {
    flexDirection: 'row',
  },
  buttonSecondary: {
    backgroundColor: '#334155',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  buttonSecondaryText: {
    color: '#E2E8F0',
    fontWeight: '600',
    fontSize: 14,
  },
  buttonDanger: {
    backgroundColor: '#7F1D1D',
    borderWidth: 1,
    borderColor: '#B91C1C',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  buttonDangerText: {
    color: '#FCA5A5',
    fontWeight: '600',
    fontSize: 14,
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 16,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  pickerCloseButton: {
    padding: 6,
  },
  pickerCloseText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  searchBar: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 12,
    color: '#F8FAFC',
    fontSize: 14,
    marginBottom: 16,
  },
  appItem: {
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  appItemLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  appItemPackage: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  pickerDivider: {
    height: 1,
    backgroundColor: '#1E293B',
  },
  emptyText: {
    color: '#64748B',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  spinnerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80,
  },
  spinnerText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 14,
  },
  sliderContainer: {
    marginVertical: 14,
    width: '100%',
  },
  sliderTrackContainer: {
    height: 30,
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
  },
  sliderTrack: {
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
  },
  sliderActiveTrack: {
    height: 6,
    backgroundColor: '#6366F1',
    borderRadius: 3,
    position: 'absolute',
  },
  sliderThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    position: 'absolute',
    marginLeft: -10,
    borderWidth: 2,
    borderColor: '#6366F1',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  sliderLabelText: {
    fontSize: 11,
    color: '#64748B',
  },
  timePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 180,
    marginTop: 10,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'stretch',
  },
  columnHeader: {
    textAlign: 'center',
    paddingVertical: 6,
    backgroundColor: '#1E293B',
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  columnList: {
    flex: 1,
  },
  pickerItem: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  pickerItemActive: {
    backgroundColor: '#312E81',
  },
  pickerItemText: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  pickerItemTextActive: {
    color: '#F8FAFC',
    fontWeight: 'bold',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dropdownHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownToggleText: {
    color: '#6366F1',
    fontSize: 13,
    fontWeight: '600',
  },
  dropdownContent: {
    marginTop: 16,
  },
  timeSelectorButton: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  timeSelectorValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6366F1',
    letterSpacing: 2,
  },
  timeSelectorLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginHorizontal: 4,
    marginTop: 24,
    marginBottom: 12,
  },
  emptyStateContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  emptyStateTitle: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateText: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  scheduleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    marginBottom: 12,
  },
  scheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  scheduleTime: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#6366F1',
    marginRight: 14,
    letterSpacing: 1,
  },
  scheduleDetails: {
    flex: 1,
    paddingRight: 8,
  },
  scheduleAppName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  scheduleDuration: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  scheduleActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  actionIconTextEdit: {
    color: '#6366F1',
    fontWeight: '600',
    fontSize: 14,
  },
  actionIconTextDelete: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: {
    color: '#F8FAFC',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: -2,
  },
  editHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 12,
  },
  backButtonText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  editTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
});
