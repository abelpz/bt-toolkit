import { PersistenceStorageAdapter } from '../core/types';

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

// Default export for React Native
export default AsyncStorageAdapter; 