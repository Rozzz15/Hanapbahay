# PayMongo Button Not Working - Troubleshooting Guide

## Quick Checks

### 1. Check Console Logs
When you click the button, check your console/terminal for these logs:
- `💳 PayMongo button clicked` - Button was clicked
- `🔄 handlePayWithPayMongo called` - Handler function started
- `📝 Creating PayMongo payment URL` - Payment URL creation started
- `✅ PayMongo payment URL created` - Success!
- `❌ Error creating PayMongo payment` - Error occurred

### 2. Check Environment Variable
Make sure your `.env` file has:
```env
EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_test_your_key_here
```

**After adding/changing `.env`:**
- Restart your Expo/Metro bundler
- Clear cache: `npm run reset` or `npx expo start --clear`

### 3. Check Button Visibility
The button only appears when:
- ✅ You have an active booking
- ✅ There's a pending payment
- ✅ `rentHistory.nextDueDate` exists
- ✅ `rentHistory.nextDueAmount` exists

## Common Issues & Solutions

### Issue 1: Button Doesn't Appear

**Symptoms:**
- No "Pay with PayMongo GCash" button visible

**Solutions:**
1. **Check if you have a pending payment:**
   - The button only shows when there's a payment due
   - Make sure you have an approved booking with a pending payment

2. **Check rent history:**
   - Pull down to refresh the dashboard
   - Ensure payment data is loaded

3. **Check booking status:**
   - Booking must be "approved"
   - Payment status should be "paid" (for active bookings)

### Issue 2: Button Clicked But Nothing Happens

**Symptoms:**
- Button is visible
- Clicking it does nothing
- No console logs appear

**Solutions:**
1. **Check if button is disabled:**
   - Button is disabled when `processingPayMongo` is true
   - Wait for any ongoing process to complete

2. **Check prerequisites:**
   - Ensure you're logged in as a tenant
   - Ensure you have an active booking
   - Ensure payment data is loaded

3. **Check console for errors:**
   - Look for any JavaScript errors
   - Check for network errors

### Issue 3: Error Creating Payment

**Symptoms:**
- Button clicked
- Error alert appears
- Console shows error

**Solutions:**

1. **"PayMongo public key not configured"**
   ```bash
   # Add to .env file
   EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_test_your_key_here
   
   # Restart app
   npm run reset
   ```

2. **"Failed to create payment intent"**
   - Check your PayMongo API key is correct
   - Verify key starts with `pk_test_` (for test mode)
   - Check internet connection
   - Verify PayMongo account is active

3. **Network errors**
   - Check internet connection
   - Try again after a few seconds
   - Check if PayMongo API is accessible

### Issue 4: Payment URL Created But Modal Doesn't Open

**Symptoms:**
- Console shows "✅ PayMongo payment URL created"
- But modal doesn't appear

**Solutions:**
1. **Check state:**
   - `showPayMongoModal` should be `true`
   - `payMongoUrl` should have a value

2. **Check modal rendering:**
   - Ensure modal is at the end of component JSX
   - Check for any conditional rendering that might hide it

3. **Check for errors:**
   - Look for React errors in console
   - Check if PayMongoPayment component is imported correctly

## Debug Steps

### Step 1: Enable Debug Logging
The code now includes console logs. Check your terminal/console when clicking the button.

### Step 2: Check Prerequisites
Add this temporary debug code to see what's available:

```typescript
console.log('Debug Info:', {
  hasRentHistory: !!rentHistory,
  nextDueDate: rentHistory?.nextDueDate,
  nextDueAmount: rentHistory?.nextDueAmount,
  hasActiveBooking: !!activeBooking,
  hasUser: !!user,
  pendingPayments: rentHistory?.payments?.filter(p => p.status === 'pending'),
});
```

### Step 3: Test PayMongo API Directly
Test if PayMongo API is working:

```typescript
// In browser console or test file
const testPayMongo = async () => {
  const publicKey = 'pk_test_your_key_here';
  const response = await fetch('https://api.paymongo.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(publicKey + ':')}`,
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: 10000, // 100 PHP in centavos
          currency: 'PHP',
          payment_method_allowed: ['gcash'],
        },
      },
    }),
  });
  console.log(await response.json());
};
```

## Still Not Working?

1. **Check React Native/Expo version compatibility**
2. **Verify all imports are correct**
3. **Check for TypeScript errors**
4. **Try clearing cache:**
   ```bash
   npm run reset
   # or
   npx expo start --clear --reset-cache
   ```

5. **Check PayMongo account status:**
   - Log in to PayMongo Dashboard
   - Verify account is active
   - Check API keys are valid

6. **Contact support:**
   - Share console logs
   - Share error messages
   - Describe what happens when you click the button

## Expected Behavior

When working correctly:
1. ✅ Button appears below "Pay Rent Now"
2. ✅ Clicking shows loading indicator
3. ✅ Console shows "💳 PayMongo button clicked"
4. ✅ Console shows "📝 Creating PayMongo payment URL"
5. ✅ Modal opens with PayMongo payment page
6. ✅ User can select GCash and complete payment

