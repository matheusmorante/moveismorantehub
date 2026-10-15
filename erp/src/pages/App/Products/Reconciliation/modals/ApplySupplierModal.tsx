import { useReconciliationSubmit } from './useReconciliationSubmit';
import type { ReconciliationConfirmation } from '../../../../../../../shared-utils/reconciliationFormSchemas';
import { catalogSelectionFormSchema } from '../../../../../../../shared-utils/catalogFormSchemas';
import React, { useState } from 'react';
import { SupplierSearchField } from '../components/SupplierSearchField';
import { useReconciliationSupplierSearch } from '../components/useReconciliationSupplierSearch';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (supplierId: string, replaceExisting: boolean) => Promise<ReconciliationConfirmation>;
  selectedCount: number;
  isAllFilteredSelected: boolean;
  totalFilteredCount: number;
}

export const ApplySupplierModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
  isAllFilteredSelected,
  totalFilteredCount,
}) => {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');

  const { suppliers, isSearching, searchError, handleQueryChange, clearSearch } = useReconciliationSupplierSearch(isOpen);
  const { handleConfirm, isSubmitting, error, uncertain } = useReconciliationSubmit(
    catalogSelectionFormSchema.refine(({ id }) => suppliers.some((supplier) => supplier.id === id), 'Selecione um fornecedor da busca atual.'),
    { id: selectedSupplierId }, isOpen, (data) => onConfirm(data.id, false), onClose,
  );
  React.useEffect(() => { setSelectedSupplierId(''); }, [isOpen]);
  const handleSelect = (id: string) => { if (id) clearSearch(); setSelectedSupplierId(id); };
  if (!isOpen) return null;
  const affectedCount = isAllFilteredSelected ? totalFilteredCount : selectedCount;

  return (
    <div role="dialog" aria-modal="true" aria-label="Definir fornecedor em lote" className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-visible border border-slate-200 dark:border-slate-800 animate-slide-up">
        {(error || searchError) && <p role="alert" className="px-6 pt-4 text-sm text-red-600">{error || searchError}</p>}
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <i className="bi bi-magic text-lg"></i>
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                Atribuir Fornecedor
              </h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                Operação em lote
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-50"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Contador */}
          <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <span className="text-lg font-black">{affectedCount}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Produtos selecionados
              </p>
              <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
                {isAllFilteredSelected
                  ? 'Você selecionou todos os resultados do filtro atual.'
                  : 'Você selecionou produtos manualmente nesta página.'}
              </p>
            </div>
          </div>

          {/* Campo de busca do fornecedor */}
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase text-slate-500 tracking-widest ml-1">
              Fornecedor a atribuir
            </label>

            {/*
                          SupplierSearchField: input com busca live no Supabase.
                          Passamos os suppliers buscados dinamicamente para o componente
                          que faz a filtragem e exibe o dropdown.
                        */}
            <SupplierSearchField
              disabled={isSubmitting || uncertain}
              suppliers={suppliers}
              selectedSupplierId={selectedSupplierId}
              onSelect={handleSelect}
              onQueryChange={handleQueryChange}
              isSearching={isSearching}
            />

            <p className="text-[10px] text-slate-400 font-medium ml-1 mt-1">
              O fornecedor será adicionado aos produtos sem substituir vínculos existentes.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button" onClick={() => void handleConfirm()}
            disabled={!selectedSupplierId || isSubmitting || uncertain}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-widest shadow-md transition-all disabled:opacity-50 active:scale-95"
          >
            {isSubmitting ? (
              <>
                <i className="bi bi-arrow-repeat animate-spin"></i> Aplicando...
              </>
            ) : (
              <>
                <i className="bi bi-check2"></i> Confirmar Atribuição
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Componente interno: input com busca live e dropdown ─────────────────────
