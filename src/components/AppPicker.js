import React, { useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { pickerStyles as styles } from '../styles/pickerStyles';
import { colors } from '../styles/theme';

/** Stable separator component — avoids re-creating on every render. */
function AppItemSeparator() {
  return <View style={styles.pickerDivider} />;
}

/**
 * Fullscreen app picker overlay with search and list of installed apps.
 */
export default function AppPicker({
  apps,
  filteredApps,
  isLoading,
  searchQuery,
  onSearch,
  onSelect,
  onClose,
}) {
  const renderAppItem = useCallback(
    ({ item }) => (
      <TouchableOpacity style={styles.appItem} onPress={() => onSelect(item)}>
        <Text style={styles.appItemLabel}>{item.label}</Text>
        <Text style={styles.appItemPackage}>{item.packageName}</Text>
      </TouchableOpacity>
    ),
    [onSelect],
  );

  return (
    <View style={styles.pickerContainer}>
      <View style={styles.pickerHeader}>
        <Text style={styles.pickerTitle}>Select Target App</Text>
        <TouchableOpacity style={styles.pickerCloseButton} onPress={onClose}>
          <Text style={styles.pickerCloseText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchBar}
        value={searchQuery}
        onChangeText={onSearch}
        placeholder="Search apps..."
        placeholderTextColor={colors.textDim}
      />

      {isLoading ? (
        <View style={styles.spinnerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.spinnerText}>Scanning device apps...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredApps}
          keyExtractor={(item) => item.packageName}
          renderItem={renderAppItem}
          ItemSeparatorComponent={AppItemSeparator}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No launchable applications found.</Text>
          }
        />
      )}
    </View>
  );
}
