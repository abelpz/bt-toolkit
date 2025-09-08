/**
 * Multi-Service BookPackageProvider
 * Can manage multiple resource services for different languages/organizations
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BookTranslationPackage } from '../services/door43/BookTranslationPackageService';
import { ResourceServiceFactory, ResourceServiceType } from '../services/ResourceServiceFactory';
import { IResourceService } from '../services/interfaces/IResourceService';
import { useScriptureNavigation } from './ScriptureNavigationContext';

export interface ServiceConfig {
  type: ResourceServiceType;
  language: string;
  organization: string;
  apiToken?: string;
}

export interface BookPackageRequest {
  book: string;
  serviceConfig: ServiceConfig;
  resourceTypes?: string[];
}

export interface BookPackageState {
  packages: Map<string, BookTranslationPackage>;
  loadingBooks: Set<string>;
  errors: Map<string, string>;
  services: Map<string, IResourceService>;
}

export interface BookPackageActions {
  loadBookPackage: (request: BookPackageRequest) => Promise<BookTranslationPackage | null>;
  getPackage: (book: string, serviceConfig: ServiceConfig) => BookTranslationPackage | null;
  clearPackages: () => void;
  clearPackage: (book: string, serviceConfig: ServiceConfig) => void;
}

export type MultiServiceBookPackageContextType = BookPackageState & BookPackageActions;

const MultiServiceBookPackageContext = createContext<MultiServiceBookPackageContextType | null>(null);

export interface MultiServiceBookPackageProviderProps {
  children: ReactNode;
  defaultConfigs: ServiceConfig[];
}

export const MultiServiceBookPackageProvider: React.FC<MultiServiceBookPackageProviderProps> = ({ 
  children,
  defaultConfigs
}) => {
  const [packages, setPackages] = useState<Map<string, BookTranslationPackage>>(new Map());
  const [loadingBooks, setLoadingBooks] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [services, setServices] = useState<Map<string, IResourceService>>(new Map());

  const { currentReference } = useScriptureNavigation();

  // Initialize services for default configs
  useEffect(() => {
    const initializeServices = async () => {
      const newServices = new Map<string, IResourceService>();
      
      for (const config of defaultConfigs) {
        const serviceKey = `${config.type}-${config.language}-${config.organization}`;
        
        try {
          const factory = new ResourceServiceFactory();
          const service = factory.createService(config.type, {
            language: config.language,
            organization: config.organization,
            apiToken: config.apiToken
          });
          
          await service.initialize();
          newServices.set(serviceKey, service);
          console.log(`✅ Initialized service: ${serviceKey}`);
        } catch (error) {
          console.error(`❌ Failed to initialize service ${serviceKey}:`, error);
        }
      }
      
      setServices(newServices);
    };

    initializeServices();
  }, [defaultConfigs]);

  const getServiceKey = (config: ServiceConfig): string => {
    return `${config.type}-${config.language}-${config.organization}`;
  };

  const getPackageKey = (book: string, config: ServiceConfig): string => {
    return `${book}-${getServiceKey(config)}`;
  };

  const getOrCreateService = async (config: ServiceConfig): Promise<IResourceService> => {
    const serviceKey = getServiceKey(config);
    
    if (services.has(serviceKey)) {
      return services.get(serviceKey)!;
    }

    // Create new service
    const factory = new ResourceServiceFactory();
    const service = factory.createService(config.type, {
      language: config.language,
      organization: config.organization,
      apiToken: config.apiToken
    });

    await service.initialize();
    
    setServices(prev => new Map(prev).set(serviceKey, service));
    console.log(`✅ Created new service: ${serviceKey}`);
    
    return service;
  };

  const loadBookPackage = async (request: BookPackageRequest): Promise<BookTranslationPackage | null> => {
    const packageKey = getPackageKey(request.book, request.serviceConfig);
    
    // Check if already loaded
    if (packages.has(packageKey)) {
      console.log(`📦 Package already loaded: ${packageKey}`);
      return packages.get(packageKey)!;
    }

    // Check if currently loading
    if (loadingBooks.has(packageKey)) {
      console.log(`⏳ Package already loading: ${packageKey}`);
      return null;
    }

    setLoadingBooks(prev => new Set(prev).add(packageKey));
    setErrors(prev => {
      const newErrors = new Map(prev);
      newErrors.delete(packageKey);
      return newErrors;
    });

    try {
      console.log(`📦 Loading package: ${packageKey}`);
      
      const service = await getOrCreateService(request.serviceConfig);
      
      let bookPackage: BookTranslationPackage;
      
      if ('getBookTranslationPackage' in service) {
        // Use advanced book package system
        bookPackage = await (service as any).getBookTranslationPackage(
          request.book, 
          request.resourceTypes || ['literalText', 'simplifiedText', 'translationNotes', 'translationWordsLinks', 'translationQuestions']
        );
      } else {
        // Fallback: create package from individual resources
        const [literalText, simplifiedText, translationNotes, translationWordsLinks, translationQuestions] = await Promise.all([
          service.getBibleText(request.book, 'ult'),
          service.getBibleText(request.book, 'ust'),
          service.getTranslationNotes(request.book),
          service.getTranslationWordsLinks(request.book),
          service.getTranslationQuestions(request.book)
        ]);

        bookPackage = {
          book: request.book,
          language: request.serviceConfig.language,
          organization: request.serviceConfig.organization,
          fetchedAt: new Date(),
          repositories: {},
          literalText: literalText ? { source: 'fallback-ult', content: literalText.content, processed: literalText } : undefined,
          simplifiedText: simplifiedText ? { source: 'fallback-ust', content: simplifiedText.content, processed: simplifiedText } : undefined,
          translationNotes: translationNotes ? { source: 'fallback-tn', content: '', processed: translationNotes } : undefined,
          translationWordsLinks: translationWordsLinks ? { source: 'fallback-twl', content: '', processed: translationWordsLinks } : undefined,
          translationQuestions: translationQuestions ? { source: 'fallback-tq', content: '', processed: translationQuestions } : undefined
        };
      }

      setPackages(prev => new Map(prev).set(packageKey, bookPackage));
      console.log(`✅ Package loaded: ${packageKey}`);
      
      return bookPackage;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load package';
      console.error(`❌ Failed to load package ${packageKey}:`, error);
      setErrors(prev => new Map(prev).set(packageKey, errorMessage));
      return null;
    } finally {
      setLoadingBooks(prev => {
        const newLoading = new Set(prev);
        newLoading.delete(packageKey);
        return newLoading;
      });
    }
  };

  const getPackage = (book: string, serviceConfig: ServiceConfig): BookTranslationPackage | null => {
    const packageKey = getPackageKey(book, serviceConfig);
    return packages.get(packageKey) || null;
  };

  const clearPackages = () => {
    setPackages(new Map());
    setErrors(new Map());
    setLoadingBooks(new Set());
    console.log('🧹 All packages cleared');
  };

  const clearPackage = (book: string, serviceConfig: ServiceConfig) => {
    const packageKey = getPackageKey(book, serviceConfig);
    setPackages(prev => {
      const newPackages = new Map(prev);
      newPackages.delete(packageKey);
      return newPackages;
    });
    setErrors(prev => {
      const newErrors = new Map(prev);
      newErrors.delete(packageKey);
      return newErrors;
    });
    console.log(`🧹 Package cleared: ${packageKey}`);
  };

  const contextValue: MultiServiceBookPackageContextType = {
    packages,
    loadingBooks,
    errors,
    services,
    loadBookPackage,
    getPackage,
    clearPackages,
    clearPackage,
  };

  return (
    <MultiServiceBookPackageContext.Provider value={contextValue}>
      {children}
    </MultiServiceBookPackageContext.Provider>
  );
};

export const useMultiServiceBookPackage = (): MultiServiceBookPackageContextType => {
  const context = useContext(MultiServiceBookPackageContext);
  if (!context) {
    throw new Error('useMultiServiceBookPackage must be used within a MultiServiceBookPackageProvider');
  }
  return context;
};

// Usage example:
/*
<MultiServiceBookPackageProvider
  defaultConfigs={[
    { type: 'door43-api', language: 'en', organization: 'unfoldingWord' },
    { type: 'door43-api', language: 'es-419', organization: 'es-419_gl' },
    { type: 'sample', language: 'en', organization: 'sample' }
  ]}
>
  {children}
</MultiServiceBookPackageProvider>

// Usage in components:
const { loadBookPackage, getPackage } = useMultiServiceBookPackage();

// Load English UW version
await loadBookPackage({
  book: 'JON',
  serviceConfig: { type: 'door43-api', language: 'en', organization: 'unfoldingWord' }
});

// Load Spanish version
await loadBookPackage({
  book: 'JON', 
  serviceConfig: { type: 'door43-api', language: 'es-419', organization: 'es-419_gl' }
});

// Get loaded packages
const englishPackage = getPackage('JON', { type: 'door43-api', language: 'en', organization: 'unfoldingWord' });
const spanishPackage = getPackage('JON', { type: 'door43-api', language: 'es-419', organization: 'es-419_gl' });
*/
