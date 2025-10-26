import { db, generateId } from './db';
import { MessageRecord, ConversationRecord } from '@/types';
import { createOrFindConversation } from './conversation-utils';
import { showAlert } from './alert';

interface PaymentAccount {
  id: string;
  ownerId: string;
  type: 'gcash' | 'paymaya' | 'bank_transfer' | 'cash';
  accountName: string;
  accountNumber: string;
  accountDetails: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get active payment accounts for an owner
 */
async function getPaymentAccountsByOwner(ownerId: string): Promise<PaymentAccount[]> {
  try {
    console.log('💳 Loading payment accounts for owner:', ownerId);
    
    const allAccounts = await db.list<PaymentAccount>('payment_accounts');
    const ownerAccounts = allAccounts.filter(
      account => account.ownerId === ownerId && account.isActive
    );
    
    console.log(`✅ Found ${ownerAccounts.length} active payment accounts`);
    return ownerAccounts;
  } catch (error) {
    console.error('❌ Error loading payment accounts:', error);
    return [];
  }
}

/**
 * Format payment account information into a readable message
 */
function formatPaymentDetails(accounts: PaymentAccount[]): string {
  if (accounts.length === 0) {
    return '';
  }

  let paymentInfo = '\n\n📋 Payment Details:\n';
  
  accounts.forEach(account => {
    const typeEmoji = {
      'gcash': '💚',
      'paymaya': '💳',
      'bank_transfer': '🏦',
      'cash': '💵'
    }[account.type] || '💳';
    
    const typeName = {
      'gcash': 'GCash',
      'paymaya': 'PayMaya',
      'bank_transfer': 'Bank Transfer',
      'cash': 'Cash'
    }[account.type] || account.type;
    
    paymentInfo += `\n${typeEmoji} ${typeName}:\n`;
    paymentInfo += `   Account Name: ${account.accountName}\n`;
    paymentInfo += `   Account Number: ${account.accountNumber}\n`;
    if (account.accountDetails) {
      paymentInfo += `   Details: ${account.accountDetails}\n`;
    }
  });
  
  return paymentInfo;
}

/**
 * Send a booking approval notification to the tenant with payment information
 */
export async function sendBookingApprovalNotification(
  bookingId: string,
  ownerId: string,
  tenantId: string,
  propertyTitle: string
): Promise<void> {
  try {
    console.log('📧 Sending booking approval notification:', {
      bookingId,
      ownerId,
      tenantId,
      propertyTitle
    });

    // Get owner's payment accounts
    const paymentAccounts = await getPaymentAccountsByOwner(ownerId);
    
    // Build the notification message
    let messageText = `🎉 Congratulations! Your booking for "${propertyTitle}" has been approved!\n\n`;
    messageText += `Please proceed with the payment using the details below.`;
    
    // Add payment details if available
    if (paymentAccounts.length > 0) {
      messageText += formatPaymentDetails(paymentAccounts);
    } else {
      messageText += '\n\n⚠️ No payment details available. Please contact the owner directly.';
    }
    
    messageText += '\n\nOnce payment is completed, please let the owner know and coordinate your move-in.';
    messageText += '\n\nThank you for choosing our property!';

    // Create or find the conversation
    const conversationId = await createOrFindConversation({
      ownerId,
      tenantId
    });

    // Send the message
    const messageId = generateId('msg');
    const now = new Date().toISOString();

    const messageRecord: MessageRecord = {
      id: messageId,
      conversationId,
      senderId: ownerId,
      text: messageText,
      createdAt: now,
      readBy: [ownerId],
      type: 'message'
    };

    // Save message
    await db.upsert('messages', messageId, messageRecord);
    console.log('✅ Booking approval message saved');

    // Update conversation
    const conversation = await db.get<ConversationRecord>('conversations', conversationId);
    if (conversation) {
      await db.upsert('conversations', conversationId, {
        ...conversation,
        lastMessageText: messageText.substring(0, 100), // First 100 chars for preview
        lastMessageAt: now,
        unreadByTenant: (conversation.unreadByTenant || 0) + 1,
        updatedAt: now
      });
      console.log('✅ Conversation updated');
    }

    console.log('✅ Booking approval notification sent successfully');
  } catch (error) {
    console.error('❌ Error sending booking approval notification:', error);
    // Don't throw - we don't want to prevent booking approval if notification fails
  }
}

/**
 * Send a booking rejection notification to the tenant
 */
export async function sendBookingRejectionNotification(
  bookingId: string,
  ownerId: string,
  tenantId: string,
  propertyTitle: string
): Promise<void> {
  try {
    console.log('📧 Sending booking rejection notification:', {
      bookingId,
      ownerId,
      tenantId,
      propertyTitle
    });

    // Build the notification message
    const messageText = `❌ Your booking for "${propertyTitle}" has been declined.\n\nWe're sorry, but your booking request could not be approved at this time.\n\nIf you have any questions, please feel free to message us.`;

    // Create or find the conversation
    const conversationId = await createOrFindConversation({
      ownerId,
      tenantId
    });

    // Send the message
    const messageId = generateId('msg');
    const now = new Date().toISOString();

    const messageRecord: MessageRecord = {
      id: messageId,
      conversationId,
      senderId: ownerId,
      text: messageText,
      createdAt: now,
      readBy: [ownerId],
      type: 'message'
    };

    // Save message
    await db.upsert('messages', messageId, messageRecord);
    console.log('✅ Booking rejection message saved');

    // Update conversation
    const conversation = await db.get<ConversationRecord>('conversations', conversationId);
    if (conversation) {
      await db.upsert('conversations', conversationId, {
        ...conversation,
        lastMessageText: messageText.substring(0, 100),
        lastMessageAt: now,
        unreadByTenant: (conversation.unreadByTenant || 0) + 1,
        updatedAt: now
      });
      console.log('✅ Conversation updated');
    }

    console.log('✅ Booking rejection notification sent successfully');
  } catch (error) {
    console.error('❌ Error sending booking rejection notification:', error);
    // Don't throw - we don't want to prevent booking rejection if notification fails
  }
}

