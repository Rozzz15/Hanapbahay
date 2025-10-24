// Test script to verify owner-tenant messaging connection
const { db } = require('../utils/db');

async function testOwnerTenantConnection() {
  try {
    console.log('🧪 Testing owner-tenant messaging connection...');
    
    // Get all users
    const users = await db.list('users');
    console.log('👥 Total users:', users.length);
    
    // Find owner and tenant users
    const owners = users.filter(u => u.role === 'owner');
    const tenants = users.filter(u => u.role === 'tenant');
    
    console.log('👑 Owner users:', owners.map(o => ({ id: o.id, name: o.name, role: o.role })));
    console.log('🏠 Tenant users:', tenants.map(t => ({ id: t.id, name: t.name, role: t.role })));
    
    // Get all conversations
    const conversations = await db.list('conversations');
    console.log('💬 Total conversations:', conversations.length);
    
    // Get all messages
    const messages = await db.list('messages');
    console.log('📨 Total messages:', messages.length);
    
    // Test conversation structure
    if (conversations.length > 0) {
      console.log('\n📊 Sample conversation structure:');
      const sampleConv = conversations[0];
      console.log('  ID:', sampleConv.id);
      console.log('  Owner ID:', sampleConv.ownerId || sampleConv.owner_id || 'N/A');
      console.log('  Tenant ID:', sampleConv.tenantId || sampleConv.tenant_id || 'N/A');
      console.log('  Participants:', sampleConv.participantIds || sampleConv.participant_ids || 'N/A');
      console.log('  Last Message:', sampleConv.lastMessageText || sampleConv.last_message_text || 'N/A');
      console.log('  Unread by Owner:', sampleConv.unreadByOwner || sampleConv.unread_by_owner || 0);
      console.log('  Unread by Tenant:', sampleConv.unreadByTenant || sampleConv.unread_by_tenant || 0);
    }
    
    // Test message structure
    if (messages.length > 0) {
      console.log('\n📨 Sample message structure:');
      const sampleMsg = messages[0];
      console.log('  ID:', sampleMsg.id);
      console.log('  Conversation ID:', sampleMsg.conversationId || sampleMsg.conversation_id || 'N/A');
      console.log('  Sender ID:', sampleMsg.senderId || sampleMsg.sender_id || 'N/A');
      console.log('  Text:', sampleMsg.text || 'N/A');
      console.log('  Created At:', sampleMsg.createdAt || sampleMsg.created_at || 'N/A');
    }
    
    // Test owner message loading logic
    if (owners.length > 0) {
      const ownerId = owners[0].id;
      console.log(`\n🔍 Testing message loading for owner: ${ownerId}`);
      
      // Find conversations where this owner is involved
      const ownerConversations = conversations.filter(conv => {
        const isOwner = conv.ownerId === ownerId || conv.owner_id === ownerId;
        const isParticipant = (conv.participantIds && conv.participantIds.includes(ownerId)) || 
                            (conv.participant_ids && conv.participant_ids.includes(ownerId));
        return isOwner || isParticipant;
      });
      
      console.log(`  Found ${ownerConversations.length} conversations for this owner`);
      
      // Find messages in these conversations
      const ownerMessages = messages.filter(msg => {
        const conversationId = msg.conversationId || msg.conversation_id;
        return ownerConversations.some(conv => conv.id === conversationId);
      });
      
      console.log(`  Found ${ownerMessages.length} messages in these conversations`);
      
      // Show conversation details
      ownerConversations.forEach((conv, index) => {
        console.log(`\n  Conversation ${index + 1}:`);
        console.log(`    ID: ${conv.id}`);
        console.log(`    Owner ID: ${conv.ownerId || conv.owner_id || 'N/A'}`);
        console.log(`    Tenant ID: ${conv.tenantId || conv.tenant_id || 'N/A'}`);
        console.log(`    Last Message: "${conv.lastMessageText || conv.last_message_text || 'N/A'}"`);
        console.log(`    Unread by Owner: ${conv.unreadByOwner || conv.unread_by_owner || 0}`);
      });
    }
    
    console.log('\n✅ Connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
  }
}

testOwnerTenantConnection();
