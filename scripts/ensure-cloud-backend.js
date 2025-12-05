/**
 * Ensure .env file has cloud backend URL configured
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const cloudBackendUrl = 'https://web-production-e66fb.up.railway.app';

console.log('🔧 Ensuring cloud backend URL is configured...\n');

let envContent = '';
let hasApiUrl = false;
let needsUpdate = false;

// Read existing .env if it exists
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check if EXPO_PUBLIC_API_URL exists
  const lines = envContent.split('\n');
  const updatedLines = lines.map(line => {
    if (line.startsWith('EXPO_PUBLIC_API_URL=')) {
      hasApiUrl = true;
      const currentValue = line.split('=')[1]?.trim();
      
      // Check if it's already set to cloud backend
      if (currentValue === cloudBackendUrl || currentValue === `"${cloudBackendUrl}"`) {
        console.log('✅ EXPO_PUBLIC_API_URL already set to cloud backend');
        return line;
      } else {
        console.log(`⚠️  EXPO_PUBLIC_API_URL is set to: ${currentValue}`);
        console.log(`   Updating to cloud backend: ${cloudBackendUrl}`);
        needsUpdate = true;
        return `EXPO_PUBLIC_API_URL=${cloudBackendUrl}`;
      }
    }
    return line;
  });
  
  if (needsUpdate) {
    envContent = updatedLines.join('\n');
  } else if (!hasApiUrl) {
    // Add it if it doesn't exist
    envContent += `\n# Backend API URL (Cloud)\nEXPO_PUBLIC_API_URL=${cloudBackendUrl}\n`;
    needsUpdate = true;
    console.log('➕ Adding EXPO_PUBLIC_API_URL to .env file');
  }
} else {
  // Create new .env file
  envContent = `# HanapBahay Environment Variables
# Backend API URL (Cloud)
EXPO_PUBLIC_API_URL=${cloudBackendUrl}
`;
  needsUpdate = true;
  console.log('➕ Creating .env file with cloud backend URL');
}

// Write updated .env file
if (needsUpdate) {
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('\n✅ .env file updated with cloud backend URL!');
  console.log(`   Backend URL: ${cloudBackendUrl}\n`);
} else {
  console.log('\n✅ .env file already configured correctly!\n');
}

console.log('📱 When you build the APK, it will use the cloud backend.');
console.log('   Build command: cd android && .\\gradlew assembleRelease\n');

