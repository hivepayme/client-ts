/**
 * HivePay Billing Resource
 * Handles subscription billing — current month volume and outstanding invoices.
 * @module @hivepay/client
 */

import type { HttpClient } from '../http.js';
import {
  toAdminBillingPeriod,
  toBillingOverview,
  toMerchantBillingSummary
} from '../transformers.js';
import type {
  AdminBillingPeriod,
  ApiBillingOverview,
  ApiMerchantBillingSummary,
  ApiPaginatedAdminBillingPeriods,
  BillingOverview,
  FeeTier,
  GenerateInvoicesOptions,
  GenerateInvoicesResult,
  ListBillingPeriodsOptions,
  MerchantBillingSummary,
  PaginatedAdminBillingPeriods
} from '../types/index.js';

/**
 * Billing resource for subscription billing operations.
 *
 * Merchants use {@link Billing.getMine} to read their own billing status.
 * Admin endpoints require an admin API key.
 *
 * @example
 * ```ts
 * // Merchant view
 * const summary = await hivepay.billing.getMine();
 * for (const invoice of summary.outstandingInvoices)
 *   console.log(invoice.invoicePaymentUrl);
 *
 * // Admin view
 * const overview = await admin.billing.getOverview();
 * console.log(overview.totals.merchantsBehindCount);
 * ```
 */
export class Billing {
  private readonly http: HttpClient;
  private readonly publicBasePath = '/api/public/billing';
  private readonly adminBasePath = '/api/admin/billing';

  public constructor (http: HttpClient) {
    this.http = http;
  }

  /**
   * Returns the calling merchant's billing summary.
   * Includes the running current-month volume, the projected invoice for the
   * current period, and the full history of outstanding and paid invoices.
   *
   * Outstanding invoices include {@link MerchantBillingSummary.outstandingInvoices outstandingInvoices[].invoicePaymentUrl} —
   * a hosted URL the merchant can open or share to pay the invoice.
   *
   * @returns The merchant's billing summary
   * @throws {HivePayError} On authentication errors
   *
   * @example
   * ```ts
   * const summary = await hivepay.billing.getMine();
   *
   * console.log(`This month: ${summary.currentMonth.totalVolumeCents / 100} USD`);
   * console.log(`Projected fee: ${summary.currentMonth.projectedInvoiceCents / 100} USD`);
   *
   * for (const invoice of summary.outstandingInvoices) {
   *   if (invoice.invoicePaymentUrl)
   *     console.log('Pay at:', invoice.invoicePaymentUrl);
   * }
   * ```
   */
  public async getMine (): Promise<MerchantBillingSummary> {
    const response = await this.http.get<ApiMerchantBillingSummary>(`${this.publicBasePath}/me`);
    return toMerchantBillingSummary(response);
  }

  /**
   * Retrieves the admin billing overview — aggregated stats and a per-merchant
   * breakdown highlighting which merchants are behind on invoices.
   *
   * Requires an admin API key.
   *
   * @returns Aggregate billing overview
   * @throws {HivePayError} On authentication or authorization errors
   *
   * @example
   * ```ts
   * const overview = await admin.billing.getOverview();
   *
   * console.log(`${overview.totals.merchantsBehindCount} merchants are behind`);
   *
   * for (const m of overview.merchants.filter(r => r.isBehind))
   *   console.log(`${m.merchantName} owes ${m.outstandingAmountCents / 100} USD`);
   * ```
   */
  public async getOverview (): Promise<BillingOverview> {
    const response = await this.http.get<ApiBillingOverview>(`${this.adminBasePath}/overview`);
    return toBillingOverview(response);
  }

  /**
   * Retrieves the billing summary for a specific merchant (admin only).
   *
   * @param merchantId - Merchant to inspect
   * @returns The merchant's billing summary (same shape as {@link Billing.getMine})
   *
   * @example
   * ```ts
   * const detail = await admin.billing.getMerchantSummary('merchant_id');
   * console.log(detail.outstandingAmountCents);
   * ```
   */
  public async getMerchantSummary (merchantId: string): Promise<MerchantBillingSummary> {
    const response = await this.http.get<ApiMerchantBillingSummary>(`${this.adminBasePath}/merchant/${merchantId}`);
    return toMerchantBillingSummary(response);
  }

  /**
   * Retrieves a paginated list of all billing periods across merchants (admin only).
   *
   * @param options - Filter and pagination options
   * @returns Paginated billing periods
   *
   * @example
   * ```ts
   * const overdue = await admin.billing.listPeriods({ status: 'overdue' });
   * for (const period of overdue.data)
   *   console.log(period.merchantName, period.invoiceAmountCents);
   * ```
   */
  public async listPeriods (options: ListBillingPeriodsOptions = {}): Promise<PaginatedAdminBillingPeriods> {
    const { page = 1, limit = 20, merchantId, status } = options;

    const response = await this.http.get<ApiPaginatedAdminBillingPeriods>(`${this.adminBasePath}/periods`, {
      page,
      limit,
      merchantId,
      status
    });

    return {
      data: response.data.map(toAdminBillingPeriod),
      pagination: response.pagination
    };
  }

  /**
   * Iterates through all billing periods matching the given filters (admin only).
   *
   * @example
   * ```ts
   * for await (const period of admin.billing.iteratePeriods({ status: 'overdue' }))
   *   console.log(period.merchantName, period.invoiceAmountCents);
   * ```
   */
  public async *iteratePeriods (options: ListBillingPeriodsOptions = {}): AsyncGenerator<AdminBillingPeriod> {
    const { limit = 20, merchantId, status } = options;
    let currentPage = 1;

    while (true) {
      const result = await this.listPeriods({ page: currentPage, limit, merchantId, status });

      for (const item of result.data)
        yield item;

      if (currentPage >= result.pagination.totalPages)
        break;

      currentPage++;
    }
  }

  /**
   * Returns the current fee tier schedule (admin only).
   *
   * @example
   * ```ts
   * const { tiers } = await admin.billing.getTiers();
   * ```
   */
  public async getTiers (): Promise<{ tiers: FeeTier[] }> {
    return this.http.get<{ tiers: FeeTier[] }>(`${this.adminBasePath}/tiers`);
  }

  /**
   * Replaces the fee tier schedule (admin only).
   * Tiers must be contiguous starting at 0; only the last tier may have a null upper bound.
   *
   * @example
   * ```ts
   * await admin.billing.setTiers([
   *   { minVolumeCents: 0, maxVolumeCents: 99999, percentFee: 2.0 },
   *   { minVolumeCents: 100000, maxVolumeCents: null, percentFee: 1.5 }
   * ]);
   * ```
   */
  public async setTiers (tiers: FeeTier[]): Promise<{ tiers: FeeTier[] }> {
    return this.http.request<{ tiers: FeeTier[] }>({
      method: 'PUT',
      path: `${this.adminBasePath}/tiers`,
      body: { tiers }
    });
  }

  /**
   * Generates monthly invoices for a given month (admin only).
   * Idempotent — billing periods that already exist are skipped.
   *
   * @example
   * ```ts
   * const result = await admin.billing.generateInvoices({ month: 4, year: 2026 });
   * console.log(`Generated ${result.invoicesGenerated} invoices`);
   * ```
   */
  public async generateInvoices (options: GenerateInvoicesOptions): Promise<GenerateInvoicesResult> {
    return this.http.post<GenerateInvoicesResult>(`${this.adminBasePath}/generate-invoices`, options);
  }
}
