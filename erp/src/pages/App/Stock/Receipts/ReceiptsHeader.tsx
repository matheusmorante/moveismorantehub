import React from 'react';
import SupplierAutocomplete from '@/components/SupplierAutocomplete';
import Person from '@/pages/types/person.type';

interface ReceiptsHeaderProps {
    suppliers: Person[];
    selectedSupplierId: string;
    onSelectSupplier: (id: string) => void;
    onOpenNew: () => void;
}

export const ReceiptsHeader: React.FC<ReceiptsHeaderProps> = ({
    suppliers,
    selectedSupplierId,
    onSelectSupplier,
    onOpenNew
}) => {
    return (
        <>
            <header className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
                        <i className="bi bi-box-seam" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 dark:text-slate-100">Recebimentos de Mercadorias</h1>
                        <p className="text-xs text-slate-400">Selecione um fornecedor para visualizar o histórico ou registrar recebimentos</p>
                    </div>
                </div>
                {selectedSupplierId && (
                    <button 
                        type="button" 
                        onClick={onOpenNew} 
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-emerald-700 transition-all shadow-md animate-in fade-in zoom-in-95 flex items-center justify-center"
                    >
                        <i className="bi bi-plus-lg mr-2" />
                        Registrar recebimento
                    </button>
                )}
            </header>

            {/* Campo de Seleção de Fornecedor em destaque acima da tabela */}
            <div className={`mb-4 rounded-2xl border bg-white p-4 shadow-sm transition-all dark:bg-slate-900 ${
                selectedSupplierId 
                    ? 'border-emerald-300 dark:border-emerald-800/80 ring-2 ring-emerald-500/10' 
                    : 'border-slate-100 dark:border-slate-800'
            }`}>
                <SupplierAutocomplete
                    suppliers={suppliers}
                    selectedSupplierId={selectedSupplierId}
                    onSelect={onSelectSupplier}
                    placeholder="Selecione um fornecedor para registrar recebimento ou consultar histórico..."
                />
                {!selectedSupplierId && (
                    <p className="mt-2 text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                        <i className="bi bi-info-circle text-emerald-600 dark:text-emerald-400" />
                        Selecione o fornecedor acima para liberar o botão de <strong className="text-slate-600 dark:text-slate-300 font-bold">"Registrar recebimento"</strong> e listar as entradas.
                    </p>
                )}
            </div>
        </>
    );
};
