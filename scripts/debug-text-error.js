#!/usr/bin/env node

/**
 * Debug script to identify the exact source of the Text component error
 * This will help us understand what data is causing the issue
 */

const fs = require('fs');

console.log('🔍 Debugging Text component error...\n');

// Check the current listings.tsx file for any potential issues
const listingsFile = 'app/(owner)/listings.tsx';

if (fs.existsSync(listingsFile)) {
  const content = fs.readFileSync(listingsFile, 'utf8');
  const lines = content.split('\n');
  
  console.log('📄 Checking listings.tsx for potential issues...\n');
  
  let issuesFound = 0;
  
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    
    // Check for any direct string rendering that might cause issues
    if (line.includes('{') && line.includes('}') && 
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
        !line.includes('//') &&
        !line.includes('*') &&
        (line.includes('`') || line.includes("'") || line.includes('"'))) {
      
      console.log(`❌ Line ${lineNumber}: Potential text rendering issue`);
      console.log(`   ${line.trim()}`);
      issuesFound++;
    }
    
    // Check for any conditional rendering that might cause issues
    if (line.includes('&&') && 
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
        !line.includes('//') &&
        !line.includes('*')) {
      
      console.log(`⚠️  Line ${lineNumber}: Conditional rendering without Text wrapper`);
      console.log(`   ${line.trim()}`);
      issuesFound++;
    }
  });
  
  if (issuesFound === 0) {
    console.log('✅ No obvious text rendering issues found in listings.tsx');
  } else {
    console.log(`\n❌ Found ${issuesFound} potential issues in listings.tsx`);
  }
} else {
  console.log('❌ listings.tsx file not found');
}

console.log('\n🔍 Checking for other potential sources...\n');

// Check if there are any other files that might be causing the issue
const filesToCheck = [
  'app/(owner)/dashboard.tsx',
  'components/listings/ListingCard.tsx',
  'app/(tabs)/index.tsx',
  'app/property-preview.tsx'
];

filesToCheck.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    let fileIssues = 0;
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      // Check for any direct string rendering
      if (line.includes('{') && line.includes('}') && 
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
          !line.includes('//') &&
          !line.includes('*') &&
          (line.includes('`') || line.includes("'") || line.includes('"'))) {
        
        console.log(`❌ ${filePath}:${lineNumber}: Potential text rendering issue`);
        console.log(`   ${line.trim()}`);
        fileIssues++;
      }
    });
    
    if (fileIssues === 0) {
      console.log(`✅ ${filePath}: No text rendering issues found`);
    } else {
      console.log(`❌ ${filePath}: Found ${fileIssues} potential issues`);
    }
  } else {
    console.log(`⚠️  ${filePath}: File not found`);
  }
});

console.log('\n📊 Debug Summary:');
console.log('If you\'re still seeing the error, it might be caused by:');
console.log('1. Runtime data that contains unexpected values');
console.log('2. Third-party components or libraries');
console.log('3. Dynamic content that\'s not properly sanitized');
console.log('4. Issues with the Image component or other UI components');
console.log('\n🔧 Next steps:');
console.log('1. Check the console logs when the error occurs');
console.log('2. Look for any data that might contain non-string values');
console.log('3. Check if the error occurs with specific listings or all listings');
console.log('4. Verify that the sanitization is working correctly');
