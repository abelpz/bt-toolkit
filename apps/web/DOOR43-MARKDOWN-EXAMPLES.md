# 📝 **Door43 Markdown Syntax Examples**

## **🎯 Enhanced MarkdownRenderer Features**

Our enhanced `MarkdownRenderer` now supports Door43-specific syntax alongside standard markdown.

### **🔗 Door43 Resource Links**

**Syntax**: `[[rc://*/resourceType/category/subcategory/resource-name]]`

**Examples**:
```markdown
See the article on [[rc://*/ta/man/translate/figs-metaphor]] for more information.
Learn about [[rc://*/tw/dict/bible/kt/grace]] in the translation words.
Check the [[rc://*/tn/help/gen/01/01]] translation note for Genesis 1:1.
```

**Rendered As**:
- 📖 **figs metaphor** (clickable badge linking to Door43 TA resource)
- 📖 **grace** (clickable badge linking to Door43 TW resource)  
- 📖 **01** (clickable badge linking to Door43 TN resource)

**Features**:
- ✅ **Auto-generated URLs** to Door43 resources
- ✅ **Readable display names** (kebab-case → readable text)
- ✅ **Resource type detection** (TA, TW, TN, etc.)
- ✅ **Hover tooltips** with full resource path
- ✅ **Styled badges** with icons and colors

---

### **📍 Verse Reference Links**

**Syntax**: `[verse|chapter|v.|ch. NUMBER](path)` or `[verse NUMBER:NUMBER](path)`

**Examples**:
```markdown
See [verse 6](../01/06.md) for more context.
Compare with [chapter 2](../02/intro.md) introduction.
Also check [v. 10](../01/10.md) and [ch. 3](../03/intro.md).
Cross-reference [verse 5:12](../05/12.md) for similar usage.
```

**Rendered As**:
- 📍 **verse 6** (purple badge linking to verse)
- 📍 **chapter 2** (purple badge linking to chapter)
- 📍 **v. 10** (purple badge linking to verse)
- 📍 **ch. 3** (purple badge linking to chapter)
- 📍 **verse 5:12** (purple badge with chapter:verse reference)

**Features**:
- ✅ **Flexible syntax** - supports multiple formats
- ✅ **Chapter:verse parsing** - handles both single and range references
- ✅ **Visual distinction** - purple badges for scripture references
- ✅ **Hover tooltips** with parsed reference information

---

### **📋 Standard Markdown Support**

All standard markdown features are still supported:

**Text Formatting**:
```markdown
**Bold text** and *italic text* and `inline code`
```

**Headers**:
```markdown
## About the Psalm
### Structure and Formatting
#### Translation Issues
```

**Lists**:
```markdown
- First item
- Second item
- Third item
```

**Regular Links**:
```markdown
[External link](https://example.com)
```

**Escaped Characters**:
```markdown
Use \*asterisks\* literally or \[brackets\] without linking
```

---

### **🎨 Visual Design**

**Door43 Resource Links** (Blue Theme):
- 📖 Icon + readable name
- Blue background with hover effects
- Tooltip with resource type and path
- Opens in new tab

**Verse Reference Links** (Purple Theme):
- 📍 Icon + reference text
- Purple background with hover effects  
- Tooltip with parsed verse reference
- Maintains original href for navigation

**Dark Mode Support**:
- ✅ All badges adapt to dark/light themes
- ✅ Proper contrast ratios maintained
- ✅ Consistent hover states

---

### **🔧 Technical Implementation**

**Enhanced Pattern Recognition**:
```typescript
// Door43 resource links
/^\[\[rc:\/\/\*\/([^\/\n]+)\/([^\/\n]+)\/([^\/\n]+)\/([^\]\n]+)\]\]/

// Verse reference links  
/^\[(?:verse|chapter|v\.?|ch\.?)\s*(\d+)(?::(\d+))?\]\(([^)\n]+?)\)/
```

**Preprocessing**:
- ✅ **Escaped newlines** → actual newlines (`\n` → newline)
- ✅ **Escaped tabs** → spaces (`\t` → spaces)
- ✅ **Escaped quotes** → proper quotes
- ✅ **Line ending normalization**

**Output Formats**:
- ✅ **React components** - for web applications
- ✅ **HTML strings** - for static rendering
- ✅ **Statistics** - for content analysis

---

### **🧪 Testing Examples**

**Complex Translation Note Content**:
```markdown
# About the Psalm

Psalm 2 is usually considered a royal psalm because it is about the king. 
See [[rc://*/ta/man/translate/figs-metaphor]] for understanding metaphorical language.

## Structure and Formatting

1. verses 1–3 Rebellion - Earthly kings plot rebellion
2. verses 4–6 Response - The Heavenly King laughs  
3. verses 7–9 Decree - The King on Zion recounts Yahweh's covenant

Compare with [verse 6](../02/06.md) and check [[rc://*/tw/dict/bible/kt/covenant]].

**Translation Issues**: The word for son in [verse 12](../02/12.md) is highlighted 
by being Aramaic rather than Hebrew. See [[rc://*/tn/help/psa/002/012]] for details.
```

**Expected Output**:
- Proper header hierarchy
- Door43 resource links as blue badges
- Verse references as purple badges  
- Standard markdown formatting preserved
- All links functional and styled

---

### **🚀 Future Enhancements**

**Potential Extensions**:
- **Glossary terms** - `{{term}}` syntax with hover definitions
- **Cross-references** - `@book:chapter:verse` syntax
- **Alignment markers** - `{word}` syntax for word-level alignment
- **Custom containers** - `:::note` blocks for special content
- **Math expressions** - `$equation$` syntax for formulas

**Plugin Architecture Ready**:
The enhanced renderer is designed to easily accept new pattern types and rendering logic for future Door43-specific needs.

---

## **✅ Implementation Complete**

The enhanced `MarkdownRenderer` now provides:
- ✅ **Door43 resource link support** - `[[rc://...]]`
- ✅ **Verse reference link support** - `[verse N](path)`  
- ✅ **Escaped content preprocessing** - handles `\n`, `\t`, etc.
- ✅ **Visual distinction** - color-coded badges with icons
- ✅ **Accessibility** - proper tooltips and ARIA labels
- ✅ **Dark mode compatibility** - theme-aware styling
- ✅ **Performance optimized** - efficient parsing and rendering

**Ready for production use in translation notes and other Door43 content!** 🎉
