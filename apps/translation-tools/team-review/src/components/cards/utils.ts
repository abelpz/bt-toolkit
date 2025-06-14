import { AlignedWord } from '../../types';

// Helper function to merge punctuation with adjacent words
export const mergeWordsWithPunctuation = (words: AlignedWord[]) => {
  const merged = [];
  let i = 0;

  while (i < words.length) {
    const currentWord = words[i];

    // Check if current word is punctuation (no alignment and likely punctuation)
    const isPunctuation =
      !currentWord.alignment &&
      /^[.,;:!?()"""''—–-]+$/.test(currentWord.text.trim());

    if (isPunctuation && merged.length > 0) {
      // Merge with previous word
      const lastMerged = merged[merged.length - 1];
      lastMerged.displayText += currentWord.text;
    } else {
      // Look ahead for following punctuation
      let displayText = currentWord.text;
      let nextIndex = i + 1;

      // Collect following punctuation
      while (nextIndex < words.length) {
        const nextWord = words[nextIndex];
        const isNextPunctuation =
          !nextWord.alignment &&
          /^[.,;:!?()"""''—–-]+$/.test(nextWord.text.trim());

        if (isNextPunctuation) {
          displayText += nextWord.text;
          nextIndex++;
        } else {
          break;
        }
      }

      merged.push({
        ...currentWord,
        displayText,
        originalIndex: i,
      });

      i = nextIndex - 1; // Adjust index since we consumed extra words
    }

    i++;
  }

  return merged;
}; 