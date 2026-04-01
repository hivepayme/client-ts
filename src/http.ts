/**
 * HivePay HTTP Client
 * Low-level HTTP client for making API requests.
 * @internal
 * @module @hivepay/client
 */

import { HivePayError } from './errors.js';
import type { ApiErrorResponse } from './types/index.js';

/**
 * HTTP methods supported by the client.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * Configuration for HTTP requests.
 */
export interface HttpRequestConfig {
  /** HTTP method */
  method: HttpMethod;
  /** Request path (relative to base URL) */
  path: string;
  /** Query parameters */
  params?: Record<string, string | number | boolean | undefined>;
  /** Request body (will be JSON stringified) */
  body?: unknown;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Configuration for the HTTP client.
 */
export interface HttpClientConfig {
  /** Base URL for API requests */
  baseUrl: string;
  /** API key for authentication */
  apiKey?: string;
  /** Default timeout in milliseconds */
  timeout?: number;
}

/**
 * Low-level HTTP client for making API requests.
 * This is the only class that directly uses fetch.
 * @internal
 */
export class HttpClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly timeout: number;

  public constructor (config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 30000;
  }

  /**
   * Creates a new HttpClient with a different API key.
   */
  public withApiKey (apiKey: string): HttpClient {
    return new HttpClient({
      baseUrl: this.baseUrl,
      apiKey,
      timeout: this.timeout
    });
  }

  /**
   * Makes an HTTP request to the API.
   * This is the single point of contact with fetch.
   *
   * @throws {HivePayError} On network errors or API errors
   */
  public async request<T> (config: HttpRequestConfig): Promise<T> {
    const url = this.buildUrl(config.path, config.params);
    const headers = this.buildHeaders(config.headers);
    const timeout = config.timeout ?? this.timeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: config.method,
        headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok)
        await this.handleErrorResponse(response);

      // Handle empty responses
      const text = await response.text();
      if (!text)
        return undefined as T;

      return JSON.parse(text) as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof HivePayError)
        throw error;

      if (error instanceof Error && error.name === 'AbortError') {
        throw new HivePayError(
          `Request timed out after ${timeout}ms`,
          'NETWORK_ERROR'
        );
      }

      throw HivePayError.fromNetworkError(error);
    }
  }

  /**
   * Convenience method for GET requests.
   */
  public async get<T> (
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    return this.request<T>({ method: 'GET', path, params });
  }

  /**
   * Convenience method for POST requests.
   */
  public async post<T> (path: string, body?: unknown): Promise<T> {
    return this.request<T>({ method: 'POST', path, body });
  }

  /**
   * Builds the full URL with query parameters.
   */
  private buildUrl (
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): string {
    const url = new URL(path, this.baseUrl);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined)
          url.searchParams.set(key, String(value));
      }
    }

    return url.toString();
  }

  /**
   * Builds request headers including authentication.
   */
  private buildHeaders (additional?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...additional
    };

    if (this.apiKey)
      headers['X-API-Key'] = this.apiKey;

    return headers;
  }

  /**
   * Handles error responses from the API.
   */
  private async handleErrorResponse (response: Response): Promise<never> {
    let errorBody: ApiErrorResponse;

    try {
      const text = await response.text();
      errorBody = text ? JSON.parse(text) : {
        statusCode: response.status,
        statusMessage: response.statusText || 'Unknown error'
      };
    } catch {
      errorBody = {
        statusCode: response.status,
        statusMessage: response.statusText || 'Unknown error'
      };
    }

    throw HivePayError.fromApiResponse(errorBody);
  }
}
