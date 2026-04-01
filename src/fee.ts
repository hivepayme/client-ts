/**
 * HivePay Fee Calculation Utilities
 * Client-side fee calculations that match server-side logic.
 * @module @hivepay/client
 */

const FEE_MULTIPLIER = 100;
const PRECISION = 1000;

/**
 * Fee split result with amounts in satoshis (smallest unit).
 */
export interface SplitAmount {
  /** Net amount the merchant receives (in satoshis) */
  netAmount: bigint;
  /** Fee amount charged (in satoshis) */
  feeAmount: bigint;
  /** Total amount (net + fee, in satoshis) */
  totalAmount: bigint;
}

/**
 * Fee split result with formatted string amounts.
 */
export interface FormattedSplitAmount {
  /** Net amount the merchant receives (formatted string) */
  net: string;
  /** Fee amount charged (formatted string) */
  fee: string;
  /** Total amount (formatted string) */
  total: string;
}

/**
 * Calculates fee split from an amount in satoshis.
 * Uses bigint arithmetic to match server-side precision.
 *
 * @param amountSatoshis - Amount in smallest unit (satoshis)
 * @param percentFee - Fee percentage (e.g., 1.5 for 1.5%)
 * @returns Split amounts in satoshis
 *
 * @example
 * ```ts
 * import { getSplitAmount } from '@hivepay/client';
 *
 * const split = getSplitAmount(10500n, 1.5);
 * console.log(split.feeAmount);  // 157n (0.157 HBD)
 * console.log(split.netAmount);  // 10343n (10.343 HBD)
 * ```
 */
export const getSplitAmount = (amountSatoshis: bigint, percentFee: number): SplitAmount => {
  const feeValue = BigInt(Math.round(percentFee * FEE_MULTIPLIER));
  let feeAmount = (amountSatoshis * feeValue) / BigInt(100 * FEE_MULTIPLIER);
  const netAmount = amountSatoshis - feeAmount;

  if (feeAmount === 0n)
    feeAmount = 1n;

  return {
    netAmount,
    feeAmount,
    totalAmount: feeAmount + netAmount
  };
};

/**
 * Calculates fee split from a formatted amount (e.g., 10.5 HBD).
 * Converts to satoshis internally for precision.
 *
 * @param amount - Amount as a number (e.g., 10.5)
 * @param percentFee - Fee percentage (e.g., 1.5 for 1.5%)
 * @returns Split amounts as formatted strings with 3 decimal places
 *
 * @example
 * ```ts
 * import { getSplitAmountFromFormatted } from '@hivepay/client';
 *
 * const split = getSplitAmountFromFormatted(10.5, 1.5);
 * console.log(split.fee);  // "0.157"
 * console.log(split.net);  // "10.343"
 * ```
 */
export const getSplitAmountFromFormatted = (amount: number, percentFee: number): FormattedSplitAmount => {
  const amountSatoshis = BigInt(Math.round(amount * PRECISION));
  const split = getSplitAmount(amountSatoshis, percentFee);

  return {
    net: (Number(split.netAmount) / PRECISION).toFixed(3),
    fee: (Number(split.feeAmount) / PRECISION).toFixed(3),
    total: (Number(split.totalAmount) / PRECISION).toFixed(3)
  };
};

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
