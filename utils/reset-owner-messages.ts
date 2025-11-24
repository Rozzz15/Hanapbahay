import { db, generateId } from './db';
import { ConversationRecord, MessageRecord } from '../types';

/**
 * Removes all messages and conversations for a specific owner
 * and recreates them with proper tenant connections
 */
export async function resetOwnerMessages(ownerId: string): Promise<{
  success: boolean;
  removedConversations: number;
  removedMessages: number;
  recreatedConversations: number;
  message: string;
}> {
  try {
    console.log('🔄 Starting message reset for owner:', ownerId);
    
    // Get all conversations
    const allConversations = await db.list('conversations') || [];
    
    // Find conversations for this owner
    const ownerConversations = allConversations.filter((conv: any) => {
      const convOwnerId = conv.ownerId || conv.owner_id;
      const participantIds = conv.participantIds || conv.participant_ids || [];
      return convOwnerId === ownerId || participantIds.includes(ownerId);
    });
    
    console.log(`📊 Found ${ownerConversations.length} conversations for owner`);
    
    // Get all messages
    const allMessages = await db.list('messages') || [];
    
    // Find messages in owner's conversations
    const ownerConversationIds = new Set(ownerConversations.map((c: any) => c.id));
    const messagesToRemove = allMessages.filter((msg: any) => {
      const msgConversationId = msg.conversationId || msg.conversation_id;
      return ownerConversationIds.has(msgConversationId);
    });
    
    console.log(`📨 Found ${messagesToRemove.length} messages to remove`);
    
    // Remove all messages
    let removedMessages = 0;
    for (const message of messagesToRemove) {
      try {
        await db.remove('messages', (message as any).id);
        removedMessages++;
      } catch (error) {
        console.error('Error removing message:', (message as any).id, error);
      }
    }
    
    // Remove all conversations
    let removedConversations = 0;
    for (const conversation of ownerConversations) {
      try {
        await db.remove('conversations', (conversation as any).id);
        removedConversations++;
      } catch (error) {
        console.error('Error removing conversation:', (conversation as any).id, error);
      }
    }
    
    console.log(`✅ Removed ${removedMessages} messages and ${removedConversations} conversations`);
    
    // Get all bookings to recreate conversations from
    const allBookings = await db.list('bookings') || [];
    const ownerBookings = allBookings.filter((booking: any) => {
      const bookingOwnerId = booking.ownerId || booking.owner_id;
      return bookingOwnerId === ownerId && booking.status === 'approved';
    });
    
    console.log(`📋 Found ${ownerBookings.length} approved bookings to recreate conversations from`);
    
    // Recreate conversations from bookings
    let recreatedConversations = 0;
    for (const booking of ownerBookings) {
      try {
        const bookingOwnerId = booking.ownerId || booking.owner_id;
        const bookingTenantId = booking.tenantId || booking.tenant_id;
        
        if (!bookingTenantId) {
          console.warn('⚠️ Booking missing tenantId:', booking.id);
          continue;
        }
        
        // Get tenant details
        const tenant = await db.get('users', bookingTenantId);
        if (!tenant) {
          console.warn('⚠️ Tenant not found:', bookingTenantId);
          continue;
        }
        
        // Get property details
        const propertyId = booking.propertyId || booking.property_id;
        let propertyTitle = booking.propertyTitle || booking.property_title || 'Property';
        if (propertyId) {
          const property = await db.get('published_listings', propertyId);
          if (property) {
            propertyTitle = (property as any).title || (property as any).propertyType || propertyTitle;
          }
        }
        
        // Create new conversation
        const conversationId = generateId('convo');
        const now = new Date().toISOString();
        
        const conversationData: ConversationRecord = {
          id: conversationId,
          ownerId: bookingOwnerId,
          tenantId: bookingTenantId,
          participantIds: [bookingOwnerId, bookingTenantId],
          lastMessageText: '',
          lastMessageAt: now,
          unreadByOwner: 0,
          unreadByTenant: 0,
          createdAt: now,
          updatedAt: now,
          ...(propertyId && { propertyId }),
          ...(propertyTitle && { propertyTitle })
        };
        
        await db.upsert('conversations', conversationId, conversationData);
        recreatedConversations++;
        
        console.log(`✅ Recreated conversation for tenant: ${(tenant as any).name || bookingTenantId}`);
      } catch (error) {
        console.error('Error recreating conversation for booking:', booking.id, error);
      }
    }
    
    return {
      success: true,
      removedConversations,
      removedMessages,
      recreatedConversations,
      message: `Successfully reset messages. Removed ${removedConversations} conversations and ${removedMessages} messages. Recreated ${recreatedConversations} conversations from approved bookings.`
    };
  } catch (error) {
    console.error('❌ Error resetting owner messages:', error);
    return {
      success: false,
      removedConversations: 0,
      removedMessages: 0,
      recreatedConversations: 0,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Removes all messages for a specific owner (keeps conversations)
 */
export async function clearOwnerMessages(ownerId: string): Promise<{
  success: boolean;
  removedMessages: number;
  message: string;
}> {
  try {
    console.log('🔄 Clearing messages for owner:', ownerId);
    
    // Get all conversations
    const allConversations = await db.list('conversations') || [];
    
    // Find conversations for this owner
    const ownerConversations = allConversations.filter((conv: any) => {
      const convOwnerId = conv.ownerId || conv.owner_id;
      const participantIds = conv.participantIds || conv.participant_ids || [];
      return convOwnerId === ownerId || participantIds.includes(ownerId);
    });
    
    // Get all messages
    const allMessages = await db.list('messages') || [];
    
    // Find messages in owner's conversations
    const ownerConversationIds = new Set(ownerConversations.map((c: any) => c.id));
    const messagesToRemove = allMessages.filter((msg: any) => {
      const msgConversationId = msg.conversationId || msg.conversation_id;
      return ownerConversationIds.has(msgConversationId);
    });
    
    // Remove all messages
    let removedMessages = 0;
    for (const message of messagesToRemove) {
      try {
        await db.remove('messages', (message as any).id);
        removedMessages++;
      } catch (error) {
        console.error('Error removing message:', (message as any).id, error);
      }
    }
    
    // Update conversations to clear last message
    for (const conversation of ownerConversations) {
      try {
        await db.upsert('conversations', (conversation as any).id, {
          ...conversation,
          lastMessageText: '',
          lastMessageAt: (conversation as any).createdAt || new Date().toISOString(),
          unreadByOwner: 0,
          unreadByTenant: 0,
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error updating conversation:', (conversation as any).id, error);
      }
    }
    
    return {
      success: true,
      removedMessages,
      message: `Successfully cleared ${removedMessages} messages for owner.`
    };
  } catch (error) {
    console.error('❌ Error clearing owner messages:', error);
    return {
      success: false,
      removedMessages: 0,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}


