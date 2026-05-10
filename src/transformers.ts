/**
 * HivePay Type Transformers
 * Converts between internal API types and public client types.
 * @internal
 */

import type {
  AdminBillingPeriod,
  AdminMerchant,
  ApiAdminBillingPeriod,
  ApiBillingOverview,
  ApiBillingPeriod,
  ApiCreatePaymentResponse,
  ApiMerchant,
  ApiMerchantBillingSummary,
  ApiPaymentSession,
  ApiPaymentStatusResponse,
  ApiWebhookPayload,
  BillingOverview,
  BillingPeriod,
  CreatedPayment,
  Merchant,
  MerchantBillingSummary,
  Payment,
  PaymentStatus,
  WebhookEvent
} from './types/index.js';

/**
 * Maps API status strings to client PaymentStatus type.
 * Normalizes cancelled variants to single 'cancelled' status.
 */
function normalizePaymentStatus (apiStatus: string): PaymentStatus {
  switch (apiStatus) {
  case 'pending':
    return 'pending';
  case 'processing':
    return 'processing';
  case 'completed':
    return 'completed';
  case 'failed':
    return 'failed';
  case 'expired':
    return 'expired';
  case 'user_cancelled':
  case 'system_cancelled':
    return 'cancelled';
  default:
    return 'pending';
  }
}

/**
 * Transforms API payment session to client Payment type.
 */
export function toPayment (api: ApiPaymentSession): Payment {
  return {
    id: api.id,
    slug: api.slug,
    amount: {
      raw: api.amount,
      formatted: api.amountFormatted,
      currency: api.currency,
      usdCents: api.usdEquivalentCents
    },
    provider: {
      id: api.providerId,
    },
    internalId: api.internalId,
    merchant: {
      id: api.merchantId,
      iconUrl: api.merchantIconUrl!,
      name: api.merchantName
    },
    description: api.description,
    status: normalizePaymentStatus(api.status),
    redirectUrl: api.redirectionUrl,
    expiresAt: new Date(api.expiresAt),
    createdAt: new Date(api.createdAt),
    updatedAt: new Date(api.updatedAt)
  };
}

/**
 * Transforms API create payment response to client CreatedPayment type.
 */
export function toCreatedPayment (api: ApiCreatePaymentResponse): CreatedPayment {
  return {
    id: api.id,
    slug: api.slug,
    checkoutUrl: api.redirectUrl
  };
}

/**
 * Transforms API payment status response to client PaymentStatus.
 */
export function toPaymentStatus (api: ApiPaymentStatusResponse): PaymentStatus {
  return normalizePaymentStatus(api.status);
}

/**
 * Transforms API merchant to client Merchant type.
 */
export function toMerchant (api: ApiMerchant): Merchant {
  return {
    id: api.id,
    name: api.name,
    iconUrl: api.iconUrl,
    isActive: api.active,
    hiveAccount: api.hiveAccountName,
    webhookUrl: api.webhookUrl,
    x402Enabled: api.x402Enabled,
    createdAt: new Date(api.createdAt)
  };
}

/**
 * Transforms API merchant to client AdminMerchant type.
 */
export function toAdminMerchant (api: ApiMerchant): AdminMerchant {
  return {
    ...toMerchant(api),
    isAdmin: api.privileges.includes('admin')
  };
}

/**
 * Transforms API webhook payload to client WebhookEvent type.
 */
export function toWebhookEvent (api: ApiWebhookPayload, timestamp: number): WebhookEvent {
  return {
    type: api.type,
    data: {
      paymentId: api.data.id,
      status: normalizePaymentStatus(api.data.status)
    },
    timestamp: new Date(timestamp)
  };
}

/**
 * Checks if a payment status is terminal (no more changes expected).
 */
export function isTerminalStatus (status: PaymentStatus): boolean {
  return ['completed', 'failed', 'expired', 'cancelled'].includes(status);
}

/**
 * Transforms an API billing period to the public BillingPeriod type.
 */
export function toBillingPeriod (api: ApiBillingPeriod): BillingPeriod {
  return {
    id: api.id,
    periodStart: new Date(api.periodStart),
    periodEnd: new Date(api.periodEnd),
    totalVolumeCents: api.totalVolumeCents,
    transactionCount: api.transactionCount,
    invoiceAmountCents: api.invoiceAmountCents,
    status: api.status,
    invoiceSessionId: api.invoiceSessionId,
    invoiceSlug: api.invoiceSlug,
    invoicePaymentUrl: api.invoicePaymentUrl,
    createdAt: new Date(api.createdAt),
    updatedAt: new Date(api.updatedAt)
  };
}

/**
 * Transforms an admin API billing period (which carries merchant fields) to AdminBillingPeriod.
 */
export function toAdminBillingPeriod (api: ApiAdminBillingPeriod): AdminBillingPeriod {
  return {
    ...toBillingPeriod(api),
    merchantId: api.merchantId,
    merchantName: api.merchantName,
    merchantHiveAccountName: api.merchantHiveAccountName,
    merchantIconUrl: api.merchantIconUrl
  };
}

/**
 * Transforms an API merchant billing summary to the public MerchantBillingSummary type.
 */
export function toMerchantBillingSummary (api: ApiMerchantBillingSummary): MerchantBillingSummary {
  return {
    merchantId: api.merchantId,
    merchantName: api.merchantName,
    currentMonth: {
      periodStart: new Date(api.currentMonth.periodStart),
      periodEnd: new Date(api.currentMonth.periodEnd),
      totalVolumeCents: api.currentMonth.totalVolumeCents,
      transactionCount: api.currentMonth.transactionCount,
      projectedInvoiceCents: api.currentMonth.projectedInvoiceCents
    },
    outstandingInvoices: api.outstandingInvoices.map(toBillingPeriod),
    paidInvoices: api.paidInvoices.map(toBillingPeriod),
    outstandingAmountCents: api.outstandingAmountCents,
    totalPaidCents: api.totalPaidCents,
    feeTiers: api.feeTiers
  };
}

/**
 * Transforms the API billing overview into the public BillingOverview type.
 */
export function toBillingOverview (api: ApiBillingOverview): BillingOverview {
  return {
    totals: api.totals,
    merchants: api.merchants.map(row => ({ ...row }))
  };
}
