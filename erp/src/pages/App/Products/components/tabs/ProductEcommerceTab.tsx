import type React from 'react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { compressImageToFile } from '@/pages/utils/images/imageUtils';
import {
  getMaxParentProductImages,
  MAX_PARENT_PRODUCT_IMAGES,
  MAX_VARIATION_IMAGES,
} from '@/pages/utils/productImageLimits';
import { uploadFile } from '@/pages/utils/storageService';
import { createBackgroundRemovedPngFile } from '@/pages/utils/images/backgroundRemoval';
import type Product from '../../../../types/product.type';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { imageFilesFormSchema } from '../../../../../../../shared-utils/fileFormSchemas';
import { moveProductImageGlobally, replaceProductImage, replaceProductImageGlobally } from './images/productImageOrdering';
import { ProductGalleryPhotoCard } from './images/ProductGalleryPhotoCard';
import { SquareImageCropper } from './images/SquareImageCropper';
import { uploadOptimizedProductImage } from './images/productImageUpload';

interface ProductEcommerceTabProps {
  readonly formData: Partial<Product>;
  readonly setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  readonly activeEcommerceSubTab?: 'vitrine' | 'photos' | 'descriptions' | 'logistics' | 'seo';
  readonly setActiveEcommerceSubTab?: React.Dispatch<
    React.SetStateAction<'vitrine' | 'photos' | 'descriptions' | 'logistics' | 'seo'>
  >;
  readonly isDraggingPhoto?: number;
  readonly setIsDraggingPhoto?: React.Dispatch<React.SetStateAction<number>>;
  readonly handleFileChange: (
    e: React.ChangeEvent<HTMLInputElement> | React.DragEvent | { files: File[] }
  ) => void;
  readonly onImagesSaved?: () => void;
  readonly removingPhoto?: string | null;
  readonly removePhoto: (url: string) => void;
  readonly handleGenerateAIDescription?: (type: 'whatsapp' | 'ecommerce') => void;
  readonly isGeneratingDescription?: boolean;
  readonly handleGenerateMarketplaceTitle?: () => void;
  readonly isGeneratingTitle?: boolean;
  readonly handleToggleActive?: () => void;
}

const ProductEcommerceTab: React.FC<ProductEcommerceTabProps> = ({
  formData,
  setFormData,
  handleFileChange,
  onImagesSaved,
  removePhoto,
  isDraggingPhoto = 0,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [processingImage, setProcessingImage] = useState<{ index: number; message: string } | null>(null);
  const [croppingIndex, setCroppingIndex] = useState<number | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const replaceForm = useZodForm(imageFilesFormSchema, { files: [] });
  const maxPhotos = MAX_PARENT_PRODUCT_IMAGES;
  const currentCount = (formData.images || []).length;
  const isSimpleProduct =
    !formData.hasVariations && (formData.variations || []).length <= 1;

  const handleReplacePhoto = async (
    index: number,
    file: File,
    options?: { silentToast?: boolean; originalUrl?: string }
  ) => {
    return replaceForm.validateAndRun({ files: [file] }, async ({ files: [selectedFile] }) => {
      file = selectedFile;
      setProcessingImage({ index, message: 'Substituindo...' });
      try {
        const oldUrl = options?.originalUrl || (formData.images || [])[index];
        const newUrl = await uploadOptimizedProductImage(file);

        setFormData((prev) => replaceProductImageGlobally(prev, oldUrl, newUrl, index));
        onImagesSaved?.();
        if (!options?.silentToast) {
          toast.success('Foto substituída com sucesso!');
        }
        return true;
      } catch (error: unknown) {
        console.error('Erro ao substituir foto:', error);
        toast.error('Erro ao substituir a imagem.');
        return false;
      } finally {
        setProcessingImage(null);
      }
    }, (errors) => toast.error(Object.values(flattenFormErrors(errors))[0]));
  };

  const handleRemoveBackground = async (index: number, imageUrl: string) => {
    if (processingImage) return;
    setActiveImageIndex(null);
    setProcessingImage({ index, message: 'Removendo fundo...' });
    try {
      const file = await createBackgroundRemovedPngFile(imageUrl, `produto-${index + 1}`);
      setProcessingImage({ index, message: 'Enviando imagem...' });
      if (await handleReplacePhoto(index, file, { silentToast: true, originalUrl: imageUrl })) {
        toast.success('Fundo removido e foto do produto atualizada!');
      }
    } catch (error: unknown) {
      console.error('Erro ao remover fundo da foto:', error);
      toast.error(error instanceof Error ? error.message : 'Não foi possível remover o fundo.');
    } finally {
      setProcessingImage(null);
    }
  };

  const handleCropPhoto = async (file: File) => {
    if (croppingIndex === null) return;
    const index = croppingIndex;
    setCroppingIndex(null);
    if (await handleReplacePhoto(index, file, { silentToast: true })) {
      toast.success('Foto recortada em 1:1 e atualizada!');
    }
  };
  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* PHOTOS SECTION */}
      <div id="field-product-images" className="flex flex-col gap-6 transition-all p-2 rounded-2xl">
        <div
          role="note"
          aria-label="Limite de fotos do produto"
          className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-900 dark:border-blue-800/70 dark:bg-blue-950/30 dark:text-blue-200"
        >
          <i
            className="bi bi-info-circle-fill mt-0.5 shrink-0 text-blue-600 dark:text-blue-400"
            aria-hidden="true"
          />
          <div className="space-y-1 text-xs">
            <p>
              Adicione aqui as fotos principais do produto. As variações poderão vincular fotos
              desta galeria para mostrar imagens específicas de cada modelo.
            </p>
            <p className="font-black">Limite da galeria: {maxPhotos} fotos.</p>
            {isSimpleProduct && (
              <p className="font-semibold">
                Arraste para reordenar: a primeira foto é a Capa e a segunda é a Secundária.
              </p>
            )}
            <p>
              Produtos com várias variações podem vincular até {MAX_VARIATION_IMAGES} fotos por
              variação. Com uma única variação, toda a galeria é vinculada automaticamente.
            </p>
            {currentCount > maxPhotos && (
              <p className="font-semibold">
                Este cadastro já possui {currentCount} fotos, acima do limite de {maxPhotos}. As
                fotos existentes serão preservadas; remova algumas antes de incluir novas.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider">
            <i className="bi bi-camera text-base text-purple-600 dark:text-purple-400"></i>
            <span>
              Galeria ({currentCount}/{maxPhotos})
            </span>
          </div>
        </div>

        <div className="transition-colors rounded-[2rem] border-2 border-dashed border-slate-150 dark:border-slate-800 p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-955/10">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 select-none min-w-0 w-full">
            {(formData.images || []).map((url, index) => (
              <ProductGalleryPhotoCard
                key={url}
                url={url}
                index={index}
                isSimpleProduct={isSimpleProduct}
                isLinkedToVariation={(formData.variations || []).some((variation) =>
                  (variation.images || []).includes(url)
                )}
                isActive={activeImageIndex === index}
                isBusy={Boolean(processingImage)}
                processingMessage={processingImage?.index === index ? processingImage.message : null}
                draggedIndex={draggedIndex}
                onToggleActive={() => setActiveImageIndex((prev) => (prev === index ? null : index))}
                onClearActive={() => setActiveImageIndex(null)}
                onDragStart={() => setDraggedIndex(index)}
                onDragReorder={(fromIndex) => {
                  setDraggedIndex(index);
                  setFormData((prev) => moveProductImageGlobally(prev, fromIndex, index));
                  onImagesSaved?.();
                }}
                onDragEnd={() => setDraggedIndex(null)}
                onOpenCrop={() => setCroppingIndex(index)}
                onReplaceFile={(file) => handleReplacePhoto(index, file)}
                onRemoveBackground={() => void handleRemoveBackground(index, url)}
                onDelete={() => removePhoto(url)}
              />
            ))}
            {Array.from({ length: isDraggingPhoto }, (_, index) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: placeholder list during upload
                key={`uploading-${index}`}
                className="aspect-square w-full rounded-none border-2 border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/30 flex flex-col items-center justify-center gap-2 animate-pulse"
              >
                <i className="bi bi-arrow-repeat animate-spin text-2xl text-purple-600" />
                <span className="text-[9px] font-black uppercase tracking-wider text-purple-600">
                  Enviando...
                </span>
              </div>
            ))}
            {currentCount < maxPhotos && (
              <label className="aspect-square w-full bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-none flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-purple-500 hover:bg-purple-50/20 dark:hover:bg-purple-955/20 transition-all group shadow-sm">
                <i className="bi bi-plus text-2xl text-purple-600 dark:text-purple-400 group-hover:scale-125 transition-transform"></i>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Adicionar
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                />
              </label>
            )}
          </div>
        </div>
      </div>
      {croppingIndex !== null && formData.images?.[croppingIndex] && (
        <SquareImageCropper
          imageUrl={formData.images[croppingIndex]}
          onCancel={() => setCroppingIndex(null)}
          onConfirm={handleCropPhoto}
        />
      )}
    </div>
  );
};

export default ProductEcommerceTab;
