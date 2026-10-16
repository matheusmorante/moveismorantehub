'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
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
import { useAuth } from '@/hooks/use-auth';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';

const snapshotSignature = (value: unknown) => JSON.stringify(value, (_key, item) =>
  item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([left], [right]) => left.localeCompare(right))) : item);

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
  const { user, loading: authLoading } = useAuth();
  const mounted = useRef(true);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const finishing = useRef(false);
  const completed = useRef(false);
  const uncertain = useRef(false);
  const generatedVariationIds = useRef(new WeakMap<object, string>());
  const savedSnapshot = useRef('');
  const context = useRef({ open: isOpen, id: currentProduct?.id, userId: user?.id, generation: 0 });
  useLayoutEffect(() => {
    if (context.current.open !== isOpen || context.current.id !== currentProduct?.id || context.current.userId !== user?.id) {
      context.current = { open: isOpen, id: currentProduct?.id, userId: user?.id, generation: context.current.generation + 1 };
      completed.current = false;
      savedSnapshot.current = '';
    }
  }, [isOpen, currentProduct?.id, user?.id]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; if (autoSaveTimeout.current) clearTimeout(autoSaveTimeout.current); };
  }, []);

  const productSnapshot = {
    product: formData,
    variations: productVariations,
    variationsEnabled,
  };

  const snapshotKey = snapshotSignature(productSnapshot);
  const draftForm = useZodForm(storefrontProductDraftFormSchema, productSnapshot);
  const finalForm = useZodForm(storefrontProductFormSchema, productSnapshot);

  const showFormError = (errors: Parameters<typeof flattenFormErrors>[0]) =>
    toast.error(Object.values(flattenFormErrors(errors))[0]);

  const saveProductData = async (values: z.output<typeof storefrontProductDraftFormSchema>, request: <T>(query: PromiseLike<T>, mutation?: boolean) => Promise<T>, generation: number) => {
    const { product, variations, variationsEnabled } = values;
    let baseSlug = product.slug ? product.slug.trim() : generateSlug(product.name);
    if (!baseSlug) baseSlug = 'produto';

    let finalSlug = baseSlug;
    let counter = 0;
    let slugExists = true;

    while (slugExists) {
      if (counter > 50) throw new Error('Não foi possível encontrar um endereço disponível para o produto.');
      const query = supabase.from('products').select('id').eq('slug', finalSlug);

      if (context.current.id) {
        query.neq('id', context.current.id);
      }

      const { data: existing, error } = await request(query);
      if (error) throw error;
      if (!Array.isArray(existing)) throw new Error('A consulta do endereço do produto não foi confirmada.');

      if (existing && existing.length > 0) {
        counter++;
        finalSlug = `${baseSlug}-${counter}`;
      } else {
        slugExists = false;
      }
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

    let savedId = context.current.id;
    let confirmedVariations = variations;
    const matchesProduct = (row: Product) => Object.entries(dataToSave).every(([key, value]) => (row as unknown as Record<string, unknown>)[key] === value);

    if (savedId) {
      const { data, error } = await request(supabase
        .from('products')
        .update(dataToSave)
        .eq('id', savedId).select(), true);
      if (error) throw error;
      if (data?.length !== 1 || data[0].id !== savedId || !matchesProduct(data[0])) throw new Error('A atualização do produto não foi confirmada.');
    } else {
      const { data, error } = await request(supabase.from('products').insert([dataToSave]).select(), true);
      if (error) throw error;
      if (data?.length !== 1 || !data[0].id || !matchesProduct(data[0])) {
        uncertain.current = true;
        throw new Error('A criação do produto não foi confirmada. Confira os produtos e recarregue a página antes de repetir.');
      }
      savedId = data[0].id;
      if (context.current.generation !== generation) throw new Error('O produto em edição mudou. Reabra o cadastro.');
      context.current.id = savedId;
      setCurrentProduct(data[0]);
    }

    // Sincronizar Imagens
    if (savedId) {
      const deletion = await request(supabase.from('product_images').delete().eq('product_id', savedId).select('product_id'), true);
      if (deletion.error) throw deletion.error;
      if (!Array.isArray(deletion.data)) throw new Error('A remoção das imagens anteriores não foi confirmada.');
      const imageRecords = product.images.map((url, index) => ({
        product_id: savedId,
        image_url: url,
        is_main: index === 0,
      }));
      if (imageRecords.length) {
        const { data, error } = await request(supabase.from('product_images').insert(imageRecords).select('product_id,image_url,is_main'), true);
        if (error) throw error;
        if (data?.length !== imageRecords.length || imageRecords.some((record) => !data.some((row) => row.product_id === record.product_id && row.image_url === record.image_url && row.is_main === record.is_main))) throw new Error('As imagens do produto não foram confirmadas.');
      }
    }

    // Sincronizar Categorias
    if (savedId) {
      const deletion = await request(supabase.from('product_categories').delete().eq('product_id', savedId).select('product_id'), true);
      if (deletion.error) throw deletion.error;
      if (!Array.isArray(deletion.data)) throw new Error('A remoção das categorias anteriores não foi confirmada.');
      if (product.category_ids.length > 0) {
        const categoryRecords = product.category_ids.map((categoryId) => ({
          product_id: savedId,
          category_id: categoryId,
        }));
        const { data, error } = await request(supabase.from('product_categories').insert(categoryRecords).select('product_id,category_id'), true);
        if (error) throw error;
        if (data?.length !== categoryRecords.length || categoryRecords.some((record) => !data.some((row) => row.product_id === record.product_id && row.category_id === record.category_id))) throw new Error('As categorias do produto não foram confirmadas.');
      }
    }

    // Sincronizar Variações
    if (savedId) {
      if (variationsEnabled && variations.length > 0) {
        const currentIds = variations.map((v) => v.id).filter(Boolean);
        if (currentIds.length > 0) {
          const { data, error: delErr } = await request(supabase
            .from('product_variations')
            .delete()
            .eq('product_id', savedId)
            .not('id', 'in', `(${currentIds.join(',')})`).select('id'), true);
          if (delErr) throw delErr;
          if (!Array.isArray(data)) throw new Error('A remoção das variações anteriores não foi confirmada.');
        } else {
          const { data, error: delErr } = await request(supabase
            .from('product_variations')
            .delete()
            .eq('product_id', savedId).select('id'), true);
          if (delErr) throw delErr;
          if (!Array.isArray(data)) throw new Error('A remoção das variações anteriores não foi confirmada.');
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

        const { data, error: varErr } = await request(supabase.from('product_variations').upsert(recordsToSave).select('id,product_id'), true);
        if (varErr) throw varErr;
        if (data?.length !== recordsToSave.length || data.some((row) => row.product_id !== savedId) || recordsToSave.some((record) => record.id && !data.some((row) => row.id === record.id))) throw new Error('As variações do produto não foram confirmadas.');
        confirmedVariations = updatedVariations;
      } else {
        const { data, error: delErr } = await request(supabase
          .from('product_variations')
          .delete()
          .eq('product_id', savedId).select('id'), true);
        if (delErr) throw delErr;
        if (!Array.isArray(data)) throw new Error('A remoção das variações anteriores não foi confirmada.');
      }
    }

    const confirmedSnapshot = { product: { ...product, slug: finalSlug }, variations: confirmedVariations, variationsEnabled };
    savedSnapshot.current = snapshotSignature(confirmedSnapshot);
    setFormData((current) => snapshotSignature(current) === snapshotSignature(product) ? confirmedSnapshot.product : current);
    setProductVariations((current) => snapshotSignature(current) === snapshotSignature(variations) ? confirmedVariations : current);
    return savedId;
  };

  const submitProduct = (publish: boolean) => {
    if (publish && uncertain.current) {
      toast.error('Há uma gravação sem confirmação. Confira o produto e recarregue a página antes de repetir.');
      return Promise.resolve(false);
    }
    if (publish && (authLoading || !user)) {
      toast.error('Aguarde a confirmação da sessão antes de salvar o produto.');
      return Promise.resolve(false);
    }
    if (!isOpen || !isLoaded.current || authLoading || !user || isSaving || finishing.current || completed.current || uncertain.current) return Promise.resolve(false);
    if (!publish && (!formData.name || currentProduct?.status === 'published')) return Promise.resolve(false);
    if (publish) finishing.current = true;
    if (autoSaveTimeout.current) clearTimeout(autoSaveTimeout.current);
    const generation = context.current.generation;
    const snapshot = structuredClone({ ...productSnapshot, variations: productVariations.map((variation) => {
      let id = variation.id || generatedVariationIds.current.get(variation);
      if (!id) { id = crypto.randomUUID(); generatedVariationIds.current.set(variation, id); }
      return { ...variation, id };
    }) });
    const isCurrent = () => mounted.current && context.current.open && context.current.generation === generation;
    const pending = queue.current.then(async () => {
      if (!isCurrent() || uncertain.current || completed.current) return false;
      if (publish) setIsSaving(true); else setIsAutoSaving(true);
      // A timed-out write can still finish remotely: stop this queue until review.
      const request = async <T,>(query: PromiseLike<T>, mutation = false): Promise<T> => {
        if (!isCurrent()) throw new Error('O produto ou a sessão mudou. Reabra o cadastro.');
        let response: T | null;
        try {
          response = await withTimeout(query, 20_000, null, 'Persistência do produto no catálogo');
        } catch (error) {
          if (mutation) uncertain.current = true;
          throw error;
        }
        if (response === null) {
          if (mutation) uncertain.current = true;
          throw new Error(mutation ? 'A gravação não foi confirmada. Confira o produto e recarregue a página antes de repetir.' : 'A consulta demorou demais. Tente novamente.');
        }
        if (!isCurrent()) throw new Error('O produto ou a sessão mudou. Reabra o cadastro.');
        return response;
      };
      try {
        const form = publish ? finalForm : draftForm;
        return await form.validateAndRun(snapshot, async (values) => {
          // Retain allocated UUIDs before I/O so retries and queued finalization upsert the same rows.
          setProductVariations((current) => current === productVariations ? snapshot.variations : current);
          const savedId = await saveProductData(values, request, generation);
          if (!publish) return savedId;
          const variationsResult = await request(supabase.from('product_variations').update({ status: 'published' }).eq('product_id', savedId).select('id,product_id,status'), true);
          if (variationsResult.error) throw variationsResult.error;
          if (!Array.isArray(variationsResult.data) || variationsResult.data.some((row) => row.product_id !== savedId || row.status !== 'published') || (values.variationsEnabled && variationsResult.data.length !== values.variations.length)) throw new Error('A publicação das variações não foi confirmada.');
          const { data, error } = await request(supabase.from('products').update({ status: 'published' }).eq('id', savedId).select(), true);
          if (error) throw error;
          if (data?.length !== 1 || data[0].id !== savedId || data[0].status !== 'published') throw new Error('A publicação do produto não foi confirmada.');
          setCurrentProduct(data[0]);
          completed.current = true;
          toast.success('Produto salvo com sucesso!');
          const channel = new BroadcastChannel('catalog-updates');
          channel.postMessage('catalog-updated');
          channel.close();
          onOpenChange(false);
          onSuccess?.();
          // Meta remains an independent background sync after confirmed publication.
          void withTimeout(fetch('/api/catalog/sync-batch', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: savedId, action: 'UPDATE' }),
          }), 20_000, null, 'Sincronização do catálogo Meta').catch(() => undefined);
          return savedId;
        }, (errors) => { if (isCurrent()) showFormError(errors); });
      } catch (error) {
        if (isCurrent()) toast.error(error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : 'Não foi possível confirmar o salvamento do produto.');
        return false;
      } finally {
        if (mounted.current) { setIsSaving(false); setIsAutoSaving(false); }
      }
    });
    queue.current = pending.catch(() => undefined);
    return pending.finally(() => { if (publish) finishing.current = false; });
  };

  const triggerAutoSave = () => submitProduct(false);
  const handleFinish = (e?: React.FormEvent) => { e?.preventDefault(); return submitProduct(true); };

  const latestAutoSave = useRef(triggerAutoSave);
  useLayoutEffect(() => { latestAutoSave.current = triggerAutoSave; });
  useEffect(() => {
    if (isOpen && isLoaded.current && formData.name && !isSaving && currentProduct?.status !== 'published' && snapshotKey !== savedSnapshot.current) {
      autoSaveTimeout.current = setTimeout(() => { void latestAutoSave.current(); }, 1500);
    }
    return () => { if (autoSaveTimeout.current) clearTimeout(autoSaveTimeout.current); };
  }, [snapshotKey, formData.name, isOpen, currentProduct?.id, currentProduct?.status, isLoaded, isSaving, authLoading, user?.id]);

  return {
    isSaving,
    setIsSaving,
    isAutoSaving,
    triggerAutoSave,
    handleFinish,
    autoSaveTimeout,
  };
}
