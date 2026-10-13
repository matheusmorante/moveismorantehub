import React from 'react';
import type Order from '@/pages/types/order.type';
import { fetchOrderFiscalBadgeStatuses } from '@/pages/utils/nfe/orderFiscalBadgeService';
import type { OrderFiscalBadgeStatuses } from '@/pages/utils/nfe/orderFiscalBadgeRules';
import { prepareOrderFiscalSnapshotForEmission } from '@/pages/utils/nfeEmissionSnapshotService';

interface NfeEnvironmentChoiceModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onSelectEnvironment: (environment: 1 | 2, preparedOrder: Order) => void;
}

export const NfeEnvironmentChoiceModal: React.FC<NfeEnvironmentChoiceModalProps> = ({
  isOpen,
  order,
  onClose,
  onSelectEnvironment,
}) => {
  const [fiscalStatuses, setFiscalStatuses] = React.useState<OrderFiscalBadgeStatuses | null>(null);
  const [isPreparingSnapshot, setIsPreparingSnapshot] = React.useState(false);
  const [snapshotError, setSnapshotError] = React.useState<string | null>(null);
  const selectionAttempt = React.useRef(0);
  const snapshotRequestInProgress = React.useRef(false);

  React.useEffect(() => {
    let active = true;
    const orderId = order?.id;
    if (!isOpen || !orderId) {
      setFiscalStatuses(null);
      return;
    }

    fetchOrderFiscalBadgeStatuses([orderId])
      .then((res) => {
        if (active && res[orderId]) {
          setFiscalStatuses(res[orderId]);
        }
      })
      .catch((err) => {
        console.error('Erro ao buscar status fiscal para escolha de ambiente:', err);
      });

    return () => {
      active = false;
    };
  }, [isOpen, order?.id]);

  React.useEffect(() => {
    selectionAttempt.current += 1;
    snapshotRequestInProgress.current = false;
    setIsPreparingSnapshot(false);
    setSnapshotError(null);
    return () => {
      selectionAttempt.current += 1;
    };
  }, [isOpen, order?.id]);

  const selectEnvironment = async (environment: 1 | 2) => {
    if (!isOpen || !order || snapshotRequestInProgress.current) return;
    snapshotRequestInProgress.current = true;
    const attempt = ++selectionAttempt.current;
    setSnapshotError(null);
    setIsPreparingSnapshot(true);
    try {
      const preparedOrder = await prepareOrderFiscalSnapshotForEmission(order, environment);
      if (attempt === selectionAttempt.current && isOpen) {
        onSelectEnvironment(environment, preparedOrder);
      }
    } catch (error: unknown) {
      if (attempt === selectionAttempt.current) {
        setSnapshotError(
          error instanceof Error
            ? error.message
            : 'Não foi possível preparar os dados fiscais do pedido.'
        );
      }
    } finally {
      if (attempt === selectionAttempt.current) {
        snapshotRequestInProgress.current = false;
        setIsPreparingSnapshot(false);
      }
    }
  };

  const close = () => {
    selectionAttempt.current += 1;
    snapshotRequestInProgress.current = false;
    setIsPreparingSnapshot(false);
    onClose();
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        selectionAttempt.current += 1;
        snapshotRequestInProgress.current = false;
        setIsPreparingSnapshot(false);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  const isHmlIssued = Boolean(
    fiscalStatuses?.homologation === 'issued' ||
      (order.nfeData?.status === 'homologada' && order.nfeData?.environment === 2)
  );

  const isProdIssued = Boolean(
    fiscalStatuses?.production === 'issued' ||
      (order.nfeData?.status === 'autorizada' && (order.nfeData?.environment ?? 1) === 1) ||
      (order.nfeData?.environment === 1 &&
        (order.nfeData?.accessKey || order.nfeData?.protocolNumber))
  );
  const snapshotStatusMessage = isPreparingSnapshot
    ? 'Preparando os dados fiscais dos itens do pedido...'
    : snapshotError;

  return (
    <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Fechar seleção de ambiente fiscal"
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity"
        onClick={close}
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="nfe-environment-choice-title"
        className="relative z-10 w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-5 dark:border-slate-800 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shadow-sm">
              <i className="bi bi-receipt-cutoff text-xl" />
            </div>
            <div>
              <h3
                id="nfe-environment-choice-title"
                className="text-base font-black text-slate-800 dark:text-slate-100"
              >
                Emitir nota fiscal de saída
              </h3>
              <p className="text-xs font-semibold text-slate-400">
                Pedido #{order.orderIndex || order.id} • Selecione o ambiente fiscal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-rose-500 dark:hover:bg-slate-700 transition-colors"
            title="Fechar"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-4">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Escolha o ambiente da SEFAZ para emissão do documento fiscal deste pedido:
          </p>

          {snapshotStatusMessage && (
            <div
              role={snapshotError ? 'alert' : 'status'}
              className={`rounded-xl border px-4 py-3 text-xs font-semibold ${
                snapshotError
                  ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300'
                  : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300'
              }`}
            >
              {isPreparingSnapshot && <i className="bi bi-arrow-repeat animate-spin mr-2" />}
              {snapshotStatusMessage}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Opção Homologação */}
            <button
              type="button"
              disabled={isHmlIssued || isPreparingSnapshot}
              title={
                isHmlIssued
                  ? 'Nota fiscal de homologação já emitida para este pedido.'
                  : isPreparingSnapshot
                    ? 'Aguarde a preparação dos dados fiscais do pedido.'
                    : 'Emitir nota fiscal no ambiente de homologação (testes)'
              }
              onClick={() => void selectEnvironment(2)}
              className={`flex flex-col items-center justify-center p-5 rounded-2xl border text-center transition-all relative min-h-[140px] ${
                isHmlIssued || isPreparingSnapshot
                  ? 'opacity-50 cursor-not-allowed text-slate-400 bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 pointer-events-auto'
                  : 'border-amber-200 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100/80 dark:hover:bg-amber-900/30 hover:-translate-y-1 hover:shadow-lg cursor-pointer'
              }`}
            >
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2.5">
                <i className="bi bi-shield-check text-2xl" />
              </div>
              <span className="text-sm font-black tracking-wide uppercase">Homologação</span>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
                {isHmlIssued
                  ? 'Já emitida para este pedido'
                  : 'Ambiente de testes (sem valor fiscal)'}
              </span>
            </button>

            {/* Produção abre o fluxo normal, que exige confirmação explícita antes do envio. */}
            <button
              type="button"
              disabled={isProdIssued || isPreparingSnapshot}
              title={
                isProdIssued
                  ? 'Nota fiscal de produção já emitida para este pedido.'
                  : isPreparingSnapshot
                    ? 'Aguarde a preparação dos dados fiscais do pedido.'
                    : 'Abrir emissão real em Produção (tpAmb=1); a próxima etapa exige confirmação.'
              }
              onClick={() => void selectEnvironment(1)}
              className={`flex flex-col items-center justify-center p-5 rounded-2xl border text-center transition-all relative min-h-[140px] ${
                isProdIssued || isPreparingSnapshot
                  ? 'opacity-50 cursor-not-allowed text-slate-400 bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 pointer-events-auto'
                  : 'border-rose-200 dark:border-rose-900/40 bg-rose-50/70 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100/80 dark:hover:bg-rose-900/30 hover:-translate-y-1 hover:shadow-lg cursor-pointer'
              }`}
            >
              <div className="w-11 h-11 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-2.5">
                <i className="bi bi-file-earmark-check text-2xl" />
              </div>
              <span
                className={`text-sm font-black tracking-wide uppercase ${
                  isProdIssued ? 'text-slate-400 dark:text-slate-500' : ''
                }`}
              >
                Produção
              </span>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
                {isProdIssued
                  ? 'Já emitida para este pedido'
                  : 'Ambiente oficial • exige confirmação'}
              </span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={close}
            className="flex items-center gap-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 transition-all"
          >
            <i className="bi bi-x-lg" />
            <span>Cancelar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NfeEnvironmentChoiceModal;
