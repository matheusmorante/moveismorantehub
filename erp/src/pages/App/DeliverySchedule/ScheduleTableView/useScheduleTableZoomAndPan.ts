import React, { useEffect, useRef, useState } from 'react';
import Order from '../../../types/order.type';

interface UseScheduleTableZoomAndPanParams {
  schedule: Record<string, Order[]>;
  hours: number[];
  hasInitialScrolled?: React.MutableRefObject<boolean>;
}

export function useScheduleTableZoomAndPan({
  schedule,
  hours,
  hasInitialScrolled,
}: UseScheduleTableZoomAndPanParams) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollParentRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [tableHeight, setTableHeight] = useState(1000);

  const zoomState = useRef({
    scale: 1,
    startScale: 1,
    startDistance: 0,
    contentMidpoint: { x: 0, y: 0 },
    isPinching: false,
  });

  const dragRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  useEffect(() => {
    if (containerRef.current) {
      setTableHeight(containerRef.current.offsetHeight || 1000);
    }
  }, [schedule, isMobile]);

  const applyTransform = () => {
    if (containerRef.current && scrollParentRef.current) {
      const s = zoomState.current.scale;
      containerRef.current.style.transform = `scale(${s}) translateZ(0)`;
      scrollParentRef.current.style.setProperty('--zoom', s.toString());

      const scrollX = scrollParentRef.current.scrollLeft;
      const stickyX = scrollX / s;
      const stickyElements = containerRef.current.querySelectorAll('.manual-sticky');
      stickyElements.forEach((el: any) => {
        el.style.transform = `translateX(${stickyX}px) translateZ(10px)`;
      });
    }
  };

  useEffect(() => {
    const handleLayout = () => {
      const parent = scrollParentRef.current;
      const container = containerRef.current;
      if (!parent || !container) return;

      const width = parent.offsetWidth;
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);

      const contentWidth = container.scrollWidth;
      let scale = (width - 10) / contentWidth;
      if (!mobile && scale > 1) scale = 1;
      if (mobile) scale = Math.max(scale, 0.4);

      zoomState.current.scale = scale;
      applyTransform();
    };

    const timer = setTimeout(handleLayout, 100);
    window.addEventListener('resize', handleLayout);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleLayout);
    };
  }, [schedule, hours, tableHeight]);

  useEffect(() => {
    if (hasInitialScrolled?.current) return;

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const availableDates = Object.keys(schedule).sort();
    const targetDate = availableDates.find((d) => d >= todayStr) || availableDates[0];

    if (!targetDate) return;

    setTimeout(() => {
      const element = document.getElementById(`table-date-${targetDate}`);
      if (element && scrollParentRef.current) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (hasInitialScrolled) hasInitialScrolled.current = true;
      }
    }, 500);
  }, [schedule, hasInitialScrolled]);

  useEffect(() => {
    const el = scrollParentRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2 && scrollParentRef.current) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        if (dist < 10) return;

        const rect = scrollParentRef.current.getBoundingClientRect();
        const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
        const midY = (t1.clientY + t2.clientY) / 2 - rect.top;

        zoomState.current.contentMidpoint = {
          x: (scrollParentRef.current.scrollLeft + midX) / zoomState.current.scale,
          y: (scrollParentRef.current.scrollTop + midY) / zoomState.current.scale,
        };
        zoomState.current.startDistance = dist;
        zoomState.current.startScale = zoomState.current.scale;
        zoomState.current.isPinching = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && zoomState.current.isPinching && scrollParentRef.current) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const ratio = dist / zoomState.current.startDistance;
        const newScale = Math.min(5, Math.max(0.1, zoomState.current.startScale * ratio));

        const rect = scrollParentRef.current.getBoundingClientRect();
        const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
        const midY = (t1.clientY + t2.clientY) / 2 - rect.top;

        zoomState.current.scale = newScale;
        applyTransform();
        scrollParentRef.current.scrollLeft = zoomState.current.contentMidpoint.x * newScale - midX;
        scrollParentRef.current.scrollTop = zoomState.current.contentMidpoint.y * newScale - midY;
      }
    };

    const handleTouchEnd = () => {
      zoomState.current.isPinching = false;
    };

    const handleWheel = (e: WheelEvent) => {
      if ((e.ctrlKey || e.metaKey) && scrollParentRef.current) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 1.05 : 0.95;
        const newScale = Math.min(5, Math.max(0.1, zoomState.current.scale * delta));

        const rect = scrollParentRef.current.getBoundingClientRect();
        const midX = e.clientX - rect.left;
        const midY = e.clientY - rect.top;

        const contentX = (scrollParentRef.current.scrollLeft + midX) / zoomState.current.scale;
        const contentY = (scrollParentRef.current.scrollTop + midY) / zoomState.current.scale;

        zoomState.current.scale = newScale;
        applyTransform();

        scrollParentRef.current.scrollLeft = contentX * newScale - midX;
        scrollParentRef.current.scrollTop = contentY * newScale - midY;
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);
    el.addEventListener('touchcancel', handleTouchEnd);
    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('scroll', applyTransform);
    el.style.cursor = 'grab';

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('scroll', applyTransform);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollParentRef.current) return;
    dragRef.current = {
      isDragging: true,
      startX: e.pageX - scrollParentRef.current.offsetLeft,
      startY: e.pageY - scrollParentRef.current.offsetTop,
      scrollLeft: scrollParentRef.current.scrollLeft,
      scrollTop: scrollParentRef.current.scrollTop,
    };
    scrollParentRef.current.style.cursor = 'grabbing';
    scrollParentRef.current.style.userSelect = 'none';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current.isDragging || !scrollParentRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollParentRef.current.offsetLeft;
    const y = e.pageY - scrollParentRef.current.offsetTop;
    scrollParentRef.current.scrollLeft = dragRef.current.scrollLeft - (x - dragRef.current.startX) * 1.5;
    scrollParentRef.current.scrollTop = dragRef.current.scrollTop - (y - dragRef.current.startY) * 1.5;
  };

  const handleMouseUp = () => {
    dragRef.current.isDragging = false;
    if (scrollParentRef.current) {
      scrollParentRef.current.style.cursor = 'grab';
      scrollParentRef.current.style.removeProperty('user-select');
    }
  };

  return {
    containerRef,
    scrollParentRef,
    isMobile,
    tableHeight,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}
