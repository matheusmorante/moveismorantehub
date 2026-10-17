import { useState, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
import { flattenFormErrors, useZodForm } from '../../../hooks/useZodForm';
import { mobilePurchaseFormSchema } from '../../../../../shared-utils/purchaseFormSchemas';
import { fetchMobileSuppliers } from '../../products/services/mobileSupplierService';
import {
  MobilePurchase,
  MobilePurchaseItem,
  saveMobilePurchase,
  updateMobilePurchase,
} from '../mobilePurchaseService';
import type { SearchableProduct } from '../inventory/components/InventoryProductSearchModal';

export type Supplier = {
  id: string;
  name: string;
  full_name?: string;
  nickname?: string;
  social_name?: string;
};

export const parseNumber = (value: string) =>
  Number(value.replace(',', '.').replace(/[^\d.-]/g, '')) || 0;

export const formatMoney = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

interface UsePurchaseFormOptions {
  visible: boolean;
  purchase?: MobilePurchase | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Hook de domínio para gerenciamento do formulário de pedidos de compra no mobile.
 * Controla itens, cálculos de IPI e frete, seleção de fornecedores e validação Zod.
 */
export function usePurchaseForm({
  visible,
  purchase,
  onClose,
  onSaved,
}: UsePurchaseFormOptions) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [date, setDate] = useState('');
  const [observation, setObservation] = useState('');
  const [ipiPercent, setIpiPercent] = useState('0');
  const [freightPercent, setFreightPercent] = useState('0');
  const [items, setItems] = useState<MobilePurchaseItem[]>([]);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const formValues = {
    supplierId,
    supplierName,
    date,
    observation,
    items: items.map((item) => ({ ...item })),
    totalValue: 0,
    status: (purchase?.status === 'fulfilled' ? 'fulfilled' : 'ordered') as 'fulfilled' | 'ordered',
    ipiInput: ipiPercent,
    freightInput: freightPercent,
  };

  const form = useZodForm(mobilePurchaseFormSchema, formValues);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void fetchMobileSuppliers().then((data) => {
      if (!cancelled) setSuppliers(data as Supplier[]);
    });
    setSupplierId(purchase?.supplierId || '');
    setSupplierName(purchase?.supplierName || '');
    setDate((purchase?.date || new Date().toISOString()).slice(0, 10));
    setObservation(purchase?.observation || '');
    setIpiPercent(String(purchase?.ipiPercent || 0));
    setFreightPercent(String(purchase?.freightPercent || 0));
    setItems(purchase?.items?.map((item) => ({ ...item })) || []);
    return () => {
      cancelled = true;
    };
  }, [visible, purchase]);

  useEffect(() => {
    const factor = 1 + parseNumber(ipiPercent) / 100 + parseNumber(freightPercent) / 100;
    setItems((previous) =>
      previous.map((item) => ({
        ...item,
        unitCost: Number(item.baseCost || 0) * factor,
        totalCost: Number(item.quantity || 0) * Number(item.baseCost || 0) * factor,
      }))
    );
  }, [freightPercent, ipiPercent]);

  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item.totalCost || 0), 0);
  }, [items]);

  const addProduct = (product: SearchableProduct) => {
    const existing = items.findIndex(
      (item) => item.variationId === product.variation_id && item.productId === product.id
    );
    if (existing >= 0) {
      setItems((previous) =>
        previous.map((item, index) =>
          index === existing ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
      return;
    }
    setItems((previous) => [
      ...previous,
      {
        productId: product.id,
        variationId: product.variation_id,
        description: product.name || product.description || 'Produto',
        quantity: 1,
        baseCost: 0,
        unitCost: 0,
        totalCost: 0,
        sku: product.sku || undefined,
      },
    ]);
  };

  const updateItem = (index: number, patch: Partial<MobilePurchaseItem>) => {
    setItems((previous) =>
      previous.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const next = { ...item, ...patch };
        const factor = 1 + parseNumber(ipiPercent) / 100 + parseNumber(freightPercent) / 100;
        next.unitCost = Number(next.baseCost || 0) * factor;
        next.totalCost = Number(next.quantity || 0) * next.unitCost;
        return next;
      })
    );
  };

  const removeItem = (index: number) => {
    setItems((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSave = async () => {
    return form.validateAndRun(
      {
        supplierId,
        supplierName,
        date,
        observation,
        items: items.map((item) => ({ ...item })),
        totalValue: total,
        status: purchase?.status === 'fulfilled' ? 'fulfilled' : 'ordered',
        ipiInput: ipiPercent,
        freightInput: freightPercent,
      },
      async (values) => {
        setSaving(true);
        try {
          const payload: any = {
            supplierId: values.supplierId,
            supplierName: values.supplierName,
            date: new Date(`${values.date}T12:00:00`).toISOString(),
            observation: values.observation,
            ipiPercent: parseNumber(values.ipiInput),
            freightPercent: parseNumber(values.freightInput),
            items: values.items,
            totalValue: values.totalValue,
            status: values.status,
            stockProcessed: purchase?.stockProcessed || false,
            attachments: purchase?.attachments || [],
            invoiceNumber: purchase?.invoiceNumber,
            invoiceDate: purchase?.invoiceDate,
            invoiceStatus: purchase?.invoiceStatus,
            fiscalKey: purchase?.fiscalKey,
          };
          if (purchase?.id) await updateMobilePurchase(purchase.id, payload);
          else await saveMobilePurchase(payload);
          onSaved();
          onClose();
        } catch (cause: any) {
          Alert.alert('Não foi possível salvar', cause?.message || 'Tente novamente.');
        } finally {
          setSaving(false);
        }
      },
      (errors) => Alert.alert('Revise a compra', Object.values(flattenFormErrors(errors))[0])
    );
  };

  const filteredSuppliers = suppliers
    .filter((item) => item.name.toLowerCase().includes(supplierSearch.toLowerCase()))
    .slice(0, 40);

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
    observation,
    setObservation,
    ipiPercent,
    setIpiPercent,
    freightPercent,
    setFreightPercent,
    items,
    setItems,
    addProduct,
    updateItem,
    removeItem,
    total,
    productPickerOpen,
    setProductPickerOpen,
    saving,
    handleSave,
  };
}
