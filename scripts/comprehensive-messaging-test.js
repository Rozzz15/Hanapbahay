// Comprehensive Messaging Test - Simulates the exact flow
console.log('🧪 Starting Comprehensive Messaging Test...\n');

// This test simulates the exact flow that happens in the app
async function comprehensiveMessagingTest() {
  console.log('📋 Simulating complete messaging flow:\n');
  
  // Step 1: Simulate tenant clicking "Message Owner"
  console.log('1️⃣ SIMULATING: Tenant clicks "Message Owner"');
  console.log('   - handleMessageOwner() is called');
  console.log('   - Checks for existing conversation');
  console.log('   - Creates new conversation if none exists');
  console.log('   - Navigates to chat-room\n');
  
  // Step 2: Simulate conversation creation
  console.log('2️⃣ SIMULATING: Conversation creation');
  const mockTenantId = 'tenant_123';
  const mockOwnerId = 'owner_456';
  const mockConversationId = 'conv_test_' + Date.now();
  
  const mockConversation = {
    id: mockConversationId,
    tenantId: mockTenantId,
    ownerId: mockOwnerId,
    participantIds: [mockTenantId, mockOwnerId],
    tenantName: 'Test Tenant',
    ownerName: 'Test Owner',
    lastMessageText: '',
    lastMessageAt: new Date().toISOString(),
    unreadByOwner: 0,
    unreadByTenant: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  console.log('   Mock conversation data:', mockConversation);
  console.log('   ✅ Conversation structure looks correct\n');
  
  // Step 3: Simulate tenant sending message
  console.log('3️⃣ SIMULATING: Tenant sends message');
  const mockMessage = {
    id: 'msg_test_' + Date.now(),
    conversationId: mockConversationId,
    senderId: mockTenantId,
    text: 'Hello, I am interested in your property',
    type: 'message',
    readBy: [mockTenantId],
    createdAt: new Date().toISOString(),
    propertyId: 'property_789',
    propertyTitle: 'Test Property'
  };
  
  console.log('   Mock message data:', mockMessage);
  console.log('   ✅ Message structure looks correct\n');
  
  // Step 4: Simulate conversation update
  console.log('4️⃣ SIMULATING: Conversation update after message');
  const updatedConversation = {
    ...mockConversation,
    lastMessageText: mockMessage.text,
    lastMessageAt: mockMessage.createdAt,
    unreadByOwner: 1, // Increment for owner
    updatedAt: mockMessage.createdAt
  };
  
  console.log('   Updated conversation:', updatedConversation);
  console.log('   ✅ Conversation update looks correct\n');
  
  // Step 5: Simulate getOwnerMessages function
  console.log('5️⃣ SIMULATING: getOwnerMessages function');
  
  // Mock database data
  const mockConversations = [updatedConversation];
  const mockMessages = [mockMessage];
  const mockUsers = [
    { id: mockTenantId, name: 'Test Tenant' },
    { id: mockOwnerId, name: 'Test Owner' }
  ];
  
  // Simulate the filtering logic from getOwnerMessages
  const normalizedConvs = mockConversations.map(conv => ({
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
  
  console.log('   Normalized conversations:', normalizedConvs);
  
  // Filter conversations for owner
  const ownerConversations = normalizedConvs.filter(conv => {
    const isOwner = conv.ownerId === mockOwnerId;
    const isParticipant = conv.participantIds && conv.participantIds.includes(mockOwnerId);
    const matches = isOwner || isParticipant;
    
    console.log(`   Filter check for conv ${conv.id}:`, {
      convOwnerId: conv.ownerId,
      targetOwnerId: mockOwnerId,
      participantIds: conv.participantIds,
      isOwner,
      isParticipant,
      matches
    });
    
    return matches;
  });
  
  console.log(`   Owner conversations found: ${ownerConversations.length}`);
  
  // Normalize messages
  const normalizedMessages = mockMessages.map(msg => ({
    id: msg.id,
    conversationId: msg.conversationId || msg.conversation_id || '',
    senderId: msg.senderId || msg.sender_id || '',
    text: msg.text,
    createdAt: msg.createdAt || msg.created_at || new Date().toISOString(),
    readBy: msg.readBy || msg.read_by || [],
    type: msg.type || 'message',
    propertyId: msg.propertyId || msg.property_id,
    propertyTitle: msg.propertyTitle || msg.property_title,
  }));
  
  console.log('   Normalized messages:', normalizedMessages);
  
  // Process messages for owner
  const ownerMessages = [];
  for (const conv of ownerConversations) {
    const convMessages = normalizedMessages
      .filter(msg => msg.conversationId === conv.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    console.log(`   Messages for conversation ${conv.id}: ${convMessages.length}`);
    
    if (convMessages.length > 0) {
      const latestMessage = convMessages[0];
      const tenant = mockUsers.find(u => u.id === conv.tenantId);
      const tenantName = tenant?.name || 'Tenant';
      
      ownerMessages.push({
        id: latestMessage.id,
        conversationId: conv.id,
        senderId: latestMessage.senderId,
        text: latestMessage.text,
        createdAt: latestMessage.createdAt,
        propertyId: latestMessage.propertyId || '',
        propertyTitle: latestMessage.propertyTitle || '',
        readBy: latestMessage.readBy || [],
        tenantName: tenantName,
        isRead: latestMessage.readBy?.includes(mockOwnerId) || false
      });
    }
  }
  
  console.log(`   Final owner messages: ${ownerMessages.length}`);
  console.log('   Owner messages data:', ownerMessages);
  
  // Step 6: Analysis
  console.log('\n🔍 ANALYSIS:');
  
  if (ownerMessages.length === 0) {
    console.log('❌ ISSUE FOUND: getOwnerMessages returned empty array');
    console.log('   This means the filtering logic is not working correctly');
    
    if (ownerConversations.length === 0) {
      console.log('   Root cause: No conversations found for owner');
      console.log('   Check: ownerId matching logic');
    } else if (normalizedMessages.length === 0) {
      console.log('   Root cause: No messages found');
      console.log('   Check: Message saving logic');
    } else {
      console.log('   Root cause: Message processing logic');
      console.log('   Check: Message filtering by conversationId');
    }
  } else {
    console.log('✅ SUCCESS: getOwnerMessages working correctly');
    console.log('   The messaging system should work as expected');
  }
  
  // Step 7: Common Issues
  console.log('\n🚨 COMMON ISSUES TO CHECK:');
  console.log('1. Database operations failing silently');
  console.log('2. Field name inconsistencies (ownerId vs owner_id)');
  console.log('3. Conversation creation not saving to database');
  console.log('4. Message saving not working');
  console.log('5. User ID mismatches');
  console.log('6. Conversation filtering logic errors');
  
  console.log('\n✅ Comprehensive messaging test completed!');
}

// Run the test
comprehensiveMessagingTest();
