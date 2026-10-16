import React, { useState } from 'react';
import { toast } from 'react-toastify';
import VariationParentImagesSelectModal from '../../modals/variations/VariationParentImagesSelectModal';
import { MAX_VARIATION_IMAGES } from '@/pages/utils/productImageLimits';
import ProductImage from '@/components/ProductImage';
import { moveProductImage, replaceImageUrlAcrossList } from './productImageOrdering';
import { SquareImageCropper } from './SquareImageCropper';
import { uploadOptimizedProductImage } from './productImageUpload';

interface VariationPhotosTabProps {
  readonly images: readonly string[];
  readonly parentImages: readonly string[];
  readonly isSingleVariation?: boolean;
  readonly onChangeImages: (images: string[]) => void;
  readonly onReplaceImageGlobal?: (oldUrl: string, newUrl: string) => void | Promise<void>;
}

export const VariationPhotosTab: React.FC<VariationPhotosTabProps> = ({
  images,
  parentImages,
  isSingleVariation = false,
  onChangeImages,
  onReplaceImageGlobal,
}) => {
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [croppingIndex, setCroppingIndex] = useState<number | null>(null);

  const handleRemoveImage = (indexToRemove: number) => {
    const next = images.filter((_, idx) => idx !== indexToRemove);
    onChangeImages(next);
  };

  const handleCropPhoto = async (file: File) => {
    if (croppingIndex === null) return;
    const index = croppingIndex;
    const oldUrl = images[index];
    try {
      const newUrl = await uploadOptimizedProductImage(file);
      if (onReplaceImageGlobal) {
        await onReplaceImageGlobal(oldUrl, newUrl);
      } else {
        const next = replaceImageUrlAcrossList(images, oldUrl, newUrl);
        onChangeImages(next);
      }
      setCroppingIndex(null);
      toast.success('Foto recortada em 1:1 e atualizada!');
    } catch (error) {
      console.error('Erro ao recortar imagem da variação:', error);
      toast.error('Erro ao processar e salvar o recorte da imagem.');
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-350">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-1.5 h-6">
            <span>Fotos vinculadas</span>
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {isSingleVariation
              ? `As fotos desta variação acompanham as fotos do produto (máximo de ${MAX_VARIATION_IMAGES} fotos). Arraste para reordenar ou vincule fotos específicas.`
              : `Vincule até ${MAX_VARIATION_IMAGES} fotos do produto pai. Arraste para reordenar (1ª foto: Capa, 2ª foto: Imagem Secundária).`}
          </p>
        </div>

        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-800">
          {images.length} de {MAX_VARIATION_IMAGES} foto(s) vinculada(s)
        </span>
      </div>

      {/* Grid com Input 1:1 + Fotos Vinculadas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 pt-1 select-none">
        {/* Slot/Input 1:1 de Adicionar/Vincular Fotos */}
        <button
          type="button"
          onClick={() => setIsSelectModalOpen(true)}
          className="group relative aspect-square rounded-none border-2 border-dashed border-blue-300 dark:border-blue-800 hover:border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/80 dark:hover:bg-blue-900/30 transition-all flex flex-col items-center justify-center gap-2 text-center p-3 cursor-pointer shadow-xs hover:shadow-md"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30 group-hover:scale-110 transition-transform">
            <i className="bi bi-plus-lg text-lg" aria-hidden="true" />
          </div>
          <div>
            <span className="text-xs font-black text-blue-600 dark:text-blue-400 block">
              Vincular Fotos
            </span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">
              Fotos do Pai
            </span>
          </div>
        </button>

        {/* Fotos Vinculadas com Drag and Drop */}
        {images.map((url, index) => {
          const isCover = index === 0;
          const isSecondary = index === 1;

          return (
            <div
              key={url}
              draggable
              onClick={() => {
                setActiveImageIndex((prev) => (prev === index ? null : index));
              }}
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', String(index));
                e.dataTransfer.effectAllowed = 'move';
                setActiveImageIndex(null);
                setDraggedIndex(index);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (draggedIndex === null || draggedIndex === index) return;
                const newImages = moveProductImage([...images], draggedIndex, index);
                setDraggedIndex(index);
                onChangeImages(newImages);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDraggedIndex(null);
              }}
              onDragEnd={() => setDraggedIndex(null)}
              className={`group relative aspect-square rounded-none overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all shadow-sm bg-slate-50 dark:bg-slate-900 ${
                isCover
                  ? 'border-blue-500 ring-2 ring-blue-500/30'
                  : isSecondary
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-blue-300'
              } ${draggedIndex === index ? 'opacity-50 scale-95 ring-2 ring-blue-400' : 'opacity-100'}`}
              title="Clique para ver opções ou arraste para reordenar"
            >
              <ProductImage
                src={url}
                alt={`Foto ${index + 1}`}
                className="object-cover w-full h-full pointer-events-none select-none"
                size="thumbnail"
              />

              {/* Badge Capa */}
              {isCover && (
                <div className="absolute top-2 left-2 z-10 bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md border border-white/40 flex items-center gap-1">
                  <i className="bi bi-star-fill text-[8px]" aria-hidden="true" />
                  Capa
                </div>
              )}

              {/* Badge Imagem Secundária */}
              {isSecondary && (
                <div className="absolute top-2 left-2 z-10 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md border border-white/40 flex items-center gap-1">
                  <i className="bi bi-door-open-fill text-[8px]" aria-hidden="true" />
                  Secundária
                </div>
              )}

              {/* Botões de Ação (Recortar e Desvincular) */}
              <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
                {/* Botão Recortar 1:1 */}
                <button
                  type="button"
                  aria-label={`Recortar foto ${index + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIndex(null);
                    setCroppingIndex(index);
                  }}
                  className={`w-7 h-7 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 cursor-pointer ${
                    activeImageIndex === index
                      ? 'opacity-100 pointer-events-auto visible'
                      : 'opacity-0 pointer-events-none invisible group-hover:opacity-100 group-hover:pointer-events-auto group-hover:visible'
                  }`}
                  title="Recortar foto em 1:1"
                >
                  <i className="bi bi-crop text-xs" aria-hidden="true" />
                </button>

                {/* Botão Remover/Desvincular */}
                <button
                  type="button"
                  aria-label={`Desvincular foto ${index + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIndex(null);
                    handleRemoveImage(index);
                  }}
                  className={`w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 cursor-pointer ${
                    activeImageIndex === index
                      ? 'opacity-100 pointer-events-auto visible'
                      : 'opacity-0 pointer-events-none invisible group-hover:opacity-100 group-hover:pointer-events-auto group-hover:visible'
                  }`}
                  title="Desvincular foto"
                >
                  <i className="bi bi-trash text-xs" aria-hidden="true" />
                </button>
              </div>

              {/* Dica de arrasto em hover */}
              <div
                className={`absolute inset-x-0 bottom-0 py-1 bg-gradient-to-t from-black/70 to-transparent transition-opacity flex items-center justify-center text-white text-[8px] font-black uppercase tracking-wider gap-1 pointer-events-none ${
                  activeImageIndex === index
                    ? 'opacity-100 visible'
                    : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible'
                }`}
              >
                <i className="bi bi-arrows-move" aria-hidden="true" />
                Arrastar
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Seleção de Fotos do Pai */}
      <VariationParentImagesSelectModal
        isOpen={isSelectModalOpen}
        onClose={() => setIsSelectModalOpen(false)}
        parentImages={parentImages as string[]}
        selectedImages={images as string[]}
        maxSelection={MAX_VARIATION_IMAGES}
        onConfirm={(selected) => onChangeImages(selected.slice(0, MAX_VARIATION_IMAGES))}
      />

      {/* Modal de Recorte 1:1 */}
      {croppingIndex !== null && images[croppingIndex] && (
        <SquareImageCropper
          imageUrl={images[croppingIndex]}
          onCancel={() => setCroppingIndex(null)}
          onConfirm={handleCropPhoto}
        />
      )}
    </div>
  );
};

export default VariationPhotosTab;
