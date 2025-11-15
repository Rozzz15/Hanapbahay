# PayMongo GCash Autopay - Quick Start

## 🚀 Quick Setup (5 minutes)

### 1. Get PayMongo Keys
1. Sign up at https://paymongo.com
2. Log in to Dashboard: https://dashboard.paymongo.com
3. Go to **Developers** tab (in the sidebar, not Settings)
4. Toggle to **Test** mode
5. Copy your **Public Key** (starts with `pk_test_`)
   
   **Note**: If you don't see the Developers tab or API keys:
   - Ensure your account is activated/verified
   - You may need to complete account verification first
   - Check if you need to generate API keys

### 2. Add to `.env` file
```env
EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_test_your_key_here
```

### 3. Use in Your Code

**Quick Test Example:**
```typescript
import { useState } from 'react';
import { TouchableOpacity, Text, Modal } from 'react-native';
import { createPayMongoAutopayUrl } from '@/utils/auto-pay-assistant';
import PayMongoPayment from '@/components/PayMongoPayment';

function PaymentScreen() {
  const [showPayment, setShowPayment] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  const handlePay = async () => {
    const url = await createPayMongoAutopayUrl(
      'your-booking-id',  // Replace with actual booking ID
      5000,               // Amount in PHP
      'REF123'           // Reference
    );
    setPaymentUrl(url);
    setShowPayment(true);
  };

  return (
    <>
      <TouchableOpacity onPress={handlePay}>
        <Text>💳 Pay with PayMongo GCash</Text>
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

**📖 For more examples**, see `docs/paymongo-next-steps.md`

## ✅ That's It!

The integration will:
- ✅ Create PayMongo payment intent
- ✅ Open PayMongo payment page
- ✅ Handle GCash redirect automatically
- ✅ Process payment callbacks

## 🔧 Backend Setup (Optional but Recommended)

For production, set up a backend API:

1. **Add backend URL to `.env`**:
   ```env
   EXPO_PUBLIC_PAYMONGO_BACKEND_URL=https://your-backend.com
   ```

2. **Implement backend endpoint** (see `api/paymongo/create-payment-intent.ts`)

3. **Set up webhook** (see `api/paymongo/webhook.ts`)

## 📚 Full Documentation

- **Setup Guide**: `docs/paymongo-setup-guide.md`
- **Integration Details**: `docs/paymongo-integration.md`

## 🆘 Need Help?

Check the troubleshooting section in `docs/paymongo-setup-guide.md`

