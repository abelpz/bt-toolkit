# BT-Toolkit: Bible Translation Ecosystem

A comprehensive monorepo containing tools, libraries, and applications for Bible translation work. We serve two primary audiences:

🔧 **For Translation Teams**: Free, powerful applications for Bible translation work  
📚 **For Developers**: Reusable libraries and components as part of the **Open Components Ecosystem (OCE)**

## Mission

**Empowering Bible Translation Through Technology**

- **Free Tools for Translators**: Provide world-class translation applications at no cost
- **Open Components Ecosystem (OCE)**: Build an interconnected ecosystem of reusable components that accelerate Bible translation tool development
- **Developer Ecosystem**: Enable the broader community to build better translation tools through standardized, interoperable libraries
- **Open Standards**: Promote interoperability and collaboration in Bible translation technology
- **Global Access**: Remove barriers to quality translation tools worldwide

## Repository Structure

```
bt-toolkit/
├── apps/
│   ├── translation-tools/     # End-user applications for translators
│   ├── developer-tools/       # Tools for developers building BT software
│   ├── community/             # Community resources (blogs, websites)
│   └── demos/                 # Demonstration and example applications
├── packages/
│   ├── core/                  # Core Bible translation libraries
│   ├── components/            # UI components for translation interfaces
│   ├── formats/               # File format parsers and converters
│   ├── analysis/              # Text analysis and quality checking
│   └── utilities/             # General-purpose utilities
├── tools/                     # Build tools and development utilities
├── docs/                      # Comprehensive documentation
└── deploy/                    # Deployment configurations
```

## Open Components Ecosystem (OCE) 🌐

The **Open Components Ecosystem** is our vision for creating a thriving, interconnected community of Bible translation tools and libraries. By standardizing interfaces and promoting interoperability, we're building a foundation where:

### 🔧 **For Tool Developers**

- **Plug-and-Play Components**: Use battle-tested libraries instead of building from scratch
- **Standardized APIs**: Consistent interfaces across all translation tools
- **Community-Driven**: Benefit from collective expertise and contributions
- **Rapid Development**: Build sophisticated translation tools in weeks, not months

### 🌍 **For the Global Church**

- **Consistent Experience**: Familiar interfaces across different translation tools
- **Data Portability**: Projects work seamlessly between different applications
- **Lower Barriers**: Reduced cost and complexity for developing localized tools
- **Innovation Acceleration**: More time for solving translation challenges, less time on technical infrastructure

### 🚀 **OCE Principles**

- **Open Source**: All components freely available under permissive licenses
- **API-First**: Clear, documented, and stable interfaces
- **Interoperable**: Components work together regardless of underlying technology
- **Extensible**: Plugin architecture allows for customization and localization
- **Community-Governed**: Direction driven by actual translator and developer needs

### 📦 **Component Categories**

#### **Foundation Components** (`@bt-toolkit/core-*`)

Essential building blocks for any translation tool:

- Scripture reference handling
- Text processing and normalization
- Data validation and quality checks
- Internationalization utilities

#### **Format Components** (`@bt-toolkit/format-*`)

Universal file format support:

- USFM/USX parsers with full marker support
- Translation memory (TMX) integration
- Paratext project compatibility
- Import/export for popular formats

#### **Interface Components** (`@bt-toolkit/ui-*`)

Pre-built UI components for translation interfaces:

- Rich scripture editors with USFM support
- Reference selection and navigation
- Progress tracking and project management
- Review and collaboration workflows

#### **Analysis Components** (`@bt-toolkit/analysis-*`)

Advanced analysis and quality assurance:

- Automated consistency checking
- Translation quality metrics
- Terminology management
- Cross-reference validation

### 🤝 **Join the OCE Community**

- **Contribute**: Help build the next generation of translation tools
- **Integrate**: Use OCE components in your own applications
- **Collaborate**: Share knowledge and best practices
- **Evangelize**: Spread the word about the benefits of standardized components

## For Translation Teams 👥

### Available Applications

#### Translation Workspace

- **Scripture Editor**: Advanced USFM editor with real-time preview
- **Reference Manager**: Comprehensive verse reference tools
- **Quality Checker**: Automated translation quality analysis
- **Progress Tracker**: Translation project management

#### Analysis Tools  

- **Text Analyzer**: Language-specific text analysis
- **Consistency Checker**: Cross-reference consistency validation
- **Term Manager**: Glossary and terminology management
- **Alignment Tools**: Source-target text alignment

#### Collaboration Tools

- **Review Interface**: Translation review and approval workflows
- **Comment System**: Collaborative annotation and feedback
- **Version Control**: Translation history and change tracking
- **Export Manager**: Multi-format export and publishing

### Getting Started as a Translator

1. **Download Applications**: Visit our releases page for pre-built applications
2. **Cloud Deployment**: Access web-based tools at [bt-toolkit.org](https://bt-toolkit.org)
3. **Local Installation**: Self-host applications in your environment
4. **Mobile Apps**: Use companion mobile applications for field work

### Supported Formats

- **USFM** (Unified Standard Format Markers)
- **USX** (Unified Scripture XML)
- **OSIS** (Open Scripture Information Standard)
- **Paratext** project files
- **Translation Memory** (TMX)
- **XLIFF** for collaborative translation

## For Developers 🛠️

The BT-Toolkit serves as the reference implementation and primary distribution hub for **Open Components Ecosystem (OCE)** libraries. All our components follow OCE principles and can be used independently or together to build comprehensive Bible translation tools.

### OCE Component Libraries

#### Core Libraries (`@bt-toolkit/core-*`)

```typescript
@bt-toolkit/scripture-utils     // Verse references, book metadata
@bt-toolkit/text-processing     // Tokenization, normalization
@bt-toolkit/translation-memory  // TM management and matching
@bt-toolkit/quality-checks      // Automated quality analysis
```

#### File Format Libraries (`@bt-toolkit/format-*`)

```typescript
@bt-toolkit/format-usfm        // USFM parser and writer
@bt-toolkit/format-usx         // USX parser and writer
@bt-toolkit/format-osis        // OSIS support
@bt-toolkit/format-paratext    // Paratext integration
```

#### UI Component Libraries (`@bt-toolkit/ui-*`)

```typescript
@bt-toolkit/ui-scripture-editor  // Rich scripture editor
@bt-toolkit/ui-reference-picker  // Reference selection components
@bt-toolkit/ui-progress-tracker  // Progress visualization
@bt-toolkit/ui-review-interface  // Review and approval UI
```

#### Analysis Libraries (`@bt-toolkit/analysis-*`)

```typescript
@bt-toolkit/analysis-consistency // Consistency checking
@bt-toolkit/analysis-quality     // Quality metrics
@bt-toolkit/analysis-terminology // Term extraction and management
@bt-toolkit/analysis-alignment   // Text alignment algorithms
```

### Quick Start with OCE Components

```bash
# Install core components
npm install @bt-toolkit/core-scripture-utils
npm install @bt-toolkit/format-usfm
npm install @bt-toolkit/analysis-quality

# Basic usage
import { parseReference, formatReference } from '@bt-toolkit/core-scripture-utils';
import { parseUSFM } from '@bt-toolkit/format-usfm';
import { checkConsistency } from '@bt-toolkit/analysis-quality';

const ref = parseReference('John 3:16');
const document = parseUSFM(usfmContent);
const issues = checkConsistency(document);
```

## AI-Powered Development with Cursor 🤖

This repository includes comprehensive **Cursor AI rules** that provide context-aware assistance for Bible translation tool development. These rules encode our architectural patterns, domain knowledge, and best practices to help developers build better translation tools faster.

### Cursor Rules Overview

Our Cursor rules system includes:

- **🏗️ Architecture Guidance**: Nx monorepo patterns and project organization
- **📚 Domain Expertise**: Bible translation workflows and scripture formats
- **⚛️ Technology Stack**: React 19, TypeScript, Vite, and modern tooling
- **🧪 Testing Strategy**: Comprehensive testing approaches for translation tools
- **🎨 UI Patterns**: Accessibility-focused component development

### Rule Categories

#### **Core Monorepo Rules** (Always Applied)
- Nx workspace organization and naming conventions
- Module boundaries and dependency management
- Build, test, and deployment workflows
- Code generation and architectural standards

#### **Domain-Specific Rules** (Auto-Applied)

| Rule File | Triggers On | Provides |
|-----------|-------------|----------|
| `scripture-formats.mdc` | `**/format-*/**`, `**/*usfm*`, `**/*scripture*` | USFM/USX/USJ parsing guidelines |
| `ui-components.mdc` | `**/ui-*/**`, `**/*.tsx` | React component patterns & **Tailwind CSS detection** |
| `testing-guidelines.mdc` | `**/*.test.*`, `**/*.spec.*` | Testing strategies for translation tools |
| `nx-workflows.mdc` | `nx.json`, `project.json`, `scripts/**` | Nx configuration and workflows |

### Getting Started with Cursor

1. **Install Cursor**: Download from [cursor.sh](https://cursor.sh)
2. **Open Project**: Clone this repo and open in Cursor
3. **Auto-Detection**: Rules are automatically applied based on the files you're working with
4. **Verification**: Check `Cursor Settings > Rules` to see active rules

### Using the Rules

#### **Automatic Application** ✨
- Rules automatically activate based on file patterns
- No manual setup required
- Context-aware suggestions for your specific task

#### **Manual Rule Reference** 🎯
```
@bt-toolkit-monorepo help me create a new scripture format parser
@scripture-formats how do I handle USFM chapter markers?
@ui-components create an accessible verse selector component
@testing-guidelines test this USFM parser for edge cases
```

#### **Generate New Rules** 📝
- Use `/Generate Cursor Rules` to create project-specific rules
- Extract patterns from successful code conversations
- Share team-specific conventions

### Benefits for Developers

🚀 **Faster Development**
- Context-aware code suggestions for Bible translation domains
- Automatic application of project conventions
- Reduced time learning project structure

🎯 **Domain Expertise**
- Built-in knowledge of scripture formats and translation workflows
- Accessibility guidance for global audiences
- Multilingual and RTL text handling patterns

🏗️ **Architectural Guidance**
- Nx monorepo best practices
- Clean code boundaries and module organization
- Performance optimization for large scripture datasets

📚 **Educational Value**
- Learn Bible translation technology patterns
- Understand accessibility requirements
- Master modern React and TypeScript patterns

#### **Smart Tailwind CSS Integration** 🎨

Our Cursor rules include **intelligent Tailwind CSS detection** that automatically adapts to your project setup:

✅ **Auto-Detection**: Automatically detects if your project uses Tailwind CSS  
✅ **Tailwind-First**: Enforces Tailwind utility classes when Tailwind is available  
✅ **Smart Fallbacks**: Only suggests CSS-in-JS when Tailwind isn't configured  
✅ **Bible Translation UI Patterns**: Specialized patterns for RTL text, scripture display, and translation interfaces

**Example Auto-Detection Behavior**:
```typescript
// ✅ When Tailwind is detected, suggests utility-first approach
<div className="
  flex flex-col space-y-4 p-6 
  bg-white dark:bg-gray-900 
  rounded-lg shadow-lg
">
  <div className={`
    prose prose-lg max-w-none
    ${isRtl ? 'text-right prose-rtl' : 'text-left'}
    font-serif leading-relaxed
  `}>
    {scriptureText}
  </div>
</div>

// ❌ Won't suggest CSS-in-JS when Tailwind is available
const StyledDiv = styled.div`...`; // Avoided when Tailwind detected
```

**Detection Methods**:
- `tailwind.config.js/ts` in project root
- `@tailwind` directives in CSS files  
- Tailwind utility classes in existing components
- `tailwindcss` in package.json dependencies
- Nx project with React + Tailwind setup

### Rule Development

#### **Creating Custom Rules**
```bash
# Create a new rule file
.cursor/rules/my-domain-rule.mdc

# Example rule structure
---
description: "Custom rule for specific domain"
globs: ["**/my-pattern/**"]
alwaysApply: false
---

# Your rule content here
```

#### **Sharing Team Rules**
- Rules are version-controlled with your code
- Consistent experience across team members
- Document team conventions and standards

### Team Adoption

1. **Install Cursor**: All team members install Cursor IDE
2. **Clone Repository**: Rules are included automatically
3. **Verify Setup**: Check that rules appear in Cursor Settings
4. **Start Coding**: AI assistance adapts to your work context
5. **Iterate**: Improve rules based on team feedback

The Cursor rules make it easy for new contributors to understand our codebase patterns and help experienced developers work more efficiently with AI-powered assistance tailored to Bible translation tool development.

### OCE Component Integration Examples

```typescript
// Building a complete translation interface with OCE components
import { ScriptureEditor } from '@bt-toolkit/ui-scripture-editor';
import { ReferencePicker } from '@bt-toolkit/ui-reference-picker';
import { ProgressTracker } from '@bt-toolkit/ui-progress-tracker';
import { parseUSFM, writeUSFM } from '@bt-toolkit/format-usfm';
import { parseReference } from '@bt-toolkit/core-scripture-utils';
import { checkQuality, checkConsistency } from '@bt-toolkit/analysis-quality';
import { findMatches } from '@bt-toolkit/core-translation-memory';

function TranslationWorkspace({ projectData }) {
  // Parse content using OCE format components
  const document = parseUSFM(projectData.usfmContent);
  const currentRef = parseReference(projectData.currentReference);
  
  // Analyze using OCE analysis components
  const qualityIssues = checkQuality(document);
  const consistencyIssues = checkConsistency(document, projectData.glossary);
  const tmMatches = findMatches(document.currentSegment, projectData.translationMemory);
  
  // Render using OCE UI components
  return (
    <div className="translation-workspace">
      <ReferencePicker 
        currentReference={currentRef}
        onReferenceChange={setCurrentReference}
      />
      <ScriptureEditor
        document={document}
        qualityIssues={qualityIssues}
        consistencyIssues={consistencyIssues}
        translationMatches={tmMatches}
        onContentChange={handleContentChange}
      />
      <ProgressTracker 
        project={projectData}
        completionMetrics={calculateProgress(document)}
      />
    </div>
  );
}

// OCE components work seamlessly together
function handleSave(content) {
  const usfmOutput = writeUSFM(content);  // Format component
  const validation = checkQuality(content);  // Analysis component
  
  if (validation.isValid) {
    saveToProject(usfmOutput);
  }
}
```

### OCE Cross-Platform Compatibility

```typescript
// Same OCE components work across different frameworks

// React
import { ScriptureEditor } from '@bt-toolkit/ui-scripture-editor/react';

// Vue 
import { ScriptureEditor } from '@bt-toolkit/ui-scripture-editor/vue';

// Angular
import { ScriptureEditorModule } from '@bt-toolkit/ui-scripture-editor/angular';

// Vanilla JS
import { createScriptureEditor } from '@bt-toolkit/ui-scripture-editor/vanilla';
```

## Development Workflow

### Project Structure & Naming

This monorepo follows specific naming conventions for consistency:

**Libraries:** `@bt-toolkit/[category]-[name]`
- Core: `@bt-toolkit/core-[name]` → `packages/core/[name]`
- Components: `@bt-toolkit/components-[name]` → `packages/components/[name]`  
- Formats: `@bt-toolkit/formats-[name]` → `packages/formats/[name]`
- Analysis: `@bt-toolkit/analysis-[name]` → `packages/analysis/[name]`
- Utilities: `@bt-toolkit/utilities-[name]` → `packages/utilities/[name]`

**Applications:** `apps/[category]/[name]`
- Translation Tools: `apps/translation-tools/[name]`
- Developer Tools: `apps/developer-tools/[name]`
- Demos: `apps/demos/[name]`
- Community: `apps/community/[name]`

### Creating Projects

> **Note**: We've moved from custom scripts to direct Nx commands for better standardization and IDE support. Use the commands below instead of the old `npm run create:*` scripts.

#### For Libraries

```bash
# Core functionality libraries
nx g @nx/js:library [name] --directory=packages/core/[name] --importPath=@bt-toolkit/core-[name] --publishable --bundler=tsc --unitTestRunner=jest

# UI component libraries (React)
nx g @nx/react:library [name] --directory=packages/components/[name] --importPath=@bt-toolkit/components-[name] --publishable --bundler=rollup --unitTestRunner=jest --style=css

# Format parser libraries
nx g @nx/js:library [name] --directory=packages/formats/[name] --importPath=@bt-toolkit/formats-[name] --publishable --bundler=tsc --unitTestRunner=jest

# Analysis/quality libraries  
nx g @nx/js:library [name] --directory=packages/analysis/[name] --importPath=@bt-toolkit/analysis-[name] --publishable --bundler=tsc --unitTestRunner=jest

# Utility libraries
nx g @nx/js:library [name] --directory=packages/utilities/[name] --importPath=@bt-toolkit/utilities-[name] --publishable --bundler=tsc --unitTestRunner=jest
```

#### For Applications

```bash
# Translation tools (React apps)
nx g @nx/react:application [name] --directory=apps/translation-tools/[name] --bundler=vite --unitTestRunner=jest --e2eTestRunner=playwright

# Developer tools (Node.js)
nx g @nx/node:application [name] --directory=apps/developer-tools/[name]

# Demo applications (React)
nx g @nx/react:application [name] --directory=apps/demos/[name] --bundler=vite --unitTestRunner=jest --e2eTestRunner=playwright

# Documentation sites (Astro)
nx g @nxtensions/astro:application [name] --directory=apps/community/[name]
```

#### Quick Examples

```bash
# Create a USFM parser library
nx g @nx/js:library usfm-parser --directory=packages/formats/usfm-parser --importPath=@bt-toolkit/formats-usfm-parser --publishable --bundler=tsc --unitTestRunner=jest

# Create a scripture editor component
nx g @nx/react:library scripture-editor --directory=packages/components/scripture-editor --importPath=@bt-toolkit/components-scripture-editor --publishable --bundler=rollup --unitTestRunner=jest --style=css

# Create a translation tool app
nx g @nx/react:application verse-by-verse --directory=apps/translation-tools/verse-by-verse --bundler=vite --unitTestRunner=jest --e2eTestRunner=playwright
```

### Project Categories

#### Translation Tools (apps/translation-tools/)

**Audience**: Bible translators and translation teams  
**Purpose**: End-user applications for translation work  
**Distribution**: Free downloads, web apps, mobile apps

#### Developer Tools (apps/developer-tools/)

**Audience**: Software developers building translation tools  
**Purpose**: Development aids, testing utilities, documentation tools  
**Distribution**: Developer-focused applications and utilities

#### Community Resources (apps/community/)

**Audience**: Both translators and developers  
**Purpose**: Blogs, documentation sites, community tools  
**Distribution**: Public websites, community platforms

#### Demo Applications (apps/demos/)  

**Audience**: Both translators and developers  
**Purpose**: Showcase capabilities, provide examples, tutorials  
**Distribution**: Online demos, example implementations

### Building and Testing

```bash
# Build all projects
npm run build:all

# Test translation apps
npm run test:apps

# Test libraries  
npm run test:libs

# End-to-end testing
npm run test:e2e
```

### Publishing

#### For Library Authors

```bash
# Test locally
npm run local-registry
npm run publish:local --name=<library-name>

# Publish to npm
npm run publish:npm --name=<library-name>
```

#### For Application Deployment

```bash
# Build for distribution
npm run build:apps

# Deploy web applications
npm run deploy:web

# Package desktop applications
npm run package:desktop

# Build mobile applications
npm run build:mobile
```

## Distribution Strategy

### Free Applications for Translators

- **Web Applications**: Hosted at bt-toolkit.org
- **Desktop Applications**: Downloadable installers for Windows, Mac, Linux
- **Mobile Applications**: iOS and Android apps
- **Self-Hosted**: Docker containers for local deployment
- **Offline Capable**: Progressive Web Apps with offline functionality

### OCE Component Libraries

- **npm Registry**: All OCE components published to npm with `@bt-toolkit/` scope
- **Component Registry**: Searchable catalog of all OCE-compatible components
- **CDN Distribution**: Browser-compatible builds available via CDN
- **Multi-Framework Support**: Components available for React, Vue, Angular, and vanilla JS
- **Documentation**: Comprehensive API docs with integration examples
- **TypeScript Support**: Full TypeScript definitions with OCE interface specifications
- **Semantic Versioning**: Strict semver with compatibility guarantees
- **Quality Assurance**: All components undergo OCE compatibility testing

## Community and Support

### For Translation Teams

- **User Documentation**: Step-by-step guides and tutorials
- **Video Tutorials**: Screen recordings and training materials
- **Community Forum**: Support and discussion forums
- **Training Workshops**: Online and in-person training sessions
- **Multi-language Support**: Interface localization for global users

### For Developers & OCE Contributors

- **API Documentation**: Comprehensive technical documentation for all OCE components
- **Code Examples**: Real-world implementation examples and integration patterns
- **OCE Standards**: Guidelines for creating OCE-compatible components
- **Contributing Guide**: How to contribute to the ecosystem and OCE specifications
- **Developer Discord**: Real-time support and discussion with the OCE community
- **Component Registry**: Discover and share OCE-compatible components
- **Plugin Architecture**: Extensibility guides and templates for OCE integration

## Getting Started

### I'm a Bible Translator

1. Visit [bt-toolkit.org](https://bt-toolkit.org) to try web applications
2. Download desktop applications for your platform
3. Follow the [Translator's Guide](./docs/translators-guide.md)
4. Join our [community forum](https://community.bt-toolkit.org)
5. Access [training resources](https://learn.bt-toolkit.org)

### I'm a Developer  

1. Explore our [OCE Component Documentation](https://docs.bt-toolkit.org/oce)
2. Try the [OCE Quick Start Tutorial](./docs/oce-quickstart.md)
3. Browse [OCE integration examples](./apps/demos/)
4. Join our [OCE Developer Discord](https://discord.gg/bt-toolkit-oce)
5. Read the [OCE Component Standards](./docs/oce-standards.md)
6. Check the [contribution guide](./CONTRIBUTING.md) and [OCE governance](./docs/oce-governance.md)

## Available Scripts

### Project Creation

- `npm run create` - Interactive project creator (apps + OCE components)
- `npm run create:app:translation-tool` - Translation application
- `npm run create:lib:core` - OCE core functionality library  
- `npm run create:lib:components` - OCE UI component library
- `npm run create:lib:format` - OCE file format library
- `npm run create:lib:analysis` - OCE analysis library

### Development

- `npm run dev` - Start development servers
- `npm run build:all` - Build all projects
- `npm run test:all` - Run all tests
- `npm run graph` - View dependency graph

### Distribution

- `npm run deploy:apps` - Deploy applications
- `npm run publish:libs` - Publish libraries
- `npm run package:desktop` - Package desktop apps
- `npm run local-registry` - Local testing registry

## Contributing

We welcome contributions from both translation experts and software developers to build the **Open Components Ecosystem**:

### 🌍 **Translation Community**

- **Translation Feedback**: Help us understand translator needs and workflows
- **User Testing**: Test applications with real translation projects  
- **Localization**: Translate interfaces to local languages
- **Training**: Help create documentation and training materials

### 🛠️ **Developer Community**  

- **OCE Components**: Build new components following OCE standards
- **Integration Examples**: Show how OCE components work together
- **Documentation**: Enhance API docs and integration guides
- **Standards Development**: Help evolve OCE specifications and best practices
- **Quality Assurance**: Test component compatibility and performance

### 🤝 **OCE Governance**

- **Component Standards**: Participate in defining OCE interface specifications
- **Compatibility Testing**: Help ensure components work across different tools
- **Community Guidelines**: Shape how the OCE community operates and grows

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [OCE Governance](./docs/oce-governance.md) for detailed guidelines.

## License

**OCE Components/Libraries**: MIT License - Maximum freedom for developers  
**Translation Applications**: Apache 2.0 License - Free forever for translation work  
**OCE Specifications**: Creative Commons - Open standards for the community

---

**Empowering Bible Translation Through Technology**  
🌍📖✨ **Building the Open Components Ecosystem** 🔧🌐
