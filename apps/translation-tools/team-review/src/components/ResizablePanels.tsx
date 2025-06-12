import React, { useState, useRef, useEffect } from 'react';

interface ResizablePanelsProps {
  topPanel: React.ReactNode;
  bottomPanel: React.ReactNode;
  defaultTopHeight?: number; // percentage
  minTopHeight?: number; // percentage
  maxTopHeight?: number; // percentage
  className?: string;
}

export const ResizablePanels: React.FC<ResizablePanelsProps> = ({
  topPanel,
  bottomPanel,
  defaultTopHeight = 50,
  minTopHeight = 20,
  maxTopHeight = 80,
  className = ''
}) => {
  const [topHeight, setTopHeight] = useState(defaultTopHeight);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load saved height from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('translation-review-panel-height');
    if (saved) {
      const height = parseInt(saved, 10);
      if (height >= minTopHeight && height <= maxTopHeight) {
        setTopHeight(height);
      }
    }
  }, [minTopHeight, maxTopHeight]);

  // Save height to localStorage
  useEffect(() => {
    localStorage.setItem('translation-review-panel-height', topHeight.toString());
  }, [topHeight]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const containerHeight = rect.height;
      const mouseY = e.clientY - rect.top;
      
      const newTopHeight = (mouseY / containerHeight) * 100;
      const clampedHeight = Math.max(minTopHeight, Math.min(maxTopHeight, newTopHeight));
      
      setTopHeight(clampedHeight);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const containerHeight = rect.height;
      const touchY = e.touches[0].clientY - rect.top;
      
      const newTopHeight = (touchY / containerHeight) * 100;
      const clampedHeight = Math.max(minTopHeight, Math.min(maxTopHeight, newTopHeight));
      
      setTopHeight(clampedHeight);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleMouseUp);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, minTopHeight, maxTopHeight]);

  const bottomHeight = 100 - topHeight;

  return (
    <div ref={containerRef} className={`flex flex-col ${className}`} style={{ height: '100%' }}>
      {/* Top Panel */}
      <div 
        className="overflow-hidden"
        style={{ height: `calc(${topHeight}% - 2px)` }}
      >
        {topPanel}
      </div>

      {/* Resize Handle */}
      <div
        className={`
          h-1 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 
          hover:bg-gradient-to-r hover:from-slate-300 hover:via-slate-400 hover:to-slate-300 
          transition-all duration-200 cursor-row-resize flex items-center justify-center group
          ${isDragging ? 'bg-gradient-to-r from-slate-400 via-slate-500 to-slate-400' : ''}
        `}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className={`
          w-8 h-0.5 bg-slate-400 rounded-full group-hover:bg-slate-500 transition-colors duration-200
          ${isDragging ? 'bg-slate-600' : ''}
        `}></div>
      </div>

      {/* Bottom Panel */}
      <div 
        className="overflow-hidden"
        style={{ height: `calc(${bottomHeight}% - 2px)` }}
      >
        {bottomPanel}
      </div>
    </div>
  );
}; 