import { StyleSheet, Dimensions, ViewStyle, TextStyle } from 'react-native';

const { width } = Dimensions.get('window');

// Design System Tokens (extracted from dashboard)
export const designTokens = {
  colors: {
    // Background Colors
    background: '#F8FAFC',
    white: '#FFFFFF',
    
    // Text Colors
    textPrimary: '#1F2937',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    
    // Brand Colors - Modern Green Theme
    primary: '#10B981',
    primaryLight: '#34D399',
    primaryDark: '#059669',
    
    // Status Colors
    success: '#10B981',
    successLight: '#DCFCE7',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    error: '#EF4444',
    errorLight: '#FEE2E2',
    info: '#3B82F6',
    infoLight: '#DBEAFE',
    
    // Icon Background Colors
    iconBlue: '#DBEAFE',
    iconGreen: '#DCFCE7',
    iconOrange: '#FEF3C7',
    iconRed: '#FEE2E2',
    iconTeal: '#CCFBF1',
    
    // Border Colors
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
  },
  
  typography: {
    // Font Sizes
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    
    // Font Weights
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
  },
  
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
    },
  },
};

// Shared Component Styles
export const sharedStyles = StyleSheet.create({
  // Container Styles
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.background,
  } as ViewStyle,
  
  pageContainer: {
    padding: designTokens.spacing.lg, // Reduced from 2xl (24) to lg (16)
    paddingBottom: designTokens.spacing.xl, // Add extra bottom padding for navigation
  } as ViewStyle,
  
  scrollView: {
    flex: 1,
  } as ViewStyle,
  
  // Header Styles
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: designTokens.spacing.xl, // Reduced from 3xl (32) to xl (20)
  } as ViewStyle,
  
  headerLeft: {
    flex: 1,
  } as ViewStyle,
  
  pageTitle: {
    fontSize: designTokens.typography['2xl'], // Reduced from 3xl (32) to 2xl (24)
    fontWeight: designTokens.typography.bold,
    color: designTokens.colors.textPrimary,
    marginBottom: designTokens.spacing.xs,
  } as TextStyle,
  
  pageSubtitle: {
    fontSize: designTokens.typography.base,
    color: designTokens.colors.textSecondary,
  } as TextStyle,
  
  headerRight: {
    flexDirection: 'row',
    gap: designTokens.spacing.md,
  } as ViewStyle,
  
  // Button Styles
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.primary,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.md,
    gap: designTokens.spacing.xs,
  } as ViewStyle,
  
  primaryButtonText: {
    color: designTokens.colors.white,
    fontWeight: '600' as const,
    fontSize: designTokens.typography.sm,
  } as TextStyle,

  backButton: {
    paddingVertical: designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.md,
    marginBottom: designTokens.spacing.md,
  } as ViewStyle,
  
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.white,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: designTokens.colors.border,
    gap: designTokens.spacing.xs,
  } as ViewStyle,
  
  secondaryButtonText: {
    color: designTokens.colors.textPrimary,
    fontWeight: '600' as const,
    fontSize: designTokens.typography.sm,
  } as TextStyle,
  
  // Card Styles
  card: {
    backgroundColor: designTokens.colors.white,
    padding: designTokens.spacing.xl,
    borderRadius: designTokens.borderRadius.lg,
    ...designTokens.shadows.md,
    borderWidth: 1,
    borderColor: designTokens.colors.border,
  } as ViewStyle,
  
  // Section Styles
  section: {
    marginBottom: designTokens.spacing.xl, // Reduced from 3xl (32) to xl (20)
  } as ViewStyle,
  
  sectionTitle: {
    fontSize: designTokens.typography.lg, // Reduced from xl (20) to lg (18)
    fontWeight: designTokens.typography.bold,
    color: designTokens.colors.textPrimary,
    marginBottom: designTokens.spacing.md, // Reduced from lg (16) to md (12)
  } as TextStyle,
  
  // Grid Styles - 2x2 grid layout
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designTokens.spacing.sm, // Reduced from md (12) to sm (8)
    justifyContent: 'space-between',
  } as ViewStyle,
  
  gridItem: {
    width: (width - 48) / 2, // Reduced from 80 to 48 for better mobile fit
    marginBottom: designTokens.spacing.sm, // Reduced from md (12) to sm (8)
  } as ViewStyle,
  
  // Stat Card Styles - 2x2 grid cards
  statCard: {
    backgroundColor: designTokens.colors.white,
    padding: designTokens.spacing.lg, // Reduced from xl (20) to lg (16)
    borderRadius: designTokens.borderRadius.lg,
    ...designTokens.shadows.md,
    borderWidth: 1,
    borderColor: designTokens.colors.border,
    minHeight: 100, // Reduced from 120
    width: '100%',
  } as ViewStyle,
  
  statIconContainer: {
    marginBottom: designTokens.spacing.sm, // Reduced from md (12) to sm (8)
  } as ViewStyle,
  
  statIcon: {
    width: 32, // Reduced from 40
    height: 32, // Reduced from 40
    borderRadius: 16, // Reduced from 20
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  
  statLabel: {
    fontSize: designTokens.typography.sm,
    fontWeight: designTokens.typography.medium,
    color: designTokens.colors.textSecondary,
    marginBottom: designTokens.spacing.xs,
  } as TextStyle,
  
  statValue: {
    fontSize: designTokens.typography.xl, // Reduced from 2xl (24) to xl (20)
    fontWeight: designTokens.typography.bold,
    color: designTokens.colors.textPrimary,
    marginBottom: designTokens.spacing.xs,
  } as TextStyle,
  
  statSubtitle: {
    fontSize: designTokens.typography.xs,
    color: designTokens.colors.textMuted,
  } as TextStyle,
  
  // List Styles
  list: {
    gap: designTokens.spacing.md, // Reduced from lg (16) to md (12)
  } as ViewStyle,
  
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.white,
    padding: designTokens.spacing.md, // Reduced from lg (16) to md (12)
    borderRadius: designTokens.borderRadius.lg,
    ...designTokens.shadows.md,
    borderWidth: 1,
    borderColor: designTokens.colors.border,
  } as ViewStyle,
  
  // Form Styles
  formGroup: {
    marginBottom: designTokens.spacing.lg,
  } as ViewStyle,
  
  formLabel: {
    fontSize: designTokens.typography.sm,
    fontWeight: designTokens.typography.medium,
    color: designTokens.colors.textPrimary,
    marginBottom: designTokens.spacing.sm,
  } as TextStyle,
  
  formInput: {
    backgroundColor: designTokens.colors.white,
    borderWidth: 1,
    borderColor: designTokens.colors.border,
    borderRadius: designTokens.borderRadius.md,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
    fontSize: designTokens.typography.base,
    color: designTokens.colors.textPrimary,
  } as TextStyle,
  
  // Status Badge Styles
  statusBadge: {
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: designTokens.borderRadius.full,
  } as ViewStyle,
  
  statusText: {
    fontSize: designTokens.typography.sm,
    fontWeight: designTokens.typography.medium,
  } as TextStyle,
  
  // Empty State Styles
  emptyState: {
    backgroundColor: designTokens.colors.white,
    padding: designTokens.spacing['3xl'],
    borderRadius: designTokens.borderRadius.lg,
    ...designTokens.shadows.md,
    borderWidth: 1,
    borderColor: designTokens.colors.border,
    alignItems: 'center',
  } as ViewStyle,
  
  emptyStateTitle: {
    fontSize: designTokens.typography.lg,
    fontWeight: designTokens.typography.medium,
    color: designTokens.colors.textPrimary,
    marginTop: designTokens.spacing.lg,
  } as TextStyle,
  
  emptyStateText: {
    color: designTokens.colors.textSecondary,
    textAlign: 'center',
    marginTop: designTokens.spacing.sm,
  } as TextStyle,
  
  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: designTokens.colors.background,
  } as ViewStyle,
  
  loadingText: {
    fontSize: designTokens.typography.lg,
    color: designTokens.colors.textSecondary,
  } as TextStyle,
  
  // Navigation Styles
  navigationContainer: {
    flex: 1,
    flexDirection: 'row',
  } as ViewStyle,
  
  mainContent: {
    flex: 1,
  } as ViewStyle,
  
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 998,
  } as ViewStyle,
});

// Icon Background Colors
export const iconBackgrounds = {
  blue: { backgroundColor: designTokens.colors.iconBlue },
  green: { backgroundColor: designTokens.colors.iconGreen },
  orange: { backgroundColor: designTokens.colors.iconOrange },
  red: { backgroundColor: designTokens.colors.iconRed },
  teal: { backgroundColor: designTokens.colors.iconTeal },
};

// Status Colors
export const statusColors = {
  success: {
    background: designTokens.colors.successLight,
    text: designTokens.colors.success,
  },
  warning: {
    background: designTokens.colors.warningLight,
    text: designTokens.colors.warning,
  },
  error: {
    background: designTokens.colors.errorLight,
    text: designTokens.colors.error,
  },
  info: {
    background: designTokens.colors.infoLight,
    text: designTokens.colors.info,
  },
};
