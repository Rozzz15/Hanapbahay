import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  Home, 
  List, 
  Calendar, 
  MessageSquare, 
  CreditCard
} from 'lucide-react-native';
import { designTokens } from '../styles/owner-dashboard-styles';
import { useNotifications } from '../context/NotificationContext';

const navigationItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    path: '/(owner)/dashboard',
    color: '#3B82F6'
  },
  {
    id: 'listings',
    label: 'Listings',
    icon: List,
    path: '/(owner)/listings',
    color: '#10B981'
  },
  {
    id: 'bookings',
    label: 'Bookings',
    icon: Calendar,
    path: '/(owner)/bookings',
    color: '#F59E0B'
  },
  {
    id: 'messages',
    label: 'Messages',
    icon: MessageSquare,
    path: '/(owner)/messages',
    color: '#14B8A6'
  },
  {
    id: 'payment-settings',
    label: 'Payment',
    icon: CreditCard,
    path: '/(owner)/payment-settings',
    color: '#8B5CF6'
  }
];

export default function OwnerBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotifications();

  const isActive = (path: string) => {
    return pathname === path;
  };

  const handleNavigation = (path: string) => {
    router.push(path as any);
  };

  return (
    <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        const showBadge = item.id === 'messages' && unreadCount > 0;
        
        return (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.navItem,
              active && styles.navItemActive
            ]}
            onPress={() => handleNavigation(item.path)}
          >
            <View style={[
              styles.navIcon,
              { backgroundColor: active ? item.color : 'transparent' }
            ]}>
              <Icon 
                size={18} 
                color={active ? 'white' : designTokens.colors.textSecondary} 
              />
              {showBadge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {String(unreadCount > 99 ? '99+' : unreadCount)}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[
              styles.navLabel,
              active && { color: item.color, fontWeight: '600' as const }
            ]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: designTokens.colors.white,
    borderTopWidth: 1,
    borderTopColor: designTokens.colors.border,
    paddingVertical: 8, // Reduced from designTokens.spacing.sm (8)
    paddingHorizontal: 12, // Reduced from designTokens.spacing.md (12)
    ...designTokens.shadows.md,
  },
  
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6, // Reduced from designTokens.spacing.sm (8)
    paddingHorizontal: 4, // Reduced from designTokens.spacing.xs (4)
  },
  
  navItemActive: {
    // Active state styling handled by icon and text
  },
  
  navIcon: {
    width: 28, // Reduced from 32
    height: 28, // Reduced from 32
    borderRadius: 14, // Reduced from 16
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4, // Reduced from designTokens.spacing.xs (4)
  },
  
  navLabel: {
    fontSize: 10, // Reduced from designTokens.typography.xs (12)
    color: designTokens.colors.textSecondary,
    fontWeight: '500' as const,
    textAlign: 'center',
    lineHeight: 12, // Add line height for better text rendering
  },
  
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444', // Red color for notification badge
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
});
