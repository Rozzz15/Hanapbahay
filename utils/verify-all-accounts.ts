/**
 * Comprehensive verification of all default accounts (owners, tenants, barangay officials)
 */

import { db } from './db';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockSignIn } from './mock-auth';
import { getOwnerCredentials } from './seed-default-owners';
import { isOwnerApproved } from './owner-approval';

const MOCK_USERS_KEY = 'mock_users_database';

export interface AccountVerificationResult {
  email: string;
  password: string;
  role: string;
  canLogin: boolean;
  hasDatabaseRecord: boolean;
  hasApprovedApplication?: boolean;
  hasProperties?: number;
  issues: string[];
}

export async function verifyAllAccounts(): Promise<{
  owners: AccountVerificationResult[];
  tenants: AccountVerificationResult[];
  barangayOfficials: AccountVerificationResult[];
  summary: {
    totalAccounts: number;
    canLogin: number;
    cannotLogin: number;
    issues: string[];
  };
}> {
  const results = {
    owners: [] as AccountVerificationResult[],
    tenants: [] as AccountVerificationResult[],
    barangayOfficials: [] as AccountVerificationResult[],
    summary: {
      totalAccounts: 0,
      canLogin: 0,
      cannotLogin: 0,
      issues: [] as string[],
    },
  };

  try {
    console.log('\n🔍 VERIFYING ALL ACCOUNTS...\n');

    // 1. Verify Owner Accounts
    console.log('1️⃣ Verifying Owner Accounts...');
    const ownerCredentials = getOwnerCredentials();
    for (const cred of ownerCredentials) {
      const issues: string[] = [];
      let canLogin = false;
      let hasDatabaseRecord = false;
      let hasApprovedApplication = false;
      let hasProperties = 0;

      // Test login
      try {
        const loginResult = await mockSignIn(cred.email, cred.password);
        canLogin = loginResult.success;
        if (!loginResult.success) {
          issues.push(`Cannot login: ${loginResult.error}`);
        }
      } catch (error) {
        issues.push(`Login error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }

      // Check database record
      const allUsers = await db.list('users');
      const user = allUsers.find(u => u.email.toLowerCase() === cred.email.toLowerCase());
      hasDatabaseRecord = !!user;

      if (user) {
        // Check approved application
        if (user.role === 'owner') {
          hasApprovedApplication = await isOwnerApproved(user.id);
          if (!hasApprovedApplication) {
            issues.push('Owner application not approved');
          }

          // Check properties
          const allListings = await db.list('published_listings');
          hasProperties = allListings.filter(l => l.userId === user.id).length;
          if (hasProperties === 0) {
            issues.push('No properties found');
          }
        }
      } else {
        issues.push('User not found in database');
      }

      results.owners.push({
        email: cred.email,
        password: cred.password,
        role: 'owner',
        canLogin,
        hasDatabaseRecord,
        hasApprovedApplication,
        hasProperties,
        issues,
      });

      if (canLogin) results.summary.canLogin++;
      else results.summary.cannotLogin++;
    }

    // 2. Verify Default Tenant Account
    console.log('2️⃣ Verifying Default Tenant Account...');
    const tenantEmail = 'tenant@test.com';
    const tenantPassword = 'tenant123';
    const tenantIssues: string[] = [];
    let tenantCanLogin = false;
    let tenantHasDatabaseRecord = false;

    try {
      const loginResult = await mockSignIn(tenantEmail, tenantPassword);
      tenantCanLogin = loginResult.success;
      if (!loginResult.success) {
        tenantIssues.push(`Cannot login: ${loginResult.error}`);
      }
    } catch (error) {
      tenantIssues.push(`Login error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    const allUsers = await db.list('users');
    const tenantUser = allUsers.find(u => u.email.toLowerCase() === tenantEmail.toLowerCase());
    tenantHasDatabaseRecord = !!tenantUser;

    if (!tenantHasDatabaseRecord) {
      tenantIssues.push('User not found in database');
    }

    results.tenants.push({
      email: tenantEmail,
      password: tenantPassword,
      role: 'tenant',
      canLogin: tenantCanLogin,
      hasDatabaseRecord: tenantHasDatabaseRecord,
      issues: tenantIssues,
    });

    if (tenantCanLogin) results.summary.canLogin++;
    else results.summary.cannotLogin++;

    // 3. Verify Barangay Official Accounts
    console.log('3️⃣ Verifying Barangay Official Accounts...');
    const barangays = ['RIZAL', 'TALOLONG', 'GOMEZ', 'MAGSAYSAY', 'BURGOS'];
    for (const barangay of barangays) {
      const brgyEmail = `brgy.${barangay.toLowerCase()}@hanapbahay.com`;
      const brgyPassword = `${barangay.toLowerCase()}123`;
      const brgyIssues: string[] = [];
      let brgyCanLogin = false;
      let brgyHasDatabaseRecord = false;

      try {
        const loginResult = await mockSignIn(brgyEmail, brgyPassword);
        brgyCanLogin = loginResult.success;
        if (!loginResult.success) {
          brgyIssues.push(`Cannot login: ${loginResult.error}`);
        }
      } catch (error) {
        brgyIssues.push(`Login error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }

      const brgyUser = allUsers.find(u => u.email.toLowerCase() === brgyEmail.toLowerCase());
      brgyHasDatabaseRecord = !!brgyUser;

      if (!brgyHasDatabaseRecord) {
        brgyIssues.push('User not found in database');
      }

      results.barangayOfficials.push({
        email: brgyEmail,
        password: brgyPassword,
        role: 'brgy_official',
        canLogin: brgyCanLogin,
        hasDatabaseRecord: brgyHasDatabaseRecord,
        issues: brgyIssues,
      });

      if (brgyCanLogin) results.summary.canLogin++;
      else results.summary.cannotLogin++;
    }

    // Summary
    results.summary.totalAccounts = results.owners.length + results.tenants.length + results.barangayOfficials.length;

    // Collect all issues
    [...results.owners, ...results.tenants, ...results.barangayOfficials].forEach(account => {
      if (account.issues.length > 0) {
        results.summary.issues.push(`${account.email}: ${account.issues.join(', ')}`);
      }
    });

    // Print summary
    console.log('\n📊 VERIFICATION SUMMARY:');
    console.log('═'.repeat(60));
    console.log(`Total Accounts: ${results.summary.totalAccounts}`);
    console.log(`  - Owners: ${results.owners.length}`);
    console.log(`  - Tenants: ${results.tenants.length}`);
    console.log(`  - Barangay Officials: ${results.barangayOfficials.length}`);
    console.log(`Can Login: ${results.summary.canLogin} ✅`);
    console.log(`Cannot Login: ${results.summary.cannotLogin} ❌`);
    console.log(`Issues: ${results.summary.issues.length}`);
    console.log('═'.repeat(60));

    // Print details
    console.log('\n👤 OWNER ACCOUNTS:');
    results.owners.slice(0, 5).forEach((owner, i) => {
      console.log(`${i + 1}. ${owner.email}`);
      console.log(`   Login: ${owner.canLogin ? '✅' : '❌'}`);
      console.log(`   Database: ${owner.hasDatabaseRecord ? '✅' : '❌'}`);
      console.log(`   Approved: ${owner.hasApprovedApplication ? '✅' : '❌'}`);
      console.log(`   Properties: ${owner.hasProperties}`);
      if (owner.issues.length > 0) {
        console.log(`   Issues: ${owner.issues.join(', ')}`);
      }
    });
    if (results.owners.length > 5) {
      console.log(`   ... and ${results.owners.length - 5} more owners`);
    }

    console.log('\n👤 TENANT ACCOUNTS:');
    results.tenants.forEach((tenant, i) => {
      console.log(`${i + 1}. ${tenant.email}`);
      console.log(`   Login: ${tenant.canLogin ? '✅' : '❌'}`);
      console.log(`   Database: ${tenant.hasDatabaseRecord ? '✅' : '❌'}`);
      if (tenant.issues.length > 0) {
        console.log(`   Issues: ${tenant.issues.join(', ')}`);
      }
    });

    console.log('\n👤 BARANGAY OFFICIAL ACCOUNTS:');
    results.barangayOfficials.forEach((brgy, i) => {
      console.log(`${i + 1}. ${brgy.email}`);
      console.log(`   Login: ${brgy.canLogin ? '✅' : '❌'}`);
      console.log(`   Database: ${brgy.hasDatabaseRecord ? '✅' : '❌'}`);
      if (brgy.issues.length > 0) {
        console.log(`   Issues: ${brgy.issues.join(', ')}`);
      }
    });

    return results;
  } catch (error) {
    console.error('❌ Error verifying accounts:', error);
    results.summary.issues.push(error instanceof Error ? error.message : 'Unknown error');
    return results;
  }
}

