import { db } from './db';
import { OwnerApplicationRecord, DbUserRecord } from '../types';

/**
 * Check if an owner's application has been approved by Barangay officials
 * @param userId - The user ID to check
 * @returns Promise<boolean> - true if approved, false if pending/rejected
 */
export async function isOwnerApproved(userId: string): Promise<boolean> {
  try {
    console.log('🔍 Checking owner approval status for user:', userId);
    console.log('📝 User ID type:', typeof userId, 'User ID value:', JSON.stringify(userId));
    
    // List all owner applications and find the one for this user
    // Note: Applications are stored with application.id as the key, not userId
    const allApplications = await db.list<OwnerApplicationRecord>('owner_applications');
    console.log(`📊 Total applications in database: ${allApplications.length}`);
    
    // Log all applications for debugging
    if (allApplications.length > 0) {
      console.log('📋 All applications in database:');
      allApplications.forEach((app, index) => {
        console.log(`  ${index + 1}. Application ID: ${app.id}, User ID: ${app.userId} (type: ${typeof app.userId}), Status: ${app.status}`);
        console.log(`     Match check: ${app.userId} === ${userId} ? ${app.userId === userId}`);
        console.log(`     String match: "${app.userId}" === "${userId}" ? ${String(app.userId) === String(userId)}`);
      });
    } else {
      console.log('⚠️ No applications found in database');
    }
    
    // Try exact match first
    let application = allApplications.find(app => app.userId === userId);
    
    // If no exact match, try string comparison (in case of type mismatch)
    if (!application) {
      console.log('⚠️ No exact match found, trying string comparison...');
      application = allApplications.find(app => String(app.userId) === String(userId));
    }
    
    // If still no match, try case-insensitive string comparison
    if (!application) {
      console.log('⚠️ No string match found, trying case-insensitive comparison...');
      application = allApplications.find(app => 
        String(app.userId).toLowerCase().trim() === String(userId).toLowerCase().trim()
      );
    }
    
    if (!application) {
      console.log('❌ No owner application found for user:', userId);
      console.log('🔍 Available user IDs in applications:', allApplications.map(app => app.userId));
      return false;
    }
    
    const isApproved = application.status === 'approved';
    console.log('📋 Owner application status:', {
      userId,
      applicationId: application.id,
      applicationUserId: application.userId,
      status: application.status,
      isApproved,
      reviewedBy: application.reviewedBy,
      reviewedAt: application.reviewedAt,
      barangay: application.barangay
    });
    
    return isApproved;
  } catch (error) {
    console.error('❌ Error checking owner approval status:', error);
    if (error instanceof Error) {
      console.error('❌ Error stack:', error.stack);
    }
    return false;
  }
}

/**
 * Get owner application details
 * @param userId - The user ID to check
 * @returns Promise<OwnerApplicationRecord | null>
 */
export async function getOwnerApplication(userId: string): Promise<OwnerApplicationRecord | null> {
  try {
    // List all owner applications and find the one for this user
    // Note: Applications are stored with application.id as the key, not userId
    const allApplications = await db.list<OwnerApplicationRecord>('owner_applications');
    
    // Try exact match first
    let application = allApplications.find(app => app.userId === userId);
    
    // If no exact match, try string comparison (in case of type mismatch)
    if (!application) {
      application = allApplications.find(app => String(app.userId) === String(userId));
    }
    
    // If still no match, try case-insensitive string comparison
    if (!application) {
      application = allApplications.find(app => 
        String(app.userId).toLowerCase().trim() === String(userId).toLowerCase().trim()
      );
    }
    
    return application || null;
  } catch (error) {
    console.error('❌ Error getting owner application:', error);
    return null;
  }
}

/**
 * Check if user has pending owner application
 * @param userId - The user ID to check
 * @returns Promise<boolean>
 */
export async function hasPendingOwnerApplication(userId: string): Promise<boolean> {
  try {
    // List all owner applications and find the one for this user
    // Note: Applications are stored with application.id as the key, not userId
    const allApplications = await db.list<OwnerApplicationRecord>('owner_applications');
    
    // Try exact match first
    let application = allApplications.find(app => app.userId === userId);
    
    // If no exact match, try string comparison (in case of type mismatch)
    if (!application) {
      application = allApplications.find(app => String(app.userId) === String(userId));
    }
    
    // If still no match, try case-insensitive string comparison
    if (!application) {
      application = allApplications.find(app => 
        String(app.userId).toLowerCase().trim() === String(userId).toLowerCase().trim()
      );
    }
    
    return application?.status === 'pending' || false;
  } catch (error) {
    console.error('❌ Error checking pending owner application:', error);
    return false;
  }
}

/**
 * Get Barangay official contact information by barangay name
 * @param barangay - The barangay name
 * @returns Promise with official contact info or null
 */
export async function getBarangayOfficialContact(barangay: string): Promise<{
  name: string;
  email: string;
  phone: string;
  logo?: string | null;
} | null> {
  try {
    const allUsers = await db.list<DbUserRecord>('users');
    const official = allUsers.find(
      user => user.role === 'brgy_official' && 
      user.barangay?.toUpperCase() === barangay.toUpperCase()
    );
    
    if (!official) {
      console.log(`⚠️ No barangay official found for ${barangay}`);
      return null;
    }
    
    // Get barangay logo from user record
    const logo = (official as any)?.barangayLogo || null;
    
    return {
      name: official.name || `Barangay ${barangay} Official`,
      email: official.email || '',
      phone: official.phone || '',
      logo: logo
    };
  } catch (error) {
    console.error('❌ Error getting barangay official contact:', error);
    return null;
  }
}
