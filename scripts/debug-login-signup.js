/**
 * Debug script for login/signup button issues
 * Run this in the browser console to test the authentication flow
 */

console.log('🔍 Debug Login/Signup Script Loaded');

// Test login function
window.testLogin = async function(email = 'tenant@test.com', password = 'tenant123') {
  console.log('🧪 Testing login with:', { email, password });
  
  try {
    // Import the login function
    const { loginUser } = await import('../api/auth/login');
    
    console.log('📝 Calling loginUser...');
    const result = await loginUser({ email, password });
    
    console.log('📊 Login result:', result);
    
    if (result.success) {
      console.log('✅ Login successful!');
      console.log('👤 User data:', result.user);
      console.log('🔑 Roles:', result.roles);
    } else {
      console.log('❌ Login failed:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('💥 Login test error:', error);
    return { success: false, error: error.message };
  }
};

// Test signup function
window.testSignup = async function() {
  console.log('🧪 Testing signup...');
  
  const testData = {
    name: 'Test User',
    email: 'testuser@example.com',
    contactNumber: '+639123456789',
    address: '123 Test Street',
    password: 'test123',
    confirmPassword: 'test123',
    role: 'tenant'
  };
  
  try {
    // Import the signup function
    const { signUpUser } = await import('../api/auth/sign-up');
    
    console.log('📝 Calling signUpUser...');
    const result = await signUpUser(testData);
    
    console.log('📊 Signup result:', result);
    
    if (result.success) {
      console.log('✅ Signup successful!');
      console.log('👤 User data:', result.user);
    } else {
      console.log('❌ Signup failed:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('💥 Signup test error:', error);
    return { success: false, error: error.message };
  }
};

// Test mock auth functions
window.testMockAuth = async function() {
  console.log('🧪 Testing mock auth functions...');
  
  try {
    const { mockSignIn, mockSignUp } = await import('../utils/mock-auth');
    
    console.log('📝 Testing mockSignIn...');
    const loginResult = await mockSignIn('tenant@test.com', 'tenant123');
    console.log('📊 Mock login result:', loginResult);
    
    console.log('📝 Testing mockSignUp...');
    const signupResult = await mockSignUp('newuser@test.com', 'newpass123', 'tenant');
    console.log('📊 Mock signup result:', signupResult);
    
    return { loginResult, signupResult };
  } catch (error) {
    console.error('💥 Mock auth test error:', error);
    return { error: error.message };
  }
};

// Test AsyncStorage
window.testAsyncStorage = async function() {
  console.log('🧪 Testing AsyncStorage...');
  
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    
    // Test write
    await AsyncStorage.setItem('test_key', 'test_value');
    console.log('✅ AsyncStorage write successful');
    
    // Test read
    const value = await AsyncStorage.getItem('test_key');
    console.log('✅ AsyncStorage read successful:', value);
    
    // Test remove
    await AsyncStorage.removeItem('test_key');
    console.log('✅ AsyncStorage remove successful');
    
    return true;
  } catch (error) {
    console.error('💥 AsyncStorage test error:', error);
    return false;
  }
};

// Test database
window.testDatabase = async function() {
  console.log('🧪 Testing database...');
  
  try {
    const { db } = await import('../utils/db');
    
    // Test write
    const testRecord = {
      id: 'test_' + Date.now(),
      name: 'Test Record',
      timestamp: new Date().toISOString()
    };
    
    await db.upsert('test_collection', testRecord.id, testRecord);
    console.log('✅ Database write successful');
    
    // Test read
    const retrieved = await db.get('test_collection', testRecord.id);
    console.log('✅ Database read successful:', retrieved);
    
    // Test remove
    await db.remove('test_collection', testRecord.id);
    console.log('✅ Database remove successful');
    
    return true;
  } catch (error) {
    console.error('💥 Database test error:', error);
    return false;
  }
};

// Run all tests
window.runAllTests = async function() {
  console.log('🚀 Running all authentication tests...');
  
  const results = {
    asyncStorage: await testAsyncStorage(),
    database: await testDatabase(),
    mockAuth: await testMockAuth(),
    login: await testLogin(),
    signup: await testSignup()
  };
  
  console.log('📊 All test results:', results);
  
  const passed = Object.values(results).filter(result => 
    result === true || (result && result.success)
  ).length;
  
  const total = Object.keys(results).length;
  
  console.log(`✅ Tests passed: ${passed}/${total}`);
  console.log(`📈 Success rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  return results;
};

console.log('🎯 Debug functions loaded!');
console.log('📋 Available commands:');
console.log('  - testLogin(email, password)');
console.log('  - testSignup()');
console.log('  - testMockAuth()');
console.log('  - testAsyncStorage()');
console.log('  - testDatabase()');
console.log('  - runAllTests()');
