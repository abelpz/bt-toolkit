import { LinkedPanelRenderProps } from '../libs/linked-panels';

interface NavigationHeaderProps extends LinkedPanelRenderProps {
  title: string;
  showButtons?: boolean;
  compact?: boolean;
}

const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  title,
  current,
  navigate,
  showButtons = true,
  compact = false,
}) => {
  const padding = compact ? 'p-3' : 'p-4';

  return (
    <div
      className={`flex items-center justify-between ${padding} border-b border-slate-200 bg-slate-50`}
    >
      <h3 className="font-semibold text-slate-700">{title}</h3>
      {current.panel.totalResources > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">
            {current.panel.totalResources > 1
              ? `${current.index + 1} of ${current.panel.totalResources}`
              : `Resource ${current.index + 1}/${current.panel.totalResources}`}
          </span>
          {showButtons && current.panel.totalResources > 1 && (
            <div className="flex gap-1">
              <button
                onClick={navigate.previous}
                disabled={!current.panel.canGoPrevious}
                className="px-2 py-1 text-xs bg-blue-500 text-white rounded disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-blue-600"
              >
                ←
              </button>
              <button
                onClick={navigate.next}
                disabled={!current.panel.canGoNext}
                className="px-2 py-1 text-xs bg-blue-500 text-white rounded disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-blue-600"
              >
                →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
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
    <div className="p-2 border-t border-slate-200 bg-slate-50">
      <div className="flex gap-1">
        {current.panel.resources.map((resource, index) => (
          <button
            key={resource.id}
            onClick={() => navigate.toIndex(index)}
            className={`px-3 py-1 text-xs rounded ${
              index === current.index
                ? 'bg-blue-500 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            {resource.id}
          </button>
        ))}
      </div>
    </div>
  );
};

interface PanelUIProps {
  title: string;
  showButtons?: boolean;
  showTabs?: boolean;
  emptyMessage?: string;
  compact?: boolean;
  panelProps: LinkedPanelRenderProps;
}

export const PanelUI: React.FC<PanelUIProps> = ({
  title,
  showButtons = false,
  showTabs = false,
  emptyMessage = '',
  compact = false,
  panelProps,
}) => {
  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border border-slate-200">
      <NavigationHeader
        {...panelProps}
        title={title}
        showButtons={showButtons}
        compact={compact}
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
    <div className="flex-1 p-4">
      {current.resource ? (
        <div className="h-full">{current.resource.component}</div>
      ) : (
        <div className="h-full flex items-center justify-center text-slate-500">
          {emptyMessage}
        </div>
      )}
    </div>
  );
};
