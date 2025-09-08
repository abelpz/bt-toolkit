/**
 * Passage Sets Navigator - Iteration 2
 * Navigate using preset passage collections
 */

import React, { useState } from 'react';
import { RangeReference } from '../../types/navigation';
import { 
  DEFAULT_PASSAGE_SETS, 
  PassageSet, 
  PassageCategory, 
  Passage,
  formatPassageRanges 
} from '../../data/passage-sets';

export interface PassageSetsNavigatorProps {
  currentRange: RangeReference;
  onRangeSelect: (range: RangeReference) => void;
}

export const PassageSetsNavigator: React.FC<PassageSetsNavigatorProps> = ({
  currentRange,
  onRangeSelect
}) => {
  const [selectedSetId, setSelectedSetId] = useState<string>(DEFAULT_PASSAGE_SETS[0]?.id || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const selectedSet = DEFAULT_PASSAGE_SETS.find(set => set.id === selectedSetId);
  const selectedCategory = selectedSet?.categories.find(cat => cat.id === selectedCategoryId);

  const handleSetSelect = (setId: string) => {
    setSelectedSetId(setId);
    setSelectedCategoryId('');
    setExpandedCategories(new Set());
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
  };

  const toggleCategoryExpansion = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handlePassageSelect = (passage: Passage) => {
    // For passages with multiple ranges, select the first one
    // In the future, we could allow users to select which range to navigate to
    if (passage.ranges.length > 0) {
      onRangeSelect(passage.ranges[0]);
    }
  };

  const isCurrentPassage = (passage: Passage): boolean => {
    return passage.ranges.some(range => 
      range.book === currentRange.book &&
      range.startChapter === currentRange.startChapter &&
      range.startVerse === currentRange.startVerse &&
      range.endChapter === currentRange.endChapter &&
      range.endVerse === currentRange.endVerse
    );
  };

  const renderPassageSetSelection = () => (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
        Select Passage Set
      </h3>
      <div className="space-y-2">
        {DEFAULT_PASSAGE_SETS.map((set) => (
          <button
            key={set.id}
            onClick={() => handleSetSelect(set.id)}
            className={`
              w-full p-3 text-left rounded-lg transition-colors duration-200
              ${set.id === selectedSetId
                ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-400'
                : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-transparent'
              }
            `}
          >
            <div className={`font-medium ${
              set.id === selectedSetId
                ? 'text-blue-900 dark:text-blue-100'
                : 'text-gray-900 dark:text-gray-100'
            }`}>
              {set.name}
            </div>
            <div className={`text-sm mt-1 ${
              set.id === selectedSetId
                ? 'text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400'
            }`}>
              {set.description}
            </div>
            <div className={`text-xs mt-2 ${
              set.id === selectedSetId
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-500'
            }`}>
              {set.categories.length} categories • v{set.version}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderCategorySelection = () => {
    if (!selectedSet) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Categories in {selectedSet.name}
          </h3>
          <button
            onClick={() => setSelectedSetId('')}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to Sets
          </button>
        </div>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {selectedSet.categories.map((category) => (
            <div key={category.id} className="space-y-1">
              <button
                onClick={() => toggleCategoryExpansion(category.id)}
                className={`
                  w-full p-3 text-left rounded-lg transition-colors duration-200
                  ${expandedCategories.has(category.id)
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{category.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {category.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {category.description}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      {category.passages.length} passages
                    </span>
                    <span className={`transform transition-transform duration-200 ${
                      expandedCategories.has(category.id) ? 'rotate-180' : ''
                    }`}>
                      ▼
                    </span>
                  </div>
                </div>
              </button>
              
              {expandedCategories.has(category.id) && (
                <div className="ml-4 space-y-1">
                  {category.passages.map((passage) => (
                    <button
                      key={passage.id}
                      onClick={() => handlePassageSelect(passage)}
                      className={`
                        w-full p-2 text-left rounded-md transition-colors duration-200 text-sm
                        ${isCurrentPassage(passage)
                          ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-600'
                          : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
                        }
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className={`font-medium ${
                            isCurrentPassage(passage)
                              ? 'text-blue-900 dark:text-blue-100'
                              : 'text-gray-900 dark:text-gray-100'
                          }`}>
                            {passage.name}
                          </div>
                          {passage.description && (
                            <div className={`text-xs mt-1 ${
                              isCurrentPassage(passage)
                                ? 'text-blue-700 dark:text-blue-300'
                                : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              {passage.description}
                            </div>
                          )}
                        </div>
                        <div className={`text-xs font-mono ml-2 ${
                          isCurrentPassage(passage)
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-gray-500 dark:text-gray-500'
                        }`}>
                          {formatPassageRanges(passage.ranges)}
                        </div>
                      </div>
                      
                      {isCurrentPassage(passage) && (
                        <div className="mt-1 flex items-center text-xs text-blue-600 dark:text-blue-400">
                          <span className="mr-1">✓</span>
                          Current passage
                        </div>
                      )}
                      
                      {passage.ranges.length > 1 && (
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                          {passage.ranges.length} ranges • Click to go to first range
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="passage-sets-navigator space-y-4">
      {!selectedSetId ? renderPassageSetSelection() : renderCategorySelection()}
      
      {/* Info Footer */}
      <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
        <div className="font-medium mb-1">About Passage Sets</div>
        <div>
          Passage sets are curated collections of related Bible passages organized by themes, 
          topics, or study purposes. Each passage may contain multiple ranges.
        </div>
      </div>
    </div>
  );
};

export default PassageSetsNavigator;
