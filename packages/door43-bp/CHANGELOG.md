# Changelog

All notable changes to the `@bt-toolkit/door43-bp` library will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-22

### Added
- 🎉 **Initial Release** of Door43 Book Package Service
- 📦 **Complete Book Package Fetching**: Fetch all resources for a Bible book in one API call
- 🌐 **Door43 API v1 Integration**: Full integration with official Door43 API endpoints
- 📚 **Multiple Resource Types**: Support for ULT, UST, Translation Notes, Translation Words Links, Translation Questions
- 🔄 **Smart Multi-Level Caching**: Repository, manifest, book package, and on-demand resource caching
- 🛡️ **Full TypeScript Support**: Comprehensive type definitions and IntelliSense support
- 🔧 **Flexible Configuration**: Customizable resource types, file patterns, and organization defaults
- ⚡ **On-Demand Resources**: Translation Academy and Translation Words fetched when referenced
- 🧪 **CLI Testing Tools**: Built-in command-line interface for testing and debugging
- 📖 **Comprehensive Documentation**: API reference, examples, and configuration guides

### Features
- **BookPackageService**: Main service class for fetching complete book packages
- **Resource Discovery**: Automatic repository discovery via Door43 catalog API
- **Manifest Parsing**: YAML manifest parsing to locate book-specific files
- **Error Handling**: Robust error handling with detailed error messages
- **Retry Logic**: Automatic retry with exponential backoff for failed requests
- **Cache Management**: Methods to clear caches and get cache statistics
- **Debug Logging**: Comprehensive debug logging for development and troubleshooting

### Resource Types Supported
- **Literal Text (ULT/GLT)**: Word-for-word Bible translations in USFM format
- **Simplified Text (UST/GST)**: Thought-for-thought Bible translations in USFM format
- **Translation Notes**: Verse-by-verse translation helps in TSV format
- **Translation Words Links**: Word-level translation links in TSV format
- **Translation Questions**: Comprehension questions in TSV format
- **Translation Academy**: Translation principles (on-demand)
- **Translation Words**: Key term definitions (on-demand)

### API Endpoints
- `/api/v1/catalog/search` - Repository discovery
- `/api/v1/repos/{owner}/{repo}/contents/{path}` - File content fetching
- Support for both branches and tags via `ref` parameter

### Configuration
- **Default Configuration**: Pre-configured for unfoldingWord resources
- **Custom Configurations**: Support for different organizations and languages
- **File Pattern Matching**: Flexible file pattern matching for different repository structures
- **Book Number Mapping**: Complete mapping for all 66 Bible books

### CLI Tools
- `test` command - Test book package fetching with debug output
- `cache` command - Display cache statistics
- `clear` command - Clear all caches
- Support for custom book, language, and organization parameters

### Performance
- **Efficient Caching**: Reduces API calls through intelligent caching
- **Parallel Processing**: Concurrent fetching of multiple resources
- **Content Validation**: Validates fetched content before processing
- **Memory Management**: Efficient memory usage with garbage collection-friendly patterns

### Compatibility
- **Node.js 18+**: Full support for modern Node.js versions
- **TypeScript 5.0+**: Latest TypeScript features and strict type checking
- **ES Modules**: Native ES module support with proper imports/exports
- **React Integration**: Easy integration with React applications

### Testing
- **Unit Tests**: Comprehensive test coverage for core functionality
- **Integration Tests**: End-to-end testing with real Door43 API
- **CLI Testing**: Interactive testing tools for manual verification
- **Error Scenario Testing**: Validation of error handling and edge cases

## [Unreleased]

### Planned Features
- 🔄 **Offline Mode**: Support for locally cached resources
- 📱 **React Native Compatibility**: Enhanced React Native support
- 🌍 **Multi-Language Support**: Extended language and organization support
- 📊 **Analytics**: Usage analytics and performance metrics
- 🔐 **Authentication**: Support for authenticated Door43 API access
- 📦 **Batch Operations**: Bulk fetching of multiple book packages
- 🎯 **Smart Prefetching**: Predictive resource prefetching
- 🔍 **Search Functionality**: Search across translation resources

---

## Version History

- **v1.0.0** - Initial stable release with full Door43 API integration
- **v0.x.x** - Development versions (internal testing only)
