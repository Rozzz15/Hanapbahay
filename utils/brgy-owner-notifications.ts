import { db, generateId } from './db';
import { MessageRecord, ConversationRecord, OwnerApplicationRecord, DbUserRecord } from '../types';

/**
 * Send a notification message from barangay official to owner about their application
 */
export async function sendOwnerApplicationNotification(
  application: OwnerApplicationRecord,
  brgyOfficialId: string,
  brgyOfficialName: string,
  message: string,
  notificationType: 'info' | 'request_documents' | 'clarification' | 'update' = 'info'
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    console.log('📧 Sending owner application notification:', {
      applicationId: application.id,
      ownerId: application.userId,
      notificationType,
      brgyOfficialId
    });

    // Get owner user record
    const ownerUser = await db.get<DbUserRecord>('users', application.userId);
    if (!ownerUser) {
      return {
        success: false,
        error: 'Owner user not found'
      };
    }

    // Create a special conversation between barangay and owner
    // We'll use a special format for barangay-owner conversations
    const conversationId = await createBrgyOwnerConversation({
      ownerId: application.userId,
      brgyOfficialId: brgyOfficialId,
      ownerName: application.name,
      brgyOfficialName: brgyOfficialName,
      barangay: application.barangay
    });

    // Build the notification message
    let messageText = '';
    const timestamp = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    switch (notificationType) {
      case 'request_documents':
        messageText = `📋 Document Request - ${timestamp}\n\n` +
          `Hello ${application.name},\n\n` +
          `We need additional documents or information to process your owner application.\n\n` +
          `${message}\n\n` +
          `Please submit the requested documents through the app or contact us directly.\n\n` +
          `Thank you,\n` +
          `${brgyOfficialName}\n` +
          `Barangay ${application.barangay}`;
        break;
      
      case 'clarification':
        messageText = `❓ Clarification Needed - ${timestamp}\n\n` +
          `Hello ${application.name},\n\n` +
          `We need some clarification regarding your owner application.\n\n` +
          `${message}\n\n` +
          `Please respond at your earliest convenience.\n\n` +
          `Thank you,\n` +
          `${brgyOfficialName}\n` +
          `Barangay ${application.barangay}`;
        break;
      
      case 'update':
        messageText = `📢 Application Update - ${timestamp}\n\n` +
          `Hello ${application.name},\n\n` +
          `We have an update regarding your owner application.\n\n` +
          `${message}\n\n` +
          `Thank you,\n` +
          `${brgyOfficialName}\n` +
          `Barangay ${application.barangay}`;
        break;
      
      default:
        messageText = `📬 Message from Barangay ${application.barangay} - ${timestamp}\n\n` +
          `Hello ${application.name},\n\n` +
          `${message}\n\n` +
          `Thank you,\n` +
          `${brgyOfficialName}\n` +
          `Barangay ${application.barangay}`;
    }

    // Create the message
    const messageId = generateId('msg');
    const now = new Date().toISOString();

    const messageRecord: MessageRecord = {
      id: messageId,
      conversationId,
      senderId: brgyOfficialId,
      text: messageText,
      createdAt: now,
      readBy: [brgyOfficialId],
      type: 'notification'
    };

    await db.upsert('messages', messageId, messageRecord);
    console.log('✅ Owner application notification sent');

    // Update conversation
    const conversation = await db.get<ConversationRecord>('conversations', conversationId);
    if (conversation) {
      // For notifications, we don't update lastMessageText to keep it clean
      await db.upsert('conversations', conversationId, {
        ...conversation,
        updatedAt: now
      });
    }

    return {
      success: true,
      messageId
    };
  } catch (error) {
    console.error('❌ Error sending owner application notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Create or find a conversation between barangay official and owner
 */
async function createBrgyOwnerConversation(data: {
  ownerId: string;
  brgyOfficialId: string;
  ownerName: string;
  brgyOfficialName: string;
  barangay: string;
}): Promise<string> {
  const { ownerId, brgyOfficialId, ownerName, brgyOfficialName, barangay } = data;
  
  try {
    console.log('💬 Creating or finding barangay-owner conversation:', { ownerId, brgyOfficialId });
    
    // Check if conversation already exists
    const existingConversations = await db.list('conversations');
    
    // Look for a conversation with both owner and barangay official
    const existingConversation = existingConversations.find(conv => {
      // Check if this is a barangay-owner conversation
      const hasOwner = (conv.owner_id === ownerId || conv.ownerId === ownerId) ||
                      (conv.participant_ids?.includes(ownerId) || conv.participantIds?.includes(ownerId));
      const hasBrgy = (conv.tenant_id === brgyOfficialId || conv.tenantId === brgyOfficialId) ||
                     (conv.participant_ids?.includes(brgyOfficialId) || conv.participantIds?.includes(brgyOfficialId));
      
      // Also check for special brgy_conversation flag
      const isBrgyConversation = (conv as any).isBrgyConversation === true;
      
      return hasOwner && hasBrgy && isBrgyConversation;
    });

    if (existingConversation) {
      console.log('✅ Found existing barangay-owner conversation:', existingConversation.id);
      return existingConversation.id;
    }

    // Create new conversation
    const conversationId = generateId('convo');
    const now = new Date().toISOString();

    const conversationRecord: any = {
      id: conversationId,
      ownerId: ownerId,
      tenantId: brgyOfficialId, // Use tenantId field for barangay official
      ownerName: ownerName,
      tenantName: brgyOfficialName, // Use tenantName field for barangay official
      participantIds: [ownerId, brgyOfficialId],
      lastMessageText: '',
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
      isBrgyConversation: true, // Mark as barangay conversation
      barangay: barangay
    };

    await db.upsert('conversations', conversationId, conversationRecord);
    console.log('✅ Created new barangay-owner conversation:', conversationId);

    return conversationId;
  } catch (error) {
    console.error('❌ Error creating barangay-owner conversation:', error);
    throw error;
  }
}

/**
 * Send approval notification to owner
 */
export async function sendOwnerApprovalNotification(
  application: OwnerApplicationRecord,
  brgyOfficialId: string,
  brgyOfficialName: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const message = `🎉 Congratulations! Your owner application has been approved!\n\n` +
    `You can now access your owner dashboard and start creating property listings.\n\n` +
    `Welcome to HanapBahay!`;

  return sendOwnerApplicationNotification(
    application,
    brgyOfficialId,
    brgyOfficialName,
    message,
    'update'
  );
}

/**
 * Send rejection notification to owner
 */
export async function sendOwnerRejectionNotification(
  application: OwnerApplicationRecord,
  brgyOfficialId: string,
  brgyOfficialName: string,
  reason?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const reasonText = reason ? `\nReason: ${reason}\n\n` : '\n\n';
  const message = `We regret to inform you that your owner application has been rejected.${reasonText}` +
    `If you have any questions or would like to appeal this decision, please contact us.`;

  return sendOwnerApplicationNotification(
    application,
    brgyOfficialId,
    brgyOfficialName,
    message,
    'update'
  );
}

