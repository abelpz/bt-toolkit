/**
 * Token Underlining Context
 * 
 * Provides a context for managing token groups that should be underlined
 * in scripture rendering. Supports multiple sources (notes, translation words, etc.)
 * with different colors for each group.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { OptimizedToken } from '../services/usfm-processor';

export interface TokenGroup {
  id: string;
  sourceType: 'notes' | 'translation-words' | 'other';
  sourceId: string; // e.g., note ID, TW link ID
  tokens: OptimizedToken[];
  label?: string; // Optional display label
}

interface TokenUnderliningContextType {
  tokenGroups: TokenGroup[];
  addTokenGroup: (group: TokenGroup) => void;
  removeTokenGroup: (groupId: string) => void;
  clearTokenGroups: (sourceType?: TokenGroup['sourceType']) => void;
  getTokenGroupForAlignedId: (alignedId: number) => TokenGroup | null;
  getColorClassForGroup: (groupId: string) => string;
}

const TokenUnderliningContext = createContext<TokenUnderliningContextType | null>(null);

// Predefined color classes for different groups
const COLOR_CLASSES = [
  'border-b-2 border-blue-500',
  'border-b-2 border-green-500', 
  'border-b-2 border-purple-500',
  'border-b-2 border-red-500',
  'border-b-2 border-yellow-500',
  'border-b-2 border-pink-500',
  'border-b-2 border-indigo-500',
  'border-b-2 border-orange-500',
  'border-b-2 border-teal-500',
  'border-b-2 border-cyan-500',
];

export const TokenUnderliningProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tokenGroups, setTokenGroups] = useState<TokenGroup[]>([]);
  const [groupColorMap, setGroupColorMap] = useState<Map<string, string>>(new Map());

  const addTokenGroup = useCallback((group: TokenGroup) => {
    setTokenGroups(prev => {
      // Remove existing group with same ID if it exists
      const filtered = prev.filter(g => g.id !== group.id);
      return [...filtered, group];
    });

    // Assign color if not already assigned
    setGroupColorMap(prev => {
      if (!prev.has(group.id)) {
        const newMap = new Map(prev);
        const usedColors = new Set(prev.values());
        const availableColor = COLOR_CLASSES.find(color => !usedColors.has(color)) || COLOR_CLASSES[0];
        newMap.set(group.id, availableColor);
        return newMap;
      }
      return prev;
    });
  }, []);

  const removeTokenGroup = useCallback((groupId: string) => {
    setTokenGroups(prev => prev.filter(g => g.id !== groupId));
    setGroupColorMap(prev => {
      const newMap = new Map(prev);
      newMap.delete(groupId);
      return newMap;
    });
  }, []);

  const clearTokenGroups = useCallback((sourceType?: TokenGroup['sourceType']) => {
    if (sourceType) {
      setTokenGroups(prev => {
        const toRemove = prev.filter(g => g.sourceType === sourceType);
        toRemove.forEach(g => {
          setGroupColorMap(prevMap => {
            const newMap = new Map(prevMap);
            newMap.delete(g.id);
            return newMap;
          });
        });
        return prev.filter(g => g.sourceType !== sourceType);
      });
    } else {
      setTokenGroups([]);
      setGroupColorMap(new Map());
    }
  }, []);

  const getTokenGroupForAlignedId = useCallback((alignedId: number): TokenGroup | null => {
    for (const group of tokenGroups) {
      for (const token of group.tokens) {
        if (token.id === alignedId) {
          return group;
        }
      }
    }
    return null;
  }, [tokenGroups]);

  const getColorClassForGroup = useCallback((groupId: string): string => {
    return groupColorMap.get(groupId) || COLOR_CLASSES[0];
  }, [groupColorMap]);

  const value: TokenUnderliningContextType = {
    tokenGroups,
    addTokenGroup,
    removeTokenGroup,
    clearTokenGroups,
    getTokenGroupForAlignedId,
    getColorClassForGroup,
  };

  return (
    <TokenUnderliningContext.Provider value={value}>
      {children}
    </TokenUnderliningContext.Provider>
  );
};

export const useTokenUnderlining = (): TokenUnderliningContextType => {
  const context = useContext(TokenUnderliningContext);
  if (!context) {
    throw new Error('useTokenUnderlining must be used within a TokenUnderliningProvider');
  }
  return context;
};
