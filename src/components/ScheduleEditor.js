import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import DateTimePicker from '@react-native-community/datetimepicker';
import HabitBlockerModule from '../../modules/expo-habit-blocker/src/HabitBlockerModule';
import { ALLOWED_DURATION_VALUES, DEFAULT_SCHEDULE_FORM } from '../constants';
import { homeStyles } from '../styles/homeStyles';
import { editorStyles as styles } from '../styles/editorStyles';
import { colors } from '../styles/theme';

/**
 * Create / Edit screen for a daily habit schedule.
 */
export default function ScheduleEditor({
  editingSchedule,
  selectedApp,
  schedules,
  saveSchedules,
  hasOverlayPermission,
  hasUsagePermission,
  hasAlarmPermission,
  onLoadApps,
  onGoBack,
  isScrollEnabled,
  setIsScrollEnabled,
}) {
  const [triggerHour, setTriggerHour] = useState(
    editingSchedule?.hour ?? DEFAULT_SCHEDULE_FORM.triggerHour,
  );
  const [triggerMinute, setTriggerMinute] = useState(
    editingSchedule?.minute ?? DEFAULT_SCHEDULE_FORM.triggerMinute,
  );
  const [durationMinutes, setDurationMinutes] = useState(
    editingSchedule?.durationMinutes ?? DEFAULT_SCHEDULE_FORM.durationMinutes,
  );
  const [showTimePicker, setShowTimePicker] = useState(false);

  const getTimeObject = () => {
    const d = new Date();
    d.setHours(parseInt(triggerHour, 10) || 0);
    d.setMinutes(parseInt(triggerMinute, 10) || 0);
    d.setSeconds(0);
    return d;
  };

  const onTimeChange = (_event, selectedDate) => {
    setShowTimePicker(false);
    if (selectedDate) {
      setTriggerHour(selectedDate.getHours().toString().padStart(2, '0'));
      setTriggerMinute(selectedDate.getMinutes().toString().padStart(2, '0'));
    }
  };

  const sliderIndex = () => {
    const idx = ALLOWED_DURATION_VALUES.indexOf(parseInt(durationMinutes, 10));
    return idx === -1 ? 15 : idx;
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
      const index = updatedSchedules.findIndex((s) => s.id === targetId);
      if (index > -1) {
        updatedSchedules[index] = {
          ...updatedSchedules[index],
          hour: triggerHour,
          minute: triggerMinute,
          targetApp: selectedApp,
          durationMinutes,
        };
      }
    } else {
      updatedSchedules.push({
        id: targetId,
        hour: triggerHour,
        minute: triggerMinute,
        targetApp: selectedApp,
        durationMinutes,
      });
    }

    try {
      const durationSeconds = mins * 60;
      HabitBlockerModule.scheduleDailyBlock(targetId, hour, minute, selectedApp.packageName, durationSeconds);
      await saveSchedules(updatedSchedules);

      Alert.alert(
        'Schedule Saved',
        `Daily habit blocker scheduled for ${triggerHour}:${triggerMinute} daily.\nTarget app: ${selectedApp.label}\nGoal: ${mins} minutes.`,
        [{ text: 'Great' }],
      );

      onGoBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to schedule daily block');
    }
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
      HabitBlockerModule.startBlockService(selectedApp.packageName, 60, true);
      Alert.alert(
        'Test Block Started',
        `A 1-minute test block is active. Open ${selectedApp.label} to run down the timer. Exiting the app will block the screen.`,
        [{ text: 'OK' }],
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


  return (
    <ScrollView
      contentContainerStyle={homeStyles.scrollContainer}
      scrollEnabled={isScrollEnabled}
    >
      <View style={styles.editHeaderRow}>
        <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.editTitle}>
          {editingSchedule ? 'Edit Daily Habit' : 'New Daily Habit'}
        </Text>
      </View>

      {/* Config Card */}
      <View style={homeStyles.card}>
        <Text style={homeStyles.cardTitle}>Habit Target Config</Text>

        <Text style={styles.inputLabel}>1. Select Target App</Text>
        <TouchableOpacity
          style={styles.appSelector}
          onPress={onLoadApps}
        >
          <Text style={selectedApp ? styles.appSelectorTextActive : styles.appSelectorTextPlaceholder}>
            {selectedApp ? `${selectedApp.label} (${selectedApp.packageName})` : 'Choose stretching/habit app...'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.inputLabel}>2. Daily Goal Duration: {durationMinutes} minutes</Text>
        <View style={styles.sliderContainer}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={ALLOWED_DURATION_VALUES.length - 1}
            step={1}
            value={sliderIndex()}
            onSlidingStart={() => setIsScrollEnabled(false)}
            onValueChange={(val) => setDurationMinutes(ALLOWED_DURATION_VALUES[val].toString())}
            onSlidingComplete={() => setIsScrollEnabled(true)}
            minimumTrackTintColor={colors.accent}
            maximumTrackTintColor={colors.bgInputBorder}
            thumbTintColor={colors.textPrimary}
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
      <View style={homeStyles.card}>
        <Text style={homeStyles.cardTitle}>Enforcement Controls</Text>

        <TouchableOpacity style={styles.buttonPrimary} onPress={handleScheduleBlock}>
          <Text style={styles.buttonPrimaryText}>
            {editingSchedule ? 'Update Daily Block' : 'Save & Schedule Daily Block'}
          </Text>
        </TouchableOpacity>

        <View style={styles.actionButtonRow}>
          <TouchableOpacity
            style={[homeStyles.buttonSecondary, styles.buttonSecondaryFlex]}
            onPress={handleStartTest}
          >
            <Text style={homeStyles.buttonSecondaryText}>Test Block Instantly</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.buttonDanger} onPress={handleStopService}>
            <Text style={styles.buttonDangerText}>Force Stop Service</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
