/**
 * Example: How to Add PayMongo Payment to Your App
 * 
 * This shows you how to integrate PayMongo GCash payment into your existing payment flow.
 * You can add this as an alternative payment method alongside your existing GCash direct payment.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { createPayMongoAutopayUrl } from '@/utils/auto-pay-assistant';
import PayMongoPayment from '@/components/PayMongoPayment';
import { verifyAndConfirmPayMongoPayment } from '@/utils/auto-pay-assistant';

// Example 1: Add PayMongo as a payment option button
export function PayMongoPaymentButton({ 
  bookingId, 
  amount, 
  paymentId,
  tenantId,
  onPaymentSuccess 
}: {
  bookingId: string;
  amount: number;
  paymentId?: string;
  tenantId: string;
  onPaymentSuccess?: () => void;
}) {
  const [showPayMongo, setShowPayMongo] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePayWithPayMongo = async () => {
    try {
      setLoading(true);
      
      // Create PayMongo payment URL
      const reference = bookingId.slice(-8).toUpperCase();
      const url = await createPayMongoAutopayUrl(
        bookingId,
        amount,
        reference
      );
      
      setPaymentUrl(url);
      setShowPayMongo(true);
    } catch (error) {
      console.error('Error creating PayMongo payment:', error);
      Alert.alert('Error', 'Failed to create payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    try {
      if (paymentId) {
        // Verify and confirm payment
        const result = await verifyAndConfirmPayMongoPayment(
          paymentIntentId,
          paymentId,
          tenantId
        );
        
        if (result.success) {
          setShowPayMongo(false);
          onPaymentSuccess?.();
        } else {
          Alert.alert('Error', result.error || 'Payment verification failed');
        }
      } else {
        // Payment successful but no paymentId to verify
        setShowPayMongo(false);
        onPaymentSuccess?.();
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      Alert.alert('Error', 'Payment completed but verification failed');
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.payMongoButton}
        onPress={handlePayWithPayMongo}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Text style={styles.payMongoButtonText}>💳 Pay with PayMongo GCash</Text>
          </>
        )}
      </TouchableOpacity>

      {showPayMongo && paymentUrl && (
        <Modal
          visible={showPayMongo}
          animationType="slide"
          onRequestClose={() => setShowPayMongo(false)}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowPayMongo(false)}
            >
              <Text style={styles.closeButtonText}>✕ Close</Text>
            </TouchableOpacity>
            
            <PayMongoPayment
              paymentUrl={paymentUrl}
              onPaymentSuccess={(paymentIntentId) => {
                handlePaymentSuccess(paymentIntentId);
              }}
              onPaymentError={(error) => {
                Alert.alert('Payment Error', error);
                setShowPayMongo(false);
              }}
              onPaymentCancel={() => {
                setShowPayMongo(false);
              }}
            />
          </View>
        </Modal>
      )}
    </>
  );
}

// Example 2: Add to existing payment modal
// In your payment modal component, add this button alongside GCash/Maya options:

/*
<TouchableOpacity
  style={styles.paymentOptionButton}
  onPress={async () => {
    try {
      const reference = bookingId.slice(-8).toUpperCase();
      const paymentUrl = await createPayMongoAutopayUrl(
        bookingId,
        amount,
        reference
      );
      
      // Show PayMongo payment modal
      setShowPayMongoModal(true);
      setPayMongoUrl(paymentUrl);
    } catch (error) {
      Alert.alert('Error', 'Failed to create payment');
    }
  }}
>
  <Text>💳 Pay with PayMongo</Text>
  <Text style={styles.paymentOptionSubtext}>
    Secure payment via PayMongo GCash
  </Text>
</TouchableOpacity>
*/

// Example 3: Simple inline usage
export function SimplePayMongoExample() {
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  const handlePay = async () => {
    const url = await createPayMongoAutopayUrl(
      'booking-id-here',
      5000, // Amount in PHP
      'REF123' // Reference
    );
    setPaymentUrl(url);
  };

  if (paymentUrl) {
    return (
      <PayMongoPayment
        paymentUrl={paymentUrl}
        onPaymentSuccess={(id) => {
          console.log('Payment successful!', id);
          setPaymentUrl(null);
        }}
        onPaymentError={(error) => {
          console.error('Payment failed:', error);
          setPaymentUrl(null);
        }}
      />
    );
  }

  return (
    <TouchableOpacity onPress={handlePay}>
      <Text>Pay Now</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  payMongoButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
  },
  payMongoButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  closeButton: {
    padding: 16,
    alignItems: 'flex-end',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
});

