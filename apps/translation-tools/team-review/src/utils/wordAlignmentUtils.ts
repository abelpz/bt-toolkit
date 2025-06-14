// Helper function to find words by Greek alignment for phrase-level matching
export function findWordsByGreekAlignment(greekPhrase: string, occurrence: number, mergedWords: any[]): string | null {
  // Normalize the Greek phrase by removing punctuation and extra spaces
  const normalizeGreek = (text: string) => text.replace(/[^\u0370-\u03FF\u1F00-\u1FFF\s]/g, '').replace(/\s+/g, ' ').trim();
  const normalizedPhrase = normalizeGreek(greekPhrase);
  const greekWords = normalizedPhrase.split(' ').filter(word => word.length > 0);
  

  
  if (greekWords.length === 0) return null;
  
  // Find all occurrences of this complete Greek phrase in the verse
  const phraseOccurrences: { startIndex: number; endIndex: number; alignmentKeys: string[] }[] = [];
  
  // For each position in the verse, try to match the complete Greek phrase
  for (let startPos = 0; startPos < mergedWords.length; startPos++) {
    const currentGreekWords: string[] = [];
    const alignmentKeys: string[] = [];
    let endPos = startPos;
    
    // Collect Greek words starting from startPos, allowing for gaps (non-aligned words)
    for (let pos = startPos; pos < mergedWords.length; pos++) {
      const word = mergedWords[pos];
      if (word.alignment && word.alignment.content) {
        const normalizedGreekWord = normalizeGreek(word.alignment.content);
        if (normalizedGreekWord) {
          currentGreekWords.push(normalizedGreekWord);
          const alignmentKey = `${word.alignment.content}-${word.alignment.strong}`;
          if (!alignmentKeys.includes(alignmentKey)) {
            alignmentKeys.push(alignmentKey);
          }
          endPos = pos;
          
          // Check if we've collected enough words to potentially match the phrase
          const currentPhrase = currentGreekWords.join(' ');
          
          if (currentPhrase === normalizedPhrase) {
            // Found a complete match
            phraseOccurrences.push({
              startIndex: startPos,
              endIndex: endPos,
              alignmentKeys
            });
            break;
          } else if (currentPhrase.length > normalizedPhrase.length) {
            // Current phrase is longer than target, no match possible
            break;
          }
        }
      }
      // Continue even if word has no alignment (allow gaps)
    }
  }
  
  // Return the alignment keys for the specified occurrence (1-based)
  if (phraseOccurrences.length >= occurrence) {
    const match = phraseOccurrences[occurrence - 1];
    return match.alignmentKeys.length > 0 ? match.alignmentKeys.join('|') : null;
  }
  
  return null;
}

// Helper function to find words that match a note quote and occurrence
export function findWordsForNoteQuote(quote: string, occurrence: number, mergedWords: any[]): string | null {
  // Check if the quote is Greek text (contains Greek characters)
  const isGreekText = /[\u0370-\u03FF\u1F00-\u1FFF]/.test(quote);
  
  if (isGreekText) {
    // If quote is Greek, find Spanish words that align to this Greek phrase
    return findWordsByGreekAlignment(quote, occurrence, mergedWords);
  }
  
  // Otherwise, find by Spanish text matching
  const normalizeText = (text: string) => text.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const normalizedQuote = normalizeText(quote);
  
  // Find all possible matches for the quote in the verse
  const matches: { startIndex: number; endIndex: number; alignmentKeys: string[] }[] = [];
  
  for (let i = 0; i < mergedWords.length; i++) {
    let currentMatch = '';
    const alignmentKeys: string[] = [];
    let j = i;
    
    // Try to build a match starting from position i
    while (j < mergedWords.length) {
      const wordText = normalizeText(mergedWords[j].displayText);
      currentMatch = (currentMatch + ' ' + wordText).trim();
      
      // Add alignment key if word has alignment
      if (mergedWords[j].alignment) {
        const alignmentKey = `${mergedWords[j].alignment.content}-${mergedWords[j].alignment.strong}`;
        if (!alignmentKeys.includes(alignmentKey)) {
          alignmentKeys.push(alignmentKey);
        }
      }
      
      // Check if we have a match
      if (normalizedQuote === currentMatch) {
        matches.push({
          startIndex: i,
          endIndex: j,
          alignmentKeys
        });
        break;
      }
      
      // If current match is longer than quote, stop
      if (currentMatch.length > normalizedQuote.length) {
        break;
      }
      
      j++;
    }
  }
  
  // Return the alignment keys for the specified occurrence (1-based)
  if (matches.length >= occurrence) {
    const match = matches[occurrence - 1];
    return match.alignmentKeys.length > 0 ? match.alignmentKeys.join('|') : null;
  }
  
  return null;
} 