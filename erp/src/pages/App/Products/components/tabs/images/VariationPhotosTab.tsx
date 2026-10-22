import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { productImageCropUploadFormSchema } from '../../../../../../../../shared-utils/productImageFormSchemas';
import { withTimeout } from '../../../../../../../../shared-utils/withTimeout';
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
  readonly onReplaceImageGlobal?: (oldUrl: string, newUrl: string) => void | boolean | Promise<void | boolean>;
  readonly onCropPhoto?: (file: File, oldUrl: string) => Promise<void | boolean>;
  readonly onProcessingChange?: (pending: boolean) => boolean | void;
}

export const VariationPhotosTab: React.FC<VariationPhotosTabProps> = ({
  images,
  parentImages,
  isSingleVariation = false,
  onChangeImages,
  onReplaceImageGlobal,
  onCropPhoto,
  onProcessingChange,
}) => {
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [croppingIndex, setCroppingIndex] = useState<number | null>(null);
  const active = useRef(true), operation = useRef(false), uncertain = useRef(false), savedFiles = useRef(new WeakMap<File, string>());
  const imagesSource = useRef(images); imagesSource.current = images;
  const [errorMessage, setErrorMessage] = useState('');
  const fileForm = useZodForm(productImageCropUploadFormSchema, { oldUrl: '', file: undefined as unknown as File });
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);

  const handleRemoveImage = (indexToRemove: number) => {
    const next = images.filter((_, idx) => idx !== indexToRemove);
    onChangeImages(next);
  };

  const handleCropPhoto = async (file: File) => {
    if (croppingIndex === null || operation.current || uncertain.current) return false;
    const oldUrl = images[croppingIndex]; operation.current = true; setErrorMessage('');
    const current = () => active.current && imagesSource.current.includes(oldUrl);
    try {
      const result = onCropPhoto ? await onCropPhoto(file, oldUrl) : await fileForm.validateAndRun({ file, oldUrl }, async (values) => {
        let newUrl = savedFiles.current.get(values.file);
        if (!newUrl) {
          const url = await withTimeout(uploadOptimizedProductImage(values.file, { isCurrent: current }), 55_000, null, 'Enviar recorte');
          if (!url) throw Object.assign(new Error('O envio não foi confirmado. Confira antes de repetir.'), { uncertain: true });
          newUrl = url; savedFiles.current.set(values.file, url);
        }
        if (!current()) return false;
        if (onReplaceImageGlobal) {
          const applied = await withTimeout(Promise.resolve(onReplaceImageGlobal(values.oldUrl, newUrl)).then((value) => value !== false), 30_000, null, 'Aplicar recorte');
          if (applied === null) throw Object.assign(new Error('A aplicação não foi confirmada. Confira antes de repetir.'), { uncertain: true });
          if (!applied) throw Object.assign(new Error('A foto não foi aplicada. Tente novamente.'), { knownFailure: true });
        } else onChangeImages(replaceImageUrlAcrossList(imagesSource.current, values.oldUrl, newUrl));
        return true;
      }, (errors) => { throw Object.assign(new Error(Object.values(flattenFormErrors(errors))[0]), { knownFailure: true }); });
      if (!active.current || result === false) return false;
      setCroppingIndex(null); toast.success('Foto recortada e aplicada.'); return true;
    } catch (error) {
      if (active.current) { if (error && typeof error === 'object' && 'uncertain' in error && error.uncertain) uncertain.current = true; setErrorMessage(error instanceof Error ? error.message : 'Não foi possível aplicar o recorte.'); }
      throw error;
    } finally { operation.current = false; }
  };

  if (isSingleVariation) {
    return (
      <div className="space-y-4 animate-in fade-in duration-350">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
              Fotos vinculadas
            </h3>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Esta variação única herda automaticamente todas as fotos da galeria do produto.
            </p>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">
            {parentImages.length} foto(s) vinculada(s)
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {parentImages.map((url, index) => (
            <div
              key={url}
              className="relative aspect-square overflow-hidden border-2 border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
            >
              <ProductImage
                src={url}
                alt={`Foto ${index + 1}`}
                className="h-full w-full select-none object-cover"
                size="thumbnail"
              />
              {index === 0 && (
                <span className="absolute left-2 top-2 rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-black uppercase text-white">
                  Capa
                </span>
              )}
              {index === 1 && (
                <span className="absolute left-2 top-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-black uppercase text-white">
                  Secundária
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-350">
      {errorMessage && <p role="alert" className="text-sm text-red-600">{errorMessage}</p>}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-1.5 h-6">
            <span>Fotos vinculadas</span>
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Vincule até {MAX_VARIATION_IMAGES} fotos do produto pai. É obrigatório vincular pelo menos 1 foto na variação para concluir o cadastro. Arraste para reordenar (1ª foto: Capa, 2ª foto: Imagem Secundária).
          </p>
        </div>

        <span
          className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-xl border ${
            images.length === 0
              ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
              : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800'
          }`}
        >
          {images.length === 0
            ? 'Nenhuma foto vinculada (mín. 1)'
            : `${images.length} de ${MAX_VARIATION_IMAGES} foto(s) vinculada(s)`}
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
          portal
          onProcessingChange={onProcessingChange}
          onCancel={() => setCroppingIndex(null)}
          onConfirm={handleCropPhoto}
        />
      )}
    </div>
  );
};

export default VariationPhotosTab;
