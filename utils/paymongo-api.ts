/**
 * Paymongo API Integration Utilities
 * Handles payment intent creation and verification for tenant-to-owner payments
 */

import { API_BASE_URL } from '../constants';

// Debug: Log the API URL being used (remove in production)
if (__DEV__) {
  console.log('🔗 PayMongo API URL:', API_BASE_URL);
}

export interface PaymongoPaymentIntent {
  id: string;
  type: 'payment_intent';
  attributes: {
    amount: number;
    currency: string;
    status: 'awaiting_payment_method' | 'awaiting_next_action' | 'processing' | 'succeeded' | 'awaiting_payment' | 'canceled' | 'failed';
    client_key: string;
    payment_method_allowed: string[];
    payment_method_options: {
      card?: {
        request_three_d_secure: 'automatic' | 'any';
      };
    };
    metadata?: Record<string, any>;
    last_payment_error?: any;
    created_at: number;
    updated_at: number;
  };
}

export interface PaymongoPaymentMethod {
  id: string;
  type: 'payment_method';
  attributes: {
    type: string;
    details?: {
      card_number?: string;
      exp_month?: number;
      exp_year?: number;
      cvc?: string;
    };
    billing?: {
      name?: string;
      email?: string;
      phone?: string;
      address?: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        postal_code?: string;
        country?: string;
      };
    };
    created_at: number;
    updated_at: number;
  };
}

export interface PaymongoPayment {
  id: string;
  type: 'payment';
  attributes: {
    amount: number;
    currency: string;
    status: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
    description?: string;
    statement_descriptor?: string;
    metadata?: Record<string, any>;
    fee: number;
    net_amount: number;
    refund_amount: number;
    created_at: number;
    updated_at: number;
  };
}

export interface CreatePaymentIntentParams {
  amount: number; // Amount in cents (PHP)
  currency?: string;
  payment_method_allowed?: string[];
  description?: string;
  metadata?: {
    paymentId?: string;
    bookingId?: string;
    tenantId?: string;
    ownerId?: string;
    propertyId?: string;
    paymentMonth?: string;
  };
}

export interface AttachPaymentMethodParams {
  payment_intent_id: string;
  payment_method_id: string;
  return_url?: string;
}

export interface ConfirmPaymentIntentParams {
  payment_intent_id: string;
  payment_method_id?: string;
  return_url?: string;
}

/**
 * Helper function to handle network errors with helpful messages
 */
function handleNetworkError(error: unknown, defaultMessage: string): string {
  if (error instanceof TypeError && error.message.includes('Network request failed')) {
    const isLocalhost = API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1');
    
    if (isLocalhost) {
      return 'Cannot connect to server. Make sure:\n\n1. Backend server is running (npm start in server/ directory)\n2. If using a mobile device, use your computer\'s IP address instead of localhost\n3. Check your network connection';
    } else {
      return `Network request failed. Please check:\n\n1. Backend server is running and accessible\n2. Your internet connection\n3. API URL is correct: ${API_BASE_URL}`;
    }
  } else if (error instanceof Error) {
    return error.message;
  }
  return defaultMessage;
}

/**
 * Create a payment intent via backend API
 */
export async function createPaymentIntent(
  params: CreatePaymentIntentParams
): Promise<{
  success: boolean;
  data?: PaymongoPaymentIntent;
  error?: string;
}> {
  try {
    const url = `${API_BASE_URL}/api/paymongo/create-payment-intent`;
    if (__DEV__) {
      console.log('📡 Attempting to create payment intent at:', url);
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: params.amount,
        currency: params.currency || 'PHP',
        payment_method_allowed: params.payment_method_allowed || ['card', 'gcash', 'paymaya'],
        description: params.description,
        metadata: params.metadata,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to create payment intent' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      data: data.data,
    };
  } catch (error) {
    console.error('❌ Error creating payment intent:', error);
    return {
      success: false,
      error: handleNetworkError(error, 'Failed to create payment intent'),
    };
  }
}

/**
 * Attach payment method to payment intent
 */
export async function attachPaymentMethod(
  params: AttachPaymentMethodParams
): Promise<{
  success: boolean;
  data?: PaymongoPaymentIntent;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/paymongo/attach-payment-method`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payment_intent_id: params.payment_intent_id,
        payment_method_id: params.payment_method_id,
        return_url: params.return_url,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to attach payment method' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      data: data.data,
    };
  } catch (error) {
    console.error('❌ Error attaching payment method:', error);
    return {
      success: false,
      error: handleNetworkError(error, 'Failed to attach payment method'),
    };
  }
}

/**
 * Confirm payment intent
 */
export async function confirmPaymentIntent(
  params: ConfirmPaymentIntentParams
): Promise<{
  success: boolean;
  data?: PaymongoPaymentIntent;
  next_action?: {
    type: string;
    redirect?: {
      url: string;
      return_url: string;
    };
  };
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/paymongo/confirm-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payment_intent_id: params.payment_intent_id,
        payment_method_id: params.payment_method_id,
        return_url: params.return_url,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to confirm payment intent' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      data: data.data,
      next_action: data.next_action,
    };
  } catch (error) {
    console.error('❌ Error confirming payment intent:', error);
    return {
      success: false,
      error: handleNetworkError(error, 'Failed to confirm payment intent'),
    };
  }
}

/**
 * Retrieve payment intent status
 */
export async function getPaymentIntent(
  paymentIntentId: string
): Promise<{
  success: boolean;
  data?: PaymongoPaymentIntent;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/paymongo/payment-intent/${paymentIntentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to retrieve payment intent' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      data: data.data,
    };
  } catch (error) {
    console.error('❌ Error retrieving payment intent:', error);
    return {
      success: false,
      error: handleNetworkError(error, 'Failed to retrieve payment intent'),
    };
  }
}

/**
 * Verify payment via webhook (called by backend)
 */
export async function verifyPayment(
  paymentIntentId: string
): Promise<{
  success: boolean;
  payment?: PaymongoPayment;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/paymongo/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payment_intent_id: paymentIntentId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to verify payment' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      payment: data.payment,
    };
  } catch (error) {
    console.error('❌ Error verifying payment:', error);
    return {
      success: false,
      error: handleNetworkError(error, 'Failed to verify payment'),
    };
  }
}

/**
 * Format amount from PHP to cents (Paymongo uses cents)
 */
export function formatAmountToCents(amountInPHP: number): number {
  return Math.round(amountInPHP * 100);
}

/**
 * Format amount from cents to PHP
 */
export function formatAmountFromCents(amountInCents: number): number {
  return amountInCents / 100;
}

/**
 * Get payment status display text
 */
export function getPaymentStatusText(status: string): string {
  switch (status) {
    case 'awaiting_payment_method':
      return 'Awaiting Payment Method';
    case 'awaiting_next_action':
      return 'Action Required';
    case 'processing':
      return 'Processing';
    case 'succeeded':
      return 'Payment Successful';
    case 'awaiting_payment':
      return 'Awaiting Payment';
    case 'canceled':
      return 'Payment Canceled';
    case 'failed':
      return 'Payment Failed';
    default:
      return status;
  }
}

