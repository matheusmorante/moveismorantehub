import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatToBRDate } from '@/pages/utils/formatters';
import { formatAccessKey } from '@/pages/utils/nfe/nfeAccessKey';
import type {
  CancellationEligibility,
  NfeDocumentRecord,
} from '../types/fiscalDocuments.types';

interface FiscalCancelModalProps {
  isOpen: boolean;
  document: NfeDocumentRecord | null;
  eligibility?: CancellationEligibility;
  orderNumber?: number;
  cancelReason: string;
  onCancelReasonChange: (reason: string) => void;
  isCanceling: boolean;
  isConsulting: boolean;
  productionConfirmed: boolean;
  onProductionConfirmedChange: (confirmed: boolean) => void;
  onClose: () => void;
  onConsultSituation: () => void;
  onConfirmCancel: () => void;
}

export const FiscalCancelModal: React.FC<FiscalCancelModalProps> = ({
  isOpen,
  document,
  eligibility,
  orderNumber,
  cancelReason,
  onCancelReasonChange,
  isCanceling,
  isConsulting,
  productionConfirmed,
  onProductionConfirmedChange,
  onClose,
  onConsultSituation,
  onConfirmCancel,
}) => {
  const navigate = useNavigate();

  if (!isOpen || !document) return null;

  const isCancelAction = eligibility?.action === 'cancel';

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-[99999] animate-in fade-in duration-200">
      <div className="w-full max-w-xl space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-red-600 dark:border-slate-800 dark:text-red-400">
          <i className="bi bi-exclamation-octagon-fill text-lg" />
          <div>
            <h3 className="text-sm font-bold tracking-tight">
              {isCancelAction ? 'Cancelar NF-e' : 'Aplicar tratamento fiscal'}
            </h3>
            <p className="text-[10px] text-slate-500">
              {document.modelo === '65' ? 'NFC-e' : 'NF-e'} #{document.numero_nfe} · Série{' '}
              {document.serie} · {document.ambiente === 1 ? 'Produção' : 'Homologação'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-lg bg-slate-50 p-2 text-[10px] dark:bg-slate-950 sm:grid-cols-3">
          <div>
            <span className="text-slate-500">Destinatário</span>
            <div className="truncate font-medium text-slate-800 dark:text-slate-200">
              {document.destinatario_nome || 'Consumidor final'}
            </div>
          </div>
          <div>
            <span className="text-slate-500">Valor</span>
            <div className="font-medium text-slate-800 dark:text-slate-200">
              {formatCurrency(document.valor_total || 0)}
            </div>
          </div>
          <div>
            <span className="text-slate-500">Autorização</span>
            <div className="font-medium text-slate-800 dark:text-slate-200">
              {eligibility?.authorizedAt
                ? formatToBRDate(eligibility.authorizedAt)
                : 'Indisponível'}
            </div>
          </div>
          <div>
            <span className="text-slate-500">Chave de acesso</span>
            <div className="break-all font-mono text-[9px] text-slate-800 dark:text-slate-200">
              {formatAccessKey(document.chave_acesso || '') || 'Indisponível'}
            </div>
          </div>
          <div>
            <span className="text-slate-500">Protocolo</span>
            <div className="truncate font-mono text-slate-800 dark:text-slate-200">
              {document.numero_protocolo || '—'}
            </div>
          </div>
          <div>
            <span className="text-slate-500">Pedido</span>
            {document.order_id ? (
              <button
                type="button"
                onClick={() => navigate(`/sales-order/edit/${document.order_id}`)}
                className="block font-medium text-blue-700 hover:underline dark:text-blue-300"
              >
                #{orderNumber || 'Abrir'}
              </button>
            ) : (
              <div className="text-slate-500">Sem vínculo</div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
            {isCancelAction
              ? 'O mesmo fluxo comercial do pedido será aplicado e, após o commit do pedido e do estoque, o serviço fiscal central solicitará o evento à SEFAZ. A nota só muda para cancelada após confirmação válida.'
              : 'A política central identificou que o prazo normal de cancelamento expirou. O pedido será cancelado pelo fluxo comercial e o sistema abrirá um rascunho de estorno para revisão fiscal; nenhum evento será transmitido nesta etapa.'}
          </p>

          {isCancelAction && (
            <div>
              <label className="mb-1 block text-[10px] font-semibold text-slate-500">
                Justificativa do cancelamento · 15–255 caracteres
              </label>
              <textarea
                value={cancelReason}
                onChange={(event) => onCancelReasonChange(event.target.value)}
                placeholder="Informe por que a operação não ocorreu."
                rows={3}
                maxLength={255}
                className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs outline-none focus:border-red-500 dark:border-slate-800 dark:bg-slate-950"
              />
            </div>
          )}
          {isCancelAction && document.ambiente === 1 && (
            <label className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-[10px] text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
              <input
                type="checkbox"
                checked={productionConfirmed}
                onChange={(event) => onProductionConfirmedChange(event.target.checked)}
                className="mt-0.5 accent-red-600"
              />
              Confirmo a transmissão em Produção e o possível cancelamento definitivo do
              documento.
            </label>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isCanceling || isConsulting}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={onConsultSituation}
            disabled={isCanceling || isConsulting}
            className="rounded-lg border border-blue-200 px-3 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/40"
          >
            {isConsulting ? 'Consultando…' : 'Consultar SEFAZ'}
          </button>
          <button
            type="button"
            onClick={onConfirmCancel}
            disabled={isCanceling}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isCanceling ? (
              <i className="bi bi-arrow-repeat animate-spin" />
            ) : (
              <i className="bi bi-x-circle-fill" />
            )}
            {isCancelAction
              ? 'Confirmar e solicitar cancelamento'
              : 'Confirmar e preparar estorno'}
          </button>
        </div>
      </div>
    </div>
  );
};
