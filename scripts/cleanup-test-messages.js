#!/usr/bin/env node

/**
 * Manual cleanup script for test messages and conversations
 * Run this script to clean up any test data from the database
 */

const { cleanupTestMessages, hasTestMessages } = require('./utils/cleanup-test-messages');

async function main() {
  console.log('🧹 Starting manual cleanup of test messages...');
  
  try {
    // Check if there are test messages
    const hasTest = await hasTestMessages();
    console.log(`📊 Test messages detected: ${hasTest}`);
    
    if (!hasTest) {
      console.log('✅ No test messages found. Database is clean.');
      return;
    }
    
    // Run cleanup
    const result = await cleanupTestMessages();
    
    if (result.success) {
      console.log(`✅ Cleanup completed successfully!`);
      console.log(`📊 Removed ${result.removedConversations} conversations and ${result.removedMessages} messages`);
    } else {
      console.log(`⚠️ Cleanup completed with some issues:`);
      result.errors.forEach(error => console.log(`   - ${error}`));
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run the cleanup
main().then(() => {
  console.log('🏁 Cleanup script completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
