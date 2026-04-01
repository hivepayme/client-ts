/**
 * HivePay Admin Resource
 * Handles admin-only API operations.
 * @module @hivepay/client
 */

import type { HttpClient } from '../http.js';
import { toAdminMerchant } from '../transformers.js';
import type {
  AdminMerchant,
  ApiMerchant,
  ApiPaginatedMerchantsResponse,
  IterateMerchantsOptions,
  ListMerchantsOptions,
  PaginatedMerchants
} from '../types/index.js';

/**
 * Admin resource for administrative operations.
 * These endpoints require admin privileges.
 *
 * @example
 * ```ts
 * // Create client with admin API key
 * const adminClient = new HivePay({
 *   apiKey: 'sk_live_admin_xxx'
 * });
 *
 * // Iterate through all merchants
 * for await (const merchant of adminClient.admin.iterateMerchants()) {
 *   console.log(merchant.name, merchant.isActive, merchant.isAdmin);
 * }
 *
 * // Activate/deactivate a merchant
 * await adminClient.admin.setActive('merchant_id', true);
 * ```
 */
export class Admin {
  private readonly http: HttpClient;
  private readonly basePath = '/api/admin';

  public constructor (http: HttpClient) {
    this.http = http;
  }

  /**
   * Activates or deactivates a merchant account.
   *
   * @param merchantId - Merchant ID to update
   * @param active - Whether the merchant should be active
   * @returns Updated merchant details
   * @throws {HivePayError} On forbidden, validation, or authentication errors
   *
   * @example
   * ```ts
   * // Activate a merchant
   * const merchant = await hivepay.admin.setActive('merchant_id', true);
   *
   * // Deactivate a merchant
   * await hivepay.admin.setActive('merchant_id', false);
   * ```
   */
  public async setActive (merchantId: string, active: boolean): Promise<AdminMerchant> {
    const response = await this.http.request<ApiMerchant>({
      method: 'POST',
      path: `${this.basePath}/merchants/change-status`,
      params: { merchantId },
      body: { role: active ? 'user' : 'nonActive' }
    });

    return toAdminMerchant(response);
  }

  /**
   * Retrieves a paginated list of merchants.
   *
   * @param options - Pagination and filter options
   * @returns Paginated merchants response with pagination metadata
   * @throws {HivePayError} On forbidden or authentication errors
   *
   * @example
   * ```ts
   * // Get first page
   * const result = await hivepay.admin.listMerchants();
   * console.log(result.data);              // Array of merchants
   * console.log(result.pagination.page);   // Current page (1)
   * console.log(result.pagination.total);  // Total items (e.g., 50)
   * console.log(result.pagination.totalPages); // Total pages (e.g., 3)
   *
   * // Get specific page
   * const page2 = await hivepay.admin.listMerchants({ page: 2 });
   *
   * // With search query and custom page size
   * const filtered = await hivepay.admin.listMerchants({ page: 1, limit: 50, query: 'store' });
   * ```
   */
  public async listMerchants (options: ListMerchantsOptions = {}): Promise<PaginatedMerchants> {
    const { page = 1, limit = 20, query } = options;

    const response = await this.http.get<ApiPaginatedMerchantsResponse>(`${this.basePath}/merchants/list`, {
      page,
      limit,
      query
    });

    return {
      data: response.data.map(toAdminMerchant),
      pagination: response.pagination
    };
  }

  /**
   * Returns an async iterator for paginating through all merchants.
   *
   * @param options - Optional filter and page size options
   * @returns Async iterator yielding merchants
   *
   * @example
   * ```ts
   * // Process all merchants
   * for await (const merchant of hivepay.admin.iterateMerchants()) {
   *   console.log(merchant.id, merchant.name, merchant.isActive);
   * }
   *
   * // With search query and custom page size
   * for await (const merchant of hivepay.admin.iterateMerchants({ query: 'store', pageSize: 50 })) {
   *   console.log(merchant.name);
   * }
   * ```
   */
  public async *iterateMerchants (options: IterateMerchantsOptions = {}): AsyncGenerator<AdminMerchant> {
    const { pageSize = 20, query } = options;
    let currentPage = 1;

    while (true) {
      const result = await this.listMerchants({ page: currentPage, limit: pageSize, query });

      for (const item of result.data)
        yield item;

      if (currentPage >= result.pagination.totalPages)
        break;

      currentPage++;
    }
  }
}
