/**
 * Utility to verify seeded owners exist and can log in
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './db';
import { mockSignIn } from './mock-auth';
import { getOwnerCredentials } from './seed-default-owners';

const MOCK_USERS_KEY = 'mock_users_database';

export async function verifySeededOwners(): Promise<{
  success: boolean;
  totalInMockAuth: number;
  totalInDatabase: number;
  canLogin: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let canLogin = 0;
  
  try {
    // Check mock auth storage
    const mockAuthData = await AsyncStorage.getItem(MOCK_USERS_KEY);
    const mockAuthUsers = mockAuthData ? Object.keys(JSON.parse(mockAuthData)) : [];
    console.log(`📊 Users in mock auth: ${mockAuthUsers.length}`);
    
    // Check database users
    const dbUsers = await db.list('users');
    const ownerUsers = dbUsers.filter(u => u.role === 'owner');
    console.log(`📊 Owner users in database: ${ownerUsers.length}`);
    
    // Get credentials and test login
    const credentials = getOwnerCredentials();
    console.log(`📊 Total credentials: ${credentials.length}`);
    
    // Test login for first few owners
    const testCount = Math.min(5, credentials.length);
    for (let i = 0; i < testCount; i++) {
      const cred = credentials[i];
      try {
        const loginResult = await mockSignIn(cred.email, cred.password);
        if (loginResult.success) {
          canLogin++;
          console.log(`✅ Can login: ${cred.email}`);
        } else {
          errors.push(`${cred.email}: ${loginResult.error}`);
          console.log(`❌ Cannot login: ${cred.email} - ${loginResult.error}`);
        }
      } catch (error) {
        errors.push(`${cred.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return {
      success: errors.length === 0 && canLogin > 0,
      totalInMockAuth: mockAuthUsers.length,
      totalInDatabase: ownerUsers.length,
      canLogin,
      errors,
    };
  } catch (error) {
    console.error('❌ Error verifying seeded owners:', error);
    return {
      success: false,
      totalInMockAuth: 0,
      totalInDatabase: 0,
      canLogin: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

export async function listAllUsersInMockAuth(): Promise<string[]> {
  try {
    const mockAuthData = await AsyncStorage.getItem(MOCK_USERS_KEY);
    if (!mockAuthData) {
      console.log('⚠️ No users in mock auth storage');
      return [];
    }
    
    const usersData = JSON.parse(mockAuthData);
    const emails = Object.keys(usersData);
    console.log(`📋 Users in mock auth (${emails.length}):`);
    emails.forEach((email, index) => {
      console.log(`  ${index + 1}. ${email}`);
    });
    
    return emails;
  } catch (error) {
    console.error('❌ Error listing users:', error);
    return [];
  }
}

