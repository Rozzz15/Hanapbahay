/**
 * Test Cloud Backend Connection
 * 
 * This script tests if your cloud backend is accessible and working.
 * Run this before building your APK to ensure everything is configured correctly.
 * 
 * Usage: node scripts/test-cloud-backend.js [backend-url]
 */

const https = require('https');
const http = require('http');

// Get backend URL from command line or use default
const backendUrl = process.argv[2] || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

console.log('🧪 Testing Cloud Backend Connection\n');
console.log('📍 Backend URL:', backendUrl);
console.log('─'.repeat(50));

// Parse URL
let url;
try {
  url = new URL(backendUrl);
} catch (error) {
  console.error('❌ Invalid URL:', backendUrl);
  console.error('   Example: https://your-backend.railway.app');
  process.exit(1);
}

const isHttps = url.protocol === 'https:';
const client = isHttps ? https : http;

// Test health endpoint
function testHealth() {
  return new Promise((resolve, reject) => {
    const healthUrl = `${backendUrl}/health`;
    console.log('\n1️⃣ Testing Health Endpoint...');
    console.log('   GET', healthUrl);

    const req = client.get(healthUrl, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            console.log('   ✅ Status:', res.statusCode);
            console.log('   ✅ Response:', JSON.stringify(json, null, 2));
            resolve(true);
          } catch (error) {
            console.log('   ⚠️  Response is not JSON:', data.substring(0, 100));
            resolve(false);
          }
        } else {
          console.log('   ❌ Status:', res.statusCode);
          console.log('   ❌ Response:', data.substring(0, 100));
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      console.log('   ❌ Error:', error.message);
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Test PayMongo endpoint (will fail without keys, but tests if endpoint exists)
function testPayMongoEndpoint() {
  return new Promise((resolve) => {
    const paymongoUrl = `${backendUrl}/api/paymongo/create-payment-intent`;
    console.log('\n2️⃣ Testing PayMongo Endpoint...');
    console.log('   POST', paymongoUrl);

    const postData = JSON.stringify({
      amount: 10000,
      currency: 'PHP',
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = client.request(paymongoUrl, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log('   ✅ Status:', res.statusCode);
          console.log('   ✅ PayMongo endpoint is working!');
          resolve(true);
        } else if (res.statusCode === 401 || res.statusCode === 500) {
          console.log('   ⚠️  Status:', res.statusCode);
          console.log('   ⚠️  Endpoint exists but may need PayMongo keys configured');
          console.log('   ⚠️  Response:', data.substring(0, 200));
          resolve(true); // Endpoint exists, which is what we're testing
        } else {
          console.log('   ❌ Status:', res.statusCode);
          console.log('   ❌ Response:', data.substring(0, 200));
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.log('   ❌ Error:', error.message);
      resolve(false);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      console.log('   ⚠️  Request timeout');
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

// Main test function
async function runTests() {
  try {
    // Test 1: Health endpoint
    const healthOk = await testHealth();
    
    if (!healthOk) {
      console.log('\n❌ Health check failed. Backend may not be accessible.');
      console.log('\n💡 Troubleshooting:');
      console.log('   1. Check if backend is deployed and running');
      console.log('   2. Verify the URL is correct');
      console.log('   3. Check Railway/Render logs for errors');
      process.exit(1);
    }

    // Test 2: PayMongo endpoint
    await testPayMongoEndpoint();

    console.log('\n' + '─'.repeat(50));
    console.log('✅ Backend is accessible and working!');
    console.log('\n📱 Next Steps:');
    console.log('   1. Set EAS secret: eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "' + backendUrl + '"');
    console.log('   2. Build APK: eas build --platform android --profile preview');
    console.log('   3. Test APK on device');
    
  } catch (error) {
    console.log('\n❌ Test failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Verify backend URL is correct:', backendUrl);
    console.log('   2. Check if backend is deployed');
    console.log('   3. Test backend in browser: ' + backendUrl + '/health');
    process.exit(1);
  }
}

// Run tests
runTests();

