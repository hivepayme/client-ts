# @hivepay/client

[![npm version](https://img.shields.io/npm/v/@hivepay/client.svg)](https://www.npmjs.com/package/@hivepay/client)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue.svg)](https://www.typescriptlang.org/)

Official TypeScript client for the [HivePay](https://hivepay.me) payment gateway API. Accept Hive and HBD payments in your applications with a simple, type-safe API.

**Using LLMs?** Check out our skills: `npx skills add hivepayme/agent-skills` to enable AI agents to integrate HivePay into your applications with ease.

> **For AI assistants:** Full documentation in a single file at [docs.hivepay.me/llms-full.txt](https://docs.hivepay.me/llms-full.txt). Summary at [docs.hivepay.me/llms.txt](https://docs.hivepay.me/llms.txt). OpenAPI spec at [hivepay.me/openapi.json](https://hivepay.me/openapi.json). HivePay also operates an [x402 facilitator](https://hivepay.me/api/public/x402/) for HTTP-native micropayments on the Hive blockchain.

## Features

- Full TypeScript support with comprehensive type definitions
- Promise-based API with async/await support
- Native async iterators for easy pagination (`for await...of`)
- Built-in webhook verification using [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- Custom error types for easy error handling
- Zero dependencies (uses native fetch)
- Tree-shakeable ESM module
- Works in Node.js 18+ and modern browsers

## Installation

```bash
pnpm add @hivepay/client
```

## Quick Start

```typescript
import { HivePay } from '@hivepay/client';

const hivepay = new HivePay({ apiKey: 'sk_live_xxx' });

// Create a payment
const payment = await hivepay.payments.create({
  amount: '10500',    // 10.500 HBD (precision 3)
  currency: 'HBD',
  description: 'Order #12345'
});

// Redirect user to checkout
window.location.href = payment.checkoutUrl;
```

For more examples and detailed documentation, see the [High-level documentation](https://docs.hivepay.me).

## Having connectivity issues?

Visit [Status Page](https://status.hivepay.me) to check for any ongoing incidents or maintenance that might be affecting connectivity.

## API Reference

### Creating a Client

```typescript
import { HivePay } from '@hivepay/client';

const hivepay = new HivePay({
  endpoint: 'https://hivepay.me', // optional, default
  apiKey: 'sk_live_xxx',          // required for most operations
  timeout: 30000                  // optional, default 30s
});

// Create client without API key (for registration)
const publicClient = new HivePay();
```

### Payments

#### Create a Payment

```typescript
const payment = await hivepay.payments.create({
  amount: '10500',           // Amount in smallest unit (satoshis)
  currency: 'HBD',           // 'HIVE' or 'HBD'
  description: 'Order #123'  // Shown to customer
});

console.log(payment.id);          // Payment ID
console.log(payment.checkoutUrl); // URL to redirect customer
```

The full payment amount is transferred to your Hive account at settlement. HivePay does not deduct anything from individual transactions — fees are billed separately as a single monthly invoice (see [Billing](#billing)).

#### Get Payment Details

```typescript
const payment = await hivepay.payments.get('payment_id');

console.log(payment.status);           // 'pending', 'completed', 'cancelled', etc.
console.log(payment.amount.formatted); // '10.500 HBD'
console.log(payment.amount.usdCents);  // USD equivalent in cents
console.log(payment.expiresAt);        // Date object
```

#### Check Payment Status

```typescript
const status = await hivepay.payments.getStatus('payment_id');

if (status === 'completed') {
  // Handle successful payment
}
```

#### Wait for Payment Completion

```typescript
// Polls until payment reaches terminal status
const status = await hivepay.payments.waitFor('payment_id', {
  timeout: 300000,  // 5 minutes
  interval: 3000    // Check every 3 seconds
});
```

#### List Payments (Paginated)

```typescript
// Get first page
const result = await hivepay.payments.list();
console.log(result.data);                  // Array of payments
console.log(result.pagination.page);       // Current page: 1
console.log(result.pagination.limit);      // Items per page: 20
console.log(result.pagination.total);      // Total items: e.g., 150
console.log(result.pagination.totalPages); // Total pages: e.g., 8

// Get specific page
const page3 = await hivepay.payments.list({ page: 3 });

// Custom page size (max: 100)
const largePage = await hivepay.payments.list({ page: 1, limit: 50 });
```

#### Iterate Through All Payments

```typescript
// Direct iteration (uses default page size of 20)
for await (const payment of hivepay.payments) {
  console.log(payment.id, payment.status);
}

// With custom page size
for await (const payment of hivepay.payments.iterate({ pageSize: 50 })) {
  await processPayment(payment);
}
```

### Merchants

#### Register a New Merchant

```typescript
// No API key required for registration
const publicClient = new HivePay();

const result = await publicClient.merchants.register({
  name: 'My Store',
  iconUrl: 'https://example.com/logo.png',
  hiveAccount: 'mystore'
});

// IMPORTANT: Store the API key securely!
// It cannot be retrieved again.
console.log('API Key:', result.apiKey);
console.log('Merchant ID:', result.merchant.id);

// Create authenticated client with new API key
const authClient = publicClient.withApiKey(result.apiKey);
```

#### Get Current Merchant

```typescript
const merchant = await hivepay.merchants.getCurrent();

console.log(merchant.name);
console.log(merchant.createdAt);
console.log(merchant.webhookUrl);
```

#### Get Merchant Details

```typescript
const merchant = await hivepay.merchants.get('merchant_id');

console.log(merchant.name);
console.log(merchant.isActive);
console.log(merchant.hiveAccount);
```

#### Update Merchant Settings

```typescript
const updated = await hivepay.merchants.update('merchant_id', {
  iconUrl: 'https://example.com/new-logo.png',
  webhookUrl: 'https://example.com/webhooks/hivepay',
  hiveAccount: 'newaccount'
});
```

### x402 Protocol

HivePay operates an x402 facilitator that lets AI agents and automated clients pay for checkout sessions via the HTTP 402 protocol. The checkout URL returned by `payments.create()` works for both browsers and x402 clients — no additional setup needed.

See the [x402 documentation](https://docs.hivepay.me/x402/) for the full protocol details.

#### Toggle x402 Support

x402 is enabled by default for all merchants. Toggle it via the `x402Enabled` field:

```typescript
// Disable x402 payments
await hivepay.merchants.update('merchant_id', { x402Enabled: false });

// Re-enable x402 payments
await hivepay.merchants.update('merchant_id', { x402Enabled: true });

// Check current status
const merchant = await hivepay.merchants.getCurrent();
console.log(merchant.x402Enabled); // true
```

#### Verify a Payment Payload

Validate an x402 payment against a session without broadcasting:

```typescript
const result = await hivepay.payments.x402Verify('session_id', {
  x402Version: 1,
  scheme: 'exact',
  network: 'hive:mainnet',
  payload: {
    signedTransaction: tx,
    nonce: 'unique-nonce'
  }
});

if (result.isValid) {
  console.log('Valid payment from:', result.payer);
} else {
  console.log('Invalid:', result.invalidReason);
}
```

#### Settle a Payment

Verify, broadcast to the Hive blockchain, and mark the session as completed:

```typescript
const result = await hivepay.payments.x402Settle('session_id', {
  x402Version: 1,
  scheme: 'exact',
  network: 'hive:mainnet',
  payload: {
    signedTransaction: tx,
    nonce: 'unique-nonce'
  }
});

if (result.success) {
  console.log('TX:', result.txId, 'Payer:', result.payer);
} else {
  console.log('Failed:', result.errorReason);
}
```

### Billing

HivePay charges merchants on a monthly cycle. Volume processed in a calendar month is billed as a single invoice using the configured fee tiers.

#### Get Your Billing Summary

```typescript
const summary = await hivepay.billing.getMine();

// Running totals for the current month
console.log(summary.currentMonth.totalVolumeCents);     // e.g. 12500 ($125)
console.log(summary.currentMonth.transactionCount);     // e.g. 42
console.log(summary.currentMonth.projectedInvoiceCents); // estimated month-end fee

// Outstanding invoices include a hosted URL the merchant can pay at
for (const invoice of summary.outstandingInvoices) {
  console.log(invoice.invoiceAmountCents);  // amount in USD cents
  console.log(invoice.status);              // 'invoiced' | 'overdue'
  console.log(invoice.invoicePaymentUrl);   // open or share to pay
}

// Paid invoice history
console.log(summary.totalPaidCents);
```

### Admin Operations

Admin endpoints require an API key with admin privileges.

#### List Merchants (Paginated)

```typescript
// Get first page
const result = await hivepay.admin.listMerchants();
console.log(result.data);                  // Array of merchants
console.log(result.pagination.page);       // Current page: 1
console.log(result.pagination.limit);      // Items per page: 20
console.log(result.pagination.total);      // Total items: e.g., 50
console.log(result.pagination.totalPages); // Total pages: e.g., 3

// Get specific page
const page2 = await hivepay.admin.listMerchants({ page: 2 });

// With search query and custom page size (max: 100)
const filtered = await hivepay.admin.listMerchants({
  page: 1,
  limit: 50,
  query: 'store'
});
```

#### Iterate Through All Merchants

```typescript
// Iterate all merchants
for await (const merchant of hivepay.admin.iterateMerchants()) {
  console.log(merchant.id, merchant.name, merchant.isActive);
}

// With search query and custom page size
for await (const merchant of hivepay.admin.iterateMerchants({ query: 'store', pageSize: 50 })) {
  console.log(merchant.name);
}
```

#### Activate/Deactivate Merchant

```typescript
// Activate a merchant
await hivepay.admin.setActive('merchant_id', true);

// Deactivate a merchant
await hivepay.admin.setActive('merchant_id', false);
```

#### Billing Overview

```typescript
const overview = await hivepay.billing.getOverview();

console.log(overview.totals.merchantsCount);           // total billable merchants
console.log(overview.totals.merchantsBehindCount);     // merchants with overdue or 2+ unpaid invoices
console.log(overview.totals.totalOutstandingCents);    // sum of unpaid invoices
console.log(overview.totals.currentMonthVolumeCents);  // running volume across all merchants

for (const m of overview.merchants.filter(r => r.isBehind)) {
  console.log(`${m.merchantName} owes ${m.outstandingAmountCents / 100} USD`);
  console.log(`  oldest unpaid: ${m.oldestUnpaidPeriodStart}`);
}
```

#### Inspect a Single Merchant's Billing

```typescript
const detail = await hivepay.billing.getMerchantSummary('merchant_id');
// Same shape as billing.getMine(), but for any merchant.
```

#### List Billing Periods

```typescript
// All overdue invoices across the platform
const overdue = await hivepay.billing.listPeriods({ status: 'overdue' });
for (const period of overdue.data)
  console.log(period.merchantName, period.invoiceAmountCents, period.invoicePaymentUrl);

// Iterate
for await (const p of hivepay.billing.iteratePeriods({ status: 'invoiced' }))
  console.log(p.merchantName, p.invoicePaymentUrl);
```

#### Generate Invoices for a Month

Idempotent — runs that pick up a period that already has an invoice are skipped.

```typescript
const result = await hivepay.billing.generateInvoices({ month: 4, year: 2026 });
console.log(`Generated ${result.invoicesGenerated} invoices, total ${result.totalBilledCents / 100} USD`);
```

#### Manage Fee Tiers

```typescript
// Read
const { tiers } = await hivepay.billing.getTiers();

// Replace (must be contiguous, starting at 0; only the last tier may be open-ended)
await hivepay.billing.setTiers([
  { minVolumeCents: 0,      maxVolumeCents: 99999, percentFee: 2.0 },
  { minVolumeCents: 100000, maxVolumeCents: null,  percentFee: 1.5 }
]);
```

## Error Handling

The client throws `HivePayError` for all API errors:

```typescript
import { HivePay, HivePayError, isHivePayError } from '@hivepay/client';

try {
  await hivepay.payments.get('invalid-id');
} catch (error) {
  if (isHivePayError(error)) {
    console.log(error.code);       // 'NOT_FOUND_ERROR'
    console.log(error.statusCode); // 404
    console.log(error.message);    // Error message

    // Type-safe error checking
    if (error.isNotFound()) {
      // Handle not found
    } else if (error.isAuthError()) {
      // Handle authentication error
    } else if (error.isValidation()) {
      // Handle validation error
    } else if (error.isRateLimited()) {
      // Handle rate limit
    }
  }
}
```

### Error Codes

| Code                     | Description                          |
| ------------------------ | ------------------------------------ |
| `NETWORK_ERROR`          | Network request failed or timed out  |
| `API_ERROR`              | General API error                    |
| `AUTHENTICATION_ERROR`   | Invalid or missing API key (401)     |
| `FORBIDDEN_ERROR`        | Insufficient permissions (403)       |
| `NOT_FOUND_ERROR`        | Resource not found (404)             |
| `VALIDATION_ERROR`       | Invalid request parameters (400)     |
| `RATE_LIMIT_ERROR`       | Too many requests (429)              |
| `SERVER_ERROR`           | Server error (5xx)                   |

## Webhooks

HivePay sends webhooks for payment status changes. The client provides built-in verification using the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API).

> **Important:** Webhook verification requires a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts) (HTTPS or localhost). It will not work over plain HTTP in production.

```typescript
import { HivePay } from '@hivepay/client';

const hivepay = new HivePay({ apiKey: 'sk_live_xxx' });

// In your webhook handler (e.g., Express, Hono, etc.)
async function handleWebhook(req: Request) {
  const result = await hivepay.verifyWebhook({
    payload: await req.text(),
    signature: req.headers.get('X-HivePay-Signature')!,
    timestamp: req.headers.get('X-HivePay-Timestamp')!,
    maxAge: 300000 // Optional: reject webhooks older than 5 minutes
  });

  if (!result.valid) {
    console.error('Webhook verification failed:', result.error);
    return new Response(result.error, { status: 401 });
  }

  const { event } = result;
  if (event.type === 'payment.status_changed') {
    const { paymentId, status } = event.data;
    console.log(`Payment ${paymentId} is now ${status}`);

    // Handle the status change
    if (status === 'completed') {
      await fulfillOrder(paymentId);
    }
  }

  return new Response('OK');
}
```

### Testing Webhooks

For testing, you can create webhook signatures:

```typescript
import { HivePay } from '@hivepay/client';

const hivepay = new HivePay({ apiKey: 'sk_test_xxx' });

// Create a test webhook
const { signature, timestamp, body } = await hivepay.createTestWebhook({
  type: 'payment.status_changed',
  data: { paymentId: 'pay_xxx', status: 'completed' }
});

// Use in test request
const response = await fetch('/webhooks/hivepay', {
  method: 'POST',
  headers: {
    'X-HivePay-Signature': signature,
    'X-HivePay-Timestamp': timestamp,
    'Content-Type': 'application/json'
  },
  body
});
```

## Requirements

- Node.js 18.0.0 or later (for native fetch)
- TypeScript 5.6 or later (for development)
- [Secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts) for webhook verification (HTTPS or localhost)

## License

See [LICENSE.md](LICENSE.md) for details.

## Links

- [HivePay Website](https://hivepay.me)
- [Support](https://hivepay.me/support)
- [Merchants' Dashboard](https://dashboard.hivepay.me)
- [API Documentation](https://docs.hivepay.me)
- [npm Package](https://www.npmjs.com/package/@hivepay/client)
