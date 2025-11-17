/**
 * PayMongo Integration Test Script
 * 
 * This script tests if your PayMongo setup is working correctly.
 * 
 * Usage:
 *   1. Make sure server is running: npm run start:server
 *   2. Run this script: node server/test-paymongo.js
 */

const https = require('https');
const http = require('http');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_AMOUNT = 10000; // 100.00 PHP in cents

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            data: json,
            headers: res.headers,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function testHealthCheck() {
  log('\n📋 Test 1: Health Check', 'cyan');
  log('─────────────────────────────────────', 'cyan');
  
  try {
    const response = await makeRequest(`${API_BASE_URL}/health`);
    
    if (response.status === 200 && response.data.status === 'ok') {
      log('✅ Health check passed', 'green');
      log(`   Server: ${response.data.service}`, 'blue');
      log(`   Timestamp: ${response.data.timestamp}`, 'blue');
      return true;
    } else {
      log('❌ Health check failed', 'red');
      log(`   Status: ${response.status}`, 'red');
      log(`   Response: ${JSON.stringify(response.data)}`, 'red');
      return false;
    }
  } catch (error) {
    log('❌ Health check failed - Server not reachable', 'red');
    log(`   Error: ${error.message}`, 'red');
    log(`   Make sure server is running: npm run start:server`, 'yellow');
    return false;
  }
}

async function testCreatePaymentIntent() {
  log('\n📋 Test 2: Create Payment Intent', 'cyan');
  log('─────────────────────────────────────', 'cyan');
  
  try {
    const response = await makeRequest(`${API_BASE_URL}/api/paymongo/create-payment-intent`, {
      method: 'POST',
      body: {
        amount: TEST_AMOUNT,
        currency: 'PHP',
        description: 'Test payment from integration test',
        metadata: {
          test: true,
          timestamp: new Date().toISOString(),
        },
      },
    });

    if (response.status === 200 && response.data.success && response.data.data) {
      const intent = response.data.data;
      log('✅ Payment intent created successfully', 'green');
      log(`   Intent ID: ${intent.id}`, 'blue');
      log(`   Amount: ₱${(intent.attributes.amount / 100).toFixed(2)}`, 'blue');
      log(`   Status: ${intent.attributes.status}`, 'blue');
      log(`   Client Key: ${intent.attributes.client_key ? 'Present' : 'Missing'}`, 'blue');
      return { success: true, intentId: intent.id };
    } else {
      log('❌ Payment intent creation failed', 'red');
      log(`   Status: ${response.status}`, 'red');
      log(`   Error: ${response.data.error || JSON.stringify(response.data)}`, 'red');
      
      if (response.data.error && response.data.error.includes('API key')) {
        log('\n   💡 Tip: Check your PayMongo API keys in server/.env', 'yellow');
        log('      Get keys from: https://dashboard.paymongo.com/settings/api-keys', 'yellow');
      }
      
      return { success: false };
    }
  } catch (error) {
    log('❌ Payment intent creation failed - Network error', 'red');
    log(`   Error: ${error.message}`, 'red');
    return { success: false };
  }
}

async function testGetPaymentIntent(intentId) {
  if (!intentId) {
    log('\n📋 Test 3: Get Payment Intent - Skipped (no intent ID)', 'yellow');
    return false;
  }

  log('\n📋 Test 3: Get Payment Intent', 'cyan');
  log('─────────────────────────────────────', 'cyan');
  
  try {
    const response = await makeRequest(`${API_BASE_URL}/api/paymongo/payment-intent/${intentId}`);

    if (response.status === 200 && response.data.success && response.data.data) {
      const intent = response.data.data;
      log('✅ Payment intent retrieved successfully', 'green');
      log(`   Intent ID: ${intent.id}`, 'blue');
      log(`   Status: ${intent.attributes.status}`, 'blue');
      log(`   Amount: ₱${(intent.attributes.amount / 100).toFixed(2)}`, 'blue');
      return true;
    } else {
      log('❌ Payment intent retrieval failed', 'red');
      log(`   Status: ${response.status}`, 'red');
      log(`   Error: ${response.data.error || JSON.stringify(response.data)}`, 'red');
      return false;
    }
  } catch (error) {
    log('❌ Payment intent retrieval failed - Network error', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

function checkEnvironmentVariables() {
  log('\n📋 Environment Check', 'cyan');
  log('─────────────────────────────────────', 'cyan');
  
  require('dotenv').config({ path: require('path').join(__dirname, '.env') });
  
  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  const publicKey = process.env.PAYMONGO_PUBLIC_KEY;
  
  if (secretKey) {
    const isTest = secretKey.startsWith('sk_test_');
    const isLive = secretKey.startsWith('sk_live_');
    log(`✅ PAYMONGO_SECRET_KEY: ${isTest ? 'TEST' : isLive ? 'LIVE' : 'UNKNOWN'} key found`, 
        isTest || isLive ? 'green' : 'yellow');
    log(`   Key: ${secretKey.substring(0, 12)}...`, 'blue');
  } else {
    log('❌ PAYMONGO_SECRET_KEY: Not set', 'red');
    log('   Create server/.env file with your PayMongo keys', 'yellow');
  }
  
  if (publicKey) {
    const isTest = publicKey.startsWith('pk_test_');
    const isLive = publicKey.startsWith('pk_live_');
    log(`✅ PAYMONGO_PUBLIC_KEY: ${isTest ? 'TEST' : isLive ? 'LIVE' : 'UNKNOWN'} key found`, 
        isTest || isLive ? 'green' : 'yellow');
    log(`   Key: ${publicKey.substring(0, 12)}...`, 'blue');
  } else {
    log('❌ PAYMONGO_PUBLIC_KEY: Not set', 'red');
  }
  
  if (!secretKey || !publicKey) {
    log('\n   💡 Get your keys from: https://dashboard.paymongo.com/settings/api-keys', 'yellow');
  }
  
  return secretKey && publicKey;
}

async function runAllTests() {
  log('\n🧪 PayMongo Integration Test Suite', 'cyan');
  log('═══════════════════════════════════════════════════════', 'cyan');
  
  // Check environment
  const envOk = checkEnvironmentVariables();
  
  if (!envOk) {
    log('\n⚠️  Environment variables not set. Some tests may fail.', 'yellow');
  }
  
  // Test 1: Health check
  const healthOk = await testHealthCheck();
  
  if (!healthOk) {
    log('\n❌ Server is not running. Start it with: npm run start:server', 'red');
    process.exit(1);
  }
  
  // Test 2: Create payment intent
  const createResult = await testCreatePaymentIntent();
  
  // Test 3: Get payment intent (if creation succeeded)
  if (createResult.success) {
    await testGetPaymentIntent(createResult.intentId);
  }
  
  // Summary
  log('\n═══════════════════════════════════════════════════════', 'cyan');
  log('📊 Test Summary', 'cyan');
  log('─────────────────────────────────────', 'cyan');
  
  if (healthOk && createResult.success) {
    log('✅ All tests passed! PayMongo integration is working.', 'green');
    log('\n💡 Next steps:', 'cyan');
    log('   1. Test in your app: Go to tenant dashboard → Select payment → PayMongo', 'blue');
    log('   2. Use test card: 4242 4242 4242 4242 (any future date, any CVC)', 'blue');
  } else {
    log('❌ Some tests failed. Check the errors above.', 'red');
    log('\n💡 Troubleshooting:', 'cyan');
    log('   1. Make sure server is running: npm run start:server', 'blue');
    log('   2. Check server/.env file has PayMongo keys', 'blue');
    log('   3. Verify keys are correct at: https://dashboard.paymongo.com', 'blue');
  }
  
  log('\n', 'reset');
}

// Run tests
runAllTests().catch((error) => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});

