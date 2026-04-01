/**
 * HivePay Error Classes
 * Custom error types for easy error handling and detection.
 * @module @hivepay/client
 */

import type { ApiErrorResponse, HivePayErrorCode } from './types/index.js';

/**
 * Base error class for all HivePay API errors.
 * Extends native Error and includes additional context.
 *
 * @example
 * ```ts
 * try {
 *   await hivepay.payments.get('invalid-id');
 * } catch (error) {
 *   if (error instanceof HivePayError) {
 *     console.log(error.code); // 'NOT_FOUND_ERROR'
 *     console.log(error.statusCode); // 404
 *   }
 * }
 * ```
 */
export class HivePayError extends Error {
  /** Error code for programmatic error handling */
  public readonly code: HivePayErrorCode;
  /** HTTP status code if available */
  public readonly statusCode?: number;
  /** Original error response from the API */
  public readonly response?: ApiErrorResponse;

  public constructor (
    message: string,
    code: HivePayErrorCode,
    statusCode?: number,
    response?: ApiErrorResponse
  ) {
    super(message);
    this.name = 'HivePayError';
    this.code = code;
    this.statusCode = statusCode;
    this.response = response;

    // Maintains proper stack trace for where error was thrown (only in V8)
    const errorCtor = Error as { captureStackTrace?: (target: object, ctor: Function) => void };
    if (errorCtor.captureStackTrace)
      errorCtor.captureStackTrace(this, HivePayError);
  }

  /**
   * Creates a HivePayError from an API error response.
   */
  public static fromApiResponse (response: ApiErrorResponse): HivePayError {
    const code = HivePayError.statusToCode(response.statusCode);
    return new HivePayError(
      response.statusMessage,
      code,
      response.statusCode,
      response
    );
  }

  /**
   * Creates a HivePayError from a network error.
   */
  public static fromNetworkError (error: unknown): HivePayError {
    const message = error instanceof Error
      ? error.message
      : 'Network request failed';
    return new HivePayError(message, 'NETWORK_ERROR');
  }

  /**
   * Maps HTTP status codes to error codes.
   */
  private static statusToCode (statusCode: number): HivePayErrorCode {
    if (statusCode === 400)
      return 'VALIDATION_ERROR';
    if (statusCode === 401)
      return 'AUTHENTICATION_ERROR';
    if (statusCode === 403)
      return 'FORBIDDEN_ERROR';
    if (statusCode === 404)
      return 'NOT_FOUND_ERROR';
    if (statusCode === 429)
      return 'RATE_LIMIT_ERROR';
    if (statusCode >= 500)
      return 'SERVER_ERROR';
    return 'API_ERROR';
  }

  /**
   * Check if error is a specific type.
   */
  public is (code: HivePayErrorCode): boolean {
    return this.code === code;
  }

  /**
   * Check if error is an authentication error.
   */
  public isAuthError (): boolean {
    return this.code === 'AUTHENTICATION_ERROR';
  }

  /**
   * Check if error is a not found error.
   */
  public isNotFound (): boolean {
    return this.code === 'NOT_FOUND_ERROR';
  }

  /**
   * Check if error is a validation error.
   */
  public isValidation (): boolean {
    return this.code === 'VALIDATION_ERROR';
  }

  /**
   * Check if error is a rate limit error.
   */
  public isRateLimited (): boolean {
    return this.code === 'RATE_LIMIT_ERROR';
  }
}

/**
 * Type guard to check if an error is a HivePayError.
 *
 * @example
 * ```ts
 * try {
 *   await hivepay.payments.get('id');
 * } catch (error) {
 *   if (isHivePayError(error)) {
 *     // TypeScript knows error is HivePayError here
 *     console.log(error.code);
 *   }
 * }
 * ```
 */
export function isHivePayError (error: unknown): error is HivePayError {
  return error instanceof HivePayError;
}
