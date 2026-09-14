import React from 'react';
import SupplierAutocomplete from '@/components/SupplierAutocomplete';
import Person from '@/pages/types/person.type';
import { ReceiptActionButtons } from './ReceiptActionButtons';
import { ReceiptPeriod } from '../types/receiptPeriodFilter.types';
import { ReceiptPeriodSelector } from './ReceiptPeriodSelector';

export interface ReceiptsHeaderProps {
    readonly suppliers: readonly Person[];
    readonly selectedSupplierId: string;
    readonly onSelectSupplier: (id: string) => void;
    readonly period: ReceiptPeriod;
    readonly onPeriodChange: (period: ReceiptPeriod) => void;
    readonly customStartDate: string;
    readonly onCustomStartDateChange: (date: string) => void;
    readonly customEndDate: string;
    readonly onCustomEndDateChange: (date: string) => void;
    readonly onSelectInboundNfe: () => void;
    readonly onSelectPurchase: () => void;
    readonly onSelectManual: () => void;
}

/**
 * Cabeçalho e filtros principais da página de recebimentos de estoque.
 */
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/20">
                        <i className="bi bi-box-seam text-lg" />
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
                    suppliers={suppliers as Person[]}
                    selectedSupplierId={selectedSupplierId}
                    onSelect={onSelectSupplier}
                    customLabel="Pesquisa de Fornecedor"
                    showSelectedBadge={false}
                    placeholder="Busque por fornecedor..."
                />
            </div>
        </>
    );
};
