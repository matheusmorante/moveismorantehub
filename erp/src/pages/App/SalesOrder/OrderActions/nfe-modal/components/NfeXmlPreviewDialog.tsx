import React from 'react';
import type { NfeXmlPreviewProof } from '@/pages/utils/nfe/nfeService';

export interface NfeXmlPreviewDialogProps {
  isOpen: boolean;
  canPreviewXml: boolean;
  xmlPreview: {
    xml: string;
    proof: NfeXmlPreviewProof;
    contextKey: string;
    freshHmlEmission: boolean;
  } | null;
  onClose: () => void;
}

export const NfeXmlPreviewDialog: React.FC<NfeXmlPreviewDialogProps> = ({
  isOpen,
  canPreviewXml,
  xmlPreview,
  onClose,
}) => {
  if (!canPreviewXml || !isOpen || !xmlPreview) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Prévia do XML fiscal"
      data-testid="nfe-xml-preview-dialog"
      className="fixed inset-0 z-[1000001] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6"
    >
      <section className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Prévia do XML — ainda não transmitido
          </h2>
          <button
            type="button"
            data-testid="nfe-xml-preview-close"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Fechar
          </button>
        </header>
        <pre
          data-testid="nfe-xml-preview-content"
          className="min-h-0 overflow-auto whitespace-pre-wrap break-all p-4 font-mono text-xs text-slate-800 dark:text-slate-200"
        >
          {xmlPreview.xml}
        </pre>
      </section>
    </div>
  );
};
