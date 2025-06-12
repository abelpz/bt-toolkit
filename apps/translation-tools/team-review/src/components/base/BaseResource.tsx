import React, { useEffect, useRef, useState } from 'react';
import { SignalBus } from '../../services/SignalBus';
import { ResourceAPI, Signal, PanelId, ResourceId } from '../../types/signaling';

export interface BaseResourceProps {
  panelId: PanelId;
  resourceId: ResourceId;
  children?: React.ReactNode;
  className?: string;
}

export interface BaseResourceState {
  isVisible: boolean;
  isFocused: boolean;
  isHighlighted: boolean;
  [key: string]: any;
}

export abstract class BaseResourceComponent extends React.Component<BaseResourceProps, BaseResourceState> 
  implements ResourceAPI {
  
  private signalBus = SignalBus.getInstance();
  private mounted = false;

  constructor(props: BaseResourceProps) {
    super(props);
    this.state = {
      isVisible: true,
      isFocused: false,
      isHighlighted: false
    };
  }

  // ResourceAPI implementation
  get id(): ResourceId {
    return this.props.resourceId;
  }

  get panelId(): PanelId {
    return this.props.panelId;
  }

  async onSignal(signal: Signal): Promise<void> {
    // Handle common signals
    switch (signal.type) {
      case 'focus_resource':
        if (signal.payload.resourceId === this.id) {
          this.handleFocus(signal.payload.scrollTo, signal.payload.highlight);
        }
        break;
      case 'show_panel':
        if (signal.target?.panelId === this.panelId) {
          this.setState({ isVisible: true });
        }
        break;
      case 'hide_panel':
        if (signal.target?.panelId === this.panelId) {
          this.setState({ isVisible: false });
        }
        break;
      default:
        // Delegate to subclass
        await this.handleSignal(signal);
    }
  }

  mount(): void {
    if (!this.mounted) {
      this.signalBus.registerResource(this);
      this.mounted = true;
    }
  }

  unmount(): void {
    if (this.mounted) {
      this.signalBus.unregisterResource(this.id);
      this.mounted = false;
    }
  }

  getState(): BaseResourceState {
    return this.state;
  }

  // Use a different method name to avoid conflicts with React's setState
  setResourceState(state: Partial<BaseResourceState>): void {
    this.setState(state as any);
  }

  // React lifecycle
  override componentDidMount(): void {
    this.mount();
    this.onMount();
  }

  override componentWillUnmount(): void {
    this.unmount();
    this.onUnmount();
  }

  // Helper methods
  protected async emitSignal<TPayload = any>(
    type: string,
    payload: TPayload,
    target?: { panelId?: PanelId; resourceId?: ResourceId },
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.signalBus.emit({
      type,
      source: { panelId: this.panelId, resourceId: this.id },
      target,
      payload,
      metadata
    });
  }

  private handleFocus(scrollTo = true, highlight = false): void {
    this.setState({ 
      isFocused: true,
      isHighlighted: highlight 
    });

    if (scrollTo) {
      // Scroll to this component
      const element = document.getElementById(`resource-${this.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    // Clear focus after a delay
    setTimeout(() => {
      this.setState({ isFocused: false });
    }, 2000);

    // Clear highlight after a longer delay
    if (highlight) {
      setTimeout(() => {
        this.setState({ isHighlighted: false });
      }, 5000);
    }
  }

  // Abstract methods for subclasses
  protected abstract handleSignal(signal: Signal): Promise<void>;
  protected abstract onMount(): void;
  protected abstract onUnmount(): void;
  protected abstract renderContent(): React.ReactNode;

  override render(): React.ReactNode {
    if (!this.state.isVisible) {
      return null;
    }

    const className = [
      this.props.className || '',
      this.state.isFocused ? 'resource-focused' : '',
      this.state.isHighlighted ? 'resource-highlighted' : ''
    ].filter(Boolean).join(' ');

    return (
      <div 
        id={`resource-${this.id}`}
        className={className}
        data-resource-id={this.id}
        data-panel-id={this.panelId}
      >
        {this.renderContent()}
      </div>
    );
  }
}

// Functional component version using hooks
export function useBaseResource(panelId: PanelId, resourceId: ResourceId) {
  const signalBus = SignalBus.getInstance();
  const [state, setState] = useState<BaseResourceState>({
    isVisible: true,
    isFocused: false,
    isHighlighted: false
  });
  
  const resourceRef = useRef<ResourceAPI | null>(null);

  // Create resource API
  useEffect(() => {
    const resource: ResourceAPI = {
      id: resourceId,
      panelId,
      
      async onSignal(signal: Signal) {
        switch (signal.type) {
          case 'focus_resource':
            if (signal.payload.resourceId === resourceId) {
              setState(prev => ({ 
                ...prev, 
                isFocused: true,
                isHighlighted: signal.payload.highlight || false
              }));

              if (signal.payload.scrollTo) {
                const element = document.getElementById(`resource-${resourceId}`);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }

              // Clear focus after delay
              setTimeout(() => {
                setState(prev => ({ ...prev, isFocused: false }));
              }, 2000);

              if (signal.payload.highlight) {
                setTimeout(() => {
                  setState(prev => ({ ...prev, isHighlighted: false }));
                }, 5000);
              }
            }
            break;
          case 'show_panel':
            if (signal.target?.panelId === panelId) {
              setState(prev => ({ ...prev, isVisible: true }));
            }
            break;
          case 'hide_panel':
            if (signal.target?.panelId === panelId) {
              setState(prev => ({ ...prev, isVisible: false }));
            }
            break;
        }
      },

      mount() {
        signalBus.registerResource(this);
      },

      unmount() {
        signalBus.unregisterResource(resourceId);
      },

      getState() {
        return state;
      },

      setState(newState: any) {
        setState(prev => ({ ...prev, ...newState }));
      }
    };

    resourceRef.current = resource;
    resource.mount();

    return () => {
      resource.unmount();
    };
  }, [panelId, resourceId, signalBus, state]);

  const emitSignal = async <TPayload = any>(
    type: string,
    payload: TPayload,
    target?: { panelId?: PanelId; resourceId?: ResourceId },
    metadata?: Record<string, any>
  ) => {
    await signalBus.emit({
      type,
      source: { panelId, resourceId },
      target,
      payload,
      metadata
    });
  };

  return {
    state,
    setState,
    emitSignal,
    resourceApi: resourceRef.current
  };
} 