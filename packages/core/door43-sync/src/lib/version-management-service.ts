/**
 * Version Management Service
 * Manages resource versions and handles conflict resolution
 */

import { AsyncResult } from '@bt-toolkit/door43-core';
import { IStorageBackend } from '@bt-toolkit/door43-storage';
import { 
  ResourceVersion, 
  ChangeOperation, 
  ConflictInfo, 
  ConflictResolutionStrategy,
  ChangeType 
} from './change-detection-service.js';

// ============================================================================
// Version Management Types
// ============================================================================

/**
 * Version tree node representing a version in the history
 */
export interface VersionNode {
  /** Version information */
  version: ResourceVersion;
  /** Parent version (null for root) */
  parent: string | null;
  /** Child versions */
  children: string[];
  /** Branch name (if this version is on a branch) */
  branch?: string;
  /** Merge information (if this version is a merge) */
  mergeInfo?: MergeInfo;
  /** Version metadata */
  metadata: VersionMetadata;
}

/**
 * Merge information
 */
export interface MergeInfo {
  /** Source versions being merged */
  sourceVersions: string[];
  /** Merge strategy used */
  strategy: MergeStrategy;
  /** Merge timestamp */
  mergedAt: Date;
  /** User who performed the merge */
  mergedBy: string;
  /** Conflicts that were resolved */
  resolvedConflicts: ConflictResolution[];
}

/**
 * Version metadata
 */
export interface VersionMetadata {
  /** Version tags */
  tags: string[];
  /** Version description/commit message */
  description?: string;
  /** Associated changes */
  changes: ChangeOperation[];
  /** Version status */
  status: 'active' | 'archived' | 'deleted';
  /** Creation timestamp */
  createdAt: Date;
  /** Size in bytes */
  sizeBytes: number;
}

/**
 * Merge strategies
 */
export type MergeStrategy = 
  | 'three-way'       // Three-way merge with common ancestor
  | 'ours'           // Keep our version
  | 'theirs'         // Keep their version
  | 'recursive'      // Recursive merge for complex conflicts
  | 'manual';        // Manual merge required

/**
 * Conflict resolution record
 */
export interface ConflictResolution {
  /** Conflict ID */
  conflictId: string;
  /** Resolution strategy used */
  strategy: ConflictResolutionStrategy;
  /** Resolution timestamp */
  resolvedAt: Date;
  /** User who resolved the conflict */
  resolvedBy: string;
  /** Resolution details */
  resolution: any;
  /** Whether resolution was automatic */
  automatic: boolean;
}

/**
 * Version comparison result
 */
export interface VersionComparison {
  /** Source version */
  sourceVersion: ResourceVersion;
  /** Target version */
  targetVersion: ResourceVersion;
  /** Differences found */
  differences: VersionDifference[];
  /** Common ancestor version */
  commonAncestor?: ResourceVersion;
  /** Merge complexity score (0-1) */
  mergeComplexity: number;
  /** Automatic merge possible */
  canAutoMerge: boolean;
}

/**
 * Version difference
 */
export interface VersionDifference {
  /** Type of difference */
  type: 'content' | 'metadata' | 'structure';
  /** Field that differs */
  field: string;
  /** Source value */
  sourceValue: any;
  /** Target value */
  targetValue: any;
  /** Difference severity */
  severity: 'low' | 'medium' | 'high';
  /** Suggested resolution */
  suggestedResolution?: 'keep-source' | 'keep-target' | 'merge' | 'manual';
}

/**
 * Branch information
 */
export interface BranchInfo {
  /** Branch name */
  name: string;
  /** Head version ID */
  head: string;
  /** Base version ID */
  base: string;
  /** Branch description */
  description?: string;
  /** Branch creator */
  createdBy: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Branch status */
  status: 'active' | 'merged' | 'abandoned';
  /** Associated versions */
  versions: string[];
}

// ============================================================================
// Version Management Service Implementation
// ============================================================================

/**
 * Version management service handles resource versioning and conflict resolution
 */
export class VersionManagementService {
  private storageBackend: IStorageBackend;
  private versionTrees = new Map<string, Map<string, VersionNode>>(); // resourceId -> versionId -> VersionNode
  private branches = new Map<string, Map<string, BranchInfo>>(); // resourceId -> branchName -> BranchInfo
  private headVersions = new Map<string, string>(); // resourceId -> versionId

  constructor(storageBackend: IStorageBackend) {
    this.storageBackend = storageBackend;
  }

  /**
   * Initialize version management service
   */
  async initialize(): AsyncResult<void> {
    try {
      // Load version trees
      const treesResult = await this.storageBackend.get<any>('version-management:trees');
      if (treesResult.success && treesResult.data) {
        this.versionTrees = this.deserializeVersionTrees(treesResult.data);
      }

      // Load branches
      const branchesResult = await this.storageBackend.get<any>('version-management:branches');
      if (branchesResult.success && branchesResult.data) {
        this.branches = this.deserializeBranches(branchesResult.data);
      }

      // Load head versions
      const headsResult = await this.storageBackend.get<any>('version-management:heads');
      if (headsResult.success && headsResult.data) {
        this.headVersions = new Map(Object.entries(headsResult.data));
      }

      console.log('🌳 Version management service initialized');
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize version management service'
      };
    }
  }

  /**
   * Create a new version
   */
  async createVersion(
    resourceId: string,
    version: ResourceVersion,
    changes: ChangeOperation[],
    description?: string,
    parentVersionId?: string
  ): AsyncResult<VersionNode> {
    try {
      const versionId = this.generateVersionId(version);
      
      // Get or create version tree for resource
      if (!this.versionTrees.has(resourceId)) {
        this.versionTrees.set(resourceId, new Map());
      }
      const versionTree = this.versionTrees.get(resourceId)!;

      // Determine parent
      const parent = parentVersionId || this.headVersions.get(resourceId) || null;

      // Create version node
      const versionNode: VersionNode = {
        version,
        parent,
        children: [],
        metadata: {
          tags: [],
          description,
          changes,
          status: 'active',
          createdAt: new Date(),
          sizeBytes: this.calculateVersionSize(version, changes)
        }
      };

      // Add to version tree
      versionTree.set(versionId, versionNode);

      // Update parent's children
      if (parent) {
        const parentNode = versionTree.get(parent);
        if (parentNode) {
          parentNode.children.push(versionId);
        }
      }

      // Update head version
      this.headVersions.set(resourceId, versionId);

      // Persist changes
      await this.persistVersionTrees();
      await this.persistHeadVersions();

      console.log(`🌳 Created version ${versionId} for ${resourceId}`);

      return { success: true, data: versionNode };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create version'
      };
    }
  }

  /**
   * Get version history for a resource
   */
  async getVersionHistory(
    resourceId: string,
    options: {
      limit?: number;
      branch?: string;
      includeMetadata?: boolean;
    } = {}
  ): AsyncResult<VersionNode[]> {
    try {
      const versionTree = this.versionTrees.get(resourceId);
      if (!versionTree) {
        return { success: true, data: [] };
      }

      let versions: VersionNode[] = [];

      if (options.branch) {
        // Get versions for specific branch
        const branchInfo = this.branches.get(resourceId)?.get(options.branch);
        if (branchInfo) {
          versions = branchInfo.versions
            .map(vId => versionTree.get(vId))
            .filter(Boolean) as VersionNode[];
        }
      } else {
        // Get all versions in chronological order
        versions = Array.from(versionTree.values())
          .sort((a, b) => b.metadata.createdAt.getTime() - a.metadata.createdAt.getTime());
      }

      // Apply limit
      if (options.limit) {
        versions = versions.slice(0, options.limit);
      }

      // Strip metadata if not requested
      if (!options.includeMetadata) {
        versions = versions.map(v => ({
          ...v,
          metadata: {
            ...v.metadata,
            changes: [] // Remove detailed changes to reduce size
          }
        }));
      }

      return { success: true, data: versions };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get version history'
      };
    }
  }

  /**
   * Compare two versions
   */
  async compareVersions(
    resourceId: string,
    sourceVersionId: string,
    targetVersionId: string
  ): AsyncResult<VersionComparison> {
    try {
      const versionTree = this.versionTrees.get(resourceId);
      if (!versionTree) {
        return {
          success: false,
          error: 'Resource not found'
        };
      }

      const sourceNode = versionTree.get(sourceVersionId);
      const targetNode = versionTree.get(targetVersionId);

      if (!sourceNode || !targetNode) {
        return {
          success: false,
          error: 'Version not found'
        };
      }

      // Find common ancestor
      const commonAncestor = this.findCommonAncestor(versionTree, sourceVersionId, targetVersionId);

      // Calculate differences
      const differences = this.calculateDifferences(sourceNode.version, targetNode.version);

      // Calculate merge complexity
      const mergeComplexity = this.calculateMergeComplexity(differences);

      // Determine if auto-merge is possible
      const canAutoMerge = differences.every(d => d.suggestedResolution !== 'manual');

      const comparison: VersionComparison = {
        sourceVersion: sourceNode.version,
        targetVersion: targetNode.version,
        differences,
        commonAncestor: commonAncestor?.version,
        mergeComplexity,
        canAutoMerge
      };

      return { success: true, data: comparison };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to compare versions'
      };
    }
  }

  /**
   * Merge versions
   */
  async mergeVersions(
    resourceId: string,
    sourceVersionId: string,
    targetVersionId: string,
    strategy: MergeStrategy = 'three-way',
    mergedBy: string = 'system'
  ): AsyncResult<VersionNode> {
    try {
      // Compare versions first
      const comparisonResult = await this.compareVersions(resourceId, sourceVersionId, targetVersionId);
      if (!comparisonResult.success) {
        return comparisonResult;
      }

      const comparison = comparisonResult.data;

      // Check if merge is possible
      if (!comparison.canAutoMerge && strategy !== 'manual') {
        return {
          success: false,
          error: 'Automatic merge not possible, manual resolution required'
        };
      }

      // Perform merge based on strategy
      const mergeResult = await this.performMerge(comparison, strategy, mergedBy);
      if (!mergeResult.success) {
        return mergeResult;
      }

      const mergedVersion = mergeResult.data;

      // Create merge version node
      const mergeChanges: ChangeOperation[] = [{
        type: 'updated' as ChangeType,
        resourceId,
        field: 'merge',
        oldValue: [sourceVersionId, targetVersionId],
        newValue: mergedVersion,
        timestamp: new Date(),
        changedBy: mergedBy,
        context: `Merged ${sourceVersionId} and ${targetVersionId} using ${strategy} strategy`,
        checksum: this.calculateChecksum(`${resourceId}:merge:${Date.now()}`)
      }];

      const createResult = await this.createVersion(
        resourceId,
        mergedVersion,
        mergeChanges,
        `Merge of ${sourceVersionId} and ${targetVersionId}`,
        targetVersionId // Use target as parent
      );

      if (!createResult.success) {
        return createResult;
      }

      // Add merge information
      const mergedNode = createResult.data;
      mergedNode.mergeInfo = {
        sourceVersions: [sourceVersionId, targetVersionId],
        strategy,
        mergedAt: new Date(),
        mergedBy,
        resolvedConflicts: [] // Would be populated with actual conflict resolutions
      };

      console.log(`🔀 Merged versions ${sourceVersionId} and ${targetVersionId} for ${resourceId}`);

      return { success: true, data: mergedNode };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to merge versions'
      };
    }
  }

  /**
   * Create a branch
   */
  async createBranch(
    resourceId: string,
    branchName: string,
    baseVersionId: string,
    createdBy: string,
    description?: string
  ): AsyncResult<BranchInfo> {
    try {
      // Get or create branches map for resource
      if (!this.branches.has(resourceId)) {
        this.branches.set(resourceId, new Map());
      }
      const resourceBranches = this.branches.get(resourceId)!;

      // Check if branch already exists
      if (resourceBranches.has(branchName)) {
        return {
          success: false,
          error: `Branch ${branchName} already exists`
        };
      }

      // Create branch info
      const branchInfo: BranchInfo = {
        name: branchName,
        head: baseVersionId,
        base: baseVersionId,
        description,
        createdBy,
        createdAt: new Date(),
        status: 'active',
        versions: [baseVersionId]
      };

      // Add to branches
      resourceBranches.set(branchName, branchInfo);

      // Persist branches
      await this.persistBranches();

      console.log(`🌿 Created branch ${branchName} for ${resourceId}`);

      return { success: true, data: branchInfo };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create branch'
      };
    }
  }

  /**
   * Resolve conflict
   */
  async resolveConflict(
    resourceId: string,
    conflictInfo: ConflictInfo,
    resolution: ConflictResolution
  ): AsyncResult<ResourceVersion> {
    try {
      // Apply resolution based on strategy
      let resolvedVersion: ResourceVersion;

      switch (resolution.strategy) {
        case 'local-wins':
          resolvedVersion = await this.applyLocalWinsResolution(resourceId, conflictInfo);
          break;
        
        case 'remote-wins':
          resolvedVersion = await this.applyRemoteWinsResolution(resourceId, conflictInfo);
          break;
        
        case 'merge':
          resolvedVersion = await this.applyMergeResolution(resourceId, conflictInfo);
          break;
        
        case 'manual':
          resolvedVersion = resolution.resolution as ResourceVersion;
          break;
        
        default:
          return {
            success: false,
            error: `Unsupported resolution strategy: ${resolution.strategy}`
          };
      }

      // Create version for resolved conflict
      const resolveChanges: ChangeOperation[] = [{
        type: 'updated' as ChangeType,
        resourceId,
        field: 'conflict-resolution',
        oldValue: conflictInfo,
        newValue: resolution,
        timestamp: new Date(),
        changedBy: resolution.resolvedBy,
        context: `Resolved conflict using ${resolution.strategy} strategy`,
        checksum: this.calculateChecksum(`${resourceId}:resolve:${Date.now()}`)
      }];

      const createResult = await this.createVersion(
        resourceId,
        resolvedVersion,
        resolveChanges,
        `Conflict resolution: ${resolution.strategy}`
      );

      if (!createResult.success) {
        return createResult;
      }

      console.log(`🔧 Resolved conflict for ${resourceId} using ${resolution.strategy}`);

      return { success: true, data: resolvedVersion };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resolve conflict'
      };
    }
  }

  /**
   * Get version management statistics
   */
  async getStatistics(): AsyncResult<{
    totalResources: number;
    totalVersions: number;
    totalBranches: number;
    averageVersionsPerResource: number;
    versionsByStatus: Record<string, number>;
    branchesByStatus: Record<string, number>;
  }> {
    try {
      let totalVersions = 0;
      let totalBranches = 0;
      const versionsByStatus: Record<string, number> = {};
      const branchesByStatus: Record<string, number> = {};

      // Count versions
      for (const [, versionTree] of this.versionTrees) {
        totalVersions += versionTree.size;
        
        for (const [, versionNode] of versionTree) {
          const status = versionNode.metadata.status;
          versionsByStatus[status] = (versionsByStatus[status] || 0) + 1;
        }
      }

      // Count branches
      for (const [, resourceBranches] of this.branches) {
        totalBranches += resourceBranches.size;
        
        for (const [, branchInfo] of resourceBranches) {
          const status = branchInfo.status;
          branchesByStatus[status] = (branchesByStatus[status] || 0) + 1;
        }
      }

      const stats = {
        totalResources: this.versionTrees.size,
        totalVersions,
        totalBranches,
        averageVersionsPerResource: this.versionTrees.size > 0 ? totalVersions / this.versionTrees.size : 0,
        versionsByStatus,
        branchesByStatus
      };

      return { success: true, data: stats };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get statistics'
      };
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private generateVersionId(version: ResourceVersion): string {
    return `v${version.version}_${version.contentHash.substring(0, 8)}_${Date.now()}`;
  }

  private calculateVersionSize(version: ResourceVersion, changes: ChangeOperation[]): number {
    // Estimate size based on content hash and changes
    return version.contentHash.length + JSON.stringify(changes).length;
  }

  private findCommonAncestor(
    versionTree: Map<string, VersionNode>,
    version1Id: string,
    version2Id: string
  ): VersionNode | null {
    // Simple implementation - would use more sophisticated algorithm in production
    const ancestors1 = this.getAncestors(versionTree, version1Id);
    const ancestors2 = this.getAncestors(versionTree, version2Id);
    
    for (const ancestor1 of ancestors1) {
      if (ancestors2.includes(ancestor1)) {
        return versionTree.get(ancestor1) || null;
      }
    }
    
    return null;
  }

  private getAncestors(versionTree: Map<string, VersionNode>, versionId: string): string[] {
    const ancestors: string[] = [];
    let current = versionTree.get(versionId);
    
    while (current && current.parent) {
      ancestors.push(current.parent);
      current = versionTree.get(current.parent);
    }
    
    return ancestors;
  }

  private calculateDifferences(source: ResourceVersion, target: ResourceVersion): VersionDifference[] {
    const differences: VersionDifference[] = [];

    // Compare content hashes
    if (source.contentHash !== target.contentHash) {
      differences.push({
        type: 'content',
        field: 'contentHash',
        sourceValue: source.contentHash,
        targetValue: target.contentHash,
        severity: 'high',
        suggestedResolution: 'manual'
      });
    }

    // Compare metadata hashes
    if (source.metadataHash !== target.metadataHash) {
      differences.push({
        type: 'metadata',
        field: 'metadataHash',
        sourceValue: source.metadataHash,
        targetValue: target.metadataHash,
        severity: 'medium',
        suggestedResolution: 'merge'
      });
    }

    // Compare versions
    if (source.version !== target.version) {
      differences.push({
        type: 'structure',
        field: 'version',
        sourceValue: source.version,
        targetValue: target.version,
        severity: 'low',
        suggestedResolution: 'keep-target'
      });
    }

    return differences;
  }

  private calculateMergeComplexity(differences: VersionDifference[]): number {
    let complexity = 0;
    
    for (const diff of differences) {
      switch (diff.severity) {
        case 'low': complexity += 0.1; break;
        case 'medium': complexity += 0.3; break;
        case 'high': complexity += 0.6; break;
      }
    }
    
    return Math.min(complexity, 1.0);
  }

  private async performMerge(
    comparison: VersionComparison,
    strategy: MergeStrategy,
    mergedBy: string
  ): AsyncResult<ResourceVersion> {
    try {
      let mergedVersion: ResourceVersion;

      switch (strategy) {
        case 'ours':
          mergedVersion = comparison.sourceVersion;
          break;
        
        case 'theirs':
          mergedVersion = comparison.targetVersion;
          break;
        
        case 'three-way':
          mergedVersion = await this.performThreeWayMerge(comparison);
          break;
        
        default:
          return {
            success: false,
            error: `Unsupported merge strategy: ${strategy}`
          };
      }

      return { success: true, data: mergedVersion };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to perform merge'
      };
    }
  }

  private async performThreeWayMerge(comparison: VersionComparison): Promise<ResourceVersion> {
    // Simplified three-way merge - would be more sophisticated in production
    const merged: ResourceVersion = {
      ...comparison.targetVersion,
      version: Math.max(comparison.sourceVersion.version, comparison.targetVersion.version) + 1,
      lastModified: new Date(),
      modifiedBy: 'merge-system'
    };

    return merged;
  }

  private async applyLocalWinsResolution(resourceId: string, conflictInfo: ConflictInfo): Promise<ResourceVersion> {
    // Implementation would get local version and return it
    throw new Error('Not implemented');
  }

  private async applyRemoteWinsResolution(resourceId: string, conflictInfo: ConflictInfo): Promise<ResourceVersion> {
    // Implementation would get remote version and return it
    throw new Error('Not implemented');
  }

  private async applyMergeResolution(resourceId: string, conflictInfo: ConflictInfo): Promise<ResourceVersion> {
    // Implementation would perform automatic merge
    throw new Error('Not implemented');
  }

  private calculateChecksum(data: string): string {
    // Simple checksum calculation
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `chk_${Math.abs(hash).toString(16)}`;
  }

  private async persistVersionTrees(): Promise<void> {
    try {
      const treesData = this.serializeVersionTrees(this.versionTrees);
      await this.storageBackend.set('version-management:trees', treesData, {
        tags: ['version-management', 'trees']
      });
    } catch (error) {
      console.error('❌ Failed to persist version trees:', error);
    }
  }

  private async persistBranches(): Promise<void> {
    try {
      const branchesData = this.serializeBranches(this.branches);
      await this.storageBackend.set('version-management:branches', branchesData, {
        tags: ['version-management', 'branches']
      });
    } catch (error) {
      console.error('❌ Failed to persist branches:', error);
    }
  }

  private async persistHeadVersions(): Promise<void> {
    try {
      const headsData = Object.fromEntries(this.headVersions.entries());
      await this.storageBackend.set('version-management:heads', headsData, {
        tags: ['version-management', 'heads']
      });
    } catch (error) {
      console.error('❌ Failed to persist head versions:', error);
    }
  }

  private serializeVersionTrees(trees: Map<string, Map<string, VersionNode>>): any {
    const result: any = {};
    for (const [resourceId, versionTree] of trees) {
      result[resourceId] = Object.fromEntries(versionTree.entries());
    }
    return result;
  }

  private deserializeVersionTrees(data: any): Map<string, Map<string, VersionNode>> {
    const result = new Map<string, Map<string, VersionNode>>();
    for (const [resourceId, treeData] of Object.entries(data)) {
      result.set(resourceId, new Map(Object.entries(treeData as any)));
    }
    return result;
  }

  private serializeBranches(branches: Map<string, Map<string, BranchInfo>>): any {
    const result: any = {};
    for (const [resourceId, resourceBranches] of branches) {
      result[resourceId] = Object.fromEntries(resourceBranches.entries());
    }
    return result;
  }

  private deserializeBranches(data: any): Map<string, Map<string, BranchInfo>> {
    const result = new Map<string, Map<string, BranchInfo>>();
    for (const [resourceId, branchesData] of Object.entries(data)) {
      result.set(resourceId, new Map(Object.entries(branchesData as any)));
    }
    return result;
  }
}
