# PayMongo GCash Integration

## Overview

PayMongo GCash autopay integration is now fully implemented. The system supports both backend API integration (recommended) and client-side integration. When PayMongo payment pages redirect to GCash, the GCash app opens automatically via native Android handling.

## Setup

See `docs/paymongo-setup-guide.md` for complete setup instructions.

## Architecture

The integration consists of:

1. **PayMongo API Service** (`utils/paymongo-api.ts`)
   - Handles payment intent creation
   - Supports both backend and client-side integration
   - Payment verification

2. **WebView Handler** (`utils/paymongo-webview-handler.ts`)
   - Handles GCash deep links from PayMongo
   - Creates PayMongo payment URLs

3. **Backend API Endpoints** (`api/paymongo/`)
   - Payment intent creation (template)
   - Payment verification (template)
   - Webhook handler (template)

4. **Autopay Integration** (`utils/auto-pay-assistant.ts`)
   - PayMongo autopay processing
   - Payment verification and confirmation

## How It Works

### 1. Native Android Handling (`MainActivity.kt`)
- The `shouldOverrideUrlLoading()` function intercepts `gcash://` URLs
- When PayMongo redirects to GCash via WebView, the native code automatically opens the GCash app
- This applies to **all** GCash payments initiated through WebViews

### 2. React Native WebView Handler (`paymongo-webview-handler.ts`)
- `handlePayMongoWebViewUrl()` - Handles GCash redirects from PayMongo WebView
- Integrated into all GCash payment flows via `openPaymentApp()` function

### 3. Applied to All GCash Payments

The PayMongo WebView handling is automatically applied to:

1. **AutoPayment Component** (`components/AutoPayment.tsx`)
   - Quick Pay with GCash
   - Uses `openPaymentApp()` which includes PayMongo handling

2. **AutoPayAssistant Component** (`components/AutoPayAssistant.tsx`)
   - Auto Pay Assistant GCash payments
   - Uses `openPaymentApp()` which includes PayMongo handling

3. **Tenant Dashboard** (`app/(tabs)/tenant-main-dashboard.tsx`)
   - Main payment flow
   - Uses `openPaymentApp()` which includes PayMongo handling

4. **PayMongoPayment Component** (`components/PayMongoPayment.tsx`)
   - Direct PayMongo payment integration
   - WebView with built-in GCash redirect handling

## Usage

### Direct GCash Payment (Current Implementation)
```typescript
import { openPaymentApp } from '@/utils/auto-pay-assistant';

// This automatically includes PayMongo WebView handling
await openPaymentApp('gcash', phoneNumber, amount, reference);
```

### PayMongo Payment with WebView
```typescript
import PayMongoPayment from '@/components/PayMongoPayment';
import { createPayMongoAutopayUrl } from '@/utils/auto-pay-assistant';

const paymentUrl = await createPayMongoAutopayUrl(bookingId, amount, reference);

<PayMongoPayment
  paymentUrl={paymentUrl}
  onPaymentSuccess={(paymentId) => {
    // Handle success
  }}
/>
```

## Technical Details

### Native Android Code
The `shouldOverrideUrlLoading()` function in `MainActivity.kt`:
- Intercepts `gcash://` URLs from any WebView
- Opens GCash app via Intent
- Works in both production and SIT environments

### React Native Integration
- All GCash payments go through `openPaymentApp()` function
- PayMongo WebView handler is automatically applied
- No additional code needed in payment components

## Testing

To test PayMongo integration:
1. Use PayMongo payment page in WebView
2. Select GCash as payment method
3. When PayMongo redirects to `gcash://`, the GCash app should open automatically
4. Complete payment in GCash app
5. Return to app for payment confirmation

