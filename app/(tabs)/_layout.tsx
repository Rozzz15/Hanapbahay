import { Tabs, Redirect } from 'expo-router';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Home, MessageCircle, User, Calendar } from 'lucide-react-native';
import { usePermissions } from '@context/PermissionContext';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@/components/ui/toast';
import { notifications } from '@/utils';
import { db } from '@/utils/db';
import { ConversationRecord, BookingRecord } from '@/types';
import { useFocusEffect } from '@react-navigation/native';
import { getUnviewedBookingNotificationsCount, markBookingNotificationsAsViewed } from '@/utils/booking';

export default function TabLayout() {
    const { permissions, setPermissions } = usePermissions();
    const { user, isLoading, isAuthenticated } = useAuth();
    const toast = useToast();
    const previousUserRef = useRef(user);
    const [unreadCount, setUnreadCount] = useState(0);
    const [bookingUpdatesCount, setBookingUpdatesCount] = useState(0);

    // Optimized unread message count loading
    const loadUnreadCount = useCallback(async () => {
        if (!user?.id) return;
        
        try {
            const conversations = await db.list<ConversationRecord>('conversations');
            const tenantConversations = conversations.filter(c => c.tenantId === user.id);
            const totalUnread = tenantConversations.reduce((sum, conv) => sum + (conv.unreadByTenant || 0), 0);
            setUnreadCount(totalUnread);
            console.log(`📱 Tab Layout: ${totalUnread} unread messages for tenant ${user.id}`);
        } catch (error) {
            console.error('❌ Error loading unread count:', error);
            setUnreadCount(0);
        }
    }, [user?.id]);

    // Load booking updates count for tenant
    const loadBookingUpdatesCount = useCallback(async () => {
        if (!user?.id) return;
        
        try {
            const count = await getUnviewedBookingNotificationsCount(user.id);
            setBookingUpdatesCount(count);
            console.log(`📅 Tab Layout: ${count} unviewed booking notifications for tenant ${user.id}`);
        } catch (error) {
            console.error('❌ Error loading booking updates count:', error);
            setBookingUpdatesCount(0);
        }
    }, [user?.id]);

    // Sync permissions when auth user changes
    useEffect(() => {
        if (user?.permissions) {
            setPermissions(user.permissions);
        }
    }, [user, setPermissions]);

    // Load unread count when user changes
    useEffect(() => {
        if (user?.id) {
            loadUnreadCount();
        }
    }, [user?.id]); // Remove loadUnreadCount dependency

    // Load booking updates count when user changes
    useEffect(() => {
        if (user?.id) {
            loadBookingUpdatesCount();
        }
    }, [user?.id]); // Remove loadBookingUpdatesCount dependency

    // Handle booking notifications when bookings tab is focused
    const handleBookingsTabFocus = useCallback(async () => {
        if (!user?.id) return;
        
        try {
            await markBookingNotificationsAsViewed(user.id);
            // Refresh the count after marking as viewed
            await loadBookingUpdatesCount();
        } catch (error) {
            console.error('❌ Error handling bookings tab focus:', error);
        }
    }, [user?.id]);

    // Refresh counts when tab layout comes into focus
    useFocusEffect(
        useCallback(() => {
            if (user?.id) {
                loadUnreadCount();
                loadBookingUpdatesCount();
            }
        }, [user?.id]) // Remove function dependencies
    );

    // Show notification when user changes
    useEffect(() => {
        const previousUser = previousUserRef.current;
        
        // Only show notification if user actually changed (not initial load)
        if (previousUser !== null && user !== previousUser) {
            if (user && !previousUser) {
                // User logged in
                toast.show(notifications.loginSuccess());
            } else if (!user && previousUser) {
                // User logged out
                toast.show(notifications.logoutSuccess());
            } else if (user && previousUser && user.id !== previousUser.id) {
                // User switched accounts
                toast.show(notifications.operationSuccess('Account switched'));
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
        <SafeAreaProvider>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <Tabs
                    screenOptions={{
                        tabBarActiveTintColor: '#10B981',
                        tabBarInactiveTintColor: '#9ca3af',
                        headerShown: false,
                        tabBarStyle: {
                            backgroundColor: '#ffffff',
                            borderTopWidth: 1,
                            borderTopColor: '#E5E7EB',
                            elevation: 0,
                            shadowOpacity: 0,
                            height: 56, // Reduced from 60
                            paddingBottom: 6, // Reduced from 8
                            paddingTop: 6, // Reduced from 8
                        },
                        tabBarShowLabel: false,
                    }}>
            <Tabs.Screen
                name="index"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <Home size={22} color={focused ? '#10B981' : '#9ca3af'} />
                    ),
                    tabBarActiveTintColor: '#10B981',
                }}
            />
            <Tabs.Screen
                name="chat"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <View style={{ position: 'relative' }}>
                            <MessageCircle size={22} color={focused ? '#10B981' : '#9ca3af'} />
                            {unreadCount > 0 && (
                                <View style={{
                                    position: 'absolute',
                                    top: -2,
                                    right: -2,
                                    backgroundColor: '#ef4444',
                                    borderRadius: 7, // Reduced from 8
                                    minWidth: 14, // Reduced from 16
                                    height: 14, // Reduced from 16
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    borderWidth: 1.5, // Reduced from 2
                                    borderColor: '#ffffff'
                                }}>
                                    <Text style={{
                                        color: 'white',
                                        fontSize: 9, // Reduced from 10
                                        fontWeight: 'bold'
                                    }}>
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </Text>
                                </View>
                            )}
                        </View>
                    ),
                    tabBarActiveTintColor: '#10B981',
                }}
            />
            <Tabs.Screen
                name="bookings"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <View style={{ position: 'relative' }}>
                            <Calendar size={22} color={focused ? '#10B981' : '#9ca3af'} />
                            {bookingUpdatesCount > 0 && (
                                <View style={{
                                    position: 'absolute',
                                    top: -2,
                                    right: -2,
                                    backgroundColor: '#ef4444',
                                    borderRadius: 7, // Reduced from 8
                                    minWidth: 14, // Reduced from 16
                                    height: 14, // Reduced from 16
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    borderWidth: 1.5, // Reduced from 2
                                    borderColor: '#ffffff'
                                }}>
                                    <Text style={{
                                        color: 'white',
                                        fontSize: 9, // Reduced from 10
                                        fontWeight: 'bold'
                                    }}>
                                        {bookingUpdatesCount > 99 ? '99+' : bookingUpdatesCount}
                                    </Text>
                                </View>
                            )}
                        </View>
                    ),
                    tabBarActiveTintColor: '#10B981',
                }}
                listeners={{
                    tabPress: handleBookingsTabFocus,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <User size={22} color={focused ? '#10B981' : '#9ca3af'} />
                    ),
                    tabBarActiveTintColor: '#10B981',
                }}
            />
                </Tabs>
            </SafeAreaView>
        </SafeAreaProvider>
    );
}
