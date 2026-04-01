/**
 * HivePay Merchants Resource
 * Handles all merchant-related API operations.
 * @module @hivepay/client
 */

import type { HttpClient } from '../http.js';
import { toMerchant } from '../transformers.js';
import type {
  ApiMerchant,
  ApiRegisterMerchantResponse,
  Merchant,
  RegisteredMerchant,
  RegisterMerchantOptions,
  UpdateMerchantOptions
} from '../types/index.js';

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
 * // Store the API key securely - it cannot be retrieved again!
 * const apiKey = result.apiKey;
 *
 * // Get merchant details
 * const merchant = await hivepay.merchants.get(result.merchant.id);
 *
 * // Update merchant settings
 * await hivepay.merchants.update(merchant.id, {
 *   webhookUrl: 'https://example.com/webhooks/hivepay'
 * });
 * ```
 */
export class Merchants {
  private readonly http: HttpClient;
  private readonly basePath = '/api/public/merchants';

  public constructor (http: HttpClient) {
    this.http = http;
  }

  /**
   * Registers a new merchant account.
   * This endpoint does not require authentication.
   *
   * If you don't have an image hoster, you can use services like images.hive.blog
   * `https://images.hive.blog/u/your-username/avatar/medium`, where `your-username`
   * is your Hive account name.
   *
   * @param options - Merchant registration options
   * @returns Created merchant with API key
   * @throws {HivePayError} On validation errors
   *
   * @note The returned API key must be stored securely by the client.
   *
   * @example
   * ```ts
   * const result = await hivepay.merchants.register({
   *   name: 'My Store',
   *   iconUrl: 'https://example.com/logo.png',
   *   hiveAccount: 'mystore'
   * });
   *
   * // IMPORTANT: Store the API key securely!
   * // It cannot be retrieved again.
   * console.log('API Key:', result.apiKey);
   * console.log('Merchant ID:', result.merchant.id);
   * ```
   */
  public async register (options: RegisterMerchantOptions): Promise<RegisteredMerchant> {
    const response = await this.http.post<ApiRegisterMerchantResponse>(
      `${this.basePath}/register`,
      {
        name: options.name,
        iconUrl: options.iconUrl,
        hiveAccountName: options.hiveAccount
      }
    );

    return {
      merchant: toMerchant(response.merchant),
      apiKey: response.apiKey,
      webhookSecret: response.webhookSecret
    };
  }

  /**
   * Retrieves merchant details by ID.
   * Requires authentication with a valid API key.
   *
   * @param id - Merchant ID
   * @returns Merchant details
   * @throws {HivePayError} On not found or authentication errors
   *
   * @example
   * ```ts
   * const merchant = await hivepay.merchants.get('merchant_id');
   * console.log(merchant.name); // "My Store"
   * console.log(merchant.isActive); // true
   * ```
   */
  public async get (id: string): Promise<Merchant> {
    const response = await this.http.get<ApiMerchant>(`${this.basePath}/${id}`);
    return toMerchant(response);
  }

  /**
   * Retrieves details of the merchant associated with the current API key.
   *
   * @returns Merchant details
   * @throws {HivePayError} On not found or authentication errors
   *
   * @example
   * ```ts
   * const merchant = await hivepay.merchants.getCurrent();
   * console.log(merchant.name); // "My Store"
   * console.log(merchant.isActive); // true
   * ```
   */
  public async getCurrent (): Promise<Merchant> {
    const response = await this.http.get<ApiMerchant>(`${this.basePath}/me`);
    return toMerchant(response);
  }

  /**
   * Updates merchant settings.
   * Only the merchant associated with the API key can update their own details.
   *
   * @param id - Merchant ID
   * @param options - Fields to update
   * @returns Updated merchant details
   * @throws {HivePayError} On forbidden, validation, or authentication errors
   *
   * @example
   * ```ts
   * const updated = await hivepay.merchants.update('merchant_id', {
   *   iconUrl: 'https://example.com/new-logo.png',
   *   webhookUrl: 'https://example.com/webhooks/hivepay',
   *   hiveAccount: 'newaccount'
   * });
   * ```
   */
  public async update (id: string, options: UpdateMerchantOptions): Promise<Merchant> {
    const response = await this.http.post<ApiMerchant>(
      `${this.basePath}/${id}`,
      {
        iconUrl: options.iconUrl,
        webhookUrl: options.webhookUrl,
        hiveAccountName: options.hiveAccount,
        x402Enabled: options.x402Enabled
      }
    );
    return toMerchant(response);
  }
}
