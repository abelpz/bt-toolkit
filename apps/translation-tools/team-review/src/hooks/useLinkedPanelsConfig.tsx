import { useMemo } from 'react';
import { LinkedPanelsConfig } from 'linked-panels';
import { ResourceCard } from '../components/ResourceCard';
import {
  ULTCard,
  USTCard,
  AlignmentDataCard,
  TranslationNotesCard,
  GreekWordsCard,
} from '../components/cards';
import { VerseText, TranslationNote } from '../types';

interface UseLinkedPanelsConfigParams {
  ultVerse: VerseText;
  ustVerse: VerseText;
  verseNotes: TranslationNote[];
}

/**
 * Custom hook to generate LinkedPanels configuration for translation tools
 * @param params - Verse data needed for the configuration
 * @returns LinkedPanels configuration object
 */
export const useLinkedPanelsConfig = ({
  ultVerse,
  ustVerse,
  verseNotes,
}: UseLinkedPanelsConfigParams): LinkedPanelsConfig => {
  const config = useMemo((): LinkedPanelsConfig => {
    return {
      resources: [
        {
          id: 'ult-text',
          title: 'ULT - Literal Translation',
          description:
            'UnfoldingWord Literal Text - Word-for-word translation from Greek',
          category: 'scripture',
          component: (
            <ResourceCard
              id="ult-text"
              component={<ULTCard verse={ultVerse} resourceId="ult-text" />}
            />
          ),
        },
        {
          id: 'ust-text',
          title: 'UST - Simplified Translation',
          description:
            'UnfoldingWord Simplified Text - Meaning-based translation',
          category: 'scripture',
          component: (
            <ResourceCard
              id="ust-text"
              component={<USTCard verse={ustVerse} resourceId="ust-text" />}
            />
          ),
        },
        {
          id: 'alignment-data',
          title: 'Word Alignments',
          description: 'Greek-to-Spanish word alignment data from ULT',
          category: 'analysis',
          component: (
            <ResourceCard
              id="alignment-data"
              component={<AlignmentDataCard verse={ultVerse} resourceId="alignment-data" />}
            />
          ),
        },
        {
          id: 'translation-notes',
          title: 'Translation Notes',
          description: 'Detailed explanatory notes for translators',
          category: 'notes',
          component: (
            <ResourceCard
              id="translation-notes"
              component={<TranslationNotesCard notes={verseNotes} resourceId="translation-notes" />}
            />
          ),
        },
        {
          id: 'greek-words',
          title: 'Greek Analysis',
          description: "Greek word analysis with Strong's numbers and lemmas",
          category: 'analysis',
          component: (
            <ResourceCard
              id="greek-words"
              component={<GreekWordsCard verse={ultVerse} resourceId="greek-words" />}
            />
          ),
        },
      ],
      panels: {
        top: {
          resourceIds: ['ult-text', 'ust-text'],
        },
        bottom: {
          resourceIds: ['ust-text','translation-notes', 'greek-words', 'alignment-data'],
        },
      },
    };
  }, [ultVerse, ustVerse, verseNotes]);

  return config;
}; 