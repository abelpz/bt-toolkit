/**
 * Storage Key Implementation
 * Hierarchical key structure: server/owner/language/resource/content
 */

import { StorageKey as IStorageKey } from './interfaces'

export class StorageKey implements IStorageKey {
  constructor(
    public readonly server: string,
    public readonly owner: string,
    public readonly language: string,
    public readonly resourceType: string,
    public readonly contentPath: string
  ) {
    this.validateKey()
  }

  static fromString(keyString: string): StorageKey {
    const parts = keyString.split('/')
    if (parts.length < 5) {
      throw new Error(`Invalid storage key format: ${keyString}. Expected: server/owner/language/resourceType/contentPath`)
    }
    
    return new StorageKey(
      parts[0],
      parts[1], 
      parts[2],
      parts[3],
      parts.slice(4).join('/') // contentPath may contain slashes
    )
  }

  static fromRequest(request: {
    server: string
    owner: string
    language: string
    resourceType: string
    contentPath: string
  }): StorageKey {
    return new StorageKey(
      request.server,
      request.owner,
      request.language,
      request.resourceType,
      request.contentPath
    )
  }

  toString(): string {
    return `${this.server}/${this.owner}/${this.language}/${this.resourceType}/${this.contentPath}`
  }

  // Get parent key (useful for hierarchical operations)
  getParentKey(): string {
    return `${this.server}/${this.owner}/${this.language}/${this.resourceType}`
  }

  // Get resource key (without content path)
  getResourceKey(): string {
    return `${this.server}/${this.owner}/${this.language}/${this.resourceType}`
  }

  // Get workspace key (owner/language level)
  getWorkspaceKey(): string {
    return `${this.server}/${this.owner}/${this.language}`
  }

  // Check if this key matches a pattern
  matchesPattern(pattern: {
    server?: string
    owner?: string
    language?: string
    resourceType?: string
    contentPath?: string
  }): boolean {
    if (pattern.server && !this.matchesWildcard(this.server, pattern.server)) {
      return false
    }
    if (pattern.owner && !this.matchesWildcard(this.owner, pattern.owner)) {
      return false
    }
    if (pattern.language && !this.matchesWildcard(this.language, pattern.language)) {
      return false
    }
    if (pattern.resourceType && !this.matchesWildcard(this.resourceType, pattern.resourceType)) {
      return false
    }
    if (pattern.contentPath && !this.matchesWildcard(this.contentPath, pattern.contentPath)) {
      return false
    }
    return true
  }

  private matchesWildcard(value: string, pattern: string): boolean {
    if (pattern === '*') return true
    if (!pattern.includes('*')) return value === pattern
    
    // Convert wildcard pattern to regex
    const regexPattern = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex chars
      .replace(/\\\*/g, '.*') // Convert * to .*
    
    return new RegExp(`^${regexPattern}$`).test(value)
  }

  private validateKey(): void {
    const invalidChars = /[<>:"|?*\x00-\x1f]/
    
    if (!this.server || invalidChars.test(this.server)) {
      throw new Error(`Invalid server in storage key: ${this.server}`)
    }
    if (!this.owner || invalidChars.test(this.owner)) {
      throw new Error(`Invalid owner in storage key: ${this.owner}`)
    }
    if (!this.language || invalidChars.test(this.language)) {
      throw new Error(`Invalid language in storage key: ${this.language}`)
    }
    if (!this.resourceType || invalidChars.test(this.resourceType)) {
      throw new Error(`Invalid resourceType in storage key: ${this.resourceType}`)
    }
    if (!this.contentPath || invalidChars.test(this.contentPath)) {
      throw new Error(`Invalid contentPath in storage key: ${this.contentPath}`)
    }
  }

  // Utility methods for common key patterns
  static forBook(server: string, owner: string, language: string, resourceType: string, bookCode: string): StorageKey {
    return new StorageKey(server, owner, language, resourceType, `books/${bookCode}`)
  }

  static forMetadata(server: string, owner: string, language: string, resourceType: string): StorageKey {
    return new StorageKey(server, owner, language, resourceType, '_metadata')
  }

  static forArticle(server: string, owner: string, language: string, resourceType: string, category: string, articleId: string): StorageKey {
    return new StorageKey(server, owner, language, resourceType, `${category}/${articleId}`)
  }

  static forWord(server: string, owner: string, language: string, resourceType: string, wordId: string): StorageKey {
    return new StorageKey(server, owner, language, resourceType, `words/${wordId}`)
  }

  // Check if this is a specific content type
  isBookContent(): boolean {
    return this.contentPath.startsWith('books/')
  }

  isMetadata(): boolean {
    return this.contentPath === '_metadata'
  }

  isArticleContent(): boolean {
    return this.contentPath.includes('/') && !this.contentPath.startsWith('books/') && !this.contentPath.startsWith('words/')
  }

  isWordContent(): boolean {
    return this.contentPath.startsWith('words/')
  }

  // Extract identifiers
  getBookCode(): string | null {
    if (this.isBookContent()) {
      return this.contentPath.replace('books/', '')
    }
    return null
  }

  getArticleId(): string | null {
    if (this.isArticleContent()) {
      const parts = this.contentPath.split('/')
      return parts[parts.length - 1]
    }
    return null
  }

  getWordId(): string | null {
    if (this.isWordContent()) {
      return this.contentPath.replace('words/', '')
    }
    return null
  }
}
