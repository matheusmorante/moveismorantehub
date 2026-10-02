import type React from 'react';
import type { CategoryType } from '../hooks/useLabelCategory';
import type { GridModel } from '../types/LabelGridModelTypes';

interface LabelCopyCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelToCopy: GridModel | null;
  selectedCategory: CategoryType | null;
  handleCopyToCategory: (model: GridModel, category: CategoryType) => Promise<void>;
}

export const LabelCopyCategoryModal: React.FC<LabelCopyCategoryModalProps> = ({
  isOpen,
  onClose,
  modelToCopy,
  selectedCategory,
  handleCopyToCategory,
}) => {
  if (!isOpen || !modelToCopy) return null;

  const categories = (['identificacao', 'precos', 'logos', 'posts'] as const)
    .filter((c) => c !== selectedCategory)
    .filter((c) => {
      // Etiquetas redondas só são compatíveis com a categoria 'logos'
      if (modelToCopy.type === 'round') {
        return c === 'logos';
      }
      return true;
    });

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div
        role="button"
        tabIndex={0}
        aria-label="Fechar modal de cópia"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-all duration-300"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
            onClose();
          }
        }}
      />
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in fade-in duration-300">
        <div className="px-10 py-8 border-b border-slate-50 dark:border-slate-800 text-center">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 mx-auto mb-4">
            <i className="bi bi-files-alternate text-2xl" />
          </div>
          <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none mb-2">
            Enviar Cópia
          </h3>
          <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black">
            Selecione a categoria de destino
          </p>
        </div>

        <div className="p-10 space-y-3">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                handleCopyToCategory(modelToCopy, cat);
                onClose();
              }}
              className="w-full p-6 bg-slate-50 dark:bg-slate-800 hover:bg-blue-600 text-slate-600 dark:text-slate-300 hover:text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-between group active:scale-95 shadow-sm hover:shadow-xl hover:shadow-blue-500/20"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-xl bg-white/50 dark:bg-slate-700/50 flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                  <i
                    className={`bi bi-${
                      cat === 'identificacao'
                        ? 'qr-code-scan'
                        : cat === 'precos'
                          ? 'tag-fill'
                          : cat === 'logos'
                            ? 'palette-fill'
                            : 'instagram'
                    }`}
                  />
                </div>
                <span>
                  {cat === 'identificacao'
                    ? 'Identificação / ID'
                    : cat === 'precos'
                      ? 'Preços de Venda'
                      : cat === 'logos'
                        ? 'Logos e Rótulos'
                        : 'Marketing / Posts'}
                </span>
              </div>
              <i className="bi bi-chevron-right text-xs group-hover:translate-x-1 transition-transform" />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="bg-slate-100 dark:bg-slate-800 p-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default LabelCopyCategoryModal;
