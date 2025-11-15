import { Tabs, Redirect } from 'expo-router';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Home, MessageCircle, User, Calendar, Building2 } from 'lucide-react-native';
import { usePermissions } from '@context/PermissionContext';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@/components/ui/toast';
import { notifications } from '@/utils';
import { db } from '@/utils/db';
import { ConversationRecord, BookingRecord } from '@/types';
import { useFocusEffect } from '@react-navigation/native';
import { getUnviewedBookingNotificationsCount, markBookingNotificationsAsViewed, getBookingsByTenant } from '@/utils/booking';

export default function TabLayout() {
    const { permissions, setPermissions } = usePermissions();
    const { user, isLoading, isAuthenticated } = useAuth();
    const toast = useToast();
    const previousUserRef = useRef(user);
    const [unreadCount, setUnreadCount] = useState(0);
    const [bookingUpdatesCount, setBookingUpdatesCount] = useState(0);
    const [hasActiveRental, setHasActiveRental] = useState(false);
    const [checkedActiveRental, setCheckedActiveRental] = useState(false); // Track if we've checked

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

    // Check if tenant has active rental (only approved AND paid bookings)
    const checkActiveRental = useCallback(async () => {
        // Reset to false if no user
        if (!user?.id) {
            setHasActiveRental(false);
            setCheckedActiveRental(true);
            return;
        }
        
        // Only check for tenants, not owners
        const isTenant = !user.roles?.includes('owner') && !user.roles?.includes('brgy_official');
        if (!isTenant) {
            setHasActiveRental(false);
            setCheckedActiveRental(true);
            return;
        }
        
        try {
            const bookings = await getBookingsByTenant(user.id);
            
            // Only show active rental dashboard for bookings that are:
            // 1. Status = 'approved' (not pending, rejected, cancelled, or completed)
            // 2. PaymentStatus = 'paid' (not pending, partial, or refunded)
            const active = bookings.find(
                b => b.status === 'approved' && b.paymentStatus === 'paid'
            );
            
            const hasActive = !!active;
            setHasActiveRental(hasActive);
            setCheckedActiveRental(true);
            
            if (hasActive) {
                console.log(`✅ Tab Layout: Tenant has active rental - showing dashboard icon`);
            } else {
                console.log(`❌ Tab Layout: No active rental found. Bookings: ${bookings.length}, Statuses: ${bookings.map(b => `${b.status}/${b.paymentStatus}`).join(', ')}`);
            }
        } catch (error) {
            console.error('❌ Error checking active rental:', error);
            setHasActiveRental(false);
            setCheckedActiveRental(true);
        }
    }, [user?.id, user?.roles]);

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
        // Reset checked state when user changes
        setCheckedActiveRental(false);
        
        if (user?.id) {
            loadBookingUpdatesCount();
            checkActiveRental();
        } else {
            // Reset when user logs out
            setHasActiveRental(false);
            setCheckedActiveRental(true);
        }
    }, [user?.id, checkActiveRental]); // Include checkActiveRental to ensure it runs
    
    // Check immediately on mount
    useEffect(() => {
        if (user?.id && !checkedActiveRental) {
            checkActiveRental();
        }
    }, [user?.id, checkedActiveRental, checkActiveRental]);

    // Check active rental when tab layout comes into focus
    useFocusEffect(
        useCallback(() => {
            if (user?.id) {
                checkActiveRental();
            }
        }, [user?.id, checkActiveRental])
    );

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
                checkActiveRental();
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
            {/* Only show active rental dashboard tab for tenants with approved AND paid bookings */}
            {/* Hide completely when not needed to prevent blank space */}
            <Tabs.Screen
                name="tenant-main-dashboard"
                options={{
                    href: checkedActiveRental && hasActiveRental && user?.id && !user?.roles?.includes('owner') && !user?.roles?.includes('brgy_official') 
                        ? '/(tabs)/tenant-main-dashboard' 
                        : null, // Hide tab completely when condition is false
                    tabBarIcon: ({ color, focused }) => (
                        <View style={{ width: 22, height: 22, justifyContent: 'center', alignItems: 'center' }}>
                            <Building2 size={22} color={focused ? '#10B981' : '#9ca3af'} />
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
                        <View style={{ width: 22, height: 22, justifyContent: 'center', alignItems: 'center' }}>
                            <User size={22} color={focused ? '#10B981' : '#9ca3af'} />
                        </View>
                    ),
                    tabBarActiveTintColor: '#10B981',
                }}
            />
                </Tabs>
            </SafeAreaView>
        </SafeAreaProvider>
    );
}

