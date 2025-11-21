import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, 
    Text, 
    ScrollView, 
    TouchableOpacity, 
    StyleSheet, 
    TextInput, 
    Image, 
    ActivityIndicator,
    RefreshControl,
    Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { db } from '@/utils/db';
import { showAlert } from '@/utils/alert';
import TenantInfoModal from '@/components/TenantInfoModal';

interface Conversation {
    id: string;
    ownerId: string;
    tenantId: string;
    lastMessage?: string;
    lastMessageAt?: string;
    unreadCount: number;
    tenantName: string;
    tenantAvatar?: string;
    tenantEmail?: string;
    tenantPhone?: string;
    propertyTitle?: string;
    bookingStatus?: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
}

/**
 * Validates if an image URI is valid and properly formatted
 * Filters out malformed URIs like data:image/jpeg;base64,file:///...
 */
function isValidImageUri(uri: string | null | undefined): boolean {
    if (!uri || typeof uri !== 'string' || uri.trim() === '') {
        return false;
    }
    
    const trimmedUri = uri.trim();
    
    // Reject malformed URIs that have both data: and file:// prefixes
    if (trimmedUri.includes('data:') && trimmedUri.includes('file://')) {
        return false;
    }
    
    // Valid data URI format: data:image/type;base64,base64data
    if (trimmedUri.startsWith('data:image/')) {
        const base64Part = trimmedUri.split(',')[1];
        if (!base64Part || base64Part.length < 10) {
            return false;
        }
        // Ensure it doesn't contain file://
        if (base64Part.includes('file://')) {
            return false;
        }
        return true;
    }
    
    // Valid file URI format: file:///...
    if (trimmedUri.startsWith('file://')) {
        return true;
    }
    
    // Valid HTTP/HTTPS URI
    if (trimmedUri.startsWith('http://') || trimmedUri.startsWith('https://')) {
        return true;
    }
    
    // Reject anything else
    return false;
}

export default function OwnerMessages() {
    const router = useRouter();
    const { user } = useAuth();
    const { unreadCount } = useNotifications();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
    const [selectedTenant, setSelectedTenant] = useState<{
        id: string;
        name: string;
        email?: string;
        phone?: string;
        avatar?: string;
    } | null>(null);
    const [tenantInfoModalVisible, setTenantInfoModalVisible] = useState(false);
    const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [notificationsLoading, setNotificationsLoading] = useState(false);
    const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());

    const loadConversations = useCallback(async () => {
        if (!user?.id) return;

        try {
            setLoading(true);
            setImageErrors(new Set()); // Clear image errors when reloading
            console.log('🔄 Loading conversations for owner:', user.id);

            // Get all conversations where user is the owner (including barangay conversations)
            const allConversations = await db.list('conversations') || [];
            const ownerConversations = (Array.isArray(allConversations) ? allConversations : []).filter((conv: any) => {
                const isOwner = conv.ownerId === user.id;
                const isParticipant = conv.participantIds && Array.isArray(conv.participantIds) && conv.participantIds.includes(user.id);
                const isBrgyConversation = (conv as any).isBrgyConversation === true && isOwner;
                return isOwner || isParticipant || isBrgyConversation;
            });

            console.log(`📊 Found ${ownerConversations.length} conversations for owner`);

            // Get all messages to check which conversations have actual messages
            // Include notifications for barangay conversations (they should appear)
            const allMessages = await db.list('messages');
            
            // Create a map of barangay conversations for quick lookup
            const brgyConversationIds = new Set(
                ownerConversations
                    .filter((conv: any) => (conv as any).isBrgyConversation === true)
                    .map((conv: any) => conv.id)
            );
            
            const conversationsWithMessages = new Set(
                allMessages
                    .filter((msg: any) => {
                        if (!msg.conversationId || !msg.text || msg.text.trim() === '') {
                            return false;
                        }
                        // Check if this is a barangay conversation
                        const isBrgyConv = brgyConversationIds.has(msg.conversationId);
                        // Include notifications for barangay conversations, exclude for regular conversations
                        return isBrgyConv || msg.type !== 'notification';
                    })
                    .map((msg: any) => msg.conversationId)
            );

            console.log(`📨 Found ${conversationsWithMessages.size} conversations with actual messages`);

            const conversationsWithDetails: Conversation[] = await Promise.all(
                ownerConversations.map(async (conv: any) => {
                    const isBrgyConversation = (conv as any).isBrgyConversation === true;
                    const tenantId = conv.tenantId || conv.participantIds?.find((id: string) => id !== user.id);
                    
                    console.log('🔍 Processing conversation:', {
                        conversationId: conv.id,
                        tenantId: tenantId,
                        hasTenantId: !!tenantId,
                        hasMessages: conversationsWithMessages.has(conv.id),
                        isBrgyConversation
                    });
                    
                    // Get tenant/barangay official details
                    let tenantName = isBrgyConversation ? 'Barangay Official' : 'Unknown Tenant';
                    let tenantAvatar = '';
                    let tenantEmail = '';
                    let tenantPhone = '';
                    let propertyTitle = '';
                    let bookingStatus: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed' | undefined;

                    try {
                        if (!tenantId) {
                            console.warn('⚠️ No tenantId found for conversation:', conv.id);
                        } else {
                            const tenantRecord = await db.get('users', tenantId);
                            if (tenantRecord) {
                                // For barangay conversations, use the barangay official's name
                                if (isBrgyConversation) {
                                    const barangay = (conv as any).barangay || '';
                                    tenantName = (tenantRecord as any).name || `Barangay ${barangay} Official`;
                                    // Add barangay indicator to the name
                                    if (barangay) {
                                        tenantName = `${tenantName} - ${barangay}`;
                                    }
                                } else {
                                    tenantName = (tenantRecord as any).name || tenantName;
                                }
                                tenantEmail = (tenantRecord as any).email || '';
                                tenantPhone = (tenantRecord as any).phone || '';
                                console.log('✅ Found user record:', tenantName, tenantEmail, tenantPhone, isBrgyConversation ? '(Barangay)' : '(Tenant)');
                                
                                // Load profile photo from user_profile_photos table
                                try {
                                    const { loadUserProfilePhoto } = await import('@/utils/user-profile-photos');
                                    console.log('🔄 Attempting to load profile photo for tenant:', tenantId);
                                    const photoUri = await loadUserProfilePhoto(tenantId);
                                    
                                    if (photoUri && photoUri.trim() !== '' && photoUri.length > 10) {
                                        tenantAvatar = photoUri.trim();
                                        console.log('✅ Loaded tenant profile photo for:', tenantId, tenantName);
                                        console.log('📸 Photo URI type:', typeof photoUri);
                                        console.log('📸 Photo URI length:', photoUri.length);
                                        console.log('📸 Photo URI starts with:', photoUri.substring(0, 50));
                                        console.log('📸 Photo URI is valid:', isValidImageUri(photoUri));
                                        
                                        // Verify the photo can be used
                                        if (!isValidImageUri(photoUri)) {
                                            console.warn('⚠️ Loaded photo URI is invalid, will try fallback');
                                            tenantAvatar = ''; // Clear invalid URI to trigger fallback
                                        }
                                    } else {
                                        console.log('⚠️ No valid profile photo returned for tenant:', tenantId, tenantName);
                                        console.log('📸 Photo URI result:', {
                                            hasUri: !!photoUri,
                                            uriLength: photoUri?.length || 0,
                                            uriPreview: photoUri?.substring(0, 50) || 'none'
                                        });
                                    }
                                } catch (photoError) {
                                    console.error('❌ Error loading tenant profile photo:', photoError);
                                    console.error('❌ Error details:', {
                                        message: photoError instanceof Error ? photoError.message : 'Unknown error',
                                        stack: photoError instanceof Error ? photoError.stack : undefined
                                    });
                                }
                            } else {
                                console.warn('⚠️ Tenant record not found for ID:', tenantId);
                            }
                        }
                        
                        // If still no avatar loaded, try to get from user_profile_photos again with better error handling
                        if (!tenantAvatar || !isValidImageUri(tenantAvatar)) {
                            try {
                                // Query database directly to get user profile photos
                                const allUserPhotos = await db.list('user_profile_photos');
                                console.log('🔍 Fallback: All user photos count:', allUserPhotos.length);
                                
                                const tenantPhoto = allUserPhotos.find((photo: any) => {
                                    if (!photo || typeof photo !== 'object') return false;
                                    const photoUserId = photo.userId || photo.userid || '';
                                    const hasPhotoData = photo.photoData && photo.photoData.trim() !== '';
                                    const hasPhotoUri = photo.photoUri && photo.photoUri.trim() !== '';
                                    return photoUserId === tenantId && (hasPhotoData || hasPhotoUri);
                                });
                                
                                if (tenantPhoto) {
                                    console.log('✅ Found tenant photo record in database');
                                    let photoData = tenantPhoto.photoData || tenantPhoto.photoUri || '';
                                    
                                    if (photoData && photoData.trim() !== '') {
                                        const trimmedData = photoData.trim();
                                        
                                        // Check if it's already a valid URI format
                                        if (trimmedData.startsWith('data:')) {
                                            // Already a data URI, use it directly
                                            tenantAvatar = trimmedData;
                                            console.log('✅ Using existing data URI format');
                                        } else if (trimmedData.startsWith('file://')) {
                                            // It's a file URI, use it directly (don't construct data URI)
                                            tenantAvatar = trimmedData;
                                            console.log('✅ Using file URI format');
                                        } else if (trimmedData.startsWith('http://') || trimmedData.startsWith('https://')) {
                                            // It's an HTTP/HTTPS URI, use it directly
                                            tenantAvatar = trimmedData;
                                            console.log('✅ Using HTTP/HTTPS URI format');
                                        } else {
                                            // Assume it's base64 data and construct data URI
                                            // But first check it doesn't contain file:// (malformed)
                                            if (trimmedData.includes('file://')) {
                                                console.warn('⚠️ Photo data contains file:// but is not a valid file URI, skipping');
                                                tenantAvatar = '';
                                            } else {
                                                const mimeType = tenantPhoto.mimeType || 'image/jpeg';
                                                tenantAvatar = `data:${mimeType};base64,${trimmedData}`;
                                                console.log('✅ Constructed data URI from base64 data');
                                            }
                                        }
                                        
                                        // Validate the constructed URI
                                        if (tenantAvatar && isValidImageUri(tenantAvatar)) {
                                            console.log('✅ Tenant photo is valid and ready to display');
                                        } else {
                                            console.warn('⚠️ Constructed tenant photo URI is invalid:', tenantAvatar ? tenantAvatar.substring(0, 100) : 'empty');
                                            tenantAvatar = ''; // Clear invalid URI
                                        }
                                    } else {
                                        console.warn('⚠️ Tenant photo record found but no photo data');
                                    }
                                } else {
                                    console.log('⚠️ No tenant photo record found in database for:', tenantId);
                                }
                            } catch (error) {
                                console.error('❌ Error in fallback photo query:', error);
                            }
                        }

                        // Get property title if available (skip for barangay conversations)
                        if (!isBrgyConversation && conv.propertyId) {
                            const property = await db.get('published_listings', conv.propertyId);
                            if (property) {
                                propertyTitle = (property as any).propertyType || '';
                            }
                        }

                        // Get booking status (skip for barangay conversations)
                        if (!isBrgyConversation && tenantId) {
                            try {
                                const allBookings = await db.list('bookings');
                                const booking = allBookings.find((booking: any) => 
                                    booking.ownerId === user.id && 
                                    booking.tenantId === tenantId
                                );
                                
                                if (booking) {
                                    bookingStatus = booking.status;
                                    console.log('📋 Found booking for tenant:', {
                                        tenantId,
                                        tenantName,
                                        bookingStatus
                                    });
                                } else {
                                    console.log('⚠️ No booking found for tenant:', tenantId, tenantName);
                                }
                            } catch (bookingError) {
                                console.log('⚠️ Error loading booking status:', bookingError);
                            }
                        }
                    } catch (error) {
                        console.log('Error loading tenant details:', error);
                    }

                    // Get the last message for preview
                    // For barangay conversations, include notifications; for regular conversations, exclude them
                    let lastMessage = conv.lastMessageText || 'Start conversation';
                    let lastMessageAt = conv.lastMessageAt;
                    
                    if (conv.id) {
                        try {
                            const conversationMessages = allMessages
                                .filter((msg: any) => {
                                    if (msg.conversationId !== conv.id || !msg.text || msg.text.trim() === '') {
                                        return false;
                                    }
                                    // For barangay conversations, include notifications; for regular, exclude them
                                    return isBrgyConversation || msg.type !== 'notification';
                                })
                                .sort((a: any, b: any) => 
                                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                                );
                            
                            if (conversationMessages.length > 0) {
                                const lastMsg = conversationMessages[0];
                                lastMessage = lastMsg.text || 'Start conversation';
                                lastMessageAt = lastMsg.createdAt || conv.lastMessageAt;
                            }
                        } catch (error) {
                            console.log('Error getting last message:', error);
                        }
                    }
                    
                    // Skip property title and booking status for barangay conversations
                    if (isBrgyConversation) {
                        propertyTitle = '';
                        bookingStatus = undefined;
                    }

                    return {
                        id: conv.id,
                        ownerId: user.id,
                        tenantId: tenantId || '',
                        lastMessage,
                        lastMessageAt,
                        unreadCount: conv.unreadByOwner || 0,
                        tenantName,
                        tenantAvatar,
                        tenantEmail,
                        tenantPhone,
                        propertyTitle,
                        bookingStatus,
                        hasMessages: conversationsWithMessages.has(conv.id)
                    };
                })
            );

            // Filter out conversations with no messages
            const conversationsWithActualMessages = conversationsWithDetails.filter(conv => 
                (conv as any).hasMessages
            );

            // Sort by last message time
            conversationsWithActualMessages.sort((a, b) => {
                const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
                const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
                return timeB - timeA;
            });

            setConversations(conversationsWithActualMessages);
            console.log(`✅ Loaded ${conversationsWithActualMessages.length} conversations with messages`);
            
            // Debug: Log avatar info
            conversationsWithActualMessages.forEach(conv => {
                console.log(`👤 Tenant ${conv.tenantName} avatar:`, {
                    hasAvatar: !!conv.tenantAvatar,
                    avatarLength: conv.tenantAvatar?.length || 0,
                    avatarPreview: conv.tenantAvatar?.substring(0, 50) || 'none',
                    isValid: isValidImageUri(conv.tenantAvatar),
                    tenantId: conv.tenantId
                });
            });
            
        } catch (error) {
            console.error('❌ Error loading conversations:', error);
            showAlert('Error', 'Failed to load conversations');
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        if (user?.id) {
            loadConversations();
            loadNotifications(); // Load notifications on mount
        }
    }, [user?.id, loadConversations, loadNotifications]);

    // Update badge count when notifications or read status changes
    const unreadNotificationCount = notifications.filter(notif => !readNotificationIds.has(notif.id)).length;

    useFocusEffect(
        useCallback(() => {
            if (user?.id) {
                loadConversations();
            }
        }, [user?.id, loadConversations])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        setImageErrors(new Set()); // Clear image errors on refresh
        await loadConversations();
        setRefreshing(false);
    }, [loadConversations]);

    const handleSearch = (query: string) => {
        setSearchQuery(query);
    };

    const filteredConversations = conversations.filter(conv =>
        conv.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (conv.propertyTitle && conv.propertyTitle.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleChatPress = async (conversation: Conversation) => {
        // Mark as read
        try {
            // Get the existing conversation from the database
            const existingConv = await db.get('conversations', conversation.id);
            if (existingConv) {
                await db.upsert('conversations', conversation.id, {
                    ...existingConv,
                    unreadByOwner: 0,
                    lastReadByOwner: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }

            // Update local state
            setConversations(prev => prev.map(c => 
                c.id === conversation.id ? { ...c, unreadCount: 0 } : c
            ));
        } catch (error) {
            console.error('Error marking conversation as read:', error);
        }

        // Navigate to chat room
        router.push({
            pathname: `/(owner)/chat-room/${conversation.id}` as any,
            params: {
                conversationId: conversation.id,
                tenantName: conversation.tenantName,
                tenantAvatar: conversation.tenantAvatar || '',
                propertyTitle: conversation.propertyTitle || '',
                ownerName: user?.name || ''
            }
        } as any);
    };

    const handleAvatarPress = (conversation: Conversation) => {
        // Open tenant info modal
        setSelectedTenant({
            id: conversation.tenantId,
            name: conversation.tenantName,
            email: conversation.tenantEmail,
            phone: conversation.tenantPhone,
            avatar: conversation.tenantAvatar
        });
        setTenantInfoModalVisible(true);
    };

    const handleDeleteConversation = (conversation: Conversation) => {
        showAlert(
            'Delete Conversation',
            `Are you sure you want to delete this conversation with ${conversation.tenantName}? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Delete conversation
                            await db.remove('conversations', conversation.id);
                            
                            // Delete all messages in this conversation
                            const allMessages = await db.list('messages');
                            const conversationMessages = allMessages.filter((msg: any) => 
                                msg.conversationId === conversation.id
                            );
                            
                            for (const message of conversationMessages) {
                                if ((message as any).id) {
                                    await db.remove('messages', (message as any).id);
                                }
                            }

                            // Update local state
                            setConversations(prev => prev.filter(c => c.id !== conversation.id));
                            
                            showAlert('Done', 'Conversation has been deleted');
                        } catch (error) {
                            console.error('Error deleting conversation:', error);
                            showAlert('Error', 'Failed to delete conversation');
                        }
                    }
                }
            ]
        );
    };

    const formatTime = (timeString?: string) => {
        if (!timeString) return 'Now';
        
        try {
            const date = new Date(timeString);
            const now = new Date();
            const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
            
            if (diffInHours < 24) {
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else if (diffInHours < 168) { // 7 days
                return date.toLocaleDateString([], { weekday: 'short' });
            } else {
                return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
            }
        } catch {
            return 'Now';
        }
    };

    const loadNotifications = useCallback(async () => {
        if (!user?.id) return;

        try {
            setNotificationsLoading(true);
            console.log('🔄 Loading notifications for owner:', user.id);

            // Load read notification IDs from storage
            try {
                const readIdsJson = await AsyncStorage.getItem(`read_notifications_${user.id}`);
                if (readIdsJson) {
                    const readIds = JSON.parse(readIdsJson);
                    setReadNotificationIds(new Set(readIds));
                }
            } catch (error) {
                console.log('Error loading read notifications:', error);
            }

            // Get all conversations where user is the owner (including barangay conversations)
            const allConversations = await db.list('conversations') || [];
            const ownerConversations = (Array.isArray(allConversations) ? allConversations : []).filter((conv: any) => {
                const isOwner = conv.ownerId === user.id;
                const isParticipant = conv.participantIds && Array.isArray(conv.participantIds) && conv.participantIds.includes(user.id);
                const isBrgyConversation = (conv as any).isBrgyConversation === true && isOwner;
                return isOwner || isParticipant || isBrgyConversation;
            });

            // Get all notification messages
            const allMessages = await db.list('messages') || [];
            const notificationMessages = allMessages.filter((msg: any) => {
                const msgConversationId = msg.conversationId || msg.conversation_id;
                const isOwnerConversation = ownerConversations.some((conv: any) => conv.id === msgConversationId);
                const isNotification = msg.type === 'notification' || 
                    msg.text?.includes('Payment Confirmed') ||
                    msg.text?.includes('Payment Rejected') ||
                    msg.text?.includes('Payment Restored') ||
                    msg.text?.includes('Payment Deleted') ||
                    msg.text?.includes('booking has been approved') ||
                    msg.text?.includes('booking has been declined') ||
                    msg.text?.includes('New Rating Received') ||
                    msg.text?.includes('⭐ New Rating');
                return isOwnerConversation && isNotification;
            });

            // Sort by creation time (newest first)
            notificationMessages.sort((a: any, b: any) => {
                const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
                const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
                return timeB - timeA;
            });

            // Get conversation and tenant details for each notification
            const notificationsWithDetails = await Promise.all(
                notificationMessages.map(async (msg: any) => {
                    const conversationId = msg.conversationId || msg.conversation_id;
                    const conversation = ownerConversations.find((conv: any) => conv.id === conversationId);
                    const tenantId = conversation?.tenantId || conversation?.participantIds?.find((id: string) => id !== user.id);
                    
                    let tenantName = 'Unknown Tenant';
                    if (tenantId) {
                        try {
                            const tenantRecord = await db.get('users', tenantId);
                            if (tenantRecord) {
                                tenantName = (tenantRecord as any).name || tenantName;
                            }
                        } catch (error) {
                            console.log('Error loading tenant for notification:', error);
                        }
                    }

                    return {
                        id: msg.id,
                        text: msg.text || '',
                        createdAt: msg.createdAt || msg.created_at || new Date().toISOString(),
                        conversationId,
                        tenantName,
                        tenantId
                    };
                })
            );

            setNotifications(notificationsWithDetails);
            console.log(`✅ Loaded ${notificationsWithDetails.length} notifications`);
        } catch (error) {
            console.error('❌ Error loading notifications:', error);
            showAlert('Error', 'Failed to load notifications');
        } finally {
            setNotificationsLoading(false);
        }
    }, [user?.id]);

    const markNotificationAsRead = useCallback(async (notificationId: string) => {
        if (!user?.id) return;
        
        try {
            const newReadIds = new Set(readNotificationIds);
            newReadIds.add(notificationId);
            setReadNotificationIds(newReadIds);
            
            // Save to storage
            await AsyncStorage.setItem(
                `read_notifications_${user.id}`,
                JSON.stringify(Array.from(newReadIds))
            );
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }, [user?.id, readNotificationIds]);

    const markAllNotificationsAsRead = useCallback(async () => {
        if (!user?.id || notifications.length === 0) return;
        
        try {
            const allIds = new Set(readNotificationIds);
            notifications.forEach(notif => allIds.add(notif.id));
            setReadNotificationIds(allIds);
            
            // Save to storage
            await AsyncStorage.setItem(
                `read_notifications_${user.id}`,
                JSON.stringify(Array.from(allIds))
            );
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    }, [user?.id, notifications, readNotificationIds]);

    const handleNotificationIconPress = async () => {
        setNotificationsModalVisible(true);
        await loadNotifications(); // Refresh notifications when opening modal
        // Mark all as read when opening modal
        setTimeout(() => {
            markAllNotificationsAsRead();
        }, 500);
    };

    const handleNotificationPress = async (notification: any) => {
        // Mark notification as read
        await markNotificationAsRead(notification.id);
        
        // Check if it's a rating notification
        const isRatingNotification = notification.text?.includes('New Rating Received') || 
                                     notification.text?.includes('⭐ New Rating');
        
        if (isRatingNotification) {
            // Navigate to ratings page for rating notifications
            setNotificationsModalVisible(false);
            router.push('/(owner)/ratings');
        } else if (notification.conversationId) {
            // Navigate to the conversation for other notifications
            setNotificationsModalVisible(false);
            router.push({
                pathname: '/chat-room',
                params: {
                    conversationId: notification.conversationId,
                    tenantName: notification.tenantName
                }
            });
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#10B981" />
                    <Text style={styles.loadingText}>Loading conversations...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Messages</Text>
                    <TouchableOpacity 
                        onPress={handleNotificationIconPress}
                        style={styles.notificationIconButton}
                    >
                        <Ionicons name="notifications" size={24} color="#10B981" style={styles.headerIcon} />
                        {unreadNotificationCount > 0 && (
                            <View style={styles.notificationBadge}>
                                <Text style={styles.notificationBadgeText}>{unreadNotificationCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    {unreadCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{unreadCount}</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.headerSubtitle}>Communicate with tenants</Text>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#9CA3AF" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search conversations..."
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                </View>
            </View>

            {/* Conversations List */}
            <ScrollView 
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#10B981"
                    />
                }
            >
                <View style={styles.content}>
                    {filteredConversations.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconContainer}>
                                <Ionicons name="chatbubbles-outline" size={48} color="#10B981" />
                            </View>
                            <Text style={styles.emptyStateTitle}>No conversations yet</Text>
                            <Text style={styles.emptyStateText}>
                                Messages from tenants and barangay officials will appear here
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.conversationsList}>
                            {filteredConversations.map((conversation) => (
                                <TouchableOpacity 
                                    key={conversation.id} 
                                    style={styles.conversationCard}
                                    onPress={() => handleChatPress(conversation)}
                                    onLongPress={() => handleDeleteConversation(conversation)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.conversationContent}>
                                        {/* Avatar - Clickable to view tenant info */}
                                        <View style={styles.avatarContainer}>
                                            <TouchableOpacity
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    handleAvatarPress(conversation);
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <View style={styles.avatar}>
                                                    {conversation.tenantAvatar && 
                                                     conversation.tenantAvatar.trim() !== '' && 
                                                     conversation.tenantAvatar.length > 10 &&
                                                     isValidImageUri(conversation.tenantAvatar) && 
                                                     !imageErrors.has(conversation.id) ? (
                                                        <Image 
                                                            source={{ uri: conversation.tenantAvatar }} 
                                                            style={styles.avatarImage}
                                                            resizeMode="cover"
                                                            onError={(error) => {
                                                                console.error('❌ Avatar image load error for conversation:', conversation.id, error);
                                                                setImageErrors(prev => new Set(prev).add(conversation.id));
                                                            }}
                                                            onLoad={() => {
                                                                console.log('✅ Avatar image loaded successfully for:', conversation.tenantName);
                                                            }}
                                                        />
                                                    ) : (
                                                        <Text style={styles.avatarText}>
                                                            {conversation.tenantName.charAt(0).toUpperCase()}
                                                        </Text>
                                                    )}
                                                    {conversation.unreadCount > 0 && (
                                                        <View style={styles.unreadBadge}>
                                                            <Text style={styles.unreadText}>
                                                                {conversation.unreadCount}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        </View>
                                        
                                        {/* Message Content */}
                                        <View style={styles.messageContent}>
                                            <View style={styles.messageHeader}>
                                                <View style={styles.tenantNameContainer}>
                                                    <Text style={styles.tenantName}>{conversation.tenantName}</Text>
                                                </View>
                                                <View style={styles.messageHeaderRight}>
                                                    <Text style={styles.messageTime}>
                                                        {formatTime(conversation.lastMessageAt)}
                                                    </Text>
                                                </View>
                                            </View>
                                            
                                            {conversation.propertyTitle && (
                                                <Text style={styles.propertyTitle}>{conversation.propertyTitle}</Text>
                                            )}
                                            
                                            <Text 
                                                style={[
                                                    styles.messageText,
                                                    conversation.unreadCount > 0 && styles.unreadMessage
                                                ]}
                                                numberOfLines={2}
                                            >
                                                {conversation.lastMessage}
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Tenant Info Modal */}
            {selectedTenant && (
                <TenantInfoModal
                    visible={tenantInfoModalVisible}
                    tenantId={selectedTenant.id}
                    tenantName={selectedTenant.name}
                    tenantEmail={selectedTenant.email}
                    tenantPhone={selectedTenant.phone}
                    tenantAvatar={selectedTenant.avatar}
                    onClose={() => {
                        setTenantInfoModalVisible(false);
                        setSelectedTenant(null);
                    }}
                />
            )}

            {/* Notifications Modal */}
            <Modal
                visible={notificationsModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setNotificationsModalVisible(false)}
            >
                <SafeAreaView style={styles.modalContainer} edges={['bottom']}>
                    <TouchableOpacity
                        style={styles.modalBackdrop}
                        activeOpacity={1}
                        onPress={() => setNotificationsModalVisible(false)}
                    />
                    <View style={styles.modalContent}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderLeft}>
                                <View style={styles.modalTitleContainer}>
                                    <Ionicons name="notifications" size={28} color="#111827" style={styles.modalTitleIcon} />
                                    <Text style={styles.modalTitle}>Notifications</Text>
                                </View>
                                {notifications.length > 0 && (
                                    <Text style={styles.modalSubtitle}>{notifications.length} {notifications.length === 1 ? 'notification' : 'notifications'}</Text>
                                )}
                            </View>
                            <TouchableOpacity
                                onPress={() => setNotificationsModalVisible(false)}
                                style={styles.modalCloseButton}
                            >
                                <View style={styles.modalCloseButtonInner}>
                                    <Ionicons name="close" size={20} color="#6B7280" />
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Notifications List */}
                        {notificationsLoading ? (
                            <View style={styles.modalLoadingContainer}>
                                <ActivityIndicator size="large" color="#10B981" />
                                <Text style={styles.modalLoadingText}>Loading notifications...</Text>
                            </View>
                        ) : notifications.length === 0 ? (
                            <View style={styles.modalEmptyState}>
                                <Ionicons name="notifications-outline" size={64} color="#9CA3AF" />
                                <Text style={styles.modalEmptyTitle}>No notifications</Text>
                                <Text style={styles.modalEmptyText}>
                                    You don't have any notifications yet
                                </Text>
                            </View>
                        ) : (
                            <ScrollView 
                                style={styles.modalScrollView}
                                contentContainerStyle={styles.modalScrollViewContent}
                                showsVerticalScrollIndicator={true}
                            >
                                {notifications.map((notification) => {
                                    // Determine notification type based on content
                                    const notificationText = notification.text || '';
                                    const isRejected = notificationText.includes('Rejected') || 
                                                      notificationText.includes('rejected') ||
                                                      notificationText.includes('declined') ||
                                                      notificationText.includes('Declined') ||
                                                      notificationText.startsWith('❌') ||
                                                      notificationText.includes('⚠️ Payment Rejected');
                                    
                                    const isApproved = notificationText.includes('Confirmed') ||
                                                       notificationText.includes('confirmed') ||
                                                       notificationText.includes('approved') ||
                                                       notificationText.includes('Approved') ||
                                                       notificationText.startsWith('✅') ||
                                                       notificationText.startsWith('🎉') ||
                                                       notificationText.includes('Payment Confirmed') ||
                                                       notificationText.includes('booking has been approved');
                                    
                                    const isRating = notificationText.includes('New Rating Received') ||
                                                     notificationText.includes('⭐ New Rating') ||
                                                     notificationText.startsWith('⭐');
                                    
                                    const iconColor = isRejected ? '#EF4444' : 
                                                     (isApproved ? '#10B981' : 
                                                     (isRating ? '#F59E0B' : '#3B82F6'));
                                    const iconBgColor = isRejected ? '#FEF2F2' : 
                                                       (isApproved ? '#F0FDF4' : 
                                                       (isRating ? '#FFFBEB' : '#EFF6FF'));
                                    
                                    return (
                                        <TouchableOpacity
                                            key={notification.id}
                                            style={styles.notificationItem}
                                            onPress={() => handleNotificationPress(notification)}
                                            activeOpacity={0.8}
                                        >
                                            <View style={styles.notificationItemCard}>
                                                <View style={[styles.notificationIconContainer, { backgroundColor: iconBgColor }]}>
                                                    <Ionicons name="notifications" size={22} color={iconColor} />
                                                </View>
                                                <View style={styles.notificationTextContainer}>
                                                    <Text style={styles.notificationItemText} numberOfLines={3}>
                                                        {notification.text}
                                                    </Text>
                                                    <View style={styles.notificationItemFooter}>
                                                        <View style={styles.notificationItemFooterLeft}>
                                                            <Ionicons name="person-outline" size={14} color="#6B7280" style={styles.footerIcon} />
                                                            <Text style={styles.notificationItemTenant}>
                                                                {notification.tenantName}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.notificationItemFooterRight}>
                                                            <Ionicons name="time-outline" size={14} color="#9CA3AF" style={styles.footerIcon} />
                                                            <Text style={styles.notificationItemTime}>
                                                                {formatTime(notification.createdAt)}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        )}
                    </View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 3,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerIcon: {
        marginLeft: 8,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 4,
    },
    badge: {
        backgroundColor: '#EF4444',
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    searchContainer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#111827',
        marginLeft: 12,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 16,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F0FDF4',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyStateTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 20,
    },
    conversationsList: {
        gap: 12,
    },
    conversationCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    conversationContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        marginRight: 16,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    avatarImage: {
        width: 52,
        height: 52,
        borderRadius: 26,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#6B7280',
    },
    unreadBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: '#EF4444',
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    unreadText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    messageContent: {
        flex: 1,
    },
    messageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    tenantNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    messageHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    tenantName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    propertyTitle: {
        fontSize: 12,
        color: '#10B981',
        fontWeight: '500',
        marginBottom: 4,
    },
    messageTime: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    messageText: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    unreadMessage: {
        fontWeight: '600',
        color: '#111827',
    },
    notificationIconButton: {
        position: 'relative',
        padding: 4,
    },
    notificationBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    notificationBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        flex: 1,
        maxHeight: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        backgroundColor: '#FAFBFC',
    },
    modalHeaderLeft: {
        flex: 1,
    },
    modalTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    modalTitleIcon: {
        marginRight: 8,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#111827',
        letterSpacing: -0.5,
    },
    modalSubtitle: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 0,
        fontWeight: '500',
    },
    modalCloseButton: {
        padding: 4,
        marginTop: -2,
    },
    modalCloseButtonInner: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    modalLoadingContainer: {
        paddingVertical: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalLoadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    modalEmptyState: {
        paddingVertical: 60,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    modalEmptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#111827',
        marginTop: 16,
        marginBottom: 6,
        letterSpacing: -0.3,
    },
    modalEmptyText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
    },
    modalScrollView: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    modalScrollViewContent: {
        paddingVertical: 12,
        paddingBottom: 16,
    },
    notificationItem: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        marginBottom: 6,
    },
    notificationItemCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    notificationIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    notificationTextContainer: {
        flex: 1,
        paddingTop: 0,
    },
    notificationItemText: {
        fontSize: 14,
        lineHeight: 20,
        color: '#111827',
        marginBottom: 8,
        fontWeight: '400',
        letterSpacing: -0.2,
    },
    notificationItemFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    notificationItemFooterLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    notificationItemFooterRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    footerIcon: {
        marginRight: 3,
    },
    notificationItemTenant: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
    },
    notificationItemTime: {
        fontSize: 11,
        color: '#9CA3AF',
        fontWeight: '500',
    },
});
