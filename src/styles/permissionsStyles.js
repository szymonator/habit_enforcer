import { StyleSheet } from 'react-native';
import { colors, radii } from './theme';

export const permissionsStyles = StyleSheet.create({
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
    color: colors.textSecondary,
  },
  permissionDescription: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 12,
    lineHeight: 18,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  badgeSuccess: {
    backgroundColor: colors.successBg,
  },
  badgeDanger: {
    backgroundColor: colors.dangerBg,
  },
  badgeText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
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
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  dropdownContent: {
    marginTop: 16,
  },
});
