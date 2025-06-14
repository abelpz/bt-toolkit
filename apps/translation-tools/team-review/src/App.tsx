import { ResizablePanels } from './libs/resizable-panels';
import {
  LinkedPanelsConfig,
  LinkedPanelsContainer,
  LinkedPanel,
} from './libs/linked-panels';

import { ResourceCard } from './components/ResourceCard';
import { PanelUI } from './components/PanelUI';

export default function App() {
  // Example configuration - you can modify this as needed
  const config: LinkedPanelsConfig = {
    resources: [
      {
        id: 'resource1',
        component: (
          <ResourceCard
            id="resource1"
            component={<div>Resource 1 Content</div>}
          />
        ),
      },
      {
        id: 'resource2',
        component: (
          <ResourceCard
            id="resource2"
            component={<div>Resource 2 Content</div>}
          />
        ),
      },
      {
        id: 'resource3',
        component: (
          <ResourceCard
            id="resource3"
            component={<div>Resource 3 Content</div>}
          />
        ),
      },
    ],
    panels: {
      top: {
        resourceIds: ['resource1', 'resource2', 'resource3'],
      },
      bottom: {
        resourceIds: ['resource3', 'resource1', 'resource2'],
      },
    },
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0">
        <LinkedPanelsContainer config={config}>
          <ResizablePanels
            topPanel={
              <LinkedPanel id="top">
                {(props) => (
                  <PanelUI
                    title="Top Panel"
                    showButtons={true}
                    emptyMessage="No resources configured"
                    panelProps={props}
                  />
                )}
              </LinkedPanel>
            }
            bottomPanel={
              <LinkedPanel id="bottom">
                {(props) => (
                  <PanelUI
                    title="Bottom Panel"
                    showButtons={true}
                    emptyMessage="No resources configured"
                    panelProps={props}
                  />
                )}
              </LinkedPanel>
            }
          />
        </LinkedPanelsContainer>
      </div>
    </div>
  );
}
