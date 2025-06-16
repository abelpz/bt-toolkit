import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { PluginRegistry } from '../../plugins/base';
import { textMessagePlugin } from '../../plugins/built-in/text-message';
import { LinkedPanelsContainer } from '../LinkedPanelsContainer';
import { LinkedPanel } from '../LinkedPanel';

describe('LinkedPanel component', () => {
  let pluginRegistry: PluginRegistry;

  const TestResource1: React.FC = () => <div data-testid="resource-1">Resource 1 Content</div>;
  const TestResource2: React.FC = () => <div data-testid="resource-2">Resource 2 Content</div>;
  const TestResource3: React.FC = () => <div data-testid="resource-3">Resource 3 Content</div>;

  beforeEach(() => {
    pluginRegistry = new PluginRegistry();
    pluginRegistry.register(textMessagePlugin);
  });

  const renderWithContainer = (panelId: string) => {
    return render(
      <LinkedPanelsContainer 
        config={{
          resources: [
            {
              id: 'resource-1',
              component: <TestResource1 />,
              title: 'Resource 1',
              category: 'primary',
            },
            {
              id: 'resource-2',
              component: <TestResource2 />,
              title: 'Resource 2',
              category: 'secondary',
            },
            {
              id: 'resource-3',
              component: <TestResource3 />,
              title: 'Resource 3',
              category: 'primary',
            },
          ],
          panels: {
            'test-panel': {
              resourceIds: ['resource-1', 'resource-2', 'resource-3'],
            },
            'other-panel': {
              resourceIds: ['resource-2'],
            },
          },
        }}
        plugins={pluginRegistry}
      >
        <LinkedPanel id={panelId}>
          {({ current, navigate, getResourceInfo }) => (
            <div data-testid={`panel-${panelId}`}>
              <div data-testid="current-resource">
                {current.resource?.component}
              </div>
              <div data-testid="panel-info">
                Index: {current.index} of {current.panel.totalResources}
              </div>
              <button 
                data-testid="next-button"
                onClick={navigate.next}
                disabled={!current.panel.canGoNext}
              >
                Next
              </button>
              <button 
                data-testid="prev-button"
                onClick={navigate.previous}
                disabled={!current.panel.canGoPrevious}
              >
                Previous
              </button>
              <div data-testid="resource-info">
                {getResourceInfo()?.title || 'No resource'}
              </div>
            </div>
          )}
        </LinkedPanel>
      </LinkedPanelsContainer>
    );
  };

  describe('basic rendering', () => {
    it('should render panel with render props', () => {
      renderWithContainer('test-panel');
      
      expect(screen.getByTestId('panel-test-panel')).toBeInTheDocument();
      expect(screen.getByTestId('current-resource')).toBeInTheDocument();
      expect(screen.getByTestId('panel-info')).toBeInTheDocument();
    });

    it('should render first resource by default', () => {
      renderWithContainer('test-panel');
      
      expect(screen.getByTestId('resource-1')).toBeInTheDocument();
      expect(screen.getByText('Resource 1 Content')).toBeInTheDocument();
    });

    it('should show correct panel information', () => {
      renderWithContainer('test-panel');
      
      expect(screen.getByTestId('panel-info')).toHaveTextContent('Index: 0 of 3');
      expect(screen.getByTestId('resource-info')).toHaveTextContent('Resource 1');
    });
  });

  describe('navigation controls', () => {
    it('should provide navigation buttons', () => {
      renderWithContainer('test-panel');
      
      expect(screen.getByTestId('next-button')).toBeInTheDocument();
      expect(screen.getByTestId('prev-button')).toBeInTheDocument();
    });

    it('should disable previous button on first resource', () => {
      renderWithContainer('test-panel');
      
      expect(screen.getByTestId('prev-button')).toBeDisabled();
      expect(screen.getByTestId('next-button')).not.toBeDisabled();
    });
  });

  describe('empty panel handling', () => {
    it('should handle empty resource list gracefully', () => {
      render(
        <LinkedPanelsContainer 
          config={{
            resources: [],
            panels: {
              'empty-panel': {
                resourceIds: [],
              },
            },
          }}
          plugins={pluginRegistry}
        >
          <LinkedPanel id="empty-panel">
            {({ current }) => (
              <div data-testid="empty-panel">
                {current.resource ? 'Has resource' : 'No resource'}
              </div>
            )}
          </LinkedPanel>
        </LinkedPanelsContainer>
      );
      
      expect(screen.getByTestId('empty-panel')).toHaveTextContent('No resource');
    });
  });

  describe('error handling', () => {
    it('should handle non-existent panel ID gracefully', () => {
      render(
        <LinkedPanelsContainer 
          config={{
            resources: [
              {
                id: 'test-resource',
                component: <div>Test</div>,
                title: 'Test',
              },
            ],
            panels: {
              'existing-panel': {
                resourceIds: ['test-resource'],
              },
            },
          }}
          plugins={pluginRegistry}
        >
          <LinkedPanel id="non-existent-panel">
            {({ current }) => (
              <div data-testid="non-existent-panel">
                Resources: {current.panel.totalResources}
              </div>
            )}
          </LinkedPanel>
        </LinkedPanelsContainer>
      );
      
      expect(screen.getByTestId('non-existent-panel')).toHaveTextContent('Resources: 0');
    });
  });
}); 