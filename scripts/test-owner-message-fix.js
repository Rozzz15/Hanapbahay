const { db } = require('../utils/db');

async function testOwnerMessageFix() {
  try {
    console.log('🧪 Testing owner message loading fix...');
    
    // Get all conversations
    const conversations = await db.list('conversations');
    console.log('📊 Total conversations:', conversations.length);
    
    // Get all messages
    const messages = await db.list('messages');
    console.log('📊 Total messages:', messages.length);
    
    // Get all users
    const users = await db.list('users');
    console.log('📊 Total users:', users.length);
    
    // Find owner users
    const owners = users.filter(u => u.role === 'owner');
    console.log('👑 Owner users:', owners.map(o => ({ id: o.id, name: o.name, role: o.role })));
    
    // Find tenant users
    const tenants = users.filter(u => u.role === 'tenant');
    console.log('🏠 Tenant users:', tenants.map(t => ({ id: t.id, name: t.name, role: t.role })));
    
    // Test the fixed getOwnerMessages function
    if (owners.length > 0) {
      const ownerId = owners[0].id;
      console.log(`\n🔍 Testing getOwnerMessages for owner: ${ownerId}`);
      
      // Import the fixed function
      const { getOwnerMessages } = require('../utils/owner-dashboard');
      const ownerMessages = await getOwnerMessages(ownerId);
      
      console.log(`📨 Owner messages found: ${ownerMessages.length}`);
      ownerMessages.forEach((msg, index) => {
        console.log(`  ${index + 1}. From: ${msg.tenantName}, Text: "${msg.text}", Time: ${msg.createdAt}`);
      });
    }
    
    // Show conversation details
    console.log('\n💬 Conversation details:');
    conversations.forEach((conv, index) => {
      console.log(`  ${index + 1}. ID: ${conv.id}`);
      console.log(`     Owner ID: ${conv.ownerId || conv.owner_id || 'N/A'}`);
      console.log(`     Tenant ID: ${conv.tenantId || conv.tenant_id || 'N/A'}`);
      console.log(`     Participants: ${JSON.stringify(conv.participantIds || conv.participant_ids || [])}`);
      console.log(`     Last Message: "${conv.lastMessageText || conv.last_message_text || 'N/A'}"`);
      console.log('');
    });
    
    // Show message details
    console.log('\n📨 Message details:');
    messages.forEach((msg, index) => {
      console.log(`  ${index + 1}. ID: ${msg.id}`);
      console.log(`     Conversation ID: ${msg.conversationId || msg.conversation_id || 'N/A'}`);
      console.log(`     Sender ID: ${msg.senderId || msg.sender_id || 'N/A'}`);
      console.log(`     Text: "${msg.text}"`);
      console.log(`     Time: ${msg.createdAt || msg.created_at || 'N/A'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testOwnerMessageFix();
