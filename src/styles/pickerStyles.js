import { StyleSheet } from 'react-native';
import { colors, radii, spacing } from './theme';

export const pickerStyles = StyleSheet.create({
  pickerContainer: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    padding: spacing.lg,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  pickerCloseButton: {
    padding: 6,
  },
  pickerCloseText: {
    color: colors.dangerBright,
    fontSize: 14,
    fontWeight: '600',
  },
  searchBar: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.bgInputBorder,
    borderRadius: radii.lg,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: 14,
    marginBottom: spacing.lg,
  },
  appItem: {
    paddingVertical: 14,
    paddingHorizontal: spacing.sm,
  },
  appItemLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  appItemPackage: {
    fontSize: 12,
    color: colors.textDim,
    marginTop: 4,
  },
  pickerDivider: {
    height: 1,
    backgroundColor: colors.bgCard,
  },
  emptyText: {
    color: colors.textDim,
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
    color: colors.textMuted,
    marginTop: spacing.md,
    fontSize: 14,
  },
});
