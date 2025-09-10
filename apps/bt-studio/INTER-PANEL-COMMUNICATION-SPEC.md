# Inter-Panel Communication Specification

## 🎯 Overview

This document specifies the token ID-based inter-panel communication system that enables precise highlighting and cross-referencing between Translation Notes, original language texts, and aligned translations.

## 🔑 Core Principle: Token ID-Based Communication

**All cross-panel communication uses precise token IDs, not Strong's numbers.**

### Token ID Format
```
{verseRef}:{content}:{occurrence}
```

**Examples:**
- `3JN 1:1:ὁ:1` - First occurrence of "ὁ" in 3 John 1:1
- `3JN 1:1:πρεσβύτερος:1` - First occurrence of "πρεσβύτερος" in 3 John 1:1
- `3JN 1:12:ἡμεῖς:1` - First occurrence of "ἡμεῖς" in 3 John 1:12

## 📡 Message Protocol

### Message Types

#### 1. HIGHLIGHT_TOKEN
Highlights a specific token in a panel.

```typescript
interface HighlightTokenMessage {
  type: 'HIGHLIGHT_TOKEN';
  panelType: 'GREEK_UGNT' | 'ENGLISH_ULT' | 'TRANSLATION_NOTES' | 'TRANSLATION_QUESTIONS';
  tokenId: string;           // e.g., "3JN 1:1:ὁ:1"
  content: string;           // e.g., "ὁ"
  position: {
    start: number;
    end: number;
  };
  sourceTokenId?: string;    // For aligned tokens, references original token
}
```

#### 2. HIGHLIGHT_QUOTE
Highlights multiple related tokens (for multi-word quotes).

```typescript
interface HighlightQuoteMessage {
  type: 'HIGHLIGHT_QUOTE';
  panelType: string;
  tokens: Array<{
    tokenId: string;
    content: string;
    position: { start: number; end: number; };
  }>;
  quoteId: string;           // Unique identifier for the quote
}
```

#### 3. CLEAR_HIGHLIGHTS
Clears all highlights in specified panels.

```typescript
interface ClearHighlightsMessage {
  type: 'CLEAR_HIGHLIGHTS';
  panelTypes?: string[];     // If omitted, clears all panels
}
```

## 🔄 Communication Workflow

### Scenario 1: Translation Notes Click
```
User clicks "ὁ πρεσβύτερος" in Translation Notes
↓
1. Translation Notes panel sends HIGHLIGHT_QUOTE message
2. Quote Matcher finds original tokens: ["3JN 1:1:ὁ:1", "3JN 1:1:πρεσβύτερος:1"]
3. System finds aligned English tokens via sourceWordId references
4. Messages sent to all panels:
   - GREEK_UGNT: Highlight "ὁ" and "πρεσβύτερος"
   - ENGLISH_ULT: Highlight "The" and "elder"
   - Other panels: Show related content
```

### Scenario 2: Non-Contiguous Multi-Quote
```
Translation Notes references "ἡμεῖς & μαρτυροῦμεν & ἡμῶν"
↓
1. Quote Matcher finds three separate tokens in verse
2. All three tokens highlighted simultaneously
3. Cross-panel communication maintains relationships
4. User sees grammatically related words across panels
```

## 🏗️ Implementation Architecture

### Core Components

#### 1. QuoteMatcher Service
```typescript
class QuoteMatcher {
  // Find original language tokens from quotes
  findOriginalTokens(chapters, quote, occurrence, reference): QuoteMatchResult
  
  // Find aligned target language tokens
  findAlignedTokens(originalTokens, targetChapters, reference): AlignmentMatchResult
}
```

#### 2. Token Alignment System
```typescript
interface WordToken {
  uniqueId: string;          // Primary identifier for cross-panel communication
  content: string;
  occurrence: number;
  verseRef: string;
  position: { start: number; end: number; wordIndex: number; };
  alignment?: {
    sourceWordId?: string;   // References original token ID
    strong?: string;         // Fallback for legacy data
    lemma?: string;
    sourceContent?: string;
    sourceOccurrence?: number;
  };
  isHighlightable: boolean;
  type: 'word' | 'text' | 'punctuation';
}
```

#### 3. Panel Communication Interface
```typescript
interface PanelCommunicator {
  // Send message to specific panel
  sendToPanel(panelId: string, message: PanelMessage): void;
  
  // Broadcast to all panels
  broadcast(message: PanelMessage): void;
  
  // Listen for messages
  onMessage(callback: (message: PanelMessage) => void): void;
}
```

## 📊 Supported Quote Patterns

### 1. Simple Quotes
```
Quote: "ὁ πρεσβύτερος"
Occurrence: 1
Reference: 3JN 1:1
→ Finds: ["3JN 1:1:ὁ:1", "3JN 1:1:πρεσβύτερος:1"]
```

### 2. Multiple Quotes with Ampersand
```
Quote: "Γαΐῳ & ἀγαπητῷ"
Occurrence: 1
Reference: 3JN 1:1
→ Finds: ["3JN 1:1:Γαΐῳ:1", "3JN 1:1:ἀγαπητῷ:1"]
```

### 3. Range-Based Quotes
```
Quote: "ἀγαπητέ"
Occurrence: 1
Reference: 3JN 1:1-2
→ Searches across verses 1:1 and 1:2
→ Finds: ["3JN 1:2:ἀγαπητέ:1"]
```

### 4. Non-Contiguous Multi-Quotes
```
Quote: "ἡμεῖς & μαρτυροῦμεν & ἡμῶν"
Occurrence: 1
Reference: 3JN 1:12
→ Finds three separated words in sequence
→ Results: ["3JN 1:12:ἡμεῖς:1", "3JN 1:12:μαρτυροῦμεν:1", "3JN 1:12:ἡμῶν:1"]
```

## 🎨 UI Highlighting Specification

### Highlighting Styles
```css
.token-highlighted {
  background-color: #fef3c7;  /* Light yellow */
  border-radius: 3px;
  padding: 1px 2px;
  transition: all 0.2s ease;
}

.token-highlighted-primary {
  background-color: #dbeafe;  /* Light blue */
  border: 2px solid #3b82f6;
}

.token-highlighted-secondary {
  background-color: #f3e8ff;  /* Light purple */
  border: 1px solid #8b5cf6;
}
```

### Highlighting Behavior
- **Primary highlight**: Direct quote matches
- **Secondary highlight**: Aligned/related tokens
- **Hover effects**: Show token information
- **Click behavior**: Trigger cross-panel communication

## 🔧 Integration with @linked-panels/

### Message Channel Setup
```typescript
import { createMessagingChannel } from '@linked-panels/core';

const panelChannel = createMessagingChannel('scripture-highlighting');

// Send highlight message
panelChannel.send({
  type: 'HIGHLIGHT_TOKEN',
  panelType: 'GREEK_UGNT',
  tokenId: '3JN 1:1:ὁ:1',
  content: 'ὁ',
  position: { start: 0, end: 1 }
});

// Listen for messages
panelChannel.onMessage((message) => {
  if (message.type === 'HIGHLIGHT_TOKEN') {
    highlightToken(message.tokenId, message.position);
  }
});
```

## 📈 Performance Considerations

### Optimization Strategies
1. **Token ID Indexing**: Pre-index all token IDs for fast lookup
2. **Lazy Loading**: Load alignment data on demand
3. **Message Batching**: Batch multiple highlight messages
4. **Debounced Updates**: Prevent excessive highlighting updates

### Memory Management
- Use WeakMap for token references
- Clean up highlights when panels unmount
- Limit concurrent highlight operations

## 🧪 Testing Coverage

### Test Scenarios
- ✅ Simple quote matching
- ✅ Multiple quote matching with &
- ✅ Reference range matching
- ✅ Non-contiguous multi-quotes
- ✅ Token ID-based alignment
- ✅ Cross-panel communication
- ✅ Real Translation Notes integration

### Performance Tests
- Quote matching speed (< 50ms for typical quotes)
- Memory usage (< 10MB for full chapter)
- Cross-panel message latency (< 10ms)

## 🚀 Production Deployment

### Requirements
1. **Enhanced USFM Processor**: With word tokenization
2. **Quote Matcher Service**: Core matching logic
3. **Updated USFMRenderer**: Token-aware rendering
4. **Panel Communication**: @linked-panels/ integration
5. **Token ID Standards**: Consistent across all resources

### Rollout Strategy
1. Deploy enhanced USFM processing
2. Update renderers with token support
3. Integrate quote matching system
4. Enable cross-panel communication
5. Test with real Translation Notes data

---

## 🎉 **SYSTEM STATUS: PRODUCTION READY**

The token ID-based inter-panel communication system is fully implemented and tested. It provides precise, unambiguous communication between panels using unique token identifiers rather than Strong's numbers, enabling accurate highlighting and cross-referencing across all translation tools.

**Key Benefits:**
- ✅ Precise word-to-word mapping
- ✅ Handles multiple occurrences correctly
- ✅ Supports complex multi-word quotes
- ✅ Enables non-contiguous highlighting
- ✅ No ambiguity in cross-panel communication
- ✅ Ready for @linked-panels/ integration

