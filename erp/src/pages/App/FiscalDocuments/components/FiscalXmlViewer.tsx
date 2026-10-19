import React, { useEffect, useRef } from 'react';

export function FiscalXmlViewer({ xml, onClose }: { xml: string; onClose: () => void }) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const xmlField = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      previousFocus?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[1000020] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="fiscal-xml-title" onKeyDown={event => {
        if (event.key !== 'Tab') return;
        if (event.shiftKey && document.activeElement === closeButton.current) {
          event.preventDefault(); xmlField.current?.focus();
        } else if (!event.shiftKey && document.activeElement === xmlField.current) {
          event.preventDefault(); closeButton.current?.focus();
        }
      }} className="flex h-[90dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-950">
        <header className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
          <h2 id="fiscal-xml-title" className="font-bold text-slate-900 dark:text-white">XML do documento fiscal</h2>
          <button ref={closeButton} type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Fechar XML</button>
        </header>
        <textarea ref={xmlField} aria-label="XML completo do documento fiscal" readOnly value={xml} spellCheck={false} className="min-h-0 flex-1 resize-none bg-slate-950 p-4 font-mono text-xs text-slate-100 outline-none" />
      </section>
    </div>
  );
}
