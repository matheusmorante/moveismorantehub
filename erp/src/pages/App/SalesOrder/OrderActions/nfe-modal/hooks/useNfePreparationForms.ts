import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import type Order from '@/pages/types/order.type';
import type { FiscalAcquisitionPurpose } from '@/pages/types/order.type';
import { fetchOrderById, updateOrder } from '@/pages/utils/orderHistoryService';
import { nfeAcquisitionPurposeFormSchema, nfeEmissionDraftFormSchema } from '../../../../../../../../shared-utils/nfeEmissionFormValidation';
import { withTimeout } from '../../../../../../../../shared-utils/withTimeout';
import type { NfeItemWithFiscal } from '../NfeItemsSection';
import { buildNfeDraftChanges } from '../services/nfeDraftService';

interface Props {
  order: Order | null;
  environment: 1 | 2;
  operatorId?: string;
  canOperateFiscal: boolean;
  acquisitionPurpose: FiscalAcquisitionPurpose | null;
  nfeItems: NfeItemWithFiscal[];
  recipientTaxId: string;
  isLoadingFiscalData: boolean;
  onPurposeSaved: (purpose: FiscalAcquisitionPurpose) => void;
  isFiscalOperationActive: () => boolean;
}

/** Compare the submitted fiscal fields, independently of JSON object key order. */
function matchesSavedFields(actual: unknown, expected: unknown): boolean {
  if (Array.isArray(expected)) return Array.isArray(actual) && actual.length === expected.length && expected.every((value, index) => matchesSavedFields(actual[index], value));
  if (expected && typeof expected === 'object') {
    if (!actual || typeof actual !== 'object') return false;
    return Object.entries(expected).every(([key, value]) => value === undefined || matchesSavedFields((actual as Record<string, unknown>)[key], value));
  }
  return Object.is(actual, expected);
}

export function useNfePreparationForms({ order, environment, operatorId, canOperateFiscal, acquisitionPurpose, nfeItems, recipientTaxId, isLoadingFiscalData, onPurposeSaved, isFiscalOperationActive }: Props) {
  const ownerRef = useRef({ order, environment, operatorId, canOperateFiscal, pending: 0, purposes: 0, error: null as string | null, blocked: false });
  if (ownerRef.current.order?.id !== order?.id || ownerRef.current.environment !== environment || ownerRef.current.operatorId !== operatorId || ownerRef.current.canOperateFiscal !== canOperateFiscal) {
    ownerRef.current = { order, environment, operatorId, canOperateFiscal, pending: 0, purposes: 0, error: null, blocked: false };
  }
  const owner = ownerRef.current;
  const environmentKey = environment === 1 ? '1' : '2';
  const originalDraftRef = useRef({
    orderId: order?.id,
    environment,
    draft: order?.nfeDraft?.[environmentKey],
  });
  if (originalDraftRef.current.orderId !== order?.id || originalDraftRef.current.environment !== environment) {
    originalDraftRef.current = {
      orderId: order?.id,
      environment,
      draft: order?.nfeDraft?.[environmentKey],
    };
  }
  const queue = useRef<Promise<void>>(Promise.resolve());
  const [feedback, setFeedback] = useState({ owner, pending: 0, purposes: 0, error: null as string | null, blocked: false });
  useEffect(() => () => { ownerRef.current = { ...ownerRef.current }; }, []);
  const purposeForm = useZodForm(nfeAcquisitionPurposeFormSchema, { orderId: order?.id || '', purpose: acquisitionPurpose || 'use_consumption' });
  const draftForm = useZodForm(nfeEmissionDraftFormSchema, { order: order as Order, environment, recipientTaxId, nfeItems });
  const isCurrent = () => ownerRef.current === owner;
  const publish = () => {
    if (isCurrent()) setFeedback({ owner, pending: owner.pending, purposes: owner.purposes, error: owner.error, blocked: owner.blocked });
  };
  const report = (message: string) => {
    if (!isCurrent()) return;
    owner.error = message;
    publish();
    toast.error(message);
  };
  const enqueue = (purpose: boolean, operation: () => Promise<unknown>) => {
    if (isFiscalOperationActive()) { report('Aguarde a conclusão da operação fiscal antes de salvar outros dados.'); return Promise.resolve(); }
    if (owner.blocked) { report(owner.error || 'Reabra a emissão para conferir o pedido atualizado.'); return Promise.resolve(); }
    if (!canOperateFiscal) { report('Seu perfil não pode salvar dados fiscais.'); return Promise.resolve(); }
    owner.pending++;
    if (purpose) owner.purposes++;
    publish();
    const pending = queue.current.then(async () => {
      if (!isCurrent() || owner.blocked) return;
      if (isFiscalOperationActive()) { report('Aguarde a conclusão da operação fiscal antes de salvar outros dados.'); return; }
      owner.error = null;
      publish();
      await operation();
    }).catch((error: unknown) => report(error instanceof Error ? error.message : 'Não foi possível confirmar o salvamento fiscal.'))
      .finally(() => { owner.pending--; if (purpose) owner.purposes--; publish(); });
    queue.current = pending;
    return pending;
  };
  const persist = async (source: Order, changes: Partial<Order>, expected: unknown, failureMessage: string) => {
    // A timeout cannot prove rollback. Stop queued writes until the operator reloads.
    const written = await withTimeout<boolean | null>(updateOrder(String(source.id), changes, source, source.updatedAt, { metadataOnly: true }).then(() => true, () => false), 30_000, null, 'nfe:salvar-preparacao');
    if (!isCurrent()) return false;
    if (written === null) {
      owner.blocked = true;
      throw new Error('Não foi possível confirmar o salvamento fiscal no prazo. Reabra a emissão para conferir o pedido antes de continuar.');
    }
    const saved = await withTimeout(fetchOrderById(String(source.id)).catch(() => null), 15_000, null, 'nfe:conferir-preparacao');
    if (!isCurrent()) return false;
    if (!saved || saved.id !== source.id || !Array.isArray(saved.items) || !saved.updatedAt || !Number.isFinite(Date.parse(saved.updatedAt))) {
      owner.blocked = true;
      throw new Error('O salvamento fiscal não pôde ser conferido. Reabra a emissão para atualizar o pedido.');
    }
    owner.order = saved;
    if (!matchesSavedFields(saved, expected)) throw new Error(failureMessage);
    return true;
  };
  const discardNfeDraft = () => {
    owner.pending++;
    publish();
    const pending = queue.current.then(async () => {
      if (!isCurrent() || !owner.order?.id) return false;
      if (owner.blocked) {
        report('Não foi possível confirmar o rascunho fiscal. Reabra a emissão para conferir o pedido antes de continuar.');
        return false;
      }

      const originalDraft = originalDraftRef.current.draft;
      const localDraft = owner.order.nfeDraft?.[environmentKey];
      const originalFields = originalDraft as Record<string, unknown> | undefined;
      const localFields = localDraft as Record<string, unknown> | undefined;
      const changedFields = [...new Set([
        ...Object.keys(originalFields || {}),
        ...Object.keys(localFields || {}),
      ])].filter((key) =>
        !matchesSavedFields(localFields?.[key], originalFields?.[key]) ||
        !matchesSavedFields(originalFields?.[key], localFields?.[key])
      );
      if (changedFields.length === 0) {
        return true;
      }

      const latest = await withTimeout(
        fetchOrderById(String(owner.order.id)).catch(() => null),
        15_000,
        null,
        'nfe:recarregar-rascunho-para-descartar'
      );
      if (!isCurrent()) return false;
      if (!latest || latest.id !== owner.order.id || !latest.updatedAt) {
        throw new Error('Não foi possível atualizar o pedido para desfazer os dados fiscais do modal.');
      }

      owner.order = latest;
      const currentDraft = latest.nfeDraft?.[environmentKey];
      const currentFields = currentDraft as Record<string, unknown> | undefined;
      const restoredFields = { ...currentFields };
      let restoredAnyField = false;
      for (const key of changedFields) {
        const isStillOurs =
          matchesSavedFields(currentFields?.[key], localFields?.[key]) &&
          matchesSavedFields(localFields?.[key], currentFields?.[key]);
        if (!isStillOurs) continue;
        if (originalFields && Object.prototype.hasOwnProperty.call(originalFields, key)) {
          restoredFields[key] = originalFields[key];
        } else {
          delete restoredFields[key];
        }
        restoredAnyField = true;
      }
      if (!restoredAnyField) return true;

      const nfeDraft = { ...latest.nfeDraft };
      if (Object.keys(restoredFields).length > 0) {
        nfeDraft[environmentKey] = restoredFields as NonNullable<Order['nfeDraft']>['1'];
      } else {
        delete nfeDraft[environmentKey];
      }
      const changes = { nfeDraft };
      return persist(
        latest,
        changes,
        changes,
        'Não foi possível desfazer os dados fiscais do modal. Reabra a emissão para conferir o pedido.'
      );
    }).catch((error: unknown) => {
      report(error instanceof Error ? error.message : 'Não foi possível desfazer os dados fiscais do modal.');
      return false;
    }).finally(() => {
      owner.pending--;
      publish();
    });
    queue.current = pending.then(() => undefined);
    return pending;
  };
  const handleAcquisitionPurposeChange = (purpose: FiscalAcquisitionPurpose) => {
    if (!order?.id) { report('Salve o pedido antes de registrar a finalidade da compra.'); return Promise.resolve(); }
    return enqueue(true, () => purposeForm.validateAndRun({ orderId: String(order.id), purpose }, async (values) => {
      if (!isCurrent() || !owner.order || values.orderId !== String(owner.order.id)) return;
      const changes = buildNfeDraftChanges(owner.order, recipientTaxId, nfeItems, environment, values.purpose);
      if (await persist(owner.order, changes, { nfeDraft: changes.nfeDraft }, 'Não foi possível salvar a finalidade da compra no rascunho fiscal.')) onPurposeSaved(values.purpose);
    }, (errors) => report(Object.values(flattenFormErrors(errors))[0])));
  };
  const handleSaveDraft = () => {
    if (!order?.id || isLoadingFiscalData) return Promise.resolve();
    return enqueue(false, () => draftForm.validateAndRun({ order: owner.order as Order, environment, recipientTaxId, nfeItems }, async (values) => {
      if (!isCurrent() || values.order.id !== owner.order?.id) return;
      const changes = buildNfeDraftChanges(values.order, values.recipientTaxId, values.nfeItems, values.environment, acquisitionPurpose);
      const expected = {
        nfeDraft: changes.nfeDraft,
      };
      await persist(values.order, changes, expected, 'Não foi possível salvar os dados fiscais do rascunho no pedido.');
    }, (errors) => report(Object.values(flattenFormErrors(errors))[0])));
  };
  const currentFeedback = feedback.owner === owner ? feedback : { pending: 0, purposes: 0, error: null, blocked: false };
  return {
    handleAcquisitionPurposeChange, handleSaveDraft,
    discardNfeDraft,
    isSavingAcquisitionPurpose: currentFeedback.purposes > 0,
    isSavingPreparation: currentFeedback.pending > 0,
    preparationSaveError: currentFeedback.error,
    preparationSaveBlocked: currentFeedback.blocked,
    canUsePreparation: () => isCurrent() && owner.pending === 0 && !owner.error && !owner.blocked,
  };
}
