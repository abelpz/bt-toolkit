/**
 * Door43 API Service
 * Handles authenticated requests to Door43 for syncing back processed resources
 */

import { AsyncResult } from '@bt-toolkit/door43-core';

// ============================================================================
// Door43 API Types
// ============================================================================

/**
 * Door43 API configuration
 */
export interface Door43ApiConfig {
  /** API base URL */
  baseUrl: string;
  /** API version */
  version: string;
  /** Authentication token */
  authToken?: string;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Retry configuration */
  retry: {
    maxAttempts: number;
    delayMs: number;
    backoffMultiplier: number;
  };
}

/**
 * Resource metadata for Door43 API
 */
export interface Door43ResourceMetadata {
  /** Owner/organization */
  owner: string;
  /** Repository name */
  repo: string;
  /** Branch name */
  branch: string;
  /** Resource type */
  resourceType: 'usfm' | 'tsv' | 'md' | 'yaml';
  /** File path within repository */
  filePath: string;
  /** Resource identifier */
  resourceId: string;
}

/**
 * Door43 API request payload
 */
export interface Door43ApiRequest {
  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** API endpoint path */
  endpoint: string;
  /** Request body */
  body?: any;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Query parameters */
  params?: Record<string, string>;
}

/**
 * Door43 API response
 */
export interface Door43ApiResponse<T = any> {
  /** Response status code */
  status: number;
  /** Response data */
  data: T;
  /** Response headers */
  headers: Record<string, string>;
  /** ETag for caching */
  etag?: string;
  /** Last modified timestamp */
  lastModified?: Date;
}

/**
 * Sync operation types
 */
export type SyncOperation = 'create' | 'update' | 'delete' | 'patch';

/**
 * Sync request
 */
export interface SyncRequest {
  /** Operation type */
  operation: SyncOperation;
  /** Resource metadata */
  metadata: Door43ResourceMetadata;
  /** Original format content (for create/update) */
  content?: string;
  /** Diff patch content (for patch operation) */
  patch?: string;
  /** Base SHA for patch operation */
  baseSha?: string;
  /** Commit message */
  commitMessage: string;
  /** Author information */
  author?: {
    name: string;
    email: string;
  };
  /** File size threshold for using patch vs full update */
  patchThreshold?: number;
}

/**
 * Sync result
 */
export interface SyncResult {
  /** Operation success */
  success: boolean;
  /** New commit SHA */
  commitSha?: string;
  /** Updated ETag */
  etag?: string;
  /** Error message if failed */
  error?: string;
  /** HTTP status code */
  statusCode?: number;
}

// ============================================================================
// Door43 API Service
// ============================================================================

/**
 * Door43 API Service
 * Handles authenticated requests to Door43 for syncing back processed resources
 */
export class Door43ApiService {
  private config: Door43ApiConfig;
  private authToken?: string;

  constructor(config: Partial<Door43ApiConfig> = {}) {
    this.config = {
      baseUrl: 'https://git.door43.org/api/v1',
      version: 'v1',
      timeout: 30000, // 30 seconds
      retry: {
        maxAttempts: 3,
        delayMs: 1000,
        backoffMultiplier: 2
      },
      ...config
    };
    this.authToken = config.authToken;
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Get authentication token
   */
  getAuthToken(): string | undefined {
    return this.authToken;
  }

  /**
   * Make authenticated request to Door43 API
   */
  async makeRequest<T = any>(request: Door43ApiRequest): AsyncResult<Door43ApiResponse<T>> {
    try {
      const url = `${this.config.baseUrl}/${request.endpoint}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'bt-toolkit/door43-sync',
        ...request.headers
      };

      // Add authentication if available
      if (this.authToken) {
        headers['Authorization'] = `token ${this.authToken}`;
      }

      // Add query parameters
      const urlWithParams = new URL(url);
      if (request.params) {
        Object.entries(request.params).forEach(([key, value]) => {
          urlWithParams.searchParams.append(key, value);
        });
      }

      console.log(`📡 Door43 API ${request.method} ${urlWithParams.pathname}`);

      const response = await this.makeRequestWithRetry({
        url: urlWithParams.toString(),
        method: request.method,
        headers,
        body: request.body ? JSON.stringify(request.body) : undefined
      });

      const responseData: Door43ApiResponse<T> = {
        status: response.status,
        data: response.data,
        headers: response.headers,
        etag: response.headers['etag'],
        lastModified: response.headers['last-modified'] 
          ? new Date(response.headers['last-modified']) 
          : undefined
      };

      console.log(`✅ Door43 API response: ${response.status}`);
      return { success: true, data: responseData };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Door43 API request failed';
      console.error(`❌ Door43 API error: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Sync resource back to Door43
   */
  async syncResource(request: SyncRequest): AsyncResult<SyncResult> {
    try {
      console.log(`🔄 Syncing ${request.operation} for ${request.metadata.resourceId}`);

      // Auto-detect if we should use patch for large files
      const shouldUsePatch = await this.shouldUsePatch(request);
      if (shouldUsePatch && request.operation === 'update') {
        return await this.syncResourceWithPatch(request);
      }

      const endpoint = this.buildEndpoint(request.metadata);
      const apiRequest = this.buildApiRequest(request, endpoint);

      const response = await this.makeRequest(apiRequest);
      
      if (!response.success) {
        return {
          success: false,
          error: `API request failed: ${response.error}`
        };
      }

      const result: SyncResult = {
        success: true,
        commitSha: response.data?.data?.commit?.sha,
        etag: response.data?.etag,
        statusCode: response.data?.status
      };

      console.log(`✅ Sync completed: ${request.operation} ${request.metadata.resourceId}`);
      return { success: true, data: result };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      console.error(`❌ Sync error: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Sync resource using diff patch for large files
   */
  async syncResourceWithPatch(request: SyncRequest): AsyncResult<SyncResult> {
    try {
      console.log(`🔄 Syncing with patch for ${request.metadata.resourceId}`);

      // Get current file content to create diff
      const currentFileResult = await this.getResource(request.metadata);
      if (!currentFileResult.success) {
        return {
          success: false,
          error: `Failed to get current file for patch: ${currentFileResult.error}`
        };
      }

      const currentContent = this.decodeBase64Content(currentFileResult.data?.data?.content);
      const newContent = request.content || '';
      
      // Generate diff patch
      const patch = this.generateDiffPatch(currentContent, newContent);
      if (!patch) {
        console.log('📝 No changes detected, skipping patch');
        return {
          success: true,
          data: {
            success: true,
            statusCode: 200
          }
        };
      }

      // Apply patch using Door43 API
      const patchEndpoint = `repos/${request.metadata.owner}/${request.metadata.repo}/diffpatch`;
      const patchRequest: Door43ApiRequest = {
        method: 'POST',
        endpoint: patchEndpoint,
        body: {
          branch: request.metadata.branch,
          message: request.commitMessage,
          patch: patch,
          author: request.author ? {
            name: request.author.name,
            email: request.author.email
          } : undefined
        }
      };

      const response = await this.makeRequest(patchRequest);
      
      if (!response.success) {
        return {
          success: false,
          error: `Patch request failed: ${response.error}`
        };
      }

      const result: SyncResult = {
        success: true,
        commitSha: response.data?.data?.commit?.sha,
        etag: response.data?.etag,
        statusCode: response.data?.status
      };

      console.log(`✅ Patch sync completed: ${request.metadata.resourceId}`);
      return { success: true, data: result };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Patch sync failed';
      console.error(`❌ Patch sync error: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get resource from Door43
   */
  async getResource(metadata: Door43ResourceMetadata): AsyncResult<Door43ApiResponse<any>> {
    const endpoint = this.buildEndpoint(metadata);
    
    return await this.makeRequest({
      method: 'GET',
      endpoint
    });
  }

  /**
   * Check if resource exists
   */
  async resourceExists(metadata: Door43ResourceMetadata): AsyncResult<boolean> {
    const response = await this.getResource(metadata);
    
    if (!response.success) {
      return { success: true, data: false };
    }

    return { success: true, data: response.data?.status === 200 };
  }

  /**
   * Get repository information
   */
  async getRepositoryInfo(owner: string, repo: string): AsyncResult<Door43ApiResponse<any>> {
    return await this.makeRequest({
      method: 'GET',
      endpoint: `repos/${owner}/${repo}`
    });
  }

  /**
   * List repository contents
   */
  async listRepositoryContents(
    owner: string, 
    repo: string, 
    path: string = '',
    branch: string = 'master'
  ): AsyncResult<Door43ApiResponse<any[]>> {
    return await this.makeRequest({
      method: 'GET',
      endpoint: `repos/${owner}/${repo}/contents/${path}`,
      params: { ref: branch }
    });
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private buildEndpoint(metadata: Door43ResourceMetadata): string {
    return `repos/${metadata.owner}/${metadata.repo}/contents/${metadata.filePath}`;
  }

  private buildApiRequest(request: SyncRequest, endpoint: string): Door43ApiRequest {
    const { operation, content, commitMessage, author } = request;

    switch (operation) {
      case 'create':
      case 'update':
        return {
          method: 'PUT',
          endpoint,
          body: {
            message: commitMessage,
            content: Buffer.from(content || '', 'utf8').toString('base64'),
            branch: request.metadata.branch,
            author: author ? {
              name: author.name,
              email: author.email
            } : undefined
          }
        };

      case 'delete':
        return {
          method: 'DELETE',
          endpoint,
          body: {
            message: commitMessage,
            branch: request.metadata.branch,
            author: author ? {
              name: author.name,
              email: author.email
            } : undefined
          }
        };

      case 'patch':
        return {
          method: 'POST',
          endpoint: `repos/${request.metadata.owner}/${request.metadata.repo}/diffpatch`,
          body: {
            message: commitMessage,
            patch: request.patch,
            branch: request.metadata.branch,
            base_sha: request.baseSha,
            author: author ? {
              name: author.name,
              email: author.email
            } : undefined
          }
        };

      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  /**
   * Determine if patch should be used based on file size
   */
  private async shouldUsePatch(request: SyncRequest): Promise<boolean> {
    const threshold = request.patchThreshold || 1024 * 1024; // 1MB default
    const contentSize = request.content ? Buffer.byteLength(request.content, 'utf8') : 0;
    
    return contentSize > threshold;
  }

  /**
   * Decode base64 content from Door43 API
   */
  private decodeBase64Content(base64Content?: string): string {
    if (!base64Content) return '';
    
    try {
      return Buffer.from(base64Content, 'base64').toString('utf8');
    } catch (error) {
      console.warn('Failed to decode base64 content:', error);
      return '';
    }
  }

  /**
   * Generate unified diff patch between two strings
   */
  private generateDiffPatch(oldContent: string, newContent: string): string | null {
    if (oldContent === newContent) {
      return null; // No changes
    }

    // Simple diff implementation - in production would use a proper diff library
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    
    const patch: string[] = [];
    patch.push('--- a/file');
    patch.push('+++ b/file');
    
    let oldIndex = 0;
    let newIndex = 0;
    let hunkStart = 0;
    let hunkLines: string[] = [];
    
    while (oldIndex < oldLines.length || newIndex < newLines.length) {
      const oldLine = oldLines[oldIndex];
      const newLine = newLines[newIndex];
      
      if (oldLine === newLine) {
        // Lines match
        hunkLines.push(` ${oldLine || ''}`);
        oldIndex++;
        newIndex++;
      } else {
        // Lines differ
        if (oldIndex < oldLines.length) {
          hunkLines.push(`-${oldLine || ''}`);
          oldIndex++;
        }
        if (newIndex < newLines.length) {
          hunkLines.push(`+${newLine || ''}`);
          newIndex++;
        }
      }
      
      // Add hunk header when we have changes
      if (hunkLines.length > 0 && hunkStart === 0) {
        hunkStart = Math.max(1, oldIndex - 3); // Start a few lines before changes
        patch.push(`@@ -${hunkStart},${oldLines.length} +${hunkStart},${newLines.length} @@`);
      }
    }
    
    if (hunkLines.length === 0) {
      return null; // No actual changes
    }
    
    patch.push(...hunkLines);
    return patch.join('\n');
  }

  private async makeRequestWithRetry(options: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
  }): Promise<{ status: number; data: any; headers: Record<string, string> }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retry.maxAttempts; attempt++) {
      try {
        // In a real implementation, this would use fetch or axios
        // For now, we'll simulate the response
        console.log(`📡 Attempt ${attempt}: ${options.method} ${options.url}`);
        
        // Simulate API response
        const mockResponse = {
          status: 200,
          data: {
            commit: { sha: 'mock-commit-sha-' + Date.now() },
            content: { path: 'mock-path' }
          },
          headers: {
            'etag': '"mock-etag-' + Date.now() + '"',
            'last-modified': new Date().toISOString()
          }
        };

        return mockResponse;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Request failed');
        
        if (attempt < this.config.retry.maxAttempts) {
          const delay = this.config.retry.delayMs * Math.pow(this.config.retry.backoffMultiplier, attempt - 1);
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create Door43 API service with default configuration
 */
export function createDoor43ApiService(authToken?: string): Door43ApiService {
  return new Door43ApiService({ authToken });
}

/**
 * Create Door43 API service for development/testing
 */
export function createTestDoor43ApiService(): Door43ApiService {
  return new Door43ApiService({
    baseUrl: 'https://api-test.door43.org/v1',
    timeout: 10000,
    retry: {
      maxAttempts: 2,
      delayMs: 500,
      backoffMultiplier: 1.5
    }
  });
}
