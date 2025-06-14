import React, { useState } from 'react';
import { LinkedPanelRenderProps } from '../libs/linked-panels';
import { InfoModal } from './InfoModal';

interface NavigationHeaderProps extends LinkedPanelRenderProps {
  title?: string;
  showButtons?: boolean;
  compact?: boolean;
  resourceInfo?: {
    title: string;
    description: string;
    icon: string;
    category: string;
  } | null;
}

const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  title,
  current,
  navigate,
  showButtons = true,
  compact = false,
  resourceInfo,
}) => {
  const [showInfoModal, setShowInfoModal] = useState(false);
  const padding = compact ? 'px-3 py-2' : 'px-4 py-3';

  return (
    <>
      <div
        className={`flex items-center justify-between ${padding} bg-white/60 backdrop-blur-sm border-b border-gray-200/50`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Resource info - compact single line */}
          {resourceInfo && (
            <>
              {resourceInfo.icon && (
                <span className="text-lg flex-shrink-0">{resourceInfo.icon}</span>
              )}
              <span className="text-sm font-medium text-gray-900 truncate">
                {resourceInfo.title}
              </span>
              <button
                onClick={() => setShowInfoModal(true)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                title="More info"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </>
          )}
          {/* Fallback title if no resource info */}
          {!resourceInfo && title && (
            <h3 className="text-sm font-medium text-gray-800 truncate">{title}</h3>
          )}
        </div>

        {/* Navigation controls */}
        {current.panel.totalResources > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {current.panel.totalResources > 1 && (
              <span className="text-xs text-gray-500 font-medium">
                {current.index + 1}/{current.panel.totalResources}
              </span>
            )}
            {showButtons && current.panel.totalResources > 1 && (
              <div className="flex gap-1">
                <button
                  onClick={navigate.previous}
                  disabled={!current.panel.canGoPrevious}
                  className="w-7 h-7 flex items-center justify-center bg-white/80 hover:bg-white text-gray-600 hover:text-gray-800 rounded-md border border-gray-200/50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={navigate.next}
                  disabled={!current.panel.canGoNext}
                  className="w-7 h-7 flex items-center justify-center bg-white/80 hover:bg-white text-gray-600 hover:text-gray-800 rounded-md border border-gray-200/50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Modal */}
      {resourceInfo && (
        <InfoModal
          isOpen={showInfoModal}
          onClose={() => setShowInfoModal(false)}
          title={resourceInfo.title}
          icon={resourceInfo.icon}
          category={resourceInfo.category}
          description={resourceInfo.description}
        />
      )}
    </>
  );
};

interface ResourceTabsProps {
  current: LinkedPanelRenderProps['current'];
  navigate: LinkedPanelRenderProps['navigate'];
  showTabs?: boolean;
}

const ResourceTabs: React.FC<ResourceTabsProps> = ({
  current,
  navigate,
  showTabs = true,
}) => {
  if (!showTabs || current.panel.resources.length <= 1) {
    return null;
  }

  return (
    <div className="p-4 border-t border-white/20 bg-white/30">
      <div className="flex gap-2">
        {current.panel.resources.map((resource, index) => (
          <button
            key={resource.id}
            onClick={() => navigate.toIndex(index)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              index === current.index
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                : 'bg-white/60 text-gray-600 hover:bg-white/80 hover:text-gray-800 border border-white/50'
            }`}
          >
            {resource.title || resource.id}
          </button>
        ))}
      </div>
    </div>
  );
};

interface PanelUIProps {
  title?: string;
  showButtons?: boolean;
  showTabs?: boolean;
  emptyMessage?: string;
  compact?: boolean;
  panelProps: LinkedPanelRenderProps;
  resourceInfo?: {
    title: string;
    description: string;
    icon: string;
    category: string;
  } | null;
}

export const PanelUI: React.FC<PanelUIProps> = ({
  title,
  showButtons = false,
  showTabs = false,
  emptyMessage = '',
  compact = false,
  panelProps,
  resourceInfo,
}) => {
  return (
    <div className="h-full flex flex-col bg-white/70 backdrop-blur-sm shadow-lg border border-white/30 overflow-hidden">
      <NavigationHeader
        {...panelProps}
        title={title}
        showButtons={showButtons}
        compact={compact}
        resourceInfo={resourceInfo}
      />
      <ResourceContent current={panelProps.current} emptyMessage={emptyMessage} />
      <ResourceTabs {...panelProps} showTabs={showTabs} />
    </div>
  );
};

interface ResourceContentProps {
  current: LinkedPanelRenderProps['current'];
  emptyMessage?: string;
}

const ResourceContent: React.FC<ResourceContentProps> = ({
  current,
  emptyMessage = 'No resources available',
}) => {
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden">
      <div className="min-h-full">
        {current.resource ? (
          <div className="h-full">{current.resource.component}</div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">{emptyMessage}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
