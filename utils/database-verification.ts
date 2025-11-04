import { db } from './db';
import { DbUserRecord, OwnerApplicationRecord, BrgyNotificationRecord } from '../types';

/**
 * Comprehensive database verification utility for approved owners
 * Ensures all approved owners are properly stored and accessible
 */

export interface DatabaseVerificationResult {
  success: boolean;
  totalUsers: number;
  totalApplications: number;
  approvedApplications: number;
  approvedOwners: number;
  pendingApplications: number;
  rejectedApplications: number;
  missingUserRecords: string[];
  orphanedApplications: string[];
  dataIntegrity: {
    usersTable: boolean;
    applicationsTable: boolean;
    notificationsTable: boolean;
  };
  barangayBreakdown: {
    [barangay: string]: {
      totalApplications: number;
      approvedApplications: number;
      pendingApplications: number;
      rejectedApplications: number;
    };
  };
  message: string;
}

/**
 * Verify database integrity for approved owners
 */
export async function verifyApprovedOwnersDatabase(): Promise<DatabaseVerificationResult> {
  try {
    console.log('🔍 Starting comprehensive database verification for approved owners...');
    
    // Load all data
    const allUsers = await db.list<DbUserRecord>('users');
    const allApplications = await db.list<OwnerApplicationRecord>('owner_applications');
    const allNotifications = await db.list<BrgyNotificationRecord>('brgy_notifications');
    
    console.log('📊 Database counts:', {
      users: allUsers.length,
      applications: allApplications.length,
      notifications: allNotifications.length
    });
    
    // Count applications by status
    const approvedApplications = allApplications.filter(app => app.status === 'approved');
    const pendingApplications = allApplications.filter(app => app.status === 'pending');
    const rejectedApplications = allApplications.filter(app => app.status === 'rejected');
    
    // Find approved owners (users with approved applications)
    const approvedOwnerIds = new Set(approvedApplications.map(app => app.userId));
    const approvedOwners = allUsers.filter(user => approvedOwnerIds.has(user.id));
    
    // Check for missing user records
    const missingUserRecords: string[] = [];
    const orphanedApplications: string[] = [];
    
    for (const application of approvedApplications) {
      const user = allUsers.find(u => u.id === application.userId);
      if (!user) {
        missingUserRecords.push(application.userId);
        console.warn(`⚠️ Missing user record for approved application ${application.id}, userId: ${application.userId}`);
      }
    }
    
    // Check for orphaned applications (applications without corresponding users)
    for (const application of allApplications) {
      const user = allUsers.find(u => u.id === application.userId);
      if (!user) {
        orphanedApplications.push(application.id);
        console.warn(`⚠️ Orphaned application ${application.id} for non-existent user ${application.userId}`);
      }
    }
    
    // Verify data integrity
    const dataIntegrity = {
      usersTable: allUsers.length > 0,
      applicationsTable: allApplications.length > 0,
      notificationsTable: allNotifications.length >= 0 // Notifications can be empty
    };
    
    // Barangay breakdown
    const barangayBreakdown: { [barangay: string]: any } = {};
    const barangays = [...new Set(allApplications.map(app => app.barangay))];
    
    for (const barangay of barangays) {
      const barangayApplications = allApplications.filter(app => app.barangay === barangay);
      barangayBreakdown[barangay] = {
        totalApplications: barangayApplications.length,
        approvedApplications: barangayApplications.filter(app => app.status === 'approved').length,
        pendingApplications: barangayApplications.filter(app => app.status === 'pending').length,
        rejectedApplications: barangayApplications.filter(app => app.status === 'rejected').length,
      };
    }
    
    const result: DatabaseVerificationResult = {
      success: true,
      totalUsers: allUsers.length,
      totalApplications: allApplications.length,
      approvedApplications: approvedApplications.length,
      approvedOwners: approvedOwners.length,
      pendingApplications: pendingApplications.length,
      rejectedApplications: rejectedApplications.length,
      missingUserRecords,
      orphanedApplications,
      dataIntegrity,
      barangayBreakdown,
      message: `Database verification completed successfully. Found ${approvedOwners.length} approved owners across ${barangays.length} barangays.`
    };
    
    console.log('✅ Database verification completed:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Database verification failed:', error);
    return {
      success: false,
      totalUsers: 0,
      totalApplications: 0,
      approvedApplications: 0,
      approvedOwners: 0,
      pendingApplications: 0,
      rejectedApplications: 0,
      missingUserRecords: [],
      orphanedApplications: [],
      dataIntegrity: {
        usersTable: false,
        applicationsTable: false,
        notificationsTable: false
      },
      barangayBreakdown: {},
      message: `Database verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Get detailed information about approved owners for a specific barangay
 */
export async function getApprovedOwnersForBarangay(barangay: string): Promise<{
  success: boolean;
  barangay: string;
  approvedOwners: Array<{
    userId: string;
    name: string;
    email: string;
    applicationId: string;
    approvedAt: string;
    reviewedBy?: string;
  }>;
  count: number;
  message: string;
}> {
  try {
    console.log(`🔍 Getting approved owners for barangay: ${barangay}`);
    
    const allApplications = await db.list<OwnerApplicationRecord>('owner_applications');
    const allUsers = await db.list<DbUserRecord>('users');
    
    const approvedApplicationsInBarangay = allApplications.filter(
      app => app.status === 'approved' && app.barangay?.toUpperCase() === barangay.toUpperCase()
    );
    
    const approvedOwners = approvedApplicationsInBarangay.map(application => {
      const user = allUsers.find(u => u.id === application.userId);
      return {
        userId: application.userId,
        name: application.name || user?.name || 'Unknown',
        email: application.email || user?.email || '',
        applicationId: application.id,
        approvedAt: application.reviewedAt || application.createdAt,
        reviewedBy: application.reviewedBy
      };
    });
    
    console.log(`✅ Found ${approvedOwners.length} approved owners in ${barangay}`);
    
    return {
      success: true,
      barangay,
      approvedOwners,
      count: approvedOwners.length,
      message: `Successfully retrieved ${approvedOwners.length} approved owners for ${barangay}`
    };
    
  } catch (error) {
    console.error(`❌ Failed to get approved owners for ${barangay}:`, error);
    return {
      success: false,
      barangay,
      approvedOwners: [],
      count: 0,
      message: `Failed to retrieve approved owners: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Verify that a specific owner application is properly stored
 */
export async function verifyOwnerApplication(applicationId: string): Promise<{
  success: boolean;
  application: OwnerApplicationRecord | null;
  user: DbUserRecord | null;
  isApproved: boolean;
  message: string;
}> {
  try {
    console.log(`🔍 Verifying owner application: ${applicationId}`);
    
    const application = await db.get<OwnerApplicationRecord>('owner_applications', applicationId);
    if (!application) {
      return {
        success: false,
        application: null,
        user: null,
        isApproved: false,
        message: `Application ${applicationId} not found`
      };
    }
    
    const user = await db.get<DbUserRecord>('users', application.userId);
    const isApproved = application.status === 'approved';
    
    console.log(`✅ Application verification completed:`, {
      applicationId,
      status: application.status,
      isApproved,
      hasUser: !!user
    });
    
    return {
      success: true,
      application,
      user,
      isApproved,
      message: `Application ${applicationId} verification completed successfully`
    };
    
  } catch (error) {
    console.error(`❌ Failed to verify application ${applicationId}:`, error);
    return {
      success: false,
      application: null,
      user: null,
      isApproved: false,
      message: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Get database statistics for monitoring
 */
export async function getDatabaseStatistics(): Promise<{
  success: boolean;
  statistics: {
    totalUsers: number;
    totalApplications: number;
    approvedApplications: number;
    pendingApplications: number;
    rejectedApplications: number;
    totalNotifications: number;
    unreadNotifications: number;
    barangayCounts: { [barangay: string]: number };
  };
  message: string;
}> {
  try {
    console.log('📊 Getting database statistics...');
    
    const allUsers = await db.list<DbUserRecord>('users');
    const allApplications = await db.list<OwnerApplicationRecord>('owner_applications');
    const allNotifications = await db.list<BrgyNotificationRecord>('brgy_notifications');
    
    const approvedApplications = allApplications.filter(app => app.status === 'approved');
    const pendingApplications = allApplications.filter(app => app.status === 'pending');
    const rejectedApplications = allApplications.filter(app => app.status === 'rejected');
    const unreadNotifications = allNotifications.filter(notif => !notif.isRead);
    
    // Count by barangay
    const barangayCounts: { [barangay: string]: number } = {};
    for (const application of allApplications) {
      const barangay = application.barangay;
      barangayCounts[barangay] = (barangayCounts[barangay] || 0) + 1;
    }
    
    const statistics = {
      totalUsers: allUsers.length,
      totalApplications: allApplications.length,
      approvedApplications: approvedApplications.length,
      pendingApplications: pendingApplications.length,
      rejectedApplications: rejectedApplications.length,
      totalNotifications: allNotifications.length,
      unreadNotifications: unreadNotifications.length,
      barangayCounts
    };
    
    console.log('✅ Database statistics retrieved:', statistics);
    
    return {
      success: true,
      statistics,
      message: 'Database statistics retrieved successfully'
    };
    
  } catch (error) {
    console.error('❌ Failed to get database statistics:', error);
    return {
      success: false,
      statistics: {
        totalUsers: 0,
        totalApplications: 0,
        approvedApplications: 0,
        pendingApplications: 0,
        rejectedApplications: 0,
        totalNotifications: 0,
        unreadNotifications: 0,
        barangayCounts: {}
      },
      message: `Failed to get statistics: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
