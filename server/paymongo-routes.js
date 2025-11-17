/**
 * Paymongo API Routes
 * Express.js routes for handling Paymongo payment operations
 * 
 * This server should run on port 3000 (or as specified in EXPO_PUBLIC_API_URL)
 * 
 * To run: node server/server.js
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Paymongo API configuration
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY || '';
const PAYMONGO_PUBLIC_KEY = process.env.PAYMONGO_PUBLIC_KEY || '';
const PAYMONGO_BASE_URL = process.env.PAYMONGO_BASE_URL || 'https://api.paymongo.com/v1';

// Helper function to make authenticated requests to Paymongo
async function paymongoRequest(method, endpoint, data = null) {
  const url = `${PAYMONGO_BASE_URL}${endpoint}`;
  const auth = Buffer.from(`${PAYMONGO_SECRET_KEY}:`).toString('base64');
  
  const options = {
    method,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    console.log('🌐 PayMongo API Request:', method, url);
    if (data) {
      console.log('📤 Request body:', JSON.stringify(data, null, 2));
    }
    
    const response = await fetch(url, options);
    const result = await response.json();
    
    console.log('📥 PayMongo API Response Status:', response.status);
    console.log('📥 PayMongo API Response:', JSON.stringify(result, null, 2));
    
    if (!response.ok) {
      const errorMessage = result.errors?.[0]?.detail || 
                          result.error?.message || 
                          result.message ||
                          `Paymongo API error: ${response.status}`;
      console.error('❌ PayMongo API Error:', errorMessage);
      console.error('❌ Full error response:', JSON.stringify(result, null, 2));
      throw new Error(errorMessage);
    }

    return result;
  } catch (error) {
    console.error('❌ Paymongo API error:', error);
    console.error('❌ Error message:', error.message);
    throw error;
  }
}

/**
 * POST /api/paymongo/create-payment-intent
 * Creates a payment intent in Paymongo
 */
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'PHP', payment_method_allowed, description, metadata } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount',
      });
    }

    // Convert metadata to string values (PayMongo requires all metadata values to be strings)
    const stringMetadata = {};
    if (metadata && typeof metadata === 'object') {
      for (const [key, value] of Object.entries(metadata)) {
        // Convert all values to strings, skip nested objects
        if (value !== null && value !== undefined) {
          if (typeof value === 'object') {
            // If it's an object, stringify it
            stringMetadata[key] = JSON.stringify(value);
          } else {
            // Convert to string
            stringMetadata[key] = String(value);
          }
        }
      }
    }

    const paymentIntentData = {
      data: {
        attributes: {
          amount: Math.round(amount), // Amount in cents
          currency: currency.toUpperCase(),
          payment_method_allowed: payment_method_allowed || ['card', 'gcash', 'paymaya'],
          description: description || 'Rent payment',
          metadata: Object.keys(stringMetadata).length > 0 ? stringMetadata : undefined,
        },
      },
    };

    const result = await paymongoRequest('POST', '/payment_intents', paymentIntentData);

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create payment intent',
    });
  }
});

/**
 * POST /api/paymongo/attach-payment-method
 * Attaches a payment method to a payment intent
 */
router.post('/attach-payment-method', async (req, res) => {
  try {
    const { payment_intent_id, payment_method_id, return_url } = req.body;

    if (!payment_intent_id || !payment_method_id) {
      return res.status(400).json({
        success: false,
        error: 'payment_intent_id and payment_method_id are required',
      });
    }

    const attachData = {
      data: {
        attributes: {
          payment_method: payment_method_id,
        },
      },
    };

    // For e-wallet payments (GCash, PayMaya), return_url is required
    if (return_url) {
      attachData.data.attributes.return_url = return_url;
    }

    console.log('📡 Attaching payment method');
    console.log('   Payment Intent ID:', payment_intent_id);
    console.log('   Payment Method ID:', payment_method_id);
    console.log('   Return URL:', return_url);
    console.log('   Request data:', JSON.stringify(attachData, null, 2));

    const result = await paymongoRequest(
      'POST',
      `/payment_intents/${payment_intent_id}/attach`,
      attachData
    );
    
    console.log('✅ Payment method attached successfully');
    
    // Check if attach response already has next_action (redirect URL)
    // For e-wallet payments, attach might automatically confirm and return redirect URL
    const nextAction = result.data?.attributes?.next_action;
    const redirectUrl = nextAction?.redirect?.url;
    
    if (redirectUrl) {
      console.log('✅ Redirect URL received from attach:', redirectUrl);
    }

    // Return response with next_action if present (for e-wallet redirects)
    res.json({
      success: true,
      data: result.data,
      // Include next_action if present (for e-wallet redirects)
      next_action: nextAction ? {
        type: nextAction.type,
        redirect: redirectUrl ? {
          url: redirectUrl,
          return_url: return_url,
        } : undefined,
      } : undefined,
    });
  } catch (error) {
    console.error('Error attaching payment method:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to attach payment method',
    });
  }
});

/**
 * POST /api/paymongo/create-payment-method
 * Creates a payment method for e-wallet payments
 */
router.post('/create-payment-method', async (req, res) => {
  try {
    const { type } = req.body; // 'gcash' or 'paymaya'

    if (!type || (type !== 'gcash' && type !== 'paymaya')) {
      return res.status(400).json({
        success: false,
        error: 'type must be "gcash" or "paymaya"',
      });
    }

    const paymentMethodData = {
      data: {
        attributes: {
          type: type,
        },
      },
    };

    const result = await paymongoRequest('POST', '/payment_methods', paymentMethodData);

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Error creating payment method:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create payment method',
    });
  }
});

/**
 * POST /api/paymongo/confirm-payment-intent
 * Confirms a payment intent
 */
router.post('/confirm-payment-intent', async (req, res) => {
  try {
    const { payment_intent_id, payment_method_id, return_url } = req.body;

    if (!payment_intent_id) {
      return res.status(400).json({
        success: false,
        error: 'payment_intent_id is required',
      });
    }

    // PayMongo payment intent IDs are already in the correct format (e.g., "pi_xxxxx")
    // Use the ID as-is
    const intentId = payment_intent_id;

    console.log('🔍 Confirming payment intent');
    console.log('   Intent ID:', intentId);
    console.log('   Return URL:', return_url);
    console.log('   Payment Method ID:', payment_method_id);

    // PayMongo requires a valid HTTP/HTTPS URL for return_url
    // Default to a placeholder if not provided (should be provided by client)
    const defaultReturnUrl = return_url || 'https://example.com/payment-return';
    
    const confirmData = {
      data: {
        attributes: {
          return_url: return_url || defaultReturnUrl,
        },
      },
    };

    if (payment_method_id) {
      confirmData.data.attributes.payment_method = payment_method_id;
    }

    // PayMongo API endpoint format: /v1/payment_intents/{id}/confirm
    // The intentId should already be in format "pi_xxxxx"
    console.log('📡 Calling PayMongo API: POST /payment_intents/' + intentId + '/confirm');
    console.log('📡 Request data:', JSON.stringify(confirmData, null, 2));
    
    const result = await paymongoRequest(
      'POST',
      `/payment_intents/${intentId}/confirm`,
      confirmData
    );
    
    console.log('✅ PayMongo response received');

    // Check if there's a next action (redirect URL for GCash/PayMaya)
    const nextAction = result.data?.attributes?.next_action;
    const redirectUrl = nextAction?.redirect?.url;

    res.json({
      success: true,
      data: result.data,
      next_action: nextAction ? {
        type: nextAction.type,
        redirect: redirectUrl ? {
          url: redirectUrl,
          return_url: return_url || 'hanapbahay://payment-return',
        } : undefined,
      } : undefined,
    });
  } catch (error) {
    console.error('Error confirming payment intent:', error);
    console.error('Error details:', error.message);
    console.error('Payment intent ID attempted:', req.body.payment_intent_id);
    
    // Provide more specific error messages
    let errorMessage = error.message || 'Failed to confirm payment intent';
    if (error.message && error.message.includes('not found')) {
      errorMessage = 'Payment intent not found. It may have expired or been deleted.';
    } else if (error.message && error.message.includes('missing')) {
      errorMessage = 'Required payment information is missing.';
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * GET /api/paymongo/payment-intent/:id
 * Retrieves a payment intent by ID
 */
router.get('/payment-intent/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Payment intent ID is required',
      });
    }

    const result = await paymongoRequest('GET', `/payment_intents/${id}`);

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve payment intent',
    });
  }
});

/**
 * POST /api/paymongo/verify-payment
 * Verifies a payment by payment intent ID
 */
router.post('/verify-payment', async (req, res) => {
  try {
    const { payment_intent_id } = req.body;

    if (!payment_intent_id) {
      return res.status(400).json({
        success: false,
        error: 'payment_intent_id is required',
      });
    }

    // Get payment intent
    const intentResult = await paymongoRequest('GET', `/payment_intents/${payment_intent_id}`);
    const paymentIntent = intentResult.data;

    // Get payment if it exists
    let payment = null;
    if (paymentIntent.attributes.payment) {
      const paymentId = paymentIntent.attributes.payment;
      try {
        const paymentResult = await paymongoRequest('GET', `/payments/${paymentId}`);
        payment = paymentResult.data;
      } catch (error) {
        console.warn('Could not retrieve payment:', error);
      }
    }

    res.json({
      success: true,
      payment: payment,
      payment_intent: paymentIntent,
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify payment',
    });
  }
});

/**
 * POST /api/paymongo/webhook
 * Handles Paymongo webhook events
 * 
 * IMPORTANT: This endpoint should verify the webhook signature
 * See: https://developers.paymongo.com/docs/webhooks
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['paymongo-signature'];
    const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET || '';

    // Verify webhook signature
    if (webhookSecret && signature) {
      const isValid = verifyWebhookSignature(req.body, signature, webhookSecret);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid webhook signature',
        });
      }
    }

    const event = JSON.parse(req.body.toString());
    const { type, data } = event;

    console.log(`Received Paymongo webhook: ${type}`, data.id);

    // Handle different event types
    switch (type) {
      case 'payment.succeeded':
        // Payment succeeded - update payment record
        await handlePaymentSucceeded(data);
        console.log('Payment succeeded:', data.id);
        break;

      case 'payment.failed':
        // Payment failed - update payment record
        await handlePaymentFailed(data);
        console.log('Payment failed:', data.id);
        break;

      case 'payment.pending':
        // Payment pending - update payment record
        await handlePaymentPending(data);
        console.log('Payment pending:', data.id);
        break;

      case 'payment_intent.succeeded':
        // Payment intent succeeded
        await handlePaymentIntentSucceeded(data);
        console.log('Payment intent succeeded:', data.id);
        break;

      default:
        console.log(`Unhandled webhook event type: ${type}`);
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({
      success: true,
      message: 'Webhook received',
    });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to handle webhook',
    });
  }
});

/**
 * Handle payment succeeded event
 * Updates payment record in database
 */
async function handlePaymentSucceeded(paymentData) {
  try {
    const { id: paymentId, attributes } = paymentData;
    const { metadata } = attributes;

    if (!metadata || !metadata.paymentId) {
      console.warn('Payment succeeded but no paymentId in metadata');
      return;
    }

    // TODO: Integrate with your database
    // Example:
    // const payment = await db.get('rent_payments', metadata.paymentId);
    // if (payment) {
    //   await db.upsert('rent_payments', payment.id, {
    //     ...payment,
    //     status: 'pending_owner_confirmation',
    //     paymentMethod: 'Paymongo',
    //     paymongoPaymentId: paymentId,
    //     paymongoStatus: 'succeeded',
    //     paidDate: new Date().toISOString(),
    //     updatedAt: new Date().toISOString(),
    //   });
    // }

    console.log(`Payment ${metadata.paymentId} marked as succeeded`);
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
  }
}

/**
 * Handle payment failed event
 * Updates payment record in database
 */
async function handlePaymentFailed(paymentData) {
  try {
    const { id: paymentId, attributes } = paymentData;
    const { metadata } = attributes;

    if (!metadata || !metadata.paymentId) {
      console.warn('Payment failed but no paymentId in metadata');
      return;
    }

    // TODO: Integrate with your database
    // Example:
    // const payment = await db.get('rent_payments', metadata.paymentId);
    // if (payment) {
    //   await db.upsert('rent_payments', payment.id, {
    //     ...payment,
    //     paymongoPaymentId: paymentId,
    //     paymongoStatus: 'failed',
    //     notes: `Payment failed via Paymongo: ${attributes.status}`,
    //     updatedAt: new Date().toISOString(),
    //   });
    // }

    console.log(`Payment ${metadata.paymentId} marked as failed`);
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}

/**
 * Handle payment pending event
 * Updates payment record in database
 */
async function handlePaymentPending(paymentData) {
  try {
    const { id: paymentId, attributes } = paymentData;
    const { metadata } = attributes;

    if (!metadata || !metadata.paymentId) {
      console.warn('Payment pending but no paymentId in metadata');
      return;
    }

    // TODO: Integrate with your database
    // Example:
    // const payment = await db.get('rent_payments', metadata.paymentId);
    // if (payment) {
    //   await db.upsert('rent_payments', payment.id, {
    //     ...payment,
    //     paymongoPaymentId: paymentId,
    //     paymongoStatus: 'awaiting_payment',
    //     updatedAt: new Date().toISOString(),
    //   });
    // }

    console.log(`Payment ${metadata.paymentId} marked as pending`);
  } catch (error) {
    console.error('Error handling payment pending:', error);
  }
}

/**
 * Handle payment intent succeeded event
 * Updates payment record in database
 */
async function handlePaymentIntentSucceeded(intentData) {
  try {
    const { id: intentId, attributes } = intentData;
    const { metadata } = attributes;

    if (!metadata || !metadata.paymentId) {
      console.warn('Payment intent succeeded but no paymentId in metadata');
      return;
    }

    // TODO: Integrate with your database
    // Similar to handlePaymentSucceeded but for payment intents

    console.log(`Payment intent ${intentId} succeeded for payment ${metadata.paymentId}`);
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
  }
}

/**
 * Verify webhook signature
 * Paymongo uses HMAC SHA256 to sign webhooks
 */
function verifyWebhookSignature(payload, signature, secret) {
  try {
    // Paymongo sends signature as: timestamp,hmac
    const [timestamp, hmac] = signature.split(',').map(s => s.split('=')[1]);
    
    // Create expected signature
    const signedPayload = `${timestamp}.${payload.toString()}`;
    const expectedHmac = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    // Compare signatures using constant-time comparison
    return crypto.timingSafeEqual(
      Buffer.from(hmac),
      Buffer.from(expectedHmac)
    );
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

module.exports = router;

