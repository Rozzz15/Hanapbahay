/**
 * Backend API Endpoint: Verify PayMongo Payment Status
 * 
 * This is a template for your backend server endpoint.
 * You'll need to implement this on your actual backend server.
 * 
 * Example implementation (Node.js/Express):
 * 
 * ```typescript
 * import express from 'express';
 * import Paymongo from 'paymongo';
 * 
 * const router = express.Router();
 * const paymongo = new Paymongo(process.env.PAYMONGO_SECRET_KEY);
 * 
 * router.post('/api/paymongo/verify-payment', async (req, res) => {
 *   try {
 *     const { paymentIntentId } = req.body;
 *     
 *     if (!paymentIntentId) {
 *       return res.status(400).json({
 *         success: false,
 *         error: 'Payment intent ID is required',
 *       });
 *     }
 *     
 *     // Retrieve payment intent from PayMongo
 *     const paymentIntent = await paymongo.paymentIntents.retrieve(paymentIntentId);
 *     
 *     res.json({
 *       success: true,
 *       status: paymentIntent.attributes.status,
 *       amount: paymentIntent.attributes.amount,
 *       currency: paymentIntent.attributes.currency,
 *       metadata: paymentIntent.attributes.metadata,
 *     });
 *   } catch (error: any) {
 *     console.error('Error verifying payment:', error);
 *     res.status(500).json({
 *       success: false,
 *       error: error.message || 'Failed to verify payment',
 *     });
 *   }
 * });
 * ```
 * 
 * Or using direct API calls:
 * 
 * ```typescript
 * import fetch from 'node-fetch';
 * 
 * router.post('/api/paymongo/verify-payment', async (req, res) => {
 *   try {
 *     const { paymentIntentId } = req.body;
 *     const secretKey = process.env.PAYMONGO_SECRET_KEY;
 *     
 *     const response = await fetch(
 *       `https://api.paymongo.com/v1/payment_intents/${paymentIntentId}`,
 *       {
 *         method: 'GET',
 *         headers: {
 *           'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
 *         },
 *       }
 *     );
 *     
 *     if (!response.ok) {
 *       throw new Error('Failed to retrieve payment intent');
 *     }
 *     
 *     const data = await response.json();
 *     const paymentIntent = data.data;
 *     
 *     res.json({
 *       success: true,
 *       status: paymentIntent.attributes.status,
 *       amount: paymentIntent.attributes.amount,
 *       currency: paymentIntent.attributes.currency,
 *       metadata: paymentIntent.attributes.metadata,
 *     });
 *   } catch (error: any) {
 *     console.error('Error verifying payment:', error);
 *     res.status(500).json({
 *       success: false,
 *       error: error.message || 'Failed to verify payment',
 *     });
 *   }
 * });
 * ```
 */

export interface VerifyPaymentRequest {
  paymentIntentId: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  status?: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, any>;
  error?: string;
}

// This file is a template - implement the actual endpoint on your backend server
// The client-side code will call: POST /api/paymongo/verify-payment

