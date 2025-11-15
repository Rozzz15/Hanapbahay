# PayMongo Integration - Next Steps

You've completed steps 1-2 (getting API keys and adding to `.env`). Here's what to do next:

## Step 3: Use PayMongo in Your Code

### Option A: Quick Test (Simplest)

Add this to any screen to test PayMongo:

```typescript
import { useState } from 'react';
import { TouchableOpacity, Text, Modal } from 'react-native';
import { createPayMongoAutopayUrl } from '@/utils/auto-pay-assistant';
import PayMongoPayment from '@/components/PayMongoPayment';

function TestPayMongo() {
  const [showPayment, setShowPayment] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  const handlePay = async () => {
    try {
      const url = await createPayMongoAutopayUrl(
        'your-booking-id',  // Replace with actual booking ID
        5000,               // Amount in PHP
        'TEST123'           // Reference number
      );
      setPaymentUrl(url);
      setShowPayment(true);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <>
      <TouchableOpacity onPress={handlePay}>
        <Text>Test PayMongo Payment</Text>
      </TouchableOpacity>

      {showPayment && paymentUrl && (
        <Modal visible={showPayment} onRequestClose={() => setShowPayment(false)}>
          <PayMongoPayment
            paymentUrl={paymentUrl}
            onPaymentSuccess={(id) => {
              console.log('Payment successful!', id);
              setShowPayment(false);
            }}
            onPaymentError={(error) => {
              console.error('Payment failed:', error);
              setShowPayment(false);
            }}
          />
        </Modal>
      )}
    </>
  );
}
```

### Option B: Add to Existing Payment Flow

**Location**: `app/(tabs)/tenant-main-dashboard.tsx`

Add a PayMongo button alongside your existing "Pay Rent Now" button:

```typescript
// Add this import at the top
import { createPayMongoAutopayUrl } from '@/utils/auto-pay-assistant';
import PayMongoPayment from '@/components/PayMongoPayment';

// Add state for PayMongo modal
const [showPayMongoModal, setShowPayMongoModal] = useState(false);
const [payMongoUrl, setPayMongoUrl] = useState<string | null>(null);

// Add handler function
const handlePayWithPayMongo = async () => {
  if (!rentHistory?.nextDueAmount || !activeBooking) return;
  
  try {
    const reference = activeBooking.id.slice(-8).toUpperCase();
    const url = await createPayMongoAutopayUrl(
      activeBooking.id,
      rentHistory.nextDueAmount,
      reference
    );
    
    setPayMongoUrl(url);
    setShowPayMongoModal(true);
  } catch (error) {
    Alert.alert('Error', 'Failed to create payment. Please try again.');
  }
};

// Add button in your JSX (near the "Pay Rent Now" button)
<TouchableOpacity
  style={styles.payMongoButton}
  onPress={handlePayWithPayMongo}
>
  <Text style={styles.payMongoButtonText}>
    💳 Pay with PayMongo GCash
  </Text>
</TouchableOpacity>

// Add modal at the end of your component
{showPayMongoModal && payMongoUrl && (
  <Modal
    visible={showPayMongoModal}
    animationType="slide"
    onRequestClose={() => setShowPayMongoModal(false)}
  >
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <TouchableOpacity
        style={{ padding: 16 }}
        onPress={() => setShowPayMongoModal(false)}
      >
        <Text>✕ Close</Text>
      </TouchableOpacity>
      <PayMongoPayment
        paymentUrl={payMongoUrl}
        onPaymentSuccess={(paymentId) => {
          console.log('Payment successful:', paymentId);
          setShowPayMongoModal(false);
          // Refresh payment data
          loadRentHistory();
        }}
        onPaymentError={(error) => {
          Alert.alert('Payment Error', error);
          setShowPayMongoModal(false);
        }}
        onPaymentCancel={() => {
          setShowPayMongoModal(false);
        }}
      />
    </View>
  </Modal>
)}
```

### Option C: Add to AutoPayment Component

**Location**: `components/AutoPayment.tsx`

You can add PayMongo as an additional payment option in the AutoPayment component:

```typescript
// Add PayMongo button alongside GCash and Maya buttons
{/* Add after GCash button */}
<TouchableOpacity
  style={[styles.paymentButton, styles.payMongoButton]}
  onPress={async () => {
    try {
      const reference = bookingId.slice(-8).toUpperCase();
      const url = await createPayMongoAutopayUrl(
        bookingId,
        amount,
        reference
      );
      // Show PayMongo payment modal
      setShowPayMongo(true);
      setPayMongoUrl(url);
    } catch (error) {
      Alert.alert('Error', 'Failed to create payment');
    }
  }}
>
  <Text style={styles.paymentMethodName}>Pay with PayMongo</Text>
</TouchableOpacity>
```

## Step 4: Test the Integration

1. **Start your app**:
   ```bash
   npm start
   ```

2. **Navigate to payment screen** (wherever you added the PayMongo button)

3. **Click "Pay with PayMongo"** button

4. **Test the flow**:
   - PayMongo payment page should open in WebView
   - Select GCash as payment method
   - GCash app should open automatically (on Android)
   - Complete test payment
   - Return to app

## Step 5: Handle Payment Success

After payment succeeds, you may want to:
- Mark payment as paid in your database
- Refresh payment data
- Show success message
- Send notification to owner

Example:

```typescript
onPaymentSuccess={async (paymentIntentId) => {
  // Verify payment
  if (paymentId) {
    const result = await verifyAndConfirmPayMongoPayment(
      paymentIntentId,
      paymentId,
      tenantId
    );
    
    if (result.success) {
      // Refresh data
      loadRentHistory();
      Alert.alert('Success', 'Payment completed successfully!');
    }
  }
}}
```

## Common Issues

### "PayMongo public key not configured"
- Check your `.env` file has `EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY`
- Restart your app after adding to `.env`

### "Failed to create payment intent"
- Verify your API key is correct
- Check network connection
- Ensure you're using test keys in test mode

### GCash app doesn't open
- Ensure GCash app is installed
- Check Android `MainActivity.kt` handles `gcash://` URLs (already implemented)

## Next: Backend Setup (Optional)

For production, set up backend API:
- See `api/paymongo/create-payment-intent.ts` for backend implementation
- See `docs/paymongo-setup-guide.md` for full backend setup

## Need Help?

- Check `docs/paymongo-setup-guide.md` for detailed setup
- See `docs/paymongo-integration-example.tsx` for code examples
- Review `docs/paymongo-integration.md` for technical details

