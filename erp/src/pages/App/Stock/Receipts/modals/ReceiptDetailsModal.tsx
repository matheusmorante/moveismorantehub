import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GoodsReceipt } from '@/pages/utils/goodsReceiptService';
import {
  ReceiptDetailsHeader,
  ReceiptDetailsSummary,
  ReceiptAttachmentsAndNotes,
  ReceiptItemsTable,
  ReceiptDetailsFooter,
} from './receipt-details';

type ReceiptDetailsTab = 'summary' | 'items' | 'notes';

interface ReceiptDetailsModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly receipt: GoodsReceipt | null;
}

export function ReceiptDetailsModal({ isOpen, onClose, receipt }: ReceiptDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<ReceiptDetailsTab>('summary');

  useEffect(() => {
    if (isOpen) setActiveTab('summary');
  }, [isOpen, receipt?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !receipt) return null;

  const content = (
    <div
      className="fixed inset-0 z-[999999] flex items-stretch justify-center animate-fade-in xl:items-center xl:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-details-modal-title"
    >
      <button
        type="button"
        aria-label="Fechar detalhes do recebimento"
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm cursor-default border-0 p-0 m-0 w-full h-full"
      />
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-slate-900 xl:my-8 xl:h-auto xl:max-w-4xl xl:rounded-[2.5rem] xl:border xl:border-slate-100 xl:dark:border-slate-800">
        <ReceiptDetailsHeader receipt={receipt} onClose={onClose} />

        <div role="tablist" aria-label="Abas dos detalhes do recebimento" className="flex shrink-0 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
          {([
            { id: 'summary', label: 'Resumo', icon: 'bi-file-text' },
            { id: 'items', label: `Itens (${receipt.items?.length || 0})`, icon: 'bi-box-seam' },
            { id: 'notes', label: 'Observações', icon: 'bi-chat-left-text' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-4 text-xs font-bold transition-colors ${activeTab === tab.id
                ? 'border-blue-600 text-blue-700 dark:text-blue-300'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
              <i className={`bi ${tab.icon}`} aria-hidden="true" />
              {tab.label}
            </button>
          ))}
        </div>

        <div key={activeTab} role="tabpanel" className="flex-1 overflow-y-auto p-4 space-y-6 xl:max-h-[75vh] xl:flex-none xl:p-8">
          {activeTab === 'summary' ? (
            <ReceiptDetailsSummary receipt={receipt} />
          ) : null}
          {activeTab === 'items' ? <ReceiptItemsTable items={receipt.items} /> : null}
          {activeTab === 'notes' ? <ReceiptAttachmentsAndNotes receipt={receipt} /> : null}
        </div>

        <ReceiptDetailsFooter receipt={receipt} onClose={onClose} />
      </div>
    </div>
  );

  return typeof document === 'undefined' ? content : createPortal(content, document.body);
}

export default ReceiptDetailsModal;
