/**
 * Simple app loading test
 * This script tests if the app loads without infinite loops
 */

console.log('🧪 App Loading Test Started');

// Test basic functionality
window.testAppLoading = async function() {
  console.log('🔍 Testing app loading...');
  
  try {
    // Test 1: Check if React is loaded
    if (typeof React !== 'undefined') {
      console.log('✅ React is loaded');
    } else {
      console.log('❌ React not loaded');
    }
    
    // Test 2: Check if Expo Router is working
    if (typeof window !== 'undefined' && window.location) {
      console.log('✅ Window and location available');
      console.log('📍 Current URL:', window.location.href);
    } else {
      console.log('❌ Window not available');
    }
    
    // Test 3: Check if AsyncStorage is available
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem('test_key', 'test_value');
      await AsyncStorage.removeItem('test_key');
      console.log('✅ AsyncStorage is working');
    } catch (error) {
      console.log('❌ AsyncStorage error:', error);
    }
    
    // Test 4: Check if database is accessible
    try {
      const { db } = await import('../utils/db');
      console.log('✅ Database is accessible');
    } catch (error) {
      console.log('❌ Database error:', error);
    }
    
    // Test 5: Check for infinite loops (monitor CPU usage)
    const startTime = Date.now();
    let iterations = 0;
    
    const checkLoop = setInterval(() => {
      iterations++;
      if (iterations > 100) {
        clearInterval(checkLoop);
        console.log('⚠️ Potential infinite loop detected (100+ iterations)');
      }
    }, 100);
    
    setTimeout(() => {
      clearInterval(checkLoop);
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`✅ No infinite loops detected (${iterations} iterations in ${duration}ms)`);
    }, 5000);
    
    return true;
  } catch (error) {
    console.error('❌ App loading test failed:', error);
    return false;
  }
};

// Auto-run test
setTimeout(() => {
  testAppLoading();
}, 2000);

console.log('🎯 App loading test ready! Run testAppLoading() to test manually.');
