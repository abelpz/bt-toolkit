# Service Registry Guide

The ServiceRegistry is responsible for managing service registration, discovery, and lifecycle within the Panel System's dependency injection container.

## 🎯 Overview

The ServiceRegistry provides:
- **Service Registration**: Register services with metadata
- **Framework Support**: Framework-specific service binding
- **Platform Optimization**: Platform-specific service variants
- **Dependency Validation**: Ensure service dependencies are met
- **Service Discovery**: Find and resolve services by criteria

## 🏗️ Core Concepts

### Service Metadata

```typescript
interface ServiceMetadata {
  id: string;
  type: 'singleton' | 'transient' | 'scoped';
  framework?: 'react' | 'react-native' | 'vanilla';
  platform?: 'web' | 'mobile' | 'desktop';
  dependencies?: string[];
  optional?: boolean;
  tags?: string[];
}
```

### Service Registration

```typescript
import { ServiceRegistry } from './di';

const registry = new ServiceRegistry();

// Register a service with metadata
registry.registerService('MyService', MyServiceImpl, {
  id: 'MyService',
  type: 'singleton',
  framework: 'react',
  platform: 'web',
  dependencies: ['SignalBus', 'Logger']
});
```

## 🚀 Basic Usage

### 1. Creating a Registry

```typescript
import { ServiceRegistry } from './di';

const registry = new ServiceRegistry();
```

### 2. Registering Services

```typescript
// Simple service registration
registry.registerService('Logger', ConsoleLogger, {
  id: 'Logger',
  type: 'singleton'
});

// Service with dependencies
registry.registerService('TranslationService', TranslationServiceImpl, {
  id: 'TranslationService',
  type: 'singleton',
  framework: 'react',
  dependencies: ['SignalBus', 'ResourceRegistry', 'Logger']
});

// Platform-specific service
registry.registerService('StorageService', WebStorageService, {
  id: 'StorageService',
  type: 'singleton',
  platform: 'web'
});
```

### 3. Framework Services

```typescript
// Register React-specific services
registry.registerFrameworkServices('react', container);

// Register React Native-specific services
registry.registerFrameworkServices('react-native', container);

// Register vanilla JavaScript services
registry.registerFrameworkServices('vanilla', container);
```

### 4. Platform Services

```typescript
// Register web platform services
registry.registerPlatformServices('web', container);

// Register mobile platform services
registry.registerPlatformServices('mobile', container);

// Register desktop platform services
registry.registerPlatformServices('desktop', container);
```

## 🔧 Advanced Registration

### Factory Functions

```typescript
// Register service with factory function
registry.registerFactory('ComplexService', (container) => {
  const signalBus = container.get<SignalBus>(TYPES.SignalBus);
  const config = container.get<IConfiguration>(TYPES.Configuration);
  const logger = container.get<ILogger>(TYPES.Logger);
  
  return new ComplexService(signalBus, config, logger);
}, {
  id: 'ComplexService',
  type: 'singleton',
  dependencies: ['SignalBus', 'Configuration', 'Logger']
});
```

### Conditional Registration

```typescript
// Register service based on environment
if (process.env.NODE_ENV === 'development') {
  registry.registerService('Logger', DebugLogger, {
    id: 'Logger',
    type: 'singleton'
  });
} else {
  registry.registerService('Logger', ProductionLogger, {
    id: 'Logger',
    type: 'singleton'
  });
}
```

### Tagged Services

```typescript
// Register services with tags
registry.registerService('EmailNotifier', EmailNotifierImpl, {
  id: 'EmailNotifier',
  type: 'singleton',
  tags: ['notifier', 'email']
});

registry.registerService('SMSNotifier', SMSNotifierImpl, {
  id: 'SMSNotifier',
  type: 'singleton',
  tags: ['notifier', 'sms']
});

// Find services by tag
const notifiers = registry.findServicesByTag('notifier');
```

## 🔍 Service Discovery

### Finding Services

```typescript
// Find service by ID
const serviceMetadata = registry.findService('MyService');

// Find services by framework
const reactServices = registry.findServicesByFramework('react');

// Find services by platform
const webServices = registry.findServicesByPlatform('web');

// Find services by tag
const notificationServices = registry.findServicesByTag('notification');
```

### Service Validation

```typescript
// Validate service dependencies
const isValid = registry.validateService('MyService');

// Get validation errors
const errors = registry.getValidationErrors('MyService');

// Validate all services
const allValid = registry.validateAllServices();
```

### Service Queries

```typescript
// Complex service queries
const services = registry.queryServices({
  framework: 'react',
  platform: 'web',
  type: 'singleton',
  tags: ['ui', 'component']
});

// Find services with dependencies
const servicesWithDeps = registry.findServicesWithDependencies(['SignalBus']);
```

## 🔄 Core Service Registration

### Automatic Core Services

```typescript
// Register all core panel system services
registry.registerCoreServices(container);

// This registers:
// - SignalBus
// - PanelManager
// - ResourceRegistry
// - NavigationController
// - CleanupManager
// - ResourceLifecycle
// - ResourceCleanup
```

### Manual Core Service Registration

```typescript
// Register individual core services
registry.registerService('SignalBus', SignalBus, {
  id: 'SignalBus',
  type: 'singleton'
});

registry.registerService('PanelManager', PanelManager, {
  id: 'PanelManager',
  type: 'singleton',
  dependencies: ['SignalBus', 'PanelRegistry']
});
```

## 🎨 Framework-Specific Services

### React Services

```typescript
// React component services
@reactService()
@singleton()
class ReactPanelComponent {
  constructor(
    @injectSignalBus() private signalBus: SignalBus,
    @injectPanelManager() private panelManager: PanelManager
  ) {}
}

// Register React services
registry.registerFrameworkServices('react', container);
```

### React Native Services

```typescript
// React Native optimized services
@reactNativeService()
@singleton()
class MobileNavigationService {
  constructor(
    @injectNavigationController() private navController: NavigationController
  ) {}
  
  // Mobile-specific navigation logic
}

// Register React Native services
registry.registerFrameworkServices('react-native', container);
```

### Vanilla JavaScript Services

```typescript
// Framework-agnostic services
@vanillaService()
@singleton()
class CoreTranslationService {
  constructor(
    @injectSignalBus() private signalBus: SignalBus
  ) {}
  
  // Pure JavaScript implementation
}

// Register vanilla services
registry.registerFrameworkServices('vanilla', container);
```

## 🖥️ Platform-Specific Services

### Web Platform Services

```typescript
@webService()
@singleton()
class WebStorageService implements IStorageService {
  save(key: string, data: any): void {
    localStorage.setItem(key, JSON.stringify(data));
  }
  
  load<T>(key: string): T | null {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }
}
```

### Mobile Platform Services

```typescript
@mobileService()
@singleton()
class MobileStorageService implements IStorageService {
  save(key: string, data: any): void {
    // AsyncStorage or similar mobile storage
  }
  
  load<T>(key: string): Promise<T | null> {
    // Async mobile storage retrieval
  }
}
```

### Desktop Platform Services

```typescript
@desktopService()
@singleton()
class DesktopStorageService implements IStorageService {
  save(key: string, data: any): void {
    // Electron or desktop-specific storage
  }
  
  load<T>(key: string): T | null {
    // Desktop storage retrieval
  }
}
```

## 📊 Service Metrics

### Registration Metrics

```typescript
// Get registration statistics
const metrics = registry.getMetrics();

console.log(`Total services: ${metrics.totalServices}`);
console.log(`Singleton services: ${metrics.singletonServices}`);
console.log(`Transient services: ${metrics.transientServices}`);
console.log(`Framework services: ${metrics.frameworkServices}`);
console.log(`Platform services: ${metrics.platformServices}`);
```

### Service Health

```typescript
// Check service health
const health = registry.checkServiceHealth();

if (!health.isHealthy) {
  console.error('Service registry issues:', health.issues);
}
```

## 🧪 Testing

### Mock Registry

```typescript
import { ServiceRegistry } from './di';

describe('Service Registration', () => {
  let registry: ServiceRegistry;

  beforeEach(() => {
    registry = new ServiceRegistry();
  });

  it('should register service with metadata', () => {
    registry.registerService('TestService', TestServiceImpl, {
      id: 'TestService',
      type: 'singleton'
    });

    const service = registry.findService('TestService');
    expect(service).toBeDefined();
    expect(service?.type).toBe('singleton');
  });

  it('should validate service dependencies', () => {
    registry.registerService('ServiceA', ServiceAImpl, {
      id: 'ServiceA',
      type: 'singleton',
      dependencies: ['ServiceB']
    });

    const isValid = registry.validateService('ServiceA');
    expect(isValid).toBe(false); // ServiceB not registered
  });
});
```

### Integration Testing

```typescript
describe('Service Registry Integration', () => {
  it('should register and resolve services', async () => {
    const container = new Container();
    const registry = new ServiceRegistry();

    // Register services
    registry.registerCoreServices(container);
    registry.registerFrameworkServices('react', container);

    // Verify services can be resolved
    const signalBus = container.get<SignalBus>(TYPES.SignalBus);
    const panelManager = container.get<PanelManager>(TYPES.PanelManager);

    expect(signalBus).toBeDefined();
    expect(panelManager).toBeDefined();
  });
});
```

## 🔧 Best Practices

### 1. Service Organization
- Group related services by domain
- Use consistent naming conventions
- Document service dependencies
- Use tags for service categorization

### 2. Registration Strategy
- Register core services first
- Register framework services before platform services
- Validate dependencies after registration
- Use factory functions for complex initialization

### 3. Metadata Management
- Always provide service metadata
- Use descriptive service IDs
- Document optional dependencies
- Tag services appropriately

### 4. Performance
- Use singleton scope for stateless services
- Lazy-load expensive services
- Monitor service registration performance
- Cache service lookups when appropriate

## 🐛 Troubleshooting

### Common Issues

**Service Not Found**
```typescript
// Check if service is registered
const service = registry.findService('MyService');
if (!service) {
  console.error('Service not registered');
}
```

**Dependency Validation Failures**
```typescript
// Check validation errors
const errors = registry.getValidationErrors('MyService');
console.error('Validation errors:', errors);
```

**Framework/Platform Conflicts**
```typescript
// Check for conflicting registrations
const conflicts = registry.findConflicts();
if (conflicts.length > 0) {
  console.error('Service conflicts:', conflicts);
}
```

## 📚 Related Documentation

- [Dependency Injection Guide](./DependencyInjection.md)
- [DI Decorators Reference](./DIDecorators.md)
- [Container API](./Container.md)
- [Service Lifecycle](./ServiceLifecycle.md) 