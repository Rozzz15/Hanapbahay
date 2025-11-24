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
    RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { db } from '@/utils/db';
import { showAlert } from '@/utils/alert';

interface Conversation {
    id: string;
    ownerId: string;
    tenantId: string;
    lastMessage?: string;
    lastMessageAt?: string;
    unreadCount: number;
    ownerName: string;
    ownerAvatar?: string;
    propertyTitle?: string;
}

export default function TenantMessages() {
    const router = useRouter();
    const { user } = useAuth();
    const { unreadCount } = useNotifications();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const loadConversations = useCallback(async () => {
        if (!user?.id) return;

        try {
            setLoading(true);
            console.log('🔄 Loading conversations for tenant:', user.id);

            // Get all conversations where user is a participant
            const allConversations = await db.list('conversations') || [];
            const userConversations = (Array.isArray(allConversations) ? allConversations : []).filter((conv: any) => {
                if (!conv) return false;
                const convTenantId = conv.tenantId || conv.tenant_id;
                const participantIds = conv.participantIds || conv.participant_ids || [];
                const isTenant = convTenantId === user.id;
                const isParticipant = Array.isArray(participantIds) && participantIds.includes(user.id);
                return isTenant || isParticipant;
            });

            console.log(`📊 Found ${userConversations.length} conversations for tenant`);

            // Get all messages to check which conversations have actual messages
            const allMessages = await db.list('messages') || [];
            console.log(`📨 Total messages in database: ${allMessages.length}`);
            const conversationsWithMessages = new Set<string>();
            
            // First, build set from messages
            for (const msg of allMessages) {
                if (!msg) continue;
                const msgConversationId = String(msg.conversationId || msg.conversation_id || '').trim();
                if (!msgConversationId) continue;
                
                // Check if message has valid content
                const hasText = msg.text && String(msg.text).trim() !== '';
                const isImage = msg.type === 'image' && (msg.imageUri || msg.image_uri);
                const isNotification = msg.type === 'notification';
                
                if ((hasText || isImage) && !isNotification) {
                    conversationsWithMessages.add(msgConversationId);
                }
            }

            // Also check conversations directly for messages
            for (const conv of userConversations) {
                const convId = String((conv as any).id || '').trim();
                if (!convId) continue;
                
                const messagesForConv = allMessages.filter((msg: any) => {
                    if (!msg) return false;
                    const msgConversationId = String(msg.conversationId || msg.conversation_id || '').trim();
                    // Use both exact match and normalized comparison
                    return msgConversationId === convId || msgConversationId === String((conv as any).id || '').trim();
                });
                
                const validMessages = messagesForConv.filter((msg: any) => {
                    if (!msg) return false;
                    const hasText = msg.text && String(msg.text).trim() !== '';
                    const isImage = msg.type === 'image' && (msg.imageUri || msg.image_uri);
                    if (!hasText && !isImage) return false;
                    return msg.type !== 'notification';
                });
                
                if (validMessages.length > 0) {
                    conversationsWithMessages.add(convId);
                    console.log(`✅ Conversation ${convId} has ${validMessages.length} valid messages`);
                }
            }

            console.log(`📨 Found ${conversationsWithMessages.size} conversations with actual messages`);
            console.log(`📊 Debug: Tenant conversations found: ${userConversations.length}`);
            console.log(`📊 Debug: Sample conversation IDs:`, userConversations.slice(0, 3).map((c: any) => c.id));
            console.log(`📊 Debug: Sample message conversationIds:`, allMessages.slice(0, 5).map((m: any) => m.conversationId || m.conversation_id));

            const conversationsWithDetails: Conversation[] = await Promise.all(
                userConversations.map(async (conv: any) => {
                    const participantIds = conv.participantIds || conv.participant_ids || [];
                    const ownerId = conv.ownerId || conv.owner_id || 
                        (Array.isArray(participantIds) ? participantIds.find((id: string) => id !== user.id) : null);
                    
                    // Get owner details
                    let ownerName = 'Unknown Owner';
                    let ownerAvatar = '';
                    let propertyTitle = '';

                    try {
                        if (ownerId) {
                            const ownerRecord = await db.get('users', ownerId);
                            if (ownerRecord) {
                                ownerName = (ownerRecord as any).name || ownerName;
                                
                                // Load profile photo from user_profile_photos table
                                try {
                                    const { loadUserProfilePhoto } = await import('@/utils/user-profile-photos');
                                    const photoUri = await loadUserProfilePhoto(ownerId);
                                    if (photoUri && photoUri.trim() !== '') {
                                        ownerAvatar = photoUri.trim();
                                        console.log('✅ Loaded owner profile photo for:', ownerId);
                                    } else {
                                        console.log('⚠️ No profile photo found for owner:', ownerId);
                                    }
                                } catch (photoError) {
                                    console.log('⚠️ Could not load owner profile photo:', photoError);
                                }
                            }
                        }

                        // Get property title if available
                        if (conv.propertyId || conv.property_id) {
                            const propertyId = conv.propertyId || conv.property_id;
                            try {
                                const property = await db.get('published_listings', propertyId);
                                if (property) {
                                    propertyTitle = (property as any).propertyType || (property as any).title || '';
                                }
                            } catch (error) {
                                console.log('Error loading property:', error);
                            }
                        }
                    } catch (error) {
                        console.log('Error loading owner details:', error);
                    }

                    // Get the last message from actual messages
                    let lastMessage = conv.lastMessageText || conv.last_message_text || 'Start conversation';
                    let lastMessageAt = conv.lastMessageAt || conv.last_message_at;
                    
                    const convIdForCheck = String(conv.id || '').trim();
                    // Get actual last message from messages table
                    const convMessages = allMessages.filter((msg: any) => {
                        if (!msg) return false;
                        const msgConvId = String(msg.conversationId || msg.conversation_id || '').trim();
                        // Use both exact match and normalized comparison
                        return msgConvId === convIdForCheck || msgConvId === String(conv.id).trim();
                    });
                    
                    if (convMessages.length > 0) {
                        const validMessages = convMessages
                            .filter((msg: any) => {
                                if (!msg) return false;
                                const hasText = msg.text && String(msg.text).trim() !== '';
                                const isImage = msg.type === 'image' && (msg.imageUri || msg.image_uri);
                                const isNotification = msg.type === 'notification';
                                return (hasText || isImage) && !isNotification;
                            })
                            .sort((a: any, b: any) => {
                                const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
                                const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
                                return timeB - timeA;
                            });
                        
                        if (validMessages.length > 0) {
                            const lastMsg = validMessages[0];
                            if (lastMsg.type === 'image') {
                                lastMessage = '📷 Image';
                            } else {
                                lastMessage = lastMsg.text || 'Start conversation';
                            }
                            lastMessageAt = lastMsg.createdAt || lastMsg.created_at || conv.lastMessageAt || conv.last_message_at;
                        }
                    }

                    // Check if conversation has messages
                    const normalizedConvId = String(conv.id || '').trim();
                    let hasMessages = conversationsWithMessages.has(normalizedConvId);
                    
                    // Double-check by looking at messages directly
                    if (convMessages.length > 0) {
                        const validMessages = convMessages.filter((msg: any) => {
                            if (!msg) return false;
                            const hasText = msg.text && String(msg.text).trim() !== '';
                            const isImage = msg.type === 'image' && (msg.imageUri || msg.image_uri);
                            if (!hasText && !isImage) return false;
                            return msg.type !== 'notification';
                        });
                        
                        if (validMessages.length > 0) {
                            hasMessages = true;
                            console.log(`✅ Conversation ${normalizedConvId} has ${validMessages.length} valid messages (re-checked)`);
                        } else {
                            console.log(`⚠️ Conversation ${normalizedConvId} has ${convMessages.length} messages but none are valid`);
                        }
                    } else {
                        console.log(`⚠️ Conversation ${normalizedConvId} has no messages found`);
                    }
                    
                    // Check conversation's lastMessageText field directly (from both camelCase and snake_case)
                    const convLastMessageText = conv.lastMessageText || conv.last_message_text || '';
                    const hasLastMessageText = convLastMessageText && String(convLastMessageText).trim() !== '' && convLastMessageText !== 'Start conversation';
                    
                    // Fallback: If conversation has lastMessageText, consider it as having messages
                    if (!hasMessages && hasLastMessageText) {
                        hasMessages = true;
                        console.log(`✅ Conversation ${normalizedConvId} has lastMessageText: "${convLastMessageText.substring(0, 50)}", considering it as having messages`);
                    }

                    return {
                        id: conv.id,
                        ownerId: ownerId || '',
                        tenantId: user.id,
                        lastMessage,
                        lastMessageAt,
                        unreadCount: conv.unreadByTenant || conv.unread_by_tenant || 0,
                        ownerName,
                        ownerAvatar,
                        propertyTitle,
                        hasMessages
                    };
                })
            );

            // Show ALL conversations - don't filter by hasMessages, show if they have lastMessageText or messages
            const conversationsWithActualMessages = (await Promise.all(
                conversationsWithDetails.map(async (conv) => {
                    // Show conversation if it has messages OR has lastMessageText
                    const hasMessages = (conv as any).hasMessages;
                    const hasLastMessage = conv.lastMessage && conv.lastMessage !== 'Start conversation' && conv.lastMessage.trim() !== '';
                    
                    if (!hasMessages && !hasLastMessage) {
                        console.log(`🚫 Filtering out conversation ${conv.id} - no messages and no lastMessageText`);
                        console.log(`   - hasMessages: ${hasMessages}`);
                        console.log(`   - lastMessage: "${conv.lastMessage}"`);
                        return null;
                    }
                    
                    console.log(`✅ Keeping conversation ${conv.id}:`, {
                        hasMessages,
                        hasLastMessage,
                        lastMessage: conv.lastMessage?.substring(0, 50),
                        ownerName: conv.ownerName
                    });
                    
                    // Verify owner exists, but don't filter out if ownerId is missing
                    if (conv.ownerId && conv.ownerId.trim() !== '') {
                        try {
                            const ownerRecord = await db.get('users', conv.ownerId);
                            if (!ownerRecord) {
                                console.log(`⚠️ Owner ${conv.ownerId} not found for conversation ${conv.id}, but keeping conversation`);
                            }
                        } catch (error) {
                            console.log(`⚠️ Error loading owner ${conv.ownerId} for conversation ${conv.id}:`, error);
                            // Don't filter out on error - show the conversation anyway
                        }
                    }
                    
                    return conv;
                })
            )).filter((conv): conv is Conversation => conv !== null);

            // Sort by last message time
            conversationsWithActualMessages.sort((a, b) => {
                const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
                const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
                return timeB - timeA;
            });

            setConversations(conversationsWithActualMessages);
            console.log(`✅ Loaded ${conversationsWithActualMessages.length} conversations with messages`);
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
        }
    }, [user?.id, loadConversations]);

    useFocusEffect(
        useCallback(() => {
            if (user?.id) {
                loadConversations();
            }
        }, [user?.id, loadConversations])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadConversations();
        setRefreshing(false);
    }, [loadConversations]);

    const handleSearch = (query: string) => {
        setSearchQuery(query);
    };

    const filteredConversations = conversations.filter(conv =>
        conv.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (conv.propertyTitle && conv.propertyTitle.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleChatPress = async (conversation: Conversation) => {
        // Mark as read
        try {
            await db.upsert('conversations', conversation.id, {
                ...conversation,
                unreadByTenant: 0,
                lastReadByTenant: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            // Update local state
            setConversations(prev => prev.map(c => 
                c.id === conversation.id ? { ...c, unreadCount: 0 } : c
            ));
        } catch (error) {
            console.error('Error marking conversation as read:', error);
        }

        // Navigate to chat room
        router.push({
            pathname: '/chat-room',
            params: {
                conversationId: conversation.id,
                ownerName: conversation.ownerName,
                ownerAvatar: conversation.ownerAvatar || '',
                propertyTitle: conversation.propertyTitle || ''
            }
        });
    };

    const handleDeleteConversation = (conversation: Conversation) => {
        showAlert(
            'Delete Conversation',
            `Are you sure you want to delete this conversation with ${conversation.ownerName}? This action cannot be undone.`,
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
                                await db.remove('messages', message.id);
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
                    {unreadCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{unreadCount}</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.headerSubtitle}>Connect with property owners</Text>
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
                                Start a conversation with property owners to see your messages here
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
                                        {/* Avatar */}
                                        <View style={styles.avatarContainer}>
                                            <View style={styles.avatar}>
                                                {conversation.ownerAvatar ? (
                                                    <Image 
                                                        source={{ uri: conversation.ownerAvatar }} 
                                                        style={styles.avatarImage}
                                                    />
                                                ) : (
                                                    <Text style={styles.avatarText}>
                                                        {conversation.ownerName.charAt(0).toUpperCase()}
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
                                        </View>
                                        
                                        {/* Message Content */}
                                        <View style={styles.messageContent}>
                                            <View style={styles.messageHeader}>
                                                <Text style={styles.ownerName}>{conversation.ownerName}</Text>
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
    messageHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    ownerName: {
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
});
