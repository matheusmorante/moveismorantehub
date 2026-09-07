import React from 'react';
import SupplierAutocomplete from '@/components/SupplierAutocomplete';
import Person from '@/pages/types/person.type';
import { ReceiptActionButtons } from './ReceiptActionButtons';

interface ReceiptsHeaderProps {
    suppliers: Person[];
    selectedSupplierId: string;
    onSelectSupplier: (id: string) => void;
    onSelectInboundNfe: () => void;
    onSelectPurchaseOrOrder: () => void;
    onSelectManual: () => void;
}

export const ReceiptsHeader: React.FC<ReceiptsHeaderProps> = ({
    suppliers,
    selectedSupplierId,
    onSelectSupplier,
    onSelectInboundNfe,
    onSelectPurchaseOrOrder,
    onSelectManual
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

                <ReceiptActionButtons
                    onSelectInboundNfe={onSelectInboundNfe}
                    onSelectPurchaseOrOrder={onSelectPurchaseOrOrder}
                    onSelectManual={onSelectManual}
                />
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
                        Dica: Você pode selecionar um fornecedor acima ou clicar em <strong className="text-indigo-600 dark:text-indigo-400 font-bold">"Nota Fiscal de Entrada"</strong> para preenchimento automático.
                    </p>
                )}
            </div>
        </>
    );
};
