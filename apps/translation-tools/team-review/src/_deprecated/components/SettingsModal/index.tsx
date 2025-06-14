import React from 'react';
import { PanelType } from '../PanelSelector';
import { PanelSection } from './PanelSection';
import { ModalHeader } from './ModalHeader';
import { ModalFooter } from './ModalFooter';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  topPanelResources: PanelType[];
  bottomPanelResources: PanelType[];
  onTopPanelResourcesChange: (resources: PanelType[]) => void;
  onBottomPanelResourcesChange: (resources: PanelType[]) => void;
}

const allResources: { type: PanelType; label: string; description: string }[] = [
  { type: 'ult', label: 'ULT', description: 'Unfoldingword Literal Text' },
  { type: 'ust', label: 'UST', description: 'Unfoldingword Simplified Text' },
  { type: 'tn', label: 'Translation Notes', description: 'Contextual translation guidance' }
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  topPanelResources,
  bottomPanelResources,
  onTopPanelResourcesChange,
  onBottomPanelResourcesChange
}) => {
  if (!isOpen) return null;

  const handleTopPanelToggle = (resourceType: PanelType, isEnabled: boolean) => {
    if (isEnabled) {
      onTopPanelResourcesChange([...topPanelResources, resourceType]);
    } else {
      // Ensure at least one resource remains
      if (topPanelResources.length > 1) {
        onTopPanelResourcesChange(topPanelResources.filter(r => r !== resourceType));
      }
    }
  };

  const handleBottomPanelToggle = (resourceType: PanelType, isEnabled: boolean) => {
    if (isEnabled) {
      onBottomPanelResourcesChange([...bottomPanelResources, resourceType]);
    } else {
      // Ensure at least one resource remains
      if (bottomPanelResources.length > 1) {
        onBottomPanelResourcesChange(bottomPanelResources.filter(r => r !== resourceType));
      }
    }
  };

  const resetToDefaults = () => {
    onTopPanelResourcesChange(['ult', 'ust', 'tn']);
    onBottomPanelResourcesChange(['ult', 'ust', 'tn']);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/50 shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden">
        
        <ModalHeader
          title="Customize Panels"
          description="Choose which translation resources appear in each panel. Comments are accessible through the review interface."
          onClose={onClose}
        />

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-2 py-4">
          <div className="space-y-8">
            <PanelSection
              title="Top Panel"
              panelType="top"
              enabledResources={topPanelResources}
              allResources={allResources}
              onResourceToggle={handleTopPanelToggle}
            />

            <PanelSection
              title="Bottom Panel"
              panelType="bottom"
              enabledResources={bottomPanelResources}
              allResources={allResources}
              onResourceToggle={handleBottomPanelToggle}
            />
          </div>
        </div>

        <ModalFooter
          onReset={resetToDefaults}
          onPrimary={onClose}
          primaryLabel="Apply Changes"
          helpText="At least one resource must remain enabled per panel"
        />
      </div>
    </div>
  );
}; 