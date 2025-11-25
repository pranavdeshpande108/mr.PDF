import React, { useState, useRef, useCallback } from 'react';

interface ResizablePanelProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
}

export default function ResizablePanel({ leftPanel, rightPanel }: ResizablePanelProps) {
  const [panelWidth, setPanelWidth] = useState(50); // Initial width in percentage
  const isResizing = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
  };

  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current || !containerRef.current) {
      return;
    }
    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

    if (newWidth > 20 && newWidth < 80) { // Set min/max panel width
      setPanelWidth(newWidth);
    }
  }, []);

  React.useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className="flex w-full h-full">
      <div style={{ width: `${panelWidth}%` }} className="h-full overflow-hidden">
        {leftPanel}
      </div>
      <div
        onMouseDown={handleMouseDown}
        className="w-2 h-full cursor-col-resize bg-base-300 dark:bg-dark-base-300 hover:bg-brand-secondary transition-colors"
        aria-label="Resize panel"
        role="separator"
      />
      <div style={{ width: `${100 - panelWidth}%` }} className="h-full overflow-hidden">
        {rightPanel}
      </div>
    </div>
  );
}