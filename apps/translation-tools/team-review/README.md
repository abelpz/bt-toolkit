# Bible Translation Review Tool - Mockup

A semi-functional mockup of a translation review tool for Spanish Bible translation teams, built with React and TypeScript.

## Features

### 🎯 Core Functionality
- **Word-level alignment display** with Greek-to-Spanish mapping
- **Interactive highlighting** when hovering over Greek text in Translation Notes
- **Clickable aligned words** with tooltip information showing Strong's numbers, lemmas, and morphology
- **Review comment system** with status tracking (pending, resolved, rejected)
- **Mobile-first responsive design** using Tailwind CSS

### 📖 Translation Resources
- **ULT (Unfoldingword Literal Text)** - More literal Spanish translation
- **UST (Unfoldingword Simplified Text)** - Natural, simplified Spanish translation  
- **Translation Notes** - Contextual explanations with Greek references
- **Review Comments** - Team collaboration and feedback system

### 🔗 Alignment & Highlighting
- Each Spanish word is linked to its Greek original via Strong's numbers
- Hover over Greek text (δοῦλος, κλητὸς ἀπόστολος) in Translation Notes to see corresponding Spanish words highlighted
- Click on Spanish words to see detailed alignment information
- Support for complex many-to-one alignments (e.g., "un siervo" → δοῦλος)

## Mock Data

The application uses realistic Spanish translation data for **Romans 1:1**:

- **ULT**: "Pablo, un siervo de Cristo Jesús, llamado apóstol"
- **UST**: "Yo soy Pablo. Sirvo a Cristo Jesús. Dios me escogió para ser apóstol"
- **Translation Notes**: Explanations of δοῦλος (siervo/esclavo) and κλητὸς ἀπόστολος (llamado apóstol)
- **Review Comments**: Sample team feedback and discussions

## Technical Implementation

### Architecture
- **React 18** with functional components and hooks
- **TypeScript** for type safety and better development experience
- **Tailwind CSS** for responsive, mobile-first styling
- **Nx monorepo** structure following bt-toolkit conventions

### Key Components
- `VerseDisplay` - Renders aligned text with interactive highlighting
- `TranslationNotes` - Shows contextual notes with hover-to-highlight functionality
- `ReviewComments` - Team collaboration interface with comment management
- `App` - Main orchestrator handling state and cross-component communication

### Data Structure
```typescript
interface AlignedWord {
  text: string;            // Spanish word
  occurrence: number;      // Word occurrence in verse
  occurrences: number;     // Total occurrences
  alignment?: {            // Greek alignment data
    strong: string;        // Strong's number (G2316)
    lemma: string;         // Dictionary form (θεός)
    morph: string;         // Morphological parsing
    content: string;       // Original Greek text
  };
}
```

## Usage Instructions

### Interactive Features
1. **Hover over Greek text** in Translation Notes (blue highlighted quotes) to see corresponding Spanish words highlighted in both ULT and UST
2. **Click on Spanish words** that have alignment data (darker text, cursor pointer) to see detailed Greek information
3. **Add review comments** using the "+ Add Comment" button in the Review Comments section
4. **View alignment tooltips** by hovering over aligned Spanish words

### Example Interactions
- Hover over `δοῦλος` in Translation Notes → highlights "un siervo" in ULT and "Sirvo" in UST
- Hover over `κλητὸς ἀπόστολος` → highlights "llamado apóstol" in ULT and "escogió para ser apóstol" in UST
- Click on "Pablo" → shows Greek: Παῦλος, Strong's: G3972, Morphology: Gr,N,,,,,NMS,

## Development

### Running the Application
```bash
# From the bt-toolkit root
npm run dev

# Or specifically for this app
cd apps/translation-tools/team-review
npm run dev
```

### Project Structure
```
src/
├── components/
│   ├── VerseDisplay.tsx      # Interactive verse text display
│   ├── TranslationNotes.tsx  # Notes with highlighting integration
│   ├── ReviewComments.tsx    # Comment management interface
│   └── index.ts             # Component exports
├── data/
│   └── mockData.ts          # Sample Spanish Romans 1:1 data
├── types/
│   └── index.ts             # TypeScript type definitions
├── App.tsx                  # Main application component
├── main.tsx                 # Application entry point
└── styles.css               # Tailwind CSS imports
```

## Future Enhancements

This mockup demonstrates the core concepts for a full translation review tool. Future development could include:

- **Multi-verse navigation** with chapter/verse selectors
- **Real Door43 API integration** for live resource loading
- **Git-based PR creation** for submitting reviews
- **Offline support** with service workers
- **Translation Words popup** integration
- **Cross-reference navigation** between related verses
- **Advanced search and filtering** for comments and notes
- **User authentication** and team management
- **Export functionality** for review reports

## Spanish Translation Context

The mockup uses authentic Spanish theological terminology and cultural context appropriate for Latin American Spanish (es-419) Bible translation:

- **δοῦλος** → "siervo" vs "esclavo" (cultural sensitivity discussion)
- **κλητὸς** → "llamado" (divine calling concept)
- **ἀπόστολος** → "apóstol" (established biblical term)

This reflects real translation decisions Spanish teams face when balancing literal accuracy with cultural appropriateness. 