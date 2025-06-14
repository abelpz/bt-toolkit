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

    // Switch opposite panel to notes if not already showing
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

This tutorial provides a complete foundation for building interactive Bible translation interfaces using the Panel System. The modular architecture allows for easy extension and customization based on specific translation workflow needs. 