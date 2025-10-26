import { db, generateId } from './db';
import { ConversationRecord } from '../types';

export interface CreateConversationData {
  ownerId: string;
  tenantId: string;
  ownerName?: string;
  tenantName?: string;
  propertyId?: string;
  propertyTitle?: string;
}

/**
 * Creates a new conversation between an owner and tenant
 * Handles checking for existing conversations and creating new ones
 */
export async function createOrFindConversation(data: CreateConversationData): Promise<string> {
  const { ownerId, tenantId, ownerName, tenantName, propertyId, propertyTitle } = data;
  
  try {
    console.log('💬 Creating or finding conversation:', { ownerId, tenantId, propertyId });
    
    // Check if conversation already exists
    const existingConversations = await db.list('conversations');
    
    const existingConversation = existingConversations.find(conv => {
      const tenantMatch = (conv.tenant_id === tenantId || conv.tenantId === tenantId);
      const ownerMatch = (conv.owner_id === ownerId || conv.ownerId === ownerId);
      
      // Also check participant IDs as fallback
      const participantMatch = (conv.participant_ids?.includes(ownerId) && 
                              conv.participant_ids?.includes(tenantId)) ||
                             (conv.participantIds?.includes(ownerId) && 
                              conv.participantIds?.includes(tenantId));
      
      const isMatchingConversation = (tenantMatch && ownerMatch) || participantMatch;
      
      // If propertyId is provided, optionally match by property as well
      if (isMatchingConversation && propertyId) {
        const convPropertyId = conv.propertyId || conv.property_id;
        // If both have propertyId, they should match
        // If one doesn't have propertyId, still match (for backward compatibility)
        return convPropertyId === undefined || convPropertyId === propertyId || convPropertyId === '';
      }
      
      return isMatchingConversation;
    });

    if (existingConversation) {
      console.log('✅ Found existing conversation:', existingConversation.id);
      return existingConversation.id;
    }

    // Create new conversation
    const conversationId = generateId('convo');
    const now = new Date().toISOString();
    
    const conversationData: ConversationRecord = {
      id: conversationId,
      tenantId: tenantId,
      ownerId: ownerId,
      participantIds: [ownerId, tenantId],
      lastMessageText: '',
      lastMessageAt: now,
      unreadByOwner: 0,
      unreadByTenant: 0,
      createdAt: now,
      updatedAt: now,
      ...(propertyId && { propertyId }),
      ...(propertyTitle && { propertyTitle })
    };

    console.log('💬 Creating new conversation:', conversationData);
    await db.upsert('conversations', conversationId, conversationData);
    console.log('✅ Created new conversation:', conversationId);
    
    return conversationId;
  } catch (error) {
    console.error('❌ Error creating/finding conversation:', error);
    throw error;
  }
}

/**
 * Gets all conversations for a user (both as owner and tenant)
 */
export async function getUserConversations(userId: string): Promise<ConversationRecord[]> {
  try {
    const allConversations = await db.list('conversations');
    
    return allConversations.filter(conv => {
      const isOwner = conv.ownerId === userId || conv.owner_id === userId;
      const isTenant = conv.tenantId === userId || conv.tenant_id === userId;
      const isParticipant = (conv.participantIds && conv.participantIds.includes(userId)) || 
                           (conv.participant_ids && conv.participant_ids.includes(userId));
      
      return isOwner || isTenant || isParticipant;
    }).map(conv => ({
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
    }));
  } catch (error) {
    console.error('❌ Error getting user conversations:', error);
    return [];
  }
}

/**
 * Gets the other participant in a conversation
 */
export async function getConversationOtherParticipant(
  conversationId: string, 
  currentUserId: string
): Promise<{ id: string; name: string; role: 'owner' | 'tenant' } | null> {
  try {
    const conversation = await db.get('conversations', conversationId);
    if (!conversation) return null;

    const normalizedConv = {
      ownerId: conversation.ownerId || conversation.owner_id || '',
      tenantId: conversation.tenantId || conversation.tenant_id || '',
    };

    const isOwner = currentUserId === normalizedConv.ownerId;
    const otherUserId = isOwner ? normalizedConv.tenantId : normalizedConv.ownerId;
    const otherRole = isOwner ? 'tenant' : 'owner';

    // Get other user's details
    const otherUser = await db.get('users', otherUserId);
    if (!otherUser) return null;

    let displayName = (otherUser as any).name || `${otherRole.charAt(0).toUpperCase() + otherRole.slice(1)}`;

    // For owners, try to get business name
    if (otherRole === 'owner') {
      try {
        const ownerProfile = await db.get('owner_profiles', otherUserId);
        if (ownerProfile && (ownerProfile as any).businessName) {
          displayName = (ownerProfile as any).businessName;
        }
      } catch (error) {
        // Fallback to user name
      }
    }

    return {
      id: otherUserId,
      name: displayName,
      role: otherRole
    };
  } catch (error) {
    console.error('❌ Error getting conversation other participant:', error);
    return null;
  }
}
