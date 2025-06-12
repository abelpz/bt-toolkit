# Translation Review Tool - Demo Guide

## 🚀 Quick Demo Steps

### 1. Interactive Highlighting
**Try this:** Hover over the Greek text `δοῦλος` in the Translation Notes section
- **Expected result:** The Spanish words "un siervo" (in ULT) and "Sirvo" (in UST) will be highlighted in blue
- **Why it works:** The alignment data connects Greek δοῦλος (Strong's G1401) to both Spanish translations

### 2. Word Alignment Information
**Try this:** Click on the Spanish word "Pablo" in either ULT or UST
- **Expected result:** A tooltip appears showing:
  - Greek: Παῦλος (Παῦλος)
  - Strong's: G3972
  - Morphology: Gr,N,,,,,NMS,
- **Why it works:** Each Spanish word with alignment data is clickable and shows its Greek source

### 3. Complex Alignment Example
**Try this:** Hover over `κλητὸς ἀπόστολος` in the Translation Notes
- **Expected result:** 
  - In ULT: "llamado apóstol" highlights
  - In UST: "escogió para ser apóstol" highlights (showing how one Greek phrase maps to multiple Spanish words)
- **Why it works:** Demonstrates many-to-many alignment relationships

### 4. Review Comments System
**Try this:** Click "+ Add Comment" in the Review Comments section
- **Expected result:** A form appears to add new review comments
- **Try adding:** Select "ULT" as resource type, enter "siervo" as text selection, and add a comment about translation choices
- **Why it works:** Simulates the collaborative review process Spanish translation teams would use

### 5. Mobile Responsiveness
**Try this:** Resize your browser window to mobile size (or use browser dev tools)
- **Expected result:** The layout adapts to a single-column mobile-first design
- **Why it works:** Built with Tailwind CSS responsive utilities for mobile translation teams

## 🎯 Key Features Demonstrated

### Alignment Technology
- **Word-level precision:** Each Spanish word knows its Greek source
- **Bidirectional highlighting:** Greek → Spanish and Spanish → Greek connections
- **Morphological data:** Full grammatical information preserved
- **Occurrence tracking:** Handles repeated words correctly

### Translation Workflow
- **Side-by-side comparison:** ULT (literal) vs UST (natural) approaches
- **Contextual notes:** Translation Notes explain difficult concepts
- **Team collaboration:** Comment system for review discussions
- **Status tracking:** Comments can be pending, resolved, or rejected

### Spanish Translation Context
- **Cultural sensitivity:** "siervo" vs "esclavo" discussion for δοῦλος
- **Theological accuracy:** Proper handling of "llamado" (divine calling)
- **Regional appropriateness:** Latin American Spanish (es-419) terminology

## 🔍 Technical Details to Notice

### Data Structure
- Each word has `occurrence` and `occurrences` properties for proper highlighting
- Alignment data includes Strong's numbers, lemmas, and morphological parsing
- Comments track which resource type and text selection they reference

### User Experience
- Hover states provide immediate visual feedback
- Clickable elements have appropriate cursor styles
- Color coding distinguishes different types of information
- Responsive design works on all screen sizes

### Performance Considerations
- Efficient highlighting algorithm using Strong's number matching
- Minimal re-renders through proper React state management
- Lightweight component structure for fast loading

This mockup demonstrates the core concepts needed for a full-featured Bible translation review tool that Spanish translation teams could use to collaborate effectively on Door43 resources. 