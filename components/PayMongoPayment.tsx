import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import {
  createPaymentIntent,
  attachPaymentMethod,
  confirmPaymentIntent,
  getPaymentIntent,
  formatAmountToCents,
  getPaymentStatusText,
  type PaymongoPaymentIntent,
} from '../utils/paymongo-api';
import { markRentPaymentAsPaid } from '../utils/tenant-payments';
import { RentPayment } from '../utils/tenant-payments';
import { API_BASE_URL } from '../constants';

interface PayMongoPaymentProps {
  visible: boolean;
  payment: RentPayment;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PayMongoPayment({
  visible,
  payment,
  onSuccess,
  onCancel,
}: PayMongoPaymentProps) {
  const [loading, setLoading] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<PaymongoPaymentIntent | null>(null);
  const [showWebView, setShowWebView] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    if (visible && payment) {
      initializePayment();
    } else {
      // Reset state when modal closes
      setPaymentIntent(null);
      setShowWebView(false);
      setRedirectUrl(null);
      setStatus('');
    }
  }, [visible, payment]);

  const initializePayment = async () => {
    try {
      setLoading(true);
      
      // Create payment intent
      const result = await createPaymentIntent({
        amount: formatAmountToCents(payment.totalAmount),
        currency: 'PHP',
        payment_method_allowed: ['card', 'gcash', 'paymaya'],
        description: `Rent payment for ${payment.paymentMonth}`,
        metadata: {
          paymentId: payment.id,
          bookingId: payment.bookingId,
          tenantId: payment.tenantId,
          ownerId: payment.ownerId,
          propertyId: payment.propertyId,
          paymentMonth: payment.paymentMonth,
        },
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create payment intent');
      }

      setPaymentIntent(result.data);
      setStatus(result.data.attributes.status);
      
      // If payment intent requires next action, handle it
      if (result.data.attributes.status === 'awaiting_next_action') {
        // This would typically come from the payment intent response
        // For now, we'll show the payment method selection
      }
    } catch (error) {
      console.error('❌ Error initializing payment:', error);
      
      // Provide more helpful error message
      let errorMessage = 'Failed to initialize payment. Please try again.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      Alert.alert(
        'Payment Error',
        errorMessage,
        [{ text: 'OK', onPress: onCancel }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentMethodSelection = async (paymentMethodType: 'card' | 'gcash' | 'paymaya') => {
    if (!paymentIntent) return;

    try {
      setLoading(true);

      // Extract payment intent ID - PayMongo IDs are already in correct format
      const paymentIntentId = paymentIntent.id;

      console.log('📝 Processing payment with method:', paymentMethodType);
      console.log('📝 Payment Intent ID:', paymentIntentId);
      console.log('📝 Payment Intent Status:', paymentIntent.attributes.status);
      console.log('📝 Payment Intent Full Object:', JSON.stringify(paymentIntent, null, 2));

      // For GCash and PayMaya, we need to create a payment method first
      // Then attach it and confirm
      if (paymentMethodType === 'gcash' || paymentMethodType === 'paymaya') {
        // Step 1: Create payment method
        const createMethodResponse = await fetch(`${API_BASE_URL}/api/paymongo/create-payment-method`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: paymentMethodType,
          }),
        });

        if (!createMethodResponse.ok) {
          const errorData = await createMethodResponse.json().catch(() => ({ error: 'Failed to create payment method' }));
          throw new Error(errorData.error || 'Failed to create payment method');
        }

        const methodData = await createMethodResponse.json();
        const paymentMethodId = methodData.data?.id;

        if (!paymentMethodId) {
          throw new Error('Payment method ID not returned');
        }

        console.log('✅ Payment method created:', paymentMethodId);

        // Step 2: Attach payment method to payment intent
        // For e-wallet payments, return_url is required when attaching
        // PayMongo requires a valid HTTP/HTTPS URL, not a deep link
        // We'll use the API base URL with a return path (WebView will intercept it)
        const returnUrl = `${API_BASE_URL}/payment-return?payment_intent=${paymentIntentId}`;
        
        const attachResult = await attachPaymentMethod({
          payment_intent_id: paymentIntentId,
          payment_method_id: paymentMethodId,
          return_url: returnUrl,
        });

        if (!attachResult.success) {
          throw new Error(attachResult.error || 'Failed to attach payment method');
        }

        console.log('✅ Payment method attached');
        console.log('📋 Attach result:', JSON.stringify(attachResult, null, 2));

        // For e-wallet payments, attaching with return_url might automatically confirm
        // Check if attach response already has redirect URL
        if (attachResult.data?.attributes?.next_action?.redirect?.url) {
          // Attach already returned redirect URL, use it directly
          const redirectUrlFromAttach = attachResult.data.attributes.next_action.redirect.url;
          console.log('✅ Redirect URL from attach:', redirectUrlFromAttach);
          setRedirectUrl(redirectUrlFromAttach);
          setShowWebView(true);
        } else if (attachResult.next_action?.redirect?.url) {
          // Next action in response wrapper
          console.log('✅ Redirect URL from attach (wrapper):', attachResult.next_action.redirect.url);
          setRedirectUrl(attachResult.next_action.redirect.url);
          setShowWebView(true);
        } else {
          // Step 3: Confirm payment intent (if not already confirmed by attach)
          console.log('📝 No redirect URL from attach, confirming payment intent...');
          const confirmResult = await confirmPaymentIntent({
            payment_intent_id: paymentIntentId,
            return_url: returnUrl,
          });

          if (!confirmResult.success) {
            throw new Error(confirmResult.error || 'Failed to confirm payment');
          }

          // If there's a next action with redirect, show WebView
          if (confirmResult.next_action?.redirect?.url) {
            setRedirectUrl(confirmResult.next_action.redirect.url);
            setShowWebView(true);
          } else if (confirmResult.data) {
            // Payment might be processing or succeeded
            await checkPaymentStatus(confirmResult.data.id);
          }
        }
      } else if (paymentMethodType === 'card') {
        // For card payments, we'd typically use Paymongo's payment form
        // For now, we'll use the same confirm flow
        const returnUrl = `${API_BASE_URL}/payment-return?payment_intent=${paymentIntentId}`;
        const confirmResult = await confirmPaymentIntent({
          payment_intent_id: paymentIntentId,
          return_url: returnUrl,
        });

        if (!confirmResult.success) {
          throw new Error(confirmResult.error || 'Failed to confirm payment');
        }

        if (confirmResult.next_action?.redirect?.url) {
          setRedirectUrl(confirmResult.next_action.redirect.url);
          setShowWebView(true);
        } else if (confirmResult.data) {
          await checkPaymentStatus(confirmResult.data.id);
        }
      }
    } catch (error) {
      console.error('❌ Error processing payment:', error);
      console.error('❌ Error details:', error instanceof Error ? error.stack : error);
      
      let errorMessage = 'Failed to process payment. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
        // Provide more helpful error messages
        if (error.message.includes('could not be found')) {
          errorMessage = 'Payment intent not found. Please try creating a new payment.';
        } else if (error.message.includes('missing')) {
          errorMessage = 'Payment information is incomplete. Please try again.';
        }
      }
      
      Alert.alert(
        'Payment Error',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async (paymentIntentId: string) => {
    try {
      const result = await getPaymentIntent(paymentIntentId);
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to check payment status');
      }

      const intent = result.data;
      setStatus(intent.attributes.status);

      if (intent.attributes.status === 'succeeded') {
        // Payment successful - mark as paid
        await handlePaymentSuccess();
      } else if (intent.attributes.status === 'failed' || intent.attributes.status === 'canceled') {
        Alert.alert(
          'Payment Failed',
          'Your payment could not be processed. Please try again.',
          [{ text: 'OK' }]
        );
      } else if (intent.attributes.status === 'awaiting_next_action') {
        // Check if there's a redirect URL
        if (intent.attributes.last_payment_error) {
          Alert.alert(
            'Payment Error',
            intent.attributes.last_payment_error.message || 'Payment requires additional action.',
          );
        }
      }
    } catch (error) {
      console.error('❌ Error checking payment status:', error);
    }
  };

  const handlePaymentSuccess = async () => {
    try {
      // Ensure payment exists in database before marking as paid
      const { db } = await import('../utils/db');
      try {
        const existingPayment = await db.get('rent_payments', payment.id);
        if (!existingPayment) {
          console.log('📝 Payment not in database, creating it...');
          console.log('📝 Payment data:', JSON.stringify(payment, null, 2));
          
          // Create the payment record if it doesn't exist
          // Ensure all required fields are present
          const paymentToCreate: RentPayment = {
            id: payment.id,
            bookingId: payment.bookingId,
            tenantId: payment.tenantId,
            ownerId: payment.ownerId,
            propertyId: payment.propertyId,
            amount: payment.amount,
            lateFee: payment.lateFee || 0,
            totalAmount: payment.totalAmount,
            paymentMonth: payment.paymentMonth,
            dueDate: payment.dueDate,
            status: 'pending',
            receiptNumber: payment.receiptNumber || `REC-${payment.id.slice(-8)}`,
            notes: payment.notes,
            ownerPaymentAccountId: payment.ownerPaymentAccountId,
            createdAt: payment.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          await db.upsert('rent_payments', payment.id, paymentToCreate);
          console.log('✅ Payment created in database');
        } else {
          console.log('✅ Payment already exists in database');
        }
      } catch (dbError) {
        console.error('❌ Error checking/creating payment:', dbError);
        console.log('📝 Payment might not exist, creating it...');
        // Payment doesn't exist, create it
        const paymentToCreate: RentPayment = {
          id: payment.id,
          bookingId: payment.bookingId,
          tenantId: payment.tenantId,
          ownerId: payment.ownerId,
          propertyId: payment.propertyId,
          amount: payment.amount,
          lateFee: payment.lateFee || 0,
          totalAmount: payment.totalAmount,
          paymentMonth: payment.paymentMonth,
          dueDate: payment.dueDate,
          status: 'pending',
          receiptNumber: payment.receiptNumber || `REC-${payment.id.slice(-8)}`,
          notes: payment.notes,
          ownerPaymentAccountId: payment.ownerPaymentAccountId,
          createdAt: payment.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        await db.upsert('rent_payments', payment.id, paymentToCreate);
        console.log('✅ Payment created in database (fallback)');
      }

      // Mark payment as paid with Paymongo as payment method
      const success = await markRentPaymentAsPaid(
        payment.id,
        `Paymongo - ${paymentIntent?.id.slice(-8) || 'Online'}`
      );

      if (success) {
        Alert.alert(
          'Payment Successful',
          'Your payment has been processed successfully. The owner will be notified.',
          [
            {
              text: 'OK',
              onPress: () => {
                setShowWebView(false);
                onSuccess();
              },
            },
          ]
        );
      } else {
        throw new Error('Failed to record payment');
      }
    } catch (error) {
      console.error('❌ Error recording payment:', error);
      Alert.alert(
        'Error',
        'Payment was successful but failed to record. Please contact support.',
        [{ text: 'OK', onPress: onCancel }]
      );
    }
  };

  const handleWebViewNavigation = async (navState: any) => {
    const { url } = navState;
    
    // Check if this is the return URL (handle both HTTP URLs and deep links)
    if (url.includes('payment-return') || 
        url.includes('payment_success') || 
        url.includes('hanapbahay://payment-return') ||
        url.includes('/payment-return')) {
      setShowWebView(false);
      
      // Check payment status
      if (paymentIntent) {
        await checkPaymentStatus(paymentIntent.id);
      }
    } else if (url.includes('payment_failed') || url.includes('payment_canceled')) {
      setShowWebView(false);
      Alert.alert(
        'Payment Canceled',
        'Your payment was canceled. You can try again.',
        [{ text: 'OK' }]
      );
    }
  };

  if (!visible || !payment) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pay with Paymongo</Text>
          <View style={styles.placeholder} />
        </View>

        {showWebView && redirectUrl ? (
          <WebView
            source={{ uri: redirectUrl }}
            style={styles.webview}
            onNavigationStateChange={handleWebViewNavigation}
            onShouldStartLoadWithRequest={(request) => {
              // Handle return URLs
              if (request.url.includes('payment-return') || 
                  request.url.includes('payment_success') ||
                  request.url.includes('payment_failed')) {
                handleWebViewNavigation({ url: request.url });
                return false;
              }
              return true;
            }}
          />
        ) : (
          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={styles.loadingText}>Processing payment...</Text>
              </View>
            ) : (
              <>
                {/* Payment Summary */}
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Payment Summary</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Amount:</Text>
                    <Text style={styles.summaryValue}>₱{payment.totalAmount.toLocaleString()}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Payment Month:</Text>
                    <Text style={styles.summaryValue}>
                      {new Date(payment.paymentMonth + '-01').toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                      })}
                    </Text>
                  </View>
                  {payment.lateFee > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Late Fee:</Text>
                      <Text style={styles.summaryValue}>₱{payment.lateFee.toLocaleString()}</Text>
                    </View>
                  )}
                </View>

                {/* Payment Method Selection */}
                {paymentIntent && status === 'awaiting_payment_method' && (
                  <View style={styles.methodsContainer}>
                    <Text style={styles.methodsTitle}>Select Payment Method</Text>
                    
                    <TouchableOpacity
                      style={styles.methodButton}
                      onPress={() => handlePaymentMethodSelection('gcash')}
                    >
                      <View style={styles.methodIconContainer}>
                        <Ionicons name="phone-portrait" size={24} color="#10B981" />
                      </View>
                      <View style={styles.methodInfo}>
                        <Text style={styles.methodName}>GCash</Text>
                        <Text style={styles.methodDescription}>Pay using your GCash account</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.methodButton}
                      onPress={() => handlePaymentMethodSelection('paymaya')}
                    >
                      <View style={styles.methodIconContainer}>
                        <Ionicons name="wallet" size={24} color="#10B981" />
                      </View>
                      <View style={styles.methodInfo}>
                        <Text style={styles.methodName}>PayMaya / Maya</Text>
                        <Text style={styles.methodDescription}>Pay using your PayMaya/Maya wallet</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.methodButton}
                      onPress={() => handlePaymentMethodSelection('card')}
                    >
                      <View style={styles.methodIconContainer}>
                        <Ionicons name="card" size={24} color="#10B981" />
                      </View>
                      <View style={styles.methodInfo}>
                        <Text style={styles.methodName}>Credit/Debit Card</Text>
                        <Text style={styles.methodDescription}>Pay using your card</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Payment Status */}
                {status && status !== 'awaiting_payment_method' && (
                  <View style={styles.statusContainer}>
                    <Text style={styles.statusTitle}>Payment Status</Text>
                    <Text style={styles.statusText}>{getPaymentStatusText(status)}</Text>
                  </View>
                )}

                {/* Info */}
                <View style={styles.infoContainer}>
                  <Ionicons name="information-circle" size={20} color="#3B82F6" />
                  <Text style={styles.infoText}>
                    Your payment will be securely processed by Paymongo. You'll be redirected to complete the payment.
                  </Text>
                </View>
              </>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  summaryCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  methodsContainer: {
    marginBottom: 24,
  },
  methodsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  methodIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusContainer: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10B981',
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    marginLeft: 12,
  },
  webview: {
    flex: 1,
  },
});

