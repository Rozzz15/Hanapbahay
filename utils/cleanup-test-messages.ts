import { db } from './db';

/**
 * Clean up test messages and conversations from the database
 * This function removes any test/sample data that might have been created during development
 */
export const cleanupTestMessages = async (): Promise<{
  success: boolean;
  removedConversations: number;
  removedMessages: number;
  errors: string[];
}> => {
  const errors: string[] = [];
  let removedConversations = 0;
  let removedMessages = 0;

  try {
    console.log('🧹 Starting cleanup of test messages and conversations...');

    // Get all conversations and messages
    const allConversations = await db.list('conversations');
    const allMessages = await db.list('messages');

    console.log(`📊 Found ${allConversations.length} conversations and ${allMessages.length} messages`);

    // Remove test conversations (those with test_conv prefix or sample data)
    const testConversationIds: string[] = [];
    
    for (const conv of allConversations) {
      const isTestConversation = 
        conv.id.startsWith('test_conv_') ||
        conv.id.startsWith('conv_sample_') ||
        conv.id.includes('test') ||
        (conv.lastMessageText && conv.lastMessageText.includes('Test message'));

      if (isTestConversation) {
        testConversationIds.push(conv.id);
      }
    }

    // Remove test messages (those with test_msg prefix or test content)
    const testMessageIds: string[] = [];
    
    for (const message of allMessages) {
      const isTestMessage = 
        message.id.startsWith('test_msg_') ||
        message.id.includes('test') ||
        (message.text && (
          message.text.includes('Test message') ||
          message.text.includes('test message') ||
          message.text.includes('Hi! I\'m interested in your Modern 2-Bedroom Apartment') ||
          message.text.includes('Thank you for your interest! When would you like to schedule a viewing?')
        ));

      if (isTestMessage) {
        testMessageIds.push(message.id);
      }
    }

    // Remove test conversations
    for (const convId of testConversationIds) {
      try {
        await db.remove('conversations', convId);
        removedConversations++;
        console.log(`🗑️ Removed test conversation: ${convId}`);
      } catch (error) {
        const errorMsg = `Failed to remove conversation ${convId}: ${error}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    // Remove test messages
    for (const msgId of testMessageIds) {
      try {
        await db.remove('messages', msgId);
        removedMessages++;
        console.log(`🗑️ Removed test message: ${msgId}`);
      } catch (error) {
        const errorMsg = `Failed to remove message ${msgId}: ${error}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    // Also clean up any orphaned messages (messages without valid conversations)
    const remainingConversations = await db.list('conversations');
    const remainingMessages = await db.list('messages');
    
    const orphanedMessages: string[] = [];
    for (const message of remainingMessages) {
      const conversationId = message.conversationId || message.conversation_id;
      const hasValidConversation = remainingConversations.some(conv => conv.id === conversationId);
      
      if (!hasValidConversation) {
        orphanedMessages.push(message.id);
      }
    }

    // Remove orphaned messages
    for (const msgId of orphanedMessages) {
      try {
        await db.remove('messages', msgId);
        removedMessages++;
        console.log(`🗑️ Removed orphaned message: ${msgId}`);
      } catch (error) {
        const errorMsg = `Failed to remove orphaned message ${msgId}: ${error}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    const success = errors.length === 0;
    console.log(`✅ Cleanup completed: ${removedConversations} conversations and ${removedMessages} messages removed`);

    return {
      success,
      removedConversations,
      removedMessages,
      errors
    };

  } catch (error) {
    const errorMsg = `Cleanup failed: ${error}`;
    errors.push(errorMsg);
    console.error(`❌ ${errorMsg}`);
    
    return {
      success: false,
      removedConversations,
      removedMessages,
      errors
    };
  }
};

/**
 * Check if there are any test messages in the database
 */
export const hasTestMessages = async (): Promise<boolean> => {
  try {
    const allConversations = await db.list('conversations');
    const allMessages = await db.list('messages');

    // Check for test conversations
    const hasTestConversations = allConversations.some(conv => 
      conv.id.startsWith('test_conv_') ||
      conv.id.startsWith('conv_sample_') ||
      conv.id.includes('test')
    );

    // Check for test messages
    const hasTestMessages = allMessages.some(message => 
      message.id.startsWith('test_msg_') ||
      message.id.includes('test') ||
      (message.text && message.text.includes('Test message'))
    );

    return hasTestConversations || hasTestMessages;
  } catch (error) {
    console.error('❌ Error checking for test messages:', error);
    return false;
  }
};
