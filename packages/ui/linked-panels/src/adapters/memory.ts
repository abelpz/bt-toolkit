import { PersistenceStorageAdapter } from '../core/types';

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