# Foundations BT Mobile Architecture

## 📱 **Overview**

The **Foundations BT** mobile app is a sophisticated offline Bible translation tool built using React Native Expo. It leverages the proven architecture from the `team-review` app, adapted specifically for mobile Bible translation workflows.

## 🏗️ **Architecture Components**

### **Core Modules**

#### 1. **Scripture Renderer** (`src/modules/scripture/ScriptureRenderer.tsx`)
- **Purpose**: Renders USFM-processed scripture text with interactive word highlighting
- **Features**:
  - USFM text processing using `@bt-toolkit/usfm-processor`
  - Word-level interaction (tap to highlight/analyze)
  - Verse navigation
  - Chapter/verse organization
  - Responsive text layout for mobile
- **Integration**: Communicates with other modules via linked panels messaging

#### 2. **Scripture Navigator** (`src/modules/navigation/ScriptureNavigator.tsx`)
- **Purpose**: Provides navigation controls for moving through scripture
- **Features**:
  - Book selector with Old/New Testament organization
  - Chapter selector with grid layout
  - Previous/Next navigation
  - Compact mode for embedded use
  - Modal interfaces optimized for mobile
- **Integration**: Updates current reference across all panels

#### 3. **Translation Notes Renderer** (`src/modules/notes/TranslationNotesRenderer.tsx`)
- **Purpose**: Displays translation notes with Greek word analysis
- **Features**:
  - Expandable note cards
  - Greek word extraction and display
  - Quote highlighting integration
  - Tag-based categorization
  - Full-screen note detail modal
- **Integration**: Highlights corresponding scripture text when notes are selected

### **Layout System**

#### **Linked Panels Layout** (`src/components/LinkedPanelsLayout.tsx`)
- **Purpose**: Orchestrates communication between modules using linked panels
- **Features**:
  - Top/bottom panel configuration
  - Resource switching between panels
  - Inter-panel messaging system
  - Responsive layout (portrait/landscape)
  - Panel resizing capabilities
- **Communication Types**:
  - `word-highlight`: Highlight words across panels
  - `verse-navigation`: Navigate to specific verses
  - `quote-highlight`: Highlight translation note quotes
  - `reference-change`: Update current scripture reference

## 🔧 **Technical Stack**

### **Core Technologies**
- **React Native**: Cross-platform mobile framework
- **Expo**: Development and deployment platform
- **TypeScript**: Type safety and development experience
- **React Native Gesture Handler**: Touch interactions

### **BT-Toolkit Integration**
- **`@bt-toolkit/usfm-processor`**: USFM parsing and scripture processing
- **`@bt-toolkit/scripture-utils`**: Scripture utilities and helpers
- **`@bt-toolkit/ui/linked-panels`**: Panel management and communication

### **Key Dependencies**
```json
{
  "expo": "~53.0.20",
  "react": "19.0.0",
  "react-native": "0.79.5",
  "react-native-gesture-handler": "~2.24.0",
  "@bt-toolkit/usfm-processor": "workspace:*",
  "@bt-toolkit/scripture-utils": "workspace:*"
}
```

## 📋 **Data Flow**

### **Scripture Processing Pipeline**
1. **USFM Input** → Raw USFM text from files/SD card
2. **USFM Processor** → Parsed scripture with metadata
3. **Scripture Renderer** → Interactive text display
4. **User Interaction** → Word taps, verse navigation
5. **Panel Communication** → Updates across all modules

### **Navigation Flow**
1. **User Selection** → Book/chapter/verse selection
2. **Reference Update** → New scripture reference
3. **Content Loading** → Load scripture and notes for reference
4. **Panel Sync** → Update all panels with new content

### **Translation Notes Flow**
1. **Note Selection** → User taps on translation note
2. **Quote Highlighting** → Highlight corresponding scripture text
3. **Greek Analysis** → Display Greek words and morphology
4. **Cross-Reference** → Link to translation academy articles

## 🎯 **Mobile-Specific Optimizations**

### **Touch Interactions**
- **Word Tapping**: Optimized touch targets for scripture words
- **Gesture Navigation**: Swipe gestures for chapter/verse navigation
- **Modal Interfaces**: Full-screen modals for detailed content

### **Layout Adaptations**
- **Compact Mode**: Condensed UI for smaller screens
- **Orientation Support**: Automatic layout adjustment
- **Panel Resizing**: Touch-friendly resize handles

### **Performance**
- **Lazy Loading**: Load content on demand
- **Efficient Rendering**: Optimized text rendering for large passages
- **Memory Management**: Proper cleanup of resources

## 🔄 **Communication System**

### **Message Types**
```typescript
interface PanelMessage {
  type: 'word-highlight' | 'verse-navigation' | 'quote-highlight' | 'reference-change';
  payload: {
    words?: string[];
    reference?: ScriptureReference;
    quote?: string;
    occurrence?: number;
  };
  source: string;
  target?: string;
}
```

### **Resource Configuration**
```typescript
interface ResourceConfig {
  id: string;
  type: 'scripture' | 'notes' | 'navigation';
  title: string;
  component: React.ReactNode;
  metadata: Record<string, any>;
}
```

## 🚀 **Future Enhancements**

### **Planned Features**
- **Offline Resource Management**: SD card loading and caching
- **Translation Interface**: Verse-by-verse translation editing
- **Team Collaboration**: Multi-user translation workflows
- **Audio Integration**: Scripture audio playback
- **Export Capabilities**: Export translations in various formats

### **Technical Improvements**
- **Performance Optimization**: Virtual scrolling for large texts
- **Accessibility**: Screen reader and accessibility support
- **Internationalization**: Multi-language UI support
- **Advanced Search**: Full-text search across resources

## 📚 **Usage Examples**

### **Basic Scripture Display**
```typescript
<ScriptureRenderer
  usfmText={usfmContent}
  bookName="Romans"
  onWordPress={(word, index) => handleWordAnalysis(word)}
  onVersePress={(chapter, verse) => navigateToVerse(chapter, verse)}
  highlightedWords={['servant', 'apostle']}
/>
```

### **Navigation Integration**
```typescript
<ScriptureNavigator
  currentReference={{ book: 'Romans', chapter: 1, verse: 1 }}
  availableBooks={bibleBooks}
  onNavigate={(ref) => updateCurrentReference(ref)}
  compact={true}
/>
```

### **Translation Notes Display**
```typescript
<TranslationNotesRenderer
  notes={translationNotes}
  currentReference="1:1"
  onNotePress={(note) => showNoteDetail(note)}
  onQuoteHighlight={(quote, occurrence) => highlightInScripture(quote)}
/>
```

## 🎨 **Design System**

### **Color Palette**
- **Primary Blue**: `#2563eb` (navigation, headers)
- **Text Gray**: `#374151` (main text)
- **Background**: `#ffffff` (main background)
- **Accent**: `#f8fafc` (cards, secondary backgrounds)
- **Highlight**: `#dbeafe` (word highlighting)

### **Typography**
- **Headers**: 18-24px, semibold
- **Body Text**: 15-16px, regular
- **Scripture**: 16px with 24px line height
- **Greek Text**: System font with Greek character support

### **Spacing**
- **Padding**: 12-20px for containers
- **Margins**: 8-16px between elements
- **Border Radius**: 6-12px for cards and buttons

This architecture provides a solid foundation for building a comprehensive offline Bible translation tool that can serve translation teams in low-resource regions effectively.
