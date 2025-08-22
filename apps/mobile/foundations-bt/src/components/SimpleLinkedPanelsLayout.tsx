import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';

// Import our simple resource components
import { SimpleNavigationResource } from './resources/SimpleNavigationResource';
import { SimpleScriptureResource } from './resources/SimpleScriptureResource';
import { SimpleTranslationHelpsResource } from './resources/SimpleTranslationHelpsResource';

// Import contexts
import { useScriptureNavigation } from '../contexts/ScriptureNavigationContext';

// Simple resource management without the linked-panels library
interface SimpleResource {
  id: string;
  component: React.ReactNode;
  title: string;
  description: string;
  icon: string;
  category: string;
}

interface SimplePanel {
  id: string;
  resourceIds: string[];
  currentIndex: number;
}

export const SimpleLinkedPanelsLayout: React.FC = () => {
  const { currentReference } = useScriptureNavigation();

  // Simple state management
  const [panels, setPanels] = useState<Record<string, SimplePanel>>({
    'top-panel': {
      id: 'top-panel',
      resourceIds: ['navigation', 'scripture'],
      currentIndex: 0
    },
    'bottom-panel': {
      id: 'bottom-panel',
      resourceIds: ['translation-helps'],
      currentIndex: 0
    }
  });

  // Define resources
  const resources = useMemo((): Record<string, SimpleResource> => ({
    'navigation': {
      id: 'navigation',
      component: <SimpleNavigationResource resourceId="navigation" />,
      title: 'Navigation',
      description: 'Scripture navigation controls',
      icon: '🧭',
      category: 'navigation'
    },
    'scripture': {
      id: 'scripture',
      component: <SimpleScriptureResource resourceId="scripture" />,
      title: 'Scripture',
      description: 'Bible text with word-level alignment',
      icon: '📖',
      category: 'text'
    },
    'translation-helps': {
      id: 'translation-helps',
      component: <SimpleTranslationHelpsResource resourceId="translation-helps" />,
      title: 'Translation Helps',
      description: 'Notes, questions, and word definitions',
      icon: '💡',
      category: 'helps'
    }
  }), []);

  const navigateToResource = (panelId: string, index: number) => {
    setPanels(prev => ({
      ...prev,
      [panelId]: {
        ...prev[panelId],
        currentIndex: index
      }
    }));
  };

  const renderPanel = (panelId: string, style: any) => {
    const panel = panels[panelId];
    if (!panel) return null;

    const currentResource = resources[panel.resourceIds[panel.currentIndex]];
    if (!currentResource) return null;

    return (
      <View style={style}>
        {/* Panel Header */}
        <View style={styles.panelHeader}>
          <View style={styles.resourceInfo}>
            <Text style={styles.resourceIcon}>{currentResource.icon}</Text>
            <Text style={styles.resourceTitle}>{currentResource.title}</Text>
          </View>
          
          {/* Navigation Controls */}
          {panel.resourceIds.length > 1 && (
            <View style={styles.navigationControls}>
              <View style={styles.resourceTabs}>
                {panel.resourceIds.map((resourceId, index) => {
                  const resource = resources[resourceId];
                  return (
                    <TouchableOpacity
                      key={resourceId}
                      style={[
                        styles.resourceTab,
                        index === panel.currentIndex && styles.activeResourceTab
                      ]}
                      onPress={() => navigateToResource(panelId, index)}
                    >
                      <Text style={styles.resourceTabIcon}>{resource.icon}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>
        
        {/* Resource Content */}
        <View style={styles.resourceContent}>
          {currentResource.component}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Panel */}
      {renderPanel('top-panel', styles.topPanel)}

      {/* Bottom Panel */}
      {renderPanel('bottom-panel', styles.bottomPanel)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topPanel: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    margin: 8,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bottomPanel: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    margin: 8,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  resourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  resourceIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  navigationControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resourceTabs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resourceTab: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 4,
    borderRadius: 4,
    backgroundColor: '#e2e8f0',
  },
  activeResourceTab: {
    backgroundColor: '#3b82f6',
  },
  resourceTabIcon: {
    fontSize: 14,
  },
  resourceContent: {
    flex: 1,
  },
});

export default SimpleLinkedPanelsLayout;
