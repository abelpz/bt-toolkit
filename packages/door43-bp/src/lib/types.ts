/**
 * Door43 Repository Types
 */

export interface Door43Repository {
  name: string;
  owner: {
    login: string;
    full_name: string;
  };
  full_name: string;
  description: string;
  subject: string;
  language: string;
  stage: string;
  updated_at: string;
  url: string;
  git_url: string;
  clone_url: string;
  default_branch?: string;
  branch_or_tag_name?: string; // From catalog API
}

export interface ResourceManifest {
  projects: Array<{
    identifier: string;
    title: string;
    path: string;
  }>;
}

export interface CacheStats {
  repositories: number;
  manifests: number;
  bookPackages: number;
  onDemandResources: number;
}

export interface BookPackageServiceOptions {
  /** Base URL for Door43 API */
  baseUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Custom fetch function (for testing) */
  fetchFn?: typeof fetch;
}

export interface FetchResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  source?: string;
}
