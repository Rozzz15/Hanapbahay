/**
 * PayMongo API Service
 * Handles PayMongo payment intent creation and management
 * 
 * Note: PayMongo requires server-side API calls for security.
 * This service can work with a backend API endpoint or use PayMongo's public API where applicable.
 */

import { API_BASE_URL } from '@/constants';

export interface PayMongoPaymentIntent {
  id: string;
  type: string;
  attributes: {
    amount: number;
    currency: string;
    description: string;
    status: 'awaiting_payment_method' | 'awaiting_next_action' | 'processing' | 'succeeded' | 'failed';
    client_key: string;
    payment_method_allowed: string[];
    metadata?: Record<string, any>;
    next_action?: {
      type: string;
      redirect?: {
        url: string;
        return_url: string;
      };
    };
  };
}

export interface CreatePaymentIntentParams {
  amount: number; // Amount in PHP (will be converted to centavos)
  description: string;
  reference: string;
  bookingId?: string;
  metadata?: Record<string, any>;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CreatePaymentIntentResponse {
  success: boolean;
  data?: PayMongoPaymentIntent;
  paymentUrl?: string;
  error?: string;
}

/**
 * Create a PayMongo Payment Intent via backend API
 * This is the secure way to create payment intents (requires secret key on backend)
 */
export async function createPaymentIntentViaBackend(
  params: CreatePaymentIntentParams
): Promise<CreatePaymentIntentResponse> {
  try {
    const backendUrl = process.env.EXPO_PUBLIC_PAYMONGO_BACKEND_URL || API_BASE_URL;
    const endpoint = `${backendUrl}/api/paymongo/create-payment-intent`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: params.amount,
        description: params.description,
        reference: params.reference,
        bookingId: params.bookingId,
        metadata: params.metadata,
        successUrl: params.successUrl || `hanapbahay://payment-success?bookingId=${params.bookingId}&reference=${params.reference}`,
        cancelUrl: params.cancelUrl || `hanapbahay://payment-cancel?bookingId=${params.bookingId}`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();

    // Extract payment URL from response
    let paymentUrl: string | undefined;
    if (data.paymentUrl) {
      paymentUrl = data.paymentUrl;
    } else if (data.data?.attributes?.next_action?.redirect?.url) {
      paymentUrl = data.data.attributes.next_action.redirect.url;
    } else if (data.data?.attributes?.client_key) {
      // PayMongo checkout URL format
      paymentUrl = `https://payments.paymongo.com/checkout/${data.data.attributes.client_key}`;
    }

    return {
      success: true,
      data: data.data,
      paymentUrl,
    };
  } catch (error) {
    console.error('❌ Error creating PayMongo payment intent via backend:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create payment intent',
    };
  }
}

/**
 * Create a PayMongo Payment Intent using public key (client-side)
 * Note: This is less secure but can work if backend is not available
 * Requires PayMongo public key in environment variables
 */
export async function createPaymentIntentClientSide(
  params: CreatePaymentIntentParams
): Promise<CreatePaymentIntentResponse> {
  try {
    const publicKey = process.env.EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY;
    
    if (!publicKey) {
      throw new Error('PayMongo public key not configured. Please set EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY in your .env file');
    }

    // PayMongo API endpoint for creating payment intents
    const response = await fetch('https://api.paymongo.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(publicKey + ':')}`, // Basic auth with public key
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: Math.round(params.amount * 100), // Convert to centavos
            currency: 'PHP',
            description: params.description,
            payment_method_allowed: ['gcash'],
            metadata: {
              reference: params.reference,
              bookingId: params.bookingId,
              ...params.metadata,
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ errors: [{ detail: 'Unknown error' }] }));
      const errorMessage = errorData.errors?.[0]?.detail || `HTTP ${response.status}`;
      throw new Error(errorMessage);
    }

    const result = await response.json();
    const paymentIntent = result.data as PayMongoPaymentIntent;

    // Get payment URL
    let paymentUrl: string | undefined;
    if (paymentIntent.attributes.next_action?.redirect?.url) {
      paymentUrl = paymentIntent.attributes.next_action.redirect.url;
    } else if (paymentIntent.attributes.client_key) {
      paymentUrl = `https://payments.paymongo.com/checkout/${paymentIntent.attributes.client_key}`;
    }

    return {
      success: true,
      data: paymentIntent,
      paymentUrl,
    };
  } catch (error) {
    console.error('❌ Error creating PayMongo payment intent (client-side):', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create payment intent',
    };
  }
}

/**
 * Create PayMongo Payment Intent (automatically chooses backend or client-side)
 */
export async function createPaymentIntent(
  params: CreatePaymentIntentParams
): Promise<CreatePaymentIntentResponse> {
  // Try backend first (more secure)
  const backendUrl = process.env.EXPO_PUBLIC_PAYMONGO_BACKEND_URL || API_BASE_URL;
  const useBackend = backendUrl && backendUrl !== 'http://localhost:3000';

  if (useBackend) {
    const result = await createPaymentIntentViaBackend(params);
    if (result.success) {
      return result;
    }
    // Fallback to client-side if backend fails
    console.warn('⚠️ Backend API failed, falling back to client-side PayMongo API');
  }

  // Use client-side as fallback or primary method
  return createPaymentIntentClientSide(params);
}

/**
 * Verify payment status via backend webhook or API
 */
export async function verifyPaymentStatus(
  paymentIntentId: string
): Promise<{ success: boolean; status?: string; error?: string }> {
  try {
    const backendUrl = process.env.EXPO_PUBLIC_PAYMONGO_BACKEND_URL || API_BASE_URL;
    const endpoint = `${backendUrl}/api/paymongo/verify-payment`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentIntentId }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      status: data.status,
    };
  } catch (error) {
    console.error('❌ Error verifying payment status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify payment',
    };
  }
}

