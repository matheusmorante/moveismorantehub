import type React from 'react';
import { warmBackgroundRemoval } from '@/pages/utils/images/backgroundRemoval';

interface ProductGalleryPhotoCardProps {
  url: string;
  index: number;
  isSimpleProduct: boolean;
  isLinkedToVariation: boolean;
  isActive: boolean;
  isBusy: boolean;
  processingMessage: string | null;
  draggedIndex: number | null;
  onToggleActive: () => void;
  onClearActive: () => void;
  onDragStart: () => void;
  onDragReorder: (fromIndex: number) => void;
  onDragEnd: () => void;
  onOpenCrop: () => void;
  onReplaceFile: (file: File) => void;
  onRemoveBackground: () => void;
  onDelete: () => void;
}

/**
 * Interactive gallery tile displaying a product photo with drag-to-reorder,
 * status badges, and hover/tap actions (crop, replace, background removal, delete).
 */
export const ProductGalleryPhotoCard: React.FC<ProductGalleryPhotoCardProps> = ({
  url,
  index,
  isSimpleProduct,
  isLinkedToVariation,
  isActive,
  isBusy,
  processingMessage,
  draggedIndex,
  onToggleActive,
  onClearActive,
  onDragStart,
  onDragReorder,
  onDragEnd,
  onOpenCrop,
  onReplaceFile,
  onRemoveBackground,
  onDelete,
}) => {
  const isCover = isSimpleProduct && index === 0;
  const isSecondary = isSimpleProduct && index === 1;
  const borderClass = isCover
    ? 'border-blue-500 ring-2 ring-blue-500/30'
    : isSecondary
      ? 'border-emerald-500 ring-2 ring-emerald-500/20'
      : 'border-slate-200 dark:border-slate-800';

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: item de galeria arrastavel
    <div
      draggable={!isBusy}
      onClick={() => {
        if (isBusy) return;
        onToggleActive();
      }}
      onDragStart={(event) => {
        if (isBusy) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.setData('text/plain', String(index));
        event.dataTransfer.effectAllowed = 'move';
        onClearActive();
        onDragStart();
      }}
      onDragOver={(event) => {
        if (isBusy) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        if (draggedIndex === null || draggedIndex === index) return;
        onDragReorder(draggedIndex);
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDragEnd();
      }}
      onDragEnd={onDragEnd}
      className={`group relative aspect-square w-full rounded-none overflow-hidden border-2 cursor-move transition-all shadow-sm ${borderClass}`}
      title="Clique para ver opções ou arraste para reordenar"
    >
      <img
        src={url}
        alt={`Foto ${index + 1}`}
        className="object-cover w-full h-full pointer-events-none"
      />

      {isCover && (
        <span className="absolute top-2 left-2 z-20 flex items-center gap-1 rounded-full border border-white/40 bg-blue-600 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-md">
          <i className="bi bi-star-fill text-[8px]" aria-hidden="true" />
          Capa
        </span>
      )}
      {isSecondary && (
        <span className="absolute top-2 left-2 z-20 flex items-center gap-1 rounded-full border border-white/40 bg-emerald-600 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-md">
          <i className="bi bi-images text-[8px]" aria-hidden="true" />
          Secundária
        </span>
      )}

      {!isLinkedToVariation && (
        <span
          className="absolute top-2 right-2 z-20 text-amber-500 drop-shadow-md"
          title="Nenhuma variação está usando esta foto."
          aria-label="Nenhuma variação está usando esta foto."
          role="img"
        >
          <i className="bi bi-exclamation-triangle-fill text-lg" aria-hidden="true" />
        </span>
      )}

      {processingMessage && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-1 z-30 text-white">
          <i className="bi bi-hourglass-split animate-spin text-xl" />
          <span className="text-[9px] font-black uppercase tracking-wider">
            {processingMessage}
          </span>
        </div>
      )}

      <div
        className={`absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 z-10 p-2 transition-all duration-200 ${
          isActive
            ? 'opacity-100 pointer-events-auto visible'
            : 'opacity-0 pointer-events-none invisible group-hover:opacity-100 group-hover:pointer-events-auto group-hover:visible'
        }`}
      >
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isBusy}
            onClick={(event) => {
              event.stopPropagation();
              onClearActive();
              onOpenCrop();
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-xl transition-all shadow-md hover:scale-110 active:scale-95 flex items-center justify-center cursor-pointer"
            title="Recortar foto em 1:1"
          >
            <i className="bi bi-crop text-xs" />
          </button>

          <label
            className={`bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl transition-all shadow-md flex items-center justify-center ${isBusy ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110 active:scale-95'}`}
            title="Substituir foto"
            onClick={(event) => {
              event.stopPropagation();
              if (isBusy) event.preventDefault();
            }}
          >
            <i className="bi bi-camera text-xs" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={isBusy}
              onChange={(event) => {
                onClearActive();
                const file = event.target.files?.[0];
                if (file) onReplaceFile(file);
              }}
            />
          </label>

          <button
            type="button"
            disabled={isBusy}
            onMouseEnter={() => void warmBackgroundRemoval()}
            onFocus={() => void warmBackgroundRemoval()}
            onClick={(event) => {
              event.stopPropagation();
              onRemoveBackground();
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl transition-all shadow-md hover:scale-110 active:scale-95 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            title="Remover fundo da foto"
            aria-label={`Remover fundo da foto ${index + 1}`}
          >
            <i className="bi bi-eraser-fill text-xs" aria-hidden="true" />
          </button>

          <button
            type="button"
            disabled={isBusy}
            onClick={(event) => {
              event.stopPropagation();
              onClearActive();
              onDelete();
            }}
            className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-xl transition-all shadow-md hover:scale-110 active:scale-95 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            title="Apagar foto"
          >
            <i className="bi bi-trash text-xs" />
          </button>
        </div>
      </div>
    </div>
  );
};
