import { ChevronLeft, ChevronRight, ExternalLink, Image as ImageIcon, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  getUnavailabilityPhotoUrls,
  type StockUnavailability,
} from '@/pages/utils/stockUnavailabilityService';

interface PhotoPreviewModalProps {
  item: StockUnavailability | null;
  onClose: () => void;
}

export default function PhotoPreviewModal({ item, onClose }: PhotoPreviewModalProps) {
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!item?.photos?.length) {
      setPhotoUrls([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setCurrentIndex(0);

    getUnavailabilityPhotoUrls(item.photos)
      .then((urls) => {
        if (isMounted) {
          setPhotoUrls(urls);
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar fotos da indisponibilidade:', err);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [item]);

  if (!item) return null;

  const productName = item.products?.name || 'Produto';
  const variationName = item.product_variations?.name;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photoUrls.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < photoUrls.length - 1 ? prev + 1 : 0));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-preview-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
    >
      <button
        type="button"
        aria-label="Fechar fotos"
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm cursor-default"
        onClick={onClose}
      />
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh] relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3
              id="photo-preview-title"
              className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"
            >
              <ImageIcon className="text-blue-600" size={20} />
              Fotos da Indisponibilidade
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {productName}
              {variationName ? ` • ${variationName}` : ''} ({item.quantity} un)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar fotos"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 flex flex-col items-center justify-center overflow-y-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 text-slate-500 py-12">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Carregando fotos seguras…</span>
            </div>
          ) : photoUrls.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <ImageIcon size={48} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">Nenhuma foto disponível para visualização.</p>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              {/* Foto Principal */}
              <div className="relative group w-full flex items-center justify-center bg-slate-100 dark:bg-slate-950 rounded-xl overflow-hidden max-h-[60vh]">
                <img
                  src={photoUrls[currentIndex]}
                  alt={`Foto ${currentIndex + 1} da indisponibilidade`}
                  className="max-h-[60vh] max-w-full object-contain select-none"
                />

                {photoUrls.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrev}
                      aria-label="Foto anterior"
                      className="absolute left-2 p-2 rounded-full bg-black/40 text-white hover:bg-black/70 transition-all opacity-80 hover:opacity-100"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      aria-label="Próxima foto"
                      className="absolute right-2 p-2 rounded-full bg-black/40 text-white hover:bg-black/70 transition-all opacity-80 hover:opacity-100"
                    >
                      <ChevronRight size={24} />
                    </button>
                  </>
                )}

                <a
                  href={photoUrls[currentIndex]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-2 right-2 p-2 rounded-lg bg-black/40 text-white hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100 text-xs flex items-center gap-1 font-medium"
                >
                  <ExternalLink size={14} /> Abrir original
                </a>
              </div>

              {/* Indicador de fotos e Miniaturas */}
              {photoUrls.length > 1 && (
                <div className="mt-4 flex items-center gap-2 overflow-x-auto max-w-full pb-2">
                  {photoUrls.map((url, index) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setCurrentIndex(index)}
                      className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                        index === currentIndex
                          ? 'border-blue-600 scale-105 shadow-md'
                          : 'border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={url}
                        alt={`Miniatura ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Foto {currentIndex + 1} de {photoUrls.length}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg text-sm font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
