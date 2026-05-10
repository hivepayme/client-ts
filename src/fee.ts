/**
 * HivePay Formatting Utilities
 * @module @hivepay/client
 */

const PRECISION = 1000;

/**
 * Formats a satoshi amount string to a human-readable decimal string.
 *
 * @param satoshis - Amount in satoshis as a string (e.g., "10500")
 * @param precision - Number of decimal places (default: 3)
 * @returns Formatted amount string (e.g., "10.500")
 *
 * @example
 * ```ts
 * import { formatSatoshis } from '@hivepay/client';
 *
 * formatSatoshis("10500");     // "10.500"
 * formatSatoshis("150");       // "0.150"
 * formatSatoshis("1");         // "0.001"
 * ```
 */
export const formatSatoshis = (satoshis: string, precision: number = 3): string => {
  const num = Number(satoshis);
  if (isNaN(num)) return '0.000';
  return (num / PRECISION).toFixed(precision);
};
