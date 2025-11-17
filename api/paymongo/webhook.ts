/**
 * Paymongo Webhook Handler
 * This would typically be a server-side endpoint that receives webhook events from Paymongo
 * For now, this is a client-side utility that can be called to verify payments
 * 
 * Note: In production, this should be a secure server-side endpoint that:
 * 1. Verifies the webhook signature from Paymongo
 * 2. Processes payment events (payment.succeeded, payment.failed, etc.)
 * 3. Updates payment records in the database
 * 4. Sends notifications to owners and tenants
 */

import { verifyPayment } from '../../utils/paymongo-api';
import { db } from '../../utils/db';
import { RentPaymentRecord } from '../../types';
import { markRentPaymentAsPaid } from '../../utils/tenant-payments';

export interface PaymongoWebhookEvent {
  type: string;
  data: {
    id: string;
    type: string;
    attributes: {
      amount: number;
      currency: string;
      status: string;
      metadata?: Record<string, any>;
      [key: string]: any;
    };
  };
}

/**
 * Handle Paymongo webhook event
 * This should be called by a server-side webhook endpoint
 */
export async function handlePaymongoWebhook(
  event: PaymongoWebhookEvent
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const { type, data } = event;

    // Handle different event types
    switch (type) {
      case 'payment.succeeded':
        return await handlePaymentSucceeded(data);
      
      case 'payment.failed':
        return await handlePaymentFailed(data);
      
      case 'payment.pending':
        return await handlePaymentPending(data);
      
      default:
        console.log(`Unhandled webhook event type: ${type}`);
        return {
          success: true,
          message: `Event type ${type} received but not processed`,
        };
    }
  } catch (error) {
    console.error('❌ Error handling Paymongo webhook:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to handle webhook',
    };
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(paymentData: PaymongoWebhookEvent['data']): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const { id: paymentId, attributes } = paymentData;
    const { metadata } = attributes;

    if (!metadata?.paymentId) {
      return {
        success: false,
        error: 'Payment ID not found in metadata',
      };
    }

    // Get the payment record
    const payment = await db.get<RentPaymentRecord>('rent_payments', metadata.paymentId);
    if (!payment) {
      return {
        success: false,
        error: 'Payment record not found',
      };
    }

    // Update payment record with Paymongo details
    const updatedPayment: RentPaymentRecord = {
      ...payment,
      status: 'pending_owner_confirmation', // Owner still needs to confirm
      paymentMethod: 'Paymongo',
      paymongoPaymentId: paymentId,
      paymongoPaymentIntentId: metadata.paymentIntentId,
      paymongoStatus: 'succeeded',
      paidDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.upsert('rent_payments', payment.id, updatedPayment);

    // Mark payment as paid (this will notify the owner)
    await markRentPaymentAsPaid(payment.id, 'Paymongo');

    console.log('✅ Payment succeeded and recorded:', payment.id);

    return {
      success: true,
      message: 'Payment processed successfully',
    };
  } catch (error) {
    console.error('❌ Error handling payment succeeded:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process payment',
    };
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(paymentData: PaymongoWebhookEvent['data']): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const { id: paymentId, attributes } = paymentData;
    const { metadata } = attributes;

    if (!metadata?.paymentId) {
      return {
        success: false,
        error: 'Payment ID not found in metadata',
      };
    }

    // Get the payment record
    const payment = await db.get<RentPaymentRecord>('rent_payments', metadata.paymentId);
    if (!payment) {
      return {
        success: false,
        error: 'Payment record not found',
      };
    }

    // Update payment record with failed status
    const updatedPayment: RentPaymentRecord = {
      ...payment,
      paymongoPaymentId: paymentId,
      paymongoPaymentIntentId: metadata.paymentIntentId,
      paymongoStatus: 'failed',
      notes: `Payment failed via Paymongo: ${attributes.status}`,
      updatedAt: new Date().toISOString(),
    };

    await db.upsert('rent_payments', payment.id, updatedPayment);

    console.log('❌ Payment failed:', payment.id);

    return {
      success: true,
      message: 'Payment failure recorded',
    };
  } catch (error) {
    console.error('❌ Error handling payment failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process payment failure',
    };
  }
}

/**
 * Handle pending payment
 */
async function handlePaymentPending(paymentData: PaymongoWebhookEvent['data']): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const { id: paymentId, attributes } = paymentData;
    const { metadata } = attributes;

    if (!metadata?.paymentId) {
      return {
        success: false,
        error: 'Payment ID not found in metadata',
      };
    }

    // Get the payment record
    const payment = await db.get<RentPaymentRecord>('rent_payments', metadata.paymentId);
    if (!payment) {
      return {
        success: false,
        error: 'Payment record not found',
      };
    }

    // Update payment record with pending status
    const updatedPayment: RentPaymentRecord = {
      ...payment,
      paymongoPaymentId: paymentId,
      paymongoPaymentIntentId: metadata.paymentIntentId,
      paymongoStatus: 'awaiting_payment',
      updatedAt: new Date().toISOString(),
    };

    await db.upsert('rent_payments', payment.id, updatedPayment);

    console.log('⏳ Payment pending:', payment.id);

    return {
      success: true,
      message: 'Payment pending status recorded',
    };
  } catch (error) {
    console.error('❌ Error handling payment pending:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process payment pending',
    };
  }
}

/**
 * Verify webhook signature (server-side only)
 * This should be implemented on the backend to verify Paymongo webhook signatures
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // This should use Paymongo's webhook signature verification
  // For now, this is a placeholder
  // In production, use Paymongo's webhook signature verification method
  console.warn('⚠️ Webhook signature verification should be implemented server-side');
  return true; // Placeholder - always return true for now
}

