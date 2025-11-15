# PayMongo GCash Autopay Setup Guide

Complete step-by-step guide to set up PayMongo GCash autopay integration.

## Prerequisites

1. **PayMongo Account**
   - Sign up at https://paymongo.com
   - Complete account verification
   - Get your API keys from Dashboard → **Developers** tab (not Settings)

2. **Backend Server** (Recommended)
   - Node.js/Express server for secure API calls
   - Or use client-side integration (less secure)

## Step 1: Get PayMongo API Keys

1. Log in to PayMongo Dashboard: https://dashboard.paymongo.com
2. Navigate to the **Developers** tab in the sidebar (not Settings)
3. You'll see your API keys section with:
   - **Public Key** (starts with `pk_test_` for test, `pk_live_` for production)
   - **Secret Key** (starts with `sk_test_` for test, `sk_live_` for production)
4. Toggle between **Test** and **Live** modes to see the corresponding keys
5. If you don't see API keys:
   - Your account might need to be activated (check account status)
   - You may need to generate API keys first
   - Click "Edit" and "Regenerate API key" if needed

⚠️ **Important**: Never expose your Secret Key in client-side code!

**Note**: If the Developers tab is not visible, ensure your account is fully verified and activated.

## Step 2: Configure Environment Variables

Create a `.env` file in your project root (if it doesn't exist):

```env
# PayMongo Configuration
EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_test_your_public_key_here
EXPO_PUBLIC_PAYMONGO_SECRET_KEY=sk_test_your_secret_key_here

# Backend API URL (if using backend)
EXPO_PUBLIC_PAYMONGO_BACKEND_URL=https://your-backend.com

# Webhook Secret (for backend webhook verification)
PAYMONGO_WEBHOOK_SECRET=your_webhook_secret_here
```

### Environment Variable Details

- **EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY**: Your PayMongo public key (safe to use in client-side)
- **EXPO_PUBLIC_PAYMONGO_SECRET_KEY**: Your PayMongo secret key (ONLY use on backend)
- **EXPO_PUBLIC_PAYMONGO_BACKEND_URL**: Your backend API URL (optional, defaults to API_BASE_URL)
- **PAYMONGO_WEBHOOK_SECRET**: Webhook secret from PayMongo dashboard (backend only)

## Step 3: Set Up Backend API (Recommended)

### Option A: Using PayMongo SDK

1. **Install PayMongo SDK**:
   ```bash
   npm install paymongo
   ```

2. **Create Backend Endpoint** (`/api/paymongo/create-payment-intent`):
   ```typescript
   import express from 'express';
   import Paymongo from 'paymongo';
   
   const router = express.Router();
   const paymongo = new Paymongo(process.env.PAYMONGO_SECRET_KEY);
   
   router.post('/api/paymongo/create-payment-intent', async (req, res) => {
     try {
       const { amount, description, reference, bookingId, successUrl, cancelUrl } = req.body;
       
       // Create Payment Intent
       const paymentIntent = await paymongo.paymentIntents.create({
         amount: Math.round(amount * 100), // Convert to centavos
         currency: 'PHP',
         payment_method_allowed: ['gcash'],
         description: description,
         metadata: {
           reference,
           bookingId,
         },
       });
       
       // Create Payment Method for GCash
       const paymentMethod = await paymongo.paymentMethods.create({
         type: 'gcash',
       });
       
       // Attach Payment Method to Intent
       const attached = await paymongo.paymentIntents.attach(paymentIntent.id, {
         payment_method: paymentMethod.id,
         return_url: successUrl || 'hanapbahay://payment-success',
       });
       
       // Get payment URL
       let paymentUrl: string | undefined;
       if (attached.attributes.next_action?.redirect?.url) {
         paymentUrl = attached.attributes.next_action.redirect.url;
       } else if (attached.attributes.client_key) {
         paymentUrl = `https://payments.paymongo.com/checkout/${attached.attributes.client_key}`;
       }
       
       res.json({
         success: true,
         data: attached,
         paymentUrl,
       });
     } catch (error: any) {
       console.error('Error creating PayMongo payment intent:', error);
       res.status(500).json({
         success: false,
         error: error.message || 'Failed to create payment intent',
       });
     }
   });
   ```

### Option B: Using Direct API Calls

See `api/paymongo/create-payment-intent.ts` for a complete example using fetch/axios.

## Step 4: Configure Webhook (Backend)

1. **Create Webhook Endpoint** (`/api/paymongo/webhook`):
   - See `api/paymongo/webhook.ts` for complete implementation

2. **Configure in PayMongo Dashboard**:
   - Go to PayMongo Dashboard → **Webhooks**
   - Click **Add Webhook**
   - Enter webhook URL: `https://your-backend.com/api/paymongo/webhook`
   - Select events:
     - `payment_intent.succeeded`
     - `payment_intent.failed`
     - `payment_intent.processing`
   - Save and copy the webhook secret
   - Add to your backend `.env`: `PAYMONGO_WEBHOOK_SECRET=your_secret_here`

## Step 5: Client-Side Integration (If No Backend)

If you don't have a backend server, the app will use PayMongo's public API directly:

1. Set `EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY` in `.env`
2. The app will automatically use client-side integration
3. ⚠️ **Note**: This is less secure but functional for testing

## Step 6: Using PayMongo in Your App

### Basic Usage

```typescript
import { createPayMongoAutopayUrl } from '@/utils/auto-pay-assistant';
import PayMongoPayment from '@/components/PayMongoPayment';

// Create payment URL
const paymentUrl = await createPayMongoAutopayUrl(
  bookingId,
  amount,
  reference
);

// Show PayMongo payment component
<PayMongoPayment
  paymentUrl={paymentUrl}
  onPaymentSuccess={(paymentId) => {
    console.log('Payment successful:', paymentId);
  }}
  onPaymentError={(error) => {
    console.error('Payment failed:', error);
  }}
/>
```

### With Autopay

```typescript
import { processAutoPayWithPayMongo } from '@/utils/auto-pay-assistant';

// Process autopay with PayMongo
const result = await processAutoPayWithPayMongo(
  bookingId,
  amount,
  reference
);

if (result.success && result.paymentUrl) {
  // Open PayMongo payment page
  // User completes payment in GCash
}
```

## Step 7: Testing

### Test Mode

1. Use PayMongo test keys (`pk_test_...`, `sk_test_...`)
2. Test payment flow:
   - Create payment intent
   - Open PayMongo payment page
   - Select GCash
   - Complete test payment
   - Verify webhook receives event

### Test GCash Account

PayMongo provides test GCash accounts in their documentation. Use these for testing.

## Step 8: Production Setup

1. **Switch to Live Keys**:
   - Replace test keys with live keys (`pk_live_...`, `sk_live_...`)
   - Complete PayMongo account verification
   - Update webhook URL to production URL

2. **Verify Webhook**:
   - Ensure webhook is receiving events
   - Test with real GCash account
   - Monitor webhook logs

3. **Security Checklist**:
   - ✅ Secret key only on backend
   - ✅ Webhook signature verification enabled
   - ✅ HTTPS for all API calls
   - ✅ Environment variables secured
   - ✅ Error handling implemented

## Troubleshooting

### Issue: Can't find API keys in Dashboard

**Solutions**:
1. **Check the Developers tab** (not Settings):
   - Log in to https://dashboard.paymongo.com
   - Look for **"Developers"** in the sidebar menu
   - API keys are located there, not in Settings

2. **Account not activated**:
   - Ensure your PayMongo account is fully verified
   - Complete all verification steps (email, phone, business details)
   - Check your account status in the dashboard

3. **Generate API keys**:
   - In the Developers tab, click "Edit"
   - Select "Generate API key" or "Regenerate API key"
   - You may need to verify with OTP sent to your email/phone

4. **Toggle Test/Live mode**:
   - Make sure you're viewing the correct mode (Test or Live)
   - Test keys start with `pk_test_` and `sk_test_`
   - Live keys start with `pk_live_` and `sk_live_`

5. **Contact PayMongo Support**:
   - If still not visible, contact support@paymongo.com
   - They can help activate your account or generate keys

### Issue: "PayMongo public key not configured"

**Solution**: Add `EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY` to your `.env` file

### Issue: "Failed to create payment intent"

**Solutions**:
1. Check API keys are correct
2. Verify backend endpoint is accessible
3. Check network connectivity
4. Review PayMongo API logs

### Issue: GCash app doesn't open

**Solutions**:
1. Verify Android `MainActivity.kt` handles `gcash://` URLs
2. Check `paymongo-webview-handler.ts` is working
3. Ensure GCash app is installed on device

### Issue: Webhook not receiving events

**Solutions**:
1. Verify webhook URL is accessible (use ngrok for local testing)
2. Check webhook secret is correct
3. Verify webhook events are selected in dashboard
4. Check backend logs for errors

## API Reference

### Functions

- `createPaymentIntent(params)` - Create PayMongo payment intent
- `createPayMongoAutopayUrl(bookingId, amount, reference)` - Create autopay URL
- `processAutoPayWithPayMongo(bookingId, amount, reference)` - Process autopay
- `verifyAndConfirmPayMongoPayment(paymentIntentId, paymentId, tenantId)` - Verify payment

### Components

- `<PayMongoPayment />` - PayMongo payment WebView component

## Support

- PayMongo Documentation: https://developers.paymongo.com
- PayMongo Support: support@paymongo.com
- Check `docs/paymongo-integration.md` for technical details

