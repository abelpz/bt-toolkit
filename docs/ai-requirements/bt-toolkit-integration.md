# BT-Toolkit Integration Guide

## 🎯 **Overview**

This guide provides comprehensive instructions for integrating with bt-toolkit packages and following monorepo patterns when developing Bible translation applications.

## 📦 **Available Packages**

### **Scripture Processing**
```typescript
// @bt-toolkit/usfm-processor
import { 
  processUSFM, 
  processUSFMSimple,
  USFMProcessor,
  getVerse,
  getVerseRange,
  formatVerses,
  searchScripture,
  getBookStatistics
} from '@bt-toolkit/usfm-processor';

// @bt-toolkit/scripture-utils  
import { 
  scriptureUtils 
} from '@bt-toolkit/scripture-utils';
```

### **UI Components**
```typescript
// linked-panels
import { 
  LinkedPanelsContainer,
  LinkedPanel,
  createPlugin,
  useLinkedPanelsStore,
  useResourceAPI
} from 'linked-panels';
```

## 🏗️ **Project Structure**

### **Recommended App Structure**
```
apps/translation-tools/bible-translator/
├── src/
│   ├── components/
│   │   ├── panels/              # Panel components for linked-panels
│   │   │   ├── NavigationPanel.tsx
│   │   │   ├── SourceTextPanel.tsx
│   │   │   ├── TranslationPanel.tsx
│   │   │   └── ResourcesPanel.tsx
│   │   ├── scripture/           # Scripture-specific components
│   │   │   ├── VerseEditor.tsx
│   │   │   ├── ChapterView.tsx
│   │   │   └── BookNavigator.tsx
│   │   ├── ui/                  # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   └── layout/              # Layout components
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       └── Footer.tsx
│   ├── hooks/                   # Custom React hooks
│   │   ├── useScripture.ts
│   │   ├── useTranslation.ts
│   │   └── useCollaboration.ts
│   ├── stores/                  # Zustand state stores
│   │   ├── scriptureStore.ts
│   │   ├── uiStore.ts
│   │   └── projectStore.ts
│   ├── services/                # Business logic services
│   │   ├── scriptureService.ts
│   │   ├── resourceService.ts
│   │   └── syncService.ts
│   ├── utils/                   # Utility functions
│   │   ├── scriptureUtils.ts
│   │   ├── formatters.ts
│   │   └── validators.ts
│   ├── types/                   # TypeScript definitions
│   │   ├── scripture.ts
│   │   ├── translation.ts
│   │   └── api.ts
│   ├── plugins/                 # Linked-panels plugins
│   │   ├── scriptureNavigation.ts
│   │   └── translationSync.ts
│   └── App.tsx
├── public/
├── package.json
├── vite.config.ts
├── tsconfig.json
└── project.json                 # Nx project configuration
```

## 🔌 **USFM Processor Integration**

### **Basic Scripture Processing**
```typescript
// hooks/useScripture.ts
import { useState, useEffect } from 'react';
import { processUSFM, ProcessedScripture } from '@bt-toolkit/usfm-processor';

export const useScripture = (usfmContent: string, bookCode: string, bookName: string) => {
  const [scripture, setScripture] = useState<ProcessedScripture | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processScripture = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await processUSFM(usfmContent, bookCode, bookName);
        setScripture(result.structuredText);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to process scripture');
      } finally {
        setLoading(false);
      }
    };

    if (usfmContent && bookCode && bookName) {
      processScripture();
    }
  }, [usfmContent, bookCode, bookName]);

  return { scripture, loading, error };
};
```

### **Advanced Scripture Operations**
```typescript
// services/scriptureService.ts
import { 
  processUSFM, 
  getVerse, 
  getVerseRange, 
  searchScripture,
  getBookStatistics,
  ProcessedScripture,
  Verse
} from '@bt-toolkit/usfm-processor';

export class ScriptureService {
  private cache = new Map<string, ProcessedScripture>();

  async loadBook(bookCode: string, usfmContent: string): Promise<ProcessedScripture> {
    const cacheKey = `${bookCode}:${this.hashContent(usfmContent)}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const result = await processUSFM(usfmContent, bookCode, this.getBookName(bookCode));
    const scripture = result.structuredText;
    
    this.cache.set(cacheKey, scripture);
    return scripture;
  }

  getVerse(scripture: ProcessedScripture, chapter: number, verse: number): Verse | null {
    return getVerse(scripture, chapter, verse);
  }

  getVerseRange(scripture: ProcessedScripture, chapter: number, range: string): Verse[] {
    return getVerseRange(scripture, chapter, range);
  }

  searchText(scripture: ProcessedScripture, query: string, caseSensitive = false): Verse[] {
    return searchScripture(scripture, query, caseSensitive);
  }

  getStatistics(scripture: ProcessedScripture) {
    return getBookStatistics(scripture);
  }

  private hashContent(content: string): string {
    // Simple hash for caching
    return btoa(content).slice(0, 16);
  }

  private getBookName(bookCode: string): string {
    const bookNames: Record<string, string> = {
      'GEN': 'Genesis',
      'EXO': 'Exodus',
      'JON': 'Jonah',
      // Add more as needed
    };
    return bookNames[bookCode] || bookCode;
  }
}
```

## 🎛️ **Linked Panels Integration**

### **Panel Configuration**
```typescript
// components/TranslationWorkspace.tsx
import React from 'react';
import { LinkedPanelsContainer, PanelConfig } from 'linked-panels';
import { NavigationPanel } from './panels/NavigationPanel';
import { SourceTextPanel } from './panels/SourceTextPanel';
import { TranslationPanel } from './panels/TranslationPanel';
import { ResourcesPanel } from './panels/ResourcesPanel';
import { scriptureNavigationPlugin } from '../plugins/scriptureNavigation';

const TranslationWorkspace: React.FC = () => {
  const panelsConfig: PanelConfig = {
    panels: [
      {
        id: 'navigation',
        title: 'Navigation',
        component: NavigationPanel,
        defaultSize: 250,
        minSize: 200,
        maxSize: 400,
        resizable: true,
        collapsible: true
      },
      {
        id: 'source',
        title: 'Source Text',
        component: SourceTextPanel,
        defaultSize: 400,
        minSize: 300,
        resizable: true
      },
      {
        id: 'translation',
        title: 'Translation',
        component: TranslationPanel,
        defaultSize: 500,
        minSize: 400,
        resizable: true
      },
      {
        id: 'resources',
        title: 'Resources',
        component: ResourcesPanel,
        defaultSize: 300,
        minSize: 250,
        resizable: true,
        collapsible: true
      }
    ],
    layout: 'horizontal',
    plugins: [scriptureNavigationPlugin],
    persistence: {
      key: 'bible-translator-panels',
      storage: 'localStorage'
    }
  };

  return (
    <div className="h-full">
      <LinkedPanelsContainer config={panelsConfig} />
    </div>
  );
};
```

### **Custom Panel Components**
```typescript
// components/panels/NavigationPanel.tsx
import React from 'react';
import { LinkedPanelRenderProps } from 'linked-panels';
import { useScriptureStore } from '../../stores/scriptureStore';

export const NavigationPanel: React.FC<LinkedPanelRenderProps> = ({ 
  panelId, 
  sendMessage, 
  messages 
}) => {
  const { currentBook, currentChapter, setCurrentVerse } = useScriptureStore();

  const handleVerseSelect = (verseNumber: number) => {
    setCurrentVerse(verseNumber);
    
    // Notify other panels of the verse change
    sendMessage({
      type: 'verse-selected',
      data: {
        book: currentBook,
        chapter: currentChapter,
        verse: verseNumber
      }
    });
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">Navigation</h3>
      {/* Navigation UI */}
    </div>
  );
};
```

### **Scripture Navigation Plugin**
```typescript
// plugins/scriptureNavigation.ts
import { createPlugin, MessageTypePlugin } from 'linked-panels';

interface ScriptureNavigationMessage {
  type: 'verse-selected' | 'chapter-changed' | 'book-changed';
  data: {
    book: string;
    chapter: number;
    verse?: number;
  };
}

export const scriptureNavigationPlugin = createPlugin<ScriptureNavigationMessage>({
  name: 'scripture-navigation',
  version: '1.0.0',
  
  messageHandlers: {
    'verse-selected': (message, context) => {
      // Handle verse selection across all panels
      context.broadcastToOtherPanels(message);
    },
    
    'chapter-changed': (message, context) => {
      // Handle chapter changes
      context.broadcastToOtherPanels(message);
    },
    
    'book-changed': (message, context) => {
      // Handle book changes
      context.broadcastToOtherPanels(message);
    }
  },
  
  panelEnhancers: {
    // Add scripture-specific functionality to panels
    addScriptureNavigation: (panel) => ({
      ...panel,
      scriptureContext: {
        navigateToVerse: (book: string, chapter: number, verse: number) => {
          panel.sendMessage({
            type: 'verse-selected',
            data: { book, chapter, verse }
          });
        }
      }
    })
  }
});
```

## 🗃️ **State Management with Zustand**

### **Scripture Store**
```typescript
// stores/scriptureStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { ProcessedScripture, Verse } from '@bt-toolkit/usfm-processor';
import { ScriptureService } from '../services/scriptureService';

interface ScriptureState {
  // Current navigation
  currentBook: string;
  currentChapter: number;
  currentVerse: number;
  
  // Scripture data
  loadedBooks: Map<string, ProcessedScripture>;
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Actions
  setCurrentBook: (book: string) => void;
  setCurrentChapter: (chapter: number) => void;
  setCurrentVerse: (verse: number) => void;
  loadBook: (bookCode: string, usfmContent: string) => Promise<void>;
  getCurrentVerse: () => Verse | null;
}

const scriptureService = new ScriptureService();

export const useScriptureStore = create<ScriptureState>()(
  immer((set, get) => ({
    // Initial state
    currentBook: 'GEN',
    currentChapter: 1,
    currentVerse: 1,
    loadedBooks: new Map(),
    loading: false,
    error: null,

    // Actions
    setCurrentBook: (book) => set((state) => {
      state.currentBook = book;
      state.currentChapter = 1;
      state.currentVerse = 1;
    }),

    setCurrentChapter: (chapter) => set((state) => {
      state.currentChapter = chapter;
      state.currentVerse = 1;
    }),

    setCurrentVerse: (verse) => set((state) => {
      state.currentVerse = verse;
    }),

    loadBook: async (bookCode, usfmContent) => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const scripture = await scriptureService.loadBook(bookCode, usfmContent);
        
        set((state) => {
          state.loadedBooks.set(bookCode, scripture);
          state.loading = false;
        });
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to load book';
          state.loading = false;
        });
      }
    },

    getCurrentVerse: () => {
      const { currentBook, currentChapter, currentVerse, loadedBooks } = get();
      const scripture = loadedBooks.get(currentBook);
      
      if (!scripture) return null;
      
      return scriptureService.getVerse(scripture, currentChapter, currentVerse);
    }
  }))
);
```

## 🎨 **UI Integration Patterns**

### **Responsive Panel Layout**
```typescript
// components/layout/ResponsiveLayout.tsx
import React, { useState, useEffect } from 'react';
import { LinkedPanelsContainer } from 'linked-panels';
import { useMediaQuery } from '../hooks/useMediaQuery';

export const ResponsiveLayout: React.FC = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  
  const getPanelConfig = () => {
    if (isMobile) {
      return {
        layout: 'tabs',
        panels: [
          { id: 'navigation', title: 'Nav' },
          { id: 'translation', title: 'Translation' },
          { id: 'resources', title: 'Resources' }
        ]
      };
    }
    
    if (isTablet) {
      return {
        layout: 'vertical',
        panels: [
          { id: 'source', title: 'Source' },
          { id: 'translation', title: 'Translation' }
        ]
      };
    }
    
    // Desktop layout
    return {
      layout: 'horizontal',
      panels: [
        { id: 'navigation', title: 'Navigation' },
        { id: 'source', title: 'Source' },
        { id: 'translation', title: 'Translation' },
        { id: 'resources', title: 'Resources' }
      ]
    };
  };

  return <LinkedPanelsContainer config={getPanelConfig()} />;
};
```

### **Scripture Display Components**
```typescript
// components/scripture/VerseDisplay.tsx
import React from 'react';
import { Verse } from '@bt-toolkit/usfm-processor';
import { formatVerses } from '@bt-toolkit/usfm-processor';

interface VerseDisplayProps {
  verse: Verse;
  showNumber?: boolean;
  editable?: boolean;
  onEdit?: (newText: string) => void;
}

export const VerseDisplay: React.FC<VerseDisplayProps> = ({
  verse,
  showNumber = true,
  editable = false,
  onEdit
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(verse.text);

  const handleSave = () => {
    onEdit?.(editText);
    setIsEditing(false);
  };

  return (
    <div className="verse-display p-2 border-l-2 border-blue-200">
      {showNumber && (
        <span className="verse-number text-sm text-gray-500 mr-2">
          {verse.number}
        </span>
      )}
      
      {isEditing && editable ? (
        <div className="edit-mode">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <div className="mt-2">
            <button onClick={handleSave} className="btn-primary mr-2">
              Save
            </button>
            <button onClick={() => setIsEditing(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <span 
          className={`verse-text ${editable ? 'cursor-pointer hover:bg-gray-100' : ''}`}
          onClick={() => editable && setIsEditing(true)}
        >
          {verse.text}
        </span>
      )}
    </div>
  );
};
```

## 🔧 **Build Configuration**

### **Nx Project Configuration**
```json
// project.json
{
  "name": "bible-translator",
  "$schema": "../../../node_modules/nx/schemas/project-schema.json",
  "projectType": "application",
  "sourceRoot": "apps/translation-tools/bible-translator/src",
  "targets": {
    "build": {
      "executor": "@nx/vite:build",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/apps/translation-tools/bible-translator"
      },
      "configurations": {
        "production": {
          "mode": "production"
        }
      }
    },
    "serve": {
      "executor": "@nx/vite:dev-server",
      "defaultConfiguration": "development",
      "options": {
        "buildTarget": "bible-translator:build"
      },
      "configurations": {
        "development": {
          "buildTarget": "bible-translator:build:development",
          "hmr": true
        }
      }
    },
    "test": {
      "executor": "@nx/vite:test",
      "outputs": ["{options.reportsDirectory}"],
      "options": {
        "passWithNoTests": true,
        "reportsDirectory": "../../../coverage/apps/translation-tools/bible-translator"
      }
    }
  },
  "tags": ["type:app", "scope:translation-tools"]
}
```

### **Vite Configuration**
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../../node_modules/.vite/apps/translation-tools/bible-translator',
  
  server: {
    port: 4200,
    host: 'localhost',
  },
  
  preview: {
    port: 4300,
    host: 'localhost',
  },
  
  plugins: [
    react(),
    nxViteTsPaths(),
  ],
  
  build: {
    outDir: '../../../dist/apps/translation-tools/bible-translator',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  
  optimizeDeps: {
    include: [
      '@bt-toolkit/usfm-processor',
      '@bt-toolkit/scripture-utils',
      'linked-panels'
    ]
  }
});
```

## 📚 **Best Practices**

### **1. Package Usage**
- ✅ **Always use TypeScript** for full type safety
- ✅ **Import specific functions** rather than entire packages
- ✅ **Cache processed scripture data** to avoid reprocessing
- ✅ **Handle errors gracefully** with proper error boundaries

### **2. Performance**
- ✅ **Lazy load large components** using React.lazy()
- ✅ **Memoize expensive operations** with useMemo/useCallback
- ✅ **Virtualize large lists** of verses or chapters
- ✅ **Implement proper loading states** for better UX

### **3. State Management**
- ✅ **Use Zustand for global state** following bt-toolkit patterns
- ✅ **Keep UI state separate** from business logic state
- ✅ **Implement proper error handling** in stores
- ✅ **Use immer for immutable updates**

### **4. Testing**
- ✅ **Test components with mock data** using scripture test utilities
- ✅ **Test panel interactions** with linked-panels test helpers
- ✅ **Mock external services** for reliable tests
- ✅ **Test responsive behavior** across different screen sizes

---

**Next Steps**: Use this guide to implement the Bible translation application, starting with the basic project structure and gradually adding features using the bt-toolkit packages.
