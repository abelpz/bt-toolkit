/**
 * TTS Control Component
 * 
 * Compact Text-to-Speech control for mobile-first UI
 * Provides play/pause/stop functionality with minimal space usage
 */

import React, { useState } from 'react';
import { useTTS } from '../../hooks/useTTS';
import { getTTSService } from '../../services/tts/tts-service';
import { TTSWordBoundary } from '../../types/tts';

export interface TTSControlProps {
  /** Text content to be spoken */
  text: string;
  /** Additional CSS classes */
  className?: string;
  /** Compact mode (icon only) */
  compact?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Tooltip text */
  title?: string;
  /** Callback when TTS state changes */
  onStateChange?: (isPlaying: boolean) => void;
  /** Callback for each word boundary during TTS playback */
  onWordBoundary?: (wordBoundary: TTSWordBoundary) => void;
}

export const TTSControl: React.FC<TTSControlProps> = ({
  text,
  className = '',
  compact = true,
  disabled = false,
  title,
  onStateChange,
  onWordBoundary
}) => {
  const {
    isAvailable,
    isLanguageSupported,
    playbackState,
    speak,
    pause,
    resume,
    stop,
    isInitializing,
    error
  } = useTTS();

  const [showError, setShowError] = useState(false);

  // Extract readable text for TTS
  const getReadableText = (content: string): string => {
    return getTTSService().extractReadableText(content);
  };

  const handlePlay = async () => {
    console.log('🔊 TTSControl: handlePlay called', { hasText: !!text.trim(), textLength: text.length });
    
    if (!text.trim()) {
      console.warn('🔊 TTSControl: No text to speak');
      return;
    }

    try {
      const readableText = getReadableText(text);
      const options = getTTSService().getScriptureReadingOptions();
      
      // Add word boundary callback if provided
      if (onWordBoundary) {
        options.onWordBoundary = onWordBoundary;
      }
      
      console.log('🔊 TTSControl: About to call speak()', { 
        readableTextLength: readableText.length, 
        readableText: readableText.substring(0, 100) + '...',
        options: { ...options, onWordBoundary: !!options.onWordBoundary }
      });
      
      await speak(readableText, options);
      onStateChange?.(true);
    } catch (err) {
      console.error('🔊 TTSControl: TTS play failed:', err);
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
    }
  };

  const handlePause = async () => {
    try {
      await pause();
      onStateChange?.(false);
    } catch (err) {
      console.error('TTS pause failed:', err);
    }
  };

  const handleResume = async () => {
    try {
      await resume();
      onStateChange?.(true);
    } catch (err) {
      console.error('TTS resume failed:', err);
    }
  };

  const handleStop = async () => {
    try {
      await stop();
      onStateChange?.(false);
    } catch (err) {
      console.error('TTS stop failed:', err);
    }
  };

  // Don't render if TTS is not available or language not supported
  if (!isAvailable || !isLanguageSupported || isInitializing) {
    return null;
  }

  const isPlaying = playbackState.isPlaying;
  const isPaused = playbackState.isPaused;
  const isLoading = playbackState.isLoading;
  const hasError = error || showError;

  const getPlayButtonTitle = (): string => {
    if (title) return title;
    if (hasError) return 'TTS Error - Click to retry';
    if (isLoading) return 'Loading...';
    if (isPlaying) return 'Pause speech';
    if (isPaused) return 'Resume speech';
    return 'Play text with speech';
  };

  const getPlayButtonIcon = (): string => {
    if (hasError) return '⚠️';
    if (isLoading) return '⏳';
    if (isPlaying) return '⏸️';
    if (isPaused) return '▶️';
    return '🔊';
  };

  const getButtonColor = (): string => {
    if (hasError) return 'text-red-600 hover:text-red-700';
    if (isPlaying) return 'text-blue-600 hover:text-blue-700';
    if (isPaused) return 'text-orange-600 hover:text-orange-700';
    return 'text-gray-600 hover:text-gray-700';
  };

  const handlePlayPauseClick = () => {
    if (disabled || isLoading) return;

    if (hasError) {
      // Retry on error
      setShowError(false);
      handlePlay();
    } else if (isPlaying) {
      handlePause();
    } else if (isPaused) {
      handleResume();
    } else {
      handlePlay();
    }
  };

  if (compact) {
    // Show both pause and stop buttons when playing or paused
    if (isPlaying || isPaused) {
      return (
        <div className={`inline-flex items-center space-x-1 ${className}`}>
          {/* Play/Pause Button */}
          <button
            onClick={handlePlayPauseClick}
            disabled={disabled || isLoading}
            title={getPlayButtonTitle()}
            className={`
              inline-flex items-center justify-center
              w-8 h-8 rounded-full
              ${getButtonColor()}
              hover:bg-gray-100 active:bg-gray-200
              transition-colors duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <span className="text-sm" role="img" aria-label={getPlayButtonTitle()}>
              {getPlayButtonIcon()}
            </span>
          </button>
          
          {/* Stop Button */}
          <button
            onClick={handleStop}
            disabled={disabled}
            title="Stop and rewind"
            className={`
              inline-flex items-center justify-center
              w-8 h-8 rounded-full
              text-gray-600 hover:text-red-600
              hover:bg-gray-100 active:bg-gray-200
              transition-colors duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <span className="text-sm" role="img" aria-label="Stop and rewind">
              ⏹️
            </span>
          </button>
        </div>
      );
    }

    // Single play button when not playing
    return (
      <button
        onClick={handlePlayPauseClick}
        disabled={disabled || isLoading}
        title={getPlayButtonTitle()}
        className={`
          inline-flex items-center justify-center
          w-8 h-8 rounded-full
          ${getButtonColor()}
          hover:bg-gray-100 active:bg-gray-200
          transition-colors duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
      >
        <span className="text-sm" role="img" aria-label={getPlayButtonTitle()}>
          {getPlayButtonIcon()}
        </span>
      </button>
    );
  }

  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      <button
        onClick={handlePlayPauseClick}
        disabled={disabled || isLoading}
        title={getPlayButtonTitle()}
        className={`
          inline-flex items-center space-x-1 px-2 py-1
          text-xs rounded-md border
          ${getButtonColor()}
          border-gray-300 hover:border-gray-400
          bg-white hover:bg-gray-50
          transition-colors duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        <span className="text-sm" role="img" aria-label={getPlayButtonTitle()}>
          {getPlayButtonIcon()}
        </span>
        {!isLoading && (
          <span className="hidden sm:inline">
            {hasError ? 'Error' : isPlaying ? 'Pause' : isPaused ? 'Resume' : 'Play'}
          </span>
        )}
      </button>

      {/* Stop button when playing/paused */}
      {(isPlaying || isPaused) && (
        <button
          onClick={handleStop}
          title="Stop and rewind"
          className="
            inline-flex items-center justify-center
            w-6 h-6 rounded
            text-gray-500 hover:text-red-600
            hover:bg-gray-100
            transition-colors duration-200
          "
        >
          <span className="text-xs" role="img" aria-label="Stop and rewind">
            ⏹️
          </span>
        </button>
      )}

      {/* Progress indicator */}
      {playbackState.progress !== undefined && playbackState.progress > 0 && (
        <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${playbackState.progress * 100}%` }}
          />
        </div>
      )}
    </div>
  );
};
