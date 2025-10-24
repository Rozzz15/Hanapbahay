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
    tenantName: string;
    tenantAvatar?: string;
    propertyTitle?: string;
}

export default function OwnerMessages() {
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
            console.log('🔄 Loading conversations for owner:', user.id);

            // Get all conversations where user is the owner
            const allConversations = await db.list('conversations');
            const ownerConversations = allConversations.filter((conv: any) => 
                conv.ownerId === user.id || 
                (conv.participantIds && conv.participantIds.includes(user.id))
            );

            console.log(`📊 Found ${ownerConversations.length} conversations for owner`);

            const conversationsWithDetails: Conversation[] = await Promise.all(
                ownerConversations.map(async (conv: any) => {
                    const tenantId = conv.tenantId || conv.participantIds?.find((id: string) => id !== user.id);
                    
                    // Get tenant details
                    let tenantName = 'Unknown Tenant';
                    let tenantAvatar = '';
                    let propertyTitle = '';

                    try {
                        const tenantRecord = await db.get('users', tenantId);
                        if (tenantRecord) {
                            tenantName = (tenantRecord as any).name || tenantName;
                            tenantAvatar = (tenantRecord as any).profilePhoto || '';
                        }

                        // Get property title if available
                        if (conv.propertyId) {
                            const property = await db.get('published_listings', conv.propertyId);
                            if (property) {
                                propertyTitle = (property as any).propertyType || '';
                            }
                        }
                    } catch (error) {
                        console.log('Error loading tenant details:', error);
                    }

                    return {
                        id: conv.id,
                        ownerId: user.id,
                        tenantId: tenantId || '',
                        lastMessage: conv.lastMessageText || 'Start conversation',
                        lastMessageAt: conv.lastMessageAt,
                        unreadCount: conv.unreadByOwner || 0,
                        tenantName,
                        tenantAvatar,
                        propertyTitle
                    };
                })
            );

            // Sort by last message time
            conversationsWithDetails.sort((a, b) => {
                const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
                const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
                return timeB - timeA;
            });

            setConversations(conversationsWithDetails);
            console.log(`✅ Loaded ${conversationsWithDetails.length} conversations`);
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
        conv.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (conv.propertyTitle && conv.propertyTitle.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleChatPress = async (conversation: Conversation) => {
        // Mark as read
        try {
            await db.upsert('conversations', conversation.id, {
                ...conversation,
                unreadByOwner: 0,
                lastReadByOwner: new Date().toISOString(),
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
                tenantName: conversation.tenantName,
                tenantAvatar: conversation.tenantAvatar || '',
                propertyTitle: conversation.propertyTitle || ''
            }
        });
    };

    const handleDeleteConversation = (conversation: Conversation) => {
        showAlert(
            'Delete Conversation',
            `Are you sure you want to delete conversation with ${conversation.tenantName}?`,
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
                            
                            showAlert('Success', 'Conversation deleted successfully');
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
                                Tenants can start conversations with you by messaging from your property listings
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.conversationsList}>
                            {filteredConversations.map((conversation) => (
                                <TouchableOpacity 
                                    key={conversation.id} 
                                    style={styles.conversationCard}
                                    onPress={() => handleChatPress(conversation)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.conversationContent}>
                                        {/* Avatar */}
                                        <View style={styles.avatarContainer}>
                                            <View style={styles.avatar}>
                                                {conversation.tenantAvatar ? (
                                                    <Image 
                                                        source={{ uri: conversation.tenantAvatar }} 
                                                        style={styles.avatarImage}
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
                                        </View>
                                        
                                        {/* Message Content */}
                                        <View style={styles.messageContent}>
                                            <View style={styles.messageHeader}>
                                                <Text style={styles.tenantName}>{conversation.tenantName}</Text>
                                                <View style={styles.messageHeaderRight}>
                                                    <Text style={styles.messageTime}>
                                                        {formatTime(conversation.lastMessageAt)}
                                                    </Text>
                                                    <TouchableOpacity
                                                        style={styles.deleteButton}
                                                        onPress={() => handleDeleteConversation(conversation)}
                                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                    >
                                                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                                    </TouchableOpacity>
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
    deleteButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
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
});
