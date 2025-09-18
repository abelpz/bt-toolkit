# Door43 Resource Downloader

A standalone tool for downloading and processing Door43 resources into IndexedDB/SQLite-compatible format.

## ÌæØ Purpose

This tool downloads all resources from Door43 (Scripture, Translation Notes, Translation Words, etc.) and processes them using the exact same processors as the BT Studio app, ensuring perfect compatibility with the app's storage layers.

## Ì≥Å Structure

```
resource-downloader/
‚îú‚îÄ‚îÄ README.md                  # This file
‚îú‚îÄ‚îÄ package.json              # Dependencies
‚îú‚îÄ‚îÄ complete-downloader.ts     # Main downloader script
‚îú‚îÄ‚îÄ sqlite-builder.ts         # Builds SQLite database from downloaded files
‚îú‚îÄ‚îÄ ContentDiscovery.ts       # Discovers files for each resource type
‚îú‚îÄ‚îÄ twl-processor.ts          # Translation Words Links processor
‚îî‚îÄ‚îÄ archive/                  # Old development files
```

## Ì∫Ä Usage

### 1. Configure Your Download

Before running the downloader, you can customize what resources to download by editing `complete-downloader.ts`:

#### **Server, Owner & Language Settings**
```typescript
// In complete-downloader.ts around line 574
const SERVER = 'git.door43.org';     // Door43 server
const OWNER = 'unfoldingWord';       // Resource owner
const LANGUAGE = 'en';               // Language code
```

**Common configurations:**
- **English**: `OWNER = 'unfoldingWord'`, `LANGUAGE = 'en'`
- **Spanish**: `OWNER = 'es-419_gl'`, `LANGUAGE = 'es-419'`
- **French**: `OWNER = 'fr_gl'`, `LANGUAGE = 'fr'`
- **Portuguese**: `OWNER = 'pt-br_gl'`, `LANGUAGE = 'pt-br'`

#### **Resource List Configuration**
```typescript
// In complete-downloader.ts around line 582
const resources: ResourceConfig[] = [
  { id: 'ult', name: 'Unlocked Literal Translation', type: 'book', maxBooks: 10 },
  { id: 'ust', name: 'Unlocked Simplified Translation', type: 'book', maxBooks: 10 },
  { id: 'tn', name: 'Translation Notes', type: 'book', maxBooks: 5 },
  { id: 'tq', name: 'Translation Questions', type: 'book', maxBooks: 5 },
  { id: 'twl', name: 'Translation Words Links', type: 'book', maxBooks: 5 },
  { id: 'tw', name: 'Translation Words', type: 'entry', maxEntries: 20 },
  { id: 'ta', name: 'Translation Academy', type: 'entry', maxEntries: 10 },
];
```

**Available Resources:**
- **Scripture**: `ult`, `ust`, `uhb` (Hebrew), `ugnt` (Greek)
- **Translation Helps**: `tn`, `tq`, `twl`
- **Reference**: `tw`, `ta`

**Limit Settings:**
- `maxBooks: 10` - Download first 10 books (remove to download all)
- `maxEntries: 20` - Download first 20 entries (remove to download all)
- Remove limits for complete download: `{ id: 'ult', name: '...', type: 'book' }`

### 2. Download Resources

```bash
# Download configured resources
npx tsx complete-downloader.ts
```

### 3. Build SQLite Database

```bash
# Build SQLite database from downloaded files
npx tsx sqlite-builder.ts
```

## Ì≥ã Quick Reference

### Common Owner/Language Combinations
| Language | Owner | Language Code | Description |
|----------|-------|---------------|-------------|
| English | `unfoldingWord` | `en` | Primary English resources |
| Spanish | `es-419_gl` | `es-419` | Gateway Language Spanish |
| French | `fr_gl` | `fr` | Gateway Language French |
| Portuguese | `pt-br_gl` | `pt-br` | Gateway Language Portuguese |

### Resource Types
| ID | Name | Type | Description |
|----|------|------|-------------|
| `ult` | Unlocked Literal Translation | book | English literal Bible |
| `ust` | Unlocked Simplified Translation | book | English simplified Bible |
| `uhb` | Hebrew Bible | book | Original Hebrew text |
| `ugnt` | Greek New Testament | book | Original Greek text |
| `tn` | Translation Notes | book | Verse-by-verse notes |
| `tq` | Translation Questions | book | Comprehension questions |
| `twl` | Translation Words Links | book | Word links to definitions |
| `tw` | Translation Words | entry | Bible term definitions |
| `ta` | Translation Academy | entry | Translation training articles |
