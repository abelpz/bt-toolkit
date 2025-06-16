import { PersistenceStorageAdapter } from '../core/types';

/**
 * HTTP adapter for server-side storage via REST API
 */
export class HTTPStorageAdapter implements PersistenceStorageAdapter {
  constructor(private options: {
    baseUrl: string;
    headers?: Record<string, string>;
    timeout?: number;
  }) {}

  async isAvailable(): Promise<boolean> {
    try {
      // Test connectivity by making a simple request
      const response = await fetch(`${this.options.baseUrl}/health`, {
        method: 'GET',
        headers: this.options.headers,
        signal: AbortSignal.timeout(this.options.timeout || 5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.options.baseUrl}/storage/${encodeURIComponent(key)}`, {
        method: 'GET',
        headers: {
          ...this.options.headers,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.options.timeout || 10000),
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.value || null;
    } catch (error) {
      console.warn('HTTPStorageAdapter: Failed to get item', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      const response = await fetch(`${this.options.baseUrl}/storage/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: {
          ...this.options.headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value }),
        signal: AbortSignal.timeout(this.options.timeout || 10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.warn('HTTPStorageAdapter: Failed to set item', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      const response = await fetch(`${this.options.baseUrl}/storage/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        headers: this.options.headers,
        signal: AbortSignal.timeout(this.options.timeout || 10000),
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.warn('HTTPStorageAdapter: Failed to remove item', error);
    }
  }
} 