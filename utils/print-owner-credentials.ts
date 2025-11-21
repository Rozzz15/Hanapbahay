/**
 * Utility to print all owner credentials
 * This can be called from anywhere to see all the generated credentials
 */

import { getOwnerCredentials } from './seed-default-owners';

export function printOwnerCredentials(): void {
  const credentials = getOwnerCredentials();
  
  console.log('\n📋 Default Owner Credentials');
  console.log('='.repeat(60));
  console.log(`Total Owners: ${credentials.length}`);
  console.log(`Total Properties: ${credentials.length * 2}`);
  console.log('='.repeat(60));
  
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
    console.log(`\n📍 Barangay: ${barangay}`);
    console.log('-'.repeat(60));
    owners.forEach((owner, index) => {
      console.log(`${index + 1}. ${owner.name}`);
      console.log(`   Email: ${owner.email}`);
      console.log(`   Password: ${owner.password}`);
      console.log('');
    });
  });
  
  console.log('\n✅ All credentials printed above');
}

// Export credentials as JSON for easy access
export function getOwnerCredentialsJSON(): string {
  const credentials = getOwnerCredentials();
  return JSON.stringify(credentials, null, 2);
}

