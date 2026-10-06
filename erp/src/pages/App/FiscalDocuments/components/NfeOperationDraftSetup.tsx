import React from 'react';
import type {
  ReturnOrderOption,
} from '../types/fiscalOperationDraft.types';

interface NfeOperationDraftSetupProps {
  kind: 'return' | 'estorno';
  onKindChange: (kind: 'return' | 'estorno') => void;
  returnOrders: ReturnOrderOption[];
  returnOrderId: string;
  onReturnOrderChange: (orderId: string) => void;
  loadingReturns: boolean;
  reason: string;
  onReasonChange: (reason: string) => void;
  operationDidNotOccur: boolean;
  onOperationDidNotOccurChange: (confirmed: boolean) => void;
  goodsDidNotCirculate: boolean;
  onGoodsDidNotCirculateChange: (confirmed: boolean) => void;
  canPrepare: boolean;
  preparing: boolean;
  onPrepare: () => void;
}

export function NfeOperationDraftSetup({
  kind,
  onKindChange,
  returnOrders,
  returnOrderId,
  onReturnOrderChange,
  loadingReturns,
  reason,
  onReasonChange,
  operationDidNotOccur,
  onOperationDidNotOccurChange,
  goodsDidNotCirculate,
  onGoodsDidNotCirculateChange,
  canPrepare,
  preparing,
  onPrepare,
}: NfeOperationDraftSetupProps) {
  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onKindChange('return')}
          aria-pressed={kind === 'return'}
          className={
            kind === 'return'
              ? 'rounded-2xl border border-blue-500 bg-blue-50 p-4 text-left dark:bg-blue-950/30'
              : 'rounded-2xl border border-slate-200 p-4 text-left dark:border-slate-700'
          }
        >
          <span className="block text-sm font-black">Devolução de mercadoria</span>
          <span className="mt-1 block text-xs text-slate-500">
            Mercadoria retornou fisicamente; emite NF-e de entrada após atendimento.
          </span>
        </button>
        <button
          type="button"
          onClick={() => onKindChange('estorno')}
          aria-pressed={kind === 'estorno'}
          className={
            kind === 'estorno'
              ? 'rounded-2xl border border-amber-500 bg-amber-50 p-4 text-left dark:bg-amber-950/30'
              : 'rounded-2xl border border-slate-200 p-4 text-left dark:border-slate-700'
          }
        >
          <span className="block text-sm font-black">Estorno fiscal</span>
          <span className="mt-1 block text-xs text-slate-500">
            Operação não realizada e sem circulação; não movimenta estoque.
          </span>
        </button>
      </div>

      {kind === 'return' ? (
        <label className="block space-y-2 text-xs font-bold">
          <span>Devolução comercial atendida</span>
          <select
            value={returnOrderId}
            onChange={(event) => onReturnOrderChange(event.target.value)}
            disabled={loadingReturns}
            className="w-full rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="">
              {loadingReturns ? 'Carregando devoluções…' : 'Selecione uma devolução atendida'}
            </option>
            {returnOrders.map((order) => (
              <option key={order.id} value={order.id}>
                Devolução #{order.order_index || order.id.slice(0, 8)}
              </option>
            ))}
          </select>
          {!loadingReturns && returnOrders.length === 0 && (
            <span className="block text-amber-700">
              Não há devoluções atendidas vinculadas a esta venda.
            </span>
          )}
        </label>
      ) : (
        <div className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs dark:border-amber-900 dark:bg-amber-950/20">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={operationDidNotOccur}
              onChange={(event) => onOperationDidNotOccurChange(event.target.checked)}
            />
            Confirmo que a operação não ocorreu.
          </label>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={goodsDidNotCirculate}
              onChange={(event) => onGoodsDidNotCirculateChange(event.target.checked)}
            />
            Confirmo que a mercadoria não circulou.
          </label>
          <label className="block space-y-1">
            <span>Justificativa do estorno (mínimo 15 caracteres)</span>
            <textarea
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              rows={3}
              maxLength={255}
              className="w-full rounded-xl border border-amber-300 bg-white p-3 dark:bg-slate-950"
            />
          </label>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-700">
        Ambiente fixado ao da NF-e original. Estorno usa <code>finNFe=3</code>,{' '}
        <code>tpNF=0</code>; devolução usa <code>finNFe=4</code>, <code>tpNF=0</code>.
      </div>
      <button
        type="button"
        disabled={!canPrepare || preparing || (kind === 'return' && !returnOrderId)}
        onClick={onPrepare}
        className="rounded-xl bg-blue-600 px-5 py-3 text-xs font-black text-white disabled:opacity-50"
      >
        {preparing ? 'Preparando rascunho…' : 'Preparar rascunho fiscal'}
      </button>
    </section>
  );
}
