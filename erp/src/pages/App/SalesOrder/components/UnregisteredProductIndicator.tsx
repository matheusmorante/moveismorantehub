import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export const UnregisteredProductIndicator: React.FC = () => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; above: boolean } | null>(
    null
  );

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const tooltipWidth = Math.min(280, window.innerWidth - 16);
    setPosition({
      top: rect.bottom + 8 <= window.innerHeight - 88 ? rect.bottom + 8 : rect.top - 8,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - tooltipWidth - 8)),
      above: rect.bottom + 8 > window.innerHeight - 88,
    });
  }, []);

  const openTooltip = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setIsOpen(true);
  };

  const closeTooltip = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => setIsOpen(false), 120);
  };

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(
    () => () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    },
    []
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Produto não cadastrado no ERP"
        aria-describedby={isOpen ? tooltipId : undefined}
        onMouseEnter={openTooltip}
        onMouseLeave={closeTooltip}
        onFocus={openTooltip}
        onBlur={closeTooltip}
        onClick={(event) => event.stopPropagation()}
        className="inline-flex shrink-0 items-center justify-center rounded-sm text-amber-600 outline-none hover:text-amber-700 focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-amber-400 dark:hover:text-amber-300"
      >
        <i className="bi bi-exclamation-triangle-fill text-xs" aria-hidden="true" />
      </button>
      {isOpen && position && typeof document !== 'undefined'
        ? createPortal(
            <div
              id={tooltipId}
              role="tooltip"
              style={{ top: position.top, left: position.left }}
              onMouseEnter={openTooltip}
              onMouseLeave={closeTooltip}
              className={`fixed z-[100000000] w-[min(17.5rem,calc(100vw-1rem))] rounded-xl border border-amber-200 bg-white px-3 py-2 text-left text-xs text-slate-700 shadow-2xl dark:border-amber-900/70 dark:bg-slate-900 dark:text-slate-200 ${
                position.above ? '-translate-y-full' : ''
              }`}
            >
              <p className="font-bold text-amber-700 dark:text-amber-300">
                Produto não cadastrado no ERP
              </p>
              <p className="mt-1 leading-relaxed">
                Por isso, o NCM não foi carregado automaticamente do cadastro do produto.
              </p>
            </div>,
            document.body
          )
        : null}
    </>
  );
};
