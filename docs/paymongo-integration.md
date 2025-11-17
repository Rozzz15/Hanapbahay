# Paymongo Integration for Tenant Payments

## Overview

This document describes the Paymongo integration for tenant-to-owner payments in the HanapBahay application. The integration allows tenants to pay rent using Paymongo's secure payment gateway, supporting GCash, PayMaya, and credit/debit cards.

## Architecture

### Components

1. **Paymongo API Utilities** (`utils/paymongo-api.ts`)
   - Payment intent creation
   - Payment method attachment
   - Payment confirmation
   - Payment status verification

2. **Paymongo Payment Component** (`components/PayMongoPayment.tsx`)
   - User interface for payment processing
   - Payment method selection (GCash, PayMaya, Card)
   - WebView integration for payment redirects
   - Payment status tracking

3. **API Routes** (`api/paymongo/`)
   - `create-payment-intent.ts` - Creates payment intents
   - `verify-payment.ts` - Verifies payment status
   - `webhook.ts` - Handles Paymongo webhook events

4. **Type Definitions**
   - Updated `RentPaymentRecord` and `RentPayment` interfaces to include Paymongo fields
   - Paymongo-specific types for payment intents and methods

## Payment Flow

### 1. Tenant Initiates Payment

When a tenant wants to pay rent:
1. Tenant selects a payment from their dashboard
2. Tenant opens the payment modal
3. Tenant sees payment method options including "Paymongo (Online Payment)"
4. Tenant selects Paymongo option

### 2. Payment Intent Creation

1. `PayMongoPayment` component is displayed
2. Component calls `createPaymentIntent()` with:
   - Payment amount (converted to cents)
   - Currency (PHP)
   - Payment methods allowed (card, gcash, paymaya)
   - Metadata (payment ID, booking ID, tenant ID, owner ID, etc.)

### 3. Payment Method Selection

1. Tenant selects payment method (GCash, PayMaya, or Card)
2. Component calls `confirmPaymentIntent()`
3. For GCash/PayMaya: Returns redirect URL
4. For Card: Shows payment form or redirects to payment page

### 4. Payment Processing

1. Tenant is redirected to Paymongo payment page (via WebView)
2. Tenant completes payment
3. Paymongo redirects back to app with payment status
4. Component checks payment status via `getPaymentIntent()`

### 5. Payment Verification

1. If payment status is "succeeded":
   - Payment is marked as paid via `markRentPaymentAsPaid()`
   - Payment method is set to "Paymongo"
   - Status is set to "pending_owner_confirmation"
   - Owner is notified

2. Webhook handler processes Paymongo webhook events:
   - `payment.succeeded` - Marks payment as paid
   - `payment.failed` - Records failure
   - `payment.pending` - Records pending status

## Integration Points

### Tenant Dashboard

The Paymongo option is integrated into the payment modal in `app/(tabs)/tenant-main-dashboard.tsx`:

- Added "Paymongo (Online Payment)" option in payment method selection
- Opens `PayMongoPayment` component when selected
- Handles payment success/cancel callbacks

### Payment Records

Payment records now include Paymongo-specific fields:
- `paymongoPaymentIntentId` - Payment intent ID from Paymongo
- `paymongoPaymentId` - Payment ID after successful payment
- `paymongoStatus` - Current Paymongo payment status

## Backend Requirements

**Note:** The current implementation assumes backend API endpoints exist. You'll need to create server-side endpoints for:

1. **POST `/api/paymongo/create-payment-intent`**
   - Creates a payment intent using Paymongo API
   - Returns payment intent data

2. **POST `/api/paymongo/attach-payment-method`**
   - Attaches payment method to payment intent
   - Returns updated payment intent

3. **POST `/api/paymongo/confirm-payment-intent`**
   - Confirms payment intent
   - Returns next action (redirect URL) if needed

4. **GET `/api/paymongo/payment-intent/:id`**
   - Retrieves payment intent status
   - Returns payment intent data

5. **POST `/api/paymongo/verify-payment`**
   - Verifies payment status
   - Returns payment details

6. **POST `/api/paymongo/webhook`** (Server-side only)
   - Receives Paymongo webhook events
   - Verifies webhook signature
   - Processes payment events
   - Updates payment records

## Environment Variables

Add these to your `.env` file:

```env
EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_test_...
EXPO_PUBLIC_PAYMONGO_SECRET_KEY=sk_test_...
EXPO_PUBLIC_API_URL=http://localhost:3000
```

**Note:** Secret keys should NEVER be exposed in client-side code. They should only be used in server-side endpoints.

## Security Considerations

1. **API Keys**: Secret keys must be kept server-side only
2. **Webhook Verification**: Always verify webhook signatures from Paymongo
3. **Payment Verification**: Always verify payment status server-side before marking as paid
4. **HTTPS**: Use HTTPS in production for all API calls

## Testing

### Test Mode

Paymongo provides test mode with test API keys:
- Test public key: `pk_test_...`
- Test secret key: `sk_test_...`

### Test Cards

Use Paymongo's test card numbers for testing:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

## Error Handling

The integration handles various error scenarios:

1. **Payment Intent Creation Failure**
   - Shows error alert
   - Allows retry

2. **Payment Method Attachment Failure**
   - Shows error alert
   - Allows selection of different method

3. **Payment Confirmation Failure**
   - Shows error alert
   - Allows retry or cancellation

4. **Payment Status Check Failure**
   - Retries status check
   - Shows appropriate error message

## Future Enhancements

1. **Payment History**: Show Paymongo payment details in payment history
2. **Refunds**: Implement refund functionality via Paymongo
3. **Recurring Payments**: Set up automatic recurring payments
4. **Payment Notifications**: Real-time payment status updates
5. **Multiple Payment Support**: Support for paying multiple months at once

## Support

For Paymongo API documentation, visit: https://developers.paymongo.com/

For issues or questions, contact the development team.

