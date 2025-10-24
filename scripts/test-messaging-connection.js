const { db } = require('./utils/db');

async function testMessagingConnection() {
  console.log('🧪 Starting messaging connection test...\n');

  try {
    // Step 1: Check existing data
    console.log('📊 Step 1: Checking existing data...');
    const allUsers = await db.list('users');
    const allConversations = await db.list('conversations');
    const allMessages = await db.list('messages');
    const allListings = await db.list('published_listings');

    console.log(`👥 Total users: ${allUsers.length}`);
    console.log(`💬 Total conversations: ${allConversations.length}`);
    console.log(`📨 Total messages: ${allMessages.length}`);
    console.log(`🏠 Total listings: ${allListings.length}\n`);

    // Step 2: Find tenant and owner users
    console.log('🔍 Step 2: Finding tenant and owner users...');
    const owners = allUsers.filter(user => {
      const hasListings = allListings.some(listing => listing.userId === user.id);
      return hasListings || user.roles?.includes('owner');
    });

    const tenants = allUsers.filter(user => {
      const hasListings = allListings.some(listing => listing.userId === user.id);
      return !hasListings && !user.roles?.includes('owner');
    });

    console.log(`🏢 Found ${owners.length} owners:`);
    owners.forEach(owner => {
      const ownerListings = allListings.filter(listing => listing.userId === owner.id);
      console.log(`  - ${owner.name} (${owner.id}) - ${ownerListings.length} listings`);
    });

    console.log(`\n👤 Found ${tenants.length} tenants:`);
    tenants.forEach(tenant => {
      console.log(`  - ${tenant.name} (${tenant.id})`);
    });

    if (owners.length === 0 || tenants.length === 0) {
      console.log('❌ Need at least one owner and one tenant to test messaging');
      return;
    }

    // Step 3: Test conversation creation
    console.log('\n🧪 Step 3: Testing conversation creation...');
    const testOwner = owners[0];
    const testTenant = tenants[0];
    const testListing = allListings.find(listing => listing.userId === testOwner.id);

    console.log(`Testing with:`);
    console.log(`  Owner: ${testOwner.name} (${testOwner.id})`);
    console.log(`  Tenant: ${testTenant.name} (${testTenant.id})`);
    console.log(`  Listing: ${testListing?.title || 'No listing'} (${testListing?.id || 'N/A'})\n`);

    // Check if conversation already exists
    const existingConversation = allConversations.find(conv => {
      const hasOwner = conv.ownerId === testOwner.id || conv.owner_id === testOwner.id;
      const hasTenant = conv.tenantId === testTenant.id || conv.tenant_id === testTenant.id;
      const hasParticipants = (conv.participantIds && conv.participantIds.includes(testOwner.id) && conv.participantIds.includes(testTenant.id)) ||
                             (conv.participant_ids && conv.participant_ids.includes(testOwner.id) && conv.participant_ids.includes(testTenant.id));
      return hasOwner && hasTenant || hasParticipants;
    });

    if (existingConversation) {
      console.log(`✅ Found existing conversation: ${existingConversation.id}`);
      console.log(`   Owner ID: ${existingConversation.ownerId || existingConversation.owner_id}`);
      console.log(`   Tenant ID: ${existingConversation.tenantId || existingConversation.tenant_id}`);
      console.log(`   Participants: ${JSON.stringify(existingConversation.participantIds || existingConversation.participant_ids)}`);
    } else {
      console.log('❌ No existing conversation found between tenant and owner');
    }

    // Step 4: Test message flow
    console.log('\n📨 Step 4: Testing message flow...');
    const conversationId = existingConversation?.id;
    
    if (conversationId) {
      const conversationMessages = allMessages.filter(msg => 
        msg.conversationId === conversationId || msg.conversation_id === conversationId
      );
      
      console.log(`Messages in conversation ${conversationId}: ${conversationMessages.length}`);
      conversationMessages.forEach((msg, index) => {
        const sender = allUsers.find(u => u.id === msg.senderId || u.id === msg.sender_id);
        console.log(`  ${index + 1}. From: ${sender?.name || 'Unknown'} (${msg.senderId || msg.sender_id})`);
        console.log(`     Text: "${msg.text}"`);
        console.log(`     Time: ${msg.createdAt || msg.created_at}`);
        console.log(`     Read by: ${JSON.stringify(msg.readBy || msg.read_by || [])}`);
      });
    }

    // Step 5: Test getOwnerMessages function
    console.log('\n🔍 Step 5: Testing getOwnerMessages function...');
    const { getOwnerMessages } = require('./utils/owner-dashboard');
    
    try {
      const ownerMessages = await getOwnerMessages(testOwner.id);
      console.log(`Owner messages retrieved: ${ownerMessages.length}`);
      ownerMessages.forEach((msg, index) => {
        console.log(`  ${index + 1}. From: ${msg.tenantName}`);
        console.log(`     Text: "${msg.text}"`);
        console.log(`     Conversation ID: ${msg.conversationId}`);
        console.log(`     Is Read: ${msg.isRead}`);
      });
    } catch (error) {
      console.error('❌ Error testing getOwnerMessages:', error);
    }

    // Step 6: Check field consistency
    console.log('\n🔧 Step 6: Checking field consistency...');
    const inconsistentConversations = allConversations.filter(conv => {
      const hasOldFields = conv.owner_id || conv.tenant_id || conv.participant_ids;
      const hasNewFields = conv.ownerId || conv.tenantId || conv.participantIds;
      return hasOldFields && hasNewFields;
    });

    console.log(`Conversations with mixed field naming: ${inconsistentConversations.length}`);
    if (inconsistentConversations.length > 0) {
      console.log('⚠️ Found conversations with inconsistent field naming:');
      inconsistentConversations.forEach(conv => {
        console.log(`  - ${conv.id}:`);
        console.log(`    Old: owner_id=${conv.owner_id}, tenant_id=${conv.tenant_id}`);
        console.log(`    New: ownerId=${conv.ownerId}, tenantId=${conv.tenantId}`);
      });
    }

    // Step 7: Test notification system
    console.log('\n🔔 Step 7: Testing notification system...');
    const ownerConversations = allConversations.filter(conv => {
      const isOwner = conv.ownerId === testOwner.id || conv.owner_id === testOwner.id;
      const isParticipant = (conv.participantIds && conv.participantIds.includes(testOwner.id)) ||
                           (conv.participant_ids && conv.participant_ids.includes(testOwner.id));
      return isOwner || isParticipant;
    });

    let totalUnread = 0;
    ownerConversations.forEach(conv => {
      const isOwner = conv.ownerId === testOwner.id || conv.owner_id === testOwner.id;
      const unreadCount = isOwner ? 
        (conv.unreadByOwner || conv.unread_by_owner || 0) : 
        (conv.unreadByTenant || conv.unread_by_tenant || 0);
      totalUnread += unreadCount;
      
      if (unreadCount > 0) {
        console.log(`  Conversation ${conv.id}: ${unreadCount} unread messages`);
      }
    });

    console.log(`Total unread messages for owner: ${totalUnread}`);

    // Step 8: Recommendations
    console.log('\n💡 Step 8: Recommendations...');
    
    if (allConversations.length === 0) {
      console.log('❌ No conversations found. This suggests:');
      console.log('   - Messages are not being sent properly');
      console.log('   - Conversation creation is failing');
      console.log('   - Database operations are not working');
    }

    if (allMessages.length === 0) {
      console.log('❌ No messages found. This suggests:');
      console.log('   - Message sending is completely broken');
      console.log('   - Database write operations are failing');
    }

    if (inconsistentConversations.length > 0) {
      console.log('⚠️ Field naming inconsistency detected. Consider:');
      console.log('   - Running a migration script to normalize field names');
      console.log('   - Updating all code to use consistent field naming');
    }

    if (ownerMessages.length === 0 && allMessages.length > 0) {
      console.log('❌ Messages exist but getOwnerMessages returns empty. This suggests:');
      console.log('   - Conversation filtering logic is incorrect');
      console.log('   - Field name mismatches in filtering');
      console.log('   - Owner ID matching is failing');
    }

    console.log('\n✅ Messaging connection test completed!');

  } catch (error) {
    console.error('❌ Error during messaging test:', error);
  }
}

// Run the test
testMessagingConnection().catch(console.error);
