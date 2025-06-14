# Creating Custom Panels

This guide shows how to create custom panel types for specific Bible translation workflows, extending the BasePanel class with domain-specific functionality.

## Overview

Custom panels allow you to create specialized interfaces for different aspects of Bible translation work, such as source text analysis, translation editing, review workflows, and team collaboration.

## Basic Custom Panel Structure

```typescript
import { BasePanel } from '../panels/BasePanel';
import { PanelConfig, ResourceAPI } from '../types';
import { SignalBus } from '../core/SignalBus';

class CustomTranslationPanel extends BasePanel {
  constructor(config: PanelConfig, signalBus: SignalBus) {
    super(config, signalBus);
    this.setupCustomHandlers();
  }

  // Required: Implement abstract methods
  async onActivate(): Promise<void> {
    await this.initializeTranslationInterface();
  }

  async onDeactivate(): Promise<void> {
    await this.saveCurrentWork();
  }

  // Optional: Override lifecycle hooks
  async onResourceAdded(resource: ResourceAPI): Promise<void> {
    if (resource.type === 'verse') {
      await this.loadVerseForTranslation(resource);
    }
  }

  // Custom methods
  private setupCustomHandlers(): void {
    // Panel-specific signal handlers
  }
}
```

## Example: Source Text Panel

A panel for displaying and analyzing source Bible text:

```typescript
class SourceTextPanel extends BasePanel {
  private currentVerse?: VerseResource;
  private analysisData = new Map<string, any>();

  async onActivate(): Promise<void> {
    await this.loadSourceTextTools();
    this.setupAnalysisInterface();
  }

  async onResourceAdded(resource: ResourceAPI): Promise<void> {
    if (resource.type === 'verse') {
      await this.displaySourceVerse(resource as VerseResource);
      await this.loadLinguisticAnalysis(resource.id);
    }
  }

  async onActiveResourceChanged(
    newResource: ResourceAPI | undefined,
    oldResource: ResourceAPI | undefined
  ): Promise<void> {
    if (newResource?.type === 'verse') {
      this.currentVerse = newResource as VerseResource;
      await this.updateSourceDisplay();
      await this.loadCrossReferences(newResource.id);
    }
  }

  private async loadSourceTextTools(): Promise<void> {
    // Load Hebrew/Greek text tools
    await this.loadLexicon();
    await this.loadGrammarTools();
    await this.loadTextCriticalNotes();
  }

  private async displaySourceVerse(verse: VerseResource): Promise<void> {
    const container = this.getResourceContainer();
    
    // Create source text display
    const sourceElement = document.createElement('div');
    sourceElement.className = 'source-verse';
    
    // Add original language text
    const originalText = document.createElement('div');
    originalText.className = 'original-text';
    originalText.textContent = verse.data.sourceText;
    
    // Add word-by-word analysis
    const analysisElement = await this.createWordAnalysis(verse);
    
    sourceElement.appendChild(originalText);
    sourceElement.appendChild(analysisElement);
    container.appendChild(sourceElement);
  }

  private async createWordAnalysis(verse: VerseResource): Promise<HTMLElement> {
    const analysis = document.createElement('div');
    analysis.className = 'word-analysis';
    
    // Parse words and create interactive elements
    const words = verse.data.sourceText.split(' ');
    for (const word of words) {
      const wordElement = document.createElement('span');
      wordElement.className = 'analyzable-word';
      wordElement.textContent = word;
      
      // Add click handler for detailed analysis
      wordElement.addEventListener('click', () => {
        this.showWordDetails(word);
      });
      
      analysis.appendChild(wordElement);
    }
    
    return analysis;
  }

  private async showWordDetails(word: string): Promise<void> {
    // Show lexical information, parsing, etc.
    const details = await this.lexiconService.getWordDetails(word);
    await this.displayWordDetails(details);
  }
}
```

## Example: Translation Editor Panel

A panel for editing translations with real-time collaboration:

```typescript
class TranslationEditorPanel extends BasePanel {
  private editor?: HTMLTextAreaElement;
  private autoSaveTimer?: NodeJS.Timeout;
  private collaborationManager: CollaborationManager;

  constructor(config: PanelConfig, signalBus: SignalBus) {
    super(config, signalBus);
    this.collaborationManager = new CollaborationManager(signalBus);
  }

  async onActivate(): Promise<void> {
    await this.setupTranslationEditor();
    this.startAutoSave();
    await this.collaborationManager.joinSession(this.id);
  }

  async onDeactivate(): Promise<void> {
    await this.saveCurrentTranslation();
    this.stopAutoSave();
    await this.collaborationManager.leaveSession();
  }

  async onResourceAdded(resource: ResourceAPI): Promise<void> {
    if (resource.type === 'verse') {
      await this.loadVerseForEditing(resource as VerseResource);
    }
  }

  private async setupTranslationEditor(): Promise<void> {
    const container = this.getResourceContainer();
    
    // Create editor interface
    const editorContainer = document.createElement('div');
    editorContainer.className = 'translation-editor';
    
    // Source text reference
    const sourceRef = document.createElement('div');
    sourceRef.className = 'source-reference';
    
    // Translation editor
    this.editor = document.createElement('textarea');
    this.editor.className = 'translation-input';
    this.editor.placeholder = 'Enter translation...';
    
    // Set up real-time collaboration
    this.setupCollaborativeEditing();
    
    // Translation tools
    const toolsPanel = this.createTranslationTools();
    
    editorContainer.appendChild(sourceRef);
    editorContainer.appendChild(this.editor);
    editorContainer.appendChild(toolsPanel);
    container.appendChild(editorContainer);
  }

  private setupCollaborativeEditing(): void {
    if (!this.editor) return;

    // Handle text changes
    this.editor.addEventListener('input', (event) => {
      this.handleTextChange(event);
    });

    // Handle collaboration signals
    this.onSignal('TRANSLATION_UPDATED', async (signal) => {
      if (signal.source.panelId !== this.id) {
        await this.handleRemoteTranslationUpdate(signal.payload);
      }
    });
  }

  private async handleTextChange(event: Event): Promise<void> {
    const target = event.target as HTMLTextAreaElement;
    const text = target.value;
    
    // Emit change signal for collaboration
    await this.emitSignal('TRANSLATION_UPDATED', {
      verseId: this.currentVerse?.id,
      translation: text,
      timestamp: Date.now(),
      userId: this.getCurrentUserId()
    });
    
    // Mark as dirty for auto-save
    this.markDirty();
  }

  private createTranslationTools(): HTMLElement {
    const tools = document.createElement('div');
    tools.className = 'translation-tools';
    
    // Translation memory suggestions
    const tmButton = document.createElement('button');
    tmButton.textContent = 'Translation Memory';
    tmButton.onclick = () => this.showTranslationMemory();
    
    // Spell check
    const spellButton = document.createElement('button');
    spellButton.textContent = 'Spell Check';
    spellButton.onclick = () => this.runSpellCheck();
    
    // Save button
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.onclick = () => this.saveCurrentTranslation();
    
    tools.appendChild(tmButton);
    tools.appendChild(spellButton);
    tools.appendChild(saveButton);
    
    return tools;
  }

  private startAutoSave(): void {
    this.autoSaveTimer = setInterval(async () => {
      if (this.isDirty) {
        await this.saveCurrentTranslation();
      }
    }, 30000); // Auto-save every 30 seconds
  }

  private stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = undefined;
    }
  }
}
```

## Example: Review Panel

A panel for reviewing and approving translations:

```typescript
class ReviewPanel extends BasePanel {
  private reviewQueue: VerseResource[] = [];
  private currentReviewIndex = 0;
  private reviewData = new Map<string, ReviewData>();

  async onActivate(): Promise<void> {
    await this.loadReviewQueue();
    this.setupReviewInterface();
  }

  async onResourceAdded(resource: ResourceAPI): Promise<void> {
    if (resource.type === 'verse') {
      this.addToReviewQueue(resource as VerseResource);
    }
  }

  private async setupReviewInterface(): Promise<void> {
    const container = this.getResourceContainer();
    
    // Review header with progress
    const header = this.createReviewHeader();
    
    // Side-by-side comparison
    const comparison = this.createComparisonView();
    
    // Review controls
    const controls = this.createReviewControls();
    
    // Comments section
    const comments = this.createCommentsSection();
    
    container.appendChild(header);
    container.appendChild(comparison);
    container.appendChild(controls);
    container.appendChild(comments);
  }

  private createReviewHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'review-header';
    
    const progress = document.createElement('div');
    progress.className = 'review-progress';
    progress.textContent = `Review ${this.currentReviewIndex + 1} of ${this.reviewQueue.length}`;
    
    const verseRef = document.createElement('div');
    verseRef.className = 'verse-reference';
    
    header.appendChild(progress);
    header.appendChild(verseRef);
    
    return header;
  }

  private createComparisonView(): HTMLElement {
    const comparison = document.createElement('div');
    comparison.className = 'translation-comparison';
    
    // Source text
    const sourcePanel = document.createElement('div');
    sourcePanel.className = 'source-panel';
    sourcePanel.innerHTML = '<h3>Source Text</h3><div class="text-content"></div>';
    
    // Current translation
    const translationPanel = document.createElement('div');
    translationPanel.className = 'translation-panel';
    translationPanel.innerHTML = '<h3>Translation</h3><div class="text-content"></div>';
    
    // Previous versions
    const historyPanel = document.createElement('div');
    historyPanel.className = 'history-panel';
    historyPanel.innerHTML = '<h3>Previous Versions</h3><div class="text-content"></div>';
    
    comparison.appendChild(sourcePanel);
    comparison.appendChild(translationPanel);
    comparison.appendChild(historyPanel);
    
    return comparison;
  }

  private createReviewControls(): HTMLElement {
    const controls = document.createElement('div');
    controls.className = 'review-controls';
    
    // Approve button
    const approveBtn = document.createElement('button');
    approveBtn.className = 'approve-btn';
    approveBtn.textContent = 'Approve';
    approveBtn.onclick = () => this.approveTranslation();
    
    // Request changes button
    const changesBtn = document.createElement('button');
    changesBtn.className = 'changes-btn';
    changesBtn.textContent = 'Request Changes';
    changesBtn.onclick = () => this.requestChanges();
    
    // Skip button
    const skipBtn = document.createElement('button');
    skipBtn.className = 'skip-btn';
    skipBtn.textContent = 'Skip';
    skipBtn.onclick = () => this.skipReview();
    
    controls.appendChild(approveBtn);
    controls.appendChild(changesBtn);
    controls.appendChild(skipBtn);
    
    return controls;
  }

  private async approveTranslation(): Promise<void> {
    const currentVerse = this.reviewQueue[this.currentReviewIndex];
    if (!currentVerse) return;
    
    // Update verse status
    currentVerse.metadata.status = 'approved';
    currentVerse.metadata.reviewedBy = this.getCurrentUserId();
    currentVerse.metadata.reviewedAt = Date.now();
    
    // Save review decision
    await this.saveReviewDecision(currentVerse.id, 'approved');
    
    // Emit approval signal
    await this.emitSignal('TRANSLATION_APPROVED', {
      verseId: currentVerse.id,
      reviewerId: this.getCurrentUserId(),
      timestamp: Date.now()
    });
    
    // Move to next
    await this.moveToNext();
  }

  private async requestChanges(): Promise<void> {
    const currentVerse = this.reviewQueue[this.currentReviewIndex];
    if (!currentVerse) return;
    
    // Show comments dialog
    const comments = await this.showCommentsDialog();
    if (!comments) return;
    
    // Update verse status
    currentVerse.metadata.status = 'needs_revision';
    currentVerse.metadata.reviewComments = comments;
    
    // Save review decision
    await this.saveReviewDecision(currentVerse.id, 'needs_revision', comments);
    
    // Emit revision request signal
    await this.emitSignal('TRANSLATION_REVISION_REQUESTED', {
      verseId: currentVerse.id,
      reviewerId: this.getCurrentUserId(),
      comments,
      timestamp: Date.now()
    });
    
    // Move to next
    await this.moveToNext();
  }
}
```

## Panel Registration

Register your custom panels with the system:

```typescript
// Register custom panel types
const panelRegistry = new PanelRegistry();

panelRegistry.registerPanelType('source-text', SourceTextPanel);
panelRegistry.registerPanelType('translation-editor', TranslationEditorPanel);
panelRegistry.registerPanelType('review', ReviewPanel);

// Create panels using the registry
const sourcePanel = await panelManager.createPanel({
  id: 'source-panel-1',
  type: 'source-text',
  title: 'Hebrew/Greek Source',
  layout: PanelLayout.SINGLE
});

const editorPanel = await panelManager.createPanel({
  id: 'editor-panel-1',
  type: 'translation-editor',
  title: 'Translation Editor',
  layout: PanelLayout.SINGLE
});
```

## Best Practices

### 1. Keep Panels Focused

Each panel should have a single, clear purpose:

```typescript
// Good - focused on one task
class TranslationEditorPanel extends BasePanel {
  // Only handles translation editing
}

// Avoid - trying to do everything
class MegaPanel extends BasePanel {
  // Translation editing + review + notes + references + ...
}
```

### 2. Handle Cleanup Properly

```typescript
class CustomPanel extends BasePanel {
  private timers: NodeJS.Timeout[] = [];
  private eventListeners: Array<() => void> = [];

  async onDestroy(): Promise<void> {
    // Clean up timers
    this.timers.forEach(timer => clearTimeout(timer));
    
    // Clean up event listeners
    this.eventListeners.forEach(cleanup => cleanup());
    
    // Call parent cleanup
    await super.onDestroy();
  }
}
```

### 3. Use Proper Error Handling

```typescript
class RobustPanel extends BasePanel {
  async onResourceAdded(resource: ResourceAPI): Promise<void> {
    try {
      await this.processResource(resource);
    } catch (error) {
      console.error('Failed to process resource:', error);
      
      // Emit error signal
      await this.emitSignal('ERROR', {
        errorType: 'RESOURCE_PROCESSING_FAILED',
        errorMessage: error.message,
        recoverable: true
      });
      
      // Show user-friendly message
      this.showErrorMessage('Failed to load resource. Please try again.');
    }
  }
}
```

### 4. Implement Progressive Enhancement

```typescript
class ProgressivePanel extends BasePanel {
  async onActivate(): Promise<void> {
    // Load core functionality first
    await this.loadCoreFeatures();
    
    // Load enhanced features asynchronously
    this.loadEnhancedFeatures().catch(error => {
      console.warn('Enhanced features failed to load:', error);
      // Continue with core functionality
    });
  }
  
  private async loadCoreFeatures(): Promise<void> {
    // Essential functionality that must work
  }
  
  private async loadEnhancedFeatures(): Promise<void> {
    // Nice-to-have features that can fail gracefully
  }
}
``` 