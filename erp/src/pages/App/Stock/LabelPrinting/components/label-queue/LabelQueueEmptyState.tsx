import React from 'react';

interface LabelQueueEmptyStateProps {
  imageError?: string;
}

export const LabelQueueEmptyState: React.FC<LabelQueueEmptyStateProps> = ({ imageError }) => {
  return (
    <div className="py-8 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
      {imageError && <p role="alert" className="text-sm text-red-600">{imageError}</p>}
      <i className="bi bi-tags text-4xl mb-4 opacity-50" />
      <p className="text-xs font-black uppercase tracking-widest text-center">
        Nenhuma etiqueta adicionada
      </p>
      <p className="text-[10px] font-bold text-center mt-2 max-w-[200px] leading-relaxed opacity-80">
        Busque um produto acima para começar a montar a impressão.
      </p>
    </div>
  );
};
