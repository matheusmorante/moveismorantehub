import React, { useEffect, useState } from 'react';
import Order from '../../../types/order.type';
import { fetchReturnFiscalEligibility } from '@/pages/App/FiscalDocuments/services/fiscalOperationDraftService';
import type { ReturnFiscalEligibility } from '@/pages/App/FiscalDocuments/types/fiscalOperationDraft.types';

const MISSING_ORIGINAL_MESSAGE =
  'Não é possível emitir NF-e de devolução porque este pedido não possui NF-e de saída autorizada.';

interface ReturnNfeActionMenuButtonProps {
  order: Order;
  onAction: (actionKey: string, order: Order) => void;
  onCloseMenu: () => void;
}

export function ReturnNfeActionMenuButton({
  order,
  onAction,
  onCloseMenu,
}: ReturnNfeActionMenuButtonProps) {
  const [eligibility, setEligibility] = useState<ReturnFiscalEligibility | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (order.orderType !== 'return' || !order.id) return;
    setEligibility(null);
    setError('');
    void fetchReturnFiscalEligibility(order.id)
      .then((result) => {
        if (active) setEligibility(result);
      })
      .catch((cause) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Não foi possível consultar a elegibilidade fiscal.');
        }
      });
    return () => {
      active = false;
    };
  }, [order.id, order.orderType]);

  if (order.orderType !== 'return') return null;
  const loading = !eligibility && !error;
  const message = error || eligibility?.reason || MISSING_ORIGINAL_MESSAGE;
  const enabled = Boolean(eligibility?.eligible);
  const hasAuthorizedReturn = eligibility?.sources.some((source) => source.state === 'authorized');
  const label = hasAuthorizedReturn
    ? 'Ver / continuar NF-e de devolução'
    : 'Emitir NF-e de devolução';

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={!enabled || loading}
        onClick={(event) => {
          event.stopPropagation();
          if (!enabled) return;
          onAction('openReturnNfe', order);
          onCloseMenu();
        }}
        className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-all ${enabled ? 'text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/30' : 'cursor-not-allowed text-slate-400 opacity-70 dark:text-slate-500'}`}
        title={loading ? 'Consultando autorização da NF-e original…' : enabled ? label : message}
        aria-describedby={`return-nfe-status-${order.id}`}
      >
        <i className={`bi ${loading ? 'bi-hourglass-split' : 'bi-receipt'} text-lg`} />
        <span className="text-xs font-black uppercase tracking-widest">
          {loading ? 'Verificando NF-e original…' : label}
        </span>
      </button>
      {!enabled && !loading && (
        <p
          id={`return-nfe-status-${order.id}`}
          className="px-2.5 text-[10px] leading-4 text-rose-700 dark:text-rose-300"
          role="status"
        >
          {message}
        </p>
      )}
    </div>
  );
}
