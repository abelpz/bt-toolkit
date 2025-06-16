# Educational Platforms Use Case

Building multi-language learning interfaces, progress tracking, and interactive educational tools with synchronized content using the Linked Panels library.

## Overview

Educational platforms benefit from the Linked Panels library's ability to:
- **Synchronize content** across multiple languages and resources
- **Track progress** with persistent state management
- **Coordinate interactive elements** like exercises, quizzes, and multimedia
- **Manage complex learning workflows** with inter-resource communication
- **Support offline learning** with robust state persistence

## Common Educational Scenarios

### Multi-Language Learning Platform

Create synchronized language learning interfaces:

```tsx
import { LinkedPanelsContainer, LinkedPanel, LocalStorageAdapter } from 'linked-panels';

function LanguageLearningApp() {
  const config = {
    resources: [
      // Source language content
      { 
        id: 'lesson-english', 
        component: <LessonContent language="en" />, 
        title: 'English Lesson',
        category: 'source'
      },
      { 
        id: 'lesson-spanish', 
        component: <LessonContent language="es" />, 
        title: 'Spanish Lesson',
        category: 'target'
      },
      // Interactive elements
      { 
        id: 'vocabulary-cards', 
        component: <VocabularyCards />, 
        title: 'Vocabulary',
        category: 'interactive'
      },
      { 
        id: 'pronunciation-guide', 
        component: <PronunciationGuide />, 
        title: 'Pronunciation',
        category: 'audio'
      },
      // Progress tracking
      { 
        id: 'progress-tracker', 
        component: <ProgressTracker />, 
        title: 'Progress',
        category: 'tracking'
      }
    ],
    panels: {
      'source-panel': { 
        resourceIds: ['lesson-english', 'vocabulary-cards'],
        initialResourceId: 'lesson-english'
      },
      'target-panel': { 
        resourceIds: ['lesson-spanish', 'pronunciation-guide'],
        initialResourceId: 'lesson-spanish'
      },
      'interaction-panel': { 
        resourceIds: ['vocabulary-cards', 'progress-tracker'],
        initialResourceId: 'vocabulary-cards'
      }
    }
  };

  const persistenceOptions = {
    storageAdapter: new LocalStorageAdapter(),
    storageKey: 'language-learning-progress',
    autoSave: true,
    stateTTL: 30 * 24 * 60 * 60 * 1000 // 30 days
  };

  return (
    <LinkedPanelsContainer 
      config={config} 
      persistence={persistenceOptions}
    >
      <div className="learning-interface">
        <LinkedPanel id="source-panel">
          {({ current, navigate }) => (
            <div className="source-content">
              <h2>{current.resource?.title}</h2>
              {current.resource?.component}
            </div>
          )}
        </LinkedPanel>

        <LinkedPanel id="target-panel">
          {({ current, navigate }) => (
            <div className="target-content">
              <h2>{current.resource?.title}</h2>
              {current.resource?.component}
            </div>
          )}
        </LinkedPanel>

        <LinkedPanel id="interaction-panel">
          {({ current, navigate }) => (
            <div className="interaction-area">
              <nav>
                <button 
                  onClick={() => navigate.toIndex(0)}
                  className={current.index === 0 ? 'active' : ''}
                >
                  Practice
                </button>
                <button 
                  onClick={() => navigate.toIndex(1)}
                  className={current.index === 1 ? 'active' : ''}
                >
                  Progress
                </button>
              </nav>
              {current.resource?.component}
            </div>
          )}
        </LinkedPanel>
      </div>
    </LinkedPanelsContainer>
  );
}
```

### Interactive Lesson Component

Lesson content that communicates with other resources:

```tsx
import { useResourceAPI } from 'linked-panels';

function LessonContent({ language, id }) {
  const api = useResourceAPI(id);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Sync navigation with other panels
  const handleSlideChange = (slideIndex) => {
    setCurrentSlide(slideIndex);
    
    // Notify other resources about content change
    api.messaging.send('vocabulary-cards', {
      type: 'sync-content',
      lifecycle: 'state',
      stateKey: 'current-slide',
      data: { slideIndex, language }
    });
    
    // Update progress tracking
    api.messaging.send('progress-tracker', {
      type: 'lesson-progress',
      lifecycle: 'event',
      data: { 
        lessonId: id,
        slideIndex,
        timestamp: Date.now()
      }
    });
  };

  return (
    <div className="lesson-content">
      <div className="slide-container">
        <LessonSlide 
          content={slides[currentSlide]} 
          language={language}
        />
      </div>
      
      <div className="lesson-controls">
        <button 
          onClick={() => handleSlideChange(currentSlide - 1)}
          disabled={currentSlide === 0}
        >
          Previous
        </button>
        <span>{currentSlide + 1} / {slides.length}</span>
        <button 
          onClick={() => handleSlideChange(currentSlide + 1)}
          disabled={currentSlide === slides.length - 1}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

### Vocabulary Cards with Synchronization

Interactive vocabulary practice that syncs with lesson content:

```tsx
function VocabularyCards({ id }) {
  const api = useResourceAPI(id);
  const messages = api.messaging.getMessages();
  const [currentCard, setCurrentCard] = useState(0);
  const [vocabulary, setVocabulary] = useState([]);

  // Listen for content synchronization from lessons
  useEffect(() => {
    const syncMessages = messages.filter(msg => 
      msg.content.type === 'sync-content' && 
      msg.content.lifecycle === 'state'
    );
    
    const latestSync = syncMessages[syncMessages.length - 1];
    if (latestSync) {
      const { slideIndex, language } = latestSync.content.data;
      const slideVocabulary = getVocabularyForSlide(slideIndex, language);
      setVocabulary(slideVocabulary);
      setCurrentCard(0);
    }
  }, [messages]);

  const handleCardFlip = () => {
    // Track interaction
    api.messaging.send('progress-tracker', {
      type: 'vocabulary-interaction',
      lifecycle: 'event',
      data: {
        cardId: vocabulary[currentCard]?.id,
        action: 'flip',
        timestamp: Date.now()
      }
    });
  };

  const handleNextCard = () => {
    if (currentCard < vocabulary.length - 1) {
      setCurrentCard(currentCard + 1);
    }
  };

  if (!vocabulary.length) {
    return <div>Select a lesson to see vocabulary cards</div>;
  }

  return (
    <div className="vocabulary-cards">
      <div className="card-container">
        <VocabularyCard 
          word={vocabulary[currentCard]}
          onFlip={handleCardFlip}
        />
      </div>
      
      <div className="card-navigation">
        <button 
          onClick={() => setCurrentCard(Math.max(0, currentCard - 1))}
          disabled={currentCard === 0}
        >
          Previous Card
        </button>
        <span>{currentCard + 1} / {vocabulary.length}</span>
        <button 
          onClick={handleNextCard}
          disabled={currentCard === vocabulary.length - 1}
        >
          Next Card
        </button>
      </div>
    </div>
  );
}
```

### Progress Tracking Component

Track and visualize learning progress:

```tsx
function ProgressTracker({ id }) {
  const api = useResourceAPI(id);
  const messages = api.messaging.getMessages();
  const [progress, setProgress] = useState({
    lessonsCompleted: 0,
    vocabularyMastered: 0,
    timeSpent: 0,
    streakDays: 0,
    achievements: []
  });

  // Process progress messages
  useEffect(() => {
    const progressMessages = messages.filter(msg => 
      msg.content.type === 'lesson-progress' || 
      msg.content.type === 'vocabulary-interaction'
    );

    const newProgress = calculateProgress(progressMessages);
    setProgress(newProgress);

    // Check for achievements
    const newAchievements = checkAchievements(newProgress);
    if (newAchievements.length > 0) {
      // Notify other components about achievements
      api.messaging.sendToAll({
        type: 'achievement-unlocked',
        lifecycle: 'event',
        data: { achievements: newAchievements }
      });
    }
  }, [messages, api]);

  return (
    <div className="progress-tracker">
      <h3>Your Progress</h3>
      
      <div className="progress-stats">
        <div className="stat">
          <label>Lessons Completed</label>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${(progress.lessonsCompleted / 20) * 100}%` }}
            />
          </div>
          <span>{progress.lessonsCompleted} / 20</span>
        </div>
        
        <div className="stat">
          <label>Vocabulary Mastered</label>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${(progress.vocabularyMastered / 500) * 100}%` }}
            />
          </div>
          <span>{progress.vocabularyMastered} / 500</span>
        </div>
        
        <div className="stat">
          <label>Study Streak</label>
          <span className="streak-count">{progress.streakDays} days</span>
        </div>
      </div>
      
      <div className="achievements">
        <h4>Recent Achievements</h4>
        {progress.achievements.map(achievement => (
          <div key={achievement.id} className="achievement">
            <span className="achievement-icon">{achievement.icon}</span>
            <span className="achievement-name">{achievement.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Advanced Educational Features

### Adaptive Learning System

Create an adaptive system that adjusts content based on performance:

```tsx
function AdaptiveLearningManager({ id }) {
  const api = useResourceAPI(id);
  const messages = api.messaging.getMessages();
  
  useEffect(() => {
    // Analyze performance messages
    const performanceData = messages
      .filter(msg => msg.content.type === 'quiz-result')
      .map(msg => msg.content.data);
    
    if (performanceData.length > 0) {
      const difficulty = calculateOptimalDifficulty(performanceData);
      const nextContent = selectAdaptiveContent(difficulty);
      
      // Update content for other panels
      api.messaging.sendToAll({
        type: 'content-adaptation',
        lifecycle: 'state',
        stateKey: 'adaptive-content',
        data: { 
          difficulty,
          recommendedContent: nextContent
        }
      });
    }
  }, [messages, api]);

  return null; // This is a background manager component
}
```

### Collaborative Learning Features

Enable collaboration between students:

```tsx
function CollaborativeWorkspace({ id }) {
  const api = useResourceAPI(id);
  const [peers, setPeers] = useState([]);
  const [sharedNotes, setSharedNotes] = useState([]);

  // Listen for peer interactions
  useEffect(() => {
    const peerMessages = messages.filter(msg => 
      msg.content.type === 'peer-interaction'
    );
    
    peerMessages.forEach(msg => {
      if (msg.content.data.action === 'join') {
        setPeers(prev => [...prev, msg.content.data.peer]);
      } else if (msg.content.data.action === 'note-shared') {
        setSharedNotes(prev => [...prev, msg.content.data.note]);
      }
    });
  }, [messages]);

  const shareNote = (note) => {
    api.messaging.sendToAll({
      type: 'peer-interaction',
      lifecycle: 'event',
      data: {
        action: 'note-shared',
        note,
        author: currentUser.name
      }
    });
  };

  return (
    <div className="collaborative-workspace">
      <div className="peer-list">
        <h4>Study Partners ({peers.length})</h4>
        {peers.map(peer => (
          <div key={peer.id} className="peer-item">
            <span className="peer-name">{peer.name}</span>
            <span className="peer-status">{peer.status}</span>
          </div>
        ))}
      </div>
      
      <div className="shared-notes">
        <h4>Shared Notes</h4>
        {sharedNotes.map(note => (
          <div key={note.id} className="shared-note">
            <div className="note-header">
              <span className="note-author">{note.author}</span>
              <span className="note-time">{formatTime(note.timestamp)}</span>
            </div>
            <div className="note-content">{note.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Best Practices for Educational Platforms

### 1. **Progress Persistence**
Always persist learning progress to prevent data loss:

```tsx
const educationalPersistence = {
  storageAdapter: new IndexedDBAdapter({
    dbName: 'EducationalPlatform',
    storeName: 'learningProgress'
  }),
  autoSave: true,
  stateTTL: 90 * 24 * 60 * 60 * 1000, // 90 days
  messageFilter: (message) => {
    // Persist progress and state messages
    return ['lesson-progress', 'quiz-result', 'achievement-unlocked']
      .includes(message.content.type) ||
      message.content.lifecycle === 'state';
  }
};
```

### 2. **Accessibility Support**
Ensure educational content is accessible:

```tsx
function AccessibleLessonContent({ id }) {
  const api = useResourceAPI(id);
  
  return (
    <div 
      className="lesson-content"
      role="main"
      aria-label="Lesson content"
      tabIndex={0}
    >
      <h2 id="lesson-title">Current Lesson</h2>
      <div 
        className="lesson-body"
        aria-describedby="lesson-title"
      >
        {/* Lesson content with proper ARIA labels */}
      </div>
      
      <nav 
        className="lesson-navigation"
        aria-label="Lesson navigation"
      >
        <button 
          aria-label="Previous lesson"
          onClick={() => api.navigation.goToPanel('previous-lesson')}
        >
          Previous
        </button>
        <button 
          aria-label="Next lesson"
          onClick={() => api.navigation.goToPanel('next-lesson')}
        >
          Next
        </button>
      </nav>
    </div>
  );
}
```

### 3. **Performance for Large Content**
Optimize for educational platforms with lots of content:

```tsx
// Lazy load content based on current panel
const LazyLessonContent = lazy(() => import('./LessonContent'));
const LazyQuizComponent = lazy(() => import('./QuizComponent'));

function EducationalPlatform() {
  const config = {
    resources: [
      { 
        id: 'lesson-1', 
        component: (
          <Suspense fallback={<LoadingSpinner />}>
            <LazyLessonContent lessonId="1" />
          </Suspense>
        ),
        title: 'Introduction'
      },
      // More resources...
    ]
    // Panel configuration...
  };
  
  return <LinkedPanelsContainer config={config}>{/* ... */}</LinkedPanelsContainer>;
}
```

### 4. **Mobile-First Design**
Educational platforms should work well on mobile devices:

```tsx
function ResponsiveEducationalLayout() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const config = {
    // Adjust panel layout for mobile
    panels: isMobile ? {
      'main-panel': { 
        resourceIds: ['lesson', 'quiz', 'progress'],
        initialResourceId: 'lesson'
      }
    } : {
      'content-panel': { resourceIds: ['lesson', 'quiz'] },
      'sidebar-panel': { resourceIds: ['progress', 'notes'] }
    }
  };

  return (
    <LinkedPanelsContainer config={config}>
      {isMobile ? <MobileLayout /> : <DesktopLayout />}
    </LinkedPanelsContainer>
  );
}
```

## Integration Examples

### LMS Integration
Connect with Learning Management Systems:

```tsx
function LMSIntegration({ courseId, userId }) {
  const api = useResourceAPI('lms-connector');
  
  useEffect(() => {
    // Sync progress with LMS
    const progressMessages = api.messaging.getMessages()
      .filter(msg => msg.content.type === 'lesson-progress');
    
    if (progressMessages.length > 0) {
      const latestProgress = progressMessages[progressMessages.length - 1];
      syncWithLMS(courseId, userId, latestProgress.content.data);
    }
  }, [api.messaging.getMessages(), courseId, userId]);
  
  return null;
}
```

The Linked Panels library provides a robust foundation for building sophisticated educational platforms with synchronized content, progress tracking, and interactive learning experiences. 