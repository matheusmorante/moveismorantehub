import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface CancelSaleModalProps {
  readonly order: import('../../../types/order.type').default;
  readonly preview: {
    action: 'none' | 'cancel' | 'estorno' | 'manual_review';
    hasAuthorizedInvoice: boolean;
    model?: string;
    reason?: string;
  };
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

const CancelSaleModal = ({ order, preview, onCancel, onConfirm }: CancelSaleModalProps) => {
  const [secondsLeft, setSecondsLeft] = useState(3);
  const [confirmed, setConfirmed] = useState(false);
  const confirmedRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar modal de cancelamento de venda"
        className="fixed inset-0 bg-slate-950/55 transition-opacity"
        onClick={onCancel}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-sale-title"
        className="relative z-10 w-full max-w-lg rounded-2xl border border-red-200 bg-white p-6 shadow-2xl dark:border-red-900/70 dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300">
          <i className="bi bi-exclamation-triangle-fill text-xl" />
        </div>
        <h2
          id="cancel-sale-title"
          className="text-base font-black text-slate-800 dark:text-slate-100"
        >
          Cancelar esta venda?
        </h2>
        <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <strong>Consequências desta venda:</strong>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Pedido será cancelado.</li>
            {order.stockProcessed
              ? <li>Movimentações de saída vinculadas serão revertidas uma vez.</li>
              : <li>Não há saída de estoque registrada para reverter.</li>}
            {preview.action === 'cancel' && <li>A NF-e modelo {preview.model || ''} autorizada será cancelada junto à SEFAZ.</li>}
            {preview.action === 'estorno' && <li>A NF-e original permanecerá no histórico e será preparado um documento fiscal de estorno para revisão.</li>}
            {preview.action === 'manual_review' && <li>A NF-e original permanecerá preservada; o caso exige revisão fiscal antes de qualquer procedimento.</li>}
            {preview.action === 'none' && <li>Não há NF-e autorizada vinculada; o cancelamento será somente comercial.</li>}
          </ul>
        </div>
        {preview.reason && preview.action === 'manual_review' && <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">{preview.reason}</p>}
        <p className="mt-3 text-sm font-semibold leading-relaxed text-red-700 dark:text-red-300">
          Esta ação é definitiva: uma venda cancelada não pode mais ser editada nem ter o status
          alterado. Caso precise corrigir ou refazer a operação, duplique o pedido e trabalhe na
          nova venda.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Voltar
          </button>
          <button
            type="button"
            disabled={secondsLeft > 0 || confirmed}
            onClick={() => {
              if (confirmedRef.current) return;
              confirmedRef.current = true;
              setConfirmed(true);
              onConfirm();
            }}
            className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition-all ${
              secondsLeft > 0 || confirmed
                ? 'cursor-not-allowed bg-red-400 opacity-60 dark:bg-red-900/60 dark:text-red-300'
                : 'cursor-pointer bg-red-600 hover:bg-red-700 active:scale-95 shadow-md shadow-red-500/20'
            }`}
          >
            {secondsLeft > 0 ? `Cancelar venda (${secondsLeft}s)` : 'Cancelar venda'}
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
};

export default CancelSaleModal;
