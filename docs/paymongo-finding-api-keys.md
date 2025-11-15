# Finding PayMongo API Keys - Step by Step

## Where to Find API Keys

### ✅ Correct Location: **Developers Tab**

1. **Log in to PayMongo Dashboard**
   - Go to: https://dashboard.paymongo.com
   - Sign in with your account

2. **Navigate to Developers Tab**
   - Look in the **left sidebar menu**
   - Click on **"Developers"** (not Settings!)
   - The Developers tab contains all API-related settings

3. **View Your API Keys**
   - You'll see sections for:
     - **Public Key** (starts with `pk_test_` or `pk_live_`)
     - **Secret Key** (starts with `sk_test_` or `sk_live_`)

4. **Toggle Between Test and Live**
   - Use the toggle switch to switch between Test and Live modes
   - Test keys are for development/testing
   - Live keys are for production

## If You Don't See the Developers Tab

### Possible Reasons:

1. **Account Not Fully Activated**
   - Complete account verification
   - Verify email address
   - Verify phone number
   - Complete business verification (if required)

2. **Account Status**
   - Check your account status in the dashboard
   - Some features require M2 (fully verified) status
   - Test mode might work with M1 status

3. **Need to Generate Keys**
   - Click "Edit" in the Developers section
   - Select "Generate API key" or "Regenerate API key"
   - You may need to verify with OTP

## Visual Guide

```
PayMongo Dashboard
├── Dashboard (home)
├── Transactions
├── Customers
├── Developers ← API Keys are HERE!
│   ├── API Keys
│   │   ├── Public Key: pk_test_...
│   │   └── Secret Key: sk_test_...
│   ├── Webhooks
│   └── API Logs
├── Settings ← NOT here!
└── Help
```

## Quick Checklist

- [ ] Logged into https://dashboard.paymongo.com
- [ ] Clicked "Developers" tab in sidebar
- [ ] Can see Public Key and Secret Key
- [ ] Toggled to Test mode (for development)
- [ ] Copied Public Key (starts with `pk_test_`)

## Still Can't Find It?

1. **Check Account Status**
   - Dashboard → Account Settings
   - Ensure account is verified

2. **Try Generating New Keys**
   - Developers tab → Edit → Generate API key

3. **Contact Support**
   - Email: support@paymongo.com
   - They can help activate your account or locate your keys

## Alternative: Check Email

When you first signed up, PayMongo may have sent you an email with:
- Welcome information
- API key details
- Setup instructions

Check your email inbox for messages from PayMongo.

