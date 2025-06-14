// Core identifiers
export type PanelId = string;
export type ResourceId = string;
export type SignalType = string;

// Signal source and target
export interface SignalSource {
  panelId: PanelId;
  resourceId: ResourceId;
}

export interface SignalTarget {
  panelId?: PanelId;
  resourceId?: ResourceId;
}

// Core signal interface
export interface Signal<TPayload = any> {
  type: SignalType;
  source: SignalSource;
  target?: SignalTarget;
  payload: TPayload;
  metadata?: Record<string, any>;
  timestamp?: number;
  id?: string;
}

// Signal handler types
export type SignalHandler<TPayload = any> = (signal: Signal<TPayload>) => void | Promise<void>;
export type SignalUnsubscribe = () => void;

// Signal routing types
export interface SignalRoute {
  type: SignalType;
  source?: Partial<SignalSource>;
  target?: Partial<SignalTarget>;
  priority?: number;
}

export interface SignalFilter {
  types?: SignalType[];
  sources?: Partial<SignalSource>[];
  targets?: Partial<SignalTarget>[];
  predicate?: (signal: Signal) => boolean;
}

// Signal middleware types
export type SignalMiddleware = (signal: Signal, next: () => void | Promise<void>) => void | Promise<void>;

export interface SignalMiddlewareContext {
  signal: Signal;
  route: SignalRoute;
  metadata: Record<string, any>;
}

// Signal validation
export interface SignalValidationRule {
  type: SignalType;
  validator: (payload: any) => boolean;
  errorMessage?: string;
}

export interface SignalValidationResult {
  isValid: boolean;
  errors: string[];
}

// Signal bus configuration
export interface SignalBusConfig {
  enableLogging?: boolean;
  enableMetrics?: boolean;
  maxHistorySize?: number;
  middleware?: SignalMiddleware[];
  validationRules?: SignalValidationRule[];
}

// Signal metrics
export interface SignalMetrics {
  totalSignals: number;
  signalsByType: Record<SignalType, number>;
  averageProcessingTime: number;
  errorCount: number;
}

// Signal history
export interface SignalHistoryEntry {
  signal: Signal;
  timestamp: number;
  processingTime: number;
  success: boolean;
  error?: string;
} 