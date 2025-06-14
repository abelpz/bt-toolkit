# DI Decorators Reference

Complete reference for all dependency injection decorators available in the Panel System.

## 🎯 Overview

The Panel System provides a rich set of decorators for:
- **Service Definition**: Mark classes as injectable services
- **Lifecycle Management**: Control service initialization and disposal
- **Framework Targeting**: Target specific frameworks (React, React Native, Vanilla)
- **Platform Optimization**: Optimize for specific platforms (Web, Mobile, Desktop)
- **Dependency Injection**: Inject dependencies with type safety

## 📚 Decorator Categories

### 1. Basic Service Decorators
### 2. Framework Decorators
### 3. Platform Decorators
### 4. Lifecycle Decorators
### 5. Injection Decorators
### 6. Utility Decorators

---

## 1. Basic Service Decorators

### `@injectable()`

Marks a class as injectable by the DI container.

```typescript
@injectable()
class MyService {
  constructor() {}
}
```

**Required**: Must be applied to all classes that will be injected.

### `@singleton()`

Ensures only one instance of the service exists.

```typescript
@injectable()
@singleton()
class ConfigurationService {
  private config: Record<string, any> = {};
  
  get<T>(key: string): T {
    return this.config[key];
  }
}
```

**Default**: Services are singleton by default.

### `@transient()`

Creates a new instance every time the service is requested.

```typescript
@injectable()
@transient()
class RequestHandler {
  private requestId = Math.random().toString(36);
  
  handle(request: any): void {
    console.log(`Handling request ${this.requestId}`);
  }
}
```

**Use Case**: Stateful services that need fresh instances.

### `@service(name: string)`

Registers the service with a specific name.

```typescript
@injectable()
@service('MyCustomService')
class CustomService {
  // Implementation
}

// Usage
const service = container.get<CustomService>('MyCustomService');
```

---

## 2. Framework Decorators

### `@reactService()`

Marks a service as React-specific.

```typescript
@injectable()
@reactService()
@singleton()
class ReactPanelComponent {
  constructor(
    @injectSignalBus() private signalBus: SignalBus,
    @injectPanelManager() private panelManager: PanelManager
  ) {}
  
  createReactElement(): JSX.Element {
    // React-specific implementation
  }
}
```

**Registration**: Automatically registered when framework is 'react'.

### `@reactNativeService()`

Marks a service as React Native-specific.

```typescript
@injectable()
@reactNativeService()
@singleton()
class MobileNavigationService {
  constructor(
    @injectNavigationController() private navController: NavigationController
  ) {}
  
  navigateWithNativeTransition(route: string): void {
    // React Native specific navigation
  }
}
```

**Registration**: Automatically registered when framework is 'react-native'.

### `@vanillaService()`

Marks a service as framework-agnostic.

```typescript
@injectable()
@vanillaService()
@singleton()
class CoreTranslationService {
  constructor(
    @injectSignalBus() private signalBus: SignalBus
  ) {}
  
  translateText(text: string, targetLang: string): string {
    // Pure JavaScript implementation
  }
}
```

**Registration**: Always registered regardless of framework.

---

## 3. Platform Decorators

### `@webService()`

Optimizes service for web platforms.

```typescript
@injectable()
@webService()
@singleton()
class WebStorageService implements IStorageService {
  save(key: string, data: any): void {
    localStorage.setItem(key, JSON.stringify(data));
  }
  
  load<T>(key: string): T | null {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  }
}
```

**Features**: Uses web APIs like localStorage, fetch, etc.

### `@mobileService()`

Optimizes service for mobile platforms.

```typescript
@injectable()
@mobileService()
@singleton()
class MobileStorageService implements IStorageService {
  async save(key: string, data: any): Promise<void> {
    // AsyncStorage or similar mobile storage
    await AsyncStorage.setItem(key, JSON.stringify(data));
  }
  
  async load<T>(key: string): Promise<T | null> {
    const item = await AsyncStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  }
}
```

**Features**: Uses mobile-specific APIs and async patterns.

### `@desktopService()`

Optimizes service for desktop platforms.

```typescript
@injectable()
@desktopService()
@singleton()
class DesktopFileService implements IFileService {
  constructor(
    @injectLogger() private logger: ILogger
  ) {}
  
  readFile(path: string): string {
    // Electron or Node.js file system access
    return fs.readFileSync(path, 'utf-8');
  }
  
  writeFile(path: string, content: string): void {
    fs.writeFileSync(path, content);
  }
}
```

**Features**: Uses desktop APIs like file system, native menus, etc.

---

## 4. Lifecycle Decorators

### `@initialize()`

Marks a method to be called during service initialization.

```typescript
@injectable()
@singleton()
class DatabaseService implements IInitializable {
  private connection: any;
  
  @initialize()
  async onInitialize(): Promise<void> {
    this.connection = await createConnection();
    console.log('Database connected');
  }
}
```

**Interface**: Implement `IInitializable` for type safety.

### `@dispose()`

Marks a method to be called during service disposal.

```typescript
@injectable()
@singleton()
class DatabaseService implements IDisposable {
  private connection: any;
  
  @dispose()
  async onDispose(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      console.log('Database disconnected');
    }
  }
}
```

**Interface**: Implement `IDisposable` for type safety.

### `@requires(dependencies: string[])`

Specifies required dependencies for the service.

```typescript
@injectable()
@requires(['SignalBus', 'Logger', 'Configuration'])
class ComplexService {
  constructor(
    @injectSignalBus() private signalBus: SignalBus,
    @injectLogger() private logger: ILogger,
    @injectConfiguration() private config: IConfiguration
  ) {}
}
```

**Validation**: Dependencies are validated at container initialization.

---

## 5. Injection Decorators

### Basic Injection

#### `@inject(token: string | symbol)`

Injects a dependency by token.

```typescript
@injectable()
class MyService {
  constructor(
    @inject(TYPES.SignalBus) private signalBus: SignalBus,
    @inject(TYPES.Logger) private logger: ILogger
  ) {}
}
```

#### `@named(name: string)`

Injects a named dependency.

```typescript
@injectable()
class MyService {
  constructor(
    @named('FileLogger') @inject(TYPES.Logger) private fileLogger: ILogger,
    @named('ConsoleLogger') @inject(TYPES.Logger) private consoleLogger: ILogger
  ) {}
}
```

#### `@optional()`

Makes a dependency optional.

```typescript
@injectable()
class MyService {
  constructor(
    @inject(TYPES.SignalBus) private signalBus: SignalBus,
    @optional() @inject(TYPES.Metrics) private metrics?: IMetricsCollector
  ) {}
  
  recordMetric(name: string, value: number): void {
    this.metrics?.recordMetric(name, value);
  }
}
```

#### `@multiInject(token: string | symbol)`

Injects multiple services of the same type.

```typescript
@injectable()
class PluginManager {
  constructor(
    @multiInject(TYPES.Plugin) private plugins: IPlugin[]
  ) {}
  
  async initializePlugins(): Promise<void> {
    for (const plugin of this.plugins) {
      await plugin.initialize();
    }
  }
}
```

### Convenience Injection Decorators

#### `@injectSignalBus()`

Injects the SignalBus service.

```typescript
@injectable()
class MyService {
  constructor(
    @injectSignalBus() private signalBus: SignalBus
  ) {}
}
```

#### `@injectPanelManager()`

Injects the PanelManager service.

```typescript
@injectable()
class MyService {
  constructor(
    @injectPanelManager() private panelManager: PanelManager
  ) {}
}
```

#### `@injectResourceRegistry()`

Injects the ResourceRegistry service.

```typescript
@injectable()
class MyService {
  constructor(
    @injectResourceRegistry() private resourceRegistry: ResourceRegistry
  ) {}
}
```

#### `@injectNavigationController()`

Injects the NavigationController service.

```typescript
@injectable()
class MyService {
  constructor(
    @injectNavigationController() private navController: NavigationController
  ) {}
}
```

#### `@injectCleanupManager()`

Injects the CleanupManager service.

```typescript
@injectable()
class MyService {
  constructor(
    @injectCleanupManager() private cleanupManager: CleanupManager
  ) {}
}
```

#### `@injectLogger()`

Injects the Logger service.

```typescript
@injectable()
class MyService {
  constructor(
    @injectLogger() private logger: ILogger
  ) {}
}
```

#### `@injectConfiguration()`

Injects the Configuration service.

```typescript
@injectable()
class MyService {
  constructor(
    @injectConfiguration() private config: IConfiguration
  ) {}
}
```

---

## 6. Utility Decorators

### `@tagged(key: string, value: any)`

Tags a service with metadata.

```typescript
@injectable()
@tagged('category', 'storage')
@tagged('priority', 'high')
class PriorityStorageService {
  // Implementation
}
```

### `@optionalService()`

Marks a service as optional in the dependency graph.

```typescript
@injectable()
@optionalService()
class OptionalMetricsService {
  // This service won't cause container initialization to fail if dependencies are missing
}
```

---

## 🔧 Advanced Usage Patterns

### Conditional Service Registration

```typescript
// Development vs Production services
@injectable()
@service(process.env.NODE_ENV === 'development' ? 'DevLogger' : 'ProdLogger')
class ConditionalLogger implements ILogger {
  log(message: string): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] ${message}`);
    } else {
      // Production logging logic
    }
  }
}
```

### Multi-Framework Services

```typescript
// Service that works in multiple frameworks
@injectable()
@reactService()
@vanillaService()
@singleton()
class UniversalStorageService {
  constructor(
    @injectLogger() private logger: ILogger
  ) {}
  
  save(key: string, data: any): void {
    // Universal storage logic
  }
}
```

### Service Composition

```typescript
@injectable()
@singleton()
class CompositeTranslationService {
  constructor(
    @multiInject(TYPES.TranslationProvider) private providers: ITranslationProvider[],
    @injectLogger() private logger: ILogger
  ) {}
  
  async translate(text: string, targetLang: string): Promise<string> {
    for (const provider of this.providers) {
      try {
        return await provider.translate(text, targetLang);
      } catch (error) {
        this.logger.warn(`Provider ${provider.name} failed: ${error.message}`);
      }
    }
    throw new Error('All translation providers failed');
  }
}
```

### Factory Services

```typescript
@injectable()
@singleton()
class ServiceFactory {
  constructor(
    @injectSignalBus() private signalBus: SignalBus,
    @injectLogger() private logger: ILogger
  ) {}
  
  createTranslationService(type: 'google' | 'azure' | 'aws'): ITranslationService {
    switch (type) {
      case 'google':
        return new GoogleTranslationService(this.signalBus, this.logger);
      case 'azure':
        return new AzureTranslationService(this.signalBus, this.logger);
      case 'aws':
        return new AWSTranslationService(this.signalBus, this.logger);
      default:
        throw new Error(`Unknown translation service type: ${type}`);
    }
  }
}
```

---

## 🧪 Testing with Decorators

### Mock Services

```typescript
@injectable()
@service('MockSignalBus')
class MockSignalBus implements SignalBus {
  async emit(signal: Signal): Promise<void> {
    // Mock implementation
  }
  
  on(type: string, handler: SignalHandler): SignalUnsubscribe {
    // Mock implementation
    return () => {};
  }
}

// Test setup
describe('MyService', () => {
  let container: Container;
  
  beforeEach(() => {
    container = new Container();
    container.bind<SignalBus>(TYPES.SignalBus).to(MockSignalBus);
    container.bind<MyService>('MyService').to(MyService);
  });
});
```

### Test-Specific Services

```typescript
@injectable()
@service('TestLogger')
class TestLogger implements ILogger {
  public logs: string[] = [];
  
  log(message: string): void {
    this.logs.push(message);
  }
  
  warn(message: string): void {
    this.logs.push(`WARN: ${message}`);
  }
  
  error(message: string): void {
    this.logs.push(`ERROR: ${message}`);
  }
}
```

---

## 🔧 Best Practices

### 1. Decorator Ordering
```typescript
// Recommended order:
@injectable()           // Always first
@reactService()        // Framework decorator
@webService()          // Platform decorator
@singleton()           // Lifecycle decorator
@service('MyService')  // Service name decorator
@requires(['Dep1'])    // Dependency decorator
class MyService {}
```

### 2. Dependency Injection
```typescript
// Good: Use convenience decorators
@injectable()
class MyService {
  constructor(
    @injectSignalBus() private signalBus: SignalBus,
    @injectLogger() private logger: ILogger
  ) {}
}

// Avoid: Manual token injection when convenience decorators exist
@injectable()
class MyService {
  constructor(
    @inject(TYPES.SignalBus) private signalBus: SignalBus,
    @inject(TYPES.Logger) private logger: ILogger
  ) {}
}
```

### 3. Optional Dependencies
```typescript
// Good: Handle optional dependencies gracefully
@injectable()
class MyService {
  constructor(
    @injectSignalBus() private signalBus: SignalBus,
    @optional() @inject(TYPES.Metrics) private metrics?: IMetricsCollector
  ) {}
  
  doWork(): void {
    // Always check optional dependencies
    this.metrics?.recordEvent('work.started');
    // Do work
    this.metrics?.recordEvent('work.completed');
  }
}
```

### 4. Service Lifecycle
```typescript
// Good: Implement lifecycle interfaces
@injectable()
@singleton()
class MyService implements IInitializable, IDisposable {
  @initialize()
  async onInitialize(): Promise<void> {
    // Initialization logic
  }
  
  @dispose()
  async onDispose(): Promise<void> {
    // Cleanup logic
  }
}
```

---

## 🐛 Common Issues

### Missing @injectable() Decorator
```typescript
// ❌ Error: Missing @injectable() decorator
class MyService {
  constructor(@injectSignalBus() private signalBus: SignalBus) {}
}

// ✅ Correct: Always add @injectable()
@injectable()
class MyService {
  constructor(@injectSignalBus() private signalBus: SignalBus) {}
}
```

### Circular Dependencies
```typescript
// ❌ Circular dependency
@injectable()
class ServiceA {
  constructor(@inject('ServiceB') private serviceB: ServiceB) {}
}

@injectable()
class ServiceB {
  constructor(@inject('ServiceA') private serviceA: ServiceA) {}
}

// ✅ Use factory or lazy injection
@injectable()
class ServiceA {
  constructor(@inject('ServiceBFactory') private serviceBFactory: () => ServiceB) {}
  
  useServiceB(): void {
    const serviceB = this.serviceBFactory();
    // Use serviceB
  }
}
```

### Framework/Platform Conflicts
```typescript
// ❌ Conflicting decorators
@injectable()
@reactService()
@reactNativeService()  // Conflict!
class MyService {}

// ✅ Use separate services for different frameworks
@injectable()
@reactService()
class ReactMyService {}

@injectable()
@reactNativeService()
class ReactNativeMyService {}
```

---

## 📚 Related Documentation

- [Dependency Injection Guide](./DependencyInjection.md)
- [Service Registry Guide](./ServiceRegistry.md)
- [Container API](./Container.md)
- [Testing Guide](./Testing.md) 