# Sample Translation Resources

This directory contains real translation resources fetched from the Door43 API for testing and development of the foundations-bt app.

## 📚 Available Resources

### Bible Text Resources
- **ULT (Literal Translation)**: `bible-text/ult/32-JON.usfm`
- **UST (Simplified Translation)**: `bible-text/ust/32-JON.usfm`
- Both contain word-level alignment data for precise cross-resource navigation

### Translation Helps Resources

#### Translation Notes (TN)
- **Jonah**: `translation-notes/tn_JON.tsv` (198 notes)
- **Philemon**: `translation-notes/tn_PHM.tsv` (25 notes)
- Verse-specific translation guidance with RC links to Translation Academy

#### Translation Words (TW)
- **Directory Structure**: `bible/kt/`, `bible/names/`, `bible/other/`
- **Key Terms**: `bible/kt/god.md`, `bible/kt/love.md`, `bible/kt/mercy.md`, `bible/kt/grace.md`
- **Names**: `bible/names/jonah.md`
- **Other Terms**: `bible/other/bread.md`, `bible/other/shepherd.md`
- Biblical term definitions with translation suggestions organized by category

#### Translation Words Links (TWL)
- **Jonah**: `translation-words-links/twl_JON.tsv` (166 links)
- **Philemon**: `translation-words-links/twl_PHM.tsv` (25 links)
- Links original language words to Translation Words definitions

#### Translation Questions (TQ)
- **Jonah**: `translation-questions/tq_JON.tsv` (48 questions)
- **Philemon**: `translation-questions/tq_PHM.tsv` (25 questions)
- Quality assurance questions for checking translations

#### Translation Academy (TA)
- **Directory Structure**: `translate/`, `checking/`, `intro/` with 3-file articles
- **Article Structure**: Each topic has `title.md`, `sub-title.md`, `01.md`
- **Translation Topics**: `translate/figs-metaphor/`, `translate/translate-names/`, `translate/writing-newevent/`
- **Grammar Topics**: `translate/grammar-connect-logic-result/`, `translate/figs-explicit/`, `translate/figs-idiom/`
- **Checking Topics**: `checking/acceptable/`, `checking/good/`
- **Introduction**: `intro/translation-guidelines/`
- Translation methodology and training materials organized by category

## 🔗 Resource Relationships

### Word-Level Alignment
The ULT text contains alignment markers that connect English words to original Hebrew/Greek:
```usfm
\zaln-s |x-strong="H3124" x-lemma="יוֹנָה" x-content="יוֹנָ֥ה"\*\w Jonah\w*\zaln-e\*
```

### Cross-Resource Links
Translation Notes reference Translation Academy articles:
```tsv
SupportReference: rc://*/ta/man/translate/figs-metaphor
```

Translation Words Links connect original words to definitions:
```tsv
OrigWords: יוֹנָ֥ה    TWLink: rc://*/tw/dict/bible/names/jonah
```

## 🎯 Testing Scenarios

### Basic Scripture Display
- Load ULT/UST for Jonah
- Test word-level alignment parsing
- Verify USFM processing with `@bt-toolkit/usfm-processor`

### Translation Helps Integration
- Show Translation Notes for Jonah 1:1
- Display linked Translation Words definitions
- Navigate to Translation Academy articles via RC links

### Interactive Features
- Click word in scripture → highlight in Translation Notes
- Click Translation Note → show Translation Academy article
- Click Translation Words Link → open definition

### Cross-Reference Navigation
- Follow RC links between resources
- Test verse range references (e.g., "1:1-3")
- Handle cross-chapter references

## 🚀 Usage in App

```typescript
import { sampleResourcesService } from '../services/sampleResourcesService';
import { parseVerseReference } from '../services/translationHelpsParser';

// Get helps for a specific verse
const reference = parseVerseReference('1:1', 'JON');
const helps = await sampleResourcesService.getPassageHelps(reference);

// Access all resource types
console.log('Notes:', helps.notes.length);
console.log('Questions:', helps.questions.length);
console.log('Word Links:', helps.wordLinks.length);
console.log('Words:', helps.words.length);
console.log('Academy Articles:', helps.academyArticles.length);
console.log('Bible Texts:', helps.bibleTexts.length);
```

## 📊 Resource Statistics

| Resource Type | Files | Total Items | Books Covered |
|---------------|-------|-------------|---------------|
| Bible Text | 2 | 2 translations | Jonah |
| Translation Notes | 2 | 223 notes | Jonah, Philemon |
| Translation Words | 5 | 5 definitions | Cross-book |
| Translation Words Links | 2 | 191 links | Jonah, Philemon |
| Translation Questions | 2 | 73 questions | Jonah, Philemon |
| Translation Academy | 6 | 6 articles | Cross-resource |

## 🔄 Fetching Updates

To refresh the sample resources:
```bash
node scripts/fetchSampleResources.js
```

This will fetch the latest versions from the Door43 API and update all files in this directory.
