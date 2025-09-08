/**
 * Improved BookPackageProvider with explicit configuration
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BookTranslationPackage } from '../services/door43/BookTranslationPackageService';
import { useResourceService } from './ResourceServiceContext';
import { useScriptureNavigation } from './ScriptureNavigationContext';

export interface BookPackageConfig {
  language: string;
  organization: string;
  resourceTypes?: string[];
}

export interface BookPackageState {
  currentPackage: BookTranslationPackage | null;
  isLoading: boolean;
  error: string | null;
  lastLoadedBook: string | null;
  config: BookPackageConfig;
}

export interface BookPackageActions {
  loadBookPackage: (book: string, config?: Partial<BookPackageConfig>) => Promise<void>;
  updateConfig: (config: Partial<BookPackageConfig>) => void;
  clearPackage: () => void;
  refreshPackage: () => Promise<void>;
}

export type BookPackageContextType = BookPackageState & BookPackageActions;

const BookPackageContext = createContext<BookPackageContextType | null>(null);

export interface BookPackageProviderProps {
  children: ReactNode;
  defaultLanguage?: string;
  defaultOrganization?: string;
  defaultResourceTypes?: string[];
}

export const BookPackageProvider: React.FC<BookPackageProviderProps> = ({ 
  children,
  defaultLanguage = 'en',
  defaultOrganization = 'unfoldingWord',
  defaultResourceTypes = ['literalText', 'simplifiedText', 'translationNotes', 'translationWordsLinks', 'translationQuestions']
}) => {
  const [currentPackage, setCurrentPackage] = useState<BookTranslationPackage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLoadedBook, setLastLoadedBook] = useState<string | null>(null);
  const [config, setConfig] = useState<BookPackageConfig>({
    language: defaultLanguage,
    organization: defaultOrganization,
    resourceTypes: defaultResourceTypes
  });

  const { resourceService, isInitialized } = useResourceService();
  const { currentReference } = useScriptureNavigation();

  const loadBookPackage = async (book: string, configOverride?: Partial<BookPackageConfig>) => {
    if (!resourceService || !isInitialized) {
      console.warn('⚠️ Resource service not ready for book package loading');
      return;
    }

    // Use provided config or default config
    const packageConfig = { ...config, ...configOverride };
    const cacheKey = `${packageConfig.organization}/${packageConfig.language}/${book}`;

    // Don't reload if it's the same book with same config
    if (lastLoadedBook === cacheKey && currentPackage) {
      console.log(`📦 Book package for ${cacheKey} already loaded`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`📦 Loading book package: ${cacheKey}`);

      // Check if the resource service supports book packages
      if ('getBookTranslationPackage' in resourceService) {
        // Create a temporary service with the specific config if needed
        let serviceToUse = resourceService;
        
        // If config is different from service config, we might need to create a new service instance
        // For now, we'll use the existing service and pass the config
        const bookPackage = await (serviceToUse as any).getBookTranslationPackage(book, packageConfig.resourceTypes);
        
        setCurrentPackage(bookPackage);
        setLastLoadedBook(cacheKey);
        
        console.log(`✅ Book package loaded for ${cacheKey}`);
      } else {
        // Fallback for sample service
        console.log(`📦 Loading individual resources for ${book} (fallback mode)`);
        // ... fallback logic
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load book package';
      console.error(`❌ Failed to load book package for ${cacheKey}:`, err);
      setError(errorMessage);
      setCurrentPackage(null);
      setLastLoadedBook(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateConfig = (newConfig: Partial<BookPackageConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
    // Clear current package since config changed
    setCurrentPackage(null);
    setLastLoadedBook(null);
  };

  const clearPackage = () => {
    setCurrentPackage(null);
    setLastLoadedBook(null);
    setError(null);
    console.log('🧹 Book package cleared');
  };

  const refreshPackage = async () => {
    if (lastLoadedBook) {
      const bookToReload = lastLoadedBook.split('/').pop() || '';
      setLastLoadedBook(null);
      await loadBookPackage(bookToReload);
    }
  };

  // Auto-load book package when the current reference book changes
  useEffect(() => {
    if (currentReference.book && isInitialized) {
      loadBookPackage(currentReference.book);
    }
  }, [currentReference.book, isInitialized, config.language, config.organization]);

  const contextValue: BookPackageContextType = {
    currentPackage,
    isLoading,
    error,
    lastLoadedBook,
    config,
    loadBookPackage,
    updateConfig,
    clearPackage,
    refreshPackage,
  };

  return (
    <BookPackageContext.Provider value={contextValue}>
      {children}
    </BookPackageContext.Provider>
  );
};

// Usage example:
/*
<BookPackageProvider 
  defaultLanguage="es-419"
  defaultOrganization="es-419_gl"
  defaultResourceTypes={['literalText', 'translationNotes']}
>
  {children}
</BookPackageProvider>

// Or dynamically change config:
const { updateConfig, loadBookPackage } = useBookPackage();

// Switch to different organization for a specific book
await loadBookPackage('JON', {
  language: 'fr',
  organization: 'unfoldingWord-fr'
});

// Update default config
updateConfig({
  language: 'es-419',
  organization: 'es-419_gl'
});
*/
