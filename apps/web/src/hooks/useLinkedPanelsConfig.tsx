/**
 * Linked Panels Configuration Hook
 * Manages the configuration for multiple scripture and notes resources
 */

import { useMemo } from 'react';
import { ScripturePanel } from '../components/ScripturePanel';
import { USTScripturePanel } from '../components/USTScripturePanel';
import { NotesPanel } from '../components/NotesPanel';
import { useDoor43 } from '../contexts/Door43Context';
import type { RangeReference } from '../types/navigation';

// Import the correct types from linked-panels
import type { Resource, LinkedPanelsConfig as LinkedPanelsConfigType } from 'linked-panels';

// Use the correct types from linked-panels
export type LinkedPanelsResource = Resource;
export type LinkedPanelsConfig = LinkedPanelsConfigType;

interface UseLinkedPanelsConfigParams {
  currentRange?: RangeReference;
}

/**
 * Custom hook to generate LinkedPanels configuration for translation studio
 * @param params - Current navigation range
 * @returns LinkedPanels configuration object
 */
export const useLinkedPanelsConfig = ({
  currentRange,
}: UseLinkedPanelsConfigParams): LinkedPanelsConfig => {
  const { getResourceInfo } = useDoor43();
  
  // Create stable component instances that don't recreate on navigation
  // Components will get currentRange from NavigationContext internally
  const ultComponent = useMemo(() => <ScripturePanel />, []);
  const ustComponent = useMemo(() => <USTScripturePanel />, []);
  const notesComponent = useMemo(() => <NotesPanel />, []);

  const config = useMemo((): LinkedPanelsConfig => {
    // Get resource info from Door43Context with fallbacks
    const ultInfo = getResourceInfo('ult');
    const ustInfo = getResourceInfo('ust');
    const tnInfo = getResourceInfo('tn'); // Translation Notes
    
    return {
      resources: [
        {
          id: 'ult-scripture',
          title: ultInfo?.title || 'ULT - Literal Translation',
          description: ultInfo?.description || 'UnfoldingWord Literal Text - Word-for-word translation preserving original structure',
          category: 'scripture',
          icon: ultInfo?.icon || '📖',
          component: ultComponent,
        },
        {
          id: 'ust-scripture',
          title: ustInfo?.title || 'UST - Simplified Translation', 
          description: ustInfo?.description || 'UnfoldingWord Simplified Text - Meaning-based translation for clarity',
          category: 'scripture',
          icon: ustInfo?.icon || '📚',
          component: ustComponent,
        },
        {
          id: 'translation-notes',
          title: tnInfo?.title || 'Translation Notes',
          description: tnInfo?.description || 'Detailed explanatory notes and guidance for translators',
          category: 'notes',
          icon: tnInfo?.icon || '📝',
          component: notesComponent,
        },
      ],
      panels: {
        'scripture-panel': {
          resourceIds: ['ult-scripture', 'ust-scripture'],
          initialResourceId: 'ult-scripture'
        },
        'notes-panel': {
          resourceIds: ['ust-scripture', 'translation-notes'],
          initialResourceId: 'translation-notes'
        }
      },
    };
  }, [ultComponent, ustComponent, notesComponent, getResourceInfo]);

  return config;
};
