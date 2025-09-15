/**
 * ResourceModalContext - Global state management for the unified resource modal
 * 
 * This context manages the resource modal state at a high level, preventing
 * it from being affected by panel re-renders or workspace changes.
 */

import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';

// Resource types that can be displayed in the modal
type ResourceContentType = 'ta' | 'tw';

export interface ResourceItem {
  type: ResourceContentType;
  id: string; // articleId for TA, wordId for TW
  title?: string;
  displayTitle?: string; // Actual title from content
}

interface ResourceModalContextType {
  // Modal state
  isOpen: boolean;
  isMinimized: boolean;
  initialResource: ResourceItem | null;
  
  // Actions
  openModal: (resource: ResourceItem) => void;
  addResourceToModal: (resource: ResourceItem) => void; // Add resource to existing modal
  closeModal: () => void;
  minimizeModal: () => void;
  restoreModal: () => void;
}

const ResourceModalContext = createContext<ResourceModalContextType | null>(null);

interface ResourceModalProviderProps {
  children: ReactNode;
}

export const ResourceModalProvider: React.FC<ResourceModalProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [initialResource, setInitialResource] = useState<ResourceItem | null>(null);
  
  // Keep track of the last resource to prevent unnecessary updates
  const lastResourceRef = useRef<string | null>(null);

  const openModal = useCallback((resource: ResourceItem) => {
    const resourceKey = `${resource.type}/${resource.id}`;
    console.log(`🔄 ResourceModalContext: Opening modal with resource:`, resource);
    
    // Check if this is the same resource as the last one
    if (lastResourceRef.current === resourceKey && isOpen) {
      console.log(`🔄 ResourceModalContext: Same resource already open, just restoring if minimized`);
      if (isMinimized) {
        setIsMinimized(false); // Just restore, don't update initialResource
      }
      return;
    }
    
    // Update the last resource tracker
    lastResourceRef.current = resourceKey;
    
    // If modal is already open and minimized, add to existing modal instead
    if (isOpen && isMinimized) {
      console.log(`🔄 ResourceModalContext: Modal is minimized, adding resource to existing modal`);
      setInitialResource(resource); // This will trigger the modal to add to history
      setIsMinimized(false); // Restore the modal
    } else {
      // Fresh modal open
      console.log(`🔄 ResourceModalContext: Fresh modal open`);
      setInitialResource(resource);
      setIsOpen(true);
      setIsMinimized(false);
    }
  }, [isOpen, isMinimized]);

  const addResourceToModal = useCallback((resource: ResourceItem) => {
    console.log(`🔄 ResourceModalContext: Adding resource to existing modal:`, resource);
    if (isOpen) {
      setInitialResource(resource); // This will trigger the modal to add to history
      if (isMinimized) {
        setIsMinimized(false); // Restore if minimized
      }
    } else {
      // If modal isn't open, just open it normally
      openModal(resource);
    }
  }, [isOpen, isMinimized, openModal]);

  const closeModal = useCallback(() => {
    console.log(`🔄 ResourceModalContext: Closing modal`);
    setIsOpen(false);
    setIsMinimized(false);
    setInitialResource(null);
    lastResourceRef.current = null;
  }, []);

  const minimizeModal = useCallback(() => {
    console.log(`🔄 ResourceModalContext: Minimizing modal`);
    setIsMinimized(true);
  }, []);

  const restoreModal = useCallback(() => {
    console.log(`🔄 ResourceModalContext: Restoring modal`);
    setIsMinimized(false);
  }, []);

  const contextValue: ResourceModalContextType = {
    isOpen,
    isMinimized,
    initialResource,
    openModal,
    addResourceToModal,
    closeModal,
    minimizeModal,
    restoreModal,
  };

  return (
    <ResourceModalContext.Provider value={contextValue}>
      {children}
    </ResourceModalContext.Provider>
  );
};

export const useResourceModal = (): ResourceModalContextType => {
  const context = useContext(ResourceModalContext);
  if (!context) {
    throw new Error('useResourceModal must be used within a ResourceModalProvider');
  }
  return context;
};
