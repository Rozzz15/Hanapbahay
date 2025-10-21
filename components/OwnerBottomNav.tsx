import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { 
  Home, 
  List, 
  Calendar, 
  MessageSquare, 
  CreditCard
} from 'lucide-react-native';
import { designTokens } from '../styles/owner-dashboard-styles';

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

  const isActive = (path: string) => {
    return pathname === path;
  };

  const handleNavigation = (path: string) => {
    router.push(path as any);
  };

  return (
    <View style={styles.bottomNav}>
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        
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
                size={20} 
                color={active ? 'white' : designTokens.colors.textSecondary} 
              />
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
    paddingVertical: designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.md,
    ...designTokens.shadows.md,
  },
  
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.xs,
  },
  
  navItemActive: {
    // Active state styling handled by icon and text
  },
  
  navIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: designTokens.spacing.xs,
  },
  
  navLabel: {
    fontSize: designTokens.typography.xs,
    color: designTokens.colors.textSecondary,
    fontWeight: '500' as const,
    textAlign: 'center',
  },
});
