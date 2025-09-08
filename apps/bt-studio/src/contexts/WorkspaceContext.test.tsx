/**
 * WorkspaceContext ResourceManager Integration Test
 * 
 * Tests to verify ResourceManager is properly integrated into WorkspaceContext
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { WorkspaceProvider, useWorkspaceSelector } from './WorkspaceContext';

// Simple wrapper component for testing
const createWrapper = () => {
  return ({ children }: { children: ReactNode }) => (
    <WorkspaceProvider>{children}</WorkspaceProvider>
  );
};

describe('WorkspaceContext ResourceManager Integration', () => {
  it('should export WorkspaceProvider and useWorkspaceSelector', () => {
    expect(WorkspaceProvider).toBeDefined();
    expect(useWorkspaceSelector).toBeDefined();
  });

  it('should initialize with ResourceManager as null', () => {
    const wrapper = createWrapper();
    
    const { result } = renderHook(
      () => useWorkspaceSelector((state) => state.resourceManager),
      { wrapper }
    );

    expect(result.current).toBeNull();
  });

  it('should have initializeResourceManager method available', () => {
    const wrapper = createWrapper();
    
    const { result } = renderHook(
      () => useWorkspaceSelector((state) => state.initializeResourceManager),
      { wrapper }
    );

    expect(result.current).toBeDefined();
    expect(typeof result.current).toBe('function');
  });

  it('should have loadResourceMetadata method available', () => {
    const wrapper = createWrapper();
    
    const { result } = renderHook(
      () => useWorkspaceSelector((state) => state.loadResourceMetadata),
      { wrapper }
    );

    expect(result.current).toBeDefined();
    expect(typeof result.current).toBe('function');
  });

  it('should have refreshStorageInfo method available', () => {
    const wrapper = createWrapper();
    
    const { result } = renderHook(
      () => useWorkspaceSelector((state) => state.refreshStorageInfo),
      { wrapper }
    );

    expect(result.current).toBeDefined();
    expect(typeof result.current).toBe('function');
  });

  it('should have anchorResource initially as null', () => {
    const wrapper = createWrapper();
    
    const { result } = renderHook(
      () => useWorkspaceSelector((state) => state.anchorResource),
      { wrapper }
    );

    expect(result.current).toBeNull();
  });

  it('should have storageInfo initially as null', () => {
    const wrapper = createWrapper();
    
    const { result } = renderHook(
      () => useWorkspaceSelector((state) => state.storageInfo),
      { wrapper }
    );

    expect(result.current).toBeNull();
  });
});
