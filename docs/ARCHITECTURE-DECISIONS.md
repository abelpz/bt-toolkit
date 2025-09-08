# Architecture Decision Records (ADR)

## ADR-001: Alignment-Layer-Centric Architecture

**Date**: January 2025  
**Status**: Accepted  

### Context
The Door43 ecosystem contains multiple interconnected resources (Bible text, translation notes, translation words, etc.). Users need a way to seamlessly navigate between related content.

### Decision
We will use the alignment layer as the central hub for all cross-resource interactions. When a user taps a word in scripture, the system will use alignment data to find and filter related content across all panels.

### Rationale
- Alignment data provides precise word-to-word connections
- Follows the Door43 specification for resource relationships
- Enables powerful filtering and cross-referencing capabilities
- Aligns with the unfoldingWord translation methodology

### Consequences
- All resources must be processed with alignment awareness
- Requires comprehensive alignment data parsing from USFM
- Creates dependency on quality alignment data in source materials
- Enables sophisticated user interactions not possible with simple text matching

---

## ADR-002: Multi-Platform Interface Abstraction

**Date**: January 2025  
**Status**: Accepted  

### Context
The Door43 libraries need to work across web browsers, React Native mobile apps, Node.js CLI tools, and MCP (AI) integrations.

### Decision
We will create platform-agnostic TypeScript interfaces for all services and implement platform-specific backends that conform to these interfaces.

### Rationale
- Enables code reuse across different platforms
- Allows dependency injection for testing and flexibility
- Supports both online and offline runtime modes
- Provides consistent API regardless of platform

### Consequences
- Requires careful interface design to accommodate all platforms
- Adds abstraction layer that may complicate debugging
- Enables easy testing with mock implementations
- Supports future platform additions without core changes

---

## ADR-003: Nx Monorepo with Tagged Libraries

**Date**: January 2025  
**Status**: Accepted  

### Context
Multiple related libraries need to be developed, tested, and versioned together while maintaining clear boundaries and reusability.

### Decision
We will use Nx monorepo structure with tagged libraries organized by scope (shared/platform/tools), layer (core/service/platform), and domain (door43).

### Rationale
- Enables efficient development and testing across related packages
- Provides clear dependency boundaries through tagging
- Supports independent versioning when needed
- Facilitates code sharing and consistent tooling

### Consequences
- Requires learning Nx tooling and conventions
- Creates more complex project structure initially
- Enables sophisticated dependency management and build optimization
- Supports future extraction of libraries for external use

---

## ADR-004: Door43 API v1 Standard

**Date**: January 2025  
**Status**: Accepted  

### Context
Door43 provides multiple API versions. The codebase was previously using inconsistent endpoint patterns.

### Decision
We will standardize on Door43 API v1 endpoints with the pattern `/api/v1/repos/{owner}/{repo}/contents/{path}?ref={ref}` for file access.

### Rationale
- API v1 is the documented, stable version
- The `ref` parameter works for both branches and tags
- Provides base64-encoded content that's reliable across file types
- Follows documented patterns in uW-Tools-Collab

### Consequences
- Requires updating existing code using v3 endpoints
- Need to handle base64 decoding for all file content
- Provides more reliable access to tagged releases
- Aligns with community documentation and examples

---

## ADR-005: TypeScript-First Development

**Date**: January 2025  
**Status**: Accepted  

### Context
The project involves complex data structures and cross-platform compatibility requirements.

### Decision
All code will be written in TypeScript with comprehensive type definitions, strict compiler settings, and explicit interface contracts.

### Rationale
- Prevents runtime errors through compile-time checking
- Improves developer experience with autocomplete and refactoring
- Documents API contracts through type definitions
- Enables better tooling and IDE support

### Consequences
- Requires TypeScript expertise across the development team
- Adds compilation step to build process
- Significantly reduces runtime errors and debugging time
- Provides living documentation through type definitions

---

## ADR-006: Cache-First Resource Loading

**Date**: January 2025  
**Status**: Accepted  

### Context
Door43 resources can be large and network access may be unreliable, especially on mobile devices.

### Decision
We will implement a cache-first strategy where all resources are cached locally after first access, with configurable TTL and offline fallback.

### Rationale
- Improves performance for repeated access
- Enables offline functionality
- Reduces API load on Door43 servers
- Provides better user experience on slow connections

### Consequences
- Requires implementing cache management across all platforms
- Need to handle cache invalidation and updates
- Increases local storage requirements
- Enables offline-first user experience

---

## ADR-007: Book Package Loading Strategy

**Date**: January 2025  
**Status**: Accepted  

### Context
Users typically work with one book at a time, but need access to multiple related resources for that book.

### Decision
We will load complete "book packages" containing all available resources (ULT, UST, TN, TWL, TQ) for a book when the user selects it.

### Rationale
- Provides immediate access to all related resources
- Enables powerful cross-resource filtering and interaction
- Matches typical user workflow (focus on one book)
- Simplifies caching and offline storage

### Consequences
- Higher initial load time when switching books
- Increased memory usage for complete book data
- Better user experience once book is loaded
- Simplifies implementation of cross-resource features

---

## ADR-008: React Context for Service Injection

**Date**: January 2025  
**Status**: Accepted  

### Context
React applications need access to Door43 services throughout the component tree, with the ability to switch between online and offline modes.

### Decision
We will use React Context to provide service instances throughout the application, with hooks for easy access and runtime mode switching.

### Rationale
- Provides clean dependency injection pattern for React
- Enables runtime switching between service implementations
- Avoids prop drilling for service access
- Supports testing with mock service implementations

### Consequences
- Creates React-specific service access pattern
- Requires careful context provider placement
- Enables clean separation of business logic from UI
- Supports easy testing and mocking

---

## ADR-009: Immer for Immutable State Management

**Date**: January 2025  
**Status**: Accepted  

### Context
The linked-panels library and resource state management require complex nested state updates with immutability guarantees.

### Decision
We will use Immer for immutable state updates, with proper plugin enablement for Map and Set data structures.

### Rationale
- Simplifies complex nested state updates
- Provides immutability guarantees required by React
- Integrates well with Zustand state management
- Enables time-travel debugging and state persistence

### Consequences
- Requires understanding Immer concepts and patterns
- Need to properly enable plugins for Map/Set usage
- Provides cleaner, more maintainable state update code
- Enables advanced state management features

---

## ADR-010: CLI-First Testing Strategy

**Date**: January 2025  
**Status**: Accepted  

### Context
The libraries need comprehensive testing across platforms and with real Door43 data.

### Decision
We will create CLI testing tools as the primary testing interface, with automated unit tests for specific components.

### Rationale
- Enables testing against real Door43 APIs and data
- Provides scriptable testing for CI/CD pipelines
- Allows testing of complete workflows end-to-end
- Supports manual validation of complex scenarios

### Consequences
- Requires building comprehensive CLI tooling
- Adds testing complexity beyond simple unit tests
- Enables thorough validation of real-world scenarios
- Provides tools useful for debugging and validation

---

## Key Technical Constraints

### Platform Compatibility Matrix
| Feature | Web | React Native | Node.js | MCP |
|---------|-----|--------------|---------|-----|
| Storage | IndexedDB | AsyncStorage | File System | Memory/File |
| Networking | fetch | fetch | node-fetch | fetch/axios |
| UI Framework | React/DOM | React Native | CLI | None |
| Bundle Size | Medium | Critical | Not applicable | Small |

### Performance Targets
- **Book Package Loading**: < 3 seconds online, < 500ms cached
- **Word Tap Response**: < 100ms for alignment lookup
- **Memory Usage**: < 50MB web, < 30MB mobile
- **Cache Hit Rate**: > 90% for frequent operations

### Security Considerations
- All API calls use HTTPS
- No authentication tokens stored in client code
- Cache data stored locally only
- No sensitive user data processed

---

**Last Updated**: January 2025  
**Review Schedule**: Monthly or on major architectural changes  
**Decision Authority**: Technical Lead + Product Owner
