# Panel System Tutorial: Building a Mobile-First Two-Panel Bible Translation UI

This tutorial demonstrates how to use the Bible Translation Toolkit Panel System to create a mobile-first, interactive two-panel interface for Bible translation work.

## 🎯 What We'll Build

A vertical two-panel mobile interface where:
- **Top Panel**: Shows ULT (Unlocked Literal Text) or UST (Unlocked Simplified Text)
- **Bottom Panel**: Shows Translation Notes (TN) or other resources
- **Interactive Features**: 
  - Click words in ULT/UST to highlight related content
  - Click Greek quotes in Translation Notes to highlight corresponding words
  - Seamless panel switching and resource coordination

## 📱 Mobile-First Design

```
┌─────────────────────┐
│   Header & Controls │
├─────────────────────┤
│                     │
│    Top Panel        │
│   (ULT/UST Text)    │
│                     │
├─────────────────────┤
│                     │
│   Bottom Panel      │
│ (Translation Notes) │
│                     │
└─────────────────────┘
```

## 🚀 Step 1: Setup Panel System Provider

First, wrap your app with the Panel System Provider:

```tsx
// App.tsx
import React from 'react';
import { PanelSystemProvider } from './panel-system/react';
import { TwoPanelTranslationUI } from './components/TwoPanelTranslationUI';

function App() {
  return (
    <PanelSystemProvider
      config={{
        // Panel system configuration
        signalBus: {
          enableHistory: true,
          maxHistorySize: 100
        },
        enableCleanupTracking: true,
        enablePerformanceMetrics: true,
        // DI configuration for React
        di: {
          framework: 'react',
          enableLogging: true,
          platformFeatures: {
            navigation: true,
            storage: true,
            notifications: true
          }
        }
      }}
      onInitialized={(system) => {
        console.log('Panel System initialized:', system);
      }}
      onError={(error) => {
        console.error('Panel System error:', error);
      }}
    >
      <TwoPanelTranslationUI />
    </PanelSystemProvider>
  );
}

export default App;
```

## 🏗️ Step 2: Create the Two-Panel Layout Component

```tsx
// components/TwoPanelTranslationUI.tsx
import React, { useState, useCallback } from 'react';
import { usePanelSystem } from '../panel-system/react';
import { PanelContainer } from '../panel-system/react';
import { mockBookResources, getVerseByReference, getNotesForVerse } from '../data/mockData';
import { SIGNAL_TYPES } from '../panel-system/signals/SignalTypes';
import type { AlignedWord } from '../types';

type ResourceType = 'ult' | 'ust' | 'tn' | 'alignment';

export function TwoPanelTranslationUI() {
  const { panelManager, signalBus } = usePanelSystem();
  
  // Panel state
  const [topResource, setTopResource] = useState<ResourceType>('ult');
  const [bottomResource, setBottomResource] = useState<ResourceType>('tn');
  const [highlightedStrongs, setHighlightedStrongs] = useState<string[]>([]);
  
  // Get verse data
  const currentReference = '1:1';
  const ultVerse = getVerseByReference(mockBookResources.ult, currentReference);
  const ustVerse = getVerseByReference(mockBookResources.ust, currentReference);
  const notes = getNotesForVerse(mockBookResources.tn, currentReference);

  // Handle word clicks in ULT/UST
  const handleWordClick = useCallback(async (
    word: AlignedWord, 
    index: number, 
    sourcePanel: 'top' | 'bottom'
  ) => {
    if (!word.alignment) return;

    console.log('Word clicked:', word.text, 'from', sourcePanel);

    // Switch opposite panel to alignment view if not already showing notes
    const targetPanel = sourcePanel === 'top' ? 'bottom' : 'top';
    const targetResource = sourcePanel === 'top' ? bottomResource : topResource;
    
    if (targetResource !== 'tn') {
      if (sourcePanel === 'top') {
        setBottomResource('tn');
      } else {
        setTopResource('tn');
      }
    }

    // Emit signal to highlight related content
    await signalBus.emit({
      type: SIGNAL_TYPES.WORD_CLICKED,
      source: {
        panelId: `${sourcePanel}-panel`,
        resourceId: `${sourcePanel === 'top' ? topResource : bottomResource}-resource`
      },
      target: {
        panelId: `${targetPanel}-panel`,
        resourceId: 'tn-resource'
      },
      payload: {
        word: word.text,
        alignment: word.alignment,
        wordIndex: index,
        verseRef: currentReference,
        strong: word.alignment.strong
      }
    });

    // Highlight words with same Strong's number
    setHighlightedStrongs([word.alignment.strong]);
  }, [signalBus, topResource, bottomResource, currentReference]);

  // Handle quote hover in Translation Notes
  const handleQuoteHover = useCallback((quote: string, isHovering: boolean) => {
    if (!isHovering) {
      setHighlightedStrongs([]);
      return;
    }

    // Find Strong's numbers for words matching this quote
    const matchingStrongs: string[] = [];
    
    [ultVerse, ustVerse].forEach(verse => {
      verse?.words.forEach(word => {
        if (word.alignment && word.alignment.content === quote) {
          matchingStrongs.push(word.alignment.strong);
        }
      });
    });

    setHighlightedStrongs([...new Set(matchingStrongs)]);
  }, [ultVerse, ustVerse]);

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Romans {currentReference}</h1>
            <p className="text-sm text-gray-500">Bible Translation Review</p>
          </div>
          <div className="flex gap-2">
            <ResourceSelector
              value={topResource}
              onChange={setTopResource}
              label="Top"
            />
            <ResourceSelector
              value={bottomResource}
              onChange={setBottomResource}
              label="Bottom"
            />
          </div>
        </div>
      </header>

      {/* Two Panel Layout */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Top Panel */}
        <div className="flex-1 border-b border-gray-200">
          <PanelContainer
            panelId="top-panel"
            className="h-full"
            config={{
              id: 'top-panel',
              type: 'resource-viewer',
              title: `Top Panel - ${topResource.toUpperCase()}`,
              layout: 'SINGLE' as any,
              visibility: 'VISIBLE' as any
            }}
            renderContent={() => (
              <ResourceViewer
                resourceType={topResource}
                verse={topResource === 'ult' ? ultVerse : ustVerse}
                notes={notes}
                highlightedStrongs={highlightedStrongs}
                onWordClick={(word, index) => handleWordClick(word, index, 'top')}
                onQuoteHover={handleQuoteHover}
              />
            )}
          />
        </div>

        {/* Bottom Panel */}
        <div className="flex-1">
          <PanelContainer
            panelId="bottom-panel"
            className="h-full"
            config={{
              id: 'bottom-panel',
              type: 'resource-viewer',
              title: `Bottom Panel - ${bottomResource.toUpperCase()}`,
              layout: 'SINGLE' as any,
              visibility: 'VISIBLE' as any
            }}
            renderContent={() => (
              <ResourceViewer
                resourceType={bottomResource}
                verse={bottomResource === 'ult' ? ultVerse : ustVerse}
                notes={notes}
                highlightedStrongs={highlightedStrongs}
                onWordClick={(word, index) => handleWordClick(word, index, 'bottom')}
                onQuoteHover={handleQuoteHover}
              />
            )}
          />
        </div>
      </div>
    </div>
  );
}
```

## 🎨 Step 3: Create Resource Selector Component

```tsx
// components/ResourceSelector.tsx
import React from 'react';

type ResourceType = 'ult' | 'ust' | 'tn' | 'alignment';

interface ResourceSelectorProps {
  value: ResourceType;
  onChange: (resource: ResourceType) => void;
  label: string;
}

export function ResourceSelector({ value, onChange, label }: ResourceSelectorProps) {
  const resources = [
    { id: 'ult', name: 'ULT', color: 'bg-blue-100 text-blue-800' },
    { id: 'ust', name: 'UST', color: 'bg-green-100 text-green-800' },
    { id: 'tn', name: 'TN', color: 'bg-purple-100 text-purple-800' },
    { id: 'alignment', name: 'Align', color: 'bg-orange-100 text-orange-800' }
  ];

  return (
    <div className="flex flex-col items-center">
      <label className="text-xs text-gray-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ResourceType)}
        className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        {resources.map(resource => (
          <option key={resource.id} value={resource.id}>
            {resource.name}
          </option>
        ))}
      </select>
    </div>
  );
}
```

## 📖 Step 4: Create Resource Viewer Component

```tsx
// components/ResourceViewer.tsx
import React from 'react';
import type { VerseText, TranslationNote, AlignedWord } from '../types';

interface ResourceViewerProps {
  resourceType: 'ult' | 'ust' | 'tn' | 'alignment';
  verse?: VerseText;
  notes?: TranslationNote[];
  highlightedStrongs: string[];
  onWordClick: (word: AlignedWord, index: number) => void;
  onQuoteHover: (quote: string, isHovering: boolean) => void;
}

export function ResourceViewer({
  resourceType,
  verse,
  notes,
  highlightedStrongs,
  onWordClick,
  onQuoteHover
}: ResourceViewerProps) {
  if (resourceType === 'tn') {
    return <TranslationNotesView notes={notes || []} onQuoteHover={onQuoteHover} />;
  }

  if (resourceType === 'alignment') {
    return <AlignmentView verse={verse} highlightedStrongs={highlightedStrongs} />;
  }

  return (
    <VerseTextView
      verse={verse}
      resourceType={resourceType}
      highlightedStrongs={highlightedStrongs}
      onWordClick={onWordClick}
    />
  );
}

// Verse Text Component (ULT/UST)
function VerseTextView({
  verse,
  resourceType,
  highlightedStrongs,
  onWordClick
}: {
  verse?: VerseText;
  resourceType: string;
  highlightedStrongs: string[];
  onWordClick: (word: AlignedWord, index: number) => void;
}) {
  if (!verse) {
    return (
      <div className="p-4 text-center text-gray-500">
        No verse data available
      </div>
    );
  }

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {resourceType.toUpperCase()} - Romans {verse.reference}
        </h3>
        <div className="h-px bg-gray-200"></div>
      </div>
      
      <div className="text-lg leading-relaxed">
        {verse.words.map((word, index) => {
          const isHighlighted = word.alignment && 
            highlightedStrongs.includes(word.alignment.strong);
          const isClickable = !!word.alignment;

          return (
            <span
              key={index}
              className={`
                ${isClickable ? 'cursor-pointer hover:bg-blue-100 rounded px-1' : ''}
                ${isHighlighted ? 'bg-yellow-200 font-semibold' : ''}
                transition-colors duration-200
              `}
              onClick={() => isClickable && onWordClick(word, index)}
              title={word.alignment ? 
                `${word.alignment.lemma} (${word.alignment.strong})` : 
                undefined
              }
            >
              {word.text}
              {index < verse.words.length - 1 ? ' ' : ''}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// Translation Notes Component
function TranslationNotesView({
  notes,
  onQuoteHover
}: {
  notes: TranslationNote[];
  onQuoteHover: (quote: string, isHovering: boolean) => void;
}) {
  if (notes.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No translation notes available
      </div>
    );
  }

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Translation Notes
        </h3>
        <div className="h-px bg-gray-200"></div>
      </div>
      
      <div className="space-y-4">
        {notes.map((note) => (
          <div key={note.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="mb-2">
              <span
                className="inline-block bg-blue-100 text-blue-800 text-sm font-mono px-2 py-1 rounded cursor-pointer hover:bg-blue-200 transition-colors"
                onMouseEnter={() => onQuoteHover(note.quote, true)}
                onMouseLeave={() => onQuoteHover(note.quote, false)}
                title="Hover to highlight related words"
              >
                {note.quote}
              </span>
            </div>
            <div 
              className="text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: note.note.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
              }}
            />
            {note.supportReference && (
              <div className="mt-2 text-xs text-gray-500">
                Reference: {note.supportReference}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Alignment View Component
function AlignmentView({
  verse,
  highlightedStrongs
}: {
  verse?: VerseText;
  highlightedStrongs: string[];
}) {
  if (!verse) {
    return (
      <div className="p-4 text-center text-gray-500">
        No alignment data available
      </div>
    );
  }

  const alignedWords = verse.words.filter(word => word.alignment);

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Word Alignment
        </h3>
        <div className="h-px bg-gray-200"></div>
      </div>
      
      <div className="space-y-3">
        {alignedWords.map((word, index) => {
          const isHighlighted = highlightedStrongs.includes(word.alignment!.strong);
          
          return (
            <div 
              key={index}
              className={`
                p-3 rounded-lg border transition-colors duration-200
                ${isHighlighted ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-200'}
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900">{word.text}</span>
                <span className="text-sm text-gray-500 font-mono">
                  {word.alignment!.strong}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                <div><strong>Greek:</strong> {word.alignment!.lemma}</div>
                <div><strong>Content:</strong> {word.alignment!.content}</div>
                <div><strong>Morphology:</strong> {word.alignment!.morph}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

## 🎯 Step 5: Add Signal Handling for Advanced Interactions

```tsx
// hooks/useTranslationSignals.ts
import { useEffect, useCallback } from 'react';
import { useSignalBus } from '../panel-system/react';
import { SIGNAL_TYPES } from '../panel-system/signals/SignalTypes';

export function useTranslationSignals() {
  const { signalBus } = useSignalBus();

  // Listen for word click signals
  useEffect(() => {
    const unsubscribe = signalBus.onGlobal(SIGNAL_TYPES.WORD_CLICKED, (signal) => {
      console.log('Word clicked signal received:', signal.payload);
      
      // Handle cross-panel word highlighting
      if (signal.payload?.strong) {
        // Emit highlighting signal to all panels
        signalBus.emit({
          type: SIGNAL_TYPES.SET_HIGHLIGHTING,
          source: signal.source,
          payload: {
            key: 'word-alignment',
            strongs: [signal.payload.strong],
            verseRef: signal.payload.verseRef
          }
        });
      }
    });

    return unsubscribe;
  }, [signalBus]);

  // Listen for quote hover signals
  useEffect(() => {
    const unsubscribe = signalBus.onGlobal(SIGNAL_TYPES.QUOTE_HOVERED, (signal) => {
      console.log('Quote hovered signal received:', signal.payload);
      
      // Handle quote-based highlighting
      if (signal.payload?.quote) {
        signalBus.emit({
          type: SIGNAL_TYPES.SET_HIGHLIGHTING,
          source: signal.source,
          payload: {
            key: 'quote-highlight',
            quote: signal.payload.quote,
            isHovering: signal.payload.isHovering
          }
        });
      }
    });

    return unsubscribe;
  }, [signalBus]);

  return {
    emitWordClick: useCallback((wordData: any) => {
      signalBus.emit({
        type: SIGNAL_TYPES.WORD_CLICKED,
        source: { panelId: 'user-interaction', resourceId: 'word-click' },
        payload: wordData
      });
    }, [signalBus]),

    emitQuoteHover: useCallback((quoteData: any) => {
      signalBus.emit({
        type: SIGNAL_TYPES.QUOTE_HOVERED,
        source: { panelId: 'user-interaction', resourceId: 'quote-hover' },
        payload: quoteData
      });
    }, [signalBus])
  };
}
```

## 📱 Step 6: Mobile-Responsive Styling

```css
/* styles/mobile-panels.css */

/* Mobile-first responsive design */
.two-panel-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Panel transitions */
.panel-container {
  transition: all 0.3s ease-in-out;
}

/* Touch-friendly interactions */
.clickable-word {
  min-height: 44px; /* iOS touch target minimum */
  display: inline-flex;
  align-items: center;
  padding: 2px 4px;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
}

.clickable-word:hover,
.clickable-word:focus {
  background-color: rgba(59, 130, 246, 0.1);
  outline: 2px solid rgba(59, 130, 246, 0.3);
}

/* Highlighted words */
.highlighted-word {
  background-color: rgba(251, 191, 36, 0.3);
  font-weight: 600;
  animation: highlight-pulse 0.5s ease-in-out;
}

@keyframes highlight-pulse {
  0% { background-color: rgba(251, 191, 36, 0.6); }
  100% { background-color: rgba(251, 191, 36, 0.3); }
}

/* Translation notes styling */
.translation-note {
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  margin-bottom: 16px;
  overflow: hidden;
}

.greek-quote {
  background-color: rgba(59, 130, 246, 0.1);
  color: rgba(59, 130, 246, 0.8);
  padding: 4px 8px;
  border-radius: 4px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
  cursor: pointer;
  transition: all 0.2s ease;
}

.greek-quote:hover {
  background-color: rgba(59, 130, 246, 0.2);
  transform: translateY(-1px);
}

/* Responsive breakpoints */
@media (min-width: 768px) {
  .two-panel-container {
    flex-direction: row;
  }
  
  .panel-container {
    flex: 1;
    border-right: 1px solid #e5e7eb;
  }
  
  .panel-container:last-child {
    border-right: none;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .panel-container {
    background-color: #1f2937;
    color: #f9fafb;
  }
  
  .translation-note {
    background-color: #374151;
    border-color: #4b5563;
  }
  
  .highlighted-word {
    background-color: rgba(251, 191, 36, 0.4);
  }
}
```

## 🚀 Step 7: Usage Example

```tsx
// Complete usage example
import React from 'react';
import { PanelSystemProvider } from './panel-system/react';
import { TwoPanelTranslationUI } from './components/TwoPanelTranslationUI';
import './styles/mobile-panels.css';

function TranslationApp() {
  return (
    <PanelSystemProvider
      config={{
        signalBus: {
          enableHistory: true,
          maxHistorySize: 50
        },
        enableCleanupTracking: true,
        di: {
          framework: 'react',
          enableLogging: process.env.NODE_ENV === 'development'
        }
      }}
    >
      <TwoPanelTranslationUI />
    </PanelSystemProvider>
  );
}

export default TranslationApp;
```

## ✨ Key Features Implemented

### 🎯 Interactive Word Clicking
- Click any word in ULT/UST to see alignment data
- Automatic panel switching to show relevant information
- Cross-panel highlighting based on Strong's numbers

### 🔍 Quote-Based Highlighting  
- Hover over Greek quotes in Translation Notes
- Automatically highlights corresponding words in ULT/UST
- Visual feedback with smooth animations

### 📱 Mobile-First Design
- Vertical stacking on mobile devices
- Touch-friendly interaction targets (44px minimum)
- Smooth transitions and responsive layout
- Horizontal layout on tablets/desktop

### 🔄 Signal-Driven Architecture
- Decoupled component communication
- Event-driven interactions between panels
- Extensible for additional features

### 🎨 Modern UI/UX
- Clean, accessible design
- Smooth animations and transitions
- Dark mode support
- Professional typography and spacing

## 🔧 Customization Options

### Panel Configuration
```tsx
// Custom panel configurations
const customPanelConfig = {
  topPanel: {
    defaultResource: 'ult',
    allowedResources: ['ult', 'ust'],
    showHeader: true,
    enableWordClick: true
  },
  bottomPanel: {
    defaultResource: 'tn',
    allowedResources: ['tn', 'alignment'],
    showHeader: true,
    enableQuoteHover: true
  }
};
```

### Signal Customization
```tsx
// Custom signal handlers
const customSignalHandlers = {
  onWordClick: (payload) => {
    // Custom word click logic
    console.log('Custom word click:', payload);
  },
  onQuoteHover: (payload) => {
    // Custom quote hover logic
    console.log('Custom quote hover:', payload);
  }
};
```

This tutorial provides a complete foundation for building interactive Bible translation interfaces using the Panel System. The modular architecture allows for easy extension and customization based on specific translation workflow needs. 