/**
 * HivePay Client
 * Main entry point for the HivePay TypeScript client.
 * @module @hivepay/client
 */

import { HivePayError } from './errors.js';
import { HttpClient } from './http.js';
import type { HivePayConfig, VerifyWebhookOptions, VerifyWebhookResult } from './types/index.js';
import { Admin, Billing, Merchants, Payments } from './resources/index.js';
import { createWebhookSignatureInternal, verifyWebhookInternal } from './webhooks.js';

/**
 * Default HivePay API endpoint.
 */
export const DEFAULT_ENDPOINT = 'https://hivepay.me' as const;

/**
 * HivePay API Client.
 *
 * The main class for interacting with the HivePay payment gateway API.
 * Provides access to payments, merchants, and admin resources.
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
 * // Redirect user to checkout
 * window.location.href = payment.checkoutUrl;
 *
 * // Iterate through all payments
 * for await (const p of hivepay.payments) {
 *   console.log(p.id, p.status);
 * }
 * ```
 */
export class HivePay {
  private readonly http: HttpClient;
  private readonly apiKey?: string;
  private readonly webhookSecret?: string;

  /**
   * Payments resource for managing payment sessions.
   * Implements AsyncIterable for easy iteration.
   *
   * @example
   * ```ts
   * // Create a payment
   * const payment = await hivepay.payments.create({
   *   amount: '10500',
   *   currency: 'HBD',
   *   description: 'Order #12345'
   * });
   *
   * // Iterate through all payments
   * for await (const p of hivepay.payments) {
   *   console.log(p.id, p.status);
   * }
   * ```
   */
  public readonly payments: Payments;

  /**
   * Merchants resource for managing merchant accounts.
   *
   * @example
   * ```ts
   * // Register a new merchant (no API key required)
   * const result = await hivepay.merchants.register({
   *   name: 'My Store',
   *   iconUrl: 'https://example.com/logo.png',
   *   hiveAccount: 'mystore'
   * });
   *
   * // Get merchant details
   * const merchant = await hivepay.merchants.get(result.merchant.id);
   * console.log(merchant.isActive);
   * ```
   */
  public readonly merchants: Merchants;

  /**
   * Admin resource for administrative operations.
   * Requires admin privileges. Implements AsyncIterable.
   *
   * @example
   * ```ts
   * // Iterate through all merchants (admin only)
   * for await (const merchant of hivepay.admin) {
   *   console.log(merchant.name, merchant.isActive, merchant.isAdmin);
   * }
   *
   * // Activate/deactivate a merchant
   * await hivepay.admin.setActive({
   *   merchantId: 'id',
   *   active: true
   * });
   * ```
   */
  public readonly admin: Admin;

  /**
   * Billing resource for subscription billing.
   *
   * Merchants can read their own billing summary; admins can also see the
   * platform-wide overview, run invoice generation, and tweak fee tiers.
   *
   * @example
   * ```ts
   * // Merchant view
   * const summary = await hivepay.billing.getMine();
   * for (const invoice of summary.outstandingInvoices) {
   *   console.log('Pay at:', invoice.invoicePaymentUrl);
   * }
   *
   * // Admin view
   * const overview = await admin.billing.getOverview();
   * console.log(overview.totals.merchantsBehindCount, 'merchants behind');
   * ```
   */
  public readonly billing: Billing;

  /**
   * Creates a new HivePay client instance.
   *
   * @param config - Client configuration options
   *
   * @example
   * ```ts
   * // Basic usage with API key
   * const hivepay = new HivePay({
   *   apiKey: 'sk_live_xxx'
   * });
   *
   * // Custom endpoint (e.g., for testing)
   * const hivepay = new HivePay({
   *   endpoint: 'https://staging.hivepay.me',
   *   apiKey: 'sk_test_xxx'
   * });
   * ```
   */
  public constructor (config: HivePayConfig = {}) {
    const baseUrl = this.normalizeEndpoint(config.endpoint ?? DEFAULT_ENDPOINT);

    this.apiKey = config.apiKey;
    this.webhookSecret = config.webhookSecret;
    this.http = new HttpClient({
      baseUrl,
      apiKey: config.apiKey,
      timeout: config.timeout
    });

    this.payments = new Payments(this.http);
    this.merchants = new Merchants(this.http);
    this.admin = new Admin(this.http);
    this.billing = new Billing(this.http);
  }

  /**
   * Creates a new client instance with a different API key.
   * Useful for switching authentication context.
   *
   * @param apiKey - New API key to use
   * @returns New HivePay instance with the specified API key
   *
   * @example
   * ```ts
   * // Create client without API key for registration
   * const publicClient = new HivePay();
   *
   * const result = await publicClient.merchants.register({
   *   name: 'My Store',
   *   iconUrl: 'https://example.com/logo.png',
   *   hiveAccount: 'mystore'
   * });
   *
   * // Create authenticated client with returned API key
   * const authClient = publicClient.withApiKey(result.apiKey);
   * ```
   */
  public withApiKey (apiKey: string): HivePay {
    const newHttp = this.http.withApiKey(apiKey);
    const instance = Object.create(HivePay.prototype) as HivePay;

    Object.defineProperty(instance, 'apiKey', { value: apiKey });
    Object.defineProperty(instance, 'webhookSecret', { value: this.webhookSecret });
    Object.defineProperty(instance, 'http', { value: newHttp });
    Object.defineProperty(instance, 'payments', { value: new Payments(newHttp) });
    Object.defineProperty(instance, 'merchants', { value: new Merchants(newHttp) });
    Object.defineProperty(instance, 'admin', { value: new Admin(newHttp) });
    Object.defineProperty(instance, 'billing', { value: new Billing(newHttp) });

    return instance;
  }

  /**
   * Verifies a webhook signature and parses the event.
   *
   * **Security Requirements:**
   * - Must be called in a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts) (HTTPS or localhost)
   * - Requires [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) support
   * - Client must be initialized with an API key
   *
   * @param options - Verification options
   * @returns Verification result with parsed event if valid
   *
   * @example
   * ```ts
   * const hivepay = new HivePay({ apiKey: 'sk_live_xxx' });
   *
   * // In your webhook handler
   * async function handleWebhook(req: Request) {
   *   const result = await hivepay.verifyWebhook({
   *     payload: await req.text(),
   *     signature: req.headers.get('X-HivePay-Signature')!,
   *     timestamp: req.headers.get('X-HivePay-Timestamp')!
   *   });
   *
   *   if (!result.valid) {
   *     return new Response(result.error, { status: 401 });
   *   }
   *
   *   const { event } = result;
   *   if (event.type === 'payment.status_changed') {
   *     console.log('Payment', event.data.paymentId, 'is now', event.data.status);
   *   }
   *
   *   return new Response('OK');
   * }
   * ```
   */
  public async verifyWebhook (options: VerifyWebhookOptions): Promise<VerifyWebhookResult> {
    const secret = this.webhookSecret ?? this.apiKey;

    if (!secret) {
      throw new HivePayError(
        'A webhook secret or API key is required to verify webhooks. Initialize the client with a webhookSecret (recommended) or apiKey.',
        'AUTHENTICATION_ERROR'
      );
    }

    return verifyWebhookInternal(secret, options);
  }

  /**
   * Creates a webhook signature for testing purposes.
   *
   * **Warning:** This should only be used for testing. In production,
   * signatures are generated by the HivePay server.
   *
   * @param payload - Webhook payload object
   * @returns Object with signature, timestamp, and body
   *
   * @example
   * ```ts
   * const hivepay = new HivePay({ apiKey: 'sk_test_xxx' });
   *
   * // Create a test webhook
   * const { signature, timestamp, body } = await hivepay.createTestWebhook({
   *   type: 'payment.status_changed',
   *   data: { paymentId: 'pay_xxx', status: 'completed' }
   * });
   *
   * // Use in test request
   * await fetch('/webhooks/hivepay', {
   *   method: 'POST',
   *   headers: {
   *     'X-HivePay-Signature': signature,
   *     'X-HivePay-Timestamp': timestamp,
   *     'Content-Type': 'application/json'
   *   },
   *   body
   * });
   * ```
   */
  public async createTestWebhook (
    payload: unknown
  ): Promise<{ signature: string; timestamp: string; body: string }> {
    const secret = this.webhookSecret ?? this.apiKey;

    if (!secret) {
      throw new HivePayError(
        'A webhook secret or API key is required to create test webhooks. Initialize the client with a webhookSecret (recommended) or apiKey.',
        'AUTHENTICATION_ERROR'
      );
    }

    return createWebhookSignatureInternal(secret, payload);
  }

  /**
   * Normalizes the endpoint URL to ensure it has the correct format.
   */
  private normalizeEndpoint (endpoint: string): string {
    let url = endpoint.replace(/\/$/, '');

    if (!url.startsWith('http://') && !url.startsWith('https://'))
      url = `https://${url}`;

    if (!url.endsWith('/api/public'))
      url = `${url}/api/public`;

    return url;
  }
}
