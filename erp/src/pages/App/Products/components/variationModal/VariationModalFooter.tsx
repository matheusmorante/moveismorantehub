import React from 'react';
import type { Variation } from '@/pages/types/product.type';

interface VariationModalFooterProps {
  readonly variation: Variation | null;
  readonly loading: boolean;
  readonly blocked: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (e: React.FormEvent) => void;
}

export const VariationModalFooter: React.FC<VariationModalFooterProps> = ({
  variation,
  loading,
  blocked,
  onClose,
  onSubmit,
}) => {
  return (
    <div
      className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 shrink-0"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <button
        type="button"
        onClick={onClose}
        disabled={loading}
        className="px-5 sm:px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all cursor-pointer min-h-[44px]"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={loading || blocked}
        className="px-6 sm:px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50 min-h-[44px]"
      >
        {loading ? 'Salvando...' : variation ? 'Salvar Alterações' : 'Cadastrar'}
      </button>
    </div>
  );
};
