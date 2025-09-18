/**
 * Storage Service for Workspace Database
 * 
 * Provides storage functionality for the main workspace database.
 * Used by components that need storage access outside of WorkspaceContext
 * but want to store data in the same database as the main app.
 */

import { createIndexedDBStorage } from './IndexedDBStorageAdapter';
import { ResourceMetadata, ResourceContent } from '../../types/context';

class StorageService {
  private storageAdapter: ReturnType<typeof createIndexedDBStorage> | null = null;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    if (this.storageAdapter) {
      return;
    }

    console.log('🔧 Initializing storage service for workspace...');
    this.storageAdapter = createIndexedDBStorage('bt-studio-workspace');
    await this.storageAdapter.initialize();
    console.log('✅ Storage service initialized for workspace');
  }

  async saveResourceMetadata(metadata: ResourceMetadata): Promise<void> {
    await this.initialize();
    if (!this.storageAdapter) {
      throw new Error('Storage adapter not initialized');
    }
    return this.storageAdapter.saveResourceMetadata(metadata);
  }

  async saveResourceContent(content: ResourceContent): Promise<void> {
    await this.initialize();
    if (!this.storageAdapter) {
      throw new Error('Storage adapter not initialized');
    }
    return this.storageAdapter.saveResourceContent(content);
  }

  async getExistingResourceKeys(): Promise<string[]> {
    await this.initialize();
    if (!this.storageAdapter) {
      throw new Error('Storage adapter not initialized');
    }
    return this.storageAdapter.getAllResourceKeys();
  }

  async getExistingContentKeys(): Promise<string[]> {
    await this.initialize();
    if (!this.storageAdapter) {
      throw new Error('Storage adapter not initialized');
    }
    return this.storageAdapter.getAllContentKeys();
  }

  async getExistingMetadataWithVersions(): Promise<Map<string, {version: string, lastUpdated: Date}>> {
    await this.initialize();
    if (!this.storageAdapter) {
      throw new Error('Storage adapter not initialized');
    }
    return this.storageAdapter.getMetadataVersions();
  }

  async getResourceMetadata(resourceKey: string): Promise<ResourceMetadata | null> {
    await this.initialize();
    if (!this.storageAdapter) {
      throw new Error('Storage adapter not initialized');
    }
    return this.storageAdapter.getResourceMetadata(resourceKey);
  }

  async getResourceContent(resourceKey: string, bookCode?: string, articleId?: string): Promise<ResourceContent | null> {
    await this.initialize();
    if (!this.storageAdapter) {
      throw new Error('Storage adapter not initialized');
    }
    return this.storageAdapter.getResourceContent(resourceKey, bookCode, articleId);
  }

  async listResourceMetadata(): Promise<ResourceMetadata[]> {
    await this.initialize();
    if (!this.storageAdapter) {
      throw new Error('Storage adapter not initialized');
    }
    return this.storageAdapter.listResourceMetadata();
  }

  async deleteResource(resourceKey: string): Promise<void> {
    await this.initialize();
    if (!this.storageAdapter) {
      throw new Error('Storage adapter not initialized');
    }
    return this.storageAdapter.deleteResource(resourceKey);
  }

  async clearAllData(): Promise<void> {
    await this.initialize();
    if (!this.storageAdapter) {
      throw new Error('Storage adapter not initialized');
    }
    return this.storageAdapter.clearAllData();
  }

  async getStorageInfo(): Promise<any> {
    await this.initialize();
    if (!this.storageAdapter) {
      throw new Error('Storage adapter not initialized');
    }
    return this.storageAdapter.getStorageInfo();
  }
}

// Singleton instance
const storageService = new StorageService();

export { storageService };
export type { ResourceMetadata, ResourceContent };
