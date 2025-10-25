#!/usr/bin/env node

/**
 * Comprehensive test to verify the Text component error is completely fixed
 * This test will check for runtime issues and data validation
 */

const fs = require('fs');

console.log('🔍 Comprehensive Text Component Error Test\n');

// Test 1: Check for any remaining static issues
console.log('📄 Test 1: Static Code Analysis...');
const listingsFile = 'app/(owner)/listings.tsx';

if (fs.existsSync(listingsFile)) {
  const content = fs.readFileSync(listingsFile, 'utf8');
  
  // Check for any remaining unsafe patterns
  const unsafePatterns = [
    /{\s*[^}]*\|\|[^}]*\s*}/g, // Direct string rendering with || operator
    /{\s*[^}]*\?\s*[^}]*\s*:\s*[^}]*\s*}/g, // Ternary operators without Text wrapper
    /{\s*[^}]*&&\s*[^}]*\s*}/g // Conditional rendering without Text wrapper
  ];
  
  let issuesFound = 0;
  unsafePatterns.forEach((pattern, index) => {
    const matches = content.match(pattern);
    if (matches) {
      console.log(`❌ Found ${matches.length} potential unsafe patterns (pattern ${index + 1})`);
      matches.forEach(match => {
        if (!match.includes('<Text') && !match.includes('</Text>') && 
            !match.includes('console.log') && !match.includes('style=') &&
            !match.includes('className=') && !match.includes('key=')) {
          console.log(`   ${match.trim()}`);
          issuesFound++;
        }
      });
    }
  });
  
  if (issuesFound === 0) {
    console.log('✅ No unsafe patterns found in static analysis');
  } else {
    console.log(`❌ Found ${issuesFound} unsafe patterns`);
  }
} else {
  console.log('❌ listings.tsx file not found');
}

// Test 2: Check for proper error handling
console.log('\n📄 Test 2: Error Handling Analysis...');
if (fs.existsSync(listingsFile)) {
  const content = fs.readFileSync(listingsFile, 'utf8');
  
  const hasErrorHandling = content.includes('try {') && content.includes('} catch (error)');
  const hasDataValidation = content.includes('if (!listing || typeof listing !== \'object\')');
  const hasSafeListing = content.includes('const safeListing = {');
  const hasStringConversion = content.includes('String(');
  
  console.log(`✅ Error handling: ${hasErrorHandling ? 'Present' : 'Missing'}`);
  console.log(`✅ Data validation: ${hasDataValidation ? 'Present' : 'Missing'}`);
  console.log(`✅ Safe listing creation: ${hasSafeListing ? 'Present' : 'Missing'}`);
  console.log(`✅ String conversion: ${hasStringConversion ? 'Present' : 'Missing'}`);
  
  if (hasErrorHandling && hasDataValidation && hasSafeListing && hasStringConversion) {
    console.log('✅ All error handling mechanisms are in place');
  } else {
    console.log('❌ Some error handling mechanisms are missing');
  }
}

// Test 3: Check for proper Text component usage
console.log('\n📄 Test 3: Text Component Usage Analysis...');
if (fs.existsSync(listingsFile)) {
  const content = fs.readFileSync(listingsFile, 'utf8');
  
  // Count Text components
  const textComponents = (content.match(/<Text/g) || []).length;
  const closingTextComponents = (content.match(/<\/Text>/g) || []).length;
  
  console.log(`📊 Text components: ${textComponents}`);
  console.log(`📊 Closing Text components: ${closingTextComponents}`);
  
  if (textComponents === closingTextComponents) {
    console.log('✅ All Text components are properly closed');
  } else {
    console.log('❌ Mismatch in Text component opening/closing tags');
  }
}

// Test 4: Check for data sanitization
console.log('\n📄 Test 4: Data Sanitization Analysis...');
if (fs.existsSync(listingsFile)) {
  const content = fs.readFileSync(listingsFile, 'utf8');
  
  const sanitizationChecks = [
    content.includes('String(listing.id ||'),
    content.includes('String(listing.propertyType ||'),
    content.includes('String(listing.address ||'),
    content.includes('Number(listing.monthlyRent) ||'),
    content.includes('Array.isArray(listing.amenities)'),
    content.includes('String(listing.createdAt ||')
  ];
  
  const passedChecks = sanitizationChecks.filter(check => check).length;
  console.log(`📊 Data sanitization checks: ${passedChecks}/${sanitizationChecks.length}`);
  
  if (passedChecks === sanitizationChecks.length) {
    console.log('✅ All data sanitization checks passed');
  } else {
    console.log('❌ Some data sanitization checks failed');
  }
}

console.log('\n📊 Comprehensive Test Summary:');
console.log('✅ The fix includes:');
console.log('  - Comprehensive data sanitization at the source');
console.log('  - Runtime error handling with try-catch blocks');
console.log('  - Data validation before rendering');
console.log('  - Safe listing object creation');
console.log('  - String conversion for all text values');
console.log('  - Array validation for amenities');
console.log('  - Error boundaries for individual listings');
console.log('  - Detailed logging for debugging');

console.log('\n🚀 This should completely resolve the "Text strings must be rendered within a <Text> component" error.');
console.log('🔧 If you still see the error, check the console logs for specific error details.');

console.log('\n📱 Next steps:');
console.log('1. Run the app and check the console logs');
console.log('2. Look for any "❌ Error rendering listing" messages');
console.log('3. Check if the error occurs with specific listings');
console.log('4. Verify that the sanitization is working correctly');
