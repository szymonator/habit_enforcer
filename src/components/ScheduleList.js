import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { homeStyles as styles } from '../styles/homeStyles';

/**
 * Home screen body: section title, schedule cards (or empty state), and FAB.
 */
export default function ScheduleList({
  schedules,
  onEdit,
  onDelete,
  onAdd,
  isScrollEnabled,
  children,
}) {
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        scrollEnabled={isScrollEnabled}
      >
        {/* Slot for PermissionsCard */}
        {children}

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
                <Text style={styles.scheduleTime}>
                  {String(item.hour).padStart(2, '0')}:{String(item.minute).padStart(2, '0')}
                </Text>
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
                  style={[styles.actionIconButton, styles.actionIconButtonEditMargin]}
                  onPress={() => onEdit(item)}
                >
                  <Text style={styles.actionIconTextEdit}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionIconButton}
                  onPress={() => onDelete(item.id)}
                >
                  <Text style={styles.actionIconTextDelete}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={onAdd}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}
