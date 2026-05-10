/**
 * HivePay TypeScript Client
 *
 * Official TypeScript client for the HivePay payment gateway API.
 *
 * @packageDocumentation
 * @module @hivepay/client
 *
 * @example
 * ```ts
 * import { HivePay } from '@hivepay/client';
 *
 * const hivepay = new HivePay({ apiKey: 'sk_live_xxx' });
 *
 * // Create a payment
 * const payment = await hivepay.payments.create({
 *   amount: '10500',
 *   currency: 'HBD',
 *   description: 'Order #12345'
 * });
 *
 * // Redirect to checkout
 * window.location.href = payment.checkoutUrl;
 *
 * // Iterate through all payments
 * for await (const p of hivepay.payments) {
 *   console.log(p.id, p.status);
 * }
 * ```
 */

// Main exports
export { HivePay, DEFAULT_ENDPOINT } from './client.js';

// Types
export type * as HivePayTypes from './types/exportable.js';

// Re-export error class and helper for error handling
export { HivePayError, isHivePayError } from './errors.js';

// Formatting utilities
export { formatSatoshis } from './fee.js';
