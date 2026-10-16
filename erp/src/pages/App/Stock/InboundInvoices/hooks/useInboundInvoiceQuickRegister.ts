import { useEffect, useRef, useState } from 'react';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { itemCostWithAdditionalCosts } from '@/pages/utils/inboundNfe/inboundItemCosts';
import { createInboundQuickRegisterSchema } from '../../../../../../../shared-utils/inboundProductLinkFormSchemas';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import type Product from '@/pages/types/product.type';
import { getFullProduct } from '@/pages/utils/productService';
import {
  prepareNewParentWithVariation,
  prepareExistingParentNewVariation,
} from '../services/inboundProductPreparationService';
import type {
  QuickRegisterItem,
  QuickRegisterSelection,
} from '../modals/QuickRegisterVariationModal';
import { toast } from 'react-toastify';

export function useInboundInvoiceQuickRegister(supplierId?: string, items: InboundInvoiceItem[] = []) {
  const [quickRegisterTarget, setQuickRegisterTarget] = useState<{
    itemNumber: number;
    item: QuickRegisterItem;
  } | null>(null);
  const [isPreparingProduct, setIsPreparingProduct] = useState(false);
  const [creatingItemNumber, setCreatingItemNumber] = useState<number | null>(null);
  const [creatingVariationId, setCreatingVariationId] = useState<string | null>(null);
  const [editingParentProduct, setEditingParentProduct] = useState<Product | null>(null);
  const [initialProductData, setInitialProductData] = useState<Partial<Product> | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [suggestedCategory, setSuggestedCategory] = useState<{ id: string; name: string } | null>(
    null
  );
  const sourceItem = items.find((item) => item.itemNumber === quickRegisterTarget?.itemNumber);
  const sourceSnapshot = JSON.stringify(sourceItem);
  const context = useRef({ supplierId, target: quickRegisterTarget, sourceSnapshot });
  if (context.current.supplierId !== supplierId || context.current.target !== quickRegisterTarget || context.current.sourceSnapshot !== sourceSnapshot) {
    context.current = { supplierId, target: quickRegisterTarget, sourceSnapshot };
  }
  const active = useRef(true), inFlight = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const preparationForm = useZodForm(createInboundQuickRegisterSchema(items.map((item) => item.itemNumber)), {
    itemNumber: quickRegisterTarget?.itemNumber || 0, supplierId: supplierId || '',
    item: quickRegisterTarget?.item || { productDescription: '', quantity: 0, unitCost: 0 },
    selection: { mode: 'NEW_PARENT' },
  });

  const handleQuickRegisterConfirm = async (selection: QuickRegisterSelection) => {
    if (inFlight.current) return false;
    inFlight.current = true;
    const submittedContext = context.current;
    let expired = false;
    const assertCurrent = () => {
      if (expired || !active.current || submittedContext !== context.current) {
        throw new Error('O item ou fornecedor mudou. Reabra o cadastro rápido.');
      }
    };
    let validationError = 'Selecione o item da nota.';
    try {
      const result = await preparationForm.validateAndRun({
        itemNumber: quickRegisterTarget?.itemNumber || 0, supplierId: supplierId || '',
        item: quickRegisterTarget?.item || { productDescription: '', quantity: 0, unitCost: 0 }, selection,
      }, async (data) => {
        assertCurrent();
        if (!sourceItem || data.item.productDescription !== sourceItem.productDescription.trim() ||
          data.item.productCode !== sourceItem.productCode.trim() || data.item.quantity !== sourceItem.quantity ||
          data.item.unitCost !== sourceItem.unitCost || data.item.unit !== sourceItem.unit.trim() ||
          data.item.ncm !== sourceItem.ncm?.trim() ||
          (data.item.finalCost !== undefined && data.item.finalCost !== itemCostWithAdditionalCosts(sourceItem))) {
          throw new Error('O item da nota mudou. Reabra o cadastro rápido.');
        }
        setIsPreparingProduct(true);
        const pending = (async () => {
          if (data.selection.mode === 'EXISTING_PARENT') {
            const parent = await getFullProduct(data.selection.parentProductId!);
            assertCurrent();
            if (!parent || parent.id !== data.selection.parentProductId || parent.deleted || parent.isVariation || parent.active === false) {
              throw new Error('Produto pai não encontrado ou indisponível.');
            }
            if (!(parent.supplierIds || []).includes(data.supplierId) && (parent.mainSupplierId || parent.supplierId) !== data.supplierId) {
              throw new Error('O produto pai não pertence mais ao fornecedor da nota. Selecione outro produto.');
            }
            return { existing: true, product: await prepareExistingParentNewVariation(parent, data.item) };
          }
          return { existing: false, product: await prepareNewParentWithVariation(data.item, data.supplierId, assertCurrent) };
        })();
        const prepared = await withTimeout(pending, 20000, null, 'preparação do cadastro rápido');
        if (!prepared) {
          expired = true;
          throw new Error('A preparação demorou demais. Tente novamente.');
        }
        assertCurrent();
        setCreatingItemNumber(data.itemNumber);
        setCreatingVariationId(prepared.existing ? prepared.product.variations?.at(-1)?.id || null : prepared.product.variations?.[0]?.id || null);
        setEditingParentProduct(prepared.existing ? prepared.product as Product : null);
        setInitialProductData(prepared.existing ? null : prepared.product);
        setIsProductModalOpen(true);
        setQuickRegisterTarget(null);
        return true;
      }, (errors) => { validationError = Object.values(flattenFormErrors(errors))[0] || validationError; });
      if (!result) throw new Error(validationError);
      return true;
    } finally {
      expired = true;
      inFlight.current = false;
      if (active.current) setIsPreparingProduct(false);
    }
  };

  const editProduct = async (product: Product) => {
    try {
      setIsPreparingProduct(true);
      const parentProduct = await getFullProduct(product.id as string);
      if (!parentProduct) {
        toast.error('Produto não encontrado.');
        return;
      }
      setCreatingItemNumber(null);
      setEditingParentProduct(parentProduct);
      setInitialProductData(null);
      setIsProductModalOpen(true);
    } catch (error) {
      toast.error('Erro ao abrir edição do produto.');
    } finally {
      setIsPreparingProduct(false);
    }
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setCreatingItemNumber(null);
    setCreatingVariationId(null);
    setEditingParentProduct(null);
    setInitialProductData(null);
    setSuggestedCategory(null);
  };

  return {
    quickRegisterTarget,
    setQuickRegisterTarget,
    handleQuickRegisterConfirm,
    isPreparingProduct,
    setIsPreparingProduct,
    creatingItemNumber,
    setCreatingItemNumber,
    creatingVariationId,
    setCreatingVariationId,
    editingParentProduct,
    setEditingParentProduct,
    initialProductData,
    setInitialProductData,
    isProductModalOpen,
    setIsProductModalOpen,
    suggestedCategory,
    setSuggestedCategory,
    editProduct,
    closeProductModal,
  };
}
