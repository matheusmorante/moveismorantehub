import React from 'react';
import type { InventoryScopeType } from '../types/inventoryScope.types';

interface InventoryScopeTypeSelectorProps {
  readonly onSelect: (type: InventoryScopeType) => void;
}

export const InventoryScopeTypeSelector: React.FC<InventoryScopeTypeSelectorProps> = ({
  onSelect,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up">
      <button
        onClick={() => onSelect('general')}
        className="flex flex-col items-start p-6 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all text-left"
      >
        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center text-xl mb-4">
          <i className="bi bi-qr-code-scan"></i>
        </div>
        <span className="font-bold text-slate-800 dark:text-slate-200 text-lg">
          Inventário Geral
        </span>
        <span className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  Conte todos os itens do escopo pelo scanner geral. Os cartões mostram as quantidades contadas por fornecedor.
        </span>
      </button>

      <button
        onClick={() => onSelect('full')}
        className="flex flex-col items-start p-6 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-md transition-all text-left"
      >
        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center text-xl mb-4">
          <i className="bi bi-boxes"></i>
        </div>
        <span className="font-bold text-slate-800 dark:text-slate-200 text-lg">
          Livre: Etapas por Fornecedor
        </span>
        <span className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
          Produtos convencionais ativos organizados por fornecedor. Salvados e Usados ficam fora da
          contagem.
        </span>
      </button>

      <button
        onClick={() => onSelect('product')}
        className="flex flex-col items-start p-6 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl hover:border-violet-500 dark:hover:border-violet-500 hover:shadow-md transition-all text-left"
      >
        <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 rounded-xl flex items-center justify-center text-xl mb-4">
          <i className="bi bi-box-seam"></i>
        </div>
        <span className="font-bold text-slate-800 dark:text-slate-200 text-lg">
          Produto específico e suas variações
        </span>
        <span className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
          Escolha um produto pai ativo e conte somente as variações dele.
        </span>
      </button>

      <button
        onClick={() => onSelect('supplier')}
        className="flex flex-col items-start p-6 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-md transition-all text-left"
      >
        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center text-xl mb-4">
          <i className="bi bi-building"></i>
        </div>
        <span className="font-bold text-slate-800 dark:text-slate-200 text-lg">
          Fornecedor específico
        </span>
        <span className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
          Escolha um fornecedor na lista de cartões e conte somente os produtos dele.
        </span>
      </button>
    </div>
  );
};
