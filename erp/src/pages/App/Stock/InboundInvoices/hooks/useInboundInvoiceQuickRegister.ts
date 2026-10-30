import { useEffect, useRef, useState } from 'react';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { itemCostWithAdditionalCosts } from '@/pages/utils/inboundNfe/inboundItemCosts';
import { createInboundQuickRegisterReuseSchema, createInboundQuickRegisterSchema } from '../../../../../../../shared-utils/inboundProductLinkFormSchemas';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import type Product from '@/pages/types/product.type';
import { findInboundProductNameMatches, findProductByVariationBarcode, getFullProduct, saveProduct, saveVariation } from '@/pages/utils/productService';
import { updateProduct } from '@/pages/utils/productService/productMutationService';
import { findProductSupplierCodes, saveProductSupplierCode } from '@/pages/utils/productSupplierCodesService';
import { getCompleteQuickVariationName, getInboundGtin, hasSiblingVariationName, normalizeNcm, withOwnInboundVariationCost } from '../../../../../../../shared-utils/inboundQuickRegisterRules';
import { getDefaultShowNameForVariationOverride } from '../../../../../../../shared-utils/productVariationAttributeDefaults';
import {
  prepareNewParentWithVariation,
  prepareExistingParentNewVariation,
} from '../services/inboundProductPreparationService';
import type {
  QuickRegisterItem,
  QuickRegisterDuplicateCandidate,
  QuickRegisterSelection,
} from '../modals/QuickRegisterVariationModal';
import { toast } from 'react-toastify';

export function useInboundInvoiceQuickRegister(
  supplierId: string | undefined,
  items: readonly InboundInvoiceItem[],
  onChange: (itemNumber: number, update: Partial<InboundInvoiceItem>) => void | boolean | Promise<void | boolean>,
  contextKey = '',
) {
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
  const [duplicateCandidate, setDuplicateCandidate] = useState<QuickRegisterDuplicateCandidate | null>(null);
  const [nameMatches, setNameMatches] = useState<string[]>([]);
  const sourceItem = items.find((item) => item.itemNumber === quickRegisterTarget?.itemNumber);
  const sourceSnapshot = JSON.stringify(sourceItem);
  const context = useRef({ supplierId, target: quickRegisterTarget, sourceSnapshot, contextKey });
  if (context.current.supplierId !== supplierId || context.current.target !== quickRegisterTarget || context.current.sourceSnapshot !== sourceSnapshot || context.current.contextKey !== contextKey) {
    context.current = { supplierId, target: quickRegisterTarget, sourceSnapshot, contextKey };
  }
  const active = useRef(true), inFlight = useRef(false);
  // A saved product is reused if only linking fails; an uncertain write must be checked before another creation.
  const progress = useRef(new Map<string, { signature: string; product?: Product; variationId?: string; saved: boolean; parentNcmUpdated?: boolean; blocked?: string }>());
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => { setDuplicateCandidate(null); setNameMatches([]); }, [quickRegisterTarget]);
  const preparationForm = useZodForm(createInboundQuickRegisterSchema(items.map((item) => item.itemNumber)), {
    itemNumber: quickRegisterTarget?.itemNumber || 0, supplierId: supplierId || '',
    item: { ...quickRegisterTarget?.item, productCode: quickRegisterTarget?.item.productCode || '', productDescription: quickRegisterTarget?.item.productDescription || '', quantity: quickRegisterTarget?.item.quantity || 0, unitCost: quickRegisterTarget?.item.unitCost ?? 0 },
    selection: { mode: 'SIMPLE' },
  });
  const reuseForm = useZodForm(createInboundQuickRegisterReuseSchema(items.map((item) => item.itemNumber)), {
    itemNumber: quickRegisterTarget?.itemNumber || 0,
    supplierId: supplierId || '',
    item: { ...quickRegisterTarget?.item, productCode: quickRegisterTarget?.item.productCode || '', productDescription: quickRegisterTarget?.item.productDescription || '', quantity: quickRegisterTarget?.item.quantity || 0, unitCost: quickRegisterTarget?.item.unitCost ?? 0 },
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
        item: { ...quickRegisterTarget?.item, productCode: quickRegisterTarget?.item.productCode || '', productDescription: quickRegisterTarget?.item.productDescription || '', quantity: quickRegisterTarget?.item.quantity || 0, unitCost: quickRegisterTarget?.item.unitCost ?? 0 }, selection,
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
        const base = JSON.stringify([contextKey, data.supplierId, data.itemNumber, data.item.productCode.toLocaleUpperCase('pt-BR')]);
        const signature = JSON.stringify([data.item, data.selection]);
        const previous = progress.current.get(base);
        if (previous?.blocked) throw new Error(previous.blocked);
        if (previous?.saved && previous.signature !== signature) {
          throw new Error('O produto já foi cadastrado. Confira o vínculo antes de criar outro.');
        }
        const attempt = previous?.signature === signature ? previous : { signature, saved: false } as NonNullable<typeof previous>;
        progress.current.set(base, attempt);
        let writing = false;
        const pending = (async () => {
          if (!attempt.saved) {
            const mappings = await findProductSupplierCodes(data.supplierId, [data.item.productCode]);
            assertCurrent();
            const existingMapping = mappings.get(data.item.productCode.toLocaleUpperCase('pt-BR'));
            if (existingMapping) {
              const existingProduct = await getFullProduct(existingMapping.productId);
              assertCurrent();
              const existingVariation = existingProduct?.variations?.find((candidate) => candidate.id === existingMapping.productVariationId)
                || (!existingMapping.productVariationId && existingProduct?.variations?.length === 1 ? existingProduct.variations[0] : undefined);
              setDuplicateCandidate({
                productId: existingMapping.productId,
                productName: existingProduct?.name || existingProduct?.title || existingMapping.supplierDescription || 'Produto cadastrado',
                variationId: existingVariation?.id || existingMapping.productVariationId,
                variationName: existingVariation?.name,
                reason: 'supplier-code',
              });
              throw new Error('Este código do fornecedor já está cadastrado. Reutilize o produto localizado.');
            }
            const barcode = getInboundGtin(data.item.ean, data.item.eanTrib);
            if (barcode) {
              const barcodeMatch = await findProductByVariationBarcode(barcode);
              assertCurrent();
              if (barcodeMatch?.product.id && barcodeMatch.variation.id) {
                setDuplicateCandidate({
                  productId: barcodeMatch.product.id,
                  productName: barcodeMatch.product.name || barcodeMatch.product.title || 'Produto cadastrado',
                  variationId: barcodeMatch.variation.id,
                  variationName: barcodeMatch.variation.name,
                  reason: 'gtin',
                });
                throw new Error('Este GTIN já está cadastrado. Reutilize o produto localizado.');
              }
            }

            const proposedName = data.selection.mode === 'EXISTING_PARENT'
              ? data.selection.variationFullName || data.selection.nameSuffix || ''
              : data.selection.name || '';
            const matches = await findInboundProductNameMatches(proposedName);
            assertCurrent();
            setNameMatches(matches);
            if (matches.length && !data.selection.duplicateNameConfirmed) {
              throw new Error('Há cadastros com nome semelhante. Revise a lista e confirme antes de criar outro.');
            }

            if (data.selection.mode === 'EXISTING_PARENT') {
              const parent = await getFullProduct(data.selection.parentProductId!);
              assertCurrent();
              if (!parent || parent.id !== data.selection.parentProductId || parent.deleted || parent.isVariation || parent.active === false || parent.itemType !== 'product') {
                throw new Error('Produto pai não encontrado ou indisponível.');
              }
              if (!(parent.supplierIds || []).includes(data.supplierId) && (parent.mainSupplierId || parent.supplierId) !== data.supplierId) {
                throw new Error('O produto pai não pertence mais ao fornecedor da nota. Selecione outro produto.');
              }
              const parentName = parent.name || parent.description || '';
              const fullVariationName = data.selection.variationFullName || getCompleteQuickVariationName(parentName, data.selection.nameSuffix || '');
              if (hasSiblingVariationName(parent.variations || [], parentName, fullVariationName)) {
                throw new Error('O nome completo da variação já existe no produto pai.');
              }
              if (normalizeNcm(parent.fiscal?.ncm) !== normalizeNcm(data.item.ncm) && data.item.ncm && !data.selection.ncmResolution) {
                throw new Error('Resolva a divergência entre o NCM da nota e o produto pai.');
              }
              let parentForVariation = parent;
              if (data.selection.ncmResolution === 'update-parent' && data.item.ncm && !attempt.parentNcmUpdated) {
                const fiscal = { ...(parent.fiscal || {}), ncm: data.item.ncm };
                assertCurrent(); writing = true;
                await updateProduct(parent.id!, { fiscal });
                attempt.parentNcmUpdated = true;
                writing = false;
                parentForVariation = { ...parent, fiscal };
              } else if (data.selection.ncmResolution === 'update-parent' && data.item.ncm) {
                parentForVariation = { ...parent, fiscal: { ...(parent.fiscal || {}), ncm: data.item.ncm } };
              }
              const attributes = Object.entries(data.selection.technicalValues || {})
                .filter(([, value]) => value !== undefined && value !== null && String(value).trim())
                .map(([name, value]) => ({ name, value: String(value), showName: getDefaultShowNameForVariationOverride(name) }));
              const prepared = await prepareExistingParentNewVariation(parentForVariation, { ...data.item, finalCost: data.selection.costPrice ?? data.item.finalCost }, {
                name: fullVariationName,
                barcode: barcode || undefined,
                technicalValues: data.selection.technicalValues,
                attributes,
                ncmResolution: data.selection.ncmResolution,
              });
              const lastVariationIndex = prepared.variations!.length - 1;
              const variation = withOwnInboundVariationCost(
                prepared.variations![lastVariationIndex]!,
                data.selection.costPrice ?? data.item.finalCost ?? data.item.unitCost ?? 0
              );
              prepared.variations![lastVariationIndex] = variation;
              assertCurrent(); writing = true;
              const hasUnmaterializedVariation = !parent.variations?.length || parent.variations.some((existing) =>
                existing.isVirtual || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(existing.id || '')
              );
              if (hasUnmaterializedVariation) {
                const savedId = await saveProduct(prepared);
                if (savedId !== parent.id) throw new Error('Não foi possível preservar a variação atual do produto pai.');
              } else {
                await saveVariation(parent.id!, variation);
              }
              attempt.product = { ...prepared, ...(data.selection.ncmResolution === 'update-parent' && data.item.ncm ? { fiscal: { ...(parent.fiscal || {}), ncm: data.item.ncm } } : {}) };
              attempt.variationId = variation.id;
            } else {
              const components = data.selection.mode === 'COMPOSITION' ? data.selection.components || [] : undefined;
              const prepared = await prepareNewParentWithVariation(data.item, data.supplierId, assertCurrent, {
                name: data.selection.name,
                categoryId: data.selection.categoryId,
                ncm: data.selection.ncm,
                costPrice: data.selection.costPrice,
                barcode: barcode || undefined,
                itemType: data.selection.mode === 'COMPOSITION' ? 'composition' : 'product',
                components,
              });
            const product = {
              ...prepared, id: crypto.randomUUID(), unit: data.item.unit || 'UN', itemType: 'product',
              active: true, isDraft: false, status: 'hidden', unitPrice: 0, stock: 0, hasVariations: false,
              ecommerceSync: false, whatsappSync: false,
            } as Product;
            if (data.selection.mode === 'COMPOSITION') {
              product.itemType = 'composition';
              product.isCombo = true;
              product.comboItems = components || [];
            }
            assertCurrent(); writing = true;
            const id = await saveProduct(product);
            if (id !== product.id) throw new Error('O cadastro não retornou a identidade esperada.');
            attempt.product = product;
            attempt.variationId = product.variations?.[0]?.id;
            }
            attempt.saved = true; writing = false;
          }
          assertCurrent();
          const product = attempt.product!;
          const saved = await getFullProduct(product.id!);
          assertCurrent();
          const variation = saved?.variations?.find((candidate) => candidate.id === attempt.variationId);
          if (!saved || saved.deleted || !variation) throw new Error('Produto cadastrado, mas ainda não foi possível conferir a variação. Confira o cadastro antes de continuar.');
          const isComposition = sourceItem?.linkMode === 'composition';
          const existingCompositionLinks = sourceItem?.compositionLinks || [];
          if (isComposition && existingCompositionLinks.some((link) =>
            link.productId === saved.id && link.variationId === variation.id
          )) {
            throw new Error('Este produto já está na composição.');
          }
          writing = true;
          await saveProductSupplierCode({ supplierId: data.supplierId, productId: saved.id!, productVariationId: variation.id,
            supplierProductCode: data.item.productCode, supplierDescription: data.item.productDescription });
          assertCurrent();
          const mappings = await findProductSupplierCodes(data.supplierId, [data.item.productCode]);
          assertCurrent();
          const confirmed = mappings.get(data.item.productCode.toLocaleUpperCase('pt-BR'));
          if (!confirmed || confirmed.productId !== saved.id || confirmed.productVariationId !== variation.id) throw new Error('Não foi possível confirmar o vínculo do fornecedor.');
          const productErpName = variation.name || saved.name || saved.title || 'Produto';
          const linkedProductCode = variation.sku || saved.code || '';
          const applied = await onChange(data.itemNumber, {
            linkMode: isComposition ? 'composition' : 'single',
            matchedProductId: isComposition ? undefined : saved.id,
            matchedVariationId: isComposition ? undefined : variation.id,
            compositionLinks: isComposition
              ? [
                  ...existingCompositionLinks,
                  {
                    id: crypto.randomUUID(),
                    productId: saved.id,
                    variationId: variation.id,
                    productErpName,
                    linkedProductCode,
                    sellingPrice: Number(variation.unitPrice || saved.unitPrice || 0),
                    quantityMultiplier: 1,
                  },
                ]
              : [],
            linkedProductCode,
            productErpName,
          });
          if (applied === false) throw new Error('Não foi possível confirmar o vínculo no item da nota.');
          writing = false;
          return true;
        })();
        try {
          const confirmed = await withTimeout(pending, 45000, false, 'cadastro rápido e vínculo');
          if (!confirmed) throw new Error('O cadastro demorou demais. Confira os produtos e os vínculos antes de repetir.');
        } catch (failure) {
          if (writing) attempt.blocked = 'A gravação não foi confirmada. Confira o cadastro e os vínculos antes de criar novamente.';
          throw new Error(attempt.blocked || (failure instanceof Error ? failure.message : 'Não foi possível cadastrar e vincular.'), { cause: failure });
        }
        if (active.current) {
          setQuickRegisterTarget(null);
          setDuplicateCandidate(null);
          setNameMatches([]);
          toast.success('Produto cadastrado e vinculado à nota fiscal.');
        }
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

  const handleReuseDuplicate = async () => {
    if (inFlight.current || !duplicateCandidate) return false;
    inFlight.current = true;
    const submittedContext = context.current;
    let expired = false, writing = false;
    const assertCurrent = () => {
      if (expired || !active.current || submittedContext !== context.current) throw new Error('O item ou fornecedor mudou. Reabra o cadastro rápido.');
    };
    let validationError = 'Selecione o item da nota.';
    try {
      const result = await reuseForm.validateAndRun({
        itemNumber: quickRegisterTarget?.itemNumber || 0,
        supplierId: supplierId || '',
        item: { ...quickRegisterTarget?.item, productCode: quickRegisterTarget?.item.productCode || '', productDescription: quickRegisterTarget?.item.productDescription || '', quantity: quickRegisterTarget?.item.quantity || 0, unitCost: quickRegisterTarget?.item.unitCost ?? 0 },
      }, async (data) => {
        assertCurrent();
        if (!sourceItem || data.item.productDescription !== sourceItem.productDescription.trim() || data.item.productCode !== sourceItem.productCode.trim() || data.item.quantity !== sourceItem.quantity || data.item.unitCost !== sourceItem.unitCost || data.item.ncm !== sourceItem.ncm?.trim()) throw new Error('O item da nota mudou. Reabra o cadastro rápido.');
        const product = await getFullProduct(duplicateCandidate.productId);
        assertCurrent();
        const variation = product?.variations?.find((candidate) => candidate.id === duplicateCandidate.variationId)
          || (!duplicateCandidate.variationId && product?.variations?.length === 1 ? product.variations[0] : undefined);
        if (!product || product.deleted || !variation) throw new Error('O cadastro localizado não está mais disponível. Pesquise outro produto.');
        const code = data.item.productCode.trim();
        if (duplicateCandidate.reason === 'supplier-code') {
          const mappings = await findProductSupplierCodes(data.supplierId, [code]);
          assertCurrent();
          const mapping = mappings.get(code.toLocaleUpperCase('pt-BR'));
          const variationMatches = mapping?.productVariationId === variation.id
            || (!mapping?.productVariationId && product.variations?.length === 1 && product.variations[0].id === variation.id);
          if (!mapping || mapping.productId !== product.id || !variationMatches) throw new Error('O código do fornecedor foi alterado. Consulte os vínculos novamente.');
        } else {
          writing = true;
          await saveProductSupplierCode({ supplierId: data.supplierId, productId: product.id!, productVariationId: variation.id, supplierProductCode: code, supplierDescription: data.item.productDescription });
          assertCurrent();
          const mappings = await findProductSupplierCodes(data.supplierId, [code]);
          assertCurrent();
          const mapping = mappings.get(code.toLocaleUpperCase('pt-BR'));
          if (!mapping || mapping.productId !== product.id || mapping.productVariationId !== variation.id) throw new Error('Não foi possível confirmar o vínculo do fornecedor.');
        }
        const applied = await onChange(data.itemNumber, { matchedProductId: product.id, matchedVariationId: variation.id, linkedProductCode: variation.sku || product.code, productErpName: variation.name || product.name || product.title });
        if (applied === false) throw new Error('Não foi possível confirmar o vínculo no item da nota.');
        writing = false;
        setQuickRegisterTarget(null);
        setDuplicateCandidate(null);
        toast.success('Cadastro localizado e vinculado à nota fiscal.');
        return true;
      }, (errors) => { validationError = Object.values(flattenFormErrors(errors))[0] || validationError; });
      if (!result) throw new Error(validationError);
      return true;
    } catch (failure) {
      if (writing && active.current) setDuplicateCandidate(duplicateCandidate);
      if (active.current && context.current === submittedContext) toast.error(failure instanceof Error ? failure.message : 'Não foi possível reutilizar o cadastro.');
      return false;
    } finally {
      expired = true;
      inFlight.current = false;
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
    handleReuseDuplicate,
    duplicateCandidate,
    nameMatches,
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
