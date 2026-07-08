import { useState, useEffect } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';
import HabitBlockerModule from '../../modules/expo-habit-blocker/src/HabitBlockerModule';
import { SCHEDULES_FILE } from '../constants';

/**
 * Manages schedule persistence (load/save to JSON file) and CRUD operations.
 */
export function useSchedules() {
  const [schedules, setSchedules] = useState([]);

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

  const deleteSchedule = (id) => {
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
              const filtered = schedules.filter((s) => s.id !== id);
              await saveSchedules(filtered);
              Alert.alert('Deleted', 'Scheduled block removed successfully.');
            } catch (e) {
              Alert.alert('Error', 'Failed to cancel native alarm.');
            }
          },
        },
      ],
    );
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  return {
    schedules,
    saveSchedules,
    deleteSchedule,
  };
}
