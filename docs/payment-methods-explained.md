# Payment Methods Explained - Philippines

## Overview

PayMongo supports multiple payment methods in the Philippines. Here's what each one is:

## Payment Methods Available

### 1. **GCash** 💚
- **What it is:** Mobile wallet and digital payment service
- **Company:** Globe Telecom
- **How it works:** Users pay using their GCash wallet balance
- **Popular for:** Mobile payments, QR code payments, online shopping
- **Website:** https://www.gcash.com

### 2. **GrabPay** 🟢
- **What it is:** Digital wallet from Grab
- **Company:** Grab (ride-hailing and delivery company)
- **How it works:** Users pay using their GrabPay wallet balance
- **Popular for:** Ride payments, food delivery, online purchases
- **Website:** https://www.grab.com/ph/grabpay/
- **Note:** This is NOT PayMaya - it's Grab's own payment service

### 3. **PayMaya / Maya** 💙
- **What it is:** Digital wallet and payment service
- **Company:** Voyager Innovations (PLDT)
- **Rebranded:** PayMaya was rebranded to "Maya" in 2022
- **How it works:** Users pay using their Maya wallet balance
- **Popular for:** Online payments, bills payment, QR code payments
- **Website:** https://www.maya.ph
- **Note:** This is DIFFERENT from GrabPay

### 4. **Credit/Debit Cards** 💳
- **What it is:** Traditional card payments
- **Supported:** Visa, Mastercard, JCB
- **How it works:** Users enter card details (card number, expiry, CVC)
- **Popular for:** Online purchases, international payments

## Key Differences

### GrabPay vs PayMaya (Maya)

| Feature | GrabPay | PayMaya/Maya |
|---------|---------|--------------|
| **Company** | Grab | Voyager (PLDT) |
| **Primary Use** | Grab services + general payments | General payments + bills |
| **Wallet** | GrabPay wallet | Maya wallet |
| **Integration** | Grab ecosystem | Standalone payment service |
| **QR Codes** | Yes | Yes |

**They are completely separate services!**

## In Your App

Your PayMongo integration currently supports:

1. **GCash** ✅
2. **PayMaya / Maya** ✅
3. **Credit/Debit Cards** ✅

## Current Configuration

In your code (`components/PayMongoPayment.tsx`):

```typescript
payment_method_allowed: ['card', 'gcash', 'paymaya']
```

This means users can pay with:
- 💳 Credit/Debit Cards
- 💚 GCash
- 💙 PayMaya / Maya

## Summary

- **GrabPay** = Grab's payment service (different from PayMaya)
- **PayMaya/Maya** = PLDT's payment service (rebranded from PayMaya to Maya in 2022)
- Your app currently supports: Cards, GCash, PayMaya
- Both GCash and PayMaya are the most popular mobile wallets in the Philippines

