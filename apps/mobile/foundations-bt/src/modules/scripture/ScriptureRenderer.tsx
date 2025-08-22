import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { processUSFMSimple } from '@bt-toolkit/usfm-processor';
import type { ProcessedScripture } from '@bt-toolkit/usfm-processor';

export interface AlignedWord {
  text: string;
  occurrence: number;
  occurrences: number;
  alignment?: {
    strong: string;
    lemma: string;
    morph: string;
    occurrence: number;
    occurrences: number;
    content: string;
  };
}

export interface ScriptureRendererProps {
  usfmText: string;
  bookName: string;
  onWordPress?: (word: AlignedWord, index: number) => void;
  onVersePress?: (chapter: number, verse: number) => void;
  highlightedWords?: string[];
  resourceId?: string;
  className?: string;
}

export interface ScriptureWord {
  text: string;
  alignment?: {
    strong: string;
    lemma: string;
    morph: string;
    occurrence: number;
    occurrences: number;
    content: string;
  };
  isHighlighted?: boolean;
  isPunctuation?: boolean;
}

export interface ScriptureVerse {
  chapter: number;
  verse: number;
  words: ScriptureWord[];
  reference: string;
}

export const ScriptureRenderer: React.FC<ScriptureRendererProps> = ({
  usfmText,
  bookName,
  onWordPress,
  onVersePress,
  highlightedWords = [],
  resourceId = 'scripture-renderer',
  className = ''
}) => {
  const [processedScripture, setProcessedScripture] = useState<ProcessedScripture | null>(null);
  const [verses, setVerses] = useState<ScriptureVerse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    processScripture();
  }, [usfmText, bookName]);

  const processScripture = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!usfmText || !bookName) {
        setVerses([]);
        return;
      }

      console.log('🔄 Processing USFM text for:', bookName);
      const result = processUSFMSimple(usfmText, bookName);
      setProcessedScripture(result);

      // Convert processed scripture to verse format
      const convertedVerses = convertToVerses(result);
      setVerses(convertedVerses);

      console.log('✅ Scripture processed:', {
        totalChapters: result.metadata.totalChapters,
        totalVerses: result.metadata.totalVerses,
        versesConverted: convertedVerses.length
      });
    } catch (err) {
      console.error('❌ Scripture processing failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const convertToVerses = (scripture: ProcessedScripture): ScriptureVerse[] => {
    const verses: ScriptureVerse[] = [];

    scripture.chapters.forEach(chapter => {
      chapter.verses.forEach(verse => {
        const words: ScriptureWord[] = verse.text.split(/(\s+|[^\w\s])/).map((text: string) => {
          const isPunctuation = /^[^\w\s]$/.test(text);
          const isWhitespace = /^\s+$/.test(text);
          
          if (isWhitespace) return null; // Skip whitespace
          
          return {
            text: text.trim(),
            isPunctuation,
            isHighlighted: highlightedWords.includes(text.toLowerCase())
          };
        }).filter(Boolean) as ScriptureWord[];

        verses.push({
          chapter: chapter.number,
          verse: verse.number,
          words,
          reference: `${chapter.number}:${verse.number}`
        });
      });
    });

    return verses;
  };

  const handleWordPress = (word: ScriptureWord, wordIndex: number, verse: ScriptureVerse) => {
    if (word.isPunctuation || !onWordPress) return;

    // Convert to AlignedWord format for compatibility
    const alignedWord: AlignedWord = {
      text: word.text,
      occurrence: 1,
      occurrences: 1,
      alignment: word.alignment
    };

    onWordPress(alignedWord, wordIndex);
  };

  const handleVersePress = (verse: ScriptureVerse) => {
    if (onVersePress) {
      onVersePress(verse.chapter, verse.verse);
    }
  };

  const renderWord = (word: ScriptureWord, wordIndex: number, verse: ScriptureVerse) => {
    const wordStyle = [
      styles.word,
      word.isHighlighted && styles.highlightedWord,
      word.isPunctuation && styles.punctuation
    ];

    return (
      <Pressable
        key={`${verse.reference}-${wordIndex}`}
        style={({ pressed }) => [
          wordStyle,
          pressed && styles.pressedWord
        ]}
        onPress={() => handleWordPress(word, wordIndex, verse)}
        disabled={word.isPunctuation}
      >
        <Text style={[
          styles.wordText,
          word.isHighlighted && styles.highlightedWordText
        ]}>
          {word.text}
        </Text>
      </Pressable>
    );
  };

  const renderVerse = (verse: ScriptureVerse, verseIndex: number) => {
    return (
      <Pressable
        key={verse.reference}
        style={styles.verseContainer}
        onPress={() => handleVersePress(verse)}
      >
        <View style={styles.verseHeader}>
          <Text style={styles.verseNumber}>{verse.verse}</Text>
        </View>
        <View style={styles.verseContent}>
          {verse.words.map((word, wordIndex) => 
            renderWord(word, wordIndex, verse)
          )}
        </View>
      </Pressable>
    );
  };

  const renderChapter = (chapterNumber: number, chapterVerses: ScriptureVerse[]) => {
    return (
      <View key={chapterNumber} style={styles.chapterContainer}>
        <Text style={styles.chapterTitle}>Chapter {chapterNumber}</Text>
        {chapterVerses.map((verse, verseIndex) => 
          renderVerse(verse, verseIndex)
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Processing Scripture...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Scripture Processing Error</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  if (verses.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No scripture content available</Text>
        </View>
      </View>
    );
  }

  // Group verses by chapter
  const chapterGroups = verses.reduce((groups, verse) => {
    if (!groups[verse.chapter]) {
      groups[verse.chapter] = [];
    }
    groups[verse.chapter].push(verse);
    return groups;
  }, {} as Record<number, ScriptureVerse[]>);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Text style={styles.bookTitle}>{bookName}</Text>
        {Object.entries(chapterGroups).map(([chapterNum, chapterVerses]) =>
          renderChapter(parseInt(chapterNum), chapterVerses)
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 16,
  },
  bookTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 20,
    textAlign: 'center',
  },
  chapterContainer: {
    marginBottom: 24,
  },
  chapterTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  verseContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingVertical: 4,
  },
  verseHeader: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  verseNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 20,
    textAlign: 'center',
  },
  verseContent: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    paddingLeft: 8,
  },
  word: {
    marginRight: 4,
    marginBottom: 2,
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 3,
  },
  wordText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
  },
  highlightedWord: {
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  highlightedWordText: {
    color: '#1d4ed8',
    fontWeight: '500',
  },
  punctuation: {
    // No special styling for punctuation
  },
  pressedWord: {
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
});

export default ScriptureRenderer;
