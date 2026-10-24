import React, { useCallback, useEffect, useRef, useState } from 'react';

interface CustomerSupportResizeHandleProps {
  panelId: string;
  panelRef: React.RefObject<HTMLDivElement>;
  layoutRef?: React.RefObject<HTMLDivElement>;
  siblingPanelRef?: React.RefObject<HTMLDivElement>;
  label: string;
  isOpen: boolean;
  width: number;
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
  onResize: (width: number) => void;
  onToggle: (isOpen: boolean) => void;
  onDragChange: (isDragging: boolean) => void;
}

const clamp = (width: number, min: number, max: number) => Math.round(Math.min(max, Math.max(min, width)));
const MIN_CHAT_WIDTH = 240;

export const CustomerSupportResizeHandle: React.FC<CustomerSupportResizeHandleProps> = ({
  panelId,
  panelRef,
  layoutRef,
  siblingPanelRef,
  label,
  isOpen,
  width,
  minWidth,
  maxWidth,
  defaultWidth,
  onResize,
  onToggle,
  onDragChange,
}) => {
  const dragStart = useRef<{ x: number; width: number } | null>(null);
  const [renderedWidth, setRenderedWidth] = useState(width);
  const [availableMaxWidth, setAvailableMaxWidth] = useState(maxWidth);
  const latestProps = useRef({ minWidth, maxWidth: availableMaxWidth, onResize, onToggle, onDragChange });
  const currentWidth = layoutRef && siblingPanelRef ? renderedWidth : Math.round(width);

  const updateMeasurements = useCallback(() => {
    const panel = panelRef.current;
    if (panel) setRenderedWidth(Math.round(panel.getBoundingClientRect().width));

    const layout = layoutRef?.current;
    const sibling = siblingPanelRef?.current;
    if (!layout || !sibling) {
      setAvailableMaxWidth(maxWidth);
      return;
    }

    const navigationWidth = layout.firstElementChild?.getBoundingClientRect().width ?? 0;
    const handlesWidth = Array.from(layout.querySelectorAll<HTMLElement>('[role="separator"]'))
      .reduce((total, handle) => total + handle.getBoundingClientRect().width, 0);
    const remainingWidth = Math.floor(
      layout.clientWidth - navigationWidth - handlesWidth - MIN_CHAT_WIDTH - sibling.getBoundingClientRect().width
    );
    const nextMaxWidth = Math.max(minWidth, Math.min(maxWidth, remainingWidth));
    setAvailableMaxWidth((current) => current === nextMaxWidth ? current : nextMaxWidth);
  }, [layoutRef, maxWidth, minWidth, panelRef, siblingPanelRef]);

  useEffect(() => {
    latestProps.current = { minWidth, maxWidth: availableMaxWidth, onResize, onToggle, onDragChange };
  }, [availableMaxWidth, minWidth, onDragChange, onResize, onToggle]);

  useEffect(() => {
    updateMeasurements();
    const layout = layoutRef?.current;
    if (!layout || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(updateMeasurements);
    observer.observe(layout);
    if (layout.firstElementChild instanceof HTMLElement) observer.observe(layout.firstElementChild);
    layout.querySelectorAll<HTMLElement>('[role="separator"]').forEach((handle) => observer.observe(handle));
    if (panelRef.current) observer.observe(panelRef.current);
    if (siblingPanelRef?.current) observer.observe(siblingPanelRef.current);
    return () => observer.disconnect();
  }, [layoutRef, panelRef, siblingPanelRef, updateMeasurements]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const start = dragStart.current;
      if (!start) return;
      const current = latestProps.current;
      const nextWidth = start.width + event.clientX - start.x;
      if (nextWidth < current.minWidth - 36) {
        current.onToggle(false);
        return;
      }
      if (nextWidth > 24) {
        current.onToggle(true);
        current.onResize(clamp(nextWidth, current.minWidth, current.maxWidth));
      }
    };
    const finish = () => {
      if (!dragStart.current) return;
      dragStart.current = null;
      latestProps.current.onDragChange(false);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
    };
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (!isOpen) {
        onToggle(true);
        onResize(minWidth);
      } else onResize(clamp(currentWidth + 16, minWidth, availableMaxWidth));
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (isOpen && currentWidth <= minWidth + 16) onToggle(false);
      else if (isOpen) onResize(clamp(currentWidth - 16, minWidth, availableMaxWidth));
    } else if (event.key === 'Home') {
      event.preventDefault();
      onToggle(true);
      onResize(minWidth);
    } else if (event.key === 'End') {
      event.preventDefault();
      onToggle(true);
      onResize(availableMaxWidth);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggle(!isOpen);
    }
  };

  return (
    <div className="hidden md:flex h-full w-2 shrink-0 items-stretch justify-center group/resize z-20">
      <button
        type="button"
        role="separator"
        aria-orientation="vertical"
        aria-label={`Redimensionar painel: ${label}`}
        aria-controls={panelId}
        aria-valuemin={isOpen ? minWidth : 0}
        aria-valuemax={availableMaxWidth}
        aria-valuenow={isOpen ? currentWidth : 0}
        aria-valuetext={isOpen ? `${currentWidth} pixels` : 'Recolhido'}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          const panelWidth = panelRef.current?.getBoundingClientRect().width ?? (isOpen ? width : 0);
          dragStart.current = { x: event.clientX, width: panelWidth };
          onDragChange(true);
        }}
        onDoubleClick={() => {
          onToggle(true);
          onResize(clamp(defaultWidth, minWidth, availableMaxWidth));
        }}
        className="relative h-full w-2 cursor-col-resize touch-none border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
        title={`Arraste para redimensionar ${label}; duplo clique para restaurar`}
      >
        <span className="absolute inset-y-0 left-[3px] w-0.5 bg-transparent transition-colors group-hover/resize:bg-blue-400 group-focus-within/resize:bg-blue-500" />
      </button>
    </div>
  );
};
