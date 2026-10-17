import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { createOperationConfirmationFormSchema } from '../../../../../../shared-utils/operationConfirmationFormSchema';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';

interface CancelSaleModalProps {
  readonly order: import('../../../types/order.type').default;
  readonly preview: {
    action:
      | 'none'
      | 'cancel'
      | 'estorno'
      | 'return'
      | 'manual_review'
      | 'blocked'
      | 'pending'
      | 'reconcile'
      | 'batch';
    hasAuthorizedInvoice: boolean;
    model?: string;
    environment?: 1 | 2;
    reason?: string;
    returnOrderId?: string;
    returnOrderStatus?: string;
    operations?: Array<{ action: string; documentId: string; environment?: 1 | 2; model?: string; reason?: string }>;
  };
  readonly onCancel: () => void;
  readonly onConfirm: (options: { productionConfirmed: boolean }, stillCurrent: () => boolean) => boolean | Promise<boolean>;
}

const CancelSaleModal = ({ order, preview, onCancel, onConfirm }: CancelSaleModalProps) => {
  const [secondsLeft, setSecondsLeft] = useState(3);
  const [confirmed, setConfirmed] = useState(false);
  const [productionConfirmed, setProductionConfirmed] = useState(false);
  const confirmedRef = useRef(false);
  const inFlight = useRef(false);
  const active = useRef(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const blockedContexts = useRef(new Set<string>());
  const completedContexts = useRef(new Set<string>());
  const contextKey = JSON.stringify([order.id, order.updatedAt, order.status, preview]);
  const currentContext = useRef(contextKey); currentContext.current = contextKey;
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    confirmedRef.current = completedContexts.current.has(contextKey); setConfirmed(confirmedRef.current); setProductionConfirmed(false); setSecondsLeft(3);
    setUncertain(blockedContexts.current.has(contextKey));
    setError(blockedContexts.current.has(contextKey) ? 'Existe uma operação sem confirmação. Consulte o histórico antes de repetir.' : '');
  }, [contextKey]);
  const close = () => { if (!inFlight.current) onCancel(); };
  const requiresProductionConfirmation =
    (preview.action === 'cancel' && preview.environment === 1) ||
    (preview.action === 'batch' &&
      Boolean(preview.operations?.some((operation) => operation.action === 'cancel' && operation.environment === 1)));
  const fiscalEnvironmentLabel =
    preview.environment === 1
      ? 'Produção'
      : preview.environment === 2
        ? 'Homologação'
        : 'ambiente não identificado';
  const fiscalProcedureBlocked = [
    'manual_review',
    'blocked',
    'pending',
    'reconcile',
  ].includes(preview.action);
  const title =
    preview.action === 'return'
      ? 'Devolução comercial necessária'
      : fiscalProcedureBlocked
        ? 'Cancelamento indisponível'
        : preview.action === 'batch'
          ? 'Notas fiscais para tratamento'
          : preview.action === 'cancel'
          ? 'Cancelamento fiscal disponível'
          : preview.action === 'estorno'
            ? 'Estorno fiscal necessário'
            : 'Cancelar esta venda?';
  const confirmationLabel =
    preview.action === 'return'
      ? preview.returnOrderId
        ? 'Abrir devolução comercial existente'
        : 'Iniciar devolução comercial'
      : 'Cancelar venda';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !inFlight.current) {
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

  const form = useZodForm(createOperationConfirmationFormSchema(requiresProductionConfirmation), { productionConfirmed, waitingSeconds: secondsLeft });
  const confirm = async () => {
    if (inFlight.current || confirmedRef.current || blockedContexts.current.has(contextKey) || fiscalProcedureBlocked) return;
    inFlight.current = true; setBusy(true); setError('');
    let accepting = true;
    const isCurrent = () => accepting && active.current && currentContext.current === contextKey;
    try {
      await form.validateAndRun({ productionConfirmed, waitingSeconds: secondsLeft }, async (data) => {
        if (!isCurrent()) return false;
        const result = await withTimeout(Promise.resolve(onConfirm({ productionConfirmed: data.productionConfirmed }, isCurrent)), 45_000, null, 'venda:confirmar-cancelamento');
        if (result === null) throw new Error('O resultado não foi confirmado no prazo. Consulte o histórico antes de repetir.');
        if (result === true) completedContexts.current.add(contextKey);
        if (!isCurrent()) return false;
        if (result !== true) { setError('Não foi possível confirmar a operação. Confira os dados e tente novamente.'); return false; }
        confirmedRef.current = true; setConfirmed(true); return true;
      }, (errors) => { if (isCurrent()) setError(Object.values(flattenFormErrors(errors))[0] || 'Confira a confirmação.'); });
    } catch (failure) {
      const known = Boolean(failure && typeof failure === 'object' && 'knownFailure' in failure && failure.knownFailure === true);
      if (!known) blockedContexts.current.add(contextKey);
      if (isCurrent()) {
        setUncertain(!known);
        const message = failure instanceof Error ? failure.message : 'Não foi possível confirmar a operação.';
        setError(known ? message : `${message} Confira o histórico antes de repetir o cancelamento comercial ou fiscal.`);
      }
    } finally { accepting = false; inFlight.current = false; if (active.current) setBusy(false); }
  };
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar modal de cancelamento de venda"
        className="fixed inset-0 bg-slate-950/55 transition-opacity"
        onClick={close}
        disabled={busy}
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
          {title}
        </h2>
        <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <strong>
            {preview.action === 'return'
              ? 'Próximo passo:'
              : fiscalProcedureBlocked
                ? 'Nenhuma alteração será aplicada:'
                : 'Consequências desta venda:'}
          </strong>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {preview.action === 'return' ? (
              <>
                <li>A venda e a NF-e original serão preservadas; este fluxo não cancela a venda.</li>
                {preview.returnOrderId ? (
                  <li>Será aberta a devolução comercial vinculada existente para continuar o tratamento.</li>
                ) : (
                  <li>
                    Será aberto o cadastro de devolução comercial para selecionar itens e quantidades; nenhuma
                    devolução comercial integral será criada automaticamente.
                  </li>
                )}
              </>
            ) : fiscalProcedureBlocked ? (
              <li>O pedido, o estoque e a nota fiscal permanecerão como estão até a situação ser esclarecida.</li>
            ) : (
              <>
                <li>Pedido será cancelado.</li>
                {order.stockProcessed ? (
                  <li>Movimentações de saída vinculadas serão revertidas uma vez.</li>
                ) : (
                  <li>Não há saída de estoque registrada para reverter.</li>
                )}
              </>
            )}
            {preview.action === 'cancel' && (
              <li>
                A NF-e modelo {preview.model || ''} autorizada em{' '}
                {fiscalEnvironmentLabel} terá o cancelamento fiscal solicitado junto à SEFAZ.
              </li>
            )}
            {preview.action === 'estorno' && (
              <li>
                A NF-e original de {fiscalEnvironmentLabel} permanecerá autorizada no histórico.
                Será preparado um rascunho NFE de estorno fiscal (NF-e modelo 55, finalidade de ajuste 3) vinculado
                à original. A transmissão acontece depois da conferência específica de CFOP e
                tributação.
              </li>
            )}
            {preview.action === 'batch' &&
              preview.operations?.map((operation) => (
                <li key={operation.documentId}>
                  {operation.environment === 2 ? 'NFH' : 'NF'} —{' '}
                  {operation.action === 'cancel'
                    ? `cancelamento fiscal do modelo ${operation.model || ''} (${operation.environment === 1 ? 'Produção' : 'Homologação'})`
                    : operation.action === 'estorno'
                      ? `rascunho de estorno fiscal para o modelo ${operation.model || ''}`
                      : operation.reason || 'revisão fiscal necessária'}
                </li>
              ))}
            {preview.action === 'none' && (
              <li>Não há NF-e autorizada vinculada; o cancelamento será exclusivamente cancelamento comercial.</li>
            )}
          </ul>
        </div>
        {preview.reason && preview.action !== 'none' && (
          <p
            className={
              fiscalProcedureBlocked
                ? 'mt-3 text-xs text-rose-700 dark:text-rose-300'
                : preview.action === 'return'
                  ? 'mt-3 text-xs text-amber-700 dark:text-amber-300'
                  : 'mt-3 text-xs text-slate-600 dark:text-slate-300'
            }
          >
            {preview.reason}
          </p>
        )}
        {['none', 'cancel', 'estorno'].includes(preview.action) && (
          <p className="mt-3 text-sm font-semibold leading-relaxed text-red-700 dark:text-red-300">
            Esta ação é definitiva: após o cancelamento comercial, a venda não pode mais ser editada nem ter o status
            alterado. Caso precise corrigir ou refazer a operação, duplique o pedido e trabalhe na
            nova venda.
          </p>
        )}
        {requiresProductionConfirmation && (
          <label className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
            <input
              type="checkbox"
              checked={productionConfirmed}
              disabled={busy || uncertain || confirmed}
              onChange={(event) => setProductionConfirmed(event.target.checked)}
              className="mt-0.5 accent-red-600"
            />
            Confirmo a solicitação de cancelamento fiscal desta nota na SEFAZ de Produção.
          </label>
        )}
        {error && <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300">{error}</p>}
        {busy && <p role="status" className="mt-3 text-sm text-slate-600 dark:text-slate-300"><i className="bi bi-arrow-repeat animate-spin mr-2" />Aguardando confirmação da operação...</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Voltar
          </button>
          <button
            type="button"
            hidden={fiscalProcedureBlocked}
            disabled={
              secondsLeft > 0 ||
              confirmed ||
              busy || uncertain ||
              (requiresProductionConfirmation && !productionConfirmed)
            }
            onClick={() => { void confirm(); }}
            className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition-all ${
              secondsLeft > 0 ||
              confirmed ||
              busy || uncertain ||
              (requiresProductionConfirmation && !productionConfirmed)
                ? 'cursor-not-allowed bg-red-400 opacity-60 dark:bg-red-900/60 dark:text-red-300'
                : 'cursor-pointer bg-red-600 hover:bg-red-700 active:scale-95 shadow-md shadow-red-500/20'
            }`}
          >
            {secondsLeft > 0 && preview.action !== 'return'
              ? 'Cancelar venda (' + secondsLeft + 's)'
              : secondsLeft > 0
                ? 'Abrir devolução comercial (' + secondsLeft + 's)'
                : confirmationLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
};

export default CancelSaleModal;
