/**
 * HivePay Client Types
 * Abstract types for the HivePay API client.
 * These types provide a stable interface that shields users from backend changes.
 * @module @hivepay/client/types
 */

/**
 * Configuration options for the HivePay client.
 */
export interface HivePayConfig {
  /**
   * HivePay API endpoint URL.
   * @default 'https://hivepay.me'
   */
  endpoint?: string;

  /**
   * API key for authentication.
   * Required for most operations except merchant registration.
   * Format: sk_live_xxx or sk_test_xxx
   */
  apiKey?: string;

  /**
   * Webhook signing secret for verifying webhook payloads.
   * Format: whsec_xxx
   * If not provided, falls back to apiKey for webhook verification.
   */
  webhookSecret?: string;

  /**
   * Request timeout in milliseconds.
   * @default 30000
   */
  timeout?: number;
}

/**
 * Payment session status values.
 */
export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'expired'
  | 'cancelled';

/**
 * Supported payment currencies.
 */
export type PaymentCurrency = 'HIVE' | 'HBD';

/**
 * Payment amount with formatting helpers.
 */
export interface PaymentAmount {
  /** Raw amount in smallest unit (satoshis) */
  raw: string;
  /** Human-readable formatted amount (e.g., "10.500 HBD") */
  formatted: string;
  /** Currency code */
  currency: PaymentCurrency;
  /** USD equivalent in cents at time of creation */
  usdCents: number;
}

/**
 * Payment session details.
 */
export interface Payment {
  /** Unique payment ID */
  id: string;
  /** URL-friendly identifier */
  slug: string;
  /** Payment amount details */
  amount: PaymentAmount;
  /** Payment description shown to customer */
  description: string;
  /** Current payment status */
  status: PaymentStatus;
  /** Internal payment ID used by provider */
  internalId?: string;
  /** Provider details */
  provider: {
    /** Provider ID */
    id?: string;
  };
  /** Merchant details */
  merchant: {
    /** Merchant ID */
    id: string;
    /** Merchant display name */
    name: string;
    /** Merchant icon/logo URL */
    iconUrl: string;
  };
  /** URL to redirect customer after payment */
  redirectUrl?: string;
  /** When the payment expires */
  expiresAt: Date;
  /** When the payment was created */
  createdAt: Date;
  /** When the payment was last updated */
  updatedAt: Date;
}

/**
 * Options for creating a new payment.
 */
export interface CreatePaymentOptions {
  /**
   * Payment amount in smallest unit (satoshis).
   * For example, 10.500 HBD with precision 3 should be passed as "10500"
   */
  amount: string;
  /** Payment currency */
  currency: PaymentCurrency;
  /** Description shown to customer (max 255 chars) */
  description: string;
}

/**
 * Result from creating a payment.
 */
export interface CreatedPayment {
  /** Unique payment ID */
  id: string;
  /** URL-friendly identifier */
  slug: string;
  /** URL to redirect customer to complete payment */
  checkoutUrl: string;
}

/**
 * Merchant account details.
 */
export interface Merchant {
  /** Unique merchant ID */
  id: string;
  /** Display name */
  name: string;
  /** Icon/logo URL */
  iconUrl?: string;
  /** Whether the merchant can create payments */
  isActive: boolean;
  /** Hive blockchain account for receiving payments */
  hiveAccount: string;
  /** Webhook URL for payment notifications */
  webhookUrl?: string;
  /** Whether the merchant accepts x402 payments from automated clients */
  x402Enabled: boolean;
  /** When the account was created */
  createdAt: Date;
}

/**
 * Merchant details visible to admins.
 */
export interface AdminMerchant extends Merchant {
  /** Whether the merchant has admin privileges */
  isAdmin: boolean;
}

/**
 * Options for registering a new merchant.
 */
export interface RegisterMerchantOptions {
  /** Display name for the merchant */
  name: string;
  /** URL to the merchant's icon/logo */
  iconUrl: string;
  /** Hive blockchain account name for receiving payments */
  hiveAccount: string;
}

/**
 * Result from merchant registration.
 */
export interface RegisteredMerchant {
  /** Created merchant details */
  merchant: Merchant;
  /**
   * API key for authentication.
   * Store this securely - it cannot be retrieved again!
   */
  apiKey: string;
  /**
   * Webhook signing secret for verifying webhook payloads.
   * Store this securely - it cannot be retrieved again!
   */
  webhookSecret: string;
}

/**
 * Options for updating merchant settings.
 */
export interface UpdateMerchantOptions {
  /** URL to the merchant's icon/logo */
  iconUrl?: string;
  /** URL for webhook notifications */
  webhookUrl?: string;
  /** Hive blockchain account name */
  hiveAccount?: string;
  /** Whether to accept x402 payments from automated clients */
  x402Enabled?: boolean;
}

/**
 * Options for iterating through payments.
 */
export interface IteratePaymentsOptions {
  /** Number of items per page (default: 20) */
  pageSize?: number;
}

/**
 * Options for iterating through merchants (admin only).
 */
export interface IterateMerchantsOptions {
  /** Number of items per page (default: 20) */
  pageSize?: number;
  /** Search query to filter by name */
  query?: string;
}

/**
 * Options for listing payments with pagination.
 */
export interface ListPaymentsOptions {
  /** Page number (default: 1) */
  page?: number;
  /** Number of items per page (default: 20, max: 100) */
  limit?: number;
}

/**
 * Options for listing merchants with pagination (admin only).
 */
export interface ListMerchantsOptions {
  /** Page number (default: 1) */
  page?: number;
  /** Number of items per page (default: 20, max: 100) */
  limit?: number;
  /** Search query to filter by name */
  query?: string;
}

/**
 * Pagination metadata.
 */
export interface PaginationInfo {
  /** Current page number */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Total number of items across all pages */
  total: number;
  /** Total number of pages */
  totalPages: number;
}

/**
 * Paginated response for payments.
 */
export interface PaginatedPayments {
  /** Array of payment items */
  data: Payment[];
  /** Pagination metadata */
  pagination: PaginationInfo;
}

/**
 * Paginated response for merchants.
 */
export interface PaginatedMerchants {
  /** Array of merchant items */
  data: AdminMerchant[];
  /** Pagination metadata */
  pagination: PaginationInfo;
}

/**
 * Status of a billing period.
 */
export type BillingPeriodStatus = 'open' | 'invoiced' | 'paid' | 'overdue';

/**
 * Billing period — a single month of merchant activity that may have an invoice attached.
 */
export interface BillingPeriod {
  /** Unique billing period ID */
  id: string;
  /** Start of the billing period (UTC, first day of the month) */
  periodStart: Date;
  /** End of the billing period (exclusive, first day of the next month) */
  periodEnd: Date;
  /** Total processed payment volume during the period in USD cents */
  totalVolumeCents: number;
  /** Number of completed payment transactions during the period */
  transactionCount: number;
  /** Invoice amount in USD cents (matches the invoice session amount) */
  invoiceAmountCents: number;
  /** Current invoice status */
  status: BillingPeriodStatus;
  /** ID of the payment session backing the invoice */
  invoiceSessionId: string | null;
  /** Slug of the invoice session (used to build payment URLs) */
  invoiceSlug: string | null;
  /** Hosted URL the merchant can use to pay the invoice (only present while unpaid) */
  invoicePaymentUrl: string | null;
  /** When the billing period was created */
  createdAt: Date;
  /** When the billing period was last updated */
  updatedAt: Date;
}

/**
 * Current-month billing summary for a single merchant.
 */
export interface MerchantBillingCurrentMonth {
  /** Start of the current month (UTC) */
  periodStart: Date;
  /** End of the current month (exclusive) */
  periodEnd: Date;
  /** Volume processed so far this month (USD cents) */
  totalVolumeCents: number;
  /** Number of completed transactions so far this month */
  transactionCount: number;
  /** Projected invoice amount at month-end at the prevailing tier (USD cents) */
  projectedInvoiceCents: number;
}

/**
 * Billing summary for a merchant — current month plus invoice history.
 */
export interface MerchantBillingSummary {
  /** Merchant ID this summary belongs to */
  merchantId: string;
  /** Merchant display name */
  merchantName: string;
  /** Running totals for the current month */
  currentMonth: MerchantBillingCurrentMonth;
  /** Unpaid invoices (status invoiced or overdue) */
  outstandingInvoices: BillingPeriod[];
  /** Paid invoices */
  paidInvoices: BillingPeriod[];
  /** Sum of unpaid invoice amounts (USD cents) */
  outstandingAmountCents: number;
  /** Sum of paid invoice amounts to date (USD cents) */
  totalPaidCents: number;
  /** Fee tier schedule currently in effect, sorted ascending by minVolumeCents */
  feeTiers: FeeTier[];
}

/**
 * Single merchant row in an admin billing overview.
 */
export interface BillingOverviewMerchantRow {
  merchantId: string;
  merchantName: string;
  hiveAccountName: string;
  iconUrl?: string;
  currentMonthVolumeCents: number;
  currentMonthProjectedCents: number;
  outstandingInvoices: number;
  outstandingAmountCents: number;
  paidInvoices: number;
  paidAmountCents: number;
  /** ISO-8601 timestamp of the oldest unpaid period start, or null if all paid */
  oldestUnpaidPeriodStart: string | null;
  /** True if the merchant has overdue invoices or 2+ outstanding invoices */
  isBehind: boolean;
}

/**
 * Aggregate admin view of billing across all merchants.
 */
export interface BillingOverview {
  totals: {
    merchantsCount: number;
    merchantsBehindCount: number;
    merchantsPaidCount: number;
    totalOutstandingCents: number;
    totalPaidAllTimeCents: number;
    currentMonthVolumeCents: number;
    currentMonthProjectedCents: number;
  };
  merchants: BillingOverviewMerchantRow[];
}

/**
 * Webhook event types.
 */
export type WebhookEventType = 'payment.status_changed';

/**
 * Webhook event data for payment status changes.
 */
export interface PaymentStatusChangedEvent {
  /** Payment ID */
  paymentId: string;
  /** New payment status */
  status: PaymentStatus;
}

/**
 * Webhook payload structure.
 */
export interface WebhookEvent {
  /** Event type */
  type: WebhookEventType;
  /** Event data */
  data: PaymentStatusChangedEvent;
  /** Timestamp when event was generated */
  timestamp: Date;
}

/**
 * Options for waiting on payment completion.
 */
export interface WaitForPaymentOptions {
  /** Maximum time to wait in milliseconds (default: 300000 = 5 minutes) */
  timeout?: number;
  /** Polling interval in milliseconds (default: 2000 = 2 seconds) */
  interval?: number;
}

/**
 * x402 payment payload for session verification and settlement.
 */
export interface X402PaymentPayload {
  /** x402 protocol version (must be 1) */
  x402Version: 1;
  /** Payment scheme */
  scheme: 'exact';
  /** CAIP-2 network identifier (e.g., "hive:mainnet") */
  network: string;
  /** Signed transaction and nonce */
  payload: {
    /** HF26-format signed Hive transaction with a transfer operation */
    signedTransaction: Record<string, unknown>;
    /** Unique nonce for replay protection */
    nonce: string;
  };
}

/**
 * Result from x402 session verification.
 */
export interface X402VerifyResult {
  /** Whether the payment payload is valid for this session */
  isValid: boolean;
  /** Reason for invalid payload (only present if isValid is false) */
  invalidReason?: string;
  /** Hive account name of the payer (only present if isValid is true) */
  payer?: string;
}

/**
 * Result from x402 session settlement.
 */
export interface X402SettleResult {
  /** Whether the settlement was successful */
  success: boolean;
  /** On-chain transaction ID (only present on success) */
  txId?: string;
  /** Reason for failure (only present on failure) */
  errorReason?: string;
  /** Hive account name of the payer (only present on success) */
  payer?: string;
}

// ============================================================================
// Internal API types (used for API communication, not exposed to users)
// ============================================================================

/** @internal */
export interface ApiPaymentSession {
  id: string;
  slug: string;
  merchantId: string;
  providerId?: string;
  merchantName: string;
  merchantIconUrl?: string;
  internalId?: string;
  amountFormatted: string;
  amount: string;
  precision: number;
  currency: PaymentCurrency;
  usdEquivalentCents: number;
  description: string;
  status: string;
  redirectionUrl?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

/** @internal */
export interface ApiCreatePaymentRequest {
  amount: string;
  currency: PaymentCurrency;
  description: string;
}

/** @internal */
export interface ApiCreatePaymentResponse {
  id: string;
  slug: string;
  redirectUrl: string;
}

/** @internal */
export interface ApiPaymentStatusResponse {
  status: string;
}

/** @internal */
export interface ApiMerchant {
  id: string;
  name: string;
  iconUrl?: string;
  createdAt: string;
  active: boolean;
  privileges: string[];
  webhookUrl?: string;
  hiveAccountName: string;
  stripeCustomerId?: string;
  x402Enabled: boolean;
}

/** @internal */
export interface ApiRegisterMerchantRequest {
  name: string;
  iconUrl: string;
  hiveAccountName: string;
}

/** @internal */
export interface ApiRegisterMerchantResponse {
  merchant: ApiMerchant;
  apiKey: string;
  webhookSecret: string;
}

/** @internal */
export interface ApiUpdateMerchantRequest {
  iconUrl?: string;
  webhookUrl?: string;
  hiveAccountName?: string;
  x402Enabled?: boolean;
}

/** @internal */
export interface ApiErrorResponse {
  statusCode: number;
  statusMessage: string;
}

/** @internal */
export interface ApiPaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** @internal */
export interface ApiPaginatedPaymentsResponse {
  data: ApiPaymentSession[];
  pagination: ApiPaginationInfo;
}

/** @internal */
export interface ApiPaginatedMerchantsResponse {
  data: ApiMerchant[];
  pagination: ApiPaginationInfo;
}

/** @internal */
export interface ApiBillingPeriod {
  id: string;
  periodStart: string;
  periodEnd: string;
  totalVolumeCents: number;
  transactionCount: number;
  invoiceAmountCents: number;
  status: BillingPeriodStatus;
  invoiceSessionId: string | null;
  invoiceSlug: string | null;
  invoicePaymentUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/** @internal */
export interface ApiMerchantBillingSummary {
  merchantId: string;
  merchantName: string;
  currentMonth: {
    periodStart: string;
    periodEnd: string;
    totalVolumeCents: number;
    transactionCount: number;
    projectedInvoiceCents: number;
  };
  outstandingInvoices: ApiBillingPeriod[];
  paidInvoices: ApiBillingPeriod[];
  outstandingAmountCents: number;
  totalPaidCents: number;
  feeTiers: FeeTier[];
}

/** @internal */
export interface ApiBillingOverviewMerchantRow {
  merchantId: string;
  merchantName: string;
  hiveAccountName: string;
  iconUrl?: string;
  currentMonthVolumeCents: number;
  currentMonthProjectedCents: number;
  outstandingInvoices: number;
  outstandingAmountCents: number;
  paidInvoices: number;
  paidAmountCents: number;
  oldestUnpaidPeriodStart: string | null;
  isBehind: boolean;
}

/** @internal */
export interface ApiBillingOverview {
  totals: {
    merchantsCount: number;
    merchantsBehindCount: number;
    merchantsPaidCount: number;
    totalOutstandingCents: number;
    totalPaidAllTimeCents: number;
    currentMonthVolumeCents: number;
    currentMonthProjectedCents: number;
  };
  merchants: ApiBillingOverviewMerchantRow[];
}

/** @internal */
export interface ApiAdminBillingPeriod extends ApiBillingPeriod {
  merchantId: string;
  merchantName: string | null;
  merchantHiveAccountName: string | null;
  merchantIconUrl: string | null;
}

/** @internal */
export interface ApiPaginatedAdminBillingPeriods {
  data: ApiAdminBillingPeriod[];
  pagination: ApiPaginationInfo;
}

/**
 * Single admin-visible billing period (includes merchant identification).
 */
export interface AdminBillingPeriod extends BillingPeriod {
  merchantId: string;
  merchantName: string | null;
  merchantHiveAccountName: string | null;
  merchantIconUrl: string | null;
}

/**
 * Paginated response for admin billing periods.
 */
export interface PaginatedAdminBillingPeriods {
  data: AdminBillingPeriod[];
  pagination: PaginationInfo;
}

/**
 * Options for listing admin billing periods.
 */
export interface ListBillingPeriodsOptions {
  /** Page number (default: 1) */
  page?: number;
  /** Items per page (default: 20, max: 100) */
  limit?: number;
  /** Filter by merchant ID */
  merchantId?: string;
  /** Filter by status */
  status?: BillingPeriodStatus;
}

/**
 * Options for generating monthly invoices (admin).
 */
export interface GenerateInvoicesOptions {
  /** Calendar month (1-12) */
  month: number;
  /** Calendar year (e.g. 2026) */
  year: number;
}

/**
 * Result of a monthly invoice generation run (admin).
 */
export interface GenerateInvoicesResult {
  invoicesGenerated: number;
  totalBilledCents: number;
  details: Array<{
    merchantId: string;
    merchantName: string;
    volumeCents: number;
    invoiceCents: number;
  }>;
}

/**
 * A single fee tier in the billing schedule.
 */
export interface FeeTier {
  /** Inclusive lower bound of the tier (USD cents) */
  minVolumeCents: number;
  /** Inclusive upper bound of the tier (USD cents), or null for the top tier */
  maxVolumeCents: number | null;
  /** Percentage fee charged for volume that falls in this tier (e.g. 1.5 = 1.5%) */
  percentFee: number;
}

/**
 * Error codes for HivePay API errors.
 */
export type HivePayErrorCode =
  | 'NETWORK_ERROR'
  | 'API_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'FORBIDDEN_ERROR'
  | 'NOT_FOUND_ERROR'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR';

/** @internal */
export interface ApiWebhookPayload {
  type: 'payment.status_changed';
  data: {
    id: string;
    merchantId: string;
    providerId?: string;
    internalId?: string;
    status: string;
  };
}

/**
 * Options for webhook verification.
 */
export interface VerifyWebhookOptions {
  /** Raw request body as string */
  payload: string;
  /** Value of X-HivePay-Signature header */
  signature: string;
  /** Value of X-HivePay-Timestamp header */
  timestamp: string;
  /**
   * Maximum age of webhook in milliseconds.
   * Webhooks older than this are rejected to prevent replay attacks.
   * @default 300000 (5 minutes)
   */
  maxAge?: number;
}

/**
 * Result of webhook verification.
 */
export interface VerifyWebhookResult {
  /** Whether the webhook signature is valid */
  valid: boolean;
  /** Parsed webhook event (only present if valid) */
  event?: WebhookEvent;
  /** Error message (only present if invalid) */
  error?: string;
}
