/**
 * Centralized design tokens for the Habit Enforcer app.
 * All color values, spacing, and shared style primitives live here.
 */

export const colors = {
  // Backgrounds
  bgPrimary: '#0F172A',
  bgCard: '#1E293B',
  bgInputBorder: '#334155',

  // Brand / Accent
  accent: '#6366F1',
  accentDark: '#312E81',
  accentLight: '#38BDF8',

  // Text
  textPrimary: '#F8FAFC',
  textSecondary: '#F1F5F9',
  textMuted: '#94A3B8',
  textDim: '#64748B',

  // Semantic
  successBg: '#065F46',
  dangerBg: '#7F1D1D',
  dangerBorder: '#B91C1C',
  dangerText: '#FCA5A5',
  dangerBright: '#EF4444',

  // Misc
  white: '#FFFFFF',
  black: '#000',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const radii = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  xxl: 16,
  pill: 99,
};

export const shadows = {
  card: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  fab: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
};
