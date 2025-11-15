/**
 * Backend API Endpoint: Create PayMongo Payment Intent
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
 * router.post('/api/paymongo/create-payment-intent', async (req, res) => {
 *   try {
 *     const { amount, description, reference, bookingId, successUrl, cancelUrl, metadata } = req.body;
 *     
 *     // Create Payment Intent
 *     const paymentIntent = await paymongo.paymentIntents.create({
 *       amount: Math.round(amount * 100), // Convert to centavos
 *       currency: 'PHP',
 *       payment_method_allowed: ['gcash'],
 *       description: description,
 *       metadata: {
 *         reference,
 *         bookingId,
 *         ...metadata,
 *       },
 *     });
 *     
 *     // Create Payment Method for GCash
 *     const paymentMethod = await paymongo.paymentMethods.create({
 *       type: 'gcash',
 *     });
 *     
 *     // Attach Payment Method to Intent
 *     const attached = await paymongo.paymentIntents.attach(paymentIntent.id, {
 *       payment_method: paymentMethod.id,
 *     });
 *     
 *     // Get payment URL
 *     let paymentUrl: string | undefined;
 *     if (attached.attributes.next_action?.redirect?.url) {
 *       paymentUrl = attached.attributes.next_action.redirect.url;
 *     } else if (attached.attributes.client_key) {
 *       paymentUrl = `https://payments.paymongo.com/checkout/${attached.attributes.client_key}`;
 *     }
 *     
 *     res.json({
 *       success: true,
 *       data: attached,
 *       paymentUrl,
 *     });
 *   } catch (error: any) {
 *     console.error('Error creating PayMongo payment intent:', error);
 *     res.status(500).json({
 *       success: false,
 *       error: error.message || 'Failed to create payment intent',
 *     });
 *   }
 * });
 * ```
 * 
 * Or using direct API calls (without PayMongo SDK):
 * 
 * ```typescript
 * import fetch from 'node-fetch';
 * 
 * router.post('/api/paymongo/create-payment-intent', async (req, res) => {
 *   try {
 *     const { amount, description, reference, bookingId, successUrl, cancelUrl } = req.body;
 *     const secretKey = process.env.PAYMONGO_SECRET_KEY;
 *     
 *     // Create Payment Intent
 *     const intentResponse = await fetch('https://api.paymongo.com/v1/payment_intents', {
 *       method: 'POST',
 *       headers: {
 *         'Content-Type': 'application/json',
 *         'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
 *       },
 *       body: JSON.stringify({
 *         data: {
 *           attributes: {
 *             amount: Math.round(amount * 100),
 *             currency: 'PHP',
 *             payment_method_allowed: ['gcash'],
 *             description,
 *             metadata: {
 *               reference,
 *               bookingId,
 *             },
 *           },
 *         },
 *       }),
 *     });
 *     
 *     if (!intentResponse.ok) {
 *       throw new Error('Failed to create payment intent');
 *     }
 *     
 *     const intentData = await intentResponse.json();
 *     const paymentIntent = intentData.data;
 *     
 *     // Create Payment Method
 *     const methodResponse = await fetch('https://api.paymongo.com/v1/payment_methods', {
 *       method: 'POST',
 *       headers: {
 *         'Content-Type': 'application/json',
 *         'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
 *       },
 *       body: JSON.stringify({
 *         data: {
 *           attributes: {
 *             type: 'gcash',
 *           },
 *         },
 *       }),
 *     });
 *     
 *     if (!methodResponse.ok) {
 *       throw new Error('Failed to create payment method');
 *     }
 *     
 *     const methodData = await methodResponse.json();
 *     const paymentMethod = methodData.data;
 *     
 *     // Attach Payment Method
 *     const attachResponse = await fetch(
 *       `https://api.paymongo.com/v1/payment_intents/${paymentIntent.id}/attach`,
 *       {
 *         method: 'POST',
 *         headers: {
 *           'Content-Type': 'application/json',
 *           'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
 *         },
 *         body: JSON.stringify({
 *           data: {
 *             attributes: {
 *               payment_method: paymentMethod.id,
 *               return_url: successUrl || 'hanapbahay://payment-success',
 *             },
 *           },
 *         }),
 *       }
 *     );
 *     
 *     if (!attachResponse.ok) {
 *       throw new Error('Failed to attach payment method');
 *     }
 *     
 *     const attachData = await attachResponse.json();
 *     const attached = attachData.data;
 *     
 *     // Get payment URL
 *     let paymentUrl: string | undefined;
 *     if (attached.attributes.next_action?.redirect?.url) {
 *       paymentUrl = attached.attributes.next_action.redirect.url;
 *     } else if (attached.attributes.client_key) {
 *       paymentUrl = `https://payments.paymongo.com/checkout/${attached.attributes.client_key}`;
 *     }
 *     
 *     res.json({
 *       success: true,
 *       data: attached,
 *       paymentUrl,
 *     });
 *   } catch (error: any) {
 *     console.error('Error creating PayMongo payment intent:', error);
 *     res.status(500).json({
 *       success: false,
 *       error: error.message || 'Failed to create payment intent',
 *     });
 *   }
 * });
 * ```
 */

export interface CreatePaymentIntentRequest {
  amount: number;
  description: string;
  reference: string;
  bookingId?: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, any>;
}

export interface CreatePaymentIntentResponse {
  success: boolean;
  data?: any;
  paymentUrl?: string;
  error?: string;
}

// This file is a template - implement the actual endpoint on your backend server
// The client-side code will call: POST /api/paymongo/create-payment-intent

