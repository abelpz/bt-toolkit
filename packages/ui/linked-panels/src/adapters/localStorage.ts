import { PersistenceStorageAdapter } from '../core/types';

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