import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  LayoutDashboard, 
  Home, 
  FileText, 
  Settings 
} from 'lucide-react-native';
import { designTokens } from '../styles/owner-dashboard-styles';

const navigationItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/(brgy)/dashboard',
    color: '#3B82F6'
  },
  {
    id: 'properties',
    label: 'Properties',
    icon: Home,
    path: '/(brgy)/properties',
    color: '#F59E0B'
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: FileText,
    path: '/(brgy)/reports',
    color: '#8B5CF6'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    path: '/(brgy)/settings',
    color: '#14B8A6'
  }
];

export default function BrgyBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

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
        
        return (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.navItem,
              active && {
                backgroundColor: '#10B981' + '20',
                borderRadius: 10,
                paddingVertical: 8,
                paddingHorizontal: 6,
                borderWidth: 1,
                borderColor: '#10B981' + '40',
              }
            ]}
            onPress={() => handleNavigation(item.path)}
          >
            <View style={[
              styles.navIcon,
              { 
                backgroundColor: active ? '#10B981' : 'transparent',
                transform: active ? [{ scale: 1.1 }] : [{ scale: 1 }]
              }
            ]}>
              <Icon 
                size={18} 
                color={active ? 'white' : designTokens.colors.textSecondary} 
              />
            </View>
            <Text style={[
              styles.navLabel,
              active && { 
                color: '#10B981', 
                fontWeight: '700' as const,
                fontSize: 11,
              }
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    ...designTokens.shadows.md,
  },
  
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  
  navItemActive: {
    // Active state styling handled by icon and text
  },
  
  navIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  
  navLabel: {
    fontSize: 10,
    color: designTokens.colors.textSecondary,
    fontWeight: '500' as const,
    textAlign: 'center',
    lineHeight: 12,
  },
});
