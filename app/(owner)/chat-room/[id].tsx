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
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/utils/db';
import { showAlert } from '@/utils/alert';

interface Message {
    id: string;
    text: string;
    senderId: string;
    createdAt: string;
    isOwner: boolean;
}

export default function OwnerChatRoom() {
    const router = useRouter();
    const { user } = useAuth();
    const { conversationId, ownerName, tenantName, ownerAvatar, tenantAvatar, propertyTitle } = useLocalSearchParams();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);

    const displayName = tenantName || ownerName || 'Unknown';
    const displayAvatar = tenantAvatar || ownerAvatar || '';

    const loadMessages = useCallback(async () => {
        if (!conversationId || !user?.id) return;

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
                isOwner: (msg.senderId || msg.sender_id) === conversationOwnerId
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
        } finally {
            setLoading(false);
        }
    }, [conversationId, user?.id]);

    useEffect(() => {
        loadMessages();
    }, [loadMessages]);

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
                isOwner: isCurrentUserOwner
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
        const isOwner = message.isOwner;
        const showAvatar = index === 0 || messages[index - 1].isOwner !== isOwner;

        return (
            <View key={message.id} style={styles.messageContainer}>
                {showAvatar && (
                    <View style={[styles.avatarContainer, isOwner ? styles.avatarRight : styles.avatarLeft]}>
                        <View style={styles.avatar}>
                            {displayAvatar ? (
                                <Image source={{ uri: displayAvatar }} style={styles.avatarImage} />
                            ) : (
                                <Text style={styles.avatarText}>
                                    {displayName.charAt(0).toUpperCase()}
                                </Text>
                            )}
                        </View>
                    </View>
                )}
                
                <View style={[styles.messageBubble, isOwner ? styles.ownerMessage : styles.tenantMessage]}>
                    <Text style={[styles.messageText, isOwner ? styles.ownerMessageText : styles.tenantMessageText]}>
                        {message.text}
                    </Text>
                    <Text style={[styles.messageTime, isOwner ? styles.ownerMessageTime : styles.tenantMessageTime]}>
                        {formatTime(message.createdAt)}
                    </Text>
                </View>
            </View>
        );
    };

    if (loading) {
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
                        {displayAvatar ? (
                            <Image source={{ uri: displayAvatar }} style={styles.headerAvatar} />
                        ) : (
                            <View style={styles.headerAvatarFallback}>
                                <Text style={styles.headerAvatarText}>
                                    {displayName.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.headerName}>{displayName}</Text>
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
                <ScrollView 
                    ref={scrollViewRef}
                    style={styles.messagesScrollView}
                    contentContainerStyle={styles.messagesContent}
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
    messagesScrollView: {
        flex: 1,
    },
    messagesContent: {
        paddingVertical: 16,
        paddingHorizontal: 16,
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
        flexDirection: 'row',
        marginBottom: 8,
        alignItems: 'flex-end',
    },
    avatarLeft: {
        marginRight: 8,
    },
    avatarRight: {
        marginLeft: 8,
        order: 1,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImage: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    avatarText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    messageBubble: {
        maxWidth: '75%',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
    },
    ownerMessage: {
        backgroundColor: '#3B82F6',
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
    },
    tenantMessage: {
        backgroundColor: '#FFFFFF',
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    messageText: {
        fontSize: 16,
        lineHeight: 20,
    },
    ownerMessageText: {
        color: '#FFFFFF',
    },
    tenantMessageText: {
        color: '#111827',
    },
    messageTime: {
        fontSize: 11,
        marginTop: 4,
    },
    ownerMessageTime: {
        color: 'rgba(255, 255, 255, 0.7)',
    },
    tenantMessageTime: {
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
});
