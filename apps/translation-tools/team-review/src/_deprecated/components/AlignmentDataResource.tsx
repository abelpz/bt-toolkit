import React, { useState, useEffect } from 'react';
import { useBaseResource } from './base/BaseResource';
import { SignalBus } from '../services/SignalBus';
import { 
  Signal, 
  SIGNAL_TYPES, 
  ShowAlignmentPayload, 
  WordClickedPayload,
  HighlightAlignmentPayload,
  AlignmentData,
  PanelId,
  ResourceId 
} from '../types/signaling';
import { AlignedWord, VerseText } from '../types';

interface AlignmentDataResourceProps {
  panelId: PanelId;
  resourceId: ResourceId;
  verseRef: string;
  ultVerse?: VerseText;
  ustVerse?: VerseText;
  className?: string;
}

interface ExtractedAlignment {
  id: string;
  greekWord: string;
  strong: string;
  lemma: string;
  morph: string;
  englishWords: {
    text: string;
    source: 'ult' | 'ust';
    wordIndex: number;
  }[];
  occurrence: number;
  occurrences: number;
}

export const AlignmentDataResource: React.FC<AlignmentDataResourceProps> = ({
  panelId,
  resourceId,
  verseRef,
  ultVerse,
  ustVerse,
  className = ''
}) => {
  const { state, emitSignal } = useBaseResource(panelId, resourceId);
  const [alignments, setAlignments] = useState<ExtractedAlignment[]>([]);
  const [currentAlignmentIndex, setCurrentAlignmentIndex] = useState(0);
  const [focusedAlignment, setFocusedAlignment] = useState<string | null>(null);
  const [highlightedAlignments, setHighlightedAlignments] = useState<string[]>([]);
  const signalBus = SignalBus.getInstance();

  // Extract alignment data from ULT and UST
  useEffect(() => {
    const extractedAlignments: ExtractedAlignment[] = [];
    const alignmentMap = new Map<string, ExtractedAlignment>();

    // Process ULT words
    ultVerse?.words.forEach((word, index) => {
      if (word.alignment) {
        const key = `${word.alignment.strong}_${word.alignment.occurrence}`;
        
        if (!alignmentMap.has(key)) {
          alignmentMap.set(key, {
            id: key,
            greekWord: word.alignment.content,
            strong: word.alignment.strong,
            lemma: word.alignment.lemma,
            morph: word.alignment.morph,
            occurrence: word.alignment.occurrence,
            occurrences: word.alignment.occurrences,
            englishWords: []
          });
        }

        alignmentMap.get(key)!.englishWords.push({
          text: word.text,
          source: 'ult',
          wordIndex: index
        });
      }
    });

    // Process UST words
    ustVerse?.words.forEach((word, index) => {
      if (word.alignment) {
        const key = `${word.alignment.strong}_${word.alignment.occurrence}`;
        
        if (!alignmentMap.has(key)) {
          alignmentMap.set(key, {
            id: key,
            greekWord: word.alignment.content,
            strong: word.alignment.strong,
            lemma: word.alignment.lemma,
            morph: word.alignment.morph,
            occurrence: word.alignment.occurrence,
            occurrences: word.alignment.occurrences,
            englishWords: []
          });
        }

        alignmentMap.get(key)!.englishWords.push({
          text: word.text,
          source: 'ust',
          wordIndex: index
        });
      }
    });

    const sortedAlignments = Array.from(alignmentMap.values()).sort((a, b) => {
      // Sort by Strong's number, then by occurrence
      const strongA = parseInt(a.strong.replace('G', ''));
      const strongB = parseInt(b.strong.replace('G', ''));
      if (strongA !== strongB) return strongA - strongB;
      return a.occurrence - b.occurrence;
    });

    setAlignments(sortedAlignments);
    setCurrentAlignmentIndex(0);
  }, [ultVerse, ustVerse]);

  // Handle signals through SignalBus
  useEffect(() => {
    const handleSignal = async (signal: Signal) => {
      // Check if source resource is visible for highlighting signals
      const isHighlightingSignal = signal.type === SIGNAL_TYPES.HIGHLIGHT_ALIGNMENT || 
                                   signal.type === SIGNAL_TYPES.CLEAR_ALIGNMENT_HIGHLIGHTS;
      
      if (isHighlightingSignal) {
        const sourceResource = signalBus.getResource(signal.source.resourceId);
        const isSourceVisible = sourceResource?.getState()?.isVisible;
        
        if (!isSourceVisible) {
          console.log(`AlignmentDataResource ignoring ${signal.type} signal from invisible source:`, signal.source.resourceId);
          return;
        }
      }
      
      switch (signal.type) {
        case SIGNAL_TYPES.WORD_CLICKED: {
          const wordPayload = signal.payload as WordClickedPayload;
          if (wordPayload.alignment && signal.target?.panelId === panelId) {
            const alignmentKey = `${wordPayload.alignment.strong}_${wordPayload.alignment.occurrence}`;
            
            // Find the index of the clicked alignment
            const targetIndex = alignments.findIndex(alignment => alignment.id === alignmentKey);
            if (targetIndex !== -1) {
              setCurrentAlignmentIndex(targetIndex);
              setFocusedAlignment(alignmentKey);
              
              // Clear focus after 5 seconds
              setTimeout(() => {
                setFocusedAlignment(null);
              }, 5000);
            }
          }
          break;
        }

        case SIGNAL_TYPES.HIGHLIGHT_ALIGNMENT: {
          const highlightPayload = signal.payload as any; // Use any to handle both old and new formats
          console.log('AlignmentDataResource received HIGHLIGHT_ALIGNMENT signal from visible source:', highlightPayload);
          
          // Handle both old format (alignmentIds array) and new format (alignmentKey string)
          let alignmentIds: string[] = [];
          if (highlightPayload.alignmentIds) {
            // Old format: array of alignment IDs
            alignmentIds = highlightPayload.alignmentIds;
          } else if (highlightPayload.alignmentKey) {
            // New format: single alignment key
            alignmentIds = [highlightPayload.alignmentKey];
          }
          
          setHighlightedAlignments(alignmentIds);
          
          if (highlightPayload.temporary) {
            setTimeout(() => {
              setHighlightedAlignments([]);
            }, 3000);
          }
          break;
        }

        case SIGNAL_TYPES.CLEAR_ALIGNMENT_HIGHLIGHTS:
          console.log('AlignmentDataResource received CLEAR_ALIGNMENT_HIGHLIGHTS signal from visible source');
          setHighlightedAlignments([]);
          break;
      }
    };

    // Subscribe to global signals
    const unsubscribeWordClicked = signalBus.onGlobal(SIGNAL_TYPES.WORD_CLICKED, handleSignal);
    const unsubscribeHighlight = signalBus.onGlobal(SIGNAL_TYPES.HIGHLIGHT_ALIGNMENT, handleSignal);
    const unsubscribeClear = signalBus.onGlobal(SIGNAL_TYPES.CLEAR_ALIGNMENT_HIGHLIGHTS, handleSignal);
    
    return () => {
      unsubscribeWordClicked();
      unsubscribeHighlight();
      unsubscribeClear();
    };
  }, [panelId, signalBus, alignments]);

  const handleAlignmentClick = async (alignment: ExtractedAlignment) => {
    // Emit signal to highlight corresponding words in other panels
    await emitSignal(SIGNAL_TYPES.HIGHLIGHT_TEXT, {
      text: alignment.greekWord,
      highlightId: alignment.id,
      color: 'bg-blue-200'
    });

    // Find all words that align to this Greek word and highlight them
    const wordsToHighlight: string[] = [];
    alignment.englishWords.forEach(englishWord => {
      wordsToHighlight.push(englishWord.text);
    });

    // Emit signal to highlight in source panels
    await emitSignal(SIGNAL_TYPES.HIGHLIGHT_ALIGNMENT, {
      alignmentIds: [alignment.id],
      color: 'bg-blue-200',
      temporary: true
    });
  };

  const goToPrevious = () => {
    setCurrentAlignmentIndex(prev => 
      prev > 0 ? prev - 1 : alignments.length - 1
    );
  };

  const goToNext = () => {
    setCurrentAlignmentIndex(prev => 
      prev < alignments.length - 1 ? prev + 1 : 0
    );
  };

  const formatMorphology = (morph: string): string => {
    // Simplified morphology display
    const parts = morph.split(',');
    const simplified = parts.slice(0, 3).join('.');
    return simplified || morph;
  };

  if (!state.isVisible) {
    return null;
  }

  const currentAlignment = alignments[currentAlignmentIndex];

  return (
    <div 
      id={`resource-${resourceId}`}
      className={`h-full flex flex-col bg-white ${className}`}
      data-resource-id={resourceId}
      data-panel-id={panelId}
    >
      {/* Minimal Navigation - Only show if multiple alignments */}
      {alignments.length > 1 && (
        <div className="flex-shrink-0 flex items-center justify-center px-2 py-2 bg-gray-50/30 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <span className="text-xs text-gray-500 font-medium tabular-nums">
              {currentAlignmentIndex + 1} / {alignments.length}
            </span>
            <div className="flex space-x-1">
              {alignments.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentAlignmentIndex(index)}
                  className={`w-6 h-6 rounded-full transition-all duration-200 flex items-center justify-center ${
                    index === currentAlignmentIndex 
                      ? 'bg-blue-50' 
                      : 'hover:bg-gray-100'
                  }`}
                  title={`Go to alignment ${index + 1}`}
                >
                  <div className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    index === currentAlignmentIndex 
                      ? 'bg-blue-500' 
                      : 'bg-gray-300'
                  }`} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Compact Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {alignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 6.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M12 10v4M10 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-xs font-medium">No alignment data</p>
            <p className="text-xs text-gray-400">Click a word to see alignments</p>
          </div>
        ) : currentAlignment ? (
          <div
            onClick={() => handleAlignmentClick(currentAlignment)}
            className={`
              group p-3 rounded-lg border cursor-pointer transition-all duration-200
              ${focusedAlignment === currentAlignment.id
                ? 'border-blue-200 bg-blue-50/50 shadow-sm'
                : highlightedAlignments.includes(currentAlignment.id)
                ? 'border-blue-100 bg-blue-25'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
              }
            `}
          >
            {/* Greek Word - Compact Hero */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-baseline space-x-2">
                <span className="text-xl font-bold text-gray-900 greek-font leading-none">
                  {currentAlignment.greekWord}
                </span>
                <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                  {currentAlignment.strong}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {currentAlignment.occurrence}/{currentAlignment.occurrences}
              </span>
            </div>

            {/* Lemma - Inline */}
            <div className="mb-3 pb-2 border-b border-gray-100">
              <span className="text-xs text-gray-400 uppercase tracking-wide font-medium mr-2">Lemma</span>
              <span className="text-sm font-medium text-gray-700 greek-font">
                {currentAlignment.lemma}
              </span>
            </div>

            {/* English Alignments - Compact */}
            <div className="space-y-2">
              {['ult', 'ust'].map(source => {
                const sourceWords = currentAlignment.englishWords.filter(w => w.source === source);
                if (sourceWords.length === 0) return null;

                return (
                  <div key={source} className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider w-6 flex-shrink-0">
                      {source}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {sourceWords.map((word, index) => (
                        <span
                          key={`${word.source}-${word.wordIndex}-${index}`}
                          className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded font-medium"
                        >
                          {word.text}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Morphology - Compact Footer */}
            <div className="mt-3 pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-400 uppercase tracking-wide font-medium mr-2">Morph</span>
              <span className="text-xs font-mono text-gray-500">
                {formatMorphology(currentAlignment.morph)}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}; 