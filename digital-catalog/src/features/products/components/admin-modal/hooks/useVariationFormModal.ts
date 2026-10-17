'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { storefrontVariationFormSchema } from '@/shared-utils/storefrontProductFormSchemas';
import { DbAttribute, ProductFormData, TempVariation } from '../types';
import {
  calculateFromPriceChange,
  calculateFromDiscountPercent,
  calculateFromDiscountFixed,
  calculateFromPromoPrice,
  calculateInitialDiscounts,
} from '../utils/priceCalculations';
import { generateAutoSku, getDefaultVariationName } from '../utils/slugAndSkuUtils';

export interface UseVariationFormModalProps {
  readonly isOpen: boolean;
  readonly initialVariation: TempVariation | null;
  readonly editingIndex: number | null;
  readonly productFormData: ProductFormData;
  readonly dbAttributes: readonly DbAttribute[];
  readonly onSave: (variation: TempVariation, index: number | null) => void;
  readonly onOpenChange: (open: boolean) => void;
}

export function useVariationFormModal({
  isOpen,
  initialVariation,
  editingIndex,
  productFormData,
  dbAttributes,
  onSave,
  onOpenChange,
}: UseVariationFormModalProps) {
  const [varStep, setVarStep] = useState(1);
  const [varDiscountPercent, setVarDiscountPercent] = useState('');
  const [varDiscountFixed, setVarDiscountFixed] = useState('');

  const [varFormState, setVarFormState] = useState<TempVariation>({
    sku: '',
    price: productFormData.price,
    promo_price: productFormData.promo_price,
    description: productFormData.description,
    width: productFormData.width,
    depth: productFormData.depth,
    height: productFormData.height,
    image_url: '',
    attributes: {},
    use_parent_price: true,
    use_parent_promo_price: true,
    use_parent_dimensions: true,
    use_parent_description: true,
    use_parent_name: true,
  });

  const variationForm = useZodForm(storefrontVariationFormSchema, varFormState);

  const showFormError = (errors: Parameters<typeof flattenFormErrors>[0]) =>
    toast.error(Object.values(flattenFormErrors(errors))[0]);

  useEffect(() => {
    if (isOpen) {
      setVarStep(1);
      if (initialVariation) {
        setVarFormState({
          ...initialVariation,
          use_parent_price: initialVariation.use_parent_price !== false,
          use_parent_promo_price: initialVariation.use_parent_promo_price !== false,
          use_parent_dimensions: initialVariation.use_parent_dimensions !== false,
          use_parent_description: initialVariation.use_parent_description !== false,
          use_parent_name: initialVariation.use_parent_name !== false,
        });

        const isParentPrice = initialVariation.use_parent_price !== false;
        const isParentPromo = initialVariation.use_parent_promo_price !== false;
        const origPrice = isParentPrice ? productFormData.price : initialVariation.price || '';
        const promoPrice = isParentPromo
          ? productFormData.promo_price
          : initialVariation.promo_price || '';

        const discounts = calculateInitialDiscounts(origPrice, promoPrice);
        setVarDiscountPercent(discounts.discountPercent);
        setVarDiscountFixed(discounts.discountFixed);
      } else {
        const initialAttrs: Record<string, string> = {};
        if (dbAttributes.length > 0) {
          initialAttrs[dbAttributes[0].name] = '';
        }
        setVarFormState({
          sku: '',
          price: productFormData.price,
          promo_price: productFormData.promo_price,
          description: productFormData.description,
          width: productFormData.width,
          depth: productFormData.depth,
          height: productFormData.height,
          image_url: '',
          attributes: initialAttrs,
          use_parent_price: true,
          use_parent_promo_price: true,
          use_parent_dimensions: true,
          use_parent_description: true,
          use_parent_name: true,
        });
        setVarDiscountPercent('');
        setVarDiscountFixed('');
      }
    }
  }, [isOpen, initialVariation, productFormData, dbAttributes]);

  const handleVarPriceChange = (newPrice: string) => {
    const res = calculateFromPriceChange(newPrice, varDiscountPercent, varFormState.promo_price || '');
    setVarFormState((prev) => ({
      ...prev,
      price: newPrice,
      promo_price: res.promoPrice,
      use_parent_price: false,
    }));
    setVarDiscountPercent(res.discountPercent);
    setVarDiscountFixed(res.discountFixed);
  };

  const handleVarDiscountPercentChange = (valStr: string) => {
    const basePrice =
      varFormState.use_parent_price !== false ? productFormData.price : varFormState.price || '';
    const res = calculateFromDiscountPercent(basePrice, valStr);
    setVarDiscountPercent(res.discountPercent);
    setVarDiscountFixed(res.discountFixed);
    setVarFormState((prev) => ({ ...prev, promo_price: res.promoPrice }));
  };

  const handleVarDiscountFixedChange = (valStr: string) => {
    const basePrice =
      varFormState.use_parent_price !== false ? productFormData.price : varFormState.price || '';
    const res = calculateFromDiscountFixed(basePrice, valStr);
    setVarDiscountPercent(res.discountPercent);
    setVarDiscountFixed(res.discountFixed);
    setVarFormState((prev) => ({ ...prev, promo_price: res.promoPrice }));
  };

  const handleVarPromoPriceFieldChange = (valStr: string) => {
    const basePrice =
      varFormState.use_parent_price !== false ? productFormData.price : varFormState.price || '';
    const res = calculateFromPromoPrice(basePrice, valStr);
    setVarDiscountPercent(res.discountPercent);
    setVarDiscountFixed(res.discountFixed);
    setVarFormState((prev) => ({ ...prev, promo_price: res.promoPrice }));
  };

  const handleSaveVarForm = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (varStep < 3) {
      setVarStep(varStep + 1);
      return;
    }

    await variationForm.validateAndRun(
      varFormState,
      (validated) => {
        const updatedAttributes = { ...validated.attributes };
        const generatedSku = generateAutoSku(productFormData.slug, updatedAttributes);

        const updatedVar: TempVariation = {
          ...validated,
          id:
            validated.id || (typeof window !== 'undefined' ? window.crypto.randomUUID() : undefined),
          sku: generatedSku,
          stock: validated.stock || '999',
        };

        if (validated.use_parent_name !== false) {
          updatedVar.name = getDefaultVariationName(productFormData.name, updatedAttributes);
        } else {
          updatedVar.name = validated.name || 'Padrão';
        }

        onSave(updatedVar, editingIndex);
        onOpenChange(false);
      },
      showFormError
    );
  };

  return {
    varStep,
    setVarStep,
    varFormState,
    setVarFormState,
    varDiscountPercent,
    setVarDiscountPercent,
    varDiscountFixed,
    setVarDiscountFixed,
    handleVarPriceChange,
    handleVarDiscountPercentChange,
    handleVarDiscountFixedChange,
    handleVarPromoPriceFieldChange,
    handleSaveVarForm,
  };
}
