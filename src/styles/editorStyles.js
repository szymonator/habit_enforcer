import { StyleSheet } from 'react-native';
import { colors, radii, spacing } from './theme';

export const editorStyles = StyleSheet.create({
  editHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.bgInputBorder,
    marginRight: spacing.md,
  },
  backButtonText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  editTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  appSelector: {
    backgroundColor: colors.bgPrimary,
    borderWidth: 1,
    borderColor: colors.bgInputBorder,
    borderRadius: radii.md,
    padding: 14,
    justifyContent: 'center',
  },
  appSelectorTextPlaceholder: {
    color: colors.textDim,
    fontSize: 14,
  },
  appSelectorTextActive: {
    color: colors.accentLight,
    fontSize: 14,
    fontWeight: '500',
  },
  sliderContainer: {
    marginVertical: 14,
    width: '100%',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  sliderLabelText: {
    fontSize: 11,
    color: colors.textDim,
  },
  timeSelectorButton: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.bgInputBorder,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  timeSelectorValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.accent,
    letterSpacing: 2,
  },
  timeSelectorLabel: {
    fontSize: 12,
    color: colors.textDim,
    marginTop: 4,
  },
  buttonPrimary: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  buttonPrimaryText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
