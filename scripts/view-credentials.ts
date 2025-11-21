/**
 * Quick script to view all owner credentials
 * 
 * Run this from anywhere in your app to see all credentials
 */

import { getOwnerCredentials } from '../utils/seed-default-owners';

export function viewAllCredentials() {
  const credentials = getOwnerCredentials();
  
  console.log('\n');
  console.log('═'.repeat(70));
  console.log('📋 COMPLETE LIST OF OWNER CREDENTIALS');
  console.log('═'.repeat(70));
  console.log(`\nTotal Owners: ${credentials.length}`);
  console.log(`Password for ALL: E@yana05\n`);
  console.log('═'.repeat(70));
  
  // Group by barangay
  const byBarangay = credentials.reduce((acc, owner) => {
    if (!acc[owner.barangay]) {
      acc[owner.barangay] = [];
    }
    acc[owner.barangay].push(owner);
    return acc;
  }, {} as Record<string, typeof credentials>);
  
  // Print by barangay
  Object.entries(byBarangay).forEach(([barangay, owners]) => {
    console.log(`\n📍 BARANGAY: ${barangay}`);
    console.log('─'.repeat(70));
    owners.forEach((owner, index) => {
      console.log(`\n${index + 1}. ${owner.name}`);
      console.log(`   📧 Email:    ${owner.email}`);
      console.log(`   🔑 Password: ${owner.password}`);
    });
  });
  
  console.log('\n');
  console.log('═'.repeat(70));
  console.log('✅ End of credentials list');
  console.log('═'.repeat(70));
  console.log('\n');
  
  return credentials;
}

// Export for use in other files
export { getOwnerCredentials } from '../utils/seed-default-owners';

