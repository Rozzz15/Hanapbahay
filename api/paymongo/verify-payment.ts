/**
 * Paymongo Payment Verification API
 * This would typically be a server-side endpoint
 * For now, this is a client-side utility that calls a backend API
 */

import { verifyPayment } from '../../utils/paymongo-api';

export async function verifyPaymongoPayment(paymentIntentId: string) {
  return await verifyPayment(paymentIntentId);
}

