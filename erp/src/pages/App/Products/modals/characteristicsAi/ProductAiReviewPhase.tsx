import React from 'react';
import type { Product } from '../../../../../types/product.type';
import { ProductAiSuggestedCharacteristics } from '../../../../../../../shared-utils/productAiFormSchemas';
import { CharacteristicsDiffTable } from './CharacteristicsDiffTable';

interface ProductAiReviewPhaseProps {
  suggestedResult: ProductAiSuggestedCharacteristics | null;
  formData: Partial<Product>;
  selectedKeys: Record<string, boolean>;
  onToggleKey: (key: string) => void;
  onSelectAll: (select: boolean) => void;
  editedValues: Record<string, any>;
  onEditValue: (key: string, value: any) => void;
  hasCategory: boolean;
  selectedCount: number;
  onReturnToModeSelection: () => void;
  onApplyCharacteristics: () => void;
}

export const ProductAiReviewPhase: React.FC<ProductAiReviewPhaseProps> = ({
  suggestedResult,
  formData,
  selectedKeys,
  onToggleKey,
  onSelectAll,
  editedValues,
  onEditValue,
  hasCategory,
  selectedCount,
  onReturnToModeSelection,
  onApplyCharacteristics,
}) => {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
        <CharacteristicsDiffTable
          suggestedResult={suggestedResult}
          formData={formData}
          selectedKeys={selectedKeys}
          onToggleKey={onToggleKey}
          onSelectAll={onSelectAll}
          editedValues={editedValues}
          onEditValue={onEditValue}
          hasCategory={hasCategory}
        />
      </div>

      {/* Rodapé Fase 2 */}
      <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40 shrink-0">
        <button
          type="button"
          onClick={onReturnToModeSelection}
          className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <i className="bi bi-arrow-left" />
          <span>Voltar / Escolher Modo</span>
        </button>
        <button
          type="button"
          onClick={onApplyCharacteristics}
          disabled={selectedCount === 0}
          title={
            selectedCount === 0
              ? 'Selecione pelo menos um campo para aplicar'
              : undefined
          }
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold text-white shadow-md flex items-center gap-2 transition-all ${
            selectedCount === 0
              ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'
              : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 active:scale-95 cursor-pointer'
          }`}
        >
          <i className="bi bi-check-lg text-sm" />
          <span>
            {selectedCount === 1
              ? 'Aplicar 1 campo selecionado'
              : `Aplicar ${selectedCount} campos selecionados`}
          </span>
        </button>
      </div>
    </div>
  );
};
