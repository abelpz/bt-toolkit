# @bt-toolkit/door43-bp

**Door43 Book Package Service** - A TypeScript library for fetching complete Bible translation packages from the Door43 API.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Features

- **📦 Complete Book Packages**: Fetch all resources for a Bible book in one call
- **🌐 Door43 API Integration**: Uses official Door43 API v1 endpoints
- **📚 Multiple Resource Types**: ULT, UST, Translation Notes, Translation Words Links, Translation Questions
- **🔄 Smart Caching**: Multi-level caching for optimal performance
- **🛡️ Type Safety**: Full TypeScript support with comprehensive types
- **🔧 Configurable**: Flexible configuration for different organizations and languages
- **⚡ On-Demand Resources**: Translation Academy and Translation Words fetched as needed
- **🧪 CLI Testing**: Built-in command-line testing tools

## 📦 What is a Book Package?

A **Book Package** is a complete collection of all translation resources for a specific Bible book. Instead of making separate API calls for each resource type, you get everything in one comprehensive package:

### 📖 **Bible Text Resources**
- **Literal Text (ULT/GLT)**: Word-for-word translations in USFM format
- **Simplified Text (UST/GST)**: Thought-for-thought translations in USFM format

### 📝 **Translation Helps Resources**
- **Translation Notes (TN)**: Verse-by-verse explanations and cultural context
- **Translation Words Links (TWL)**: Connections to key theological terms
- **Translation Questions (TQ)**: Comprehension and discussion questions

### 🔗 **On-Demand Resources** (fetched when referenced)
- **Translation Academy (TA)**: Translation principles and techniques
- **Translation Words (TW)**: Definitions of key biblical terms

### 📊 **Package Structure Example**
```typescript
const genesisPackage = {
  book: 'GEN',
  language: 'en',
  organization: 'unfoldingWord',
  
  literalText: {
    source: 'en_ult',
    content: '\\id GEN EN_ULT...',  // 4.8MB of USFM content
    processed: { /* Parsed USFM structure */ }
  },
  
  simplifiedText: {
    source: 'en_ust', 
    content: '\\id GEN EN_UST...',  // 5.7MB of USFM content
    processed: { /* Parsed USFM structure */ }
  },
  
  translationNotes: {
    source: 'en_tn',
    content: 'Book\tChapter\tVerse...',  // TSV format
    processed: [
      { book: 'GEN', chapter: 1, verse: 1, note: '...' },
      // ... hundreds of notes
    ]
  },
  
  // ... other resources
  fetchedAt: new Date(),
  repositories: { /* Repository metadata */ }
}
```

> 📚 **Want to learn more?** See the [Complete Book Package Structure Guide](./docs/BOOK-PACKAGE-STRUCTURE.md) for detailed explanations of each resource type, file formats, and data structures.

## 🔧 Installation

```bash
# Using npm
npm install @bt-toolkit/door43-bp

# Using pnpm
pnpm add @bt-toolkit/door43-bp

# Using yarn
yarn add @bt-toolkit/door43-bp
```

### Dependencies

```bash
# Required peer dependencies
npm install node-fetch@^3.3.2
```

## 📋 Table of Contents

- [🚀 Quick Start](#-quick-start)
- [🔧 Installation](#-installation)
- [📖 API Reference](./docs/API.md)
- [🔧 Processed Interfaces](./docs/PROCESSED-INTERFACES.md)
- [🔗 Support Reference Utils](./docs/SUPPORT-REFERENCE-UTILS.md)
- [💡 Examples](./docs/EXAMPLES.md)
- [⚙️ Configuration](./docs/CONFIGURATION.md)
- [📦 Book Package Structure](./docs/BOOK-PACKAGE-STRUCTURE.md)
- [📄 Changelog](./CHANGELOG.md)

## 🚀 Quick Start

```typescript
import { BookPackageService, DEFAULT_BOOK_PACKAGE_CONFIG } from '@bt-toolkit/door43-bp';

// Initialize the service
const service = new BookPackageService(DEFAULT_BOOK_PACKAGE_CONFIG);

// Fetch a complete book package
const result = await service.fetchBookPackage({
  book: 'GEN',
  language: 'en',
  organization: 'unfoldingWord'
});

if (result.success && result.data) {
  const bookPackage = result.data;
  
  // Access different resources
  console.log('ULT Content:', bookPackage.literalText?.content);
  console.log('UST Content:', bookPackage.simplifiedText?.content);
  console.log('Translation Notes:', bookPackage.translationNotes?.processed);
}
```