import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    View, 
    Text, 
    ScrollView, 
    TouchableOpacity, 
    StyleSheet, 
    TextInput, 
    Image, 
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/utils/db';
import { showAlert } from '@/utils/alert';
import { ConversationRecord, MessageRecord } from '@/types';
import { loadUserProfilePhoto } from '@/utils/user-profile-photos';
import TenantInfoModal from '@/components/TenantInfoModal';

interface Message {
    id: string;
    text: string;
    senderId: string;
    createdAt: string;
    isOwner: boolean;
    type?: 'message' | 'image';
    imageUri?: string;
}

export default function OwnerChatRoom() {
    const router = useRouter();
    const { user } = useAuth();
    const params = useLocalSearchParams();
    
    // CRITICAL: Ensure we get the full conversationId, not truncated
    // Extract conversationId from params - prefer conversationId query param over id route param
    // The route param (id) might get truncated by Expo Router, so we prefer the query param
    
    // Helper function to safely extract string from param
    const extractParam = (param: any): string | undefined => {
        if (!param) return undefined;
        if (typeof param === 'string') return param.trim();
        if (Array.isArray(param) && param.length > 0) {
            const first = param[0];
            return typeof first === 'string' ? first.trim() : String(first).trim();
        }
        // If it's an object, try to get a string representation
        const str = String(param);
        return str && str !== '[object Object]' ? str.trim() : undefined;
    };
    
    // Try conversationId query param first (most reliable)
    let conversationId = extractParam(params.conversationId);
    
    // If conversationId param is missing or truncated, try id route param
    if (!conversationId || conversationId.length < 10) {
        const routeId = extractParam(params.id);
        if (routeId && routeId.length >= 10) {
            console.log('✅ Using conversationId from route param (id):', routeId);
            conversationId = routeId;
        }
    }
    
    // Final validation and recovery
    if (conversationId && conversationId.length < 10) {
        console.error('⚠️ WARNING: conversationId seems truncated:', conversationId);
        console.error('⚠️ Raw params:', { 
            conversationId: params.conversationId, 
            id: params.id,
            conversationIdType: typeof params.conversationId,
            idType: typeof params.id
        });
        
        // Last resort: try to extract from raw params directly
        const directConvId = params.conversationId || params.id;
        if (directConvId) {
            if (typeof directConvId === 'string' && directConvId.length >= 10) {
                console.log('✅ Recovering conversationId from direct string param:', directConvId);
                conversationId = directConvId.trim();
            } else if (Array.isArray(directConvId) && directConvId.length > 0) {
                const first = directConvId[0];
                if (typeof first === 'string' && first.length >= 10) {
                    console.log('✅ Recovering conversationId from direct array param:', first);
                    conversationId = first.trim();
                }
            }
        }
    }
    
    console.log('✅ Owner chat room initialized with conversationId:', {
        conversationId,
        length: conversationId?.length,
        fromParams: { 
            conversationId: params.conversationId, 
            id: params.id,
            conversationIdType: typeof params.conversationId,
            idType: typeof params.id
        }
    });
    const tenantName = Array.isArray(params.tenantName) ? params.tenantName[0] : params.tenantName;
    const tenantAvatar = Array.isArray(params.tenantAvatar) ? params.tenantAvatar[0] : params.tenantAvatar;
    const propertyTitle = Array.isArray(params.propertyTitle) ? params.propertyTitle[0] : params.propertyTitle;
    
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [tenantInfo, setTenantInfo] = useState<{
        name: string;
        avatar: string;
    }>({
        name: tenantName || 'Tenant',
        avatar: tenantAvatar || ''
    });
    const [conversation, setConversation] = useState<ConversationRecord | null>(null);
    const [showTenantInfoModal, setShowTenantInfoModal] = useState(false);
    const [tenantModalInfo, setTenantModalInfo] = useState<{
        id: string;
        name: string;
        email?: string;
        phone?: string;
        avatar?: string;
    } | null>(null);
    
    const scrollViewRef = useRef<ScrollView>(null);
    const isUserAtBottomRef = useRef(true); // Track if user is at bottom of scroll
    const isInitialLoadRef = useRef(true); // Track if this is the initial load

    const loadMessages = useCallback(async () => {
        if (!conversationId || !user?.id) {
            console.log('⚠️ Missing conversationId or user.id:', { conversationId, userId: user?.id });
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const convIdForLookup = String(conversationId || '').trim();
            console.log('🔄 Loading messages for conversation:', convIdForLookup);

            // Load conversation
            let conv: ConversationRecord | null = null;
            try {
                conv = await db.get<ConversationRecord>('conversations', convIdForLookup);
            } catch (error) {
                console.log('⚠️ Conversation not found, trying alternative ID formats');
                // Try alternative ID formats
                const allConversations = await db.list('conversations') || [];
                conv = (allConversations as any[]).find((c: any) => {
                    const cId = String(c.id || '').trim();
                    return cId === convIdForLookup;
                }) as ConversationRecord | null;
            }
            
            if (conv) {
                setConversation(conv);
                console.log('✅ Conversation loaded:', {
                    id: conv.id,
                    ownerId: conv.ownerId || conv.owner_id,
                    tenantId: conv.tenantId || conv.tenant_id,
                    participantIds: conv.participantIds || conv.participant_ids
                });
                
                // Get tenant info
                const tenantId = conv.tenantId || conv.tenant_id;
                if (tenantId) {
                    try {
                        const tenantRecord = await db.get('users', tenantId);
                        if (tenantRecord) {
                            const name = (tenantRecord as any).name || tenantName || 'Tenant';
                            const email = (tenantRecord as any).email;
                            const phone = (tenantRecord as any).phone;
                            let avatar = tenantAvatar || '';
                            try {
                                const loadedAvatar = await loadUserProfilePhoto(tenantId);
                                if (loadedAvatar) avatar = loadedAvatar;
                            } catch (e) {
                                console.log('Could not load tenant avatar');
                            }
                            setTenantInfo({ name, avatar });
                            // Store tenant info for modal
                            setTenantModalInfo({
                                id: tenantId,
                                name,
                                email,
                                phone,
                                avatar
                            });
                        }
                    } catch (error) {
                        console.log('Error loading tenant info:', error);
                        // Use fallback tenant info
                        if (tenantName) {
                            setTenantInfo({ name: tenantName, avatar: tenantAvatar || '' });
                            setTenantModalInfo({
                                id: tenantId || '',
                                name: tenantName,
                                avatar: tenantAvatar || ''
                            });
                        }
                    }
                } else if (tenantName) {
                    // Use fallback tenant info if no tenantId in conversation
                    setTenantInfo({ name: tenantName, avatar: tenantAvatar || '' });
                    setTenantModalInfo({
                        id: '',
                        name: tenantName,
                        avatar: tenantAvatar || ''
                    });
                }
            } else {
                console.log('⚠️ Conversation not found, using fallback tenant info');
                if (tenantName) {
                    setTenantInfo({ name: tenantName, avatar: tenantAvatar || '' });
                }
            }

            // Get all messages for this conversation
            const allMessages = await db.list('messages') || [];
            const normalizedConvId = String(conversationId || '').trim();
            
            // Debug: Log all message conversationIds to see what we're working with
            const allConvIds = (Array.isArray(allMessages) ? allMessages : []).slice(0, 10).map((m: any) => ({
                id: m.id,
                convId: String(m.conversationId || m.conversation_id || '').trim(),
                text: m.text?.substring(0, 30)
            }));
            console.log(`📊 Owner: All message conversationIds (first 10):`, allConvIds);
            
            const conversationMessages = (Array.isArray(allMessages) ? allMessages : []).filter((msg: any) => {
                if (!msg) return false;
                const msgConversationId = String(msg.conversationId || msg.conversation_id || '').trim();
                // Try multiple matching strategies
                const exactMatch = msgConversationId === normalizedConvId;
                const normalizedMatch = msgConversationId === String(conversationId).trim();
                const matches = exactMatch || normalizedMatch;
                
                if (matches) {
                    console.log('✅ Owner: Message matches:', { 
                        msgId: msg.id, 
                        msgConvId: msgConversationId, 
                        expected: normalizedConvId,
                        text: msg.text?.substring(0, 50),
                        type: msg.type,
                        senderId: msg.senderId || msg.sender_id
                    });
                } else if (msgConversationId && normalizedConvId) {
                    // Log mismatches for debugging
                    console.log('❌ Owner: Message mismatch:', {
                        msgId: msg.id,
                        msgConvId: msgConversationId,
                        expected: normalizedConvId,
                        match: false
                    });
                }
                return matches;
            });

            console.log(`📨 Loading messages for conversation: "${normalizedConvId}"`);
            console.log(`📨 Total messages in DB: ${allMessages.length}`);
            console.log(`📨 Found ${conversationMessages.length} messages for conversation`);
            if (conversationMessages.length > 0) {
                console.log(`📨 Sample messages:`, conversationMessages.slice(0, 3).map((m: any) => ({
                    id: m.id,
                    conversationId: m.conversationId || m.conversation_id,
                    text: m.text?.substring(0, 30),
                    type: m.type,
                    senderId: m.senderId || m.sender_id
                })));
            } else {
                console.log('⚠️ NO MESSAGES FOUND - checking all messages for debugging:');
                const sampleMessages = allMessages.slice(0, 5).map((m: any) => ({
                    id: m.id,
                    conversationId: m.conversationId || m.conversation_id,
                    text: m.text?.substring(0, 30)
                }));
                console.log('📨 Sample of all messages:', sampleMessages);
            }

            // Sort messages by creation time
            conversationMessages.sort((a: any, b: any) => {
                const timeA = new Date((a as any).createdAt || (a as any).created_at || 0).getTime();
                const timeB = new Date((b as any).createdAt || (b as any).created_at || 0).getTime();
                return timeA - timeB;
            });

            // Get conversation owner ID to determine message sender role
            const conversationOwnerId = conv ? (conv.ownerId || conv.owner_id) : null;
            console.log('👤 Conversation owner ID:', conversationOwnerId, 'Current user ID:', user.id);
            
            // Convert to Message format
            const formattedMessages: Message[] = conversationMessages
                .filter((msg: any) => {
                    // Filter out notifications
                    if (msg.type === 'notification') {
                        console.log('🚫 Filtered out notification message:', msg.id);
                        return false;
                    }
                    // Ensure message has required fields
                    if (!msg.id) {
                        console.log('🚫 Filtered out message without ID');
                        return false;
                    }
                    return true;
                })
                .map((msg: any) => {
                    const senderId = msg.senderId || msg.sender_id || '';
                    // Check if sender is the conversation owner (not just current user)
                    const isOwner = conversationOwnerId ? senderId === conversationOwnerId : senderId === user.id;
                    const messageText = msg.text || '';
                    const isImage = msg.type === 'image';
                    
                    console.log('📝 Processing message:', {
                        id: msg.id,
                        senderId,
                        isOwner,
                        hasText: messageText.length > 0,
                        isImage,
                        type: msg.type
                    });
                    
                    return {
                        id: msg.id,
                        text: messageText,
                        senderId: senderId,
                        createdAt: msg.createdAt || msg.created_at || new Date().toISOString(),
                        isOwner,
                        type: msg.type || 'message',
                        imageUri: msg.imageUri || msg.image_uri
                    };
                })
                .filter((msg: Message) => {
                    // Include messages with text OR images (don't filter out empty text if it's an image)
                    const hasText = msg.text && msg.text.trim().length > 0;
                    const hasImage = msg.type === 'image' && msg.imageUri;
                    const shouldInclude = hasText || hasImage;
                    
                    if (!shouldInclude) {
                        console.log('🚫 Filtered out message without content:', msg.id, { hasText, hasImage, type: msg.type });
                    }
                    
                    return shouldInclude;
                });

            console.log(`✅ Formatted ${formattedMessages.length} messages for display`);
            setMessages(formattedMessages);
            
            // Only scroll to bottom on initial load or if user is already at bottom
            if (isInitialLoadRef.current || isUserAtBottomRef.current) {
                setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: !isInitialLoadRef.current });
                }, 100);
                isInitialLoadRef.current = false;
            }

        } catch (error) {
            console.error('❌ Error loading messages:', error);
            showAlert('Error', 'Failed to load messages');
        } finally {
            setLoading(false);
        }
    }, [conversationId, user?.id]);

    useFocusEffect(
        useCallback(() => {
            if (conversationId && user?.id) {
                loadMessages();
                
                // Mark conversation as read when viewing
                const markAsRead = async () => {
                    try {
                        const convIdForRead = String(conversationId).trim();
                        const conv = await db.get<ConversationRecord>('conversations', convIdForRead);
                        if (conv) {
                            await db.upsert('conversations', convIdForRead, {
                                ...conv,
                                unreadByOwner: 0,
                                lastReadByOwner: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            });
                        }
                    } catch (error) {
                        console.error('Error marking conversation as read:', error);
                    }
                };
                
                markAsRead();
                
                // Set up interval to check for new messages every 2 seconds
                const interval = setInterval(() => {
                    loadMessages();
                }, 2000);
                
                return () => clearInterval(interval);
            }
        }, [conversationId, user?.id, loadMessages])
    );

    const sendMessage = async () => {
        // CRITICAL: Ensure conversationId is properly preserved and not truncated
        const activeConversationId = conversationId ? String(conversationId).trim() : undefined;
        
        console.log('🔄 Owner sendMessage called:', {
            conversationId: activeConversationId,
            conversationIdLength: activeConversationId?.length,
            conversationIdType: typeof activeConversationId,
            hasMessage: !!newMessage?.trim(),
            userId: user?.id
        });
        
        // Validate conversationId before proceeding
        if (!activeConversationId || activeConversationId.length < 10) {
            console.error('❌ CRITICAL ERROR: conversationId is missing or truncated!', {
                conversationId: activeConversationId,
                length: activeConversationId?.length,
                type: typeof activeConversationId
            });
            showAlert('Error', 'Invalid conversation ID. Please try again.');
            return;
        }
        
        if (!newMessage || !newMessage.trim() || !user?.id || sending) {
            console.log('⚠️ Owner sendMessage early return:', {
                noMessage: !newMessage,
                noTrim: !newMessage?.trim(),
                noUserId: !user?.id,
                sending
            });
            return;
        }

        try {
            setSending(true);
            const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const now = new Date().toISOString();

            // Use the validated conversationId - ensure it's a full string
            const normalizedConversationId = String(activeConversationId).trim();
            
            // Double-check it's still valid after normalization
            if (normalizedConversationId.length < 10 || normalizedConversationId === 'undefined' || normalizedConversationId === 'null') {
                console.error('❌ CRITICAL ERROR: conversationId is invalid after normalization!', {
                    normalized: normalizedConversationId,
                    length: normalizedConversationId.length,
                    original: activeConversationId
                });
                showAlert('Error', 'Invalid conversation ID. Please try again.');
                setSending(false);
                return;
            }
            if (!normalizedConversationId || normalizedConversationId === 'undefined' || normalizedConversationId === 'null') {
                showAlert('Error', 'Invalid conversation. Please try again.');
                setSending(false);
                return;
            }
            
            // Create message record - ensure conversationId is properly set
            const messageRecord: MessageRecord = {
                id: messageId,
                conversationId: normalizedConversationId, // Use normalized ID
                senderId: user.id,
                text: newMessage.trim(),
                createdAt: now,
                readBy: [user.id],
                type: 'message'
            };
            
            console.log('📤 Owner: Saving message:', {
                messageId,
                conversationId: normalizedConversationId,
                originalConversationId: conversationId,
                senderId: user.id,
                textLength: newMessage.trim().length,
                messageRecord: {
                    id: messageRecord.id,
                    conversationId: messageRecord.conversationId,
                    senderId: messageRecord.senderId,
                    type: messageRecord.type
                }
            });

            // Save message to database
            await db.upsert('messages', messageId, messageRecord);
            
            // Verify the message was saved correctly
            try {
                const savedMessage = await db.get('messages', messageId) as any;
                console.log('✅ Owner: Message saved successfully:', {
                    savedId: savedMessage?.id,
                    savedConversationId: savedMessage?.conversationId || savedMessage?.conversation_id,
                    expectedConversationId: normalizedConversationId
                });
            } catch (verifyError) {
                console.error('❌ Owner: Error verifying saved message:', verifyError);
            }

            // Update conversation with last message
            try {
                const conv = await db.get<ConversationRecord>('conversations', normalizedConversationId);
                if (conv) {
                    const conversationTenantId = conv.tenantId || conv.tenant_id;
                    const isCurrentUserOwner = user.id === (conv.ownerId || conv.owner_id);
                    
                    await db.upsert('conversations', normalizedConversationId, {
                        ...conv,
                        lastMessageText: newMessage.trim(),
                        lastMessageAt: now,
                        // If owner sends message, increment tenant's unread count
                        // If tenant sends message, increment owner's unread count
                        unreadByOwner: isCurrentUserOwner ? (conv.unreadByOwner || 0) : ((conv.unreadByOwner || conv.unread_by_owner || 0) + 1),
                        unreadByTenant: isCurrentUserOwner ? ((conv.unreadByTenant || conv.unread_by_tenant || 0) + 1) : (conv.unreadByTenant || conv.unread_by_tenant || 0),
                        updatedAt: now
                    });
                }
            } catch (convError) {
                console.error('❌ Error updating conversation:', convError);
            }

            // Add message to local state
            const newMsg: Message = {
                id: messageId,
                text: newMessage.trim(),
                senderId: user.id,
                createdAt: now,
                isOwner: true,
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
            return '';
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#10B981" />
                    <Text style={styles.loadingText}>Loading messages...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => {
                        if (tenantModalInfo && tenantModalInfo.id) {
                            setShowTenantInfoModal(true);
                        }
                    }}
                    style={styles.headerInfo}
                    activeOpacity={0.7}
                    disabled={!tenantModalInfo || !tenantModalInfo.id}
                >
                    <View style={styles.headerAvatarContainer}>
                        {tenantInfo.avatar ? (
                            <Image source={{ uri: tenantInfo.avatar }} style={styles.headerAvatar} />
                        ) : (
                            <View style={styles.headerAvatarFallback}>
                                <Text style={styles.headerAvatarText}>
                                    {tenantInfo.name.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerName}>{tenantInfo.name}</Text>
                        {propertyTitle && (
                            <Text style={styles.headerSubtitle}>{propertyTitle}</Text>
                        )}
                    </View>
                </TouchableOpacity>
            </View>
            
            {/* Tenant Info Modal */}
            {tenantModalInfo && tenantModalInfo.id && (
                <TenantInfoModal
                    visible={showTenantInfoModal}
                    tenantId={tenantModalInfo.id}
                    tenantName={tenantModalInfo.name}
                    tenantEmail={tenantModalInfo.email}
                    tenantPhone={tenantModalInfo.phone}
                    tenantAvatar={tenantModalInfo.avatar}
                    onClose={() => setShowTenantInfoModal(false)}
                />
            )}

            {/* Messages */}
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
            >
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.messagesContainer}
                    contentContainerStyle={[
                        styles.messagesContent,
                        messages.length === 0 && styles.emptyMessagesContent
                    ]}
                    showsVerticalScrollIndicator={false}
                    onScroll={(event) => {
                        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
                        const paddingToBottom = 50; // threshold in pixels
                        isUserAtBottomRef.current = 
                            layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
                    }}
                    scrollEventThrottle={100}
                >
                    {messages.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
                            <Text style={styles.emptyStateText}>No messages yet</Text>
                            <Text style={styles.emptyStateSubtext}>Start the conversation by sending a message</Text>
                        </View>
                    ) : (
                        messages.map((message) => {
                            const isCurrentUser = message.isOwner;
                            return (
                                <View
                                    key={message.id}
                                    style={[
                                        styles.messageWrapper,
                                        isCurrentUser ? styles.currentUserMessageWrapper : styles.otherUserMessageWrapper
                                    ]}
                                >
                                    {!isCurrentUser && (
                                        <View style={styles.avatarContainer}>
                                            {tenantInfo.avatar ? (
                                                <Image source={{ uri: tenantInfo.avatar }} style={styles.avatar} />
                                            ) : (
                                                <View style={styles.avatarPlaceholder}>
                                                    <Text style={styles.avatarText}>
                                                        {tenantInfo.name.charAt(0).toUpperCase()}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    )}
                                    <View style={[
                                        styles.messageBubble,
                                        isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
                                    ]}>
                                        {message.type === 'image' && message.imageUri ? (
                                            <Image source={{ uri: message.imageUri }} style={styles.messageImage} />
                                        ) : (
                                            <Text style={[
                                                styles.messageText,
                                                isCurrentUser ? styles.currentUserText : styles.otherUserText
                                            ]}>
                                                {message.text || ''}
                                            </Text>
                                        )}
                                        <Text style={[
                                            styles.messageTime,
                                            isCurrentUser ? styles.currentUserTime : styles.otherUserTime
                                        ]}>
                                            {formatTime(message.createdAt)}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </ScrollView>

                {/* Input */}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Type a message..."
                        placeholderTextColor="#9CA3AF"
                        value={newMessage}
                        onChangeText={setNewMessage}
                        multiline
                        maxLength={1000}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
                        onPress={sendMessage}
                        disabled={!newMessage.trim() || sending}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Ionicons name="send" size={20} color="#FFFFFF" />
                        )}
                    </TouchableOpacity>
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
        marginTop: 12,
        fontSize: 16,
        color: '#6B7280',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        marginRight: 12,
        padding: 4,
    },
    headerInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerAvatarContainer: {
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
    headerTextContainer: {
        flex: 1,
    },
    headerName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 2,
    },
    keyboardView: {
        flex: 1,
    },
    messagesContainer: {
        flex: 1,
    },
    messagesContent: {
        padding: 16,
        flexGrow: 1,
    },
    emptyMessagesContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
        marginTop: 16,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 8,
        textAlign: 'center',
    },
    messageWrapper: {
        flexDirection: 'row',
        marginBottom: 12,
        alignItems: 'flex-end',
    },
    currentUserMessageWrapper: {
        justifyContent: 'flex-end',
    },
    otherUserMessageWrapper: {
        justifyContent: 'flex-start',
    },
    avatarContainer: {
        marginRight: 8,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    avatarPlaceholder: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#10B981',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    messageBubble: {
        maxWidth: '75%',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
    },
    currentUserBubble: {
        backgroundColor: '#10B981',
        borderBottomRightRadius: 4,
    },
    otherUserBubble: {
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    currentUserText: {
        color: '#FFFFFF',
    },
    otherUserText: {
        color: '#111827',
    },
    messageImage: {
        width: 200,
        height: 200,
        borderRadius: 12,
        marginBottom: 4,
    },
    messageTime: {
        fontSize: 11,
        marginTop: 4,
    },
    currentUserTime: {
        color: 'rgba(255, 255, 255, 0.7)',
    },
    otherUserTime: {
        color: '#9CA3AF',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    input: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        maxHeight: 100,
        fontSize: 15,
        color: '#111827',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#10B981',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#D1D5DB',
    },
});

