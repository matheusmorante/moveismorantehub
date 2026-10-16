import React, { useState, useEffect, useRef, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import Order from '../../../types/order.type';
import { formatOrderCode } from '../../../utils/orderCode';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import { returnCancellationFormSchema, getReturnCancellationFormValues, ReturnCancellationUnconfirmedError, type ReturnCancellationValues } from '../../../../../../shared-utils/returnFormSchemas';

interface CancelReturnModalProps {
  readonly order: Order;
  readonly onCancel: () => void;
  readonly isBusy?: boolean;
  readonly onConfirm: (values: ReturnCancellationValues, stillCurrent?: () => boolean) => boolean | Promise<boolean>;
}

const CancelReturnModal = (props: CancelReturnModalProps) => <CancelReturnForm {...props}
  key={JSON.stringify([props.order.id, props.order.updatedAt, props.order.status, props.order.returnMethod, props.order.returnStockProcessed, props.order.returnStockReversed])} />;
const CancelReturnForm = ({ order, onCancel, onConfirm, isBusy = false }: CancelReturnModalProps) => {
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const active = useRef(true), closed = useRef(false), inFlight = useRef(false), blocked = useRef(false);
  const titleId = useId();
  const form = useZodForm(returnCancellationFormSchema, getReturnCancellationFormValues(order));
  const physicalReturnConfirmed = order.status === 'fulfilled' || order.returnStockProcessed === true;
  const actionTitle = 'Cancelar esta devolução comercial?';
  const buttonLabel = 'Cancelar devolução comercial';
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const cancel = useCallback(() => {
    if (inFlight.current || isBusy || closed.current || !active.current) return;
    closed.current = true; onCancel();
  }, [onCancel, isBusy]);
  const confirm = async () => {
    if (inFlight.current || isBusy || blocked.current || closed.current || !active.current || secondsLeft > 0 || physicalReturnConfirmed) return;
    inFlight.current = true; setIsSaving(true); setError('');
    let accepting = true;
    const stillCurrent = () => accepting && active.current && !closed.current;
    try {
      await form.validateAndRun(getReturnCancellationFormValues(order, true), async (values) => {
        if (!stillCurrent()) return false;
        const confirmed = await withTimeout(Promise.resolve(onConfirm(values, stillCurrent)), 40000, null, 'devolucao:cancelamento-comercial-modal');
        if (confirmed !== true) throw new ReturnCancellationUnconfirmedError();
        return true;
      }, (errors) => { if (stillCurrent()) setError(Object.values(flattenFormErrors(errors))[0] || 'Confira o cancelamento da devolução comercial.'); });
    } catch (cause) {
      if ((cause as { uncertain?: boolean; requiresRefresh?: boolean })?.uncertain || (cause as { requiresRefresh?: boolean })?.requiresRefresh) blocked.current = true;
      if (active.current) setError(cause instanceof Error ? cause.message : 'Não foi possível cancelar a devolução comercial.');
    } finally { accepting = false; inFlight.current = false; if (active.current) setIsSaving(false); }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancel]);

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
        aria-label="Fechar modal de cancelamento de devolução comercial"
        className="fixed inset-0 bg-slate-950/55 transition-opacity"
        onClick={cancel}
        disabled={isSaving || isBusy}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={isSaving || isBusy}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-red-200 bg-white p-6 shadow-2xl dark:border-red-900/70 dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300">
          <i className="bi bi-exclamation-triangle-fill text-xl" />
        </div>
        <h2
          id={titleId}
          className="text-base font-black text-slate-800 dark:text-slate-100"
        >
          {actionTitle} (#{formatOrderCode(order)})
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          A ação se aplica somente a esta devolução comercial agendada. Não altera a venda original, as outras
          devoluções comerciais vinculadas nem o estoque.
        </p>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-red-700 dark:text-red-300">
          {physicalReturnConfirmed
            ? 'O retorno físico já foi confirmado. Preserve este registro; eventual documento de devolução fiscal deve ser tratado diretamente no módulo fiscal.'
            : 'Esta devolução comercial será marcada como CANCELADA. Eventual documento fiscal de devolução deve ser tratado separadamente no módulo fiscal.'}
        </p>
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-200">{error}</p>}
        {(isSaving || isBusy) && <p role="status" className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><i className="bi bi-arrow-repeat animate-spin" aria-hidden="true" />Aguardando confirmação do cancelamento da devolução comercial…</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={cancel}
            disabled={isSaving || isBusy}
            className="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Voltar
          </button>
          <button
            type="button"
            disabled={secondsLeft > 0 || physicalReturnConfirmed || isSaving || isBusy || blocked.current}
            onClick={() => void confirm()}
            className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition-all ${
              secondsLeft > 0
                ? 'cursor-not-allowed bg-red-400 opacity-60 dark:bg-red-900/60 dark:text-red-300'
                : 'cursor-pointer bg-red-600 hover:bg-red-700 active:scale-95 shadow-md shadow-red-500/20'
            }`}
          >
            {isSaving ? 'Cancelando…' : secondsLeft > 0 ? `${buttonLabel} (${secondsLeft}s)` : buttonLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
};

export default CancelReturnModal;
