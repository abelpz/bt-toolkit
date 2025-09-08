/**
 * ResourceManager Integration Demo
 * 
 * A simple component to demonstrate that the ResourceManager is working
 * properly within the React application context.
 */

import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../contexts/WorkspaceContext';

export function ResourceManagerDemo() {
  const { 
    resourceManager, 
    resourceMetadata, 
    storageInfo, 
    refreshStorageInfo,
    anchorResource,
    anchorResourceId,
    initializing,
    errors 
  } = useWorkspace();

  const [demoStatus, setDemoStatus] = useState<string>('Checking ResourceManager...');
  const [contentSample, setContentSample] = useState<any>(null);

  useEffect(() => {
    checkResourceManagerStatus();
  }, [resourceManager, resourceMetadata, initializing]);

  const checkResourceManagerStatus = async () => {
    try {
      if (initializing) {
        setDemoStatus('🔄 Workspace initializing...');
        return;
      }

      if (!resourceManager) {
        setDemoStatus('❌ ResourceManager not available');
        return;
      }

      setDemoStatus('✅ ResourceManager is available!');

      // Check metadata
      const metadataCount = Object.keys(resourceMetadata).length;
      console.log(`📊 Found ${metadataCount} resource metadata records`);

      // Try to get storage info
      if (storageInfo) {
        console.log(`💾 Storage: ${storageInfo.itemCount} items, ${Math.round(storageInfo.totalSize / 1024)} KB`);
      }

      // Check anchor resource
      if (anchorResource && anchorResourceId) {
        console.log(`⚓ Anchor resource: ${anchorResource.title} (${anchorResourceId})`);
        
        // Try to fetch some content from the anchor resource (but don't display large content)
        try {
          const key = `${anchorResource.server}/${anchorResource.owner}/${anchorResource.language}/${anchorResourceId}/gen`;
          console.log(`📖 Attempting to fetch content with key: ${key}`);
          
          const content = await resourceManager.getOrFetchContent(key, anchorResource.type);
          if (content) {
            // Only show a small sample to avoid performance issues
            const sample = {
              book: (content as any).book,
              bookCode: (content as any).bookCode,
              chapterCount: (content as any).chapters?.length || 0,
              firstChapterVerses: (content as any).chapters?.[0]?.verses?.length || 0,
              totalSize: JSON.stringify(content).length
            };
            setContentSample(sample);
            console.log(`✅ Successfully fetched content sample:`, sample);
          }
        } catch (error) {
          console.warn(`⚠️ Could not fetch content sample:`, error);
        }
      }

    } catch (error) {
      console.error('❌ Error checking ResourceManager:', error);
      setDemoStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRefreshStorage = async () => {
    try {
      await refreshStorageInfo();
      setDemoStatus('✅ Storage info refreshed');
    } catch (error) {
      setDemoStatus(`❌ Failed to refresh storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleClearCache = async () => {
    try {
      if (resourceManager) {
        await resourceManager.clearExpiredContent();
        await refreshStorageInfo();
        setDemoStatus('✅ Cache cleared successfully');
      }
    } catch (error) {
      setDemoStatus(`❌ Failed to clear cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '1px solid #ccc', 
      borderRadius: '8px', 
      margin: '20px',
      backgroundColor: '#f9f9f9'
    }}>
      <h3>🔧 ResourceManager Integration Demo</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <strong>Status:</strong> <span>{demoStatus}</span>
      </div>

      {/* ResourceManager Status */}
      <div style={{ marginBottom: '15px' }}>
        <strong>ResourceManager:</strong> {resourceManager ? '✅ Available' : '❌ Not Available'}
      </div>

      {/* Metadata Status */}
      <div style={{ marginBottom: '15px' }}>
        <strong>Resource Metadata:</strong> {Object.keys(resourceMetadata).length} records
        {Object.keys(resourceMetadata).length > 0 && (
          <ul style={{ marginTop: '5px', marginLeft: '20px' }}>
            {Object.values(resourceMetadata).map((meta) => (
              <li key={meta.id}>
                {meta.title} ({meta.type}) - {meta.available ? '✅ Available' : '❌ Unavailable'}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Anchor Resource */}
      {anchorResource && (
        <div style={{ marginBottom: '15px' }}>
          <strong>Anchor Resource:</strong> {anchorResource.title}
          <br />
          <small>Server: {anchorResource.server}, Owner: {anchorResource.owner}, Language: {anchorResource.language}</small>
        </div>
      )}

      {/* Storage Info */}
      {storageInfo && (
        <div style={{ marginBottom: '15px' }}>
          <strong>Storage Info:</strong>
          <ul style={{ marginTop: '5px', marginLeft: '20px' }}>
            <li>Items: {storageInfo.itemCount}</li>
            <li>Size: {Math.round(storageInfo.totalSize / 1024)} KB</li>
            <li>Available Space: {Math.round(storageInfo.availableSpace / 1024)} KB</li>
            <li>Last Cleanup: {storageInfo.lastCleanup.toLocaleString()}</li>
          </ul>
        </div>
      )}

      {/* Content Sample */}
      {contentSample && (
        <div style={{ marginBottom: '15px' }}>
          <strong>Content Sample:</strong>
          <pre style={{ 
            backgroundColor: '#fff', 
            padding: '10px', 
            borderRadius: '4px', 
            fontSize: '12px',
            maxHeight: '200px',
            overflow: 'auto'
          }}>
            {JSON.stringify(contentSample, null, 2)}
          </pre>
        </div>
      )}

      {/* Errors */}
      {Object.keys(errors).length > 0 && (
        <div style={{ marginBottom: '15px', color: 'red' }}>
          <strong>Errors:</strong>
          <ul style={{ marginTop: '5px', marginLeft: '20px' }}>
            {Object.entries(errors).map(([key, error]) => (
              <li key={key}>{key}: {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={handleRefreshStorage}
          style={{ marginRight: '10px', padding: '8px 16px' }}
          disabled={!resourceManager}
        >
          🔄 Refresh Storage Info
        </button>
        
        <button 
          onClick={handleClearCache}
          style={{ marginRight: '10px', padding: '8px 16px' }}
          disabled={!resourceManager}
        >
          🧹 Clear Cache
        </button>
        
        <button 
          onClick={checkResourceManagerStatus}
          style={{ padding: '8px 16px' }}
        >
          🔍 Check Status
        </button>
      </div>
    </div>
  );
}
