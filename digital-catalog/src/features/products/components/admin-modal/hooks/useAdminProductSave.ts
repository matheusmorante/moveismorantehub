'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import {
  parseStorefrontPrice,
  storefrontProductDraftFormSchema,
  storefrontProductFormSchema,
} from '@/shared-utils/storefrontProductFormSchemas';
import { Product, ProductFormData, TempVariation } from '../types';
import { formatMeasures } from '../utils/measuresUtils';
import { generateSlug } from '../utils/slugAndSkuUtils';

interface UseAdminProductSaveProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  productVariations: TempVariation[];
  setProductVariations: React.Dispatch<React.SetStateAction<TempVariation[]>>;
  variationsEnabled: boolean;
  currentProduct: Product | null;
  setCurrentProduct: React.Dispatch<React.SetStateAction<Product | null>>;
  isOpen: boolean;
  isLoaded: React.MutableRefObject<boolean>;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function useAdminProductSave({
  formData,
  setFormData,
  productVariations,
  setProductVariations,
  variationsEnabled,
  currentProduct,
  setCurrentProduct,
  isOpen,
  isLoaded,
  onOpenChange,
  onSuccess,
}: UseAdminProductSaveProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);

  const productSnapshot = {
    product: formData,
    variations: productVariations,
    variationsEnabled,
  };

  const draftForm = useZodForm(storefrontProductDraftFormSchema, productSnapshot);
  const finalForm = useZodForm(storefrontProductFormSchema, productSnapshot);

  const showFormError = (errors: Parameters<typeof flattenFormErrors>[0]) =>
    toast.error(Object.values(flattenFormErrors(errors))[0]);

  const saveProductData = async (values: z.output<typeof storefrontProductDraftFormSchema>) => {
    const { product, variations, variationsEnabled } = values;
    let baseSlug = product.slug ? product.slug.trim() : generateSlug(product.name);
    if (!baseSlug) baseSlug = 'produto';

    let finalSlug = baseSlug;
    let counter = 0;
    let slugExists = true;

    while (slugExists) {
      const query = supabase.from('products').select('id').eq('slug', finalSlug);

      if (currentProduct?.id) {
        query.neq('id', currentProduct.id);
      }

      const { data: existing, error } = await query;
      if (error) throw error;

      if (existing && existing.length > 0) {
        counter++;
        finalSlug = `${baseSlug}-${counter}`;
      } else {
        slugExists = false;
      }
    }

    if (finalSlug !== product.slug) {
      setFormData((prev) => ({ ...prev, slug: finalSlug }));
    }

    const dataToSave = {
      name: product.name,
      slug: finalSlug,
      description: product.description,
      price: product.price ? parseStorefrontPrice(product.price) : 0,
      promo_price: product.promo_price ? parseStorefrontPrice(product.promo_price) : null,
      is_salvado: product.is_salvado || false,
      opportunity_id: product.opportunity_id,
      width: product.width || null,
      depth: product.depth || null,
      height: product.height || null,
      depth_use_length: product.depth_use_length || false,
      measures: formatMeasures(product) || null,
      status: currentProduct?.status || 'draft',
    };

    let savedId = currentProduct?.id;

    if (currentProduct?.id) {
      const { error } = await supabase
        .from('products')
        .update(dataToSave)
        .eq('id', currentProduct.id);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from('products').insert([dataToSave]).select();
      if (error) throw error;
      savedId = data[0].id;
      setCurrentProduct(data[0]);
    }

    // Sincronizar Imagens
    if (product.images.length > 0 && savedId) {
      await supabase.from('product_images').delete().eq('product_id', savedId);
      const imageRecords = product.images.map((url, index) => ({
        product_id: savedId,
        image_url: url,
        is_main: index === 0,
      }));
      const { error } = await supabase.from('product_images').insert(imageRecords);
      if (error) throw error;
    }

    // Sincronizar Categorias
    if (savedId) {
      await supabase.from('product_categories').delete().eq('product_id', savedId);
      if (product.category_ids.length > 0) {
        const categoryRecords = product.category_ids.map((categoryId) => ({
          product_id: savedId,
          category_id: categoryId,
        }));
        const { error } = await supabase.from('product_categories').insert(categoryRecords);
        if (error) throw error;
      }
    }

    // Sincronizar Variações
    if (savedId) {
      if (variationsEnabled && variations.length > 0) {
        const currentIds = variations.map((v) => v.id).filter(Boolean);
        if (currentIds.length > 0) {
          const { error: delErr } = await supabase
            .from('product_variations')
            .delete()
            .eq('product_id', savedId)
            .not('id', 'in', `(${currentIds.join(',')})`);
          if (delErr) throw delErr;
        } else {
          const { error: delErr } = await supabase
            .from('product_variations')
            .delete()
            .eq('product_id', savedId);
          if (delErr) throw delErr;
        }

        const updatedVariations = variations.map((v) => {
          const isParentPrice = v.use_parent_price !== false;
          const isParentPromo = v.use_parent_promo_price !== false;
          const isParentDims = v.use_parent_dimensions !== false;
          const isParentDesc = v.use_parent_description !== false;

          return {
            ...v,
            price: isParentPrice ? product.price : v.price,
            promo_price: isParentPromo ? product.promo_price : v.promo_price,
            width: isParentDims ? product.width : v.width,
            depth: isParentDims ? product.depth : v.depth,
            height: isParentDims ? product.height : v.height,
            description: isParentDesc ? product.description : v.description,
          };
        });
        setProductVariations(updatedVariations);

        const recordsToSave = updatedVariations.map((v) => ({
          ...(v.id ? { id: v.id } : {}),
          product_id: savedId,
          name: v.name,
          sku: v.sku || null,
          price: v.use_parent_price ? null : v.price ? parseStorefrontPrice(v.price) : null,
          stock: v.stock ? parseInt(v.stock, 10) : 0,
          image_url: v.image_url || null,
          attributes: v.attributes,
          promo_price: v.use_parent_promo_price
            ? null
            : v.promo_price
              ? parseStorefrontPrice(v.promo_price)
              : null,
          description: v.use_parent_description ? null : v.description || null,
          width: v.use_parent_dimensions ? null : v.width || null,
          depth: v.use_parent_dimensions ? null : v.depth || null,
          height: v.use_parent_dimensions ? null : v.height || null,
          use_parent_name: v.use_parent_name !== false,
          use_parent_price: v.use_parent_price !== false,
          use_parent_promo_price: v.use_parent_promo_price !== false,
          use_parent_dimensions: v.use_parent_dimensions !== false,
          use_parent_description: v.use_parent_description !== false,
        }));

        const { error: varErr } = await supabase.from('product_variations').upsert(recordsToSave);
        if (varErr) throw varErr;
      } else {
        const { error: delErr } = await supabase
          .from('product_variations')
          .delete()
          .eq('product_id', savedId);
        if (delErr) throw delErr;
      }
    }

    return savedId;
  };

  const triggerAutoSave = async () => {
    if (!formData.name || isSaving) return;
    setIsAutoSaving(true);
    try {
      await draftForm.validateAndRun(productSnapshot, saveProductData, showFormError);
    } catch (error) {
      console.error('Erro no auto-save:', error);
    } finally {
      setIsAutoSaving(false);
    }
  };

  // Efeito de Auto-save com debounce de 1.5s
  useEffect(() => {
    const isPublished = currentProduct?.status === 'published';
    if (isOpen && isLoaded.current && formData.name && !isSaving && !isPublished) {
      if (autoSaveTimeout.current) clearTimeout(autoSaveTimeout.current);
      autoSaveTimeout.current = setTimeout(() => {
        triggerAutoSave();
      }, 1500);
    }
  }, [formData, isOpen, currentProduct]);

  const handleFinish = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    return finalForm.validateAndRun(
      productSnapshot,
      async (values) => {
        if (autoSaveTimeout.current) {
          clearTimeout(autoSaveTimeout.current);
        }

        setIsSaving(true);
        try {
          const savedId = await saveProductData(values);
          if (!savedId) throw new Error('Não foi possível salvar os dados do produto.');

          const { error } = await supabase
            .from('products')
            .update({ status: 'published' })
            .eq('id', savedId);

          if (error) throw error;

          await supabase
            .from('product_variations')
            .update({ status: 'published' })
            .eq('product_id', savedId);

          if (currentProduct) {
            setCurrentProduct({ ...currentProduct, status: 'published' });
          }

          // Sincronizar com o catálogo da Meta em background
          fetch('/api/catalog/sync-batch', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              productId: savedId,
              action: 'UPDATE',
            }),
          }).catch((err) => console.error('Erro ao sincronizar com a Meta:', err));

          toast.success('Produto salvo com sucesso!');
          if (typeof window !== 'undefined') {
            const channel = new BroadcastChannel('catalog-updates');
            channel.postMessage('catalog-updated');
            channel.close();
          }
          onOpenChange(false);
          if (onSuccess) onSuccess();
        } catch (error: any) {
          toast.error(error.message);
        } finally {
          setIsSaving(false);
        }
      },
      showFormError
    );
  };

  return {
    isSaving,
    setIsSaving,
    isAutoSaving,
    saveProductData,
    triggerAutoSave,
    handleFinish,
    autoSaveTimeout,
  };
}
