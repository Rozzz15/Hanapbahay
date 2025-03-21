import { Tabs, Redirect } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, ActivityIndicator, View } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Home, Leaf, MessageCircle, Heart, User } from 'lucide-react-native';
import { usePermissions } from '@/context/PermissionContext';
import { useAuthUser } from '@/hooks/usePermissions';

export default function TabLayout() {
    const colorScheme = useColorScheme();
    const { permissions, setPermissions } = usePermissions();
    const { isAuthenticated, loading, authUser } = useAuthUser();

    // Sync permissions when auth user changes
    useEffect(() => {
        if (authUser?.permissions) {
            setPermissions(authUser.permissions);
        }
    }, [authUser, setPermissions]);

    // Show loading indicator while checking auth
    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="green" />
            </View>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Redirect href="/login" />;
    }

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
