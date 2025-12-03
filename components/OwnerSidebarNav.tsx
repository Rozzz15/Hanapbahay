import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { 
  Plus, 
  List, 
  Calendar, 
  Users, 
  MessageSquare,
  CreditCard,
  Star,
  Sparkles
} from 'lucide-react-native';
import { designTokens, iconBackgrounds } from '../styles/owner-dashboard-styles';
import { useNotifications } from '../context/NotificationContext';

interface SidebarNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  path: string;
  color: string;
  description?: string;
}

const sidebarNavItems: SidebarNavItem[] = [
  {
    id: 'create-listing',
    label: 'Create Listing',
    icon: Plus,
    path: '/(owner)/create-listing',
    color: '#10B981',
    description: 'Add a new property'
  },
  {
    id: 'listings',
    label: 'Manage Listings',
    icon: List,
    path: '/(owner)/listings',
    color: '#3B82F6',
    description: 'View and edit properties'
  },
  {
    id: 'bookings',
    label: 'Bookings',
    icon: Calendar,
    path: '/(owner)/bookings',
    color: '#F59E0B',
    description: 'Manage reservations'
  },
  {
    id: 'tenants',
    label: 'My Tenants',
    icon: Users,
    path: '/(owner)/tenants',
    color: '#14B8A6',
    description: 'View tenant information'
  },
  {
    id: 'messages',
    label: 'Messages',
    icon: MessageSquare,
    path: '/(owner)/messages',
    color: '#10B981',
    description: 'Chat with tenants'
  },
  {
    id: 'payment-settings',
    label: 'Payment Settings',
    icon: CreditCard,
    path: '/(owner)/payment-settings',
    color: '#8B5CF6',
    description: 'Manage payment methods'
  },
  {
    id: 'ratings',
    label: 'Property Ratings',
    icon: Star,
    path: '/(owner)/ratings',
    color: '#F59E0B',
    description: 'View and reply to ratings'
  }
];

interface OwnerSidebarNavProps {
  style?: any;
}

export default function OwnerSidebarNav({ style }: OwnerSidebarNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { unreadCount, pendingBookingsCount, pendingPaymentsCount } = useNotifications();
  const sidebarWidth = getSidebarWidth();

  const isActive = (path: string) => {
    return pathname === path || pathname?.includes(path.split('/').pop() || '');
  };

  const handleNavigation = (path: string) => {
    router.push(path as any);
  };

  const getBadgeCount = (itemId: string) => {
    if (itemId === 'messages') return unreadCount;
    if (itemId === 'bookings') return pendingBookingsCount;
    if (itemId === 'tenants') return pendingPaymentsCount;
    return 0;
  };

  return (
    <View style={[styles.sidebar, { width: sidebarWidth }, style]}>
      {/* Sidebar Header */}
      <View style={styles.sidebarHeader}>
        <View style={[styles.headerIcon, iconBackgrounds.orange]}>
          <Sparkles size={20} color="#F59E0B" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Operations & Management</Text>
          <Text style={styles.headerSubtitle}>Quick actions and daily operations</Text>
        </View>
      </View>

      {/* Navigation Items */}
      <ScrollView 
        style={styles.navScrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.navItemsContainer}>
          {sidebarNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            const badgeCount = getBadgeCount(item.id);
            const showBadge = badgeCount > 0;

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.navItem,
                  active && styles.navItemActive
                ]}
                onPress={() => handleNavigation(item.path)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.navItemContent,
                  active && { backgroundColor: item.color + '15' }
                ]}>
                  <View style={[
                    styles.navIcon,
                    active 
                      ? { backgroundColor: item.color }
                      : (item.color === '#10B981' ? iconBackgrounds.green :
                         item.color === '#3B82F6' ? iconBackgrounds.blue :
                         item.color === '#F59E0B' ? iconBackgrounds.orange :
                         item.color === '#14B8A6' ? iconBackgrounds.teal :
                         item.color === '#8B5CF6' ? iconBackgrounds.purple :
                         iconBackgrounds.orange)
                  ]}>
                    <Icon 
                      size={20} 
                      color={active ? '#FFFFFF' : item.color} 
                    />
                    {showBadge && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {String(badgeCount > 99 ? '99+' : badgeCount)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.navItemText}>
                    <Text style={[
                      styles.navLabel,
                      active && { color: item.color, fontWeight: '600' as const }
                    ]}>
                      {item.label}
                    </Text>
                    {item.description && (
                      <Text style={styles.navDescription}>
                        {item.description}
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const getSidebarWidth = () => {
  const { width: screenWidth } = Dimensions.get('window');
  return screenWidth < 768 ? Math.min(260, screenWidth * 0.85) : 280;
};

const styles = StyleSheet.create({
  sidebar: {
    backgroundColor: designTokens.colors.white,
    borderRightWidth: 1,
    borderRightColor: designTokens.colors.borderLight,
    ...designTokens.shadows.md,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: designTokens.spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: designTokens.colors.borderLight,
    backgroundColor: designTokens.colors.background,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: designTokens.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: designTokens.spacing.md,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: designTokens.typography.base,
    fontWeight: '700' as const,
    color: designTokens.colors.textPrimary,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: designTokens.typography.xs,
    color: designTokens.colors.textSecondary,
  },
  navScrollView: {
    flex: 1,
  },
  navItemsContainer: {
    padding: designTokens.spacing.md,
    gap: designTokens.spacing.xs,
  },
  navItem: {
    marginBottom: designTokens.spacing.xs,
  },
  navItemActive: {
    // Active state handled by content background
  },
  navItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  navIcon: {
    width: 40,
    height: 40,
    borderRadius: designTokens.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: designTokens.spacing.md,
    position: 'relative',
  },
  navItemText: {
    flex: 1,
  },
  navLabel: {
    fontSize: designTokens.typography.base,
    fontWeight: '500' as const,
    color: designTokens.colors.textPrimary,
    marginBottom: 2,
  },
  navDescription: {
    fontSize: designTokens.typography.xs,
    color: designTokens.colors.textSecondary,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: designTokens.colors.white,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700' as const,
    textAlign: 'center',
  },
});

