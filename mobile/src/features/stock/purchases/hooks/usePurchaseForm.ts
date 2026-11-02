import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { flattenFormErrors, useZodForm } from '../../../../hooks/useZodForm';
import {
  getPurchaseConfirmationBlockReasons,
  mobilePurchaseFormSchema,
} from '../../../../../../shared-utils/purchaseFormSchemas';
import { fetchMobileSuppliers } from '../../../products/services/mobileSupplierService';
import {
  MobilePurchase,
  MobilePurchaseItem,
  saveMobilePurchase,
  updateMobilePurchase,
} from '../mobilePurchaseService';
import {
  useMobilePurchaseAttachments,
} from './useMobilePurchaseAttachments';
import {
  useMobilePurchaseItems,
  Supplier,
  parseNumber,
} from './useMobilePurchaseItems';
import {
  useMobilePurchaseDraft,
} from './useMobilePurchaseDraft';
import { supplierProvidesStockOrigin } from '../../../../../../shared-utils/productSupplierStockOrigin';
import { matchesSearchText } from '../../../../../../shared-utils/searchText';

export type { Supplier };
export { parseNumber };

export const formatMoney = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

interface UsePurchaseFormOptions {
  visible: boolean;
  purchase?: MobilePurchase | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Hook orquestrador de domínio para o formulário de pedidos de compra no mobile.
 * Aplica princípios de responsabilidade única coordenando sub-hooks especializados:
 * - `useMobilePurchaseAttachments`: controle e upload de arquivos.
 * - `useMobilePurchaseItems`: itens, cálculos de IPI/Frete e seleção de produtos.
 * - `useMobilePurchaseDraft`: auto-save atômico e sincronização de rascunhos.
 */
export function usePurchaseForm({
  visible,
  purchase,
  onClose,
  onSaved,
}: UsePurchaseFormOptions) {
  // Estado de Fornecedores e Busca
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [supplierId, setSupplierIdState] = useState('');
  const [supplierName, setSupplierNameState] = useState('');

  // Campos de cabeçalho
  const [date, setDateState] = useState('');
  const [discountPercent, setDiscountPercentState] = useState('0');
  const [ipiPercent, setIpiPercentState] = useState('0');
  const [freightPercent, setFreightPercentState] = useState('0');
  const [saving, setSaving] = useState(false);

  // Trava de concorrência para ações explícitas (fechar/salvar)
  const actionRef = useRef(false);

  // Inicialização / Reset de dados ao carregar compra ou abrir modal
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void fetchMobileSuppliers({ includeStockOrigins: true }).then((data) => {
      if (!cancelled) setSuppliers(data as Supplier[]);
    });
    setSupplierIdState(purchase?.supplierId || '');
    setSupplierNameState(purchase?.supplierId ? purchase.supplierName || '' : '');
    setDateState((purchase?.date || new Date().toISOString()).slice(0, 10));
    setDiscountPercentState(String(purchase?.discountPercent || 0));
    setIpiPercentState(String(purchase?.ipiPercent || 0));
    setFreightPercentState(String(purchase?.freightPercent || 0));
    attachmentsManager.setAttachments(purchase?.attachments ? [...purchase.attachments] : []);
    itemsManager.setItems(purchase?.items?.map((item) => ({ ...item })) || []);
    return () => {
      cancelled = true;
    };
  }, [visible, purchase]);

  // Sub-hook de Anexos
  const attachmentsManager = useMobilePurchaseAttachments({
    onAttachmentChange: () => draftManager.markDraftChanged(),
  });

  // Sub-hook de Itens e Cálculos
  const itemsManager = useMobilePurchaseItems({
    discountPercent,
    ipiPercent,
    freightPercent,
    supplierId,
    suppliers,
    setSupplierId: (id) => {
      draftManager.markDraftChanged();
      setSupplierIdState(id);
    },
    setSupplierName: (name) => {
      draftManager.markDraftChanged();
      setSupplierNameState(name);
    },
    onItemsChange: () => draftManager.markDraftChanged(),
  });

  // Construtores de Payload
  const buildPayload = useCallback(
    <TStatus extends MobilePurchase['status']>(status: TStatus) => ({
      supplierId,
      supplierName: supplierName || '',
      date: date || new Date().toISOString().slice(0, 10),
      observation: purchase?.observation || '',
      discountInput: discountPercent,
      discountPercent: parseNumber(discountPercent),
      ipiInput: ipiPercent,
      freightInput: freightPercent,
      items: itemsManager.items.map((item) => ({ ...item })),
      totalValue: itemsManager.total,
      status,
      stockProcessed: purchase?.stockProcessed || false,
      attachments: attachmentsManager.attachments,
      invoiceNumber: purchase?.invoiceNumber,
      invoiceDate: purchase?.invoiceDate,
      invoiceStatus: purchase?.invoiceStatus,
      fiscalKey: purchase?.fiscalKey,
    }),
    [
      supplierId,
      supplierName,
      date,
      discountPercent,
      ipiPercent,
      freightPercent,
      itemsManager.items,
      itemsManager.total,
      attachmentsManager.attachments,
      purchase,
    ]
  );

  const buildDraftPayload = useCallback(
    () => ({ ...buildPayload('draft'), status: 'draft' as const }),
    [buildPayload]
  );

  // Sub-hook de Rascunho e Auto-Save
  const draftManager = useMobilePurchaseDraft({
    visible,
    purchase,
    buildDraftPayload,
    actionRef,
  });

  // Mutators com marcação de rascunho sujo
  const setSupplierId = useCallback((value: string) => {
    draftManager.markDraftChanged();
    setSupplierIdState(value);
  }, [draftManager]);

  const setSupplierName = useCallback((value: string) => {
    draftManager.markDraftChanged();
    setSupplierNameState(value);
  }, [draftManager]);

  const setDate = useCallback((value: string) => {
    draftManager.markDraftChanged();
    setDateState(value);
  }, [draftManager]);

  const setDiscountPercent = useCallback((value: string) => {
    draftManager.markDraftChanged();
    setDiscountPercentState(value);
  }, [draftManager]);

  const setIpiPercent = useCallback((value: string) => {
    draftManager.markDraftChanged();
    setIpiPercentState(value);
  }, [draftManager]);

  const setFreightPercent = useCallback((value: string) => {
    draftManager.markDraftChanged();
    setFreightPercentState(value);
  }, [draftManager]);

  // Formulário Zod de finalização
  const form = useZodForm(mobilePurchaseFormSchema, {
    supplierId,
    supplierName,
    date,
    observation: purchase?.observation || '',
    items: itemsManager.items.map((item) => ({ ...item })),
    totalValue: 0,
    status: (purchase?.status === 'fulfilled'
      ? 'fulfilled'
      : purchase?.status === 'cancelled'
        ? 'cancelled'
        : purchase?.status === 'pending'
          ? 'pending'
          : 'ordered') as 'fulfilled' | 'cancelled' | 'pending' | 'ordered',
    discountInput: discountPercent,
    discountPercent: parseNumber(discountPercent),
    ipiInput: ipiPercent,
    freightInput: freightPercent,
  });

  // Ação de fechamento / cancelamento
  const handleClose = async () => {
    if (attachmentsManager.isUploading) {
      Alert.alert('Envio em andamento', 'Aguarde o envio dos anexos antes de fechar o pedido.');
      return;
    }
    if (actionRef.current) return;
    actionRef.current = true;
    if (draftManager.autoSaveTimerRef.current) clearTimeout(draftManager.autoSaveTimerRef.current);
    draftManager.autoSaveTimerRef.current = null;
    try {
      await draftManager.pendingDraftRef.current;
      if (draftManager.isDraftSession && draftManager.dirtyRef.current) {
        const result = await draftManager.persistDraft(buildDraftPayload(), true);
        if (!result) {
          Alert.alert('Rascunho não salvo', 'A alteração ainda não foi salva. Confira sua conexão e tente novamente.');
          return;
        }
        draftManager.dirtyRef.current = false;
        draftManager.setHasDraftChanges(false);
      }
      if (draftManager.isDraftSession && draftManager.draftIdRef.current) onSaved();
      onClose();
    } catch (cause: any) {
      Alert.alert('Rascunho não salvo', cause?.message || 'Confira sua conexão e tente novamente.');
    } finally {
      actionRef.current = false;
    }
  };

  // Ação de salvamento e confirmação
  const handleSave = async () => {
    if (attachmentsManager.isUploading) {
      Alert.alert('Envio em andamento', 'Aguarde o envio dos anexos antes de salvar o pedido.');
      return;
    }
    if (actionRef.current) return;
    actionRef.current = true;
    if (draftManager.autoSaveTimerRef.current) clearTimeout(draftManager.autoSaveTimerRef.current);
    draftManager.autoSaveTimerRef.current = null;

    const validItems = itemsManager.items.filter((item) => Boolean(item.productId && item.productId.trim()));
    const confirmationBlockReasons = getPurchaseConfirmationBlockReasons(supplierId, itemsManager.items);
    if (confirmationBlockReasons.length > 0) {
      actionRef.current = false;
      Alert.alert('Campos obrigatórios', confirmationBlockReasons.join(' '));
      return;
    }

    setSaving(true);
    try {
      await draftManager.pendingDraftRef.current;
      const finalStatus = purchase?.id && purchase.status !== 'draft'
        ? purchase.status
        : 'pending';
      const payloadToValidate = {
        ...buildPayload(finalStatus),
        items: validItems.map((item) => ({ ...item })),
        discountInput: discountPercent,
        ipiInput: ipiPercent,
        freightInput: freightPercent,
      };

      await form.validateAndRun(
        payloadToValidate,
        async (values) => {
          const validatedItems = values.items.map((item) => ({
            ...item,
            baseCost: Number(item.baseCost ?? item.unitCost ?? 0),
          })) as MobilePurchaseItem[];
          const payload = {
            supplierId: values.supplierId || undefined,
            supplierName: values.supplierName,
            date: new Date(`${values.date}T12:00:00`).toISOString(),
            observation: values.observation,
            discountPercent: values.discountPercent ?? parseNumber(values.discountInput),
            ipiPercent: parseNumber(values.ipiInput),
            freightPercent: parseNumber(values.freightInput),
            items: validatedItems,
            totalValue: values.totalValue,
            status: values.status,
            attachments: values.attachments || [],
            stockProcessed: purchase?.stockProcessed || false,
            invoiceNumber: purchase?.invoiceNumber,
            invoiceDate: purchase?.invoiceDate,
            invoiceStatus: purchase?.invoiceStatus,
            fiscalKey: purchase?.fiscalKey,
          };
          if (purchase?.id) {
            await updateMobilePurchase(purchase.id, payload, { fetchAfterUpdate: false });
          } else if (draftManager.draftIdRef.current) {
            await updateMobilePurchase(draftManager.draftIdRef.current, payload, { fetchAfterUpdate: false });
          } else {
            await saveMobilePurchase(payload as Omit<MobilePurchase, 'id'>);
          }
          onSaved();
          onClose();
          return true;
        },
        (errors) => {
          Alert.alert('Revise a compra', Object.values(flattenFormErrors(errors))[0]);
          if (draftManager.isDraftSession && draftManager.dirtyRef.current) {
            const revision = draftManager.revisionRef.current;
            draftManager.setDraftSaveStatus('saving');
            void draftManager.persistDraft(buildDraftPayload(), true).then((result) => {
              if (result && revision === draftManager.revisionRef.current) {
                draftManager.dirtyRef.current = false;
                draftManager.setHasDraftChanges(false);
                draftManager.setDraftSaveStatus('saved');
              }
            }).catch((cause) => {
              console.error('[Purchases] Falha ao salvar rascunho incompleto:', cause);
              draftManager.setDraftSaveStatus('error');
            });
          }
        }
      );
    } catch (cause: any) {
      Alert.alert('Não foi possível salvar', cause?.message || 'Tente novamente.');
    } finally {
      actionRef.current = false;
      setSaving(false);
    }
  };

  const filteredSuppliers = useMemo(() => {
    return suppliers
      .filter((item) => supplierProvidesStockOrigin(item.stock_origins, 'normal'))
      .filter((item) => matchesSearchText(item.name, supplierSearch))
      .slice(0, 40);
  }, [suppliers, supplierSearch]);

  return {
    suppliers,
    filteredSuppliers,
    supplierSearch,
    setSupplierSearch,
    supplierOpen,
    setSupplierOpen,
    supplierId,
    setSupplierId,
    supplierName,
    setSupplierName,
    date,
    setDate,
    discountPercent,
    setDiscountPercent,
    ipiPercent,
    setIpiPercent,
    freightPercent,
    setFreightPercent,
    items: itemsManager.items,
    attachments: attachmentsManager.attachments,
    isUploading: attachmentsManager.isUploading,
    addAttachments: attachmentsManager.addAttachments,
    removeAttachment: attachmentsManager.removeAttachment,
    addProduct: itemsManager.addProduct,
    openProductPicker: itemsManager.openProductPicker,
    addItemRow: itemsManager.addItemRow,
    handleProductSelect: itemsManager.handleProductSelect,
    productPickerIndex: itemsManager.productPickerIndex,
    updateItem: itemsManager.updateItem,
    removeItem: itemsManager.removeItem,
    total: itemsManager.total,
    productPickerOpen: itemsManager.productPickerOpen,
    setProductPickerOpen: itemsManager.setProductPickerOpen,
    saving,
    hasDraftChanges: draftManager.hasDraftChanges,
    isDraftSession: draftManager.isDraftSession,
    draftSaveStatus: draftManager.draftSaveStatus,
    confirmationBlockReasons: getPurchaseConfirmationBlockReasons(supplierId, itemsManager.items),
    handleClose,
    handleSave,
  };
}
