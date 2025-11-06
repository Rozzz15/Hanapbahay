import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    View, 
    Text, 
    ScrollView, 
    TouchableOpacity, 
    StyleSheet, 
    TextInput, 
    Image, 
    Alert,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Dimensions,
    Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/utils/db';
import { showAlert } from '@/utils/alert';
import { ConversationRecord, MessageRecord } from '@/types';
import PaymentMethodsDisplay from '@/components/chat/PaymentMethodsDisplay';

interface Message {
    id: string;
    text: string;
    senderId: string;
    createdAt: string;
    isOwner: boolean;
    type?: 'message' | 'image' | 'inquiry' | 'booking_request';
    imageUri?: string;
    imageWidth?: number;
    imageHeight?: number;
}

export default function ChatRoomNew() {
    const router = useRouter();
    const { user } = useAuth();
    
    // Add try-catch around parameter destructuring
    let conversationId, ownerName, tenantName, ownerAvatar, tenantAvatar, propertyTitle;
    try {
        const params = useLocalSearchParams();
        conversationId = params.conversationId;
        ownerName = params.ownerName;
        tenantName = params.tenantName;
        ownerAvatar = params.ownerAvatar;
        tenantAvatar = params.tenantAvatar;
        propertyTitle = params.propertyTitle;
        console.log('✅ Parameters destructured successfully:', { conversationId, ownerName, tenantName, ownerAvatar, tenantAvatar, propertyTitle });
    } catch (error) {
        console.error('❌ Error destructuring parameters:', error);
        conversationId = ownerName = tenantName = ownerAvatar = tenantAvatar = propertyTitle = undefined;
    }
    
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [imageViewerVisible, setImageViewerVisible] = useState(false);
    const [viewingImageUri, setViewingImageUri] = useState<string | null>(null);
    
    // Add try-catch around participantInfo initialization
    let initialParticipantInfo;
    try {
        // Get the initial name with proper capitalization
        const initialName = Array.isArray(ownerName) ? (ownerName[0] || 'Unknown') : (ownerName || Array.isArray(tenantName) ? (tenantName?.[0] || 'Unknown') : (tenantName || 'Unknown'));
        
        // Capitalize the initial name
        const capitalizedInitialName = initialName
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        
        initialParticipantInfo = {
            otherParticipantName: capitalizedInitialName,
            otherParticipantAvatar: Array.isArray(ownerAvatar) ? (ownerAvatar[0] || '') : (ownerAvatar || Array.isArray(tenantAvatar) ? (tenantAvatar?.[0] || '') : (tenantAvatar || ''))
        };
        console.log('✅ Participant info initialized successfully:', initialParticipantInfo);
    } catch (error) {
        console.error('❌ Error initializing participant info:', error);
        initialParticipantInfo = {
            otherParticipantName: 'Unknown',
            otherParticipantAvatar: ''
        };
    }
    
    const [participantInfo, setParticipantInfo] = useState<{
        otherParticipantName: string;
        otherParticipantAvatar: string;
    }>(initialParticipantInfo);
    const [ownerId, setOwnerId] = useState<string | null>(null);
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [isCurrentUserOwner, setIsCurrentUserOwner] = useState(false);
    const [paymentBannerVisible, setPaymentBannerVisible] = useState(false);

    // Add validation for required parameters
    useEffect(() => {
        try {
            console.log('🔄 Validation useEffect triggered:', { conversationId, userId: user?.id });
            
            if (!conversationId) {
                console.error('❌ No conversationId provided to ChatRoomNew');
                showAlert('Error', 'Invalid conversation. Please try again.');
                router.back();
                return;
            }
            
            if (!user?.id) {
                console.error('❌ No user ID available in ChatRoomNew');
                showAlert('Error', 'Please log in to access messages.');
                router.push('/login');
                return;
            }
            
            console.log('✅ ChatRoomNew initialized with:', {
                conversationId,
                ownerName,
                tenantName,
                ownerAvatar,
                tenantAvatar,
                propertyTitle,
                userId: user.id
            });
        } catch (error) {
            console.error('❌ Error in validation useEffect:', error);
        }
    }, [conversationId, user?.id, router]);
    const scrollViewRef = useRef<ScrollView>(null);

    const loadParticipantInfo = useCallback(async () => {
        if (!conversationId || !user?.id) {
            console.log('⚠️ Missing required parameters for loadParticipantInfo:', { conversationId, userId: user?.id });
            return;
        }

        try {
            // Get conversation to find the other participant
            const conversation = await db.get('conversations', conversationId as string) as ConversationRecord | null;
            if (!conversation) {
                console.error('❌ Conversation not found in loadParticipantInfo:', conversationId);
                return;
            }

            // Store owner ID and determine if current user is owner
            const conversationOwnerId = conversation.ownerId || conversation.owner_id || null;
            const conversationTenantId = conversation.tenantId || conversation.tenant_id || null;
            setOwnerId(conversationOwnerId);
            setTenantId(conversationTenantId);
            setIsCurrentUserOwner(user.id === conversationOwnerId);

            // Find the other participant (not the current user)
            const otherParticipantId = conversation.participantIds?.find(id => id !== user.id) || 
                                     (conversation.ownerId === user.id ? conversation.tenantId : conversation.ownerId);

            if (otherParticipantId) {
                // Get the other participant's details from users table
                const otherParticipant = await db.get('users', otherParticipantId);
                if (otherParticipant) {
                    // Prioritize business name over owner name, with proper capitalization
                    const businessName = (otherParticipant as any).businessName;
                    const ownerName = (otherParticipant as any).name;
                    
                    let participantName = 'Unknown User';
                    if (businessName && businessName.trim()) {
                        // Use business name if available
                        participantName = businessName.trim();
                    } else if (ownerName && ownerName.trim()) {
                        // Fall back to owner name if no business name
                        participantName = ownerName.trim();
                    }
                    
                    // Capitalize the name properly
                    participantName = participantName
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join(' ');
                    
                    // Load profile photo from user_profile_photos table
                    let participantAvatar = '';
                    try {
                        const { loadUserProfilePhoto } = await import('@/utils/user-profile-photos');
                        const photoUri = await loadUserProfilePhoto(otherParticipantId);
                        if (photoUri) {
                            participantAvatar = photoUri;
                            console.log('✅ Loaded participant profile photo for:', otherParticipantId);
                            console.log('📸 Photo URI type:', typeof photoUri, 'starts with:', photoUri.substring(0, 50));
                        } else {
                            console.log('⚠️ No profile photo found for participant:', otherParticipantId);
                        }
                    } catch (photoError) {
                        console.log('⚠️ Could not load participant profile photo:', photoError);
                    }

                    console.log('✅ Participant name determined:', {
                        businessName,
                        ownerName,
                        finalName: participantName
                    });

                    setParticipantInfo({
                        otherParticipantName: participantName,
                        otherParticipantAvatar: participantAvatar
                    });
                } else {
                    console.warn('⚠️ Other participant not found in users table:', otherParticipantId);
                    // Use fallback name from URL parameters with proper capitalization
                    const fallbackName = Array.isArray(ownerName) ? (ownerName[0] || 'Unknown') : (ownerName || Array.isArray(tenantName) ? (tenantName?.[0] || 'Unknown') : (tenantName || 'Unknown'));
                    
                    // Capitalize the fallback name
                    const capitalizedFallbackName = fallbackName
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join(' ');
                    
                    setParticipantInfo({
                        otherParticipantName: capitalizedFallbackName,
                        otherParticipantAvatar: ''
                    });
                }
            } else {
                console.warn('⚠️ Could not determine other participant ID');
                // Use fallback name from URL parameters with proper capitalization
                const fallbackName = Array.isArray(ownerName) ? (ownerName[0] || 'Unknown') : (ownerName || Array.isArray(tenantName) ? (tenantName?.[0] || 'Unknown') : (tenantName || 'Unknown'));
                
                // Capitalize the fallback name
                const capitalizedFallbackName = fallbackName
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ');
                
                setParticipantInfo({
                    otherParticipantName: capitalizedFallbackName,
                    otherParticipantAvatar: ''
                });
            }
        } catch (error) {
            console.error('Error loading participant info:', error);
            // Use fallback name from URL parameters with proper capitalization
            const fallbackName = Array.isArray(ownerName) ? (ownerName[0] || 'Unknown') : (ownerName || Array.isArray(tenantName) ? (tenantName?.[0] || 'Unknown') : (tenantName || 'Unknown'));
            
            // Capitalize the fallback name
            const capitalizedFallbackName = fallbackName
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
            
            setParticipantInfo({
                otherParticipantName: capitalizedFallbackName,
                otherParticipantAvatar: ''
            });
        }
    }, [conversationId, user?.id, ownerName, tenantName]);

    const loadMessages = useCallback(async () => {
        if (!conversationId || !user?.id) {
            console.log('⚠️ Missing required parameters for loadMessages:', { conversationId, userId: user?.id });
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            console.log('🔄 Loading messages for conversation:', conversationId);

            // Get all messages for this conversation
            const allMessages = await db.list('messages') as MessageRecord[];
            if (!Array.isArray(allMessages)) {
                console.error('❌ Invalid messages data:', allMessages);
                setMessages([]);
                setLoading(false);
                return;
            }

            const conversationMessages = allMessages.filter((msg: MessageRecord) => 
                msg && msg.conversationId === conversationId
            );

            // Sort by creation time
            conversationMessages.sort((a: MessageRecord, b: MessageRecord) => {
                const dateA = new Date(a.createdAt || a.created_at || new Date().toISOString()).getTime();
                const dateB = new Date(b.createdAt || b.created_at || new Date().toISOString()).getTime();
                return dateA - dateB;
            });

            // Get conversation to determine owner
            const conversation = await db.get('conversations', conversationId as string) as ConversationRecord | null;
            if (!conversation) {
                console.error('❌ Conversation not found:', conversationId);
                showAlert('Error', 'Conversation not found');
                setMessages([]);
                setLoading(false);
                return;
            }

            const conversationOwnerId = conversation.ownerId || conversation.owner_id;
            
            // Convert to UI format with proper null checks
            const uiMessages: Message[] = conversationMessages
                .map((msg: MessageRecord) => {
                    if (!msg) {
                        console.warn('⚠️ Invalid message record:', msg);
                        return null;
                    }
                    
                    return {
                        id: msg.id || '',
                        text: msg.text || '',
                        senderId: msg.senderId || msg.sender_id || '',
                        createdAt: msg.createdAt || msg.created_at || new Date().toISOString(),
                        isOwner: (msg.senderId || msg.sender_id) === conversationOwnerId,
                        type: (msg.type || 'message') as 'message' | 'image' | 'inquiry' | 'booking_request',
                        imageUri: msg.imageUri || msg.image_uri,
                        imageWidth: msg.imageWidth || msg.image_width,
                        imageHeight: msg.imageHeight || msg.image_height
                    };
                })
                .filter((msg): msg is NonNullable<typeof msg> => msg !== null) as Message[];

            setMessages(uiMessages);
            console.log(`✅ Loaded ${uiMessages.length} messages`);

            // Scroll to bottom
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        } catch (error) {
            console.error('❌ Error loading messages:', error);
            showAlert('Error', 'Failed to load messages');
            setMessages([]); // Clear messages on error
        } finally {
            setLoading(false);
        }
    }, [conversationId, user?.id]);

    useEffect(() => {
        try {
            console.log('🔄 useEffect triggered:', { conversationId, userId: user?.id });
            // Only load messages if we have the required parameters
            if (conversationId && user?.id) {
                loadParticipantInfo();
                loadMessages();
            } else {
                console.log('⚠️ Missing required parameters, setting loading to false');
                setLoading(false);
            }
        } catch (error) {
            console.error('❌ Error in useEffect:', error);
            setLoading(false);
        }
    }, [loadMessages, loadParticipantInfo, conversationId, user?.id]);

    // Refresh messages when user returns to this screen
    useFocusEffect(
        useCallback(() => {
            if (conversationId && user?.id) {
                loadParticipantInfo(); // Refresh participant info to get latest profile photo
                loadMessages();
            }
        }, [loadMessages, loadParticipantInfo, conversationId, user?.id])
    );

    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                showAlert('Permission Required', 'Please grant permission to access your photos');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                await sendImageMessage(result.assets[0]);
            }
        } catch (error) {
            console.error('❌ Error picking image:', error);
            showAlert('Error', 'Failed to pick image');
        }
    };

    const sendImageMessage = async (imageAsset: ImagePicker.ImagePickerAsset) => {
        if (!conversationId || !user?.id || sending) {
            return;
        }

        try {
            setSending(true);
            const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const now = new Date().toISOString();

            // Create image message record
            const messageRecord: MessageRecord = {
                id: messageId,
                conversationId: conversationId as string,
                senderId: user.id,
                text: '', // Empty text for image messages
                createdAt: now,
                readBy: [user.id],
                type: 'image',
                imageUri: imageAsset.uri,
                imageWidth: imageAsset.width,
                imageHeight: imageAsset.height
            };

            // Save message to database
            await db.upsert('messages', messageId, messageRecord);

            // Update conversation with last message
            let conversation: ConversationRecord | null = null;
            let isCurrentUserOwner = false;
            try {
                conversation = await db.get('conversations', conversationId as string) as ConversationRecord | null;
                if (conversation) {
                    const conversationOwnerId = conversation.ownerId || conversation.owner_id;
                    isCurrentUserOwner = user.id === conversationOwnerId;
                    
                    await db.upsert('conversations', conversationId as string, {
                        ...conversation,
                        lastMessageText: '📷 Image',
                        lastMessageAt: now,
                        unreadByOwner: isCurrentUserOwner ? (conversation.unreadByOwner || conversation.unread_by_owner || 0) : ((conversation.unreadByOwner || conversation.unread_by_owner || 0) + 1),
                        unreadByTenant: !isCurrentUserOwner ? (conversation.unreadByTenant || conversation.unread_by_tenant || 0) : ((conversation.unreadByTenant || conversation.unread_by_tenant || 0) + 1),
                        updatedAt: now
                    });
                }
            } catch (convError) {
                console.error('Error updating conversation:', convError);
            }

            // Add message to local state
            const newMsg: Message = {
                id: messageId,
                text: '',
                senderId: user.id,
                createdAt: now,
                isOwner: isCurrentUserOwner,
                type: 'image',
                imageUri: imageAsset.uri,
                imageWidth: imageAsset.width,
                imageHeight: imageAsset.height
            };

            setMessages(prev => [...prev, newMsg]);

            // Scroll to bottom
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);

            console.log('✅ Image message sent successfully');
        } catch (error) {
            console.error('❌ Error sending image message:', error);
            showAlert('Error', 'Failed to send image');
        } finally {
            setSending(false);
        }
    };

    const deleteMessage = async (message: Message) => {
        if (!message || !user?.id || message.senderId !== user.id) {
            console.log('⚠️ Cannot delete message:', { 
                hasMessage: !!message, 
                userId: user?.id, 
                messageSenderId: message?.senderId,
                canDelete: message?.senderId === user?.id 
            });
            return;
        }

        try {
            console.log('🔄 Deleting message:', message.id);
            
            // Remove message from database
            await db.remove('messages', message.id);
            
            // Remove message from local state
            setMessages(prev => prev.filter(msg => msg.id !== message.id));
            
            // Update conversation's last message if this was the last message
            const remainingMessages = messages.filter(msg => msg.id !== message.id);
            if (remainingMessages.length > 0) {
                const lastMessage = remainingMessages[remainingMessages.length - 1];
                const lastMessageText = lastMessage.type === 'image' ? '📷 Image' : lastMessage.text;
                
                try {
                    const conversation = await db.get('conversations', conversationId as string) as ConversationRecord | null;
                    if (conversation) {
                        await db.upsert('conversations', conversationId as string, {
                            ...conversation,
                            lastMessageText: lastMessageText,
                            lastMessageAt: lastMessage.createdAt,
                            updatedAt: new Date().toISOString()
                        });
                    }
                } catch (convError) {
                    console.error('Error updating conversation after deletion:', convError);
                }
            }
            
            setSelectedMessage(null);
            console.log('✅ Message deleted successfully');
        } catch (error) {
            console.error('❌ Error deleting message:', error);
            showAlert('Error', 'Failed to delete message');
        }
    };

    const showDeleteConfirmation = (message: Message) => {
        Alert.alert(
            'Delete Message',
            'Are you sure you want to delete this message? This action cannot be undone.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                    onPress: () => setSelectedMessage(null)
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteMessage(message)
                }
            ]
        );
    };

    const sendMessage = async () => {
        try {
            console.log('🔄 sendMessage called:', { 
                hasNewMessage: !!newMessage, 
                newMessageLength: newMessage?.length || 0,
                conversationId, 
                userId: user?.id, 
                sending 
            });
            
            if (!newMessage || !newMessage.trim() || !conversationId || !user?.id || sending) {
                console.log('⚠️ sendMessage early return:', { 
                    noMessage: !newMessage, 
                    noTrim: !newMessage?.trim(), 
                    noConvId: !conversationId, 
                    noUserId: !user?.id, 
                    sending 
                });
                return;
            }

            setSending(true);
            const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const now = new Date().toISOString();

            // Create message record
            const messageRecord: MessageRecord = {
                id: messageId,
                conversationId: conversationId as string,
                senderId: user.id,
                text: newMessage.trim(),
                createdAt: now,
                readBy: [user.id], // Initialize with sender as having read the message
                type: 'message'
            };

            // Save message to database
            await db.upsert('messages', messageId, messageRecord);

            // Update conversation with last message
            let conversation: ConversationRecord | null = null;
            let isCurrentUserOwner = false;
            try {
                conversation = await db.get('conversations', conversationId as string) as ConversationRecord | null;
                if (conversation) {
                    const conversationOwnerId = conversation.ownerId || conversation.owner_id;
                    isCurrentUserOwner = user.id === conversationOwnerId;
                    
                    await db.upsert('conversations', conversationId as string, {
                        ...conversation,
                        lastMessageText: newMessage.trim(),
                        lastMessageAt: now,
                        unreadByOwner: isCurrentUserOwner ? (conversation.unreadByOwner || conversation.unread_by_owner || 0) : ((conversation.unreadByOwner || conversation.unread_by_owner || 0) + 1),
                        unreadByTenant: !isCurrentUserOwner ? (conversation.unreadByTenant || conversation.unread_by_tenant || 0) : ((conversation.unreadByTenant || conversation.unread_by_tenant || 0) + 1),
                        updatedAt: now
                    });
                }
            } catch (convError) {
                console.error('Error updating conversation:', convError);
            }

            // Add message to local state
            const newMsg: Message = {
                id: messageId,
                text: newMessage.trim(),
                senderId: user.id,
                createdAt: now,
                isOwner: isCurrentUserOwner,
                type: 'message'
            };

            setMessages(prev => [...prev, newMsg]);
            setNewMessage('');

            // Scroll to bottom
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);

            console.log('✅ Message sent successfully');
        } catch (error) {
            console.error('❌ Error sending message:', error);
            showAlert('Error', 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const formatTime = (timeString: string) => {
        try {
            const date = new Date(timeString);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
            return 'Now';
        }
    };

    const renderMessage = (message: Message, index: number) => {
        // Add defensive checks for message and array access
        if (!message || !message.id) {
            console.warn('⚠️ Invalid message in renderMessage:', message);
            return null;
        }

        // Check if message is from current user (not just if it's from owner)
        const isCurrentUser = message.senderId === user?.id;
        // Check if message is an image - check both type and presence of imageUri
        const isImageMessage = (message.type === 'image' || message.imageUri) && !!message.imageUri;
        const canDelete = user?.id === message.senderId;

        return (
            <Animated.View key={message.id} style={[styles.messageContainer, isCurrentUser ? styles.currentUserMessageContainer : styles.otherUserMessageContainer]}>
                {/* Show avatar for other user's messages (on the left) */}
                {!isCurrentUser && (
                    <View style={styles.avatarLeft}>
                        {participantInfo.otherParticipantAvatar && 
                         participantInfo.otherParticipantAvatar.trim() && 
                         participantInfo.otherParticipantAvatar.length > 10 ? (
                            <Image 
                                source={{ uri: participantInfo.otherParticipantAvatar }} 
                                style={styles.avatarImage}
                                onError={() => {
                                    console.warn('⚠️ Participant profile photo failed to load');
                                }}
                            />
                        ) : (
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {(participantInfo.otherParticipantName || 'U').charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </View>
                )}
                <TouchableOpacity
                    style={[styles.messageBubble, isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage, isImageMessage && styles.imageMessageBubble]}
                    onLongPress={() => {
                        if (canDelete) {
                            setSelectedMessage(message);
                            showDeleteConfirmation(message);
                        }
                    }}
                    delayLongPress={500}
                    activeOpacity={canDelete ? 0.7 : 1}
                >
                    {isImageMessage ? (
                        <TouchableOpacity
                            style={styles.imageContainer}
                            onPress={() => {
                                if (message.imageUri) {
                                    console.log('🖼️ Image tapped, opening viewer:', message.imageUri);
                                    setViewingImageUri(message.imageUri);
                                    setImageViewerVisible(true);
                                }
                            }}
                            onLongPress={() => {
                                if (canDelete) {
                                    setSelectedMessage(message);
                                    showDeleteConfirmation(message);
                                }
                            }}
                            delayLongPress={500}
                            activeOpacity={0.9}
                        >
                            <Image 
                                source={{ uri: message.imageUri }} 
                                style={styles.messageImage}
                                resizeMode="cover"
                            />
                        </TouchableOpacity>
                    ) : (
                        <Text style={[styles.messageText, isCurrentUser ? styles.currentUserMessageText : styles.otherUserMessageText]}>
                            {message.text || ''}
                        </Text>
                    )}
                    <Text style={[styles.messageTime, isCurrentUser ? styles.currentUserMessageTime : styles.otherUserMessageTime]}>
                        {formatTime(message.createdAt || new Date().toISOString())}
                    </Text>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    // Add error boundary for render
    try {
        if (loading && messages.length === 0) {
            return (
                <SafeAreaView style={styles.container}>
                    <View style={styles.loadingContainer}>
                        <Text style={styles.loadingText}>Loading messages...</Text>
                    </View>
                </SafeAreaView>
            );
        }

        return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>
                
                <View style={styles.headerInfo}>
                    <View style={styles.avatarContainer}>
                        {participantInfo.otherParticipantAvatar ? (
                            <Image source={{ uri: participantInfo.otherParticipantAvatar }} style={styles.headerAvatar} />
                        ) : (
                            <View style={styles.headerAvatarFallback}>
                                <Text style={styles.headerAvatarText}>
                                    {(participantInfo.otherParticipantName || 'Unknown').charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.headerName}>{participantInfo.otherParticipantName || 'Unknown'}</Text>
                        {propertyTitle && (
                            <Text style={styles.headerSubtitle}>{propertyTitle}</Text>
                        )}
                    </View>
                </View>
            </View>

            {/* Messages */}
            <KeyboardAvoidingView 
                style={styles.messagesContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Sticky Payment Methods Banner */}
                <View pointerEvents="box-none" style={styles.paymentBannerSticky}>
                    {ownerId && tenantId && (
                      <PaymentMethodsDisplay 
                        ownerId={ownerId} 
                        tenantId={tenantId}
                        isCurrentUserOwner={isCurrentUserOwner}
                        onVisibilityChange={(visible) => {
                            try {
                                // @ts-ignore - local state not typed here
                                setPaymentBannerVisible && setPaymentBannerVisible(visible);
                            } catch {}
                        }}
                      />
                    )}
                </View>

                <ScrollView 
                    ref={scrollViewRef}
                    style={styles.messagesScrollView}
                    contentContainerStyle={[
                        styles.messagesContent,
                        paymentBannerVisible && styles.messagesContentWithBanner
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    {messages.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="chatbubbles-outline" size={48} color="#9CA3AF" />
                            <Text style={styles.emptyStateText}>Start a conversation</Text>
                        </View>
                    ) : (
                        messages
                            .filter((message, index) => {
                                // Filter out invalid messages
                                if (!message || !message.id) {
                                    console.warn('⚠️ Filtering out invalid message at index', index, ':', message);
                                    return false;
                                }
                                return true;
                            })
                            .map((message, index) => renderMessage(message, index))
                    )}
                </ScrollView>

                {/* Message Input */}
                <View style={styles.inputContainer}>
                    <View style={styles.inputWrapper}>
                        <TouchableOpacity
                            style={styles.imageButton}
                            onPress={pickImage}
                            disabled={sending}
                        >
                            <Ionicons 
                                name="camera" 
                                size={20} 
                                color="#6B7280" 
                            />
                        </TouchableOpacity>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Type a message..."
                            placeholderTextColor="#9CA3AF"
                            value={newMessage || ''}
                            onChangeText={(text) => {
                                try {
                                    setNewMessage(text || '');
                                } catch (error) {
                                    console.error('❌ Error in onChangeText:', error);
                                }
                            }}
                            multiline
                            maxLength={1000}
                        />
                        <TouchableOpacity
                            style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
                            onPress={sendMessage}
                            disabled={!newMessage.trim() || sending}
                        >
                            <Ionicons 
                                name="send" 
                                size={20} 
                                color={(newMessage && newMessage.trim()) ? "#FFFFFF" : "#9CA3AF"} 
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* Full-Screen Image Viewer Modal */}
            <Modal
                visible={imageViewerVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => {
                    console.log('🖼️ Modal close requested');
                    setImageViewerVisible(false);
                    setViewingImageUri(null);
                }}
            >
                <SafeAreaView style={styles.imageViewerContainer}>
                    <TouchableOpacity
                        style={styles.imageViewerCloseButton}
                        onPress={() => {
                            console.log('🖼️ Close button pressed');
                            setImageViewerVisible(false);
                            setViewingImageUri(null);
                        }}
                    >
                        <Ionicons name="close" size={28} color="#FFFFFF" />
                    </TouchableOpacity>
                    {viewingImageUri ? (
                        <Image
                            source={{ uri: viewingImageUri }}
                            style={styles.imageViewerImage}
                            resizeMode="contain"
                            onError={(error) => {
                                console.error('❌ Error loading image in viewer:', error);
                                showAlert('Error', 'Failed to load image');
                            }}
                            onLoad={() => {
                                console.log('✅ Image loaded in viewer:', viewingImageUri);
                            }}
                        />
                    ) : (
                        <View style={styles.imageViewerPlaceholder}>
                            <Text style={styles.imageViewerPlaceholderText}>No image to display</Text>
                        </View>
                    )}
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
        );
    } catch (renderError) {
        console.error('❌ Error during render:', renderError);
        console.error('❌ Render error details:', {
            conversationId,
            messagesLength: messages.length,
            participantInfo,
            user: user?.id,
            loading,
            sending
        });
        
        // Return error fallback UI
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Error loading chat. Please try again.</Text>
                    <TouchableOpacity 
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.loadingText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 3,
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    headerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarContainer: {
        marginRight: 12,
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    headerAvatarFallback: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#3B82F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerAvatarText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    headerText: {
        flex: 1,
    },
    headerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    messagesContainer: {
        flex: 1,
    },
    paymentBannerSticky: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    messagesScrollView: {
        flex: 1,
    },
    messagesContent: {
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    messagesContentWithBanner: {
        paddingTop: 120,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#9CA3AF',
        marginTop: 12,
    },
    messageContainer: {
        marginBottom: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    currentUserMessageContainer: {
        justifyContent: 'flex-end',
    },
    otherUserMessageContainer: {
        justifyContent: 'flex-start',
    },
    avatarLeft: {
        marginRight: 8,
        marginBottom: 4,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#3B82F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    avatarText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    messageBubble: {
        maxWidth: '75%',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 18,
    },
    currentUserMessage: {
        backgroundColor: '#3B82F6',
        borderBottomRightRadius: 4,
    },
    otherUserMessage: {
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    currentUserMessageText: {
        color: '#FFFFFF',
    },
    otherUserMessageText: {
        color: '#111827',
    },
    messageTime: {
        fontSize: 11,
        marginTop: 4,
    },
    currentUserMessageTime: {
        color: 'rgba(255, 255, 255, 0.8)',
    },
    otherUserMessageTime: {
        color: '#9CA3AF',
    },
    inputContainer: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: '#F9FAFB',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        color: '#111827',
        maxHeight: 100,
        paddingVertical: 8,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#3B82F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    sendButtonDisabled: {
        backgroundColor: '#F3F4F6',
    },
    imageButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    imageMessageBubble: {
        paddingHorizontal: 8,
        paddingVertical: 8,
    },
    imageContainer: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    messageImage: {
        width: 200,
        height: 150,
        borderRadius: 12,
    },
    deleteHint: {
        position: 'absolute',
        top: -20,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    deleteHintText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '500',
    },
    imageViewerContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageViewerCloseButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1000,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageViewerImage: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
    },
    imageViewerPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageViewerPlaceholderText: {
        color: '#FFFFFF',
        fontSize: 16,
    },
});

