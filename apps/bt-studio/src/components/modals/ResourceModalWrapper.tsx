/**
 * ResourceModalWrapper - Renders the ResourceModal at the app level
 * 
 * This component connects the ResourceModal to the ResourceModalContext
 * and renders it outside of any panel-specific components.
 */

import React from 'react';
import { useResourceModal } from '../../contexts/ResourceModalContext';
import { ResourceModal } from './ResourceModal';

export const ResourceModalWrapper: React.FC = () => {
  const { isOpen, isMinimized, initialResource, closeModal, minimizeModal, restoreModal } = useResourceModal();

  if (!isOpen) {
    return null;
  }

  return (
    <ResourceModal
      isOpen={isOpen}
      onClose={closeModal}
      initialResource={initialResource}
      // Override the internal minimize/restore with context methods
      isMinimizedOverride={isMinimized}
      onMinimizeOverride={minimizeModal}
      onRestoreOverride={restoreModal}
    />
  );
};
