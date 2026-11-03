import React, { useCallback, useRef } from 'react';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import {
  productImageCropUploadFormSchema,
  productImageReplacementFormSchema,
} from '../../../../../../../shared-utils/productImageFormSchemas';
import { uploadOptimizedProductImage } from '../../components/tabs/images/productImageUpload';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import type { Product, Variation } from '@/pages/types/product.type';
import { getLocalProducts } from '@/pages/utils/productService/productLocalCache';
import { updateProduct } from '@/pages/utils/productService/productMutationService';
import {
  replaceImageUrlAcrossList,
  replaceProductImageGlobally,
} from '../../components/tabs/images/productImageOrdering';
import type { VariationFormOperationGuard } from './variationForm.types';

interface UseVariationFormImagesOptions {
  allParentImages: string[];
  formData: Variation | null;
  guard: VariationFormOperationGuard;
  onReplaceImageGlobal?: (
    oldUrl: string,
    newUrl: string
  ) => void | boolean | Promise<void | boolean>;
  parentId?: string;
  parentProduct: Product;
  session: {
    active: boolean;
    lock: boolean;
    completed: boolean;
    token: symbol;
  };
  setAllParentImages: React.Dispatch<React.SetStateAction<string[]>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
  setFormData: React.Dispatch<React.SetStateAction<Variation | null>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useVariationFormImages({
  allParentImages,
  formData,
  guard,
  onReplaceImageGlobal,
  parentId,
  parentProduct,
  session,
  setAllParentImages,
  setError,
  setFormData,
  setLoading,
}: UseVariationFormImagesOptions) {
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
    onImageProcessingChange,
    handleReplaceImageGlobal,
    handleCropPhoto,
  };
}