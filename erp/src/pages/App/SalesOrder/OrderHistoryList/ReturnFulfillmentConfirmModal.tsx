import React from 'react';
import { createPortal } from 'react-dom';
import type Order from '../../../types/order.type';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import { returnFulfillmentFormSchema, getReturnFulfillmentFormValues, ReturnFulfillmentUnconfirmedError, type ReturnFulfillmentValues } from '../../../../../../shared-utils/returnFormSchemas';

type Props = {
  readonly order: Order;
  readonly onCancel: () => void;
  readonly isBusy?: boolean;
  readonly onConfirm: (values: ReturnFulfillmentValues, stillCurrent?: () => boolean) => boolean | Promise<boolean>;
};

const ReturnFulfillmentConfirmModal = (props: Props) => <ReturnFulfillmentConfirmForm {...props}
  key={JSON.stringify([props.order.id, props.order.updatedAt, props.order.status, props.order.returnMethod, props.order.items])} />;

const ReturnFulfillmentConfirmForm = ({ order, onCancel, onConfirm, isBusy = false }: Props) => {
  const [seconds, setSeconds] = React.useState(5);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const inFlight = React.useRef(false);
  const blocked = React.useRef(false);
  const active = React.useRef(true);
  const closed = React.useRef(false);
  const titleId = React.useId();
  const form = useZodForm(returnFulfillmentFormSchema, getReturnFulfillmentFormValues(order));
  React.useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const cancel = React.useCallback(() => {
    if (inFlight.current || isBusy || closed.current || !active.current) return;
    closed.current = true; onCancel();
  }, [onCancel, isBusy]);
  const confirm = async () => {
    if (inFlight.current || isBusy || blocked.current || closed.current || !active.current || seconds > 0) return;
    inFlight.current = true; setIsSaving(true); setError('');
    let accepting = true;
    const stillCurrent = () => accepting && active.current && !closed.current;
    try {
      await form.validateAndRun(getReturnFulfillmentFormValues(order, true), async (values) => {
        if (!stillCurrent()) return false;
        const confirmed = await withTimeout(Promise.resolve(onConfirm(values, stillCurrent)), 40000, null, 'devolucao:confirmar-recebimento-modal');
        if (confirmed !== true) throw new ReturnFulfillmentUnconfirmedError();
        return true;
      }, (errors) => { if (stillCurrent()) setError(Object.values(flattenFormErrors(errors))[0] || 'Confira a devolução comercial.'); });
    } catch (cause) {
      if ((cause as { uncertain?: boolean; requiresRefresh?: boolean })?.uncertain || (cause as { requiresRefresh?: boolean })?.requiresRefresh) blocked.current = true;
      if (active.current) setError(cause instanceof Error ? cause.message : 'Não foi possível confirmar o recebimento da devolução comercial.');
    } finally { accepting = false; inFlight.current = false; if (active.current) setIsSaving(false); }
  };
  const isCollection =
    order.returnMethod === 'store_collection' ||
    (order.status === 'scheduled' && !order.returnMethod);
  const confirmation = isCollection ? 'coleta da devolução comercial' : 'recebimento da devolução comercial';
  const confirmationAction = isCollection ? 'coleta' : 'recebimento';

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancel]);

  React.useEffect(() => {
    if (!seconds) return;
    const timer = window.setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds]);
  const unlinkedItems = (order.items || []).filter(
    (item) => !item.productId?.trim() || item.isTemporaryProduct
  );
  const hasUnregistered = unlinkedItems.length > 0;

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <button
        type="button"
          aria-label={`Fechar confirmação de ${confirmation}`}
        className="fixed inset-0 bg-slate-950/60 transition-opacity"
        onClick={cancel}
        disabled={isSaving || isBusy}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={isSaving || isBusy}
        className="relative z-10 w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
      >
        <h2
          id={titleId}
          className="text-lg font-black text-slate-900 dark:text-white"
        >
          Confirmar {confirmation}?
        </h2>
        {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {(isSaving || isBusy) && <p role="status" className="mt-3 text-sm text-emerald-700"><i aria-hidden="true" className="bi bi-arrow-repeat animate-spin mr-2" />{isSaving ? 'Confirmando recebimento da devolução comercial...' : 'Aguardando outra confirmação comercial...'}</p>}
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Confirme somente após{' '}
          {isCollection
            ? 'a equipe trazer a mercadoria coletada'
            : 'a loja receber fisicamente a mercadoria do cliente'}
          . Uma movimentação de entrada será gerada para os itens com produto cadastrado. Depois
          disso, esta devolução não poderá ser cancelada ou desfeita.
        </p>
        {hasUnregistered ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <div className="flex items-center gap-2 font-black">
              <i className="bi bi-exclamation-triangle-fill text-amber-600 dark:text-amber-400 text-sm" />
              <span>Itens sem cadastro detectados ({unlinkedItems.length})</span>
            </div>
            <p className="mt-1">
              Itens sem cadastro no sistema <strong>NÃO geram movimentação de estoque</strong>{' '}
              (nenhuma entrada será lançada para eles).
            </p>
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Itens sem cadastro no sistema não movimentam estoque.
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={cancel}
            disabled={isSaving || isBusy}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300"
          >
            Voltar
          </button>
          <button
            type="button"
            disabled={seconds > 0 || isSaving || isBusy || blocked.current}
            onClick={confirm}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? 'Confirmando...' : seconds ? `Aguarde ${seconds}s` : `Confirmar ${confirmationAction}`}
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
};

export default ReturnFulfillmentConfirmModal;
