# PayMongo Testing Guide

This guide will help you verify that your PayMongo integration is working correctly.

## Quick Test Checklist

- [ ] Backend server is running
- [ ] PayMongo API keys are configured
- [ ] Health endpoint responds
- [ ] Payment intent can be created
- [ ] Payment flow works in the app

## Method 1: Automated Test Script

The easiest way to test everything:

### Step 1: Start the Backend Server

```bash
npm run start:server
```

Keep this terminal running.

### Step 2: Run the Test Script

In a new terminal:

```bash
node server/test-paymongo.js
```

The script will:
- ✅ Check if server is running
- ✅ Verify environment variables
- ✅ Test payment intent creation
- ✅ Test payment intent retrieval

### Expected Output

If everything is working, you'll see:

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

📋 Test 3: Get Payment Intent
─────────────────────────────────────
✅ Payment intent retrieved successfully

✅ All tests passed! PayMongo integration is working.
```

## Method 2: Manual Testing

### Test 1: Health Check

Open your browser or use curl:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "HanapBahay API Server"
}
```

### Test 2: Create Payment Intent

```bash
curl -X POST http://localhost:3000/api/paymongo/create-payment-intent \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "currency": "PHP",
    "description": "Test payment",
    "metadata": {
      "test": true
    }
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "id": "pi_xxxxx",
    "type": "payment_intent",
    "attributes": {
      "amount": 10000,
      "currency": "PHP",
      "status": "awaiting_payment_method",
      "client_key": "pk_test_xxxxx",
      ...
    }
  }
}
```

### Test 3: Test in the App

1. **Start your Expo app:**
   ```bash
   npm start
   ```

2. **Navigate to Tenant Dashboard:**
   - Log in as a tenant
   - Go to your payments/rentals
   - Select a payment that needs to be paid

3. **Initiate PayMongo Payment:**
   - Click on the payment
   - Choose "PayMongo (Online Payment)" option
   - The payment modal should open

4. **Test with PayMongo Test Card:**
   - **Card Number:** `4242 4242 4242 4242`
   - **Expiry:** Any future date (e.g., 12/25)
   - **CVC:** Any 3 digits (e.g., 123)
   - **Name:** Any name

5. **Complete the Payment:**
   - Fill in the card details
   - Submit the payment
   - You should see a success message

## Method 3: Browser Testing (Web)

If you're testing on web:

1. Open your app in the browser
2. Open browser DevTools (F12)
3. Go to Network tab
4. Try to make a payment
5. Look for requests to `/api/paymongo/create-payment-intent`
6. Check if they return 200 status with payment intent data

## Common Issues and Solutions

### Issue: "Network request failed"

**Solution:**
- Make sure backend server is running: `npm run start:server`
- Check if server is accessible: `curl http://localhost:3000/health`
- If on mobile device, use your computer's IP instead of `localhost`

### Issue: "PAYMONGO_SECRET_KEY not set"

**Solution:**
1. Create `server/.env` file
2. Add your PayMongo keys:
   ```env
   PAYMONGO_SECRET_KEY=sk_test_xxxxx
   PAYMONGO_PUBLIC_KEY=pk_test_xxxxx
   ```
3. Restart the server

### Issue: "Invalid API key" or "Authentication failed"

**Solution:**
- Verify your API keys are correct
- Make sure you're using TEST keys for development
- Check keys at: https://dashboard.paymongo.com/settings/api-keys
- Ensure no extra spaces or quotes in `.env` file

### Issue: Payment intent created but payment fails

**Solution:**
- Check PayMongo dashboard for error details
- Verify you're using test cards for test mode
- Check browser console for JavaScript errors
- Verify webhook is configured (for production)

### Issue: Server won't start

**Solution:**
- Check if port 3000 is in use: `netstat -ano | findstr :3000` (Windows)
- Change PORT in `server/.env` if needed
- Make sure dependencies are installed: `cd server && npm install`

## Testing Different Payment Methods

### GCash Test

1. Create payment intent
2. Select GCash as payment method
3. You'll be redirected to GCash payment page
4. Use test credentials (if available) or cancel to test flow

### PayMaya Test

1. Create payment intent
2. Select PayMaya as payment method
3. You'll be redirected to PayMaya payment page
4. Use test credentials (if available) or cancel to test flow

### Card Payment Test

Use these test card numbers:

- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **3D Secure Required:** `4000 0025 0000 3155`

## Verification Checklist

After testing, verify:

- [ ] ✅ Server starts without errors
- [ ] ✅ Health endpoint returns OK
- [ ] ✅ Payment intent can be created
- [ ] ✅ Payment intent can be retrieved
- [ ] ✅ Payment modal opens in app
- [ ] ✅ Test card payment succeeds
- [ ] ✅ Payment status updates correctly
- [ ] ✅ Success message appears after payment

## Next Steps

Once testing is complete:

1. **For Development:**
   - Keep using TEST keys
   - Test all payment methods
   - Test error scenarios

2. **For Production:**
   - Switch to LIVE keys
   - Set up webhooks
   - Test with real payments (small amounts)
   - Monitor PayMongo dashboard

## Additional Resources

- **PayMongo Dashboard:** https://dashboard.paymongo.com
- **PayMongo Docs:** https://developers.paymongo.com
- **Test Cards:** https://developers.paymongo.com/docs/testing
- **Webhook Testing:** Use ngrok for local webhook testing

## Need Help?

If tests are failing:

1. Run the test script: `node server/test-paymongo.js`
2. Check server logs for errors
3. Verify `.env` file configuration
4. Check PayMongo dashboard for API errors
5. Review error messages in the app console

