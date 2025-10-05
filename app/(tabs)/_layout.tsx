import { Tabs, Redirect } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Platform, ActivityIndicator, View, Text } from 'react-native';
import { Colors } from '@constants/Colors';
import { useColorScheme } from 'react-native';
import { Home, MessageCircle, User } from 'lucide-react-native';
import { usePermissions } from '@context/PermissionContext';
import { useAuth } from '@context/AuthContext';
import { useToast, Toast, ToastTitle, ToastDescription } from '@/components/ui/toast';

export default function TabLayout() {
    const colorScheme = useColorScheme();
    const { permissions, setPermissions } = usePermissions();
    const { user, isLoading, isAuthenticated } = useAuth();
    const toast = useToast();
    const previousUserRef = useRef(user);

    // Sync permissions when auth user changes
    useEffect(() => {
        if (user?.permissions) {
            setPermissions(user.permissions);
        }
    }, [user, setPermissions]);

    // Show notification when user changes
    useEffect(() => {
        const previousUser = previousUserRef.current;
        
        // Only show notification if user actually changed (not initial load)
        if (previousUser !== null && user !== previousUser) {
            if (user && !previousUser) {
                // User logged in
                toast.show({
                    id: 'user-login',
                    render: ({ id }) => (
                        <Toast nativeID={id} action="success">
                            <ToastTitle>Welcome back!</ToastTitle>
                            <ToastDescription>You've successfully logged in</ToastDescription>
                        </Toast>
                    )
                });
            } else if (!user && previousUser) {
                // User logged out
                toast.show({
                    id: 'user-logout',
                    render: ({ id }) => (
                        <Toast nativeID={id} action="info">
                            <ToastTitle>Logged out</ToastTitle>
                            <ToastDescription>You've been logged out</ToastDescription>
                        </Toast>
                    )
                });
            } else if (user && previousUser && user.id !== previousUser.id) {
                // User switched accounts
                toast.show({
                    id: 'user-switch',
                    render: ({ id }) => (
                        <Toast nativeID={id} action="info">
                            <ToastTitle>Account switched</ToastTitle>
                            <ToastDescription>You've switched to a different account</ToastDescription>
                        </Toast>
                    )
                });
            }
        }
        
        // Update the ref with current user
        previousUserRef.current = user;
    }, [user, toast]);

    // Show loading indicator while checking auth
    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="green" />
                <Text style={{ marginTop: 10, color: '#666' }}>Loading your profile...</Text>
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
                tabBarActiveTintColor: '#16a34a',
                tabBarInactiveTintColor: '#9ca3af',
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#ffffff',
                    borderTopWidth: 0,
                    elevation: 0,
                    shadowOpacity: 0,
                },
                tabBarShowLabel: false,
            }}>
            <Tabs.Screen
                name="index"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <Home size={24} color={focused ? '#16a34a' : '#9ca3af'} />
                    ),
                    tabBarActiveTintColor: '#16a34a',
                }}
            />
            <Tabs.Screen
                name="chat"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <MessageCircle size={24} color={focused ? '#16a34a' : '#9ca3af'} />
                    ),
                    tabBarActiveTintColor: '#16a34a',
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <User size={24} color={focused ? '#16a34a' : '#9ca3af'} />
                    ),
                    tabBarActiveTintColor: '#16a34a',
                }}
            />
        </Tabs>
    );
}
