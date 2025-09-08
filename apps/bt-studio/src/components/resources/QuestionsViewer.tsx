/**
 * Translation Questions Viewer Component
 * 
 * Displays Translation Questions (TQ) content with filtering and navigation
 */

import { useState, useEffect, useMemo } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { ProcessedQuestions, TranslationQuestion } from '../../services/questions-processor';
import { ResourceType } from '../../types/context';

export interface QuestionsViewerProps {
  resourceId: string;
  loading?: boolean;
  error?: string;
  questions?: ProcessedQuestions;
  currentChapter?: number;
}

export function QuestionsViewer({ 
  resourceId, 
  loading = false, 
  error, 
  questions: propQuestions, 
  currentChapter = 1 
}: QuestionsViewerProps) {
  const { resourceManager, processedResourceConfig } = useWorkspace();
  const { currentReference } = useNavigation();
  
  const [actualQuestions, setActualQuestions] = useState<ProcessedQuestions | null>(propQuestions || null);
  const [contentLoading, setContentLoading] = useState(false);
  const [displayError, setDisplayError] = useState<string | null>(error || null);


  // Load questions content when reference changes
  useEffect(() => {
    if (!resourceManager || !currentReference || propQuestions) {
      return; // Use prop questions if provided
    }

    const loadQuestions = async () => {
      setContentLoading(true);
      setDisplayError(null);

      try {
        console.log(`📖 Loading Translation Questions for ${currentReference.book}`);
        
        // Find the resource config to get the correct adapter resource ID
        const resourceConfig = processedResourceConfig?.find((config: { panelResourceId: string; metadata: { server: string; owner: string; language: string; id: string; type: string } }) => config.panelResourceId === resourceId);
        if (!resourceConfig) {
          throw new Error(`Resource config not found for ${resourceId}`);
        }
        
        // Construct the full content key in the same format as NotesViewer
        const contentKey = `${resourceConfig.metadata.server}/${resourceConfig.metadata.owner}/${resourceConfig.metadata.language}/${resourceConfig.metadata.id}/${currentReference.book}`;
        
        const content = await resourceManager.getOrFetchContent(
          contentKey, // Full key format: server/owner/language/resourceId/book
          resourceConfig.metadata.type as ResourceType // Resource type from metadata
        );
        
        if (content) {
          const processedQuestions = content as unknown as ProcessedQuestions;
          if (processedQuestions && processedQuestions.questions && Array.isArray(processedQuestions.questions)) {
            setActualQuestions(processedQuestions);
            console.log(`✅ Loaded ${processedQuestions.questions.length} questions for ${currentReference.book}`);
          } else {
            console.warn(`⚠️ Invalid questions data structure:`, processedQuestions);
            setDisplayError(`Invalid Translation Questions data for ${currentReference.book}`);
          }
        } else {
          setDisplayError(`No Translation Questions found for ${currentReference.book}`);
        }
      } catch (err) {
        console.error(`❌ Failed to load Translation Questions:`, err);
        setDisplayError(err instanceof Error ? err.message : 'Failed to load Translation Questions');
      } finally {
        setContentLoading(false);
      }
    };

    loadQuestions();
  }, [resourceManager, currentReference, resourceId, propQuestions, processedResourceConfig]);

  // Filter questions based on current navigation reference (matching NotesViewer logic)
  const filteredQuestions = useMemo(() => {
    if (!actualQuestions?.questions || !currentReference) {
      return actualQuestions?.questions || [];
    }
    
    return actualQuestions.questions.filter((question: TranslationQuestion) => {
      // Parse chapter and verse from reference (e.g., "1:1" -> chapter: 1, verse: 1)
      const refParts = question.reference.split(':');
      const questionChapter = parseInt(refParts[0] || '1');
      const questionVerse = parseInt(refParts[1] || '1');
      
      // Determine the range bounds (default to single verse/chapter if no end specified)
      const startChapter = currentReference.chapter;
      const startVerse = currentReference.verse;
      const endChapter = currentReference.endChapter || currentReference.chapter;
      const endVerse = currentReference.endVerse || currentReference.verse;
      
      // Skip filtering if we don't have valid chapter/verse data
      if (!startChapter || !startVerse) {
        return true;
      }
      
      // Check if question is within the chapter range
      if (questionChapter < startChapter) {
        return false;
      }
      if (endChapter && questionChapter > endChapter) {
        return false;
      }
      
      // Filter by start verse in start chapter
      if (questionChapter === startChapter && questionVerse < startVerse) {
        return false;
      }
      
      // Filter by end verse in end chapter
      if (endChapter && endVerse && questionChapter === endChapter && questionVerse > endVerse) {
        return false;
      }
      
      return true;
    });
  }, [actualQuestions?.questions, currentReference]);

  // Loading state
  if (loading || contentLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-600">Loading Translation Questions...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (displayError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-500 mb-2">
            <span role="img" aria-label="Warning">⚠️</span>
          </div>
          <p className="text-sm text-red-600">{displayError}</p>
        </div>
      </div>
    );
  }

  // No questions state
  if (!actualQuestions || filteredQuestions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <span role="img" aria-label="Question">❓</span>
          </div>
          <p className="text-sm text-gray-600">
            No Translation Questions available for this passage
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Questions Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-4">
          {filteredQuestions.map((question, index) => (
            <QuestionCard 
              key={`${question.id}-${index}`} 
              question={question}
              index={index + 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface QuestionCardProps {
  question: TranslationQuestion;
  index: number;
}

function QuestionCard({ question, index }: QuestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Question Header */}
      <div 
        className="p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                {index}
              </span>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {question.reference}
              </span>
              {question.tags && (
                <span className="text-xs text-gray-400">
                  • {question.tags}
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-gray-900 leading-relaxed">
              {question.question}
            </p>
            {question.quote && (
              <div className="mt-2 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                <span className="font-medium">Quote:</span> "{question.quote}"
              </div>
            )}
          </div>
          <div className="ml-4 flex-shrink-0">
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Answer Section */}
      {isExpanded && (
        <div className="p-3 border-t border-gray-200 bg-white">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
            <div className="text-sm text-gray-700 leading-relaxed pl-4 border-l-2 border-green-200">
              {question.response}
            </div>
            
            {/* Additional metadata */}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>ID: {question.id}</span>
                {question.occurrence && (
                  <span>Occurrence: {question.occurrence}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
