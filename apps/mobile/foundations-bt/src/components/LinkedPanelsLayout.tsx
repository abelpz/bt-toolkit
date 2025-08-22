import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { 
  LinkedPanelsContainer, 
  LinkedPanel,
  createDefaultPluginRegistry,
  type LinkedPanelsConfig 
} from 'linked-panels';

// Import our individual resource components
import { 
  SimplifiedTextResource,
  LiteralTextResource,
  TranslationNotesResource,
  TranslationWordsResource,
  TranslationQuestionsResource
} from './resources';

// Import navigation component
import ScriptureNavigator from '../modules/navigation/ScriptureNavigator';

// Import contexts
import { useScriptureNavigation } from '../contexts/ScriptureNavigationContext';

export const LinkedPanelsLayout: React.FC = () => {
  const { currentReference, availableBooks, setCurrentReference } = useScriptureNavigation();

  // Create the linked panels configuration
  const config: LinkedPanelsConfig = React.useMemo(() => ({
    resources: [
      // Top panel resources
      {
        id: 'simplified-text',
        component: React.createElement(SimplifiedTextResource, { 
          resourceId: 'simplified-text',
          textType: 'ust'
        }),
        title: 'Simplified Text',
        description: 'Unlocked Simplified Text (UST)',
        icon: '📝',
        category: 'text'
      },
      {
        id: 'literal-text',
        component: React.createElement(LiteralTextResource, { 
          resourceId: 'literal-text',
          textType: 'ult'
        }),
        title: 'Literal Text',
        description: 'Unlocked Literal Text (ULT)',
        icon: '📖',
        category: 'text'
      },
      // Bottom panel resources
      {
        id: 'translation-notes',
        component: React.createElement(TranslationNotesResource, { resourceId: 'translation-notes' }),
        title: 'Translation Notes',
        description: 'Detailed translation guidance',
        icon: '📝',
        category: 'helps'
      },
      {
        id: 'translation-words',
        component: React.createElement(TranslationWordsResource, { resourceId: 'translation-words' }),
        title: 'Translation Words',
        description: 'Key term definitions',
        icon: '📚',
        category: 'helps'
      },
      {
        id: 'translation-questions',
        component: React.createElement(TranslationQuestionsResource, { resourceId: 'translation-questions' }),
        title: 'Translation Questions',
        description: 'Comprehension questions',
        icon: '❓',
        category: 'helps'
      },
      {
        id: 'simplified-text-bottom',
        component: React.createElement(SimplifiedTextResource, { 
          resourceId: 'simplified-text-bottom',
          textType: 'ust'
        }),
        title: 'Simplified Text',
        description: 'Unlocked Simplified Text (UST)',
        icon: '📝',
        category: 'text'
      }
    ],
    panels: {
      'top-panel': {
        resourceIds: ['simplified-text', 'literal-text'],
        initialResourceId: 'simplified-text'
      },
      'bottom-panel': {
        resourceIds: ['translation-notes', 'translation-words', 'translation-questions', 'simplified-text-bottom'],
        initialResourceId: 'translation-notes'
      }
    }
  }), []);

  // Create plugin registry for inter-resource communication
  const pluginRegistry = React.useMemo(() => createDefaultPluginRegistry(), []);

        return (
    <View style={styles.container}>
      {/* Navigation Header */}
      <View style={styles.navigationHeader}>
                      <ScriptureNavigator
          currentReference={currentReference}
          availableBooks={availableBooks}
          onNavigate={setCurrentReference}
        />
      </View>

      <LinkedPanelsContainer 
        config={config}
        plugins={pluginRegistry}
        options={{
          enableDevtools: __DEV__,
          enableChaining: true,
          maxChainHops: 3,
          messageRetention: 1000
        }}
      >
        {/* Top Panel */}
        <View style={styles.topPanel}>
          <LinkedPanel id="top-panel">
            {({ current, navigate, getResourceInfo }) => (
              <View style={styles.panelContent}>
                {/* Panel Header */}
                <View style={styles.panelHeader}>
                  <View style={styles.resourceInfo}>
                    {getResourceInfo() && (
                      <>
                        <Text style={styles.resourceIcon}>{getResourceInfo()?.icon}</Text>
                        <Text style={styles.resourceTitle}>{getResourceInfo()?.title}</Text>
                      </>
            )}
          </View>
                  
                  {/* Navigation Controls */}
                  {current.panel.totalResources > 1 && (
                    <View style={styles.navigationControls}>
                      <View style={styles.resourceTabs}>
                        {current.panel.resources.map((resource, index) => (
                          <TouchableOpacity
                            key={resource.id}
              style={[
                              styles.resourceTab,
                              index === current.index && styles.activeResourceTab
                            ]}
                            onPress={() => navigate.toIndex(index)}
                          >
                            <Text style={styles.resourceTabIcon}>{resource.icon}</Text>
                          </TouchableOpacity>
          ))}
        </View>
      </View>
                  )}
                </View>
                
                {/* Resource Content */}
                <View style={styles.resourceContent}>
                  {current.resource?.component}
                </View>
              </View>
            )}
          </LinkedPanel>
      </View>

        {/* Bottom Panel */}
        <View style={styles.bottomPanel}>
          <LinkedPanel id="bottom-panel">
            {({ current, navigate, getResourceInfo }) => (
        <View style={styles.panelContent}>
                  {/* Resource Content */}
                <View style={styles.resourceContent}>
                  {current.resource?.component}
                </View>
              </View>
            )}
          </LinkedPanel>
        </View>
      </LinkedPanelsContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  navigationHeader: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  navigator: {
    // Navigator component styles will be handled internally
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
  panelContent: {
    flex: 1,
    flexDirection: 'column',
  },
  panelHeader: {
    flexDirection: 'row',
    flexGrow: 0,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    minHeight: 0,
  },
  resourceIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  resourceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  navigationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    minHeight: 0,
  },
  resourceTabs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resourceTab: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginLeft: 2,
    borderRadius: 3,
    backgroundColor: '#e2e8f0',
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeResourceTab: {
    backgroundColor: '#3b82f6',
  },
  resourceTabIcon: {
    fontSize: 12,
  },
  resourceContent: {
    flex: 1,
    padding: 16,
  },
});

export default LinkedPanelsLayout;