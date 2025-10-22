import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, TouchableOpacity, StyleSheet, TextInput, Modal, Image, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { db } from '@/utils/db';
import { showAlert } from '@/utils/alert';
import { ConversationRecord } from '@/types';

// Utility function to normalize conversation data
const normalizeConversation = (conv: any): ConversationRecord => {
    return {
        id: conv.id,
        ownerId: conv.ownerId || conv.owner_id || '',
        tenantId: conv.tenantId || conv.tenant_id || '',
        participantIds: conv.participantIds || conv.participant_ids || [],
        lastMessageText: conv.lastMessageText || conv.last_message_text,
        lastMessageAt: conv.lastMessageAt || conv.last_message_at,
        createdAt: conv.createdAt || conv.created_at || new Date().toISOString(),
        updatedAt: conv.updatedAt || conv.updated_at || new Date().toISOString(),
        unreadByOwner: conv.unreadByOwner || conv.unread_by_owner || 0,
        unreadByTenant: conv.unreadByTenant || conv.unread_by_tenant || 0,
        lastReadByOwner: conv.lastReadByOwner || conv.last_read_by_owner,
        lastReadByTenant: conv.lastReadByTenant || conv.last_read_by_tenant,
    };
};
// Removed profile-photos import - functionality removed

interface ChatItem {
  id: string;
  name: string;
  message: string;
  time: string;
  unreadCount?: number;
  avatar?: string;
  read?: boolean;
  conversationId?: string;
  otherUserId?: string;
  propertyId?: string;
  propertyTitle?: string;
  ownerDetails?: {
    id: string;
    name: string;
    businessName?: string;
    email: string;
    phone: string;
    address: string;
    role: string;
    createdAt: string;
    profilePhoto?: string;
  };
}

const ChatPage = () => {
    const router = useRouter();
    const { user } = useAuth();
    const { unreadCount } = useNotifications();
    const [conversations, setConversations] = useState<ChatItem[]>([]);
    const [filteredConversations, setFilteredConversations] = useState<ChatItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOwner, setSelectedOwner] = useState<ChatItem | null>(null);
    const [showOwnerDetails, setShowOwnerDetails] = useState(false);

    // Run business name migration once on app startup
    useEffect(() => {
        const runMigration = async () => {
            try {
                const migrationKey = 'business_name_migration_completed';
                const migrationCompleted = await AsyncStorage.getItem(migrationKey);
                
                if (!migrationCompleted) {
                    console.log('🔄 Running business name migration...');
                    const { migrateBusinessNamesToProfiles } = await import('../../utils/migrate-business-names');
                    const result = await migrateBusinessNamesToProfiles();
                    
                    if (result.success) {
                        await AsyncStorage.setItem(migrationKey, 'true');
                        console.log('✅ Business name migration completed');
                        // Reload conversations to show updated business names
                        loadConvos();
                    }
                }
            } catch (error) {
                console.error('❌ Migration error:', error);
            }
        };
        
        runMigration();
    }, []);

    const loadConvos = useCallback(async () => {
        try {
            setLoading(true);
            const convos = await db.list<ConversationRecord>('conversations');
            // Normalize and filter by membership
            const normalizedConvos = convos.map(normalizeConversation);
            const myConvos = user ? normalizedConvos.filter(c => c.participantIds.includes(user.id)) : [];
            
            const mapped: ChatItem[] = await Promise.all(myConvos.map(async c => {
                const otherUserId = user ? c.participantIds.find(pid => pid !== user.id) : undefined;
                
                // Get owner name and profile photo from user database
                let ownerName = `Owner ${otherUserId?.slice(-4) || 'Unknown'}`;
                let ownerAvatar = '';
                let ownerDetails = undefined;
                
                try {
                    const ownerRecord = await db.get('users', otherUserId || '') as any;
                    if (ownerRecord) {
                        // PRIORITY 1: Check for business name in owner profile
                        try {
                            const ownerProfile = await db.get('owner_profiles', otherUserId || '') as any;
                            if (ownerProfile?.businessName) {
                                ownerName = ownerProfile.businessName;
                                console.log(`✅ Using business name for chat list: ${ownerProfile.businessName}`);
                            } else {
                                ownerName = ownerRecord.name || ownerName;
                                console.log(`⚠️ No business name found, using owner name: ${ownerRecord.name}`);
                            }
                        } catch (profileError) {
                            // Fallback to owner name if no business name
                            ownerName = ownerRecord.name || ownerName;
                            console.log(`⚠️ Profile error, using owner name: ${ownerRecord.name}`);
                        }
                        
                        // Get profile photo - functionality removed
                        try {
                            console.log(`🔍 Profile photo loading removed for owner: ${otherUserId}`);
                            // Removed profile photo loading - functionality removed
                            console.log(`❌ Profile photo functionality removed for ${otherUserId}`);
                            // Try to get profile photo from user record directly
                            if ((ownerRecord as any).profilePhoto) {
                                ownerAvatar = (ownerRecord as any).profilePhoto;
                                console.log(`✅ Using profile photo from user record for ${otherUserId}`);
                            }
                        } catch (photoError) {
                            console.log('❌ Could not load profile photo:', photoError);
                            // Fallback to user record profile photo
                            if ((ownerRecord as any).profilePhoto) {
                                ownerAvatar = (ownerRecord as any).profilePhoto;
                                console.log(`✅ Using fallback profile photo from user record for ${otherUserId}`);
                            }
                        }
                        
                        // Get owner profile for business name
                        let businessName = undefined;
                        try {
                            const ownerProfile = await db.get('owner_profiles', otherUserId || '') as any;
                            if (ownerProfile?.businessName) {
                                businessName = ownerProfile.businessName;
                            }
                        } catch (profileError) {
                            // No business name found
                        }
                        
                        // Get owner address - prioritize property address if available
                        let ownerAddress = (ownerRecord as any).address || 'No address provided';
                        
                        // First, try to get property address from published listings
                        try {
                            const publishedListings = await db.list('published_listings') as any[];
                            const ownerListings = publishedListings.filter(listing => listing.userId === otherUserId);
                            
                            if (ownerListings.length > 0) {
                                // Use the first property's address as the business address
                                const firstProperty = ownerListings[0];
                                if (firstProperty.address) {
                                    ownerAddress = firstProperty.address;
                                    console.log(`🏢 Using property address for ${ownerName}: ${ownerAddress}`);
                                }
                            }
                        } catch (propertyError) {
                            console.log('Could not load property address:', propertyError);
                        }
                        
                        // Fallback to personal address from AsyncStorage if no property address found
                        if (ownerAddress === (ownerRecord as any).address || ownerAddress === 'No address provided') {
                            try {
                                const personalDetailsKey = `personal_details:${otherUserId}`;
                                const personalDetailsData = await AsyncStorage.getItem(personalDetailsKey);
                                if (personalDetailsData) {
                                    const personalDetails = JSON.parse(personalDetailsData);
                                    if (personalDetails.address) {
                                        ownerAddress = personalDetails.address;
                                        console.log(`🏠 Using personal address for ${ownerName}: ${ownerAddress}`);
                                    }
                                }
                            } catch (storageError) {
                                console.log('Could not load owner address from AsyncStorage:', storageError);
                            }
                        }
                        
                        ownerDetails = {
                            id: (ownerRecord as any).id,
                            name: (ownerRecord as any).name,
                            businessName: businessName,
                            email: (ownerRecord as any).email,
                            phone: (ownerRecord as any).phone,
                            address: ownerAddress,
                            role: (ownerRecord as any).role,
                            createdAt: (ownerRecord as any).createdAt,
                            profilePhoto: ownerAvatar
                        };
                    }
                } catch (error) {
                    console.log('Could not load owner details:', error);
                }
                
                // Calculate unread count for tenant
                const unreadCount = c.unreadByTenant || 0;
                const isRead = unreadCount === 0;
                
                return {
                    id: c.id,
                    conversationId: c.id,
                    otherUserId: otherUserId,
                    name: ownerName,
                    message: c.lastMessageText || 'Start chatting',
                    time: c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleTimeString() : '',
                    avatar: ownerAvatar,
                    read: isRead,
                    unreadCount: unreadCount,
                    ownerDetails: ownerDetails
                };
            }));
            
            // Sort by last message time (newest first)
            mapped.sort((a, b) => {
                const convA = myConvos.find(c => c.id === a.id);
                const convB = myConvos.find(c => c.id === b.id);
                const timeA = convA?.lastMessageAt || convA?.createdAt || '';
                const timeB = convB?.lastMessageAt || convB?.createdAt || '';
                return timeB.localeCompare(timeA);
            });
            
            setConversations(mapped);
            setFilteredConversations(mapped);
            
            console.log(`📱 Loaded ${mapped.length} conversations for tenant ${user?.id}`);
            console.log('📱 Conversations loaded:', mapped.map(c => ({ id: c.id, name: c.name, conversationId: c.conversationId })));
        } catch (e) {
            console.error('Error loading conversations:', e);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadConvos();
    }, [loadConvos]);

    // Refresh conversations when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            if (user?.id) {
                console.log('🔄 Tenant chat screen focused - refreshing conversations...');
                loadConvos();
            }
        }, [user?.id, loadConvos])
    );

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setFilteredConversations(conversations);
        } else {
            const filtered = conversations.filter(conv =>
                conv.name.toLowerCase().includes(query.toLowerCase()) ||
                conv.message.toLowerCase().includes(query.toLowerCase())
            );
            setFilteredConversations(filtered);
        }
    };

    const handleViewOwnerDetails = (chat: ChatItem) => {
        setSelectedOwner(chat);
        setShowOwnerDetails(true);
    };

    const handleCloseOwnerDetails = () => {
        setShowOwnerDetails(false);
        setSelectedOwner(null);
    };

    // Define before any effect that might reference it
    const deleteConversationById = useCallback(async (conversationId: string, chatId?: string) => {
        try {
            // Delete the conversation from database
            await db.remove('conversations', conversationId);
            // Delete all messages in this conversation
            const allMessages = await db.list('messages');
            const conversationMessages = allMessages.filter((msg: any) =>
                msg.conversationId === conversationId || msg.conversation_id === conversationId
            );
            for (const message of conversationMessages) {
                await db.remove('messages', message.id);
            }
            // Remove from local state if provided
            if (chatId) {
                setConversations(prev => prev.filter(c => c.id !== chatId));
                setFilteredConversations(prev => prev.filter(c => c.id !== chatId));
            }
            console.log(`✅ Deleted conversation ${conversationId} with ${conversationMessages.length} messages`);
            return { ok: true, deletedMessages: conversationMessages.length } as const;
        } catch (error) {
            console.error('❌ Error deleting conversation:', error);
            return { ok: false, error } as const;
        }
    }, []);

    // Expose a dev-only helper after the function exists
    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as any).hbTestDeleteConversation = async (conversationId: string) => {
                console.log('[hbTestDeleteConversation] Requested delete for', conversationId);
                const result = await deleteConversationById(conversationId);
                console.log('[hbTestDeleteConversation] Result:', result);
                return result;
            };
        }
    }, [deleteConversationById]);

    const handleDeleteConversation = useCallback((chat: ChatItem) => {
        showAlert(
            'Delete Conversation',
            `Are you sure you want to delete "${chat.name}" conversation? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const conversationId = chat.conversationId || chat.id;
                        const result = await deleteConversationById(conversationId, chat.id);
                        if (result.ok) {
                            showAlert('Success', 'Conversation deleted successfully');
                        } else {
                            showAlert('Error', 'Failed to delete conversation. Please try again.');
                        }
                    }
                }
            ]
        );
    }, [deleteConversationById]);

    const handleChatPress = async (chat: ChatItem) => {
        // Mark messages as read when tenant opens conversation
        if (chat.conversationId && user?.id) {
            try {
                const conversation = await db.get<ConversationRecord>('conversations', chat.conversationId);
                if (conversation) {
                    // Update conversation to mark as read by tenant
                    const normalizedConv = normalizeConversation(conversation);
                    await db.upsert('conversations', chat.conversationId, {
                        ...normalizedConv,
                        unreadByTenant: 0,
                        lastReadByTenant: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                    
                    // Update local state to remove unread count
                    setConversations(prev => prev.map(c => 
                        c.id === chat.id ? { ...c, unreadCount: 0, read: true } : c
                    ));
                    setFilteredConversations(prev => prev.map(c => 
                        c.id === chat.id ? { ...c, unreadCount: 0, read: true } : c
                    ));
                    
                    console.log(`✅ Marked conversation ${chat.conversationId} as read by tenant`);
                }
            } catch (error) {
                console.error('❌ Error marking conversation as read:', error);
            }
        }
        
        router.push({
            pathname: "/chat-room",
            params: {
                name: chat.name,
                avatar: chat.avatar,
                conversationId: chat.conversationId,
                otherUserId: chat.otherUserId,
            },
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <Text style={styles.headerTitle}>Messages</Text>
                    {unreadCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{unreadCount}</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.headerSubtitle}>Chat with property owners</Text>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#9CA3AF" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search messages..."
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                </View>
            </View>

            <ScrollView style={styles.scrollView}>
                <View style={styles.content}>
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <Text style={styles.loadingText}>Loading conversations...</Text>
                        </View>
                    ) : filteredConversations.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="chatbubbles-outline" size={48} color="#9CA3AF" />
                            <Text style={styles.emptyStateTitle}>No conversations yet</Text>
                            <Text style={styles.emptyStateText}>
                                You'll receive messages from property owners here
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.conversationsList}>
                            {console.log('📱 Rendering conversations:', filteredConversations.length)}
                            {filteredConversations.map((chat) => (
                                <View key={chat.id} style={styles.conversationWrapper}>
                                    <TouchableOpacity 
                                        style={styles.conversationCard}
                                        onPress={() => handleChatPress(chat)}
                                        activeOpacity={0.9}
                                    >
                                        <View style={styles.conversationContent}>
                                            {/* Profile Picture */}
                                            <TouchableOpacity 
                                                onPress={() => handleViewOwnerDetails(chat)}
                                                style={styles.avatarContainer}
                                            >
                                                <View style={styles.avatar}>
                                                    {chat.avatar && chat.avatar.trim() !== '' ? (
                                                        <Image 
                                                            source={{ uri: chat.avatar }} 
                                                            style={styles.avatarImage}
                                                        />
                                                    ) : (
                                                        <Text style={styles.avatarText}>
                                                            {chat.name.charAt(0).toUpperCase()}
                                                        </Text>
                                                    )}
                                                    {chat.unreadCount && chat.unreadCount > 0 && (
                                                        <View style={styles.unreadBadge}>
                                                            <Text style={styles.unreadText}>{chat.unreadCount}</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                            
                                            {/* Message Content */}
                                            <View style={styles.messageContent}>
                                                <View style={styles.messageHeader}>
                                                    <TouchableOpacity onPress={() => handleViewOwnerDetails(chat)}>
                                                        <Text style={styles.ownerName}>{chat.name}</Text>
                                                    </TouchableOpacity>
                                                    <View style={styles.messageHeaderRight}>
                                                        <Text style={styles.messageTime}>{chat.time}</Text>
                                                        <TouchableOpacity
                                                            style={styles.deleteButton}
                                                            onPress={() => {
                                                                console.log('🗑️ DELETE BUTTON CLICKED!', chat.name);
                                                                handleDeleteConversation(chat);
                                                            }}
                                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                        >
                                                            <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                                <View style={styles.messageFooter}>
                                                    <Text style={[
                                                        styles.messageText,
                                                        !chat.read && styles.unreadMessage
                                                    ]}>
                                                        {chat.message}
                                                    </Text>
                                                    <Ionicons 
                                                        name={chat.read ? "checkmark-done" : "checkmark"} 
                                                        size={16} 
                                                        color={chat.read ? "#3B82F6" : "#9CA3AF"} 
                                                    />
                                                </View>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Owner Details Modal */}
            <Modal
                visible={showOwnerDetails}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={handleCloseOwnerDetails}
            >
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Owner Details</Text>
                        <TouchableOpacity
                            onPress={handleCloseOwnerDetails}
                            style={styles.modalCloseButton}
                        >
                            <Ionicons name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    {selectedOwner && (
                        <ScrollView style={styles.modalContent}>
                            {/* Profile Photo */}
                            <View style={styles.modalProfileSection}>
                                <View style={styles.modalAvatar}>
                                    {selectedOwner.ownerDetails?.profilePhoto && selectedOwner.ownerDetails.profilePhoto.trim() !== '' ? (
                                        <Image 
                                            source={{ uri: selectedOwner.ownerDetails.profilePhoto }} 
                                            style={styles.modalAvatarImage}
                                        />
                                    ) : (
                                        <Text style={styles.modalAvatarText}>
                                            {selectedOwner.name.charAt(0).toUpperCase()}
                                        </Text>
                                    )}
                                </View>
                                <Text style={styles.modalOwnerName}>{selectedOwner.name}</Text>
                                {selectedOwner.ownerDetails?.businessName && (
                                    <Text style={styles.modalBusinessName}>
                                        {selectedOwner.ownerDetails.businessName}
                                    </Text>
                                )}
                            </View>

                            {/* Owner Information */}
                            {selectedOwner.ownerDetails && (
                                <View style={styles.modalInfoSection}>
                                    <View style={styles.infoRow}>
                                        <Ionicons name="mail" size={20} color="#6B7280" />
                                        <Text style={styles.infoText}>{selectedOwner.ownerDetails.email}</Text>
                                    </View>
                                    
                                    <View style={styles.infoRow}>
                                        <Ionicons name="call" size={20} color="#6B7280" />
                                        <Text style={styles.infoText}>{selectedOwner.ownerDetails.phone}</Text>
                                    </View>
                                    
                                    <View style={styles.infoRow}>
                                        <Ionicons name="location" size={20} color="#6B7280" />
                                        <Text style={styles.infoText}>
                                            {selectedOwner.ownerDetails.address || 'No address provided'}
                                        </Text>
                                    </View>
                                    
                                    <View style={styles.infoRow}>
                                        <Ionicons name="person" size={20} color="#6B7280" />
                                        <Text style={styles.infoText}>
                                            {selectedOwner.ownerDetails.role.charAt(0).toUpperCase() + selectedOwner.ownerDetails.role.slice(1)}
                                        </Text>
                                    </View>
                                    
                                    {selectedOwner.ownerDetails.businessName && (
                                        <View style={styles.infoRow}>
                                            <Ionicons name="business" size={20} color="#6B7280" />
                                            <Text style={styles.infoText}>{selectedOwner.ownerDetails.businessName}</Text>
                                        </View>
                                    )}
                                    
                                    <View style={styles.infoRow}>
                                        <Ionicons name="calendar" size={20} color="#6B7280" />
                                        <Text style={styles.infoText}>
                                            Member since {new Date(selectedOwner.ownerDetails.createdAt).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {/* Action Buttons */}
                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    onPress={handleCloseOwnerDetails}
                                    style={styles.modalCloseButton}
                                >
                                    <Text style={styles.modalCloseButtonText}>Close</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    )}
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#6B7280',
    },
    searchContainer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
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
        paddingVertical: 40,
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyStateText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
    },
    conversationsList: {
        gap: 12,
    },
    conversationWrapper: {
        position: 'relative',
    },
    conversationCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    conversationContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    avatarImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#6B7280',
    },
    unreadBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
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
        padding: 10,
        borderRadius: 8,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    ownerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    messageTime: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    messageFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    messageText: {
        fontSize: 14,
        color: '#6B7280',
        flex: 1,
        marginRight: 8,
    },
    unreadMessage: {
        fontWeight: '600',
        color: '#111827',
    },
    // Modal styles
    modalContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    modalCloseButton: {
        padding: 4,
    },
    modalContent: {
        flex: 1,
        padding: 20,
    },
    modalProfileSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    modalAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    modalAvatarImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    modalAvatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#6B7280',
    },
    modalOwnerName: {
        fontSize: 20,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    modalBusinessName: {
        fontSize: 14,
        color: '#6B7280',
    },
    modalInfoSection: {
        gap: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    infoText: {
        fontSize: 16,
        color: '#374151',
        flex: 1,
    },
    modalActions: {
        marginTop: 24,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    modalCloseButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
        textAlign: 'center',
    },
    titleRow: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 8,
    },
    badge: {
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        paddingHorizontal: 6,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600' as const,
    },
});

export default ChatPage;
