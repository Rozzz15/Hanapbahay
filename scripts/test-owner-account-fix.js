#!/usr/bin/env node

/**
 * Comprehensive test script to verify both text rendering and infinite loop fixes
 * This script checks that the owner account will work without errors
 */

const fs = require('fs');

console.log('🔍 Testing owner account fixes...\n');

// Test 1: Check for text rendering issues
console.log('1️⃣ Testing Text component rendering...');
const textTest = require('child_process').spawnSync('node', ['scripts/test-text-component-fix-v3.js'], { encoding: 'utf8' });
if (textTest.status === 0) {
  console.log('✅ Text rendering fix verified');
} else {
  console.log('❌ Text rendering issues still exist');
}

// Test 2: Check for infinite loop issues
console.log('\n2️⃣ Testing infinite loop prevention...');
const loopTest = require('child_process').spawnSync('node', ['scripts/test-infinite-loop-fix.js'], { encoding: 'utf8' });
if (loopTest.status === 0) {
  console.log('✅ Infinite loop fix verified');
} else {
  console.log('❌ Infinite loop issues still exist');
}

// Test 3: Verify specific fixes in owner files
console.log('\n3️⃣ Verifying specific fixes in owner files...');

const ownerFiles = [
  'app/(owner)/dashboard.tsx',
  'app/(owner)/listings.tsx'
];

let allFixesApplied = true;

ownerFiles.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    allFixesApplied = false;
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check for proper useEffect dependencies (look for user?.id dependency with any comment)
  if (content.includes('}, [user?.id])')) {
    console.log(`✅ ${filePath}: useEffect dependencies fixed`);
  } else {
    console.log(`❌ ${filePath}: useEffect dependencies not properly fixed`);
    allFixesApplied = false;
  }
  
  // Check for removed function dependencies
  if (!content.includes('}, [loadDashboardData]') && !content.includes('}, [loadListings]')) {
    console.log(`✅ ${filePath}: Function dependencies removed from useEffect`);
  } else {
    console.log(`❌ ${filePath}: Function dependencies still present in useEffect`);
    allFixesApplied = false;
  }
});

// Summary
console.log('\n📊 Overall Test Results:');
console.log(`   Text rendering: ${textTest.status === 0 ? '✅ PASS' : '❌ FAIL'}`);
console.log(`   Infinite loops: ${loopTest.status === 0 ? '✅ PASS' : '❌ FAIL'}`);
console.log(`   Owner files: ${allFixesApplied ? '✅ PASS' : '❌ FAIL'}`);

if (textTest.status === 0 && loopTest.status === 0 && allFixesApplied) {
  console.log('\n🎉 SUCCESS: All fixes applied successfully!');
  console.log('✅ The "Text strings must be rendered within a <Text> component" error is fixed');
  console.log('✅ The "Maximum update depth exceeded" error is fixed');
  console.log('✅ Owner account should now work without errors');
  
  console.log('\n📱 What was fixed:');
  console.log('- Removed nested Text components in rating displays');
  console.log('- Fixed conditional text rendering to use template literals');
  console.log('- Removed function dependencies from useEffect arrays');
  console.log('- Prevented infinite re-render loops in owner dashboard and listings');
  
  console.log('\n🚀 You can now use the owner account without errors!');
} else {
  console.log('\n❌ FAILURE: Some fixes are not properly applied.');
  console.log('🔧 Please check the issues above and ensure all fixes are correct.');
}

process.exit((textTest.status === 0 && loopTest.status === 0 && allFixesApplied) ? 0 : 1);
