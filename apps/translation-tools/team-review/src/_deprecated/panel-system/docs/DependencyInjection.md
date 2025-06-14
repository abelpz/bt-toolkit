# Dependency Injection Guide

The Panel System includes a comprehensive dependency injection (DI) system built on Inversify, providing IoC container functionality with framework-agnostic design and platform-specific optimizations.

## 🎯 Overview

The DI system provides:
- **Framework Support**: React, React Native, Vanilla JavaScript
- **Platform Optimization**: Web, Mobile, Desktop
- **Service Lifecycle**: Automatic initialization and disposal
- **Type Safety**: Full TypeScript integration
- **Decorator Support**: Rich decorator API for service definition
- **Backward Compatibility**: Works alongside traditional factory functions

## 🏗️ Architecture

```
di/
├── types.ts           # Service identifiers and interfaces
├── Container.ts       # Main IoC container implementation
├── ServiceRegistry.ts # Service registration and discovery
├── Decorators.ts      # Decorator definitions
└── index.ts          # Public API exports
```

## 🚀 Quick Start

### 1. Basic Container Usage

```typescript
import { createPanelSystemWithDI, TYPES } from './index';

// Create system with DI
const system = await createPanelSystemWithDI({
  di: {
    framework: 'react',
    platform: 'web'
  }
});

// Access services
const signalBus = system.container.get<SignalBus>(TYPES.SignalBus);
const panelManager = system.container.get<PanelManager>(TYPES.PanelManager);
```

### 2. Service Definition with Decorators

```typescript
import { injectable, inject, TYPES } from './index';

@injectable()
class TranslationService {
  constructor(
    @inject(TYPES.SignalBus) private signalBus: SignalBus,
    @inject(TYPES.ResourceRegistry) private resourceRegistry: ResourceRegistry
  ) {}

  async translateVerse(verseId: string): Promise<string> {
    // Implementation
  }
}
```

### 3. Framework-Specific Services

```typescript
@reactService()
@singleton()
class ReactTranslationComponent {
  constructor(
    @injectSignalBus() private signalBus: SignalBus,
    @injectPanelManager() private panelManager: PanelManager
  ) {}
}

@reactNativeService()
class MobileOptimizedService {
  // Mobile-specific implementation
}

@webService()
class WebOptimizedService {
  // Web-specific implementation
}
```

## 🔧 Container Configuration

### Framework Configuration

```typescript
const system = await createPanelSystemWithDI({
  di: {
    framework: 'react',     // 'react' | 'react-native' | 'vanilla'
    platform: 'web',       // 'web' | 'mobile' | 'desktop'
    features: {
      enableMetrics: true,
      enableLogging: true,
      enableCaching: true,
      enableValidation: true
    }
  }
});
```

### Custom Service Registration

```typescript
const system = await createPanelSystemWithDI({
  di: {
    framework: 'react',
    platform: 'web',
    services: {
      // Custom logger
      logger: MyCustomLogger,
      
      // Custom metrics collector
      metrics: MyMetricsCollector,
      
      // Custom configuration provider
      configuration: MyConfigProvider
    }
  }
});
```

### Service Factories

```typescript
const system = await createPanelSystemWithDI({
  di: {
    framework: 'react',
    platform: 'web',
    factories: {
      // Factory function for complex services
      'ComplexService': (container) => {
        const signalBus = container.get<SignalBus>(TYPES.SignalBus);
        const config = container.get<IConfiguration>(TYPES.Configuration);
        return new ComplexService(signalBus, config);
      }
    }
  }
});
```

## 🎨 Service Decorators

### Basic Decorators

```typescript
// Mark class as injectable
@injectable()
class MyService {}

// Singleton lifecycle
@singleton()
class SingletonService {}

// Transient lifecycle (new instance each time)
@transient()
class TransientService {}

// Named service
@service('MyNamedService')
class NamedService {}
```

### Framework Decorators

```typescript
// React-specific service
@reactService()
class ReactService {}

// React Native-specific service
@reactNativeService()
class ReactNativeService {}

// Vanilla JavaScript service
@vanillaService()
class VanillaService {}
```

### Platform Decorators

```typescript
// Web platform service
@webService()
class WebService {}

// Mobile platform service
@mobileService()
class MobileService {}

// Desktop platform service
@desktopService()
class DesktopService {}
```

### Injection Decorators

```typescript
@injectable()
class MyService {
  constructor(
    // Basic injection
    @inject(TYPES.SignalBus) private signalBus: SignalBus,
    
    // Named injection
    @named('MyLogger') @inject(TYPES.Logger) private logger: ILogger,
    
    // Optional injection
    @optional() @inject(TYPES.Metrics) private metrics?: IMetricsCollector,
    
    // Multiple injection
    @multiInject(TYPES.Plugin) private plugins: IPlugin[]
  ) {}
}
```

### Convenience Injection Decorators

```typescript
@injectable()
class MyService {
  constructor(
    @injectSignalBus() private signalBus: SignalBus,
    @injectPanelManager() private panelManager: PanelManager,
    @injectResourceRegistry() private resourceRegistry: ResourceRegistry,
    @injectNavigationController() private navController: NavigationController,
    @injectCleanupManager() private cleanupManager: CleanupManager,
    @injectLogger() private logger: ILogger,
    @injectConfiguration() private config: IConfiguration
  ) {}
}
```

## 🔄 Service Lifecycle

### Initialization

```typescript
@injectable()
class MyService implements IInitializable {
  @initialize()
  async onInitialize(): Promise<void> {
    // Service initialization logic
    console.log('Service initialized');
  }
}
```

### Disposal

```typescript
@injectable()
class MyService implements IDisposable {
  @dispose()
  async onDispose(): Promise<void> {
    // Cleanup logic
    console.log('Service disposed');
  }
}
```

### Dependencies

```typescript
@injectable()
@requires(['SignalBus', 'PanelManager'])
class MyService {
  // This service requires SignalBus and PanelManager to be available
}
```

## 🔍 Service Discovery

### Manual Registration

```typescript
import { getGlobalContainer, TYPES } from './index';

const container = getGlobalContainer();

// Register custom service
container.bind<IMyService>('MyService').to(MyServiceImpl).inSingletonScope();

// Register with factory
container.bind<IComplexService>('ComplexService').toDynamicValue((context) => {
  const signalBus = context.container.get<SignalBus>(TYPES.SignalBus);
  return new ComplexService(signalBus);
});
```

### Service Registry

```typescript
import { ServiceRegistry } from './index';

const registry = new ServiceRegistry();

// Register framework services
registry.registerFrameworkServices('react', container);

// Register platform services
registry.registerPlatformServices('web', container);

// Register custom services
registry.registerService('MyService', MyServiceImpl, {
  lifecycle: 'singleton',
  framework: 'react',
  platform: 'web'
});
```

## 🧪 Testing with DI

### Mock Services

```typescript
import { Container } from 'inversify';
import { TYPES } from './index';

describe('MyService', () => {
  let container: Container;
  let mockSignalBus: jest.Mocked<SignalBus>;

  beforeEach(() => {
    container = new Container();
    mockSignalBus = createMockSignalBus();
    
    // Bind mock services
    container.bind<SignalBus>(TYPES.SignalBus).toConstantValue(mockSignalBus);
    container.bind<MyService>('MyService').to(MyService);
  });

  it('should work with mocked dependencies', () => {
    const service = container.get<MyService>('MyService');
    expect(service).toBeDefined();
  });
});
```

### Test Container

```typescript
import { createTestContainer } from './test-utils';

describe('Integration Tests', () => {
  it('should create system with test container', async () => {
    const container = createTestContainer({
      framework: 'vanilla',
      platform: 'web',
      mocks: {
        [TYPES.SignalBus]: createMockSignalBus(),
        [TYPES.Logger]: createMockLogger()
      }
    });

    const service = container.get<MyService>('MyService');
    expect(service).toBeDefined();
  });
});
```

## 🚀 Advanced Usage

### Plugin System

```typescript
interface ITranslationPlugin extends IPlugin {
  translateText(text: string, targetLanguage: string): Promise<string>;
}

@injectable()
class GoogleTranslatePlugin implements ITranslationPlugin {
  async initialize(): Promise<void> {
    // Plugin initialization
  }

  async translateText(text: string, targetLanguage: string): Promise<string> {
    // Google Translate implementation
  }
}

// Register plugin
container.bind<ITranslationPlugin>(TYPES.Plugin).to(GoogleTranslatePlugin);
```

### Configuration Management

```typescript
@injectable()
class ConfigurationService implements IConfiguration {
  get<T>(key: string): T {
    // Configuration retrieval logic
  }

  set<T>(key: string, value: T): void {
    // Configuration setting logic
  }
}

// Use in services
@injectable()
class MyService {
  constructor(
    @injectConfiguration() private config: IConfiguration
  ) {}

  doSomething(): void {
    const apiKey = this.config.get<string>('api.key');
    // Use configuration
  }
}
```

### Metrics Collection

```typescript
@injectable()
class MetricsService implements IMetricsCollector {
  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    // Metrics recording logic
  }

  recordEvent(name: string, properties?: Record<string, any>): void {
    // Event recording logic
  }
}

// Use in services
@injectable()
class MyService {
  constructor(
    @inject(TYPES.Metrics) private metrics: IMetricsCollector
  ) {}

  performOperation(): void {
    const startTime = Date.now();
    
    // Do work
    
    this.metrics.recordMetric('operation.duration', Date.now() - startTime);
    this.metrics.recordEvent('operation.completed');
  }
}
```

## 🔧 Best Practices

### 1. Service Design
- Keep services focused on single responsibility
- Use interfaces for service contracts
- Implement proper lifecycle methods
- Handle errors gracefully

### 2. Dependency Management
- Avoid circular dependencies
- Use optional dependencies when appropriate
- Prefer constructor injection over property injection
- Use factory functions for complex initialization

### 3. Testing
- Mock dependencies in unit tests
- Use test containers for integration tests
- Test service lifecycle methods
- Verify proper cleanup

### 4. Performance
- Use singleton scope for stateless services
- Use transient scope for stateful services
- Lazy-load expensive services
- Monitor service creation performance

## 🐛 Troubleshooting

### Common Issues

**Service Not Found**
```typescript
// Check service registration
container.isBound(TYPES.MyService); // Should return true

// Check service identifier
const service = container.get<MyService>(TYPES.MyService);
```

**Circular Dependencies**
```typescript
// Use factory functions to break cycles
container.bind<ServiceA>('ServiceA').toDynamicValue((context) => {
  const serviceB = context.container.get<ServiceB>('ServiceB');
  return new ServiceA(serviceB);
});
```

**Missing Metadata**
```typescript
// Ensure @injectable() decorator is applied
@injectable()
class MyService {
  // Implementation
}
```

## 📚 Related Documentation

- [Service Registry Guide](./ServiceRegistry.md)
- [DI Decorators Reference](./DIDecorators.md)
- [Container API](./Container.md)
- [Testing Guide](./Testing.md) 