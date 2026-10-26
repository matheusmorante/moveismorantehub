import { useEffect } from 'react';
import Product from '@/pages/types/product.type';
import { getFullProduct, getNextSequentialProductCode } from '@/pages/utils/productService';
import { ensureDefaultVariation } from '@/pages/utils/productVariationDefaults';
import { isProductDraft } from '@/pages/utils/productService/productDraftSnapshot';
import { INITIAL_PRODUCT_FORM_DATA } from '../../utils/form/productFormInitialData';
import { isSingleProductVariationFormMode } from '../../../../../../../shared-utils/productVariationMode';

const ensureProductFormVariation = <T extends Partial<Product>>(product: T): T => {
  if (product.itemType === 'service') return product;
  const withDefault = ensureDefaultVariation(product);
  const isDraft = isProductDraft(product);
  const hasVariations = !isSingleProductVariationFormMode(
    product,
    withDefault.variations?.length || 0,
    false
  );
  return {
    ...withDefault,
    hasVariations,
    ...(isDraft ? {
    variations: (withDefault.variations || []).map((variation) => ({
      ...variation,
      active: false,
      status: 'draft',
    })),
    } : {}),
  };
};

interface LoadProps {
  isOpen: boolean;
  product?: Product | null;
  initialData?: Partial<Product> | null;
  initialTab?: string;
  isQuickRegister?: boolean;
  openAddVariationOnOpen?: boolean;
  prevOpenRef: React.MutableRefObject<boolean>;
  loadedProductIdRef: React.MutableRefObject<string | null>;
  hasChanged: React.MutableRefObject<boolean>;
  initialFormDataRef: React.MutableRefObject<string>;
  setValidationErrors: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  pricing: any;
  setActiveTab: (tab: any) => void;
  variations: any;
}

export const useProductFormLoad = ({
  isOpen,
  product,
  initialData,
  initialTab,
  isQuickRegister,
  openAddVariationOnOpen,
  prevOpenRef,
  loadedProductIdRef,
  hasChanged,
  initialFormDataRef,
  setValidationErrors,
  setFormData,
  pricing,
  setActiveTab,
  variations,
}: LoadProps) => {
  useEffect(() => {
    if (!isOpen) {
      prevOpenRef.current = false;
      loadedProductIdRef.current = null;
      return;
    }

    const currentTargetId = product?.id || initialData?.code || 'new_product';
    const isJustOpened = !prevOpenRef.current;
    const isTargetChanged = loadedProductIdRef.current !== currentTargetId;

    if (!isJustOpened && !isTargetChanged) {
      return;
    }

    prevOpenRef.current = true;
    loadedProductIdRef.current = currentTargetId;
    hasChanged.current = false;
    initialFormDataRef.current = '';
    setValidationErrors({});

    let isMounted = true;

    const loadFullData = async () => {
      let targetVariationIdToOpen: string | null = null;

      if (product?.id) {
        const initialNext = ensureProductFormVariation({
          ...INITIAL_PRODUCT_FORM_DATA,
          ...product,
        });
        setFormData(initialNext);
        pricing.initializeDiscounts(product.unitPrice, product.promoPrice);

        const full = await getFullProduct(product.id);
        if (!isMounted) return;

        const baseProduct = full || product;
        const pendingVariations = isQuickRegister
          ? (product.variations || []).filter(
              (variation) =>
                !(baseProduct.variations || []).some((saved) => saved.id === variation.id)
            )
          : [];

        const isDraftFromBase =
          Boolean(baseProduct.isDraft) ||
          Boolean((baseProduct as any).is_draft) ||
          baseProduct.status === 'draft';
        const nextFormData = ensureProductFormVariation({
          ...baseProduct,
          isDraft: isDraftFromBase,
          variations: [...(baseProduct.variations || []), ...pendingVariations],
        });

        initialFormDataRef.current = JSON.stringify(nextFormData);
        setFormData(nextFormData);
        pricing.initializeDiscounts(nextFormData.unitPrice, nextFormData.promoPrice);

        if (openAddVariationOnOpen) {
          if (pendingVariations.length > 0) {
            targetVariationIdToOpen = pendingVariations[pendingVariations.length - 1].id;
          }
        }
      } else if (product) {
        const nextFormData = ensureProductFormVariation({
          ...INITIAL_PRODUCT_FORM_DATA,
          ...product,
        });
        initialFormDataRef.current = JSON.stringify(nextFormData);
        setFormData(nextFormData);
        pricing.initializeDiscounts(product.unitPrice, product.promoPrice);
      } else {
        const generatedId = crypto.randomUUID();
        const generatedSku = initialData?.code || (await getNextSequentialProductCode());
        if (!isMounted) return;

        const nextFormData = ensureProductFormVariation({
          ...INITIAL_PRODUCT_FORM_DATA,
          id: generatedId,
          code: generatedSku,
          name: '',
          title: '',
          description: '',
          ...initialData,
          isDraft: true,
          active: false,
          status: 'draft',
          variations: initialData?.variations || [],
          hasVariations: initialData?.hasVariations,
        });
        initialFormDataRef.current = JSON.stringify(nextFormData);
        setFormData(nextFormData);
        pricing.setDiscountFixed('');
        pricing.setDiscountPercent('');
      }

      if (!isMounted) return;
      setActiveTab((initialTab as any) || 'geral');

      if (openAddVariationOnOpen) {
        if (targetVariationIdToOpen) {
          variations.setEditingVariationId(targetVariationIdToOpen);
        } else {
          variations.addVariation();
        }
      }
    };

    loadFullData();

    return () => {
      isMounted = false;
    };
  }, [product?.id, initialData?.code, isOpen]);
};
