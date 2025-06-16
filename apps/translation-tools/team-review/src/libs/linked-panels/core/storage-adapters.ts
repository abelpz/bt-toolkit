import { PersistenceStorageAdapter } from './types';

/**
 * localStorage adapter for web environments
 */
export class LocalStorageAdapter implements PersistenceStorageAdapter {
  isAvailable(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      // Test if localStorage is actually available (it might be disabled)
      const testKey = '__linkedpanels_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('LocalStorageAdapter: Failed to get item', error);
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn('LocalStorageAdapter: Failed to set item', error);
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('LocalStorageAdapter: Failed to remove item', error);
    }
  }
}

/**
 * sessionStorage adapter for web environments
 */
export class SessionStorageAdapter implements PersistenceStorageAdapter {
  isAvailable(): boolean {
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) {
        return false;
      }
      // Test if sessionStorage is actually available
      const testKey = '__linkedpanels_test__';
      sessionStorage.setItem(testKey, 'test');
      sessionStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  getItem(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      console.warn('SessionStorageAdapter: Failed to get item', error);
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value);
    } catch (error) {
      console.warn('SessionStorageAdapter: Failed to set item', error);
    }
  }

  removeItem(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn('SessionStorageAdapter: Failed to remove item', error);
    }
  }
}

/**
 * In-memory storage adapter (data is lost on page refresh)
 * Useful for testing or when persistence is not needed
 */
export class MemoryStorageAdapter implements PersistenceStorageAdapter {
  private storage = new Map<string, string>();

  isAvailable(): boolean {
    return true;
  }

  getItem(key: string): string | null {
    return this.storage.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.storage.set(key, value);
  }

  removeItem(key: string): void {
    this.storage.delete(key);
  }

  /** Clear all stored data (useful for testing) */
  clear(): void {
    this.storage.clear();
  }
}

/**
 * Async storage adapter for React Native AsyncStorage or similar
 */
export class AsyncStorageAdapter implements PersistenceStorageAdapter {
  constructor(private asyncStorage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  }) {}

  async isAvailable(): Promise<boolean> {
    try {
      const testKey = '__linkedpanels_test__';
      await this.asyncStorage.setItem(testKey, 'test');
      await this.asyncStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      return await this.asyncStorage.getItem(key);
    } catch (error) {
      console.warn('AsyncStorageAdapter: Failed to get item', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await this.asyncStorage.setItem(key, value);
    } catch (error) {
      console.warn('AsyncStorageAdapter: Failed to set item', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await this.asyncStorage.removeItem(key);
    } catch (error) {
      console.warn('AsyncStorageAdapter: Failed to remove item', error);
    }
  }
}

/**
 * IndexedDB adapter for more robust browser storage
 */
export class IndexedDBAdapter implements PersistenceStorageAdapter {
  private dbName: string;
  private storeName: string;
  private version: number;
  private db: IDBDatabase | null = null;

  constructor(options: {
    dbName?: string;
    storeName?: string;
    version?: number;
  } = {}) {
    this.dbName = options.dbName || 'LinkedPanelsDB';
    this.storeName = options.storeName || 'panelStates';
    this.version = options.version || 1;
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return false;
      }
      // Try to open the database to test availability
      await this.ensureDB();
      return true;
    } catch {
      return false;
    }
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          resolve(request.result || null);
        };
      });
    } catch (error) {
      console.warn('IndexedDBAdapter: Failed to get item', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(value, key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.warn('IndexedDBAdapter: Failed to set item', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.warn('IndexedDBAdapter: Failed to remove item', error);
    }
  }
}

/**
 * Custom HTTP API adapter for server-side storage
 */
export class HTTPStorageAdapter implements PersistenceStorageAdapter {
  constructor(private options: {
    baseUrl: string;
    headers?: Record<string, string>;
    timeout?: number;
  }) {}

  async isAvailable(): Promise<boolean> {
    try {
      // Ping the server to check availability
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
      const response = await fetch(`${this.options.baseUrl}/state/${encodeURIComponent(key)}`, {
        method: 'GET',
        headers: this.options.headers,
        signal: AbortSignal.timeout(this.options.timeout || 10000),
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      console.warn('HTTPStorageAdapter: Failed to get item', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      const response = await fetch(`${this.options.baseUrl}/state/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...this.options.headers,
        },
        body: value,
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
      const response = await fetch(`${this.options.baseUrl}/state/${encodeURIComponent(key)}`, {
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

/**
 * Factory function to create appropriate storage adapter based on environment
 */
export function createDefaultStorageAdapter(): PersistenceStorageAdapter {
  // Try localStorage first
  const localStorageAdapter = new LocalStorageAdapter();
  if (localStorageAdapter.isAvailable()) {
    return localStorageAdapter;
  }

  // Fallback to sessionStorage
  const sessionStorageAdapter = new SessionStorageAdapter();
  if (sessionStorageAdapter.isAvailable()) {
    console.warn('LinkedPanels: localStorage not available, using sessionStorage');
    return sessionStorageAdapter;
  }

  // Final fallback to memory storage
  console.warn('LinkedPanels: No persistent storage available, using memory storage');
  return new MemoryStorageAdapter();
} 