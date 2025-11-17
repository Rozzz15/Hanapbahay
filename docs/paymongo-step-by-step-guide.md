# Paymongo Integration - Step-by-Step Guide

This guide walks you through every step needed to get Paymongo payments working in your HanapBahay app.

## 📋 Prerequisites Checklist

Before starting, make sure you have:
- [ ] Node.js v18 or higher installed
- [ ] npm or yarn installed
- [ ] A Paymongo account (sign up at https://paymongo.com)
- [ ] Access to your project files

---

## Step 1: Create Paymongo Account and Get API Keys

### 1.1 Sign Up for Paymongo
1. Go to https://paymongo.com
2. Click "Sign Up" or "Get Started"
3. Complete the registration form
4. Verify your email address

### 1.2 Get Your API Keys
1. Log in to https://dashboard.paymongo.com
2. Navigate to **Settings** → **API Keys**
3. You'll see two keys:
   - **Secret Key** (starts with `sk_test_` for test mode)
   - **Public Key** (starts with `pk_test_` for test mode)
4. **Copy both keys** - you'll need them in the next step

**Note:** Use TEST keys for development. You'll get LIVE keys after account verification.

---

## Step 2: Set Up Backend Server

### 2.1 Install Backend Dependencies
Open your terminal and run:

```bash
cd server
npm install
```

This installs:
- `express` - Web server framework
- `cors` - Cross-origin resource sharing
- `dotenv` - Environment variable management

**Expected output:** Dependencies installed successfully

### 2.2 Create Environment File
1. In the `server` directory, create a new file named `.env`
2. Open the `.env` file in a text editor
3. Add the following content:

```env
# Paymongo API Keys (from Step 1.2)
PAYMONGO_SECRET_KEY=sk_test_paste_your_secret_key_here
PAYMONGO_PUBLIC_KEY=pk_test_paste_your_public_key_here

# Server Configuration
PORT=3000

# Webhook Secret (we'll get this in Step 5)
# PAYMONGO_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

4. **Replace** `paste_your_secret_key_here` and `paste_your_public_key_here` with your actual keys from Step 1.2
5. Save the file

**Important:** Never commit the `.env` file to git! It contains sensitive keys.

### 2.3 Verify Server Setup
1. Start the server:
   ```bash
   npm start
   ```

2. You should see:
   ```
   🚀 HanapBahay API Server running on port 3000
   📍 Health check: http://localhost:3000/health
   💳 Paymongo routes: http://localhost:3000/api/paymongo
   ```

3. Test the health endpoint:
   - Open browser: http://localhost:3000/health
   - Or use curl: `curl http://localhost:3000/health`
   - Should return: `{"status":"ok",...}`

4. **Keep the server running** - you'll need it for testing

**Troubleshooting:**
- If port 3000 is in use, change `PORT=3001` in `.env` and restart
- If you see "PAYMONGO_SECRET_KEY not set" warning, check your `.env` file

---

## Step 3: Configure Frontend to Connect to Backend

### 3.1 Check API URL Configuration
1. Open `constants/index.ts` in your project
2. Verify the API URL is set correctly:

```typescript
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
```

### 3.2 Set Frontend Environment Variable (Optional)
If you want to use a different URL, create or update `.env` in the project root:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

**Note:** For mobile devices, use your computer's IP address instead of `localhost`:
- Find your IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
- Use: `EXPO_PUBLIC_API_URL=http://192.168.1.100:3000` (replace with your IP)

### 3.3 Restart Expo Server
If you changed environment variables:
```bash
# Stop Expo (Ctrl+C)
# Restart with:
npm start
```

---

## Step 4: Test the Integration

### 4.1 Start Both Servers
You need TWO terminals running:

**Terminal 1 - Backend Server:**
```bash
cd server
npm start
```

**Terminal 2 - Expo App:**
```bash
npm start
```

### 4.2 Test Payment Flow
1. Open your app (Expo Go, simulator, or browser)
2. Log in as a **tenant**
3. Navigate to the **Tenant Dashboard**
4. Find a payment that needs to be paid
5. Click **"Pay"** button
6. In the payment modal, you should see **"Paymongo (Online Payment)"** option
7. Click on **"Paymongo (Online Payment)"**
8. The Paymongo payment modal should open

### 4.3 Test with Paymongo Test Card
1. In the Paymongo modal, select **"Credit/Debit Card"**
2. Use these test card details:
   - **Card Number:** `4242 4242 4242 4242`
   - **Expiry:** Any future date (e.g., `12/25`)
   - **CVC:** Any 3 digits (e.g., `123`)
   - **Name:** Any name
3. Complete the payment
4. Payment should be processed and recorded

**Expected Result:**
- Payment modal closes
- Success message appears
- Payment status updates to "Pending Owner Confirmation"
- Owner receives notification

**Troubleshooting:**
- If Paymongo modal doesn't open: Check backend server is running
- If payment fails: Check API keys in `server/.env`
- If "Network Error": Check `EXPO_PUBLIC_API_URL` points to correct backend

---

## Step 5: Set Up Webhooks (For Production)

Webhooks allow Paymongo to notify your server when payments complete. This is optional for testing but required for production.

### 5.1 Install ngrok (For Local Testing)
1. Install ngrok:
   ```bash
   npm install -g ngrok
   ```
   Or download from: https://ngrok.com/download

2. Start ngrok to expose your local server:
   ```bash
   ngrok http 3000
   ```

3. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### 5.2 Configure Webhook in Paymongo
1. Go to https://dashboard.paymongo.com
2. Navigate to **Settings** → **Webhooks**
3. Click **"Create Webhook"**
4. Fill in:
   - **URL:** `https://your-ngrok-url.ngrok.io/api/paymongo/webhook`
   - **Events:** Select:
     - ✅ `payment.succeeded`
     - ✅ `payment.failed`
     - ✅ `payment.pending`
5. Click **"Create Webhook"**
6. **Copy the Webhook Secret** (starts with `whsec_`)

### 5.3 Add Webhook Secret to Backend
1. Open `server/.env`
2. Add the webhook secret:
   ```env
   PAYMONGO_WEBHOOK_SECRET=whsec_paste_your_webhook_secret_here
   ```
3. Save the file
4. Restart the backend server

### 5.4 Test Webhook
1. Make a test payment (Step 4.3)
2. Check your backend server logs
3. You should see: `Received Paymongo webhook: payment.succeeded`

**Note:** For production, replace ngrok URL with your production domain.

---

## Step 6: Verify Everything Works

### 6.1 Complete Test Checklist
Test each scenario:

- [ ] **Payment Intent Creation**
  - Open payment modal
  - Select Paymongo
  - Modal opens without errors

- [ ] **Payment Method Selection**
  - Can select GCash, PayMaya, or Card
  - No errors when selecting

- [ ] **Card Payment**
  - Complete payment with test card
  - Payment succeeds
  - Payment recorded in app

- [ ] **Payment Status**
  - Payment shows as "Pending Owner Confirmation"
  - Owner can see payment in dashboard

- [ ] **Webhook (if set up)**
  - Webhook receives events
  - Server logs show webhook received

### 6.2 Check Backend Logs
Your backend server should show:
```
✅ Payment intent created: pi_xxxxx
✅ Payment confirmed: pi_xxxxx
✅ Webhook received: payment.succeeded
```

### 6.3 Check Frontend Console
No errors should appear in:
- Expo console
- Browser console (if testing on web)
- React Native debugger

---

## Step 7: Prepare for Production

### 7.1 Switch to Live Keys
1. In Paymongo Dashboard, go to **Settings** → **API Keys**
2. Get your **LIVE** keys (after account verification)
3. Update `server/.env`:
   ```env
   PAYMONGO_SECRET_KEY=sk_live_your_live_secret_key
   PAYMONGO_PUBLIC_KEY=pk_live_your_live_public_key
   ```

### 7.2 Deploy Backend Server
Deploy to a hosting service:
- **Heroku:** https://www.heroku.com
- **Railway:** https://railway.app
- **AWS:** https://aws.amazon.com
- **DigitalOcean:** https://www.digitalocean.com

### 7.3 Update Webhook URL
1. In Paymongo Dashboard → **Webhooks**
2. Update webhook URL to your production domain:
   ```
   https://api.yourdomain.com/api/paymongo/webhook
   ```
3. Get new webhook secret and update `server/.env`

### 7.4 Update Frontend API URL
Update `EXPO_PUBLIC_API_URL` to point to production:
```env
EXPO_PUBLIC_API_URL=https://api.yourdomain.com
```

### 7.5 Security Checklist
- [ ] HTTPS enabled on production server
- [ ] Environment variables secured (not in git)
- [ ] CORS configured for your domain only
- [ ] Webhook signature verification enabled
- [ ] Error logging set up
- [ ] Rate limiting configured

---

## 🐛 Troubleshooting Common Issues

### Issue: Backend server won't start
**Solution:**
- Check if port 3000 is in use: `netstat -ano | findstr :3000` (Windows)
- Change PORT in `.env` to another port (e.g., 3001)
- Verify all dependencies installed: `npm install`

### Issue: "PAYMONGO_SECRET_KEY not set" warning
**Solution:**
- Check `.env` file exists in `server/` directory
- Verify keys are correct (no extra spaces)
- Restart server after changing `.env`

### Issue: Payment modal doesn't open
**Solution:**
- Verify backend server is running
- Check `EXPO_PUBLIC_API_URL` is correct
- Check browser/Expo console for errors
- Verify API keys are valid

### Issue: Payment fails with "Invalid API key"
**Solution:**
- Double-check API keys in `server/.env`
- Make sure you're using TEST keys in test mode
- Verify keys match (test with test, live with live)

### Issue: Webhook not receiving events
**Solution:**
- Verify webhook URL is accessible (use ngrok for local)
- Check webhook secret is correct
- Ensure webhook is enabled in Paymongo dashboard
- Check server logs for errors

### Issue: "Network request failed" in app
**Solution:**
- For mobile: Use IP address instead of `localhost`
- Check firewall isn't blocking port 3000
- Verify backend server is running
- Check `EXPO_PUBLIC_API_URL` is correct

---

## ✅ Success Criteria

You'll know everything is working when:

1. ✅ Backend server starts without errors
2. ✅ Health check endpoint returns `{"status":"ok"}`
3. ✅ Paymongo option appears in payment modal
4. ✅ Payment modal opens and shows payment methods
5. ✅ Test payment completes successfully
6. ✅ Payment is recorded in the app
7. ✅ Owner receives payment notification
8. ✅ Webhook receives events (if configured)

---

## 📚 Additional Resources

- **Paymongo API Docs:** https://developers.paymongo.com/
- **Paymongo Dashboard:** https://dashboard.paymongo.com
- **Backend Setup Guide:** `docs/paymongo-backend-setup.md`
- **Integration Details:** `docs/paymongo-integration.md`
- **Quick Start:** `docs/paymongo-quick-start.md`

---

## 🆘 Need Help?

If you're stuck:
1. Check the troubleshooting section above
2. Review server logs for error messages
3. Check browser/Expo console for frontend errors
4. Verify all steps were completed correctly
5. Review the detailed documentation files

---

## 📝 Next Steps After Setup

Once everything is working:

1. **Test all payment methods** (GCash, PayMaya, Card)
2. **Test error scenarios** (declined cards, failed payments)
3. **Integrate database** in webhook handlers (see TODO comments)
4. **Add payment history** showing Paymongo transactions
5. **Set up monitoring** for production
6. **Test with real accounts** before going live

---

**Last Updated:** 2024
**Version:** 1.0

