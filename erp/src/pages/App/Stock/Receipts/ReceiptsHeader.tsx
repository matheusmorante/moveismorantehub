import React from 'react';
import SupplierAutocomplete from '@/components/SupplierAutocomplete';
import Person from '@/pages/types/person.type';
import { ReceiptActionButtons } from './ReceiptActionButtons';
import { ReceiptPeriod } from './receiptPeriodFilter.types';
import { ReceiptPeriodSelector } from './ReceiptPeriodSelector';

interface ReceiptsHeaderProps {
    suppliers: Person[];
    selectedSupplierId: string;
    onSelectSupplier: (id: string) => void;
    period: ReceiptPeriod;
    onPeriodChange: (period: ReceiptPeriod) => void;
    customStartDate: string;
    onCustomStartDateChange: (date: string) => void;
    customEndDate: string;
    onCustomEndDateChange: (date: string) => void;
    onSelectInboundNfe: () => void;
    onSelectPurchase: () => void;
    onSelectManual: () => void;
}

export const ReceiptsHeader: React.FC<ReceiptsHeaderProps> = ({
    suppliers,
    selectedSupplierId,
    onSelectSupplier,
    period,
    onPeriodChange,
    customStartDate,
    onCustomStartDateChange,
    customEndDate,
    onCustomEndDateChange,
    onSelectInboundNfe,
    onSelectPurchase,
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
                        <p className="text-xs text-slate-400">Histórico e registro de recebimentos de mercadorias no estoque</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <ReceiptPeriodSelector
                        period={period}
                        onPeriodChange={onPeriodChange}
                        customStartDate={customStartDate}
                        onCustomStartDateChange={onCustomStartDateChange}
                        customEndDate={customEndDate}
                        onCustomEndDateChange={onCustomEndDateChange}
                    />

                    <ReceiptActionButtons
                        onSelectInboundNfe={onSelectInboundNfe}
                        onSelectPurchase={onSelectPurchase}
                        onSelectManual={onSelectManual}
                    />
                </div>
            </header>

            {/* Campo de Pesquisa de Fornecedor para filtro (opcional) */}
            <div className={`mb-4 rounded-2xl border bg-white p-4 shadow-sm transition-all dark:bg-slate-900 ${
                selectedSupplierId 
                    ? 'border-emerald-300 dark:border-emerald-800/80 ring-2 ring-emerald-500/10' 
                    : 'border-slate-100 dark:border-slate-800'
            }`}>
                <SupplierAutocomplete
                    suppliers={suppliers}
                    selectedSupplierId={selectedSupplierId}
                    onSelect={onSelectSupplier}
                    customLabel="Pesquisa de Fornecedor"
                    showSelectedBadge={false}
                    placeholder="Filtrar por fornecedor (opcional) ou deixe em branco para ver todos..."
                />
            </div>
        </>
    );
};

