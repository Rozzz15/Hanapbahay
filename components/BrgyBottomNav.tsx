import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { 
  LayoutDashboard, 
  Users, 
  Home, 
  FileText, 
  Settings 
} from 'lucide-react-native';

export default function BrgyBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  
  const navItems = [
    { 
      icon: LayoutDashboard, 
      label: 'Dashboard', 
      route: '/(brgy)/dashboard' 
    },
    { 
      icon: Users, 
      label: 'Residents', 
      route: '/(brgy)/residents' 
    },
    { 
      icon: Home, 
      label: 'Properties', 
      route: '/(brgy)/properties' 
    },
    { 
      icon: FileText, 
      label: 'Reports', 
      route: '/(brgy)/reports' 
    },
    { 
      icon: Settings, 
      label: 'Settings', 
      route: '/(brgy)/settings' 
    }
  ];

  const isActive = (route: string) => {
    return pathname?.includes(route.split('/').pop() || '');
  };

  return (
    <View style={styles.container}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.route);
        
        return (
          <TouchableOpacity
            key={item.label}
            style={styles.navItem}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.7}
          >
            <Icon 
              size={20} 
              color={active ? '#10B981' : '#9CA3AF'} 
            />
            <Text style={[
              styles.navLabel,
              { color: active ? '#10B981' : '#9CA3AF' }
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
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    flex: 1,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
  },
});
