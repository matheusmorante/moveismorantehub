import { useState, useEffect, useRef, useCallback } from 'react';
import Purchase, { PurchaseItem } from '../../../../types/purchase.type';
import Product from '../../../../types/product.type';
import Person from '../../../../types/person.type';
import { subscribeToProducts } from '@/pages/utils/productService';
import { subscribeToPeople } from '@/pages/utils/personService';
import { savePurchase, updatePurchase } from '../../../../utils/purchaseService';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { purchaseDraftFormSchema, purchaseFormSchema } from '../../../../../../../shared-utils/purchaseFormSchemas';
import { calculatePurchaseCosts } from '../utils/purchaseCalculationUtils';

interface ProductSupplierLookupLike extends Partial<Product> {
  readonly supplier_ids?: readonly string[];
  readonly main_supplier_id?: string;
  readonly supplier_id?: string;
}

export interface UsePurchaseModalFormProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly activePurchase?: Purchase | null;
  readonly attachments: readonly string[];
  readonly setAttachments: (attachments: readonly string[]) => void;
}

export function usePurchaseModalForm({
  isOpen,
  onClose,
  activePurchase,
  attachments,
  setAttachments,
}: UsePurchaseModalFormProps) {
  const [suppliers, setSuppliers] = useState<readonly Person[]>([]);
  const [products, setProducts] = useState<readonly Product[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [items, setItems] = useState<readonly PurchaseItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [ipiPercent, setIpiPercent] = useState(0);
  const [freightPercent, setFreightPercent] = useState(0);
  const [validationErrors, setValidationErrors] = useState({ supplier: false, items: false });
  const [draftId, setDraftIdState] = useState<string | null>(null);
  const draftIdRef = useRef<string | null>(null);
  const setDraftId = useCallback((id: string | null) => {
    draftIdRef.current = id;
    setDraftIdState(id);
  }, []);
  const pendingDraftRef = useRef<Promise<unknown>>(Promise.resolve());
  const actionRef = useRef(false);
  const completedRef = useRef(false);
  const closeRef = useRef<() => Promise<void>>(async () => {});
  const [draftError, setDraftError] = useState('');
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const { enqueueAndRun: validateDraft } = useZodForm(purchaseDraftFormSchema, {
    supplierId: selectedSupplierId,
    supplierName: '',
    date: purchaseDate,
    status: 'ordered',
    items: [],
    totalValue: 0,
  });

  const { validateAndRun: validatePurchase } = useZodForm(purchaseFormSchema, {
    supplierId: selectedSupplierId,
    supplierName: '',
    date: purchaseDate,
    status: 'ordered',
    items: [],
    totalValue: 0,
  });

  const observation = '';
  const invoiceNumber = '';
  const invoiceDate = '';

  useEffect(() => {
    if (isOpen) {
      completedRef.current = false;
      const unsubSuppliers = subscribeToPeople('suppliers', (data) => {
        setSuppliers(data.filter((p) => !p.deleted && p.type === 'suppliers'));
      });
      const unsubProducts = subscribeToProducts((data) => {
        setProducts(data.filter((p) => !p.deleted && p.itemType === 'product'));
      });

      if (activePurchase) {
        setSelectedSupplierId(activePurchase.supplierId || '');
        setPurchaseDate(
          activePurchase.date
            ? activePurchase.date.includes('T')
              ? activePurchase.date.split('T')[0]
              : activePurchase.date
            : new Date().toISOString().split('T')[0]
        );
        setIpiPercent(activePurchase.ipiPercent || 0);
        setFreightPercent(activePurchase.freightPercent || 0);
        setAttachments(activePurchase.attachments || []);
        setItems(activePurchase.items || []);
        setValidationErrors({ supplier: false, items: false });
        setDraftId(null);
      } else {
        setSelectedSupplierId('');
        setPurchaseDate(new Date().toISOString().split('T')[0]);
        setIpiPercent(0);
        setFreightPercent(0);
        setAttachments([]);
        setItems([]);
        setValidationErrors({ supplier: false, items: false });
        setDraftId(null);
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          void closeRef.current();
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => {
        unsubSuppliers();
        unsubProducts();
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, activePurchase, setAttachments, setDraftId]);

  const handleAddItem = (newItem: PurchaseItem) => {
    const product = products.find((p) => p.id === newItem.productId) as
      | ProductSupplierLookupLike
      | undefined;
    const supplierIds = product?.supplierIds || product?.supplier_ids || [];
    const prodSupplierId =
      product?.mainSupplierId ||
      product?.supplierId ||
      product?.main_supplier_id ||
      product?.supplier_id;

    const productUsesSelectedSupplier =
      !selectedSupplierId ||
      !product ||
      supplierIds.includes(selectedSupplierId) ||
      prodSupplierId === selectedSupplierId;

    if (!selectedSupplierId && prodSupplierId) {
      setSelectedSupplierId(prodSupplierId);
    } else if (selectedSupplierId && !productUsesSelectedSupplier) {
      const prodSupplier = suppliers.find((s) => s.id === prodSupplierId);
      toast.error(
        `Este produto pertence ao fornecedor "${prodSupplier?.fullName || 'outro fornecedor'}". Remova os itens para trocar de fornecedor.`
      );
      return false;
    }

    setItems((currentItems) => [...currentItems, newItem]);
    setValidationErrors((current) => ({ ...current, items: false }));
    return true;
  };

  const handleRemoveItem = (idx: number) => {
    setItems((current) => current.filter((_, i) => i !== idx));
  };

  const handleUpdateItem = (idx: number, updatedItem: PurchaseItem) => {
    setItems((currentItems) => currentItems.map((item, i) => (i === idx ? updatedItem : item)));
  };

  const { processedItems, totalValue } = calculatePurchaseCosts(items, ipiPercent, freightPercent);

  const persistDraft = useCallback(
    (payload: Purchase, allowDuringAction = false) =>
      validateDraft(
        payload,
        async (values) => {
          if (completedRef.current || (actionRef.current && !allowDuringAction)) return false;
          if (draftIdRef.current) {
            await updatePurchase(draftIdRef.current, values as Purchase);
          } else {
            const savedId = await savePurchase(values as Purchase);
            if (!savedId) throw new Error('Não foi possível salvar o rascunho da compra.');
            setDraftId(savedId);
          }
          setDraftError('');
          return true;
        },
        (errors) => setDraftError(Object.values(flattenFormErrors(errors))[0])
      ),
    [validateDraft, setDraftId]
  );

  const handleCancelOrClose = async () => {
    if (actionRef.current || completedRef.current) return;
    actionRef.current = true;
    try {
      await pendingDraftRef.current;
      if (!activePurchase?.id && items.length > 0) {
        try {
          const supplier = suppliers.find((s) => s.id === selectedSupplierId);
          const draftPurchase: Purchase = {
            supplierId: selectedSupplierId,
            supplierName: supplier?.fullName || 'Fornecedor Rascunho',
            date: new Date(purchaseDate).toISOString(),
            items: processedItems,
            totalValue,
            observation,
            status: 'ordered',
            invoiceNumber,
            invoiceDate,
            invoiceStatus: 'pending',
            attachments: [...attachments],
            ipiPercent,
            freightPercent,
          };

          const saved = await persistDraft(draftPurchase, true);
          if (!saved) return;
          toast.info('Pedido de compra salvo como rascunho!');
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

  useEffect(() => {
    if (!isOpen || activePurchase?.id || !items.length) return;
    const timer = window.setTimeout(async () => {
      setIsAutoSaving(true);
      try {
        const supplier = suppliers.find((item) => item.id === selectedSupplierId);
        const payload: Purchase = {
          supplierId: selectedSupplierId,
          supplierName: supplier?.fullName || 'Fornecedor Rascunho',
          date: new Date(purchaseDate).toISOString(),
          items: processedItems,
          totalValue,
          observation,
          status: 'ordered',
          invoiceNumber,
          invoiceDate,
          invoiceStatus: 'pending',
          attachments: [...attachments],
          ipiPercent,
          freightPercent,
        };
        const write = persistDraft(payload);
        pendingDraftRef.current = write.catch(() => undefined);
        await write;
      } catch (error: unknown) {
        console.error('Erro ao salvar rascunho automático:', error);
        setDraftError('Não foi possível salvar o rascunho da compra.');
      } finally {
        setIsAutoSaving(false);
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [
    isOpen,
    activePurchase?.id,
    items,
    selectedSupplierId,
    suppliers,
    purchaseDate,
    ipiPercent,
    freightPercent,
    attachments,
    draftId,
    totalValue,
    persistDraft,
  ]);

  const handleSave = async (status: 'ordered' | 'fulfilled') => {
    if (actionRef.current || completedRef.current) return;
    if (!selectedSupplierId || items.length === 0) {
      setValidationErrors({ supplier: !selectedSupplierId, items: items.length === 0 });
      toast.error(
        !selectedSupplierId && items.length === 0
          ? 'Selecione o fornecedor e adicione pelo menos um item.'
          : !selectedSupplierId
            ? 'Selecione um fornecedor para salvar o pedido.'
            : 'Adicione pelo menos um item ao pedido.'
      );
      return;
    }

    const supplier = suppliers.find((s) => s.id === selectedSupplierId);

    actionRef.current = true;
    setIsSaving(true);
    try {
      await pendingDraftRef.current;
      const purchasePayload: Purchase = {
        supplierId: selectedSupplierId,
        supplierName: supplier?.fullName || activePurchase?.supplierName || 'Fornecedor',
        date: new Date(purchaseDate).toISOString(),
        items: processedItems,
        totalValue,
        observation,
        status: activePurchase?.status === 'cancelled' ? 'cancelled' : status,
        invoiceNumber: invoiceNumber || activePurchase?.invoiceNumber,
        invoiceDate: invoiceDate || activePurchase?.invoiceDate,
        invoiceStatus:
          status === 'fulfilled' ? 'received' : activePurchase?.invoiceStatus || 'pending',
        fiscalKey: '',
        attachments: [...attachments],
        ipiPercent,
        freightPercent,
      };

      const purchaseId = activePurchase?.id || draftIdRef.current;
      await validatePurchase(
        purchasePayload,
        async (validated) => {
          const hasOnlyRegisteredProducts = processedItems.every((item) =>
            products.some((product) => String(product.id) === String(item.productId))
          );
          if (purchaseId) {
            await updatePurchase(purchaseId, validated as Purchase);
            toast.success('Pedido de compra atualizado com sucesso!');
          } else {
            const savedId = await savePurchase(validated as Purchase);
            if (!savedId) throw new Error('Não foi possível salvar o pedido de compra.');
            setDraftId(savedId);
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
        (errors) => toast.error(Object.values(flattenFormErrors(errors))[0])
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
    setSelectedSupplierId,
    items,
    processedItems,
    totalValue,
    isSaving,
    purchaseDate,
    setPurchaseDate,
    ipiPercent,
    setIpiPercent,
    freightPercent,
    setFreightPercent,
    validationErrors,
    draftId,
    draftError,
    isAutoSaving,
    handleAddItem,
    handleRemoveItem,
    handleUpdateItem,
    handleCancelOrClose,
    handleSave,
  };
}
