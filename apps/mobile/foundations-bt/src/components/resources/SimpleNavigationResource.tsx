import React from 'react';
import { View, StyleSheet } from 'react-native';
import ScriptureNavigator from '../../modules/navigation/ScriptureNavigator';
import { useScriptureNavigation } from '../../contexts/ScriptureNavigationContext';
import type { ScriptureReference } from '../../modules/navigation/ScriptureNavigator';

interface SimpleNavigationResourceProps {
  resourceId: string;
}

export const SimpleNavigationResource: React.FC<SimpleNavigationResourceProps> = ({ resourceId }) => {
  const { 
    currentReference, 
    availableBooks, 
    setCurrentReference, 
    formatReference 
  } = useScriptureNavigation();

  const handleReferenceChange = (reference: ScriptureReference) => {
    setCurrentReference(reference);
    console.log('🧭 Navigation changed to:', formatReference(reference));
  };

  return (
    <View style={styles.container}>
      <ScriptureNavigator
        currentReference={currentReference}
        availableBooks={availableBooks}
        onNavigate={handleReferenceChange}
        compact={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
});
