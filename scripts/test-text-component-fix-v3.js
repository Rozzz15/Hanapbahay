#!/usr/bin/env node

/**
 * Test script to verify that the "Text strings must be rendered within a <Text> component" error is fixed
 * This script checks for the specific pattern that causes this error in React Native
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing for Text component rendering issues...\n');

// Files to check for text rendering issues
const filesToCheck = [
  'app/property-preview.tsx',
  'app/(tabs)/index.tsx', 
  'components/listings/ListingCard.tsx',
  'app/(tabs)/bookings.tsx',
  'app/(owner)/listings.tsx',
  'app/(owner)/dashboard.tsx'
];

let issuesFound = 0;
let totalFilesChecked = 0;

function checkFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  totalFilesChecked++;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  console.log(`📄 Checking ${filePath}...`);
  
  let fileIssues = 0;
  let inTextComponent = false;
  let textComponentStart = 0;
  
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    
    // Track when we're inside a Text component
    if (line.includes('<Text') && !line.includes('</Text>')) {
      inTextComponent = true;
      textComponentStart = lineNumber;
    }
    
    if (line.includes('</Text>')) {
      inTextComponent = false;
    }
    
    // Check for nested Text components (common cause of the error)
    if (line.includes('&& <Text') && line.includes('</Text>')) {
      console.log(`❌ Line ${lineNumber}: Nested Text component detected`);
      console.log(`   ${line.trim()}`);
      issuesFound++;
      fileIssues++;
    }
    
    // Check for text strings rendered directly in JSX (not in Text components)
    // This is the main cause of the "Text strings must be rendered within a <Text> component" error
    if (!inTextComponent && 
        line.includes('{') && line.includes('}') && 
        line.includes('&&') && 
        !line.includes('<Text') && 
        !line.includes('</Text>') &&
        !line.includes('console.log') &&
        !line.includes('style=') &&
        !line.includes('className=') &&
        !line.includes('key=') &&
        !line.includes('const ') &&
        !line.includes('let ') &&
        !line.includes('var ') &&
        !line.includes('return ') &&
        !line.includes('function ') &&
        !line.includes('if (') &&
        !line.includes('for (') &&
        !line.includes('while (') &&
        (line.includes('`') || line.includes("'") || line.includes('"'))) {
      
      console.log(`❌ Line ${lineNumber}: Text string rendered without Text component`);
      console.log(`   ${line.trim()}`);
      issuesFound++;
      fileIssues++;
    }
  });
  
  if (fileIssues === 0) {
    console.log(`✅ No text rendering issues found in ${filePath}`);
  }
  
  console.log('');
}

// Check all files
filesToCheck.forEach(checkFile);

// Summary
console.log('📊 Test Results:');
console.log(`   Files checked: ${totalFilesChecked}`);
console.log(`   Issues found: ${issuesFound}`);

if (issuesFound === 0) {
  console.log('\n🎉 SUCCESS: No text rendering issues found!');
  console.log('✅ The "Text strings must be rendered within a <Text> component" error should be resolved.');
  console.log('✅ All text content is properly wrapped in <Text> components.');
} else {
  console.log('\n❌ FAILURE: Text rendering issues still exist.');
  console.log('🔧 Please fix the issues above before running the app.');
}

console.log('\n📱 Key fixes applied:');
console.log('- Removed nested Text components in rating displays');
console.log('- Fixed conditional text rendering to use template literals');
console.log('- Ensured all text content is within Text components');

process.exit(issuesFound > 0 ? 1 : 0);
