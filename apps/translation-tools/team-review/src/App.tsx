import React, { useState } from 'react';
import { PanelType } from './components/PanelSelector';
import { PanelHeader } from './components/PanelHeader';
import { SwipeablePanel } from './components/SwipeablePanel';
import { ResizablePanels } from './components/ResizablePanels';
import { SettingsModal } from './components/SettingsModal';
import { ReviewComments } from './components/ReviewComments';
import { mockBookResources, getVerseByReference, getNotesForVerse, getCommentsForVerse } from './data/mockData';
import { AlignedWord, ReviewComment } from './types';

function App() {
  const [topPanel, setTopPanel] = useState<PanelType>('ult');
  const [bottomPanel, setBottomPanel] = useState<PanelType>('tn');
  const [highlightedStrongs, setHighlightedStrongs] = useState<string[]>([]);
  const [comments, setComments] = useState(mockBookResources.comments);
  const [topPanelResources, setTopPanelResources] = useState<PanelType[]>(['ult', 'ust', 'tn']);
  const [bottomPanelResources, setBottomPanelResources] = useState<PanelType[]>(['ult', 'ust', 'tn']);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  // Get data for Romans 1:1
  const ultVerse = getVerseByReference(mockBookResources.ult, '1:1');
  const ustVerse = getVerseByReference(mockBookResources.ust, '1:1');
  const notes = getNotesForVerse(mockBookResources.tn, '1:1');
  const verseComments = getCommentsForVerse(comments, '1:1');

  // Handle word clicks to show alignment info
  const handleWordClick = (word: AlignedWord, index: number) => {
    if (word.alignment) {
      console.log('Word clicked:', word);
      // In a real app, this might open a detailed view or translation words popup
    }
  };

  // Handle hovering over Greek quotes in translation notes
  const handleQuoteHover = (quote: string, isHovering: boolean) => {
    if (isHovering) {
      // Find Strong's numbers for words that match this Greek quote
      const matchingStrongs: string[] = [];
      
      // Check ULT words
      ultVerse?.words.forEach(word => {
        if (word.alignment && word.alignment.content === quote) {
          matchingStrongs.push(word.alignment.strong);
        }
      });
      
      // Check UST words
      ustVerse?.words.forEach(word => {
        if (word.alignment && word.alignment.content === quote) {
          matchingStrongs.push(word.alignment.strong);
        }
      });
      
      setHighlightedStrongs([...new Set(matchingStrongs)]);
    } else {
      setHighlightedStrongs([]);
    }
  };

  // Handle adding new comments
  const handleAddComment = (newComment: Omit<ReviewComment, 'id' | 'timestamp'>) => {
    const comment: ReviewComment = {
      ...newComment,
      id: `comment${Date.now()}`,
      timestamp: new Date()
    };
    setComments([...comments, comment]);
  };

  // Handle swapping top and bottom panels
  const handleSwapPanels = () => {
    const tempPanel = topPanel;
    setTopPanel(bottomPanel);
    setBottomPanel(tempPanel);
  };

  if (!ultVerse || !ustVerse) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Loading...</h1>
          <p className="text-gray-600">Unable to load verse data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col overflow-hidden">
      {/* Modern Mobile Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-200/50 flex-shrink-0">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center mt-1">
                <span className="text-sm text-slate-500 font-mono">Romans 1:1</span>
                <div className="w-1 h-1 rounded-full bg-slate-300 mx-2"></div>
                <span className="text-xs text-slate-400">es-419_ult_book-45</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsCommentsOpen(true)}
                className="px-3 py-2 bg-slate-100 text-slate-600 text-sm rounded-full hover:bg-slate-200 transition-all duration-300 flex-shrink-0 shadow-sm relative"
                title="Review comments"
              >
                ◓
                {verseComments.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {verseComments.length}
                  </div>
                )}
              </button>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="px-3 py-2 bg-slate-100 text-slate-600 text-sm rounded-full hover:bg-slate-200 transition-all duration-300 flex-shrink-0 shadow-sm"
                title="Configure panel resources"
              >
                ◐
              </button>
              <button 
                onClick={handleSwapPanels}
                className="px-3 py-2 bg-slate-100 text-slate-600 text-sm rounded-full hover:bg-slate-200 transition-all duration-300 flex-shrink-0 shadow-sm"
                title="Swap top and bottom panels"
              >
                ⇅
              </button>
              <button className="px-4 py-2 bg-slate-900 text-white text-sm rounded-full hover:bg-slate-700 transition-all duration-300 flex-shrink-0 shadow-sm">
                Submit
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Custom Resizable Panel Layout */}
      <div className="flex-1 min-h-0">
        <ResizablePanels
          topPanel={
            <div className="h-full flex flex-col">
              <PanelHeader
                currentPanel={topPanel}
                onPanelChange={setTopPanel}
                availableResources={topPanelResources}
                position="top"
                className="flex-shrink-0"
              />
              <div className="flex-1 min-h-0">
                <SwipeablePanel
                  currentPanel={topPanel}
                  onPanelChange={setTopPanel}
                  availableResources={topPanelResources}
                  ultVerse={ultVerse}
                  ustVerse={ustVerse}
                  notes={notes}
                  comments={verseComments}
                  onWordClick={handleWordClick}
                  onQuoteHover={handleQuoteHover}
                  onAddComment={handleAddComment}
                  highlightedStrongs={highlightedStrongs}
                  className="h-full"
                />
              </div>
            </div>
          }
          bottomPanel={
            <div className="h-full flex flex-col">
              <PanelHeader
                currentPanel={bottomPanel}
                onPanelChange={setBottomPanel}
                availableResources={bottomPanelResources}
                position="bottom"
                className="flex-shrink-0"
              />
              <div className="flex-1 min-h-0">
                <SwipeablePanel
                  currentPanel={bottomPanel}
                  onPanelChange={setBottomPanel}
                  availableResources={bottomPanelResources}
                  ultVerse={ultVerse}
                  ustVerse={ustVerse}
                  notes={notes}
                  comments={verseComments}
                  onWordClick={handleWordClick}
                  onQuoteHover={handleQuoteHover}
                  onAddComment={handleAddComment}
                  highlightedStrongs={highlightedStrongs}
                  className="h-full"
                />
              </div>
            </div>
          }
          defaultTopHeight={50}
          minTopHeight={20}
          maxTopHeight={80}
          className="h-full"
        />
      </div>

      {/* Modern Help Hint */}
      <div className="bg-white/60 backdrop-blur-sm border-t border-gray-200/50 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-center">
          <div className="w-1 h-1 rounded-full bg-slate-400 mr-3"></div>
          <p className="text-xs text-slate-500 font-light tracking-wide">
            Swipe or use arrows to navigate • Drag divider to resize • Hover Greek text to highlight
          </p>
          <div className="w-1 h-1 rounded-full bg-slate-400 ml-3"></div>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        topPanelResources={topPanelResources}
        bottomPanelResources={bottomPanelResources}
        onTopPanelResourcesChange={setTopPanelResources}
        onBottomPanelResourcesChange={setBottomPanelResources}
      />

      {/* Comments Modal */}
      {isCommentsOpen && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/50 shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between p-8 pb-2 border-b border-slate-100/50">
              <div>
                <h2 className="text-2xl font-light text-slate-800 tracking-wide mb-2">
                  Review Comments
                </h2>
                <p className="text-sm text-slate-500 font-light leading-relaxed">
                  Team collaboration and feedback for Romans 1:1
                </p>
              </div>
              <button
                onClick={() => setIsCommentsOpen(false)}
                className="w-10 h-10 rounded-full bg-slate-100/50 hover:bg-slate-200/50 flex items-center justify-center transition-all duration-300 text-slate-400 hover:text-slate-600 ml-6"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-2 py-4">
              <ReviewComments
                comments={verseComments}
                onAddComment={handleAddComment}
                className=""
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App; 