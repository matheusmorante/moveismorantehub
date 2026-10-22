import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { productImageCropUploadFormSchema, productImageReplacementFormSchema } from '../../../../../../../shared-utils/productImageFormSchemas';
import { uploadOptimizedProductImage } from '../../components/tabs/images/productImageUpload';
import { createProductVariationSubmissionSchema } from '../../../../../../../shared-utils/productVariationValidation';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import type { Product, Variation } from '@/pages/types/product.type';
import { saveVariation } from '@/pages/utils/productService';
import { toast } from 'react-toastify';
import { useVariationPricing } from './useVariationPricing';
import type { VariationTabId, VariationFormOperationGuard } from './variationForm.types';
import { isProductDraft } from '@/pages/utils/productService/productDraftSnapshot';
import {
  replaceImageUrlAcrossList,
  replaceProductImageGlobally,
} from '../../components/tabs/images/productImageOrdering';
import { getLocalProducts } from '@/pages/utils/productService/productLocalCache';
import { updateProduct } from '@/pages/utils/productService/productMutationService';
import {
  useVariationFormSession,
  UNCERTAIN_SAVE_MESSAGE,
} from './useVariationFormSession';
import { useVariationFormReferences } from './useVariationFormReferences';
import {
  buildInitialVariationFormData,
  calculateEffectivePurchaseCost,
  computeDefaultVariationName,
  computeDefaultVariationTitle,
} from './variationFormDefaults';
import { prepareFinalVariation } from './variationFormSubmitRules';

export interface UseVariationFormOptions {
  isOpen: boolean;
  onClose: () => void;
  parentId?: string;
  parentProduct: Product;
  variation: Variation | null;
  onSuccess?: () => void;
  onSave?: (updatedVariation: Variation) => void | boolean | Promise<void | boolean>;
  isStockistOnly?: boolean;
  onReplaceImageGlobal?: (oldUrl: string, newUrl: string) => void | boolean | Promise<void | boolean>;
  operationGuard?: VariationFormOperationGuard;
}

/**
 * Hook orquestrador do formulário de variação de produto.
 * Aplica os princípios SOLID:
 * - Single Responsibility Principle (SRP): Atua como Fachada (Facade), delegando
 *   concorrência para `useVariationFormSession`, referências para `useVariationFormReferences`,
 *   precificação para `useVariationPricing`, defaults e custos para `variationFormDefaults`
 *   e sanitização para `variationFormSubmitRules`.
 */
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
  const [formData, setFormData] = useState<Variation | null>(null);
  const [activeTab, setActiveTab] = useState<VariationTabId>('identificacao');

  const identity = useMemo(
    () =>
      JSON.stringify([
        parentProduct.parentId || parentId || parentProduct.id,
        variation?.id || 'new',
      ]),
    [parentProduct.parentId, parentId, parentProduct.id, variation?.id]
  );

  const {
    session,
    guard,
    loading,
    setLoading,
    error,
    setError,
    blocked,
    updateFormData,
    handleClose,
  } = useVariationFormSession({
    isOpen,
    identity,
    operationGuard,
    onClose,
    setFormData,
  });

  const {
    dbAttributes,
    dbAttributeValues,
    isManageAttributesOpen,
    setIsManageAttributesOpen,
    fetchDbAttributes,
    allParentImages,
    setAllParentImages,
    referenceErrors,
    referenceLoading,
    retryReferences,
  } = useVariationFormReferences({
    isOpen,
    parentId,
    parentProduct,
    session,
  });

  const isDraft = isProductDraft(parentProduct);
  const isSingleVariation = variation
    ? (parentProduct.variations || []).length === 1
    : (parentProduct.variations || []).length === 0;

  const schema = useMemo(
    () => createProductVariationSubmissionSchema(parentProduct, isSingleVariation),
    [parentProduct, isSingleVariation]
  );

  const { validateAndRun } = useZodForm(schema, {
    variation: formData ? { ...formData } : {
      id: '', sku: '', name: '', stock: 0, unitPrice: 0, active: false, attributes: [],
    },
    discountPercent: '',
    discountFixed: '',
  });

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

  // 1. Sincroniza título quando o nome da variação é modificado
  useEffect(() => {
    if (formData) {
      if (formData.title !== formData.name || formData.marketplaceTitle !== formData.name) {
        setFormData((prev) =>
          prev ? { ...prev, title: prev.name, marketplaceTitle: prev.name } : null
        );
      }
    }
  }, [formData?.name]);

  // 2. Sincroniza prefixo do pai caso o produto pai mude de nome
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

  // 3. Atualiza a cópia de trabalho da variação enquanto o pai é editado
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

  // 4. Inicializa o formulário ao abrir ou trocar de variação
  useEffect(() => {
    if (isOpen) {
      void fetchDbAttributes();
      const varImgs = Array.isArray(variation?.images)
        ? variation.images.filter(Boolean)
        : typeof (variation as any)?.image_url === 'string' && (variation as any).image_url.trim()
          ? (variation as any).image_url.split(',').filter(Boolean)
          : [];
      const hasNoImages = varImgs.length === 0;

      setActiveTab(
        (isSingleVariation || hasNoImages) && Boolean(variation) && !isStockistOnly ? 'fotos' : 'identificacao'
      );
      const initial = buildInitialVariationFormData(
        parentProduct,
        variation,
        isDraft,
        isSingleVariation,
        allParentImages
      );
      setFormData(initial.formData);
      setVarDiscountFixed(initial.discountFixed);
      setVarDiscountPercent(initial.discountPercent);
    }
  }, [identity, isOpen, isStockistOnly, isDraft]);

  useEffect(() => {
    if (
      isStockistOnly &&
      (activeTab === 'fotos' || activeTab === 'tecnico' || activeTab === 'descricao')
    ) {
      setActiveTab('identificacao');
    }
  }, [isStockistOnly, activeTab]);

  const handleChange = <K extends keyof Variation>(field: K, value: Variation[K]) => {
    updateFormData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const updateCost = (fields: Partial<Variation>) => {
    updateFormData((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...fields, syncCostPrice: false };
      const finalCost = calculateEffectivePurchaseCost(
        next.costPrice || 0,
        next.ipiPercent || 0,
        next.freightCost || 0,
        next.freightType || 'fixed'
      );
      next.finalPurchasePrice = finalCost;
      return next;
    });
  };

  const getDefaultVariationName = useCallback(
    (attributes: Variation['attributes'] = []) => computeDefaultVariationName(parentProduct, attributes),
    [parentProduct]
  );

  const getDefaultVariationTitle = useCallback(
    (attributes: Variation['attributes'] = []) => computeDefaultVariationTitle(parentProduct, attributes),
    [parentProduct]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || !session.active || session.lock || session.completed || guard.error) return;

    const finalVariation = prepareFinalVariation(
      formData,
      parentProduct,
      isSingleVariation,
      isDraft,
      allParentImages
    );

    session.lock = true;
    setLoading(true);
    setError('');
    let accepting = true;
    const stillCurrent = () => session.active && accepting && !guard.error;

    try {
      await validateAndRun(
        { variation: finalVariation, discountPercent: varDiscountPercent, discountFixed: varDiscountFixed },
        async (values) => {
          if (!stillCurrent()) return;
          guard.pending = session.token;
          const variationToSave: Variation = values.variation;
          const result = await withTimeout(
            Promise.resolve().then(async () => {
              if (!stillCurrent()) return { cancelled: true, value: false };
              const value = onSave
                ? await onSave(variationToSave)
                : await saveVariation(
                    parentProduct.parentId || parentId || parentProduct.id || '',
                    variationToSave
                  );
              return { cancelled: false, value };
            }),
            60000,
            null,
            'variacao:salvar-formulario'
          );

          if (!result) {
            guard.error = UNCERTAIN_SAVE_MESSAGE;
            throw new Error(UNCERTAIN_SAVE_MESSAGE);
          }
          if (!stillCurrent() || result.cancelled) return;
          if (result.value === false) {
            setError('A variação não foi salva. Confira os dados e tente novamente.');
            return;
          }

          session.completed = true;
          guard.pending = null;
          setFormData(variationToSave);
          toast.success('Variação salva com sucesso!');
          try {
            onSuccess?.();
            onClose();
          } catch {
            setError('Variação salva, mas a tela não foi atualizada. Recarregue a página.');
          }
        },
        (errors) => {
          if (!session.active) return;
          const flattened = flattenFormErrors(errors);
          const message = Object.values(flattened)[0] || 'Confira os dados da variação.';
          setError(message);
          toast.error(message);
          const fields = Object.keys(flattened).map((field) => field.replace(/^variation_/, ''));
          const availableTabs = isStockistOnly
            ? ['identificacao', 'estoque', 'compostos']
            : ['identificacao', 'tecnico', 'estoque', 'compostos'];
          const tab = availableTabs.find((value) => fields.includes(value));
          const hasComboError = fields.some((field) => field.startsWith('comboItems'));
          const hasAttributeError = fields.some((field) => field.startsWith('attributes'));
          setActiveTab(
            (tab || (hasComboError ? 'compostos' : hasAttributeError ? 'identificacao' : 'estoque')) as VariationTabId
          );
        }
      );
    } catch (failure) {
      const reason = failure as { uncertain?: boolean; code?: string; status?: number; message?: string };
      if (
        reason?.uncertain ||
        reason?.code?.startsWith('08') ||
        (reason?.status ?? 0) >= 500 ||
        /failed to fetch|network|timeout|tempo.*esgot/i.test(reason?.message || '')
      ) {
        guard.error = UNCERTAIN_SAVE_MESSAGE;
      }
      if (session.active) {
        const message = guard.error || 'Erro ao salvar a variação.';
        setError(message);
        toast.error(message);
      }
    } finally {
      accepting = false;
      session.lock = false;
      if (guard.pending === session.token) guard.pending = null;
      if (session.active) setLoading(false);
    }
  };

  const imageProcessing = useRef(false), uploadedImages = useRef(new WeakMap<File, string>());
  const cropUploadForm = useZodForm(productImageCropUploadFormSchema, { oldUrl: '', file: undefined as unknown as File });
  const replacementForm = useZodForm(productImageReplacementFormSchema, { oldUrl: '', newUrl: '' });
  const onImageProcessingChange = useCallback((pending: boolean) => {
    if (pending) {
      if (!session.active || session.lock || session.completed || guard.error) return false;
      imageProcessing.current = true; session.lock = true; setLoading(true); setError(''); return true;
    }
    if (imageProcessing.current) { imageProcessing.current = false; session.lock = false; if (session.active) setLoading(false); }
    return true;
  }, [session, guard, setLoading, setError]);
  const handleReplaceImageGlobal = useCallback(async (oldUrl: string, newUrl: string) => {
    const ownsLock = !imageProcessing.current;
    if (ownsLock && !onImageProcessingChange(true)) throw Object.assign(new Error('Aguarde a operação da variação.'), { knownFailure: true });
    const current = () => session.active && !guard.error;
    let writing = false;
    try { return await replacementForm.validateAndRun({ oldUrl, newUrl }, async (values) => {
      if (!current()) return false;
      const currentImages = formData?.images?.length ? formData.images : allParentImages.length ? allParentImages : parentProduct.images || [];
      if (!currentImages.includes(values.oldUrl) && !currentImages.includes(values.newUrl)) throw Object.assign(new Error('A foto de origem mudou. Reabra o recorte.'), { knownFailure: true });
      const parentIdentity = parentProduct.parentId || parentId || parentProduct.id;
      const cachedParent = !onReplaceImageGlobal ? getLocalProducts().find((item) => String(item.id).toLowerCase() === String(parentIdentity).toLowerCase()) : undefined;
      if (!onReplaceImageGlobal && !cachedParent) throw Object.assign(new Error('O produto pai não está disponível. Reabra o cadastro antes de substituir a foto.'), { knownFailure: true });
      writing = true; guard.pending = session.token;
      const result = await withTimeout(Promise.resolve(onReplaceImageGlobal
        ? onReplaceImageGlobal(values.oldUrl, values.newUrl)
        : updateProduct(String(parentIdentity), (() => { const updated = replaceProductImageGlobally(cachedParent!, values.oldUrl, values.newUrl); return { images: updated.images, variations: updated.variations }; })())).then((value) => value !== false), 30_000, null, 'Aplicar foto recortada');
      if (!current()) return false;
      if (result === null) throw Object.assign(new Error('A substituição da foto não foi confirmada. Confira antes de repetir.'), { uncertain: true });
      if (!result) throw Object.assign(new Error('A foto não foi aplicada. Tente novamente.'), { knownFailure: true });
      setFormData((previous) => previous ? { ...previous, images: replaceImageUrlAcrossList(previous.images?.length ? previous.images : currentImages, values.oldUrl, values.newUrl) } : previous);
      setAllParentImages((previous) => replaceImageUrlAcrossList(previous, values.oldUrl, values.newUrl)); return true;
    }, (errors) => { throw Object.assign(new Error(Object.values(flattenFormErrors(errors))[0]), { knownFailure: true }); }); }
    catch (error) {
      if (session.active) {
        if (writing && (!error || typeof error !== 'object' || !('knownFailure' in error) || !error.knownFailure)) guard.error ||= 'A substituição da foto pode ter sido aplicada. Confira o produto antes de repetir.';
        setError(error instanceof Error ? error.message : 'Não foi possível aplicar a foto.');
      }
      throw error;
    } finally { if (guard.pending === session.token) guard.pending = null; if (ownsLock) onImageProcessingChange(false); }
  }, [formData, allParentImages, parentProduct, parentId, onReplaceImageGlobal, session, guard, setAllParentImages, replacementForm, onImageProcessingChange, setError]);
  const handleCropPhoto = async (file: File, oldUrl: string) => {
    const ownsLock = !imageProcessing.current;
    if (ownsLock && !onImageProcessingChange(true)) throw Object.assign(new Error('Aguarde a operação da variação.'), { knownFailure: true });
    const current = () => session.active && !guard.error;
    try { return await cropUploadForm.validateAndRun({ file, oldUrl }, async (values) => {
      if (!current()) return false;
      const currentImages = formData?.images?.length ? formData.images : allParentImages.length ? allParentImages : parentProduct.images || [];
      if (!currentImages.includes(values.oldUrl)) throw Object.assign(new Error('A foto de origem mudou. Reabra o recorte.'), { knownFailure: true });
      let url = uploadedImages.current.get(values.file);
      if (!url) {
        guard.pending = session.token;
        const result = await withTimeout(uploadOptimizedProductImage(values.file, { isCurrent: current }), 55_000, null, 'Enviar foto recortada');
        if (!current()) return false;
        if (!result) throw Object.assign(new Error('O envio da foto não foi confirmado. Confira antes de repetir.'), { uncertain: true });
        url = result; uploadedImages.current.set(values.file, url);
      }
      return await handleReplaceImageGlobal(values.oldUrl, url);
    }, (errors) => { throw Object.assign(new Error(Object.values(flattenFormErrors(errors))[0]), { knownFailure: true }); }); }
    catch (error) {
      if (session.active) {
        if (error && typeof error === 'object' && 'uncertain' in error && error.uncertain) guard.error ||= 'O envio ou a substituição da foto não foi confirmado. Confira antes de repetir.';
        setError(error instanceof Error ? error.message : 'Não foi possível salvar o recorte.');
      }
      throw error;
    } finally { if (guard.pending === session.token) guard.pending = null; if (ownsLock) onImageProcessingChange(false); }
  };

  return {
    handleClose,
    loading,
    error,
    blocked,
    referenceErrors,
    referenceLoading,
    retryReferences,
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
    handleCropPhoto,
    onImageProcessingChange,
  };
}
