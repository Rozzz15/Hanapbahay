/**
 * Paymongo Payment Intent Creation API
 * This would typically be a server-side endpoint
 * For now, this is a client-side utility that calls a backend API
 */

import { CreatePaymentIntentParams, createPaymentIntent } from '../../utils/paymongo-api';

export async function createPaymongoPaymentIntent(params: CreatePaymentIntentParams) {
  return await createPaymentIntent(params);
}

