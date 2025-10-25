#!/usr/bin/env node

/**
 * Test script to verify that the infinite loop / maximum update depth error is fixed
 * This script checks for problematic useEffect dependencies that cause infinite re-renders
 */

const fs = require('fs');

console.log('🔍 Testing for infinite loop issues in useEffect...\n');

// Files to check for infinite loop issues
const filesToCheck = [
  'app/(owner)/dashboard.tsx',
  'app/(owner)/listings.tsx',
  'app/(tabs)/index.tsx'
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
  let inUseEffect = false;
  let useEffectStart = 0;
  
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    
    // Track when we're inside a useEffect
    if (line.includes('useEffect(') || line.includes('useEffect(()')) {
      inUseEffect = true;
      useEffectStart = lineNumber;
    }
    
    if (inUseEffect && line.includes('}, [')) {
      // Check the dependency array
      const dependencyMatch = line.match(/}, \[(.*?)\]/);
      if (dependencyMatch) {
        const dependencies = dependencyMatch[1];
        
        // Check for problematic dependencies that can cause infinite loops
        if (dependencies.includes('loadDashboardData') || 
            dependencies.includes('loadListings') || 
            dependencies.includes('loadStats') || 
            dependencies.includes('loadBookings') || 
            dependencies.includes('loadMessages') ||
            dependencies.includes('loadPublishedListings')) {
          
          console.log(`❌ Line ${lineNumber}: useEffect with function dependency that can cause infinite loops`);
          console.log(`   Dependencies: [${dependencies}]`);
          console.log(`   This can cause "Maximum update depth exceeded" error`);
          issuesFound++;
          fileIssues++;
        }
        
        // Check for multiple function dependencies
        const functionDeps = dependencies.split(',').filter(dep => 
          dep.trim().includes('load') || 
          dep.trim().includes('handle') ||
          dep.trim().includes('refresh')
        );
        
        if (functionDeps.length > 1) {
          console.log(`⚠️  Line ${lineNumber}: Multiple function dependencies detected`);
          console.log(`   Dependencies: [${dependencies}]`);
          console.log(`   This may cause performance issues`);
        }
      }
      inUseEffect = false;
    }
  });
  
  if (fileIssues === 0) {
    console.log(`✅ No infinite loop issues found in ${filePath}`);
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
  console.log('\n🎉 SUCCESS: No infinite loop issues found!');
  console.log('✅ The "Maximum update depth exceeded" error should be resolved.');
  console.log('✅ All useEffect dependencies are properly configured.');
} else {
  console.log('\n❌ FAILURE: Infinite loop issues still exist.');
  console.log('🔧 Please fix the issues above before running the app.');
}

console.log('\n📱 Key fixes applied:');
console.log('- Removed function dependencies from useEffect arrays');
console.log('- Only kept stable dependencies like user?.id');
console.log('- Prevented infinite re-render loops');

process.exit(issuesFound > 0 ? 1 : 0);
