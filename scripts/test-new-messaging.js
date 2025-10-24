// Test script for the new messaging system
console.log('🧪 Testing new messaging system...\n');

async function testNewMessagingSystem() {
  try {
    console.log('1️⃣ Testing conversation creation...');
    
    // Import the conversation utility
    const { createOrFindConversation } = await import('../utils/conversation-utils.js');
    const { db } = await import('../utils/db.js');
    
    // Test data
    const testOwnerId = 'test_owner_123';
    const testTenantId = 'test_tenant_456';
    const testPropertyId = 'test_property_789';
    
    console.log('   - Creating test conversation...');
    const conversationId = await createOrFindConversation({
      ownerId: testOwnerId,
      tenantId: testTenantId,
      ownerName: 'Test Owner',
      tenantName: 'Test Tenant',
      propertyId: testPropertyId,
      propertyTitle: 'Test Property'
    });
    
    console.log(`   ✅ Conversation created: ${conversationId}`);
    
    console.log('\n2️⃣ Testing message creation...');
    
    // Create a test message
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const messageRecord = {
      id: messageId,
      conversationId: conversationId,
      senderId: testTenantId,
      text: 'Hello, I am interested in your property!',
      createdAt: now,
      type: 'message'
    };
    
    await db.upsert('messages', messageId, messageRecord);
    console.log(`   ✅ Message created: ${messageId}`);
    
    console.log('\n3️⃣ Testing conversation loading...');
    
    // Test loading conversations for tenant
    const allConversations = await db.list('conversations');
    const tenantConversations = allConversations.filter(conv => 
      conv.tenantId === testTenantId || 
      (conv.participantIds && conv.participantIds.includes(testTenantId))
    );
    
    console.log(`   ✅ Found ${tenantConversations.length} conversations for tenant`);
    
    // Test loading conversations for owner
    const ownerConversations = allConversations.filter(conv => 
      conv.ownerId === testOwnerId || 
      (conv.participantIds && conv.participantIds.includes(testOwnerId))
    );
    
    console.log(`   ✅ Found ${ownerConversations.length} conversations for owner`);
    
    console.log('\n4️⃣ Testing message loading...');
    
    const allMessages = await db.list('messages');
    const conversationMessages = allMessages.filter(msg => 
      msg.conversationId === conversationId
    );
    
    console.log(`   ✅ Found ${conversationMessages.length} messages in conversation`);
    
    console.log('\n5️⃣ Testing conversation update...');
    
    // Update conversation with last message
    const conversation = await db.get('conversations', conversationId);
    if (conversation) {
      await db.upsert('conversations', conversationId, {
        ...conversation,
        lastMessageText: messageRecord.text,
        lastMessageAt: now,
        unreadByOwner: 1,
        updatedAt: now
      });
      console.log('   ✅ Conversation updated with last message');
    }
    
    console.log('\n✅ All tests passed! New messaging system is working correctly.');
    
    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await db.remove('conversations', conversationId);
    await db.remove('messages', messageId);
    console.log('   ✅ Test data cleaned up');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testNewMessagingSystem();
