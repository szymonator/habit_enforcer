import * as FileSystem from 'expo-file-system/legacy';

/**
 * Allowed duration values for the habit goal slider.
 * Non-linear scale: 0-15 in 1-min steps, then 5-min steps to 60.
 */
export const ALLOWED_DURATION_VALUES = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  20, 25, 30, 35, 40, 45, 50, 55, 60,
];

/** Persistent file path for saved schedule data. */
export const SCHEDULES_FILE = FileSystem.documentDirectory + 'schedules.json';

/** Default form values when creating a new schedule. */
export const DEFAULT_SCHEDULE_FORM = {
  triggerHour: '20',
  triggerMinute: '00',
  durationMinutes: '15',
};
