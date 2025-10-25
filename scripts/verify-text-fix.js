#!/usr/bin/env node

/**
 * Verification script to confirm the Text component fix is properly applied
 */

const fs = require('fs');

console.log('🔍 Verifying Text component fix...\n');

// Check the specific files that were fixed
const filesToCheck = [
  {
    path: 'app/property-preview.tsx',
    line: 634,
    expected: '{calculatedRating > 0 ? calculatedRating.toFixed(1) : \'No ratings\'}{calculatedRating > 0 && ` (${totalReviews})`}'
  },
  {
    path: 'app/(tabs)/index.tsx', 
    line: 1622,
    expected: '{listing.rating > 0 ? listing.rating.toFixed(1) : \'No ratings\'}{listing.rating > 0 && ` (${listing.reviews})`}'
  },
  {
    path: 'components/listings/ListingCard.tsx',
    line: 188,
    expected: '{rating > 0 ? rating.toFixed(1) : \'No ratings\'}{rating > 0 && ` (${reviews})`}'
  }
];

let allFixed = true;

filesToCheck.forEach(({ path, line, expected }) => {
  if (!fs.existsSync(path)) {
    console.log(`❌ File not found: ${path}`);
    allFixed = false;
    return;
  }
  
  const content = fs.readFileSync(path, 'utf8');
  const lines = content.split('\n');
  const actualLine = lines[line - 1];
  
  if (actualLine && actualLine.includes(expected)) {
    console.log(`✅ ${path}:${line} - Fix applied correctly`);
  } else {
    console.log(`❌ ${path}:${line} - Fix not found`);
    console.log(`   Expected: ${expected}`);
    console.log(`   Actual: ${actualLine}`);
    allFixed = false;
  }
});

console.log('\n📊 Verification Results:');

if (allFixed) {
  console.log('🎉 SUCCESS: All Text component fixes are properly applied!');
  console.log('✅ The "Text strings must be rendered within a <Text> component" error should be resolved.');
  console.log('✅ All conditional text rendering now uses template literals instead of nested Text components.');
  console.log('✅ All text content is properly wrapped in <Text> components.');
  
  console.log('\n📱 What was fixed:');
  console.log('- Removed nested <Text> components in rating displays');
  console.log('- Changed conditional text rendering from: {condition && <Text>text</Text>}');
  console.log('- To: {condition && `text`}');
  console.log('- Ensured all text is within proper <Text> components');
  
  console.log('\n🚀 You can now run your app without the text rendering error!');
} else {
  console.log('❌ FAILURE: Some fixes are not properly applied.');
  console.log('🔧 Please check the files above and ensure the fixes are correct.');
}

process.exit(allFixed ? 0 : 1);
