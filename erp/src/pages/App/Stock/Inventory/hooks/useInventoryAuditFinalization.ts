import { useZodForm, flattenFormErrors } from '@/hooks/useZodForm';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { toast } from 'react-toastify';
import type Person from '@/pages/types/person.type';
import type { AuditItem, InventoryAuditSession } from '../types/inventoryAudit.types';
import { buildInventoryAuditObservation } from '../domain/inventoryAuditObservation';
import { getEmployeeDisplayName } from '../utils/employeeDisplayName';
import { finalizeWebInventory } from '../services/finalizeWebInventory';
import { getInventorySubmission } from '../services/inventoryOutbox';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import { inventoryAuditCompletionSchema } from '../../../../../../../shared-utils/inventoryAuditFormSchemas';
import { prepareSupplierStageReviewItems } from '../../../../../../../shared-utils/inventorySupplierStages';

export interface InventoryAuditWorkflowOwner {
  key: string;
  open: boolean;
  draftUncertain: boolean;
  finalized: boolean;
}

export interface InventoryAuditWorkflowScopeConfig {
  name: string;
  responsibleId: string;
  responsibleName?: string;
  hasStages?: boolean;
  scopeType?: string;
  supplierId?: string;
}

export interface InventoryAuditWorkflowDraft {
  id?: string;
  code?: string;
  markerMoveId?: string;
  date?: string;
}

interface InventoryAuditFinalizationDependencies {
  renderOwner: InventoryAuditWorkflowOwner;
  readyOwner: MutableRefObject<InventoryAuditWorkflowOwner | null>;
  uncertainCompletion: MutableRefObject<InventoryAuditWorkflowOwner | null>;
  owner: MutableRefObject<InventoryAuditWorkflowOwner>;
  isCurrent: (captured: InventoryAuditWorkflowOwner) => boolean;
  beginOperation: () => InventoryAuditWorkflowOwner | null;
  finishOperation: (captured: InventoryAuditWorkflowOwner) => void;
  scopeConfig: InventoryAuditWorkflowScopeConfig | null;
  frozenSubmissionRef: MutableRefObject<boolean>;
  draftRef: MutableRefObject<InventoryAuditWorkflowDraft>;
  flushLocalWrites: () => Promise<void>;
  latestItemsRef: MutableRefObject<AuditItem[]>;
  employees: Person[];
  editingSession?: InventoryAuditSession | null;
  setOperationError: Dispatch<SetStateAction<string>>;
  onClose: () => void;
}

type InventoryAuditAdjustment = AuditItem & {
  reconciledExpected: number;
  difference: number;
};

export const useInventoryAuditFinalization = ({
  renderOwner,
  readyOwner,
  uncertainCompletion,
  owner,
  isCurrent,
  beginOperation,
  finishOperation,
  scopeConfig,
  frozenSubmissionRef,
  draftRef,
  flushLocalWrites,
  latestItemsRef,
  employees,
  editingSession,
  setOperationError,
  onClose,
}: InventoryAuditFinalizationDependencies) => {
  const { validateAndRun: validateCompletion } = useZodForm(inventoryAuditCompletionSchema, {
    id: '', code: '', items: [], adjustments: [],
  });

  return async (itemsWithAdjustment: InventoryAuditAdjustment[]) => {
    if (!isCurrent(renderOwner) || readyOwner.current !== renderOwner || renderOwner.finalized) return false;
    if (!scopeConfig || uncertainCompletion.current === owner.current) {
      setOperationError('Confira a submissão salva e reabra o inventário antes de tentar concluir.'); return false;
    }
    const captured = beginOperation();
    if (!captured) return false;
    const previouslyFrozen = frozenSubmissionRef.current;
    frozenSubmissionRef.current = true;
    let attempted = false, timedOut = false, succeeded = false;
    try {
      await flushLocalWrites();
      if (!isCurrent(captured)) return false;
      return await validateCompletion({
        id: draftRef.current.id || '', code: draftRef.current.code || '',
        items: prepareSupplierStageReviewItems(latestItemsRef.current, Boolean(scopeConfig.hasStages)),
        adjustments: itemsWithAdjustment.map((item) => ({ ...item, physicalCount: item.physicalCount! })),
      }, async (values) => {
      if (!isCurrent(captured)) return false;
      const auditId = values.id;
      const code = values.code;
      const responsible = employees.find(
        (employee) => String(employee.id) === scopeConfig.responsibleId
      );
      const auditObservation = buildInventoryAuditObservation({
        code,
        items: values.items,
        responsibleName: responsible
          ? getEmployeeDisplayName(responsible)
          : scopeConfig.responsibleName || editingSession?.responsibleName || '',
        scopeConfig,
      });
      attempted = true;
      const confirmed = await withTimeout(finalizeWebInventory(auditId, code, auditObservation, values.adjustments).then(() => true),
        30_000, false, 'inventario:concluir');
      if (!isCurrent(captured)) return false;
      if (!confirmed) { timedOut = true; throw new Error('Conclusão sem confirmação.'); }
      succeeded = true;
      captured.finalized = true;

      toast.success(
        `Inventário #${code} finalizado! ${values.items.length} produto(s) contados e ${values.adjustments.length} ajuste(s) lançados no estoque. ✨`
      );
      onClose();
      return true;
      }, (errors) => {
        if (!isCurrent(captured)) return;
        const message = Object.values(flattenFormErrors(errors))[0] || 'Confira as contagens do inventário.';
        setOperationError(message); toast.error(message);
      });
    } catch {
      if (!isCurrent(captured)) return false;
      const lookup = attempted && draftRef.current.id ? await withTimeout(getInventorySubmission(draftRef.current.id)
        .then((pending) => ({ pending })).catch(() => null), 5_000, null, 'inventario:conferir-submissao') : { pending: null };
      if (!isCurrent(captured)) return false;
      frozenSubmissionRef.current = previouslyFrozen || timedOut || !lookup || Boolean(lookup.pending);
      if (timedOut || !lookup) uncertainCompletion.current = captured;
      const message = timedOut || !lookup ? 'A conclusão não foi confirmada. Confira a submissão salva e reabra o inventário antes de repetir.'
        : lookup.pending
          ? 'Submissão salva neste navegador. Retome o inventário para tentar enviar novamente.'
          : 'Erro ao processar as movimentações de inventário.';
      setOperationError(message); toast.error(message); return false;
    } finally {
      if (isCurrent(captured) && !attempted && !succeeded) frozenSubmissionRef.current = previouslyFrozen;
      finishOperation(captured);
    }
  };
};
