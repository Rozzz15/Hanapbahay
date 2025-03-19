import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Home, Leaf, MessageCircle, Heart, User } from 'lucide-react-native';

export default function TabLayout() {
    const colorScheme = useColorScheme();

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
                tabBarInactiveTintColor: '#606060', // Adjust inactive color
                headerShown: false,
                tabBarButton: HapticTab,
                tabBarBackground: TabBarBackground,
                tabBarStyle: Platform.select({
                    ios: { position: 'absolute' },
                    default: {},
                }),
                tabBarShowLabel: false, // Hide text labels
            }}>
            <Tabs.Screen
                name="index"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <Home size={24} color={focused ? 'green' : color} />
                    ),
                    tabBarActiveTintColor: 'green',
                }}
            />
            <Tabs.Screen
                name="explore"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <Leaf size={24} color={focused ? 'green' : color} />
                    ),
                    tabBarActiveTintColor: 'green',
                }}
            />
            <Tabs.Screen
                name="chat"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <MessageCircle size={24} color={focused ? 'green' : color} />
                    ),
                    tabBarActiveTintColor: 'green',
                }}
            />
            <Tabs.Screen
                name="saved"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <Heart size={24} color={focused ? 'green' : color} />
                    ),
                    tabBarActiveTintColor: 'green',
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <User size={24} color={focused ? 'green' : color} />
                    ),
                    tabBarActiveTintColor: 'green',
                }}
            />
        </Tabs>
    );
}
