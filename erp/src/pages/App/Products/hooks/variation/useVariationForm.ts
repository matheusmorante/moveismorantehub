import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { createProductVariationSubmissionSchema } from '../../../../../../../shared-utils/productVariationValidation';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import type { Product, Variation } from '@/pages/types/product.type';
import {
  saveVariation,
  generateVariationSku,
  parseVariationImages,
} from '@/pages/utils/productService';
import { MAX_VARIATION_IMAGES } from '@/pages/utils/productImageLimits';
import {
  buildProductVariationName,
  computeVariationName,
  getVariationAttributeValuesInNameOrder,
  getVariationNameAttributes,
  isVariationNamePlaceholderSuffix,
} from '@/pages/utils/productVariationDefaults';
import { toast } from 'react-toastify';
import { ecommerceSupabase as supabase } from '@/pages/utils/supabaseConfig';
import { toTitleCase } from '@/pages/utils/textUtils';
import { sortAttributeValuesNaturally } from '@/pages/utils/attributeValueSorting';
import { useVariationPricing } from './useVariationPricing';
import type { VariationTabId, VariationFormOperationGuard } from './variationForm.types';
import { isProductDraft } from '@/pages/utils/productService/productDraftSnapshot';
import { resolveVariationDimensions } from '../../domain/variationRegistrationRules';
import {
  replaceImageUrlAcrossList,
  replaceProductImageGlobally,
} from '../../components/tabs/images/productImageOrdering';
import { getLocalProducts } from '@/pages/utils/productService/productLocalCache';
import { updateProduct } from '@/pages/utils/productService/productMutationService';

interface UseVariationFormOptions {
  isOpen: boolean;
  onClose: () => void;
  parentId?: string;
  parentProduct: Product;
  variation: Variation | null;
  onSuccess?: () => void;
  onSave?: (updatedVariation: Variation) => void | boolean | Promise<void | boolean>;
  isStockistOnly?: boolean;
  onReplaceImageGlobal?: (oldUrl: string, newUrl: string) => void | Promise<void>;
  operationGuard?: VariationFormOperationGuard;
}

export function useVariationForm({
  isOpen,
  onClose,
  parentId,
  parentProduct,
  variation,
  onSuccess,
  onSave,
  isStockistOnly = false,
  onReplaceImageGlobal,
  operationGuard,
}: UseVariationFormOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [referenceErrors, setReferenceErrors] = useState({ attributes: '', images: '' });
  const [referenceLoading, setReferenceLoading] = useState({ attributes: false, images: false });
  const [imageQueryRevision, setImageQueryRevision] = useState(0);
  const identity = JSON.stringify([parentProduct.parentId || parentId || parentProduct.id, variation?.id || 'new']);
  const session = useMemo(() => ({ active: isOpen, lock: false, completed: false, token: Symbol(identity) }), [isOpen, identity]);
  const ownGuards = useRef(new Map<string, VariationFormOperationGuard>());
  if (!ownGuards.current.has(identity)) ownGuards.current.set(identity, { pending: null, error: '' });
  const guard = operationGuard ?? ownGuards.current.get(identity)!;
  const uncertainMessage = 'O salvamento pode ter sido gravado, mas não foi confirmado. Confira a variação e recarregue antes de repetir.';
  useEffect(() => {
    session.active = isOpen;
    if (guard.pending && guard.pending !== session.token) guard.error ||= uncertainMessage;
    setError(guard.error); setLoading(false);
    return () => { session.active = false; if (guard.pending === session.token && !session.completed) guard.error ||= uncertainMessage; };
  }, [session, guard, isOpen]);
  const [activeTab, setActiveTab] = useState<VariationTabId>('identificacao');

  const [dbAttributes, setDbAttributes] = useState<{ id: string; name: string }[]>([
    { id: 'b9d3bcb2-18fb-4c87-8bcc-a59fc4300870', name: 'Cor' },
    { id: 'a50a7b4d-aad6-4dfe-aae0-a909e4b9bc06', name: 'Tamanho' },
  ]);
  const [dbAttributeValues, setDbAttributeValues] = useState<
    { id: string; attribute_id: string; value: string }[]
  >([]);
  const [isManageAttributesOpen, setIsManageAttributesOpen] = useState(false);

  const [formData, setFormData] = useState<Variation | null>(null);
  const isDraft = isProductDraft(parentProduct);
  const isSingleVariation = variation
    ? (parentProduct.variations || []).length === 1
    : (parentProduct.variations || []).length === 0;
  const schema = useMemo(
    () => createProductVariationSubmissionSchema(parentProduct, isSingleVariation),
    [parentProduct, isSingleVariation]
  );
  const { validateAndRun } = useZodForm(schema, { variation: formData ? { ...formData } : {
    id: '', sku: '', name: '', stock: 0, unitPrice: 0, active: false, attributes: [],
  }, discountPercent: '', discountFixed: '' });
  const [allParentImages, setAllParentImages] = useState<string[]>([]);
  const updateFormData = useCallback<React.Dispatch<React.SetStateAction<Variation | null>>>(
    (update) => { if (session.active && !session.lock && !session.completed && !guard.error) setFormData(update); },
    [session, guard]
  );
  const handleClose = useCallback(() => { if (session.active && !session.lock) onClose(); }, [session, onClose]);

  const {
    varDiscountPercent,
    setVarDiscountPercent,
    varDiscountFixed,
    setVarDiscountFixed,
    getParentDiscountPercent,
    getParentDiscountFixed,
    handlePriceChange,
    handleDiscountPercentChange,
    handleDiscountFixedChange,
    handlePromoPriceFieldChange,
  } = useVariationPricing({ formData, setFormData: updateFormData, parentProduct });

  useEffect(() => {
    if (formData) {
      if (formData.title !== formData.name || formData.marketplaceTitle !== formData.name) {
        setFormData((prev) =>
          prev ? { ...prev, title: prev.name, marketplaceTitle: prev.name } : null
        );
      }
    }
  }, [formData?.name]);

  // Sincroniza o nome do pai no início do nome da variação caso o produto pai mude de nome
  // mas preserva o sufixo manual definido pelo usuário.
  useEffect(() => {
    setFormData((previous) => {
      if (!previous) return previous;
      const parentPrefix = (parentProduct.name || parentProduct.description || '').trim();
      if (!parentPrefix) return previous;

      const currentName = (previous.name || '').trim();
      if (!currentName) {
        return { ...previous, name: parentPrefix };
      }
      return previous;
    });
  }, [parentProduct.name, parentProduct.description]);

  // Atualiza a cópia de trabalho da variação enquanto o pai é editado. Isso
  // preserva a prévia correta ao alternar de "Herdado" para "Manual", sem
  // persistir a alteração fora do fluxo normal de salvar.
  useEffect(() => {
    setFormData((previous) => {
      if (!previous) return previous;
      const next = { ...previous };
      let changed = false;
      const inherit = <K extends keyof Variation>(
        field: K,
        enabled: boolean,
        value: Variation[K]
      ) => {
        if (enabled && next[field] !== value) {
          next[field] = value;
          changed = true;
        }
      };
      inherit('unitPrice', Boolean(previous.syncUnitPrice), parentProduct.unitPrice || 0);
      inherit(
        'promoPrice',
        previous.syncPromoPrice !== false && Boolean(previous.syncUnitPrice),
        parentProduct.promoPrice
      );
      inherit('costPrice', Boolean(previous.syncCostPrice), parentProduct.costPrice || 0);
      inherit('description', Boolean(previous.syncDescription), parentProduct.description);
      inherit('width', Boolean(previous.syncWidth), parentProduct.width);
      inherit('height', Boolean(previous.syncHeight), parentProduct.height);
      inherit('depth', Boolean(previous.syncDepth), parentProduct.depth);
      inherit('weight', Boolean(previous.syncWeight), parentProduct.weight);
      if (
        previous.syncFiscal &&
        JSON.stringify(previous.fiscal || {}) !== JSON.stringify(parentProduct.fiscal || {})
      ) {
        next.fiscal = parentProduct.fiscal ? { ...parentProduct.fiscal } : undefined;
        changed = true;
      }
      return changed ? { ...next, ...(isDraft ? { active: false } : {}) } : previous;
    });
  }, [
    parentProduct.unitPrice,
    parentProduct.promoPrice,
    parentProduct.costPrice,
    parentProduct.description,
    parentProduct.width,
    parentProduct.height,
    parentProduct.depth,
    parentProduct.weight,
    parentProduct.fiscal,
    isDraft,
  ]);

  const getDefaultVariationName = (attributes: Variation['attributes'] = []) => {
    const nameAttributes = getVariationNameAttributes(
      attributes
    );
    return computeVariationName(
      parentProduct.name || parentProduct.description || '',
      nameAttributes
    );
  };

  const getDefaultVariationTitle = (attributes: Variation['attributes'] = []) => {
    const parentTitle = (
      parentProduct.title ||
      parentProduct.marketplaceTitle ||
      parentProduct.name ||
      parentProduct.description ||
      ''
    ).trim();
    const nameAttributes = getVariationNameAttributes(
      attributes
    );
    const attributeValues = getVariationAttributeValuesInNameOrder(nameAttributes);
    if (attributeValues.length > 0) {
      return toTitleCase(buildProductVariationName(parentTitle, attributeValues.join(' ')));
    }
    return toTitleCase(parentTitle);
  };

  const fetchDbAttributes = useCallback(async () => {
    if (!session.active || session.lock) return;
    setReferenceLoading((previous) => ({ ...previous, attributes: true }));
    setReferenceErrors((previous) => ({ ...previous, attributes: '' }));
    try {
      const result = await withTimeout(Promise.all([
        supabase.from('attributes').select('*').order('name'),
        supabase.from('attribute_values').select('*').order('value'),
      ]), 10000, null, 'variacao:atributos');
      if (!session.active) return;
      if (!result || result.some((response) => response.error || !Array.isArray(response.data))) throw new Error('Não foi possível carregar os atributos. Consulte novamente.');
      const [attrRes, valRes] = result;
      setDbAttributes(attrRes.data as { id: string; name: string }[]);
      setDbAttributeValues(
        sortAttributeValuesNaturally(
          (valRes.data || []) as { id: string; attribute_id: string; value: string }[]
        )
      );
    } catch {
      if (session.active) setReferenceErrors((previous) => ({ ...previous, attributes: 'Não foi possível carregar os atributos. Consulte novamente.' }));
    } finally {
      if (session.active) setReferenceLoading((previous) => ({ ...previous, attributes: false }));
    }
  }, [session]);

  useEffect(() => {
    let accepting = true;
    if (isOpen) {
      setAllParentImages([]);
      setReferenceLoading((previous) => ({ ...previous, images: true }));
      setReferenceErrors((previous) => ({ ...previous, images: '' }));
      const realParentId = parentProduct?.parentId || parentId || parentProduct?.id;
      if (realParentId) {
        void withTimeout(supabase
          .from('product_images')
          .select('image_url')
          .eq('product_id', realParentId)
          .order('created_at', { ascending: true }), 10000, null, 'variacao:fotos-pai')
          .then((response) => {
            if (!session.active || !accepting) return;
            if (!response || response.error || !Array.isArray(response.data)) throw new Error('Fotos não confirmadas.');
            const databaseImages = response.data.map((i) => i.image_url).filter(Boolean);
            const formImages = (parentProduct?.images || []).filter(Boolean);
            setAllParentImages(Array.from(new Set([...databaseImages, ...formImages])));
          }).catch(() => { if (session.active && accepting) setReferenceErrors((previous) => ({ ...previous, images: 'Não foi possível carregar as fotos do produto pai. Consulte novamente.' })); })
          .finally(() => { if (session.active && accepting) setReferenceLoading((previous) => ({ ...previous, images: false })); });
      } else {
        setAllParentImages(parentProduct.images || []);
        setReferenceLoading((previous) => ({ ...previous, images: false }));
      }
    }
    return () => { accepting = false; };
  }, [isOpen, session, parentProduct.parentId, parentProduct.id, parentProduct.images, parentId, imageQueryRevision]);

  useEffect(() => {
    if (isOpen) {
      fetchDbAttributes();
      setActiveTab(
        isSingleVariation && Boolean(variation) && !isStockistOnly ? 'fotos' : 'identificacao'
      );
      if (variation) {
        const existingImages = parseVariationImages((variation as any).image_url, variation.images);
        const defaultImages = isSingleVariation
          ? (allParentImages.length > 0 ? allParentImages : parentProduct.images || []).slice(0, MAX_VARIATION_IMAGES)
          : [];
        const resolvedImages = existingImages.length > 0
          ? existingImages.slice(0, MAX_VARIATION_IMAGES)
          : defaultImages;

        setFormData({
          ...variation,
          status: variation.status === 'draft' ? 'hidden' : variation.status || 'hidden',
          ...(isDraft ? { active: false } : {}),
          title: variation.title || variation.marketplaceTitle || '',
          images: resolvedImages,
          syncUnitPrice: isSingleVariation || (variation.syncUnitPrice ?? true),
          syncPromoPrice: isSingleVariation || (variation.syncPromoPrice ?? true),
          syncDescription: isSingleVariation || (variation.syncDescription ?? true),
          syncCostPrice: isSingleVariation || (variation.syncCostPrice ?? true),
          syncCondition: isSingleVariation || (variation.syncCondition ?? true),
          syncFiscal: isSingleVariation || (variation.syncFiscal ?? true),
          syncWithParent: isSingleVariation || (variation.syncWithParent ?? true),
          syncDimensions: isSingleVariation || (variation.syncDimensions ?? true),
          syncWidth: isSingleVariation || (variation.syncWidth ?? true),
          syncHeight: isSingleVariation || (variation.syncHeight ?? true),
          syncDepth: isSingleVariation || (variation.syncDepth ?? true),
          syncWeight: isSingleVariation || (variation.syncWeight ?? true),
          syncIpi: isSingleVariation || (variation.syncIpi ?? true),
          syncFreight: isSingleVariation || (variation.syncFreight ?? true),
        });

        const orig = Number(
          variation.syncUnitPrice ? parentProduct.unitPrice : variation.unitPrice || 0
        );
        const promo = Number(
          variation.syncUnitPrice ? parentProduct.promoPrice : variation.promoPrice || 0
        );
        if (orig > 0 && promo > 0 && promo < orig) {
          const fixed = orig - promo;
          const pct = (fixed / orig) * 100;
          setVarDiscountFixed(fixed.toFixed(2));
          setVarDiscountPercent(pct.toFixed(1));
        } else {
          setVarDiscountPercent('');
          setVarDiscountFixed('');
        }
      } else {
        const parentCode = parentProduct.code || '000000';
        const defaultImages = isSingleVariation
          ? (allParentImages.length > 0 ? allParentImages : parentProduct.images || []).slice(0, MAX_VARIATION_IMAGES)
          : [];

        setFormData({
          id: crypto.randomUUID(),
          sku: generateVariationSku(parentCode, parentProduct.variations || []),
          name: getDefaultVariationName([]),
          title: getDefaultVariationTitle([]),
          marketplaceTitle: getDefaultVariationTitle([]),
          stock: 0,
          unitPrice: parentProduct.unitPrice || 0,
          costPrice: parentProduct.costPrice || 0,
          active: false,
          status: 'hidden',
          attributes: [],
          images: defaultImages,
          syncUnitPrice: true,
          syncDescription: true,
          syncCostPrice: true,
          syncFiscal: true,
          syncWidth: true,
          syncHeight: true,
          syncDepth: true,
          syncWeight: true,
          fiscal: {
            ncm: parentProduct.fiscal?.ncm || '',
            cest: parentProduct.fiscal?.cest || '',
            origem: parentProduct.fiscal?.origem || '0',
            cst: parentProduct.fiscal?.cst || '',
            cfop: parentProduct.fiscal?.cfop || '',
            pisCst: parentProduct.fiscal?.pisCst || '',
            cofinsCst: parentProduct.fiscal?.cofinsCst || '',
            icmsPercent: parentProduct.fiscal?.icmsPercent || 0,
            ncmDescription: parentProduct.fiscal?.ncmDescription || '',
          },
        });
        setVarDiscountPercent('');
        setVarDiscountFixed('');
      }
    }
    // A inicialização deve ocorrer apenas ao abrir ou trocar a variação (pelo ID).
    // Alterar o pai durante a edição é tratado pelos efeitos de sincronização acima,
    // sem apagar os atributos que já foram informados.
  }, [identity, isOpen, isStockistOnly, isDraft]);

  const handleChange = <K extends keyof Variation>(field: K, value: Variation[K]) => {
    updateFormData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const updateCost = (fields: Partial<Variation>) => {
    updateFormData((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...fields, syncCostPrice: false };
      const cost = next.costPrice || 0;
      const ipi = next.ipiPercent || 0;
      const freight = next.freightCost || 0;
      const freightType = next.freightType || 'fixed';

      let finalCost = cost + cost * (ipi / 100);
      if (freightType === 'fixed') {
        finalCost += freight;
      } else {
        finalCost += cost * (freight / 100);
      }

      next.finalPurchasePrice = Number(finalCost.toFixed(2));
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || !session.active || session.lock || session.completed || guard.error) return;

    const cleanAttributes = (Array.isArray(formData.attributes) ? formData.attributes : [])
      .map((attr) => ({
        ...attr,
        name: toTitleCase(attr.name),
        value: toTitleCase(attr.value),
      }));
    const parentPrefix = (parentProduct.name || parentProduct.description || '').trim();
    const nameAttributes = getVariationNameAttributes(
      cleanAttributes
    );
    const generatedName = computeVariationName(parentPrefix, nameAttributes);
    let variationName = (formData.name || '').trim();
    const nameSuffix =
      parentPrefix && variationName.toLowerCase().startsWith(parentPrefix.toLowerCase())
        ? variationName.slice(parentPrefix.length).replace(/^[\s\-_:]+/, '')
        : variationName;
    if (!variationName || isVariationNamePlaceholderSuffix(nameSuffix)) {
      variationName = generatedName;
    }
    if (variationName.toLocaleLowerCase() === parentPrefix.toLocaleLowerCase()) {
      variationName = generatedName;
    }
    if (parentPrefix) {
      if (!variationName.toLowerCase().startsWith(parentPrefix.toLowerCase())) {
        variationName = buildProductVariationName(parentPrefix, variationName);
      }
    }

    const resolvedVariationImages = (
      formData.images && formData.images.length > 0
        ? formData.images
        : isSingleVariation
          ? (allParentImages.length > 0 ? allParentImages : parentProduct.images || [])
          : []
    ).slice(0, MAX_VARIATION_IMAGES);

    const finalVariation: Variation = {
      ...formData,
      images: resolvedVariationImages,
      ...(isSingleVariation
        ? {
            syncUnitPrice: true,
            syncPromoPrice: true,
            syncDescription: true,
            syncCostPrice: true,
            syncCondition: true,
            syncFiscal: true,
            syncWithParent: true,
            syncDimensions: true,
            syncWidth: true,
            syncHeight: true,
            syncDepth: true,
            syncWeight: true,
            syncIpi: true,
            syncFreight: true,
            images: resolvedVariationImages,
            unitPrice: parentProduct.unitPrice || 0,
            promoPrice: parentProduct.promoPrice || 0,
            costPrice: parentProduct.costPrice || 0,
            condition: parentProduct.condition || 'novo',
            description: parentProduct.description || '',
            fiscal: parentProduct.fiscal ? { ...parentProduct.fiscal } : undefined,
            width: parentProduct.width || 0,
            height: parentProduct.height || 0,
            depth: parentProduct.depth || 0,
            weight: parentProduct.weight || 0,
            ipiPercent: parentProduct.ipiPercent || 0,
            ipiType: parentProduct.ipiType || 'percentage',
            freightCost: parentProduct.freightCost || 0,
            freightType: parentProduct.freightType || 'fixed',
            finalPurchasePrice: parentProduct.finalPurchasePrice || 0,
          }
        : {}),
      attributes: cleanAttributes,
      name: toTitleCase(variationName),
      title: toTitleCase(variationName),
      marketplaceTitle: toTitleCase(variationName),
    };

    Object.assign(finalVariation, resolveVariationDimensions(parentProduct, finalVariation));

    if (finalVariation.syncDescription) {
      finalVariation.description = parentProduct.description || '';
    }
    if (finalVariation.syncWeight) {
      finalVariation.weight = parentProduct.weight || 0;
    }
    if (finalVariation.syncUnitPrice) {
      finalVariation.unitPrice = parentProduct.unitPrice || 0;
      if (finalVariation.syncPromoPrice !== false) finalVariation.promoPrice = parentProduct.promoPrice || 0;
    }
    if (finalVariation.syncCostPrice) {
      finalVariation.costPrice = parentProduct.costPrice || 0;
    }
    finalVariation.status = finalVariation.status === 'published' ? 'published' : 'hidden';
    finalVariation.active = isDraft ? false : formData.status === 'draft'
      ? parentProduct.active !== false : formData.active;
    finalVariation.sku ||= generateVariationSku(parentProduct.code || '000000', parentProduct.variations || []);

    session.lock = true; setLoading(true); setError('');
    let accepting = true;
    const stillCurrent = () => session.active && accepting && !guard.error;
    try {
      await validateAndRun({ variation: finalVariation, discountPercent: varDiscountPercent, discountFixed: varDiscountFixed }, async (values) => {
        if (!stillCurrent()) return;
        guard.pending = session.token;
        const variationToSave: Variation = values.variation;
        const result = await withTimeout(Promise.resolve().then(async () => {
          if (!stillCurrent()) return { cancelled: true, value: false };
          const value = onSave ? await onSave(variationToSave)
            : await saveVariation(parentProduct.parentId || parentId || parentProduct.id || '', variationToSave);
          return { cancelled: false, value };
        }), 60000, null, 'variacao:salvar-formulario');
        if (!result) {
          guard.error = uncertainMessage;
          throw new Error(uncertainMessage);
        }
        if (!stillCurrent() || result.cancelled) return;
        if (result.value === false) { setError('A variação não foi salva. Confira os dados e tente novamente.'); return; }
        session.completed = true; guard.pending = null;
        setFormData(variationToSave);
        toast.success('Variação salva com sucesso!');
        try { onSuccess?.(); onClose(); }
        catch { setError('Variação salva, mas a tela não foi atualizada. Recarregue a página.'); }
      }, (errors) => {
      if (!session.active) return;
      const flattened = flattenFormErrors(errors);
      const message = Object.values(flattened)[0] || 'Confira os dados da variação.';
      setError(message); toast.error(message);
      const fields = Object.keys(flattened).map((field) => field.replace(/^variation_/, ''));
      const tab = ['identificacao', 'tecnico', 'estoque', 'compostos'].find((value) => fields.includes(value));
      const hasComboError = fields.some((field) => field.startsWith('comboItems'));
      const hasAttributeError = fields.some((field) => field.startsWith('attributes'));
      setActiveTab((tab || (hasComboError ? 'compostos' : hasAttributeError ? 'identificacao' : 'estoque')) as VariationTabId);
      });
    } catch (failure) {
      const reason = failure as { uncertain?: boolean; code?: string; status?: number; message?: string };
      if (reason?.uncertain || reason?.code?.startsWith('08') || (reason?.status ?? 0) >= 500 || /failed to fetch|network|timeout|tempo.*esgot/i.test(reason?.message || '')) guard.error = uncertainMessage;
      if (session.active) { const message = guard.error || 'Erro ao salvar a variação.'; setError(message); toast.error(message); }
    } finally {
      accepting = false; session.lock = false;
      if (guard.pending === session.token) guard.pending = null;
      if (session.active) setLoading(false);
    }
  };

  const handleReplaceImageGlobal = useCallback(
    async (oldUrl: string, newUrl: string) => {
      if (!session.active || session.lock || session.completed || guard.error) throw new Error('O contexto da variação mudou. Reabra as fotos antes de substituir a imagem.');
      // 1. Atualiza formData da variação se ela tiver a imagem
      setFormData((prev) => {
        if (!prev) return prev;
        const currentImages =
          prev.images && prev.images.length > 0
            ? prev.images
            : (allParentImages.length > 0 ? allParentImages : parentProduct?.images || []).slice(
                0,
                MAX_VARIATION_IMAGES
              );
        const updated = replaceImageUrlAcrossList(currentImages, oldUrl, newUrl);
        return {
          ...prev,
          images: updated,
        };
      });

      // 2. Atualiza allParentImages da variação
      setAllParentImages((prev) => replaceImageUrlAcrossList(prev, oldUrl, newUrl));

      // 3. Propaga globalmente para o form pai (ex.: ProductFormModal) se fornecido
      if (onReplaceImageGlobal) {
        await onReplaceImageGlobal(oldUrl, newUrl);
      } else {
        // Fallback para edição standalone fora de ProductFormModal (ex.: Products/Index.tsx)
        const realParentId = parentProduct?.parentId || parentId || parentProduct?.id;
        if (realParentId) {
          try {
            const localProducts = getLocalProducts();
            const parent = localProducts.find(
              (p) => String(p.id).toLowerCase() === String(realParentId).toLowerCase()
            );
            if (parent) {
              const updatedParent = replaceProductImageGlobally(parent, oldUrl, newUrl);
              await updateProduct(realParentId, {
                images: updatedParent.images,
                variations: updatedParent.variations,
              });
            }
          } catch (err) {
            console.warn('[VariationForm] Falha ao sincronizar substituição global no produto pai:', err);
          }
        }
      }
    },
    [allParentImages, parentProduct, parentId, onReplaceImageGlobal, session, guard]
  );

  return {
    handleClose,
    loading,
    error,
    blocked: Boolean(guard.error) || session.completed,
    referenceErrors,
    referenceLoading,
    retryReferences: () => { if (session.active && !session.lock) { void fetchDbAttributes(); setImageQueryRevision((value) => value + 1); } },
    activeTab,
    setActiveTab,
    formData,
    setFormData: updateFormData,
    allParentImages,
    dbAttributes,
    dbAttributeValues,
    isManageAttributesOpen,
    setIsManageAttributesOpen,
    fetchDbAttributes,
    varDiscountPercent,
    varDiscountFixed,
    getParentDiscountPercent,
    getParentDiscountFixed,
    getDefaultVariationName,
    getDefaultVariationTitle,
    handlePriceChange,
    handleDiscountPercentChange,
    handleDiscountFixedChange,
    handlePromoPriceFieldChange,
    handleChange,
    updateCost,
    handleSubmit,
    handleReplaceImageGlobal,
  };
}
