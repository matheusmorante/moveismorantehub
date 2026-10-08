import { useState, useEffect, useRef, useCallback } from 'react';
import type { Product, Variation } from '@/pages/types/product.type';
import {
  saveVariation,
  saveProduct,
  generateVariationSku,
  parseVariationImages,
} from '@/pages/utils/productService';
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
import type { VariationTabId } from './variationForm.types';
import { isProductDraft } from '@/pages/utils/productService/productDraftSnapshot';
import { useVariationDraftAutoSave } from './useVariationDraftAutoSave';
import { getVariationRegistrationIssue, resolveVariationDimensions } from '../../domain/variationRegistrationRules';

interface UseVariationFormOptions {
  isOpen: boolean;
  onClose: () => void;
  parentId?: string;
  parentProduct: Product;
  variation: Variation | null;
  onSuccess?: () => void;
  onSave?: (updatedVariation: Variation) => void;
  onDraftChange?: (updatedVariation: Variation) => void;
  onDraftSave?: (updatedVariation: Variation) => Promise<boolean>;
  isStockistOnly?: boolean;
}

export function useVariationForm({
  isOpen,
  onClose,
  parentId,
  parentProduct,
  variation,
  onSuccess,
  onSave,
  onDraftChange,
  onDraftSave,
  isStockistOnly = false,
}: UseVariationFormOptions) {
  const [loading, setLoading] = useState(false);
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
  const [allParentImages, setAllParentImages] = useState<string[]>([]);
  const [diferenciarTitulo, setDiferenciarTitulo] = useState<boolean>(false);
  const isDraft = isProductDraft(parentProduct);
  const isSingleVariation = variation
    ? (parentProduct.variations || []).length === 1
    : (parentProduct.variations || []).length === 0;
  const updateFormData = useCallback<React.Dispatch<React.SetStateAction<Variation | null>>>((update) => {
    setFormData((previous) => {
      const next = typeof update === 'function' ? update(previous) : update;
      if (!next || next === previous) return next;
      return isDraft ? { ...next, status: 'draft', active: false } : next;
    });
  }, [isDraft]);
  const savedParentVersion = useRef(parentProduct.updatedAt);
  useEffect(() => {
    savedParentVersion.current = parentProduct.updatedAt;
  }, [parentProduct.id, parentProduct.updatedAt]);

  const draftAutoSave = useVariationDraftAutoSave({
    isOpen,
    isDraft,
    variation: formData,
    onChange: onDraftChange,
    save: async (updatedVariation) => {
      if (onDraftSave) return onDraftSave(updatedVariation);
      if (onSave) throw new Error('O formulário pai não configurou o salvamento do rascunho.');
      const next: Product = {
        ...parentProduct,
        id: parentProduct.parentId || parentId || parentProduct.id,
        updatedAt: savedParentVersion.current,
        isDraft: true,
        active: false,
        status: 'draft',
        variations: (parentProduct.variations || []).some((item) => item.id === updatedVariation.id)
          ? parentProduct.variations!.map((item) => item.id === updatedVariation.id ? updatedVariation : item)
          : [...(parentProduct.variations || []), updatedVariation],
      };
      await saveProduct(next);
      savedParentVersion.current = next.updatedAt;
      return true;
    },
  });

  const handleClose = async () => {
    if (isDraft && !(await draftAutoSave.flush())) return;
    onClose();
  };

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
    if (formData && !diferenciarTitulo) {
      if (formData.title !== formData.name) {
        setFormData((prev) =>
          prev ? { ...prev, title: prev.name, marketplaceTitle: prev.name } : null
        );
      }
    }
  }, [formData?.name, diferenciarTitulo]);

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
      return changed ? { ...next, ...(isDraft ? { status: 'draft' as const, active: false } : {}) } : previous;
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

  const fetchDbAttributes = async () => {
    try {
      const [attrRes, valRes] = await Promise.all([
        supabase.from('attributes').select('*').order('name'),
        supabase.from('attribute_values').select('*').order('value'),
      ]);
      setDbAttributes((attrRes.data || []) as { id: string; name: string }[]);
      setDbAttributeValues(
        sortAttributeValuesNaturally(
          (valRes.data || []) as { id: string; attribute_id: string; value: string }[]
        )
      );
    } catch (err) {
      console.error('Erro ao buscar atributos globais:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setAllParentImages([]);
      const realParentId = parentProduct?.parentId || parentId || parentProduct?.id;
      if (realParentId) {
        supabase
          .from('product_images')
          .select('image_url')
          .eq('product_id', realParentId)
          .order('created_at', { ascending: true })
          .then(({ data }) => {
            const databaseImages = (data || []).map((i) => i.image_url).filter(Boolean);
            const formImages = (parentProduct?.images || []).filter(Boolean);
            setAllParentImages(Array.from(new Set([...databaseImages, ...formImages])));
          });
      } else if (parentProduct?.images?.length) {
        setAllParentImages(parentProduct.images);
      }
    }
  }, [isOpen, parentProduct, parentId]);

  useEffect(() => {
    if (isOpen) {
      fetchDbAttributes();
      setActiveTab(
        isSingleVariation && Boolean(variation) && !isStockistOnly ? 'fotos' : 'identificacao'
      );
      if (variation) {
        setFormData({
          ...variation,
          title: variation.title || variation.marketplaceTitle || '',
          images: parseVariationImages((variation as any).image_url, variation.images),
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
          ...(isSingleVariation ? { images: allParentImages.length > 0 ? allParentImages : parentProduct.images || [] } : {}),
        });
        setDiferenciarTitulo(
          Boolean(variation.title && variation.title !== variation.name) ||
            Boolean(variation.marketplaceTitle && variation.marketplaceTitle !== variation.name)
        );

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
          status: 'draft',
          attributes: [],
          images: isSingleVariation ? (allParentImages.length > 0 ? allParentImages : parentProduct.images || []) : [],
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
  }, [variation?.id, isOpen, isStockistOnly]);

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
    if (!formData || loading) return;

    const cleanAttributes = (Array.isArray(formData.attributes) ? formData.attributes : [])
      .map((attr) => ({
        ...attr,
        name: toTitleCase(attr.name),
        value: toTitleCase(attr.value),
      }))
      .filter((attr) => attr.name.trim() && attr.value.trim());
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

    const finalVariation: Variation = {
      ...formData,
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
            images: allParentImages.length > 0 ? allParentImages : parentProduct.images || [],
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
      title: toTitleCase(!isSingleVariation && diferenciarTitulo ? formData.title || variationName : variationName),
      marketplaceTitle: toTitleCase(
        !isSingleVariation && diferenciarTitulo
          ? formData.marketplaceTitle || formData.title || variationName
          : variationName
      ),
    };

    const issue = getVariationRegistrationIssue(parentProduct, finalVariation);
    if (issue) {
      toast.error(issue.message);
      setActiveTab(issue.tab);
      return;
    }
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

    if (isDraft) {
      setLoading(true);
      try {
        if (!(await draftAutoSave.flush(finalVariation))) return;
        setFormData(finalVariation);
        onSave?.(finalVariation);
        onSuccess?.();
        onClose();
      } finally {
        setLoading(false);
      }
      return;
    }

    if (onSave) {
      onSave({
        ...finalVariation,
        sku:
          finalVariation.sku || 'VAR-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      });
      onClose();
      return;
    }

    setLoading(true);
    try {
      await saveVariation(parentId || '', {
        ...finalVariation,
        sku:
          finalVariation.sku || 'VAR-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      });
      toast.success('Variação salva com sucesso!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      toast.error('Erro ao salvar a variação.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return {
    isDraft,
    autoSaveStatus: draftAutoSave.status,
    handleClose,
    loading,
    activeTab,
    setActiveTab,
    formData,
    setFormData: updateFormData,
    allParentImages,
    diferenciarTitulo,
    setDiferenciarTitulo,
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
  };
}
