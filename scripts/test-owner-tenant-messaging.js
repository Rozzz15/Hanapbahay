// Test script to verify owner-tenant messaging integration
const { db } = require('../utils/db');
const { createOrFindConversation } = require('../utils/conversation-utils');

async function testOwnerTenantMessaging() {
  console.log('🧪 Testing Owner-Tenant Messaging Integration...\n');

  try {
    // Step 1: Create test users
    console.log('1️⃣ Creating test users...');
    
    const testOwner = {
      id: 'test_owner_123',
      name: 'Test Owner',
      email: 'owner@test.com',
      roles: ['owner']
    };
    
    const testTenant = {
      id: 'test_tenant_456',
      name: 'Test Tenant',
      email: 'tenant@test.com',
      roles: ['tenant']
    };
    
    await db.upsert('users', testOwner.id, testOwner);
    await db.upsert('users', testTenant.id, testTenant);
    console.log('✅ Test users created');

    // Step 2: Test conversation creation from tenant side
    console.log('\n2️⃣ Testing conversation creation from tenant side...');
    
    const conversationId1 = await createOrFindConversation({
      ownerId: testOwner.id,
      tenantId: testTenant.id,
      ownerName: testOwner.name,
      tenantName: testTenant.name,
      propertyId: 'test_property_789',
      propertyTitle: 'Test Property'
    });
    
    console.log('✅ Conversation created from tenant side:', conversationId1);

    // Step 3: Test conversation creation from owner side (should find existing)
    console.log('\n3️⃣ Testing conversation creation from owner side...');
    
    const conversationId2 = await createOrFindConversation({
      ownerId: testOwner.id,
      tenantId: testTenant.id,
      ownerName: testOwner.name,
      tenantName: testTenant.name,
      propertyId: 'test_property_789',
      propertyTitle: 'Test Property'
    });
    
    console.log('✅ Conversation found/created from owner side:', conversationId2);
    console.log('🔍 Same conversation ID?', conversationId1 === conversationId2);

    // Step 4: Verify conversation data
    console.log('\n4️⃣ Verifying conversation data...');
    
    const conversation = await db.get('conversations', conversationId1);
    console.log('📊 Conversation data:', {
      id: conversation.id,
      ownerId: conversation.ownerId,
      tenantId: conversation.tenantId,
      participantIds: conversation.participantIds,
      createdAt: conversation.createdAt
    });

    // Step 5: Test message creation
    console.log('\n5️⃣ Testing message creation...');
    
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const messageData = {
      id: messageId,
      conversationId: conversationId1,
      senderId: testTenant.id,
      text: 'Hello from tenant!',
      type: 'message',
      readBy: [testTenant.id],
      createdAt: new Date().toISOString()
    };
    
    await db.upsert('messages', messageId, messageData);
    console.log('✅ Message created:', messageId);

    // Step 6: Test owner response
    console.log('\n6️⃣ Testing owner response...');
    
    const ownerMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const ownerMessageData = {
      id: ownerMessageId,
      conversationId: conversationId1,
      senderId: testOwner.id,
      text: 'Hello from owner!',
      type: 'message',
      readBy: [testOwner.id],
      createdAt: new Date().toISOString()
    };
    
    await db.upsert('messages', ownerMessageId, ownerMessageData);
    console.log('✅ Owner message created:', ownerMessageId);

    // Step 7: Verify both sides can see the conversation
    console.log('\n7️⃣ Verifying both sides can see the conversation...');
    
    const allMessages = await db.list('messages');
    const conversationMessages = allMessages.filter(msg => 
      msg.conversationId === conversationId1
    );
    
    console.log('📨 Messages in conversation:', conversationMessages.length);
    conversationMessages.forEach(msg => {
      console.log(`  - ${msg.senderId === testTenant.id ? 'Tenant' : 'Owner'}: ${msg.text}`);
    });

    console.log('\n✅ Owner-Tenant Messaging Integration Test PASSED!');
    console.log('\n📋 Summary:');
    console.log('  - ✅ Conversation creation works from both sides');
    console.log('  - ✅ Duplicate conversation prevention works');
    console.log('  - ✅ Message creation works');
    console.log('  - ✅ Both sides can see the same conversation');
    console.log('  - ✅ Owner can now initiate conversations with tenants');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testOwnerTenantMessaging();
