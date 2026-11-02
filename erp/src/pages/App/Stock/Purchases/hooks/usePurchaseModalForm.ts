import { useState, useEffect, useRef, useCallback } from 'react';
import Purchase from '../../../../types/purchase.type';
import { savePurchase, updatePurchase } from '../../../../utils/purchaseService';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import {
  getPurchaseConfirmationBlockReasons,
  purchaseFormSchema,
} from '../../../../../../../shared-utils/purchaseFormSchemas';
import { usePurchaseSubscriptions } from './usePurchaseSubscriptions';
import { usePurchaseItemsManager } from './usePurchaseItemsManager';
import { usePurchaseDraftSync } from './usePurchaseDraftSync';

export interface UsePurchaseModalFormProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly activePurchase?: Purchase | null;
  readonly attachments: readonly string[];
  readonly setAttachments: (attachments: readonly string[]) => void;
}

/**
 * Hook orquestrador do modal de pedido de compra no ERP.
 * Aplica princípios de responsabilidade única coordenando sub-hooks modulares:
 * - `usePurchaseSubscriptions`: tempo real de fornecedores/produtos e tecla Escape.
 * - `usePurchaseItemsManager`: itens, cálculos de IPI/Frete e validação por fornecedor.
 * - `usePurchaseDraftSync`: persistência e auto-save atômico com debounce de 3000ms.
 */
export function usePurchaseModalForm({
  isOpen,
  onClose,
  activePurchase,
  attachments,
  setAttachments,
}: UsePurchaseModalFormProps) {
  // Campos do cabeçalho
  const [selectedSupplierId, setSelectedSupplierIdState] = useState('');
  const [purchaseDate, setPurchaseDateState] = useState(new Date().toISOString().split('T')[0]);
  const [discountPercent, setDiscountPercentState] = useState(0);
  const [ipiPercent, setIpiPercentState] = useState(0);
  const [freightPercent, setFreightPercentState] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Controle de concorrência e finalização
  const actionRef = useRef(false);
  const completedRef = useRef(false);
  const initializedPurchaseKeyRef = useRef<string | null>(null);
  const activePurchaseRef = useRef(activePurchase);
  activePurchaseRef.current = activePurchase;

  const isDraftSession = !activePurchase?.id || activePurchase.status === 'draft';

  // Sub-hook de Assinaturas (Fornecedores e Produtos em tempo real + Escape)
  const closeRef = useRef<() => Promise<void>>(async () => {});
  const { suppliers, products } = usePurchaseSubscriptions({
    isOpen,
    onEscape: () => void closeRef.current(),
  });

  // Sub-hook de Itens e Custos
  const itemsManager = usePurchaseItemsManager({
    selectedSupplierId,
    setSelectedSupplierId: (id) => {
      draftSync.markDraftChanged();
      setSelectedSupplierIdState(id);
    },
    suppliers,
    products,
    discountPercent,
    ipiPercent,
    freightPercent,
    onItemsChange: () => draftSync.markDraftChanged(),
  });

  // Sub-hook de Rascunho e Auto-Save
  const draftSync = usePurchaseDraftSync({
    isOpen,
    isDraftSession,
    activePurchase,
    selectedSupplierId,
    purchaseDate,
    processedItems: itemsManager.processedItems,
    totalValue: itemsManager.totalValue,
    discountPercent,
    ipiPercent,
    freightPercent,
    attachments,
    suppliers,
    actionRef,
    completedRef,
  });

  // Inicialização e Reset ao abrir ou trocar a compra ativa
  useEffect(() => {
    if (!isOpen) {
      initializedPurchaseKeyRef.current = null;
      return;
    }

    const purchase = activePurchaseRef.current;
    const purchaseKey = purchase?.id || 'new-purchase';
    if (initializedPurchaseKeyRef.current === purchaseKey) return;
    initializedPurchaseKeyRef.current = purchaseKey;
    completedRef.current = false;
    actionRef.current = false;

    if (purchase) {
      setSelectedSupplierIdState(purchase.supplierId || '');
      setPurchaseDateState(
        purchase.date
          ? purchase.date.includes('T')
            ? purchase.date.split('T')[0]
            : purchase.date
          : new Date().toISOString().split('T')[0]
      );
      setDiscountPercentState(purchase.discountPercent || 0);
      setIpiPercentState(purchase.ipiPercent || 0);
      setFreightPercentState(purchase.freightPercent || 0);
      const initialAttachments = purchase.attachments || [];
      setAttachments(initialAttachments);
      itemsManager.setItems(purchase.items || []);
      draftSync.resetDraftState(purchase);
    } else {
      setSelectedSupplierIdState('');
      setPurchaseDateState(new Date().toISOString().split('T')[0]);
      setDiscountPercentState(0);
      setIpiPercentState(0);
      setFreightPercentState(0);
      setAttachments([]);
      itemsManager.setItems([]);
      draftSync.resetDraftState(null);
    }

    itemsManager.setValidationErrors({ supplier: false, items: false });

    return () => {
      initializedPurchaseKeyRef.current = null;
    };
  }, [isOpen, activePurchase?.id, setAttachments, draftSync.resetDraftState]);

  // Alteradores de cabeçalho marcando rascunho sujo
  const handleSelectedSupplierChange = useCallback((supplierId: string) => {
    draftSync.markDraftChanged();
    setSelectedSupplierIdState(supplierId);
  }, [draftSync]);

  const handlePurchaseDateChange = useCallback((date: string) => {
    draftSync.markDraftChanged();
    setPurchaseDateState(date);
  }, [draftSync]);

  const handleIpiPercentChange = useCallback((value: number) => {
    draftSync.markDraftChanged();
    setIpiPercentState(value);
  }, [draftSync]);

  const handleDiscountPercentChange = useCallback((value: number) => {
    draftSync.markDraftChanged();
    setDiscountPercentState(value);
  }, [draftSync]);

  const handleFreightPercentChange = useCallback((value: number) => {
    draftSync.markDraftChanged();
    setFreightPercentState(value);
  }, [draftSync]);

  // Formulário Zod de validação final
  const { validateAndRun: validatePurchase } = useZodForm(purchaseFormSchema, {
    supplierId: selectedSupplierId,
    supplierName: '',
    date: purchaseDate,
    status: 'ordered',
    items: [],
    totalValue: 0,
    discountPercent: 0,
  });

  // Fechamento / Cancelamento com garantia de persistência de rascunho pendente
  const handleCancelOrClose = async () => {
    if (actionRef.current || completedRef.current) return;
    actionRef.current = true;
    try {
      if (draftSync.autoSaveTimerRef.current !== null) {
        window.clearTimeout(draftSync.autoSaveTimerRef.current);
      }
      await draftSync.pendingDraftRef.current;
      if (isDraftSession && draftSync.hasDraftChangesRef.current) {
        try {
          const saved = await draftSync.persistDraft(draftSync.buildDraftPayload(), true);
          if (!saved) return;
          draftSync.hasDraftChangesRef.current = false;
          draftSync.setHasDraftChanges(false);
        } catch (err: unknown) {
          console.error('Erro ao salvar rascunho de compra:', err);
          toast.error('Não foi possível salvar o rascunho da compra.');
          return;
        }
      }
      completedRef.current = true;
      onClose();
    } finally {
      actionRef.current = false;
    }
  };
  closeRef.current = handleCancelOrClose;

  // Confirmação e salvamento do pedido de compra
  const handleSave = async () => {
    if (actionRef.current || completedRef.current) return;
    const validItems = itemsManager.processedItems.filter((item) => Boolean(item.productId && item.productId.trim()));
    const confirmationBlockReasons = getPurchaseConfirmationBlockReasons(
      selectedSupplierId,
      itemsManager.processedItems
    );
    if (confirmationBlockReasons.length > 0) {
      itemsManager.setValidationErrors({
        supplier: !selectedSupplierId,
        items: validItems.length === 0 || itemsManager.processedItems.some((item) => !item.productId?.trim()),
      });
      toast.error(confirmationBlockReasons.join(' '));
      return;
    }

    const supplier = suppliers.find((s) => s.id === selectedSupplierId);
    const status = activePurchase?.id && activePurchase.status !== 'draft'
      ? activePurchase.status
      : 'pending';

    actionRef.current = true;
    setIsSaving(true);
    try {
      if (draftSync.autoSaveTimerRef.current !== null) {
        window.clearTimeout(draftSync.autoSaveTimerRef.current);
      }
      await draftSync.pendingDraftRef.current;
      const purchasePayload: Purchase = {
        supplierId: selectedSupplierId,
        supplierName: supplier?.fullName || activePurchase?.supplierName || 'Fornecedor',
        date: new Date(purchaseDate).toISOString(),
        items: validItems,
        totalValue: itemsManager.totalValue,
        observation: '',
        status,
        invoiceNumber: activePurchase?.invoiceNumber || '',
        invoiceDate: activePurchase?.invoiceDate || '',
        invoiceStatus:
          status === 'fulfilled' ? 'received' : activePurchase?.invoiceStatus || 'pending',
        fiscalKey: '',
        attachments: [...attachments],
        discountPercent,
        ipiPercent,
        freightPercent,
      };

      const purchaseId = activePurchase?.id || draftSync.draftIdRef.current;
      await validatePurchase(
        purchasePayload,
        async (validated) => {
          const hasOnlyRegisteredProducts = itemsManager.processedItems.every((item) =>
            products.some((product) => String(product.id) === String(item.productId))
          );
          if (purchaseId) {
            await updatePurchase(purchaseId, validated as Purchase);
            toast.success('Pedido de compra atualizado com sucesso!');
          } else {
            const savedId = await savePurchase(validated as Purchase);
            if (!savedId) throw new Error('Não foi possível salvar o pedido de compra.');
            draftSync.setDraftId(savedId);
            let message = savedId
              ? 'Pedido de compra confirmado!'
              : 'Não foi possível salvar o pedido de compra.';
            if (!hasOnlyRegisteredProducts) {
              message += ' Há item temporário para vincular antes do recebimento.';
            }
            toast.success(message);
          }
          completedRef.current = true;
          onClose();
        },
        (errors) => {
          toast.error(Object.values(flattenFormErrors(errors))[0]);
          if (isDraftSession && draftSync.hasDraftChangesRef.current) {
            const revision = draftSync.draftRevisionRef.current;
            void draftSync.persistDraft(draftSync.buildDraftPayload(), true).then((saved) => {
              if (saved && revision === draftSync.draftRevisionRef.current) {
                draftSync.hasDraftChangesRef.current = false;
                draftSync.setHasDraftChanges(false);
              }
            }).catch((error: unknown) => {
              console.error('Erro ao salvar rascunho após validação:', error);
              draftSync.setDraftError('Não foi possível salvar o rascunho da compra.');
            });
          }
        }
      );
    } catch (error: unknown) {
      console.error('Erro ao salvar compra:', error);
      const message = error instanceof Error ? error.message : 'Erro ao salvar o pedido de compra.';
      toast.error(message);
    } finally {
      actionRef.current = false;
      setIsSaving(false);
    }
  };

  return {
    suppliers,
    products,
    selectedSupplierId,
    setSelectedSupplierId: handleSelectedSupplierChange,
    items: itemsManager.items,
    processedItems: itemsManager.processedItems,
    totalValue: itemsManager.totalValue,
    isSaving,
    purchaseDate,
    setPurchaseDate: handlePurchaseDateChange,
    discountPercent,
    setDiscountPercent: handleDiscountPercentChange,
    ipiPercent,
    setIpiPercent: handleIpiPercentChange,
    freightPercent,
    setFreightPercent: handleFreightPercentChange,
    validationErrors: itemsManager.validationErrors,
    draftId: draftSync.draftId,
    draftError: draftSync.draftError,
    isAutoSaving: draftSync.isAutoSaving,
    hasDraftChanges: draftSync.hasDraftChanges,
    isDraftSession,
    handleAddItem: itemsManager.handleAddItem,
    handleRemoveItem: itemsManager.handleRemoveItem,
    handleUpdateItem: itemsManager.handleUpdateItem,
    handleCancelOrClose,
    handleSave,
  };
}
