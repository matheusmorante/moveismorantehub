import type { MutableRefObject } from 'react';
import { toast } from 'react-toastify';
import { flattenFormErrors } from '@/hooks/useZodForm';
import { saveInboundInvoice } from '@/pages/utils/inboundNfe/inboundInvoicesService';
import type { InboundInvoice, InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import {
  findInboundSupplierItemMappings,
  saveInboundSupplierItemMapping,
} from '@/pages/utils/inboundNfe/services/inboundSupplierItemMappingsService';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';

export interface MappingModalContextSnapshot {
  initialInvoice: InboundInvoice | null;
  isOpen: boolean;
}

interface SavedMappingComponentRow {
  productId?: unknown;
  variationId?: unknown;
  quantityMultiplier?: unknown;
  quantity_multiplier?: unknown;
}

export interface MappingPersistenceRuntime {
  inFlight: MutableRefObject<boolean>;
  activeRef: MutableRefObject<boolean>;
  uncertain: MutableRefObject<Set<string>>;
  context: MutableRefObject<MappingModalContextSnapshot>;
  reviewBusy: boolean;
  setSaving: (saving: boolean) => void;
  setErrorMessage: (message: string) => void;
  setInvoice: (invoice: InboundInvoice) => void;
  onSaveSuccess: () => void | Promise<void>;
  onSaveUncertain?: () => void | Promise<void>;
  validateAndRun: (
    data: InboundInvoice,
    onValid: (values: Record<string, unknown>) => Promise<boolean>,
    onInvalid: (errors: Record<string, unknown>) => void
  ) => Promise<unknown>;
}

const refreshInvoiceListSafely = async (
  runtime: MappingPersistenceRuntime,
  submittedContext: MappingModalContextSnapshot,
  successPrefix: string
) => {
  try {
    const refreshed = await withTimeout(
      Promise.resolve(runtime.onSaveSuccess()).then(() => true),
      15_000,
      false,
      'entrada:atualizar-lista'
    );
    if (!refreshed && runtime.activeRef.current && runtime.context.current === submittedContext) {
      runtime.setErrorMessage(
        `${successPrefix} A atualização da lista demorou demais; recarregue a lista.`
      );
    }
  } catch (refreshError) {
    console.warn('Falha ao atualizar lista de notas fiscais após salvar vínculo:', refreshError);
    if (runtime.activeRef.current && runtime.context.current === submittedContext) {
      runtime.setErrorMessage(`${successPrefix} Não foi possível atualizar a lista; recarregue a lista.`);
    }
  }
};

const notifyUncertainSaveRefresh = async (
  runtime: MappingPersistenceRuntime,
  invoiceId: string
) => {
  runtime.uncertain.current.add(invoiceId);
  try {
    await withTimeout(
      Promise.resolve((runtime.onSaveUncertain || runtime.onSaveSuccess)()).then(() => true),
      15_000,
      false,
      'entrada:atualizar-lista-incerta'
    );
  } catch (refreshError) {
    console.warn('Falha ao atualizar lista após escrita incerta de vínculos:', refreshError);
  }
};

const resolveItemLinkMode = (
  item: InboundInvoiceItem
): 'single' | 'composition' | 'not_applicable' | 'unlinked' => {
  if (item.linkMode === 'composition') return 'composition';
  if (item.linkMode === 'not_applicable') return 'not_applicable';
  if (item.linkMode === 'unlinked' || (!item.matchedProductId && !item.compositionLinks?.length)) {
    return 'unlinked';
  }
  return 'single';
};

export async function persistInvoiceMappings(
  nextInvoice: InboundInvoice,
  runtime: MappingPersistenceRuntime
): Promise<boolean> {
  if (runtime.inFlight.current || runtime.reviewBusy) return false;
  if (runtime.uncertain.current.has(nextInvoice.id)) {
    runtime.setErrorMessage(
      'Há uma alteração sem confirmação nesta nota. Recarregue e confira os vínculos antes de repetir.'
    );
    return false;
  }

  runtime.inFlight.current = true;
  runtime.setSaving(true);
  runtime.setErrorMessage('');
  const submittedContext = runtime.context.current;
  let expired = false;
  let writing = false;
  const assertCurrent = () => {
    if (expired || !runtime.activeRef.current || runtime.context.current !== submittedContext) {
      throw new Error('A nota mudou. Confira o resultado antes de repetir.');
    }
  };

  try {
    return Boolean(
      await runtime.validateAndRun(
        { ...nextInvoice, items: nextInvoice.items.map((item) => ({ ...item })) },
        async (values) => {
          assertCurrent();
          const parsedInvoice = values as unknown as InboundInvoice;
          writing = true;
          const saved = await withTimeout(
            saveInboundInvoice(parsedInvoice, {
              requireConfirmation: true,
              mappingOnly: true,
              assertCurrent,
            }),
            30_000,
            null,
            'entrada:salvar-mapeamentos'
          );
          assertCurrent();
          if (!saved || saved.id !== parsedInvoice.id) {
            throw new Error('A alteração do vínculo não foi confirmada.');
          }
          runtime.setInvoice(saved);
          await refreshInvoiceListSafely(runtime, submittedContext, 'Vínculos salvos.');
          return true;
        },
        (errors) =>
          runtime.setErrorMessage(
            Object.values(flattenFormErrors(errors as never))[0] || 'Confira os vínculos.'
          )
      )
    );
  } catch (error) {
    if (writing) await notifyUncertainSaveRefresh(runtime, nextInvoice.id);
    if (runtime.activeRef.current && runtime.context.current === submittedContext) {
      const message = `${error instanceof Error ? error.message : 'Não foi possível salvar o vínculo.'} ${writing ? 'Confira a nota antes de repetir.' : ''}`;
      runtime.setErrorMessage(message);
      toast.error(message);
    }
    return false;
  } finally {
    expired = true;
    runtime.inFlight.current = false;
    if (runtime.activeRef.current) runtime.setSaving(false);
  }
}

export async function persistGlobalSupplierItemMapping(
  nextInvoice: InboundInvoice,
  itemNumber: number,
  isSalvadosSupplier: boolean,
  runtime: MappingPersistenceRuntime
): Promise<boolean> {
  const item = nextInvoice.items.find((candidate) => candidate.itemNumber === itemNumber);
  if (!item || !nextInvoice.supplierId || !item.productCode.trim()) {
    runtime.setErrorMessage(
      'Selecione um fornecedor e confirme o código completo do item antes de salvar o vínculo.'
    );
    return false;
  }
  if (isSalvadosSupplier || runtime.inFlight.current || runtime.reviewBusy) return false;
  if (runtime.uncertain.current.has(nextInvoice.id)) {
    runtime.setErrorMessage(
      'Há uma alteração sem confirmação. Recarregue e confira o vínculo antes de repetir.'
    );
    return false;
  }

  const linkMode = resolveItemLinkMode(item);
  if (linkMode === 'composition' && !item.compositionLinks?.length) {
    runtime.setErrorMessage('Adicione ao menos um componente antes de salvar o modo Composto.');
    return false;
  }

  runtime.inFlight.current = true;
  runtime.setSaving(true);
  runtime.setErrorMessage('');
  const submittedContext = runtime.context.current;
  let expired = false;
  let writing = false;
  const assertCurrent = () => {
    if (expired || !runtime.activeRef.current || runtime.context.current !== submittedContext) {
      throw new Error('A nota mudou. Confira o vínculo antes de repetir.');
    }
  };

  try {
    const validated = await runtime.validateAndRun(
      { ...nextInvoice, items: nextInvoice.items.map((candidate) => ({ ...candidate })) },
      async (values) => {
        assertCurrent();
        const parsed = values as unknown as InboundInvoice;
        writing = true;
        await withTimeout(
          saveInboundSupplierItemMapping({
            supplierId: parsed.supplierId!,
            supplierProductCode: item.productCode,
            supplierDescription: item.productDescription,
            linkMode,
            productId: linkMode === 'single' ? item.matchedProductId : undefined,
            variationId: linkMode === 'single' ? item.matchedVariationId : undefined,
            components:
              linkMode === 'composition'
                ? (item.compositionLinks || []).map((component) => ({
                    productId: component.productId,
                    variationId: component.variationId,
                    quantityMultiplier: component.quantityMultiplier,
                  }))
                : [],
          }),
          20_000,
          null,
          'entrada:salvar-vinculo-global'
        );
        assertCurrent();
        const confirmed = await withTimeout(
          findInboundSupplierItemMappings(parsed.supplierId!, [item.productCode]),
          15_000,
          null,
          'entrada:confirmar-vinculo-global'
        );
        const saved = confirmed?.get(item.productCode.trim().toLocaleUpperCase('pt-BR'));
        if (!saved || saved.link_mode !== linkMode) {
          throw new Error('O vínculo global não corresponde ao modo escolhido.');
        }
        if (
          linkMode === 'single' &&
          (saved.product_id !== item.matchedProductId ||
            (saved.variation_id || undefined) !== (item.matchedVariationId || undefined))
        ) {
          throw new Error('O vínculo global não corresponde ao produto escolhido.');
        }
        if (linkMode === 'composition') {
          const components = (saved.components || []) as SavedMappingComponentRow[];
          if (
            components.length !== (item.compositionLinks || []).length ||
            components.some((component, index) => {
              const expected = item.compositionLinks![index];
              return (
                component.productId !== expected.productId ||
                (component.variationId || undefined) !== (expected.variationId || undefined) ||
                Number(component.quantityMultiplier ?? component.quantity_multiplier) !==
                  Number(expected.quantityMultiplier)
              );
            })
          ) {
            throw new Error('A composição global não corresponde aos componentes escolhidos.');
          }
        }
        assertCurrent();
        runtime.setInvoice(nextInvoice);
        await refreshInvoiceListSafely(runtime, submittedContext, 'Vínculo global salvo.');
        return true;
      },
      (errors) =>
        runtime.setErrorMessage(
          Object.values(flattenFormErrors(errors as never))[0] || 'Confira os vínculos.'
        )
    );
    return Boolean(validated);
  } catch (error) {
    if (writing) await notifyUncertainSaveRefresh(runtime, nextInvoice.id);
    const message =
      error instanceof Error ? error.message : 'Não foi possível salvar o vínculo global.';
    if (runtime.activeRef.current && runtime.context.current === submittedContext) {
      runtime.setErrorMessage(`${message} ${writing ? 'Confira a nota antes de repetir.' : ''}`);
      toast.error(message);
    }
    return false;
  } finally {
    expired = true;
    runtime.inFlight.current = false;
    if (runtime.activeRef.current) runtime.setSaving(false);
  }
}
