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
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/utils/db';
import { showAlert } from '@/utils/alert';
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

export default function OwnerChatRoom() {
    const router = useRouter();
    const { user } = useAuth();
    const { conversationId, ownerName, tenantName, ownerAvatar, tenantAvatar, propertyTitle } = useLocalSearchParams();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [participantInfo, setParticipantInfo] = useState<{
        otherParticipantName: string;
        otherParticipantAvatar: string;
    }>({
        otherParticipantName: Array.isArray(tenantName) ? tenantName[0] : (tenantName || Array.isArray(ownerName) ? ownerName[0] : (ownerName || 'Unknown')),
        otherParticipantAvatar: Array.isArray(tenantAvatar) ? tenantAvatar[0] : (tenantAvatar || Array.isArray(ownerAvatar) ? ownerAvatar[0] : (ownerAvatar || ''))
    });
    const [ownerId, setOwnerId] = useState<string | null>(null);
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [isCurrentUserOwner, setIsCurrentUserOwner] = useState(false);
    const [paymentBannerVisible, setPaymentBannerVisible] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);

    const loadParticipantInfo = useCallback(async () => {
        if (!conversationId || !user?.id) return;

        try {
            // Get conversation to find the other participant
            const conversation = await db.get('conversations', conversationId as string);
            if (!conversation) return;

            // Store owner ID and determine if current user is owner
            const conversationOwnerId = conversation.ownerId || conversation.owner_id;
            const conversationTenantId = conversation.tenantId || conversation.tenant_id;
            setOwnerId(conversationOwnerId);
            setTenantId(conversationTenantId);
            setIsCurrentUserOwner(user.id === conversationOwnerId);

            // Find the other participant (not the current user)
            const otherParticipantId = conversation.participantIds?.find((id: string) => id !== user.id) || 
                                     (conversation.ownerId === user.id ? conversation.tenantId : conversation.ownerId);

            if (otherParticipantId) {
                // Get the other participant's details from users table
                const otherParticipant = await db.get('users', otherParticipantId);
                if (otherParticipant) {
                    const participantName = (otherParticipant as any).name || 
                                         (otherParticipant as any).businessName || 
                                         'Unknown User';
                    
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

                    setParticipantInfo({
                        otherParticipantName: participantName,
                        otherParticipantAvatar: participantAvatar
                    });
                }
            }
        } catch (error) {
            console.error('Error loading participant info:', error);
        }
    }, [conversationId, user?.id]);

    const loadMessages = useCallback(async () => {
        if (!conversationId || !user?.id) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            console.log('🔄 Loading messages for conversation:', conversationId);

            // Get all messages for this conversation
            const allMessages = await db.list('messages');
            const conversationMessages = allMessages.filter((msg: any) => 
                msg.conversationId === conversationId
            );

            // Sort by creation time
            conversationMessages.sort((a: any, b: any) => 
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );

            // Get conversation to determine owner
            const conversation = await db.get('conversations', conversationId as string);
            const conversationOwnerId = conversation?.ownerId || conversation?.owner_id;
            
            // Convert to UI format
            const uiMessages: Message[] = conversationMessages.map((msg: any) => ({
                id: msg.id,
                text: msg.text || '',
                senderId: msg.senderId || msg.sender_id || '',
                createdAt: msg.createdAt || msg.created_at || new Date().toISOString(),
                isOwner: (msg.senderId || msg.sender_id) === conversationOwnerId,
                type: msg.type || 'message',
                imageUri: msg.imageUri || msg.image_uri,
                imageWidth: msg.imageWidth || msg.image_width,
                imageHeight: msg.imageHeight || msg.image_height
            }));

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
        // Only load messages if we have the required parameters
        if (conversationId && user?.id) {
            loadParticipantInfo();
            loadMessages();
        } else {
            setLoading(false);
        }
    }, [loadMessages, loadParticipantInfo, conversationId, user?.id]);

    // Refresh messages when user returns to this screen
    useFocusEffect(
        useCallback(() => {
            if (conversationId && user?.id) {
                loadMessages();
            }
        }, [loadMessages, conversationId, user?.id])
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
            const messageRecord = {
                id: messageId,
                conversationId: conversationId,
                senderId: user.id,
                text: '', // Empty text for image messages
                createdAt: now,
                type: 'image',
                imageUri: imageAsset.uri,
                imageWidth: imageAsset.width,
                imageHeight: imageAsset.height
            };

            // Save message to database
            await db.upsert('messages', messageId, messageRecord);

            // Update conversation with last message
            let conversation = null;
            let isCurrentUserOwner = false;
            try {
                conversation = await db.get('conversations', conversationId as string);
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
                    const conversation = await db.get('conversations', conversationId as string);
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
        if (!newMessage.trim() || !conversationId || !user?.id || sending) return;

        try {
            setSending(true);
            const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const now = new Date().toISOString();

            // Create message record
            const messageRecord = {
                id: messageId,
                conversationId: conversationId,
                senderId: user.id,
                text: newMessage.trim(),
                createdAt: now,
                type: 'message'
            };

            // Save message to database
            await db.upsert('messages', messageId, messageRecord);

            // Update conversation with last message
            let conversation = null;
            let isCurrentUserOwner = false;
            try {
                conversation = await db.get('conversations', conversationId as string);
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
        // Check if message is from current user (not just if it's from owner)
        const isCurrentUser = message.senderId === user?.id;
        const isImageMessage = message.type === 'image' && message.imageUri;
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
                        <View style={styles.imageContainer}>
                            <Image 
                                source={{ uri: message.imageUri }} 
                                style={styles.messageImage}
                                resizeMode="cover"
                            />
                        </View>
                    ) : (
                        <Text style={[styles.messageText, isCurrentUser ? styles.currentUserMessageText : styles.otherUserMessageText]}>
                            {message.text}
                        </Text>
                    )}
                    <Text style={[styles.messageTime, isCurrentUser ? styles.currentUserMessageTime : styles.otherUserMessageTime]}>
                        {formatTime(message.createdAt)}
                    </Text>
                </TouchableOpacity>
            </Animated.View>
        );
    };

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
                                    {participantInfo.otherParticipantName.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.headerName}>{participantInfo.otherParticipantName}</Text>
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
                        messages.map((message, index) => renderMessage(message, index))
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
                            value={newMessage}
                            onChangeText={setNewMessage}
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
                                color={newMessage.trim() ? "#FFFFFF" : "#9CA3AF"} 
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
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
});
