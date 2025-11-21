/**
 * Seed Script for Default Owners
 * 
 * This script creates 10 default owners in each barangay with 2 properties each.
 * 
 * To run this script:
 * 1. Import and call seedDefaultOwners() from anywhere in your app
 * 2. Or use the seedOwners() function from utils/seed-default-owners
 * 
 * Example usage in a React component:
 * 
 * import { seedDefaultOwners } from '@/utils/seed-default-owners';
 * 
 * const handleSeed = async () => {
 *   const result = await seedDefaultOwners();
 *   console.log('Seed result:', result);
 * };
 */

import { seedDefaultOwners, getOwnerCredentials } from '../utils/seed-default-owners';

// Export for use in other files
export { seedDefaultOwners, getOwnerCredentials };

// If running directly (for testing)
if (require.main === module) {
  (async () => {
    console.log('🌱 Starting owner seed script...\n');
    const result = await seedDefaultOwners();
    
    if (result.success) {
      console.log('\n✅ Seed completed successfully!');
      console.log(`   Created ${result.totalOwners} owners`);
      console.log(`   Created ${result.totalProperties} properties`);
      
      console.log('\n📋 Owner Credentials:');
      console.log('====================');
      result.owners.forEach((owner, index) => {
        console.log(`${index + 1}. ${owner.name}`);
        console.log(`   Email: ${owner.email}`);
        console.log(`   Password: ${owner.password}`);
        console.log(`   Barangay: ${owner.barangay}`);
        console.log('');
      });
    } else {
      console.log('\n❌ Seed completed with errors');
      console.log(`   Created ${result.totalOwners} owners`);
      console.log(`   Created ${result.totalProperties} properties`);
      console.log(`   Errors: ${result.errors.length}`);
    }
  })();
}

