/**
 * HivePay Webhook Utilities
 * Internal module for webhook signature verification.
 * @internal
 * @module @hivepay/client
 */

import { toWebhookEvent } from './transformers.js';
import type { ApiWebhookPayload, VerifyWebhookOptions, VerifyWebhookResult } from './types/index.js';

/**
 * Converts a hex string to Uint8Array.
 */
function hexToBytes (hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2)
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);

  return bytes;
}

/**
 * Converts Uint8Array to hex string.
 */
function bytesToHex (bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Computes HMAC-SHA256 signature using Web Crypto API.
 */
async function computeHmacSha256 (key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return bytesToHex(new Uint8Array(signature));
}

/**
 * Performs constant-time comparison of two strings.
 */
function timingSafeEqual (a: string, b: string): boolean {
  if (a.length !== b.length)
    return false;

  const aBytes = hexToBytes(a);
  const bBytes = hexToBytes(b);

  let result = 0;
  for (let i = 0; i < aBytes.length; i++)
    result |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);

  return result === 0;
}

/**
 * Verifies a webhook signature and parses the event.
 * @internal
 */
export async function verifyWebhookInternal (
  apiKey: string,
  options: VerifyWebhookOptions
): Promise<VerifyWebhookResult> {
  const { payload, signature, timestamp, maxAge = 300000 } = options;

  // Check if crypto.subtle is available
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return {
      valid: false,
      error: 'Web Crypto API not available. Ensure you are in a secure context (HTTPS or localhost). See: https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts'
    };
  }

  // Validate timestamp
  const timestampMs = parseInt(timestamp, 10);
  if (isNaN(timestampMs)) {
    return {
      valid: false,
      error: 'Invalid timestamp format'
    };
  }

  // Check webhook age to prevent replay attacks
  const age = Date.now() - timestampMs;
  if (age > maxAge) {
    return {
      valid: false,
      error: `Webhook too old (${Math.round(age / 1000)}s). Max age: ${Math.round(maxAge / 1000)}s`
    };
  }

  // Compute expected signature
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = await computeHmacSha256(apiKey, signedPayload);

  // Constant-time comparison to prevent timing attacks
  if (!timingSafeEqual(signature, expectedSignature)) {
    return {
      valid: false,
      error: 'Invalid signature'
    };
  }

  // Parse payload
  let parsedPayload: ApiWebhookPayload;
  try {
    parsedPayload = JSON.parse(payload) as ApiWebhookPayload;
  } catch {
    return {
      valid: false,
      error: 'Invalid JSON payload'
    };
  }

  return {
    valid: true,
    event: toWebhookEvent(parsedPayload, timestampMs)
  };
}

/**
 * Creates a webhook signature for testing purposes.
 * @internal
 */
export async function createWebhookSignatureInternal (
  apiKey: string,
  payload: unknown
): Promise<{ signature: string; timestamp: string; body: string }> {
  const timestamp = Date.now().toString();
  const body = JSON.stringify(payload);
  const signedPayload = `${timestamp}.${body}`;
  const signature = await computeHmacSha256(apiKey, signedPayload);

  return { signature, timestamp, body };
}
