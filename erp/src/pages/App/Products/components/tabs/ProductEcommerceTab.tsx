import type React from 'react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { compressImageToFile } from '@/pages/utils/imageUtils';
import {
  getMaxParentProductImages,
  MAX_PARENT_PRODUCT_IMAGES,
  MAX_VARIATION_IMAGES,
} from '@/pages/utils/productImageLimits';
import { uploadFile } from '@/pages/utils/storageService';
import type Product from '../../../../types/product.type';
import { moveProductImage, replaceProductImage } from './images/productImageOrdering';
import { SquareImageCropper } from './images/SquareImageCropper';

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
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const [croppingIndex, setCroppingIndex] = useState<number | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const maxPhotos = MAX_PARENT_PRODUCT_IMAGES;
  const currentCount = (formData.images || []).length;

  const handleReplacePhoto = async (index: number, file: File) => {
    setReplacingIndex(index);
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const randomId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}_${Math.random().toString(36).substring(2)}`;
      const baseName = `${randomId}`;

      // Original
      const originalPath = `products/${baseName}.${fileExt}`;

      // Medium
      const mediumFile = await compressImageToFile(file, {
        maxMB: 0.5,
        maxWidth: 1000,
        fileType: 'image/webp',
        initialQuality: 0.85,
      });
      const mediumPath = `products/${baseName}_medium.webp`;

      // Thumb
      const thumbFile = await compressImageToFile(file, {
        maxMB: 0.05,
        maxWidth: 200,
        fileType: 'image/webp',
        initialQuality: 0.75,
      });
      const thumbPath = `products/${baseName}_thumb.webp`;

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
      const newUrl = originalUrl;

      const updatedImages = replaceProductImage(formData.images || [], index, newUrl);
      setFormData((prev) => ({ ...prev, images: updatedImages }));
      onImagesSaved?.();
      toast.success('Foto substituída com sucesso!');
      return true;
    } catch (error: unknown) {
      console.error('Erro ao substituir foto:', error);
      toast.error('Erro ao substituir a imagem.');
      return false;
    } finally {
      setReplacingIndex(null);
    }
  };

  const handleCropPhoto = async (file: File) => {
    if (croppingIndex === null) return;
    const index = croppingIndex;
    setCroppingIndex(null);
    if (await handleReplacePhoto(index, file)) {
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
            <p>Cada variação pode vincular até {MAX_VARIATION_IMAGES} fotos desta galeria.</p>
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
            {(formData.images || []).map((url, index) => {
              const borderClass = 'border-slate-200 dark:border-slate-800';
              return (
                // biome-ignore lint/a11y/noStaticElementInteractions: item de galeria arrastavel
                <div
                  key={url}
                  draggable
                  onClick={() => setActiveImageIndex((prev) => (prev === index ? null : index))}
                  onDragStart={() => {
                    setActiveImageIndex(null);
                    setDraggedIndex(index);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedIndex === null || draggedIndex === index) return;
                    const newImages = moveProductImage(formData.images || [], draggedIndex, index);
                    setDraggedIndex(index);
                    setFormData({ ...formData, images: newImages });
                  }}
                  onDragEnd={() => setDraggedIndex(null)}
                  className={`group relative aspect-square w-full rounded-none overflow-hidden border-2 cursor-move transition-all shadow-sm ${borderClass}`}
                  title="Clique para ver opções ou arraste para reordenar"
                >
                  <img
                    src={url}
                    alt={`Foto ${index + 1}`}
                    className="object-cover w-full h-full pointer-events-none"
                  />

                  {replacingIndex === index && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-1 z-30 text-white">
                      <i className="bi bi-hourglass-split animate-spin text-xl"></i>
                      <span className="text-[9px] font-black uppercase tracking-wider">
                        Substituindo...
                      </span>
                    </div>
                  )}

                  <div
                    className={`absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 z-10 p-2 transition-all duration-200 ${
                      activeImageIndex === index
                        ? 'opacity-100 pointer-events-auto visible'
                        : 'opacity-0 pointer-events-none invisible group-hover:opacity-100 group-hover:pointer-events-auto group-hover:visible'
                    }`}
                  >
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setActiveImageIndex(null);
                          setCroppingIndex(index);
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-xl transition-all shadow-md hover:scale-110 active:scale-95 flex items-center justify-center cursor-pointer"
                        title="Recortar foto em 1:1"
                      >
                        <i className="bi bi-crop text-xs"></i>
                      </button>
                      {/* Substituir foto (Câmera) */}
                      <label
                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl transition-all shadow-md cursor-pointer hover:scale-110 active:scale-95 flex items-center justify-center"
                        title="Substituir foto"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <i className="bi bi-camera text-xs"></i>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            setActiveImageIndex(null);
                            const file = e.target.files?.[0];
                            if (file) {
                              handleReplacePhoto(index, file);
                            }
                          }}
                        />
                      </label>

                      {/* Apagar foto (Lixeira) */}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setActiveImageIndex(null);
                          removePhoto(url);
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-xl transition-all shadow-md hover:scale-110 active:scale-95 flex items-center justify-center cursor-pointer"
                        title="Apagar foto"
                      >
                        <i className="bi bi-trash text-xs"></i>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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
