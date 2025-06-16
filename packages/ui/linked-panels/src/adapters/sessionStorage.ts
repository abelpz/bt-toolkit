import { PersistenceStorageAdapter } from '../core/types';

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