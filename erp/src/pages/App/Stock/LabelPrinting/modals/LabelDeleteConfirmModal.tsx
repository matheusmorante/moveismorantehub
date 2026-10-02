import type React from 'react';
import { DEFAULT_LAYOUT_MODELS } from '../utils/LabelConstants';

interface LabelDeleteConfirmModalProps {
  isOpen: boolean;
  modelToDelete: string | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const LabelDeleteConfirmModal: React.FC<LabelDeleteConfirmModalProps> = ({
  isOpen,
  modelToDelete,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !modelToDelete) return null;

  const isSystemDefault = DEFAULT_LAYOUT_MODELS.some((m) => m.id === modelToDelete);

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
      <div
        role="button"
        tabIndex={0}
        aria-label="Cancelar exclusão"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
            onClose();
          }
        }}
      />
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in slide-in-from-bottom-4 duration-300">
        <div className="px-10 py-10 text-center">
          <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 mx-auto mb-6">
            <i className="bi bi-trash3-fill text-3xl" />
          </div>
          <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-tight mb-3">
            Excluir Modelo?
          </h3>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold leading-relaxed px-4">
            {isSystemDefault
              ? 'Este modelo é padrão. Deseja apenas ocultá-lo da sua lista?'
              : 'Esta ação não pode ser desfeita. O layout será removido permanentemente.'}
          </p>
        </div>

        <div className="flex border-t border-slate-50 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 p-6 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors border-l border-slate-50 dark:border-slate-800"
          >
            Sim, Excluir
          </button>
        </div>
      </div>
    </div>
  );
};

export default LabelDeleteConfirmModal;
