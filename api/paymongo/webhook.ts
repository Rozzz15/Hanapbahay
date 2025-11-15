/**
 * Backend API Endpoint: PayMongo Webhook Handler
 * 
 * This endpoint receives webhook events from PayMongo when payments are processed.
 * 
 * Example implementation (Node.js/Express):
 * 
 * ```typescript
 * import express from 'express';
 * import crypto from 'crypto';
 * 
 * const router = express.Router();
 * 
 * // Middleware to verify webhook signature (optional but recommended)
 * function verifyWebhookSignature(req: express.Request, res: express.Response, next: express.NextFunction) {
 *   const signature = req.headers['paymongo-signature'] as string;
 *   const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
 *   
 *   if (!signature || !webhookSecret) {
 *     return res.status(401).json({ error: 'Missing signature or webhook secret' });
 *   }
 *   
 *   // Verify signature (PayMongo uses HMAC SHA256)
 *   const hmac = crypto.createHmac('sha256', webhookSecret);
 *   const payload = JSON.stringify(req.body);
 *   const calculatedSignature = hmac.update(payload).digest('hex');
 *   
 *   if (signature !== calculatedSignature) {
 *     return res.status(401).json({ error: 'Invalid signature' });
 *   }
 *   
 *   next();
 * }
 * 
 * router.post('/api/paymongo/webhook', verifyWebhookSignature, async (req, res) => {
 *   try {
 *     const { data, type } = req.body;
 *     
 *     console.log('📥 PayMongo webhook received:', type);
 *     
 *     // Handle different webhook event types
 *     switch (type) {
 *       case 'payment_intent.succeeded':
 *         await handlePaymentSuccess(data);
 *         break;
 *       case 'payment_intent.failed':
 *         await handlePaymentFailure(data);
 *         break;
 *       case 'payment_intent.processing':
 *         await handlePaymentProcessing(data);
 *         break;
 *       default:
 *         console.log('Unhandled webhook event type:', type);
 *     }
 *     
 *     // Always return 200 to acknowledge receipt
 *     res.status(200).json({ received: true });
 *   } catch (error: any) {
 *     console.error('Error processing webhook:', error);
 *     // Still return 200 to prevent PayMongo from retrying
 *     res.status(200).json({ received: true, error: error.message });
 *   }
 * });
 * 
 * async function handlePaymentSuccess(data: any) {
 *   const paymentIntent = data.attributes;
 *   const bookingId = paymentIntent.metadata?.bookingId;
 *   const reference = paymentIntent.metadata?.reference;
 *   
 *   if (!bookingId) {
 *     console.error('No booking ID in payment metadata');
 *     return;
 *   }
 *   
 *   // Update your database - mark payment as paid
 *   // Example:
 *   // await markRentPaymentAsPaid(bookingId, `PayMongo - ${paymentIntent.id}`);
 *   
 *   console.log(`✅ Payment succeeded for booking ${bookingId}`);
 * }
 * 
 * async function handlePaymentFailure(data: any) {
 *   const paymentIntent = data.attributes;
 *   const bookingId = paymentIntent.metadata?.bookingId;
 *   
 *   console.log(`❌ Payment failed for booking ${bookingId}`);
 *   // Handle payment failure (notify user, etc.)
 * }
 * 
 * async function handlePaymentProcessing(data: any) {
 *   const paymentIntent = data.attributes;
 *   const bookingId = paymentIntent.metadata?.bookingId;
 *   
 *   console.log(`⏳ Payment processing for booking ${bookingId}`);
 *   // Update payment status to processing
 * }
 * ```
 * 
 * Webhook Configuration in PayMongo Dashboard:
 * 1. Go to PayMongo Dashboard → Webhooks
 * 2. Click "Add Webhook"
 * 3. Enter your webhook URL: https://your-backend.com/api/paymongo/webhook
 * 4. Select events to listen for:
 *    - payment_intent.succeeded
 *    - payment_intent.failed
 *    - payment_intent.processing
 * 5. Save webhook
 * 6. Copy the webhook secret and add it to your environment variables as PAYMONGO_WEBHOOK_SECRET
 */

export interface PayMongoWebhookEvent {
  data: {
    id: string;
    type: string;
    attributes: {
      type: string;
      livemode: boolean;
      data: {
        id: string;
        type: string;
        attributes: any;
      };
    };
  };
  type: 'payment_intent.succeeded' | 'payment_intent.failed' | 'payment_intent.processing';
}

// This file is a template - implement the actual webhook handler on your backend server
// Configure the webhook URL in PayMongo Dashboard: https://your-backend.com/api/paymongo/webhook

