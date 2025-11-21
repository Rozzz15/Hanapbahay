/**
 * Diagnostic tool to check if seed data exists and is accessible
 */

import { db } from './db';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockSignIn } from './mock-auth';
import { getOwnerCredentials } from './seed-default-owners';

const MOCK_USERS_KEY = 'mock_users_database';

export async function diagnoseSeedIssues(): Promise<{
  mockAuthUsers: number;
  dbUsers: number;
  dbOwners: number;
  dbListings: number;
  dbApplications: number;
  canLogin: boolean;
  testLoginEmail?: string;
  issues: string[];
  recommendations: string[];
}> {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let canLogin = false;
  let testLoginEmail: string | undefined;

  try {
    console.log('\n🔍 DIAGNOSING SEED ISSUES...\n');

    // 1. Check mock auth storage
    console.log('1️⃣ Checking mock auth storage...');
    const mockAuthData = await AsyncStorage.getItem(MOCK_USERS_KEY);
    const mockAuthUsers = mockAuthData ? Object.keys(JSON.parse(mockAuthData)).length : 0;
    console.log(`   Mock auth users: ${mockAuthUsers}`);
    
    if (mockAuthUsers === 0) {
      issues.push('No users found in mock auth storage');
      recommendations.push('Run the seed script: seedDefaultOwners()');
    }

    // 2. Check database users
    console.log('2️⃣ Checking database users...');
    const dbUsers = await db.list('users');
    const dbOwners = dbUsers.filter(u => u.role === 'owner');
    console.log(`   Total users: ${dbUsers.length}`);
    console.log(`   Owner users: ${dbOwners.length}`);
    
    if (dbOwners.length === 0) {
      issues.push('No owner users found in database');
      recommendations.push('Run the seed script: seedDefaultOwners()');
    }

    // 3. Check published listings
    console.log('3️⃣ Checking published listings...');
    const dbListings = await db.list('published_listings');
    console.log(`   Published listings: ${dbListings.length}`);
    
    if (dbListings.length === 0) {
      issues.push('No published listings found');
      recommendations.push('Run the seed script: seedDefaultOwners()');
    } else {
      // Check if listings have correct status
      const publishedListings = dbListings.filter(l => l.status === 'published');
      if (publishedListings.length < dbListings.length) {
        issues.push(`Some listings have wrong status. Found ${publishedListings.length} published out of ${dbListings.length} total`);
      }
    }

    // 4. Check owner applications
    console.log('4️⃣ Checking owner applications...');
    const dbApplications = await db.list('owner_applications');
    const approvedApplications = dbApplications.filter(a => a.status === 'approved');
    console.log(`   Total applications: ${dbApplications.length}`);
    console.log(`   Approved applications: ${approvedApplications.length}`);
    
    if (approvedApplications.length === 0) {
      issues.push('No approved owner applications found');
      recommendations.push('Run the seed script: seedDefaultOwners()');
    }

    // 5. Test login
    console.log('5️⃣ Testing login...');
    const credentials = getOwnerCredentials();
    if (credentials.length > 0) {
      const testCred = credentials[0];
      testLoginEmail = testCred.email;
      try {
        const loginResult = await mockSignIn(testCred.email, testCred.password);
        canLogin = loginResult.success;
        if (loginResult.success) {
          console.log(`   ✅ Can login with: ${testCred.email}`);
        } else {
          console.log(`   ❌ Cannot login: ${loginResult.error}`);
          issues.push(`Cannot login with ${testCred.email}: ${loginResult.error}`);
        }
      } catch (error) {
        console.log(`   ❌ Login error: ${error}`);
        issues.push(`Login test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      issues.push('No credentials available to test');
    }

    // 6. Check data consistency
    console.log('6️⃣ Checking data consistency...');
    if (dbOwners.length > 0 && dbListings.length > 0) {
      // Check if owners have listings
      const ownersWithListings = new Set(dbListings.map(l => l.userId));
      const ownersWithoutListings = dbOwners.filter(o => !ownersWithListings.has(o.id));
      if (ownersWithoutListings.length > 0) {
        issues.push(`${ownersWithoutListings.length} owners have no listings`);
      }
    }

    // Summary
    console.log('\n📊 DIAGNOSIS SUMMARY:');
    console.log('═'.repeat(50));
    console.log(`Mock Auth Users: ${mockAuthUsers}`);
    console.log(`Database Users: ${dbUsers.length}`);
    console.log(`Owner Users: ${dbOwners.length}`);
    console.log(`Published Listings: ${dbListings.length}`);
    console.log(`Approved Applications: ${approvedApplications.length}`);
    console.log(`Can Login: ${canLogin ? '✅' : '❌'}`);
    console.log('═'.repeat(50));

    if (issues.length > 0) {
      console.log('\n⚠️ ISSUES FOUND:');
      issues.forEach((issue, i) => console.log(`   ${i + 1}. ${issue}`));
    }

    if (recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      recommendations.forEach((rec, i) => console.log(`   ${i + 1}. ${rec}`));
    }

    return {
      mockAuthUsers,
      dbUsers: dbUsers.length,
      dbOwners: dbOwners.length,
      dbListings: dbListings.length,
      dbApplications: approvedApplications.length,
      canLogin,
      testLoginEmail,
      issues,
      recommendations,
    };
  } catch (error) {
    console.error('❌ Diagnostic error:', error);
    return {
      mockAuthUsers: 0,
      dbUsers: 0,
      dbOwners: 0,
      dbListings: 0,
      dbApplications: 0,
      canLogin: false,
      issues: [error instanceof Error ? error.message : 'Unknown error'],
      recommendations: ['Check console for detailed error messages'],
    };
  }
}

