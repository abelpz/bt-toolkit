import React from 'react';
import { renderHook, act, waitFor, render } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  useCurrentState, 
  useEvents, 
  useCommands, 
  useMessaging 
} from '../useSimpleMessaging';
import { LinkedPanelsContainer } from '../../components/LinkedPanelsContainer';
import { PluginRegistry } from '../../plugins/base';
import { textMessagePlugin, createTextMessage } from '../../plugins/built-in/text-message';
import { useResourceAPI } from '../useResourceAPI';

// Create stable component references outside of render cycle
const Resource1Component = React.memo(() => <div>Resource 1</div>);
const Resource2Component = React.memo(() => <div>Resource 2</div>);

// Create stable config object outside of test scope
const stableConfig = {
  resources: [
    {
      id: 'resource-1',
      component: <Resource1Component />,
      title: 'Resource 1',
      category: 'primary' as const,
    },
    {
      id: 'resource-2',
      component: <Resource2Component />,
      title: 'Resource 2',
      category: 'secondary' as const,
    },
  ],
  panels: {
    'test-panel': {
      resourceIds: ['resource-1', 'resource-2'],
    },
  },
};

describe('useSimpleMessaging hooks', () => {
  let pluginRegistry: PluginRegistry;

  // Create a stable wrapper component
  const createTestWrapper = (plugins: PluginRegistry) => {
    const TestWrapper: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => (
      <LinkedPanelsContainer 
        config={stableConfig}
        plugins={plugins}
      >
        {children}
      </LinkedPanelsContainer>
    ));
    TestWrapper.displayName = 'TestWrapper';
    return TestWrapper;
  };

  beforeEach(() => {
    pluginRegistry = new PluginRegistry();
    pluginRegistry.register(textMessagePlugin);
  });

  describe('useCurrentState', () => {
    it('should return null when no state exists', () => {
      const { result } = renderHook(
        () => useCurrentState<any>('resource-1', 'test-key'),
        { wrapper: createTestWrapper(pluginRegistry) }
      );

      expect(result.current).toBeNull();
    });

    it('should return current state when state message exists', async () => {
      // Create a test component that uses both hooks in the same component tree
      const TestComponent: React.FC<{ onStateReceived: (state: any) => void }> = ({ onStateReceived }) => {
        const senderAPI = useResourceAPI('resource-2');
        const currentState = useCurrentState<any>('resource-1', 'test-key');

        React.useEffect(() => {
          if (currentState) {
            onStateReceived(currentState);
          }
        }, [currentState, onStateReceived]);

        React.useEffect(() => {
          // Send the state message after component mounts
          const stateMessage = createTextMessage('Test state value');
          stateMessage.lifecycle = 'state';
          stateMessage.stateKey = 'test-key';
          
          const timer = setTimeout(() => {
            senderAPI.messaging.send('resource-1', stateMessage);
          }, 10);

          return () => clearTimeout(timer);
        }, [senderAPI]);

        return <div>Test Component</div>;
      };

      const onStateReceived = vi.fn();
      
      render(
        <LinkedPanelsContainer config={stableConfig} plugins={pluginRegistry}>
          <TestComponent onStateReceived={onStateReceived} />
        </LinkedPanelsContainer>
      );

      const expectedMessage = createTextMessage('Test state value');
      expectedMessage.lifecycle = 'state';
      expectedMessage.stateKey = 'test-key';

      await waitFor(() => {
        expect(onStateReceived).toHaveBeenCalledWith(expectedMessage);
      });
    });

    it('should return null when stateKey is empty', () => {
      const { result } = renderHook(
        () => useCurrentState<any>('resource-1', ''),
        { wrapper: createTestWrapper(pluginRegistry) }
      );

      expect(result.current).toBeNull();
    });
  });

  describe('useEvents', () => {
    it('should call onEvent when matching event is received', async () => {
      const onEvent = vi.fn();

      // Create a test component that uses both hooks in the same component tree
      const TestComponent: React.FC = () => {
        const senderAPI = useResourceAPI('resource-2');
        useEvents<any>('resource-1', ['text'], onEvent);

        React.useEffect(() => {
          // Send the event message after component mounts
          const eventMessage = createTextMessage('Test event');
          eventMessage.lifecycle = 'event';
          
          const timer = setTimeout(() => {
            senderAPI.messaging.send('resource-1', eventMessage);
          }, 10);

          return () => clearTimeout(timer);
        }, [senderAPI]);

        return <div>Test Component</div>;
      };

      render(
        <LinkedPanelsContainer config={stableConfig} plugins={pluginRegistry}>
          <TestComponent />
        </LinkedPanelsContainer>
      );

      const expectedMessage = createTextMessage('Test event');
      expectedMessage.lifecycle = 'event';

      await waitFor(() => {
        expect(onEvent).toHaveBeenCalledWith(expectedMessage);
      });
    });

    it('should not call onEvent when eventTypes is empty', async () => {
      const onEvent = vi.fn();

      // Create a test component that uses both hooks in the same component tree
      const TestComponent: React.FC = () => {
        const senderAPI = useResourceAPI('resource-2');
        useEvents<any>('resource-1', [], onEvent);

        React.useEffect(() => {
          // Send the event message after component mounts
          const eventMessage = createTextMessage('Test event');
          eventMessage.lifecycle = 'event';
          
          const timer = setTimeout(() => {
            senderAPI.messaging.send('resource-1', eventMessage);
          }, 10);

          return () => clearTimeout(timer);
        }, [senderAPI]);

        return <div>Test Component</div>;
      };

      render(
        <LinkedPanelsContainer config={stableConfig} plugins={pluginRegistry}>
          <TestComponent />
        </LinkedPanelsContainer>
      );

      // Wait a bit to ensure no callback is triggered
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(onEvent).not.toHaveBeenCalled();
    });
  });

  describe('useCommands', () => {
    it('should call onCommand when matching command is received', async () => {
      const onCommand = vi.fn();

      // Create a test component that uses both hooks in the same component tree
      const TestComponent: React.FC = () => {
        const senderAPI = useResourceAPI('resource-2');
        useCommands<any>('resource-1', ['text'], onCommand);

        React.useEffect(() => {
          // Send the command message after component mounts
          const commandMessage = createTextMessage('Test command');
          commandMessage.lifecycle = 'command';
          
          const timer = setTimeout(() => {
            senderAPI.messaging.send('resource-1', commandMessage);
          }, 10);

          return () => clearTimeout(timer);
        }, [senderAPI]);

        return <div>Test Component</div>;
      };

      render(
        <LinkedPanelsContainer config={stableConfig} plugins={pluginRegistry}>
          <TestComponent />
        </LinkedPanelsContainer>
      );

      const expectedMessage = createTextMessage('Test command');
      expectedMessage.lifecycle = 'command';

      await waitFor(() => {
        expect(onCommand).toHaveBeenCalledWith(expectedMessage);
      });
    });
  });

  describe('useMessaging', () => {
    it('should return current state when stateKey is provided', async () => {
      // Create a test component that uses both hooks in the same component tree
      const TestComponent: React.FC<{ onStateReceived: (state: any) => void }> = ({ onStateReceived }) => {
        const senderAPI = useResourceAPI('resource-2');
        const messaging = useMessaging<any, any, any>({
          resourceId: 'resource-1',
          stateKey: 'test-key',
        });

        React.useEffect(() => {
          if (messaging.currentState) {
            onStateReceived(messaging.currentState);
          }
        }, [messaging.currentState, onStateReceived]);

        React.useEffect(() => {
          // Send the state message after component mounts
          const stateMessage = createTextMessage('Test state value');
          stateMessage.lifecycle = 'state';
          stateMessage.stateKey = 'test-key';
          
          const timer = setTimeout(() => {
            senderAPI.messaging.send('resource-1', stateMessage);
          }, 10);

          return () => clearTimeout(timer);
        }, [senderAPI]);

        return <div>Test Component</div>;
      };

      const onStateReceived = vi.fn();
      
      render(
        <LinkedPanelsContainer config={stableConfig} plugins={pluginRegistry}>
          <TestComponent onStateReceived={onStateReceived} />
        </LinkedPanelsContainer>
      );

      const expectedMessage = createTextMessage('Test state value');
      expectedMessage.lifecycle = 'state';
      expectedMessage.stateKey = 'test-key';

      await waitFor(() => {
        expect(onStateReceived).toHaveBeenCalledWith(expectedMessage);
      });
    });

    it('should return null state when stateKey is not provided', () => {
      const { result } = renderHook(
        () => useMessaging<any, any, any>({
          resourceId: 'resource-1',
        }),
        { wrapper: createTestWrapper(pluginRegistry) }
      );

      expect(result.current.currentState).toBeNull();
    });
  });
}); 