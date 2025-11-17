# Quick PayMongo Test Guide

## 🚀 Fastest Way to Test

### Step 1: Start the Backend Server

Open Terminal 1:
```bash
npm run start:server
```

You should see:
```
🚀 HanapBahay API Server running on port 3000
```

**Keep this terminal running!**

### Step 2: Run the Test Script

Open Terminal 2 (new terminal):
```bash
npm run test:paymongo
```

Or directly:
```bash
node server/test-paymongo.js
```

### Step 3: Check Results

The test will show:
- ✅ Green checkmarks = Working
- ❌ Red X = Not working (check the error messages)

## 📋 What Gets Tested

1. **Environment Variables** - Checks if PayMongo keys are set
2. **Server Health** - Verifies server is running
3. **Payment Intent Creation** - Tests creating a payment
4. **Payment Intent Retrieval** - Tests getting payment status

## ✅ Expected Output (If Working)

```
🧪 PayMongo Integration Test Suite
═══════════════════════════════════════════════════════

📋 Environment Check
─────────────────────────────────────
✅ PAYMONGO_SECRET_KEY: TEST key found
✅ PAYMONGO_PUBLIC_KEY: TEST key found

📋 Test 1: Health Check
─────────────────────────────────────
✅ Health check passed

📋 Test 2: Create Payment Intent
─────────────────────────────────────
✅ Payment intent created successfully
   Intent ID: pi_xxxxx
   Amount: ₱100.00
   Status: awaiting_payment_method

✅ All tests passed! PayMongo integration is working.
```

## ❌ Common Issues

### "Server not reachable"
- **Fix:** Make sure you ran `npm run start:server` in Terminal 1
- Check: Open http://localhost:3000/health in browser

### "PAYMONGO_SECRET_KEY not set"
- **Fix:** Create `server/.env` file with your PayMongo keys
- Get keys from: https://dashboard.paymongo.com/settings/api-keys

### "Invalid API key"
- **Fix:** Check your keys are correct (no extra spaces)
- Make sure you're using TEST keys (start with `sk_test_` and `pk_test_`)

## 🧪 Test in Your App

After the automated tests pass:

1. **Start your Expo app:**
   ```bash
   npm start
   ```

2. **In the app:**
   - Log in as tenant
   - Go to payments
   - Select a payment
   - Choose "PayMongo (Online Payment)"
   - Use test card: `4242 4242 4242 4242`

## 📚 More Details

See `docs/paymongo-testing-guide.md` for comprehensive testing guide.

