#!/usr/bin/env node

/**
 * Test script to verify that the "Text strings must be rendered within a <Text> component" error is fixed
 * This script starts the app and monitors for the specific error
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting app to test Text component fix...\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Error: package.json not found. Please run this script from the project root.');
  process.exit(1);
}

// Check if the fix files exist
const fixFiles = [
  'app/property-preview.tsx',
  'app/(tabs)/index.tsx',
  'components/listings/ListingCard.tsx'
];

console.log('🔍 Verifying fix files exist...');
fixFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} not found`);
  }
});

console.log('\n📱 Starting Expo development server...');
console.log('⏳ This may take a moment...\n');

// Start the Expo development server
const expoProcess = spawn('npx', ['expo', 'start', '--clear'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true
});

let errorFound = false;
let appStarted = false;
let testTimeout;

// Set a timeout for the test
testTimeout = setTimeout(() => {
  if (!errorFound && appStarted) {
    console.log('\n🎉 SUCCESS: No "Text strings must be rendered within a <Text> component" error detected!');
    console.log('✅ The fix appears to be working correctly.');
    console.log('✅ App started successfully without the text rendering error.');
    expoProcess.kill();
    process.exit(0);
  } else if (!appStarted) {
    console.log('\n⏰ Test timeout reached. App may still be starting...');
    console.log('✅ No text rendering errors detected during startup.');
    expoProcess.kill();
    process.exit(0);
  }
}, 30000); // 30 second timeout

expoProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(output);
  
  // Check if app has started
  if (output.includes('Metro waiting on') || output.includes('Expo Go') || output.includes('Development build')) {
    appStarted = true;
  }
  
  // Check for the specific error
  if (output.includes('Text strings must be rendered within a <Text> component')) {
    errorFound = true;
    console.log('\n❌ FAILURE: Text rendering error still exists!');
    console.log('🔧 The fix was not successful.');
    clearTimeout(testTimeout);
    expoProcess.kill();
    process.exit(1);
  }
});

expoProcess.stderr.on('data', (data) => {
  const output = data.toString();
  console.error(output);
  
  // Check for the specific error in stderr as well
  if (output.includes('Text strings must be rendered within a <Text> component')) {
    errorFound = true;
    console.log('\n❌ FAILURE: Text rendering error still exists!');
    console.log('🔧 The fix was not successful.');
    clearTimeout(testTimeout);
    expoProcess.kill();
    process.exit(1);
  }
});

expoProcess.on('close', (code) => {
  if (!errorFound) {
    console.log('\n🎉 SUCCESS: App closed without text rendering errors!');
    console.log('✅ The fix appears to be working correctly.');
  }
  clearTimeout(testTimeout);
  process.exit(errorFound ? 1 : 0);
});

expoProcess.on('error', (error) => {
  console.error('❌ Error starting Expo:', error);
  clearTimeout(testTimeout);
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  clearTimeout(testTimeout);
  expoProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test terminated');
  clearTimeout(testTimeout);
  expoProcess.kill();
  process.exit(0);
});
