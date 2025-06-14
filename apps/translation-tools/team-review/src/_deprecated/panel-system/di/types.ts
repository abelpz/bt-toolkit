/**
 * Service type identifiers for dependency injection
 * These symbols are used to identify services in the Inversify container
 */

// Core system services
export const TYPES = {
  // Container services
  Container: Symbol.for('Container'),
  PanelSystemContainer: Symbol.for('PanelSystemContainer'),
  ServiceRegistry: Symbol.for('ServiceRegistry'),
  
  // Core panel system services
  SignalBus: Symbol.for('SignalBus'),
  PanelManager: Symbol.for('PanelManager'),
  PanelRegistry: Symbol.for('PanelRegistry'),
  ResourceRegistry: Symbol.for('ResourceRegistry'),
  NavigationController: Symbol.for('NavigationController'),
  CleanupManager: Symbol.for('CleanupManager'),
  ResourceLifecycle: Symbol.for('ResourceLifecycle'),
  ResourceCleanup: Symbol.for('ResourceCleanup'),
  
  // Resource services
  ResourceFactory: Symbol.for('ResourceFactory'),
  BaseResource: Symbol.for('BaseResource'),
  
  // Panel services
  BasePanel: Symbol.for('BasePanel'),
  
  // Framework services
  ReactHooks: Symbol.for('ReactHooks'),
  ReactComponents: Symbol.for('ReactComponents'),
  ReactNativeHooks: Symbol.for('ReactNativeHooks'),
  ReactNativeComponents: Symbol.for('ReactNativeComponents'),
  
  // Platform services
  NavigationService: Symbol.for('NavigationService'),
  StorageService: Symbol.for('StorageService'),
  NotificationService: Symbol.for('NotificationService'),
  
  // Lifecycle services
  InitializableService: Symbol.for('InitializableService'),
  DisposableService: Symbol.for('DisposableService'),
  
  // Plugin services
  PluginManager: Symbol.for('PluginManager'),
  PluginRegistry: Symbol.for('PluginRegistry'),
  
  // Configuration services
  ConfigurationService: Symbol.for('ConfigurationService'),
  EnvironmentService: Symbol.for('EnvironmentService'),
  
  // Logging and monitoring
  Logger: Symbol.for('Logger'),
  MetricsCollector: Symbol.for('MetricsCollector'),
  PerformanceMonitor: Symbol.for('PerformanceMonitor'),
  
  // Event services
  EventBus: Symbol.for('EventBus'),
  EventHandler: Symbol.for('EventHandler'),
  
  // Validation services
  Validator: Symbol.for('Validator'),
  SchemaValidator: Symbol.for('SchemaValidator'),
  
  // Security services
  AuthenticationService: Symbol.for('AuthenticationService'),
  AuthorizationService: Symbol.for('AuthorizationService'),
  
  // Data services
  DataProvider: Symbol.for('DataProvider'),
  CacheService: Symbol.for('CacheService'),
  
  // UI services
  ThemeService: Symbol.for('ThemeService'),
  LocalizationService: Symbol.for('LocalizationService'),
  
  // Testing services
  MockService: Symbol.for('MockService'),
  TestHarness: Symbol.for('TestHarness')
} as const;

/**
 * Service interface markers for lifecycle management
 */
export interface IInitializable {
  initialize(): Promise<void> | void;
}

export interface IDisposable {
  dispose(): Promise<void> | void;
}

/**
 * Service metadata for registration
 */
export interface ServiceMetadata {
  name: string;
  version?: string;
  description?: string;
  dependencies?: symbol[];
  optional?: boolean;
  singleton?: boolean;
  framework?: 'react' | 'react-native' | 'vanilla' | 'all';
  platform?: 'web' | 'mobile' | 'desktop' | 'all';
}

/**
 * Plugin interface for extensibility
 */
export interface IPlugin {
  name: string;
  version: string;
  dependencies?: string[];
  activate(container: any): Promise<void> | void;
  deactivate(): Promise<void> | void;
}

/**
 * Service factory interface
 */
export interface IServiceFactory<T> {
  create(...args: any[]): T | Promise<T>;
  canCreate(identifier: symbol): boolean;
}

/**
 * Configuration interface
 */
export interface IConfiguration {
  get<T>(key: string, defaultValue?: T): T;
  set<T>(key: string, value: T): void;
  has(key: string): boolean;
  remove(key: string): void;
}

/**
 * Logger interface
 */
export interface ILogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  fatal(message: string, ...args: any[]): void;
}

/**
 * Metrics collector interface
 */
export interface IMetricsCollector {
  increment(metric: string, value?: number, tags?: Record<string, string>): void;
  decrement(metric: string, value?: number, tags?: Record<string, string>): void;
  gauge(metric: string, value: number, tags?: Record<string, string>): void;
  histogram(metric: string, value: number, tags?: Record<string, string>): void;
  timing(metric: string, duration: number, tags?: Record<string, string>): void;
}

/**
 * Event bus interface
 */
export interface IEventBus {
  emit(event: string, payload?: any): void;
  on(event: string, handler: (payload?: any) => void): () => void;
  off(event: string, handler: (payload?: any) => void): void;
  once(event: string, handler: (payload?: any) => void): void;
} 