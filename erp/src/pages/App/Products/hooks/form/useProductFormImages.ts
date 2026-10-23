import { useState } from 'react';
import { toast } from 'react-toastify';
import { compressImageToFile } from '@/pages/utils/imageUtils';
import { MAX_PARENT_PRODUCT_IMAGES } from '@/pages/utils/productImageLimits';
import { uploadFile } from '@/pages/utils/storageService';
import type Product from '../../../../types/product.type';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { imageFilesFormSchema } from '../../../../../../../shared-utils/fileFormSchemas';
import { removeProductImageGlobally } from '../../../../../../../shared-utils/productImageOperations';
import { limitProductImageSelection } from '../../../../../../../shared-utils/productImageSelection';

export type FileInputSource =
  | React.ChangeEvent<HTMLInputElement>
  | React.DragEvent
  | { readonly files: readonly File[] };

export function useProductFormImages(
  formData: Partial<Product>,
  setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>,
  setLoading: (loading: boolean) => void,
  onImagesSaved?: () => void
) {
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(0);
  const [removingPhoto, setRemovingPhoto] = useState<string | null>(null);
  const uploadForm = useZodForm(imageFilesFormSchema, { files: [] });

  const handleFileChange = async (e: FileInputSource) => {
    let files: File[] = [];
    if ('files' in e && Array.isArray(e.files)) {
      files = [...e.files];
    } else if ('target' in e && (e.target as HTMLInputElement).files) {
      files = Array.from((e.target as HTMLInputElement).files || []);
    } else if ('dataTransfer' in e && e.dataTransfer.files) {
      files = Array.from(e.dataTransfer.files);
    }

    if (files.length === 0) return;

    const currentCount = (formData.images || []).length;

    const selection = limitProductImageSelection(files, currentCount, MAX_PARENT_PRODUCT_IMAGES);
    if (selection.availableSlots === 0) {
      toast.warning(`Limite máximo de ${MAX_PARENT_PRODUCT_IMAGES} fotos atingido!`);
      return;
    }

    if (selection.skippedCount > 0) {
      toast.info(
        `Apenas as primeiras ${selection.filesToUpload.length} foto(s) serão adicionadas (limite máximo de ${MAX_PARENT_PRODUCT_IMAGES} fotos).`
      );
    }

    return uploadForm.validateAndRun({ files: selection.filesToUpload }, async (values) => {
    setLoading(true);
    setIsDraggingPhoto(selection.filesToUpload.length);
    try {
      const uploadPromises = values.files.map(async (file) => {
        const fileExt = file.name.split('.').pop() || 'jpg';
        const baseName = `${crypto.randomUUID()}_${Date.now()}`;

        // Original file - sem perda de qualidade, só usa o nome ajustado
        const originalPath = `products/${baseName}.${fileExt}`;

        // Medium - compressão em WEBP, max 1000px, 85 de qualidade
        const mediumFile = await compressImageToFile(file, {
          maxMB: 0.5,
          maxWidth: 1000,
          fileType: 'image/webp',
          initialQuality: 0.85,
        });
        const mediumPath = `products/${baseName}_medium.webp`;

        // Thumbnail - compressão em WEBP, max 200px, 75 de qualidade
        const thumbFile = await compressImageToFile(file, {
          maxMB: 0.05,
          maxWidth: 200,
          fileType: 'image/webp',
          initialQuality: 0.75,
        });
        const thumbPath = `products/${baseName}_thumb.webp`;

        // Upload paralelo das 3 variações da imagem (original mandatória; medium e thumb como otimizações)
        const [originalUrl] = await Promise.all([
          uploadFile(file, originalPath),
          uploadFile(mediumFile, mediumPath).catch((err) => {
            console.warn('Falha no upload da versão medium, fallback para original:', err);
            return originalPath;
          }),
          uploadFile(thumbFile, thumbPath).catch((err) => {
            console.warn('Falha no upload da versão thumbnail, fallback para original:', err);
            return originalPath;
          }),
        ]);

        // Retorna apenas a URL original. As outras URLs serão derivadas pelo ProductImage
        return originalUrl;
      });

      const urls = await Promise.all(uploadPromises);
      setFormData((prev: Partial<Product>) => ({
        ...prev,
        images: [...(prev.images || []), ...urls],
        ...(prev.variations?.length === 1
          ? { variations: [{ ...prev.variations[0], images: [...(prev.images || []), ...urls] }] }
          : {}),
      }));
      onImagesSaved?.();
      toast.success(`${urls.length} foto(s) otimizada(s) e enviada(s) com sucesso!`);
    } catch (error: unknown) {
      toast.error('Erro no upload e otimização das imagens.');
      console.error(error);
    } finally {
      setLoading(false);
      setIsDraggingPhoto(0);
    }
    }, (errors) => toast.error(Object.values(flattenFormErrors(errors))[0]));
  };

  const removePhoto = (url: string) => {
    setRemovingPhoto(url);
    setFormData((prev: Partial<Product>) => removeProductImageGlobally(prev, url));
    setRemovingPhoto(null);
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
      const imageFiles = Array.from(e.clipboardData.files).filter((f) =>
        f.type.startsWith('image/')
      );
      if (imageFiles.length > 0) {
        e.preventDefault();
        await handleFileChange({ files: imageFiles });
      }
    }
  };

  return {
    isDraggingPhoto,
    setIsDraggingPhoto,
    removingPhoto,
    handleFileChange,
    removePhoto,
    handlePaste,
  };
}
