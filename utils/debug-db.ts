import { db } from './db';
import { mockSignUp, getDatabaseState } from './mock-auth';

export async function debugRegistration(email: string, password: string, role: 'tenant' | 'owner') {
  console.log('🔍 Starting registration debug...');
  
  try {
    // Check current database state
    console.log('📊 Current database state:');
    const dbState = await getDatabaseState();
    console.log(dbState);
    
    // Attempt registration
    console.log(`🔐 Attempting to register ${role}: ${email}`);
    const result = await mockSignUp(email, password, role);
    console.log('Registration result:', result);
    
    if (result.success) {
      // Check database state after registration
      console.log('📊 Database state after registration:');
      const newDbState = await getDatabaseState();
      console.log(newDbState);
      
      // Check specific collections
      const users = await db.list('users');
      const tenants = await db.list('tenants');
      const owners = await db.list('owners');
      
      console.log('👥 Users:', users);
      console.log('🏠 Tenants:', tenants);
      console.log('🏢 Owners:', owners);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Debug registration error:', error);
    throw error;
  }
}

export async function debugPublishListing(testData: any) {
  console.log('🔍 Starting publish debug...');
  
  try {
    console.log('📊 Test data:', testData);
    
    // Test database connection
    console.log('🔌 Testing database connection...');
    await db.get('published_listings', 'test_key');
    console.log('✅ Database connection successful');
    
    // Generate test listing ID
    const testId = `test_${Date.now()}`;
    const publishedData = {
      ...testData,
      status: 'published',
      publishedAt: new Date().toISOString(),
      userId: 'test_user',
      id: testId,
      views: 0,
      inquiries: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('📝 Test listing data:', publishedData);
    
    // Test upsert operation
    console.log('💾 Testing upsert operation...');
    await db.upsert('published_listings', testId, publishedData);
    console.log('✅ Upsert operation successful');
    
    // Verify the data was saved
    console.log('🔍 Verifying saved data...');
    const savedListing = await db.get('published_listings', testId);
    if (savedListing) {
      console.log('✅ Listing verification successful:', savedListing);
    } else {
      console.error('❌ Listing verification failed - no data retrieved');
    }
    
    // Clean up test data
    console.log('🧹 Cleaning up test data...');
    await db.remove('published_listings', testId);
    console.log('✅ Test data cleaned up successfully');
    
    return { success: true, message: 'Publish functionality working correctly' };
  } catch (error) {
    console.error('❌ Debug publish error:', error);
    return { success: false, error: error.message };
  }
}

export async function clearAllData() {
  console.log('🗑️ Clearing all data...');
  try {
    // Clear mock auth data
    const { clearAllUsers } = await import('./mock-auth');
    await clearAllUsers();
    
    // Clear database collections
    await db.clearAllCollections();
    
    console.log('✅ All data cleared');
  } catch (error) {
    console.error('❌ Error clearing data:', error);
  }
}
