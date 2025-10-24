// Simple messaging connection test
console.log('🧪 Starting simple messaging connection test...\n');

// This is a basic test to check if we can access the database
// We'll use a more direct approach

async function runSimpleTest() {
  try {
    console.log('📊 Checking if we can access the project structure...');
    
    // Check if we're in the right directory
    const fs = require('fs');
    const path = require('path');
    
    const currentDir = process.cwd();
    console.log(`Current directory: ${currentDir}`);
    
    // Check if key files exist
    const keyFiles = [
      'utils/db.ts',
      'utils/owner-dashboard.ts',
      'app/chat-room.tsx',
      'app/(owner)/messages.tsx',
      'context/NotificationContext.tsx'
    ];
    
    console.log('\n📁 Checking key files:');
    keyFiles.forEach(file => {
      const exists = fs.existsSync(file);
      console.log(`  ${exists ? '✅' : '❌'} ${file}`);
    });
    
    // Check package.json for dependencies
    if (fs.existsSync('package.json')) {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      console.log('\n📦 Key dependencies:');
      const keyDeps = ['expo', 'react', 'react-native'];
      keyDeps.forEach(dep => {
        const version = packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep];
        console.log(`  ${version ? '✅' : '❌'} ${dep}: ${version || 'Not found'}`);
      });
    }
    
    console.log('\n💡 Recommendations for testing:');
    console.log('1. Run the app in development mode');
    console.log('2. Create test users (one owner, one tenant)');
    console.log('3. Create a test property listing');
    console.log('4. Try sending a message from tenant to owner');
    console.log('5. Check if the message appears in owner\'s messages');
    
    console.log('\n🔍 Common issues to check:');
    console.log('- Field name inconsistencies (ownerId vs owner_id)');
    console.log('- Conversation creation logic');
    console.log('- Message filtering in getOwnerMessages');
    console.log('- Database write operations');
    console.log('- User role assignments');
    
  } catch (error) {
    console.error('❌ Error during simple test:', error);
  }
}

runSimpleTest();
