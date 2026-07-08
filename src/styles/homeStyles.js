import { StyleSheet, Platform, StatusBar } from 'react-native';
import { colors, radii, shadows, spacing } from './theme';

export const homeStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  scrollContainer: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.xxl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: colors.bgInputBorder,
    marginVertical: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginHorizontal: 4,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  emptyStateContainer: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.bgInputBorder,
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  emptyStateTitle: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    color: colors.textDim,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  scheduleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.bgInputBorder,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  scheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  scheduleTime: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.accent,
    marginRight: 14,
    letterSpacing: 1,
  },
  scheduleDetails: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  scheduleAppName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  scheduleDuration: {
    fontSize: 12,
    color: colors.textDim,
    marginTop: 2,
  },
  scheduleActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconButton: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
  },
  actionIconButtonEditMargin: {
    marginRight: spacing.md,
  },
  actionIconTextEdit: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: 14,
  },
  actionIconTextDelete: {
    color: colors.dangerBright,
    fontWeight: '600',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xxl,
    right: spacing.xxl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.fab,
  },
  fabText: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: -2,
  },
  buttonSecondary: {
    backgroundColor: colors.bgInputBorder,
    borderRadius: radii.lg,
    padding: 14,
    alignItems: 'center',
  },
  buttonSecondaryText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
});
