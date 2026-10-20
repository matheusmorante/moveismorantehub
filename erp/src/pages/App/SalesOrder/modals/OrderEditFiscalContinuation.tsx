import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import type Order from '@/pages/types/order.type';
import {
  cancelFiscalDocumentForOrderEdit,
  consultOrderEditOriginal,
  finalizeFiscalOrderEdit,
  resumeFiscalOrderEdit,
  type FiscalOrderEditReplacement,
} from '@/pages/utils/nfe/orderEditFiscalService';
import { clearFiscalEmissionRequest } from '@/pages/utils/nfe/nfeEmissionRequestState';
import NfeOperationDraftModal from '../../FiscalDocuments/modals/NfeOperationDraftModal';
import NfeEmissionModal from '../OrderActions/NfeEmissionModal';
import { prepareOrderFiscalSnapshotForEmission } from '@/pages/utils/nfeEmissionSnapshotService';

type Props = {
  order: Order;
  replacements: FiscalOrderEditReplacement[];
  onClose: (order: Order) => void;
  autoContinue?: boolean;
};

/** Resumes the persisted workflow; each external fiscal action starts in its ERP modal. */
export default function OrderEditFiscalContinuation({ order: initialOrder, replacements: initialRows, onClose, autoContinue = false }: Props) {
  const [order, setOrder] = useState(initialOrder);
  const [rows, setRows] = useState(initialRows);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [estorno, setEstorno] = useState<FiscalOrderEditReplacement | null>(null);
  const [emission, setEmission] = useState<FiscalOrderEditReplacement | null>(null);
  const autoStepsRef = useRef(new Set<string>());

  useEffect(() => {
    if (initialOrder?.id) {
      initialRows.forEach((row) => {
        if (!row.replacementDocumentId && row.status === 'ready_to_reissue') {
          clearFiscalEmissionRequest(initialOrder.id!, row.environment);
        }
      });
    }
  }, [initialOrder?.id, initialRows]);

  const refresh = React.useCallback(async () => {
    const current = await resumeFiscalOrderEdit(initialOrder.id!);
    setOrder(current.order);
    setRows(current.replacements);
    return current;
  }, [initialOrder.id]);
  const run = React.useCallback(async (action: () => Promise<unknown>): Promise<boolean> => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    let completed = false;
    try {
      await action();
      const current = await refresh();
      completed = true;
      if (current.replacements.length === 0) {
        onClose(current.order);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível concluir a etapa fiscal.');
      // A timeout does not prove failure. Reload the persisted facts before offering another action.
      try {
        const current = await refresh();
        if (current.replacements.length === 0) {
          completed = true;
          onClose(current.order);
        }
      } catch { /* Keep the last facts and the error; never infer authorization. */ }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
    return completed;
  }, [onClose, refresh]);

  useEffect(() => {
    if (!autoContinue || busyRef.current || estorno || emission || !rows.length) return;

    const awaiting = rows.filter((row) => row.status === 'awaiting_reversal');
    const nextCancellation = awaiting.find((row) => !row.reversalConfirmed && row.action === 'cancel');
    if (nextCancellation && nextCancellation.environment === 2) {
      const key = `cancel:${nextCancellation.id}`;
      if (autoStepsRef.current.has(key)) return;
      autoStepsRef.current.add(key);
      const toastId = toast.loading('Cancelando fiscalmente a NF anterior antes da nova emissão.');
      void run(() => cancelFiscalDocumentForOrderEdit({
        documentId: nextCancellation.sourceDocument.id,
        orderId: initialOrder.id!,
        replacementId: nextCancellation.id,
        environment: nextCancellation.environment,
      })).then((completed) => toast.update(toastId, {
        render: completed
          ? 'Cancelamento fiscal confirmado. Continuando para a nova emissão.'
          : 'Cancelamento fiscal ainda não confirmado. Consulte a situação da NF antes de repetir.',
        type: completed ? 'success' : 'warning',
        isLoading: false,
        autoClose: 5000,
      }));
      return;
    }

    const nextEstorno = awaiting.find((row) => !row.reversalConfirmed && row.action === 'estorno');
    if (nextEstorno) {
      const key = `estorno:${nextEstorno.id}`;
      if (autoStepsRef.current.has(key)) return;
      autoStepsRef.current.add(key);
      toast.info('Revise e autorize o estorno fiscal da NF anterior; depois será emitida a nova NF.');
      setEstorno(nextEstorno);
      return;
    }

    if (awaiting.length && rows.every((row) => row.reversalConfirmed)) {
      const key = `finalize:${awaiting.map((row) => row.id).sort().join(',')}`;
      if (autoStepsRef.current.has(key)) return;
      autoStepsRef.current.add(key);
      const toastId = toast.loading('Reversão fiscal confirmada. Aplicando a edição antes da nova emissão.');
      void run(() => finalizeFiscalOrderEdit({
        orderId: initialOrder.id!,
        replacementId: awaiting[0].id,
      })).then((completed) => toast.update(toastId, {
        render: completed
          ? 'Edição aplicada. Preparando a nova NF.'
          : 'Não foi possível confirmar a aplicação da edição. Confira a situação fiscal antes de repetir.',
        type: completed ? 'success' : 'warning',
        isLoading: false,
        autoClose: 5000,
      }));
      return;
    }

    const nextReissue = rows.find(
      (row) =>
        row.reversalConfirmed &&
        ['ready_to_reissue', 'replacement_prepared'].includes(row.status)
    );
    if (!nextReissue) return;
    const key = `emission:${nextReissue.id}`;
    if (autoStepsRef.current.has(key)) return;
    autoStepsRef.current.add(key);
    const toastId = toast.loading('Reversão fiscal concluída. Preparando a nova NF no ambiente original.');
    void run(async () => {
      if (!nextReissue.replacementDocumentId)
        clearFiscalEmissionRequest(initialOrder.id!, nextReissue.environment);
      const preparedOrder = await prepareOrderFiscalSnapshotForEmission(order, nextReissue.environment);
      setOrder(preparedOrder);
      setEmission(nextReissue);
    }).then((completed) => toast.update(toastId, {
      render: completed
        ? 'Nova emissão preparada no ambiente da nota anterior.'
        : 'Não foi possível preparar a nova NF. A pendência fiscal continua disponível para retomada.',
      type: completed ? 'success' : 'warning',
      isLoading: false,
      autoClose: 5000,
    }));
  }, [autoContinue, emission, estorno, initialOrder.id, order, rows, run]);

  const awaitingEdit = rows.some((row) => row.status === 'awaiting_reversal');
  const canApply = awaitingEdit && rows.every((row) => row.reversalConfirmed);
  const buttonClass = 'rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-600';

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-labelledby="fiscal-continuation-title">
      <section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 text-slate-900 shadow-2xl dark:bg-slate-900 dark:text-slate-100">
        <h2 id="fiscal-continuation-title" className="text-lg font-bold">Concluir substituição fiscal</h2>
        <p className="mt-2 text-sm">
          {rows.length === 0
            ? 'Substituição concluída. A nova nota está vinculada à original e o histórico fiscal foi preservado.'
            : awaitingEdit
              ? 'A proposta de edição está salva. Após confirmar a reversão integral da nota original, aplique as alterações ao pedido e confira a nova emissão.'
              : 'As alterações foram aplicadas ao pedido. Confira o XML e transmita a nova nota no mesmo ambiente da original.'}
        </p>
        <p className="mt-2 text-sm text-slate-500">O pedido permanece agendado. Fechar esta janela mantém a pendência disponível para retomada.</p>
        <ul className="my-5 space-y-4">
          {rows.map((row) => (
            <li key={row.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <h3 className="font-semibold">{row.sourceDocument.modelo === '65' ? 'NFC-e' : 'NF-e'} #{row.sourceDocument.numero_nfe} · {row.environment === 2 ? 'Homologação' : 'Produção'}</h3>
              <p className="my-2 text-sm">
                {row.reversalConfirmed
                  ? row.status === 'awaiting_reversal' ? 'Reversão confirmada. Aguardando aplicação da edição.' : 'Reversão confirmada e pedido atualizado. Nova emissão pendente.'
                  : row.action === 'estorno' ? 'Estorno integral preparado. Revise tributos, referência e período de apuração antes de transmitir.' : 'Cancelamento da nota original pendente de confirmação.'}
              </p>
              <div className="flex flex-wrap gap-2">
                {!row.reversalConfirmed && row.action === 'cancel' && (
                  <button type="button" disabled={busy} className={buttonClass} onClick={() => {
                    toast.info('Cancelando fiscalmente a NF anterior antes de preparar a nova emissão.');
                    void run(() => cancelFiscalDocumentForOrderEdit({ documentId: row.sourceDocument.id, orderId: initialOrder.id!, replacementId: row.id, environment: row.environment }));
                  }}>
                    Cancelar original em {row.environment === 1 ? 'Produção' : 'Homologação'}
                  </button>
                )}
                {!row.reversalConfirmed && row.action === 'estorno' && (
                  <button type="button" disabled={busy} className={buttonClass} onClick={() => {
                    toast.info('Revise o estorno fiscal da NF anterior; a nova emissão vem depois da confirmação.');
                    setEstorno(row);
                  }}>Revisar estorno integral</button>
                )}
                {!row.reversalConfirmed && row.action === 'cancel' && (
                  <button type="button" disabled={busy} className={buttonClass} onClick={() => void run(() => consultOrderEditOriginal(row.sourceDocument.id))}>Consultar cancelamento na SEFAZ</button>
                )}
                {!awaitingEdit && row.reversalConfirmed && (
                  <button
                    type="button"
                    disabled={busy}
                    className={buttonClass}
                    onClick={() =>
                      void run(async () => {
                        toast.info('Preparando a nova NF no mesmo ambiente da nota anterior.');
                        if (!row.replacementDocumentId) {
                          clearFiscalEmissionRequest(initialOrder.id!, row.environment);
                        }
                        const preparedOrder = await prepareOrderFiscalSnapshotForEmission(
                          order,
                          row.environment
                        );
                        setOrder(preparedOrder);
                        setEmission(row);
                      })
                    }
                  >
                    {row.replacementDocumentId ? 'Retomar nova emissão' : 'Conferir e emitir nova nota'}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
        {error && <p role="alert" className="my-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200">{error}</p>}
        <footer className="flex flex-wrap justify-end gap-2">
          <button type="button" disabled={busy} className={buttonClass} onClick={() => onClose(order)}>{rows.length ? 'Fechar e retomar depois' : 'Concluir'}</button>
          {rows.length > 0 && <button type="button" disabled={busy} className={buttonClass} onClick={() => void run(async () => {})}>Atualizar situação</button>}
          {canApply && <button type="button" disabled={busy} className={`${buttonClass} bg-blue-600 text-white`} onClick={() => {
            toast.info('Reversão fiscal confirmada. Aplicando as alterações antes de emitir a nova NF.');
            void run(() => finalizeFiscalOrderEdit({ orderId: initialOrder.id!, replacementId: rows[0].id }));
          }}>Aplicar alterações ao pedido</button>}
        </footer>
        {busy && <p role="status" className="mt-3 text-sm">Conferindo a etapa fiscal…</p>}
      </section>
      {estorno && <NfeOperationDraftModal sourceDocument={estorno.sourceDocument} initialDraftId={estorno.draftId} mode="estorno" onClose={() => { setEstorno(null); void run(async () => {}); }} onAuthorized={() => { setEstorno(null); void run(async () => {}); }} />}
      {emission && (
        <NfeEmissionModal
          isOpen
          order={order}
          initialEnvironment={emission.environment}
          onClose={() => {
            setEmission(null);
            void run(async () => {});
          }}
          onSuccess={async () => {
            setEmission(null);
            await run(async () => {});
          }}
        />
      )}
    </div>
  );
}
