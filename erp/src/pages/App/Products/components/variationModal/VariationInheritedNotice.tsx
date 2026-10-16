import React from 'react';

export const VariationInheritedNotice: React.FC = () => {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-50/40 px-5 py-8 dark:bg-slate-955/40">
      <div
        role="status"
        className="max-w-lg rounded-2xl border border-slate-200 bg-white/95 px-6 py-5 text-center shadow-xl dark:border-slate-700 dark:bg-slate-900/95"
      >
        <i
          className="bi bi-arrow-down-up mb-3 block text-2xl text-blue-600 dark:text-blue-400"
          aria-hidden="true"
        />
        <p className="text-sm font-bold leading-relaxed text-slate-700 dark:text-slate-200">
          Como este produto tem apenas uma variação, somente as abas Informações Básicas e Fotos
          vinculadas permitem edição.
        </p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Para editar as demais informações, atualize o produto principal ou adicione outra
          variação.
        </p>
      </div>
    </div>
  );
};
