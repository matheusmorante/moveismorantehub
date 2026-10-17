import React, { useState, useEffect, useCallback, useRef } from 'react';
import Purchase, { PurchaseItem } from '../../../../types/purchase.type';
import Product from '../../../../types/product.type';
import { updatePurchase } from '../../../../utils/purchaseService';
import { getProductsByIds } from '../../../../utils/productService';
import { toast } from 'react-toastify';
import { extractScannedCodes, extractLabelIdentity } from '@/pages/utils/barcodeScannerUtils';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { createPurchaseReceiptCheckFormSchema } from '../../../../../../../shared-utils/purchaseReceiptCheckFormSchema';
import { matchScannedPurchaseItem } from '../utils/purchaseScanMatchingUtils';
import { printPurchaseReceiptReport } from '../utils/purchaseReceiptReportUtils';

export interface UsePurchaseReceiptCheckFormProps {
  readonly purchase: Purchase | null;
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function usePurchaseReceiptCheckForm({
  purchase,
  isOpen,
  onClose,
}: UsePurchaseReceiptCheckFormProps) {
  const [scannedItems, setScannedItems] = useState<Record<string, number>>({});
  const [invoicedQuantities, setInvoicedQuantities] = useState<Record<string, number>>({});
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [products, setProducts] = useState<readonly Product[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [discrepancyNote, setDiscrepancyNote] = useState('');
  const [validationError, setValidationError] = useState('');

  const form = useZodForm(
    createPurchaseReceiptCheckFormSchema(
      (purchase?.items || []).map((item) => item.productId + (item.variationId || ''))
    ),
    {
      invoiceNumber,
      invoiceDate,
      discrepancyNote,
      receivedQuantities: scannedItems,
      invoicedQuantities,
    }
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isScannerOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isScannerOpen, onClose]);

  useEffect(() => {
    if (purchase && isOpen) {
      const receivedInitial: Record<string, number> = {};
      const invoicedInitial: Record<string, number> = {};

      purchase.items.forEach((item: PurchaseItem) => {
        const key = item.productId + (item.variationId || '');
        receivedInitial[key] = item.receivedQuantity || 0;
        invoicedInitial[key] = item.quantity;
      });

      setScannedItems(receivedInitial);
      setInvoicedQuantities(invoicedInitial);
      setInvoiceNumber(purchase.invoiceNumber || '');
      setInvoiceDate(purchase.invoiceDate || '');
      setDiscrepancyNote('');

      const productIds = Array.from(new Set(purchase.items.map((i) => i.productId)));
      getProductsByIds(productIds).then((data) => setProducts(data || []));
    }
  }, [purchase, isOpen]);

  const scannedLabelsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) {
      scannedLabelsRef.current.clear();
    }
  }, [isOpen]);

  const handleScan = useCallback(
    (code: string) => {
      if (!purchase) return;

      const { labelId } = extractLabelIdentity(code);
      if (labelId && scannedLabelsRef.current.has(labelId)) {
        toast.warning('Unidade física já recebida e contabilizada.');
        return;
      }

      const candidates = extractScannedCodes(code).map((c) => c.trim().toLowerCase());
      if (candidates.length === 0) return;

      const matchedItem = matchScannedPurchaseItem(candidates, products, purchase);
      if (matchedItem) {
        if (labelId) scannedLabelsRef.current.add(labelId);
        const key = matchedItem.productId + (matchedItem.variationId || '');
        setScannedItems((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
        toast.success(`+1 ${matchedItem.description}`);
        return;
      }

      toast.warning('Item não encontrado neste pedido.');
    },
    [products, purchase]
  );

  const updateReceivedQty = (key: string, val: number) => {
    setScannedItems((prev) => ({ ...prev, [key]: val }));
  };

  const updateInvoicedQty = (key: string, val: number) => {
    setInvoicedQuantities((prev) => ({ ...prev, [key]: val }));
  };

  const handlePrint = () => {
    if (!purchase) return;
    printPurchaseReceiptReport(purchase, invoiceNumber, scannedItems, invoicedQuantities);
  };

  const handleSave = form.submit(
    async (values) => {
      if (!purchase) return;
      setIsSaving(true);
      try {
        const updatedItems = purchase.items.map((item: PurchaseItem) => {
          const key = item.productId + (item.variationId || '');
          return {
            ...item,
            receivedQuantity: values.receivedQuantities[key],
          };
        });

        const isAllReceived = updatedItems.every(
          (i) => (i.receivedQuantity || 0) === i.quantity
        );
        const isAnyReceived = updatedItems.some(
          (i) => (i.receivedQuantity || 0) > 0
        );

        const hasDiscrepancy = updatedItems.some((i) => {
          const key = i.productId + (i.variationId || '');
          const invoiced = values.invoicedQuantities[key];
          const received = values.receivedQuantities[key];
          return received !== i.quantity || received !== invoiced || invoiced !== i.quantity;
        });

        let newStatus = purchase.status;
        let invStatus: 'pending' | 'partially_received' | 'received' = 'pending';

        if (isAllReceived && !hasDiscrepancy) {
          newStatus = 'fulfilled';
          invStatus = 'received';
        } else if (isAnyReceived) {
          invStatus = 'partially_received';
        }

        await updatePurchase(purchase.id!, {
          items: updatedItems,
          status: newStatus,
          invoiceNumber: values.invoiceNumber,
          invoiceDate: values.invoiceDate,
          invoiceStatus: invStatus,
          observation: values.discrepancyNote
            ? `${purchase.observation || ''}\n[Divergência: ${values.discrepancyNote}]`
            : purchase.observation,
        });

        toast.success(
          'Conferência salva. Registre o recebimento em Recebimentos de Mercadorias para movimentar o estoque.'
        );
        onClose();
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Erro ao salvar conferência.';
        toast.error(message);
      } finally {
        setIsSaving(false);
      }
    },
    (errors) =>
      setValidationError(
        Object.values(flattenFormErrors(errors))[0] ||
          'Confira as quantidades dos itens.'
      )
  );

  return {
    scannedItems,
    invoicedQuantities,
    isScannerOpen,
    setIsScannerOpen,
    isSaving,
    invoiceNumber,
    setInvoiceNumber,
    invoiceDate,
    setInvoiceDate,
    discrepancyNote,
    setDiscrepancyNote,
    validationError,
    form,
    handleScan,
    updateReceivedQty,
    updateInvoicedQty,
    handlePrint,
    handleSave,
  };
}
