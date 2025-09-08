import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { BIBLE_BOOKS, getBibleBookById } from '../../data/bibleBooks';

export interface ScriptureReference {
  book: string;
  chapter: number;
  verse: number;
}

export interface NavigationItem {
  id: string;
  title: string;
  reference: ScriptureReference;
  type: 'book' | 'chapter' | 'verse' | 'section';
}

export interface ScriptureNavigatorProps {
  currentReference: ScriptureReference;
  availableBooks: string[];
  onNavigate: (reference: ScriptureReference) => void;
  onSectionNavigate?: (sectionId: string) => void;
  resourceId?: string;
  compact?: boolean;
}

export const ScriptureNavigator: React.FC<ScriptureNavigatorProps> = ({
  currentReference,
  availableBooks,
  onNavigate,
  onSectionNavigate,
  resourceId = 'scripture-navigator',
  compact = false
}) => {
  const [showBookSelector, setShowBookSelector] = useState(false);
  const [showChapterSelector, setShowChapterSelector] = useState(false);
  const [maxChapters, setMaxChapters] = useState<Record<string, number>>({});

  // Use comprehensive Bible book data
  const bibleBooks = BIBLE_BOOKS.reduce((acc, book) => {
    acc[book.name] = { 
      chapters: book.chapters, 
      testament: book.testament,
      id: book.id 
    };
    return acc;
  }, {} as Record<string, { chapters: number; testament: 'OT' | 'NT'; id: string }>);

  useEffect(() => {
    // Initialize max chapters for all Bible books
    const chapters: Record<string, number> = {};
    Object.keys(bibleBooks).forEach(book => {
      chapters[book] = bibleBooks[book].chapters;
    });
    setMaxChapters(chapters);
  }, []);

  const handleBookSelect = (bookName: string) => {
    // Find the book data to get the ID
    const bookData = bibleBooks[bookName];
    const newReference: ScriptureReference = {
      book: bookData?.id || bookName, // Use book ID (e.g., 'JON') instead of name
      chapter: 1,
      verse: 1
    };
    onNavigate(newReference);
    setShowBookSelector(false);
  };

  const handleChapterSelect = (chapter: number) => {
    const newReference: ScriptureReference = {
      ...currentReference,
      chapter,
      verse: 1
    };
    onNavigate(newReference);
    setShowChapterSelector(false);
  };

  const navigatePrevious = () => {
    const { book, chapter, verse } = currentReference;
    
    if (verse > 1) {
      // Previous verse
      onNavigate({ book, chapter, verse: verse - 1 });
    } else if (chapter > 1) {
      // Previous chapter, last verse (simplified to verse 1)
      onNavigate({ book, chapter: chapter - 1, verse: 1 });
    } else {
      // Previous book (simplified)
      const currentBookIndex = availableBooks.indexOf(book);
      if (currentBookIndex > 0) {
        const previousBook = availableBooks[currentBookIndex - 1];
        const lastChapter = maxChapters[previousBook] || 1;
        onNavigate({ book: previousBook, chapter: lastChapter, verse: 1 });
      }
    }
  };

  const navigateNext = () => {
    const { book, chapter, verse } = currentReference;
    const maxChapter = maxChapters[book] || 1;
    
    // Simplified: just go to next verse/chapter
    if (chapter < maxChapter) {
      onNavigate({ book, chapter: chapter + 1, verse: 1 });
    } else {
      // Next book
      const currentBookIndex = availableBooks.indexOf(book);
      if (currentBookIndex < availableBooks.length - 1) {
        const nextBook = availableBooks[currentBookIndex + 1];
        onNavigate({ book: nextBook, chapter: 1, verse: 1 });
      }
    }
  };

  const canNavigatePrevious = () => {
    const { book, chapter, verse } = currentReference;
    const isFirstBook = availableBooks.indexOf(book) === 0;
    return !(isFirstBook && chapter === 1 && verse === 1);
  };

  const canNavigateNext = () => {
    const { book, chapter } = currentReference;
    const isLastBook = availableBooks.indexOf(book) === availableBooks.length - 1;
    const maxChapter = maxChapters[book] || 1;
    return !(isLastBook && chapter === maxChapter);
  };

  const renderBookSelector = () => {
    const allBookNames = Object.keys(bibleBooks);
    const otBooks = allBookNames.filter(bookName => 
      bibleBooks[bookName]?.testament === 'OT'
    );
    const ntBooks = allBookNames.filter(bookName => 
      bibleBooks[bookName]?.testament === 'NT'
    );

    return (
      <Modal
        visible={showBookSelector}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBookSelector(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Book</Text>
            <Pressable
              style={styles.closeButton}
              onPress={() => setShowBookSelector(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {otBooks.length > 0 && (
              <View style={styles.testamentSection}>
                <Text style={styles.testamentTitle}>Old Testament</Text>
                {otBooks.map(bookName => {
                  const bookData = bibleBooks[bookName];
                  const isSelected = currentReference.book === bookData.id;
                  return (
                    <Pressable
                      key={bookName}
                      style={[
                        styles.bookItem,
                        isSelected && styles.selectedBookItem
                      ]}
                      onPress={() => handleBookSelect(bookName)}
                    >
                      <Text style={[
                        styles.bookItemText,
                        isSelected && styles.selectedBookItemText
                      ]}>
                        {bookName}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            
            {ntBooks.length > 0 && (
              <View style={styles.testamentSection}>
                <Text style={styles.testamentTitle}>New Testament</Text>
                {ntBooks.map(bookName => {
                  const bookData = bibleBooks[bookName];
                  const isSelected = currentReference.book === bookData.id;
                  return (
                    <Pressable
                      key={bookName}
                      style={[
                        styles.bookItem,
                        isSelected && styles.selectedBookItem
                      ]}
                      onPress={() => handleBookSelect(bookName)}
                    >
                      <Text style={[
                        styles.bookItemText,
                        isSelected && styles.selectedBookItemText
                      ]}>
                        {bookName}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderChapterSelector = () => {
    const maxChapter = maxChapters[currentReference.book] || 1;
    const chapters = Array.from({ length: maxChapter }, (_, i) => i + 1);

    return (
      <Modal
        visible={showChapterSelector}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowChapterSelector(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Chapter - {currentReference.book}</Text>
            <Pressable
              style={styles.closeButton}
              onPress={() => setShowChapterSelector(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.chapterGrid}>
              {chapters.map(chapter => (
                <Pressable
                  key={chapter}
                  style={[
                    styles.chapterItem,
                    chapter === currentReference.chapter && styles.selectedChapterItem
                  ]}
                  onPress={() => handleChapterSelect(chapter)}
                >
                  <Text style={[
                    styles.chapterItemText,
                    chapter === currentReference.chapter && styles.selectedChapterItemText
                  ]}>
                    {chapter}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Pressable
          style={[styles.navButton, !canNavigatePrevious() && styles.disabledButton]}
          onPress={navigatePrevious}
          disabled={!canNavigatePrevious()}
        >
          <Text style={[styles.navButtonText, !canNavigatePrevious() && styles.disabledButtonText]}>
            ‹
          </Text>
        </Pressable>
        
        <Pressable
          style={styles.referenceButton}
          onPress={() => setShowBookSelector(true)}
        >
          <Text style={styles.referenceText}>
            {currentReference.book} {currentReference.chapter}:{currentReference.verse}
          </Text>
        </Pressable>
        
        <Pressable
          style={[styles.navButton, !canNavigateNext() && styles.disabledButton]}
          onPress={navigateNext}
          disabled={!canNavigateNext()}
        >
          <Text style={[styles.navButtonText, !canNavigateNext() && styles.disabledButtonText]}>
            ›
          </Text>
        </Pressable>
        
        {renderBookSelector()}
        {renderChapterSelector()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.navigationRow}>
        <Pressable
          style={[styles.navButton, !canNavigatePrevious() && styles.disabledButton]}
          onPress={navigatePrevious}
          disabled={!canNavigatePrevious()}
        >
          <Text style={[styles.navButtonText, !canNavigatePrevious() && styles.disabledButtonText]}>
            ← Previous
          </Text>
        </Pressable>
        
        <View style={styles.referenceContainer}>
          <Pressable
            style={styles.bookButton}
            onPress={() => setShowBookSelector(true)}
          >
            <Text style={styles.bookButtonText}>
              {getBibleBookById(currentReference.book)?.name || currentReference.book}
            </Text>
          </Pressable>
          
          <Pressable
            style={styles.chapterButton}
            onPress={() => setShowChapterSelector(true)}
          >
            <Text style={styles.chapterButtonText}>
              {currentReference.chapter}:{currentReference.verse}
            </Text>
          </Pressable>
        </View>
        
        <Pressable
          style={[styles.navButton, !canNavigateNext() && styles.disabledButton]}
          onPress={navigateNext}
          disabled={!canNavigateNext()}
        >
          <Text style={[styles.navButtonText, !canNavigateNext() && styles.disabledButtonText]}>
            Next →
          </Text>
        </Pressable>
      </View>
      
      {renderBookSelector()}
      {renderChapterSelector()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  navigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  referenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  navButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  disabledButton: {
    backgroundColor: '#f8fafc',
  },
  disabledButtonText: {
    color: '#9ca3af',
  },
  bookButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#2563eb',
    borderRadius: 6,
    marginRight: 8,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  chapterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#64748b',
    borderRadius: 6,
  },
  chapterButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  referenceButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2563eb',
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  referenceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#64748b',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  testamentSection: {
    marginBottom: 24,
  },
  testamentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  bookItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedBookItem: {
    backgroundColor: '#dbeafe',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  bookItemText: {
    fontSize: 16,
    color: '#374151',
  },
  selectedBookItemText: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  chapterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  chapterItem: {
    width: '18%',
    aspectRatio: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  selectedChapterItem: {
    backgroundColor: '#dbeafe',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  chapterItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  selectedChapterItemText: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
});

export default ScriptureNavigator;
