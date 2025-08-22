# Technical Specifications

## 🏗️ **System Architecture**

### **Application Structure**
```
bt-toolkit/
├── apps/
│   └── translation-tools/
│       └── bible-translator/          # 🆕 NEW APP
│           ├── src/
│           │   ├── components/        # React components
│           │   ├── hooks/            # Custom React hooks
│           │   ├── stores/           # Zustand state management
│           │   ├── services/         # Business logic services
│           │   ├── utils/            # Utility functions
│           │   └── types/            # TypeScript type definitions
│           ├── public/               # Static assets
│           ├── package.json
│           ├── vite.config.ts
│           └── tsconfig.json
```

### **Technology Stack**

#### **Core Framework**
- **React 19**: Latest React with concurrent features
- **TypeScript 5.7+**: Full type safety
- **Vite**: Fast build tool with HMR
- **Nx**: Monorepo build orchestration

#### **State Management**
- **Zustand**: Lightweight state management (following bt-toolkit patterns)
- **Immer**: Immutable state updates
- **React Query/TanStack Query**: Server state management

#### **UI Framework**
- **Tailwind CSS**: Utility-first styling
- **Headless UI**: Accessible component primitives
- **React Hook Form**: Form management
- **Framer Motion**: Animations and transitions

#### **bt-toolkit Integration**
- **`@bt-toolkit/usfm-processor`**: Scripture processing
- **`@bt-toolkit/scripture-utils`**: Scripture utilities
- **`linked-panels`**: Multi-panel interface system

## 📊 **Data Architecture**

### **Data Flow**
```mermaid
graph TD
    A[USFM Files] --> B[@bt-toolkit/usfm-processor]
    B --> C[Processed Scripture Data]
    C --> D[Zustand Store]
    D --> E[React Components]
    
    F[External APIs] --> G[Service Layer]
    G --> D
    
    D --> H[IndexedDB]
    D --> I[Server Sync]
    
    J[User Actions] --> E
    E --> D
```

### **State Structure**
```typescript
interface AppState {
  // Project Management
  project: {
    id: string;
    name: string;
    sourceLanguage: string;
    targetLanguage: string;
    books: BookInfo[];
    settings: ProjectSettings;
  };
  
  // Scripture Data
  scripture: {
    currentBook: string;
    currentChapter: number;
    currentVerse: number;
    processedData: ProcessedScripture;
    translations: TranslationData;
    drafts: DraftData;
  };
  
  // UI State
  ui: {
    panels: PanelConfiguration;
    activePanel: string;
    sidebarOpen: boolean;
    theme: 'light' | 'dark';
    layout: LayoutMode;
  };
  
  // Collaboration
  collaboration: {
    users: User[];
    comments: Comment[];
    reviews: Review[];
    changes: ChangeHistory[];
  };
  
  // Resources
  resources: {
    translationQuestions: TQData;
    translationNotes: TNData;
    translationWords: TWData;
    externalResources: ResourceData[];
  };
}
```

### **Data Persistence**

#### **Local Storage (IndexedDB)**
```typescript
interface LocalDatabase {
  projects: Project[];
  scripture: {
    [projectId: string]: {
      [bookId: string]: ProcessedScripture;
    };
  };
  translations: {
    [projectId: string]: {
      [bookId: string]: TranslationData;
    };
  };
  drafts: DraftData[];
  userPreferences: UserPreferences;
  cache: {
    resources: ResourceCache;
    lastSync: timestamp;
  };
}
```

#### **Server Synchronization**
- **Conflict Resolution**: Last-write-wins with manual merge options
- **Incremental Sync**: Only sync changed data
- **Offline Queue**: Queue changes when offline, sync when online
- **Backup Strategy**: Automatic daily backups

## 🎨 **Component Architecture**

### **Component Hierarchy**
```
App
├── Layout
│   ├── Header
│   │   ├── ProjectSelector
│   │   ├── ProgressIndicator
│   │   └── UserMenu
│   ├── MainContent
│   │   └── LinkedPanelsContainer
│   │       ├── NavigationPanel
│   │       ├── SourceTextPanel
│   │       ├── TranslationPanel
│   │       └── ResourcesPanel
│   └── Footer
│       ├── StatusBar
│       ├── SyncIndicator
│       └── HelpButton
```

### **Key Components**

#### **LinkedPanelsContainer**
```typescript
import { LinkedPanelsContainer, createPlugin } from 'linked-panels';
import { scriptureNavigationPlugin } from './plugins/scriptureNavigation';

const TranslationWorkspace: React.FC = () => {
  const panelsConfig = {
    panels: [
      { id: 'navigation', component: NavigationPanel },
      { id: 'source', component: SourceTextPanel },
      { id: 'translation', component: TranslationPanel },
      { id: 'resources', component: ResourcesPanel }
    ],
    plugins: [scriptureNavigationPlugin],
    persistence: 'localStorage'
  };

  return <LinkedPanelsContainer config={panelsConfig} />;
};
```

#### **Scripture Processing Integration**
```typescript
import { processUSFM, getVerse, searchScripture } from '@bt-toolkit/usfm-processor';

const useScriptureData = (bookCode: string) => {
  const [scripture, setScripture] = useState<ProcessedScripture | null>(null);
  
  useEffect(() => {
    const loadScripture = async () => {
      const usfmContent = await loadUSFMFile(bookCode);
      const processed = await processUSFM(usfmContent, bookCode, getBookName(bookCode));
      setScripture(processed.structuredText);
    };
    
    loadScripture();
  }, [bookCode]);
  
  return {
    scripture,
    getVerse: (chapter: number, verse: number) => 
      scripture ? getVerse(scripture, chapter, verse) : null,
    searchText: (query: string) => 
      scripture ? searchScripture(scripture, query) : []
  };
};
```

## 🔌 **Service Layer**

### **Core Services**

#### **ScriptureService**
```typescript
class ScriptureService {
  async loadBook(projectId: string, bookCode: string): Promise<ProcessedScripture>;
  async saveTranslation(projectId: string, bookCode: string, data: TranslationData): Promise<void>;
  async exportUSFM(projectId: string, bookCode: string): Promise<string>;
  async importUSFM(projectId: string, usfmContent: string): Promise<void>;
}
```

#### **CollaborationService**
```typescript
class CollaborationService {
  async addComment(verseRef: string, comment: Comment): Promise<void>;
  async getComments(verseRef: string): Promise<Comment[]>;
  async submitForReview(bookCode: string, chapterNum: number): Promise<void>;
  async approveReview(reviewId: string): Promise<void>;
}
```

#### **ResourceService**
```typescript
class ResourceService {
  async loadTranslationQuestions(bookCode: string): Promise<TQData>;
  async loadTranslationNotes(bookCode: string): Promise<TNData>;
  async searchResources(query: string): Promise<ResourceSearchResult[]>;
  async cacheResource(resourceId: string): Promise<void>;
}
```

#### **SyncService**
```typescript
class SyncService {
  async syncProject(projectId: string): Promise<SyncResult>;
  async pushChanges(changes: ChangeSet[]): Promise<void>;
  async pullChanges(): Promise<ChangeSet[]>;
  async resolveConflicts(conflicts: Conflict[]): Promise<void>;
}
```

## 🎯 **Performance Requirements**

### **Loading Performance**
- **Initial Load**: < 3 seconds for app shell
- **Book Loading**: < 2 seconds for average book (50 chapters)
- **Chapter Navigation**: < 500ms between chapters
- **Verse Navigation**: < 200ms between verses

### **Memory Management**
- **Book Caching**: Keep 3 books in memory maximum
- **Lazy Loading**: Load chapters on demand
- **Image Optimization**: Compress and lazy-load images
- **Bundle Splitting**: Code splitting by feature

### **Optimization Strategies**
```typescript
// Lazy loading for large components
const TranslationEditor = lazy(() => import('./components/TranslationEditor'));
const ResourceViewer = lazy(() => import('./components/ResourceViewer'));

// Memoization for expensive operations
const processedVerses = useMemo(() => {
  return processVerseData(rawVerses);
}, [rawVerses]);

// Virtual scrolling for large lists
import { FixedSizeList as List } from 'react-window';

const VirtualizedVerseList: React.FC = ({ verses }) => (
  <List
    height={600}
    itemCount={verses.length}
    itemSize={80}
    itemData={verses}
  >
    {VerseRow}
  </List>
);
```

## 🔒 **Security & Data Protection**

### **Data Security**
- **Local Encryption**: Encrypt sensitive data in IndexedDB
- **Secure Transmission**: HTTPS for all API calls
- **Authentication**: JWT tokens with refresh mechanism
- **Authorization**: Role-based access control

### **Privacy Considerations**
- **Data Minimization**: Only store necessary data locally
- **User Consent**: Clear consent for data collection
- **Data Retention**: Automatic cleanup of old drafts
- **Export Control**: Users can export their data

## 🧪 **Testing Strategy**

### **Testing Pyramid**
```
    ┌─────────────────┐
    │   E2E Tests     │  ← Full user workflows
    │   (Playwright)  │
    ├─────────────────┤
    │ Integration     │  ← Component integration
    │ Tests (RTL)     │
    ├─────────────────┤
    │   Unit Tests    │  ← Individual functions
    │   (Vitest)     │
    └─────────────────┘
```

### **Test Configuration**
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'html', 'lcov'],
      threshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  }
});
```

### **Testing Utilities**
```typescript
// Test utilities for scripture data
export const createMockScripture = (bookCode: string): ProcessedScripture => ({
  book: getBookName(bookCode),
  bookCode,
  chapters: createMockChapters(bookCode),
  metadata: createMockMetadata(bookCode)
});

// Test utilities for user interactions
export const renderWithProviders = (
  ui: React.ReactElement,
  options?: RenderOptions
) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClient>
      <LinkedPanelsProvider>
        {children}
      </LinkedPanelsProvider>
    </QueryClient>
  );
  
  return render(ui, { wrapper: Wrapper, ...options });
};
```

## 📱 **Cross-Platform Considerations**

### **Web Application**
- **Progressive Web App**: Service worker for offline functionality
- **Responsive Design**: Mobile-first approach
- **Browser Support**: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+)

### **Potential Mobile App**
- **React Native**: Shared codebase with web
- **Native Modules**: Platform-specific functionality
- **Offline Sync**: Robust offline capabilities

### **Desktop Application**
- **Electron**: Potential desktop wrapper
- **Native Integration**: File system access, notifications
- **Performance**: Native-level performance

## 🔧 **Build & Deployment**

### **Development Workflow**
```bash
# Development
pnpm dev                    # Start dev server
pnpm test                   # Run tests
pnpm test:watch            # Watch mode testing
pnpm lint                  # Lint code
pnpm type-check           # TypeScript checking

# Production
pnpm build                 # Build for production
pnpm preview              # Preview production build
pnpm test:e2e             # End-to-end tests
```

### **Nx Integration**
```json
// project.json
{
  "name": "bible-translator",
  "targets": {
    "build": {
      "executor": "@nx/vite:build",
      "options": {
        "outputPath": "dist/apps/translation-tools/bible-translator"
      }
    },
    "serve": {
      "executor": "@nx/vite:dev-server"
    },
    "test": {
      "executor": "@nx/vite:test"
    }
  },
  "tags": ["type:app", "scope:translation-tools"]
}
```

### **Deployment Strategy**
- **Static Hosting**: Vercel, Netlify, or similar
- **CDN**: Global content delivery
- **Environment Variables**: Configuration management
- **Monitoring**: Error tracking and performance monitoring

## 🔗 **API Integration**

### **Door43 DCS API**
```typescript
interface Door43Service {
  searchRepositories(query: string): Promise<Repository[]>;
  getRepository(owner: string, repo: string): Promise<Repository>;
  getFileContent(owner: string, repo: string, path: string): Promise<string>;
  listReleases(owner: string, repo: string): Promise<Release[]>;
}
```

### **Resource APIs**
```typescript
interface ResourceAPI {
  getTranslationQuestions(lang: string, book: string): Promise<TQData>;
  getTranslationNotes(lang: string, book: string): Promise<TNData>;
  getTranslationWords(lang: string): Promise<TWData>;
  getAlignmentData(lang: string, book: string): Promise<AlignmentData>;
}
```

---

**Next Steps**: Implement the core application structure and begin with the MVP features as outlined in the app requirements.
