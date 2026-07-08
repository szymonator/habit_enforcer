import React, { useState } from 'react';
import { View, Text, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HabitBlockerModule from './modules/expo-habit-blocker/src/HabitBlockerModule';

// Hooks
import { usePermissions } from './src/hooks/usePermissions';
import { useSchedules } from './src/hooks/useSchedules';

// Components
import PermissionsCard from './src/components/PermissionsCard';
import ScheduleList from './src/components/ScheduleList';
import ScheduleEditor from './src/components/ScheduleEditor';
import AppPicker from './src/components/AppPicker';

// Styles
import { homeStyles as styles } from './src/styles/homeStyles';

export default function App() {
  const permissions = usePermissions();
  const { schedules, saveSchedules, deleteSchedule } = useSchedules();

  const [viewMode, setViewMode] = useState('home'); // 'home' | 'edit'
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [isScrollEnabled, setIsScrollEnabled] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);

  // App picker state (lifted here because it overlays the entire screen)
  const [showAppPicker, setShowAppPicker] = useState(false);
  const [apps, setApps] = useState([]);
  const [filteredApps, setFilteredApps] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingApps, setIsLoadingApps] = useState(false);

  const loadApps = () => {
    setIsLoadingApps(true);
    setShowAppPicker(true);
    // Defer heavy PM query so the spinner renders first
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
    const lowerText = text.toLowerCase();
    setFilteredApps(
      apps.filter(
        (app) =>
          app.label.toLowerCase().includes(lowerText) ||
          app.packageName.toLowerCase().includes(lowerText),
      ),
    );
  };

  const handleSelectApp = (app) => {
    setSelectedApp(app);
    setShowAppPicker(false);
    setSearchQuery('');
  };

  const handleEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
    setSelectedApp(schedule.targetApp);
    setViewMode('edit');
  };

  const handleAddNewSchedule = () => {
    setEditingSchedule(null);
    setSelectedApp(null);
    setViewMode('edit');
  };

  // --- Render ---

  const renderContent = () => {
    if (showAppPicker) {
      return (
        <AppPicker
          apps={apps}
          filteredApps={filteredApps}
          isLoading={isLoadingApps}
          searchQuery={searchQuery}
          onSearch={handleSearch}
          onSelect={handleSelectApp}
          onClose={() => setShowAppPicker(false)}
        />
      );
    }

    if (viewMode === 'edit') {
      return (
        <ScheduleEditor
          key={editingSchedule?.id ?? 'new'}
          editingSchedule={editingSchedule}
          selectedApp={selectedApp}
          schedules={schedules}
          saveSchedules={saveSchedules}
          hasOverlayPermission={permissions.hasOverlayPermission}
          hasUsagePermission={permissions.hasUsagePermission}
          hasAlarmPermission={permissions.hasAlarmPermission}
          onLoadApps={loadApps}
          onGoBack={() => {
            setViewMode('home');
            setEditingSchedule(null);
          }}
          isScrollEnabled={isScrollEnabled}
          setIsScrollEnabled={setIsScrollEnabled}
        />
      );
    }

    return (
      <ScheduleList
        schedules={schedules}
        onEdit={handleEditSchedule}
        onDelete={deleteSchedule}
        onAdd={handleAddNewSchedule}
        isScrollEnabled={isScrollEnabled}
      >
        <PermissionsCard {...permissions} />
      </ScheduleList>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Habit Enforcer</Text>
          <Text style={styles.subtitle}>Block distractions, build daily routines</Text>
        </View>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
}
