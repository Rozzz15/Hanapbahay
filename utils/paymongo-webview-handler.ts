import { Linking, Platform } from 'react-native';

/**
 * PayMongo WebView URL handler for GCash deep links
 * This handles GCash redirects from PayMongo payment pages in WebView
 */
export function handlePayMongoWebViewUrl(url: string): boolean {
  // Handle GCash deep links from PayMongo WebView
  if (url.startsWith('gcash://')) {
    // Open GCash app directly
    Linking.openURL(url).catch((error) => {
      console.error('Failed to open GCash from PayMongo WebView:', error);
    });
    return true; // Prevent WebView from loading the URL
  }
  
  // Allow other URLs to load normally in WebView
  return false;
}

/**
 * Create PayMongo payment URL with GCash as payment method
 * Now uses real PayMongo API integration
 */
export async function createPayMongoPaymentUrl(
  amount: number,
  description: string,
  reference: string,
  successUrl?: string,
  cancelUrl?: string,
  bookingId?: string
): Promise<string> {
  try {
    const { createPaymentIntent } = await import('./paymongo-api');
    
    const result = await createPaymentIntent({
      amount,
      description,
      reference,
      bookingId,
      successUrl,
      cancelUrl,
    });

    if (!result.success || !result.paymentUrl) {
      throw new Error(result.error || 'Failed to create payment intent');
    }

    return result.paymentUrl;
  } catch (error) {
    console.error('❌ Error creating PayMongo payment URL:', error);
    throw error;
  }
}

/**
 * Handle PayMongo payment callback
 */
export async function handlePayMongoCallback(url: string): Promise<{
  success: boolean;
  paymentId?: string;
  error?: string;
}> {
  try {
    const urlObj = new URL(url);
    
    // Check if payment was successful
    if (urlObj.searchParams.get('status') === 'paid' || urlObj.pathname.includes('success')) {
      const paymentId = urlObj.searchParams.get('payment_intent_id') || 
                       urlObj.searchParams.get('payment_id') ||
                       urlObj.searchParams.get('id');
      
      return {
        success: true,
        paymentId: paymentId || undefined,
      };
    }
    
    // Check if payment was cancelled
    if (urlObj.searchParams.get('status') === 'cancelled' || urlObj.pathname.includes('cancel')) {
      return {
        success: false,
        error: 'Payment was cancelled',
      };
    }
    
    // Check for error
    const error = urlObj.searchParams.get('error');
    if (error) {
      return {
        success: false,
        error,
      };
    }
    
    return {
      success: false,
      error: 'Unknown payment status',
    };
  } catch (error) {
    console.error('Error handling PayMongo callback:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

