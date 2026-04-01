/**
 * HivePay Payments Resource
 * Handles all payment-related API operations.
 * @module @hivepay/client
 */

import type { HttpClient } from '../http.js';
import { isTerminalStatus, toCreatedPayment, toPayment, toPaymentStatus } from '../transformers.js';
import type {
  ApiCreatePaymentResponse,
  ApiPaginatedPaymentsResponse,
  ApiPaymentSession,
  ApiPaymentStatusResponse,
  ApiFeeResponse,
  CreatePaymentOptions,
  CreatedPayment,
  IteratePaymentsOptions,
  ListPaymentsOptions,
  PaginatedPayments,
  Payment,
  PaymentStatus,
  WaitForPaymentOptions,
  X402PaymentPayload,
  X402VerifyResult,
  X402SettleResult
} from '../types/index.js';

/**
 * Payments resource for managing payment sessions.
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
 * // Redirect user to checkout
 * window.location.href = payment.checkoutUrl;
 *
 * // Iterate through all payments
 * for await (const payment of hivepay.payments) {
 *   console.log(payment.id, payment.status);
 * }
 * ```
 */
export class Payments implements AsyncIterable<Payment> {
  private readonly http: HttpClient;
  private readonly basePath = '/api/public/payments';

  public constructor (http: HttpClient) {
    this.http = http;
  }

  /**
   * Creates a new payment session.
   *
   * @param options - Payment creation options
   * @returns Created payment with checkout URL
   * @throws {HivePayError} On validation errors or authentication failures
   *
   * @example
   * ```ts
   * const payment = await hivepay.payments.create({
   *   amount: '10500', // 10.500 HBD (precision 3)
   *   currency: 'HBD',
   *   description: 'Order #12345'
   * });
   *
   * // Redirect user to complete payment
   * window.location.href = payment.checkoutUrl;
   * ```
   */
  public async create (options: CreatePaymentOptions): Promise<CreatedPayment> {
    const response = await this.http.post<ApiCreatePaymentResponse>(
      `${this.basePath}/create`,
      {
        amount: options.amount,
        currency: options.currency,
        description: options.description
      }
    );
    return toCreatedPayment(response);
  }

  /**
   * Retrieves full details of a payment.
   *
   * @param id - Payment ID
   * @returns Payment details
   * @throws {HivePayError} On not found or authentication errors
   *
   * @example
   * ```ts
   * const payment = await hivepay.payments.get('pay_xxx');
   * console.log(payment.amount.formatted); // "10.500 HBD"
   * console.log(payment.status); // "pending"
   * ```
   */
  public async get (id: string): Promise<Payment> {
    const response = await this.http.get<ApiPaymentSession>(`${this.basePath}/${id}`);
    return toPayment(response);
  }

  /**
   * Retrieves the current status of a payment.
   * Use this for polling to minimize data transfer.
   *
   * @param id - Payment ID
   * @returns Current payment status
   * @throws {HivePayError} On not found or authentication errors
   *
   * @example
   * ```ts
   * const status = await hivepay.payments.getStatus('pay_xxx');
   * if (status === 'completed') {
   *   // Handle successful payment
   * }
   * ```
   */
  public async getStatus (id: string): Promise<PaymentStatus> {
    const response = await this.http.get<ApiPaymentStatusResponse>(`${this.basePath}/${id}/status`);
    return toPaymentStatus(response);
  }

  /**
   * Retrieves the current fee rate for payments.
   * The rate at session creation time applies to that session.
   *
   * @returns Current fee percentage
   *
   * @example
   * ```ts
   * const fee = await hivepay.payments.getFeeRate();
   * console.log(`Current fee: ${fee}%`); // "Current fee: 1.5%"
   * ```
   */
  public async getFeeRate (): Promise<number> {
    const response = await this.http.get<ApiFeeResponse>(`${this.basePath}/fee`);
    return response.percentFee;
  }

  /**
   * Waits for a payment to reach a terminal status.
   * Polls the status endpoint until completion, failure, expiry, or timeout.
   *
   * @param id - Payment ID
   * @param options - Wait options
   * @returns Final payment status
   *
   * @example
   * ```ts
   * const status = await hivepay.payments.waitFor('pay_xxx', {
   *   timeout: 300000, // 5 minutes
   *   interval: 3000   // Check every 3 seconds
   * });
   *
   * if (status === 'completed') {
   *   // Payment successful
   * }
   * ```
   */
  public async waitFor (
    id: string,
    options: WaitForPaymentOptions = {}
  ): Promise<PaymentStatus> {
    const { timeout = 300000, interval = 2000 } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const status = await this.getStatus(id);

      if (isTerminalStatus(status))
        return status;

      await new Promise(resolve => setTimeout(resolve, interval));
    }

    // Return last known status if timeout reached
    return this.getStatus(id);
  }

  /**
   * Verifies an x402 payment payload against a session without broadcasting.
   * Use this to check if a payment would succeed before settling.
   *
   * @param sessionId - Payment session ID
   * @param paymentPayload - x402 payment payload with signed transaction
   * @returns Verification result
   *
   * @example
   * ```ts
   * const result = await hivepay.payments.x402Verify('session_id', {
   *   x402Version: 1,
   *   scheme: 'exact',
   *   network: 'hive:mainnet',
   *   payload: { signedTransaction: tx, nonce: 'unique-nonce' }
   * });
   *
   * if (result.isValid) {
   *   console.log('Payment from:', result.payer);
   * }
   * ```
   */
  public async x402Verify (sessionId: string, paymentPayload: X402PaymentPayload): Promise<X402VerifyResult> {
    return this.http.post<X402VerifyResult>(
      '/api/public/x402/verify',
      { sessionId, paymentPayload }
    );
  }

  /**
   * Settles an x402 payment for a session.
   * Verifies the signed transaction, broadcasts it to the Hive blockchain,
   * and marks the session as completed.
   *
   * @param sessionId - Payment session ID
   * @param paymentPayload - x402 payment payload with signed transaction
   * @returns Settlement result with transaction ID on success
   *
   * @example
   * ```ts
   * const result = await hivepay.payments.x402Settle('session_id', {
   *   x402Version: 1,
   *   scheme: 'exact',
   *   network: 'hive:mainnet',
   *   payload: { signedTransaction: tx, nonce: 'unique-nonce' }
   * });
   *
   * if (result.success) {
   *   console.log('Settled! TX:', result.txId, 'Payer:', result.payer);
   * }
   * ```
   */
  public async x402Settle (sessionId: string, paymentPayload: X402PaymentPayload): Promise<X402SettleResult> {
    return this.http.post<X402SettleResult>(
      '/api/public/x402/settle',
      { sessionId, paymentPayload }
    );
  }

  /**
   * Retrieves a paginated list of payments.
   *
   * @param options - Pagination options
   * @returns Paginated payments response with pagination metadata
   * @throws {HivePayError} On authentication errors
   *
   * @example
   * ```ts
   * // Get first page
   * const result = await hivepay.payments.list();
   * console.log(result.data);              // Array of payments
   * console.log(result.pagination.page);   // Current page (1)
   * console.log(result.pagination.total);  // Total items (e.g., 150)
   * console.log(result.pagination.totalPages); // Total pages (e.g., 8)
   *
   * // Get specific page
   * const page3 = await hivepay.payments.list({ page: 3 });
   *
   * // Custom page size
   * const largePage = await hivepay.payments.list({ page: 1, limit: 50 });
   * ```
   */
  public async list (options: ListPaymentsOptions = {}): Promise<PaginatedPayments> {
    const { page = 1, limit = 20 } = options;

    const response = await this.http.get<ApiPaginatedPaymentsResponse>(`${this.basePath}/list`, {
      page,
      limit
    });

    return {
      data: response.data.map(toPayment),
      pagination: response.pagination
    };
  }

  /**
   * Returns an async iterator for paginating through all payments.
   *
   * @param options - Iterator options
   * @returns Async iterator yielding payments
   *
   * @example
   * ```ts
   * // Iterate with default page size
   * for await (const payment of hivepay.payments) {
   *   console.log(payment.id, payment.status);
   * }
   *
   * // Iterate with custom page size
   * for await (const payment of hivepay.payments.iterate({ pageSize: 50 })) {
   *   await processPayment(payment);
   * }
   * ```
   */
  public async *iterate (options: IteratePaymentsOptions = {}): AsyncGenerator<Payment> {
    const { pageSize = 20 } = options;
    let currentPage = 1;

    while (true) {
      const result = await this.list({ page: currentPage, limit: pageSize });

      for (const item of result.data)
        yield item;

      if (currentPage >= result.pagination.totalPages)
        break;

      currentPage++;
    }
  }

  /**
   * Makes the Payments class directly iterable.
   *
   * @example
   * ```ts
   * for await (const payment of hivepay.payments) {
   *   console.log(payment.id);
   * }
   * ```
   */
  public [Symbol.asyncIterator] (): AsyncGenerator<Payment> {
    return this.iterate();
  }
}
