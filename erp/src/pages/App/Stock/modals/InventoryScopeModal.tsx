import React from 'react';
import type Product from "@/pages/types/product.type";
import type Person from "@/pages/types/person.type";
import { useInventoryScopeBuilder } from '../hooks/useInventoryScopeBuilder';
import { InventoryScopeTypeSelector } from '../components/InventoryScopeTypeSelector';
import { InventoryScopeConfigForm } from '../components/InventoryScopeConfigForm';

export type InventoryScopeType = 'full' | 'supplier' | 'custom';

export interface ScopeConfiguration {
    type: InventoryScopeType;
    name: string;
    blindCount: boolean;
    supplierId?: string;
    responsibleId: string;
    customProductIds?: string[];
    itemsSnapshot: Array<{
        productId: string;
        variationId?: string;
        name: string;
        supplierNames: string;
        systemStock: number;
        unit: string;
    }>;
}

interface InventoryScopeModalProps {
    readonly allProducts: readonly Product[];
    readonly suppliers: readonly Person[];
    readonly employees: readonly Person[];
    readonly onCancel: () => void;
    readonly onConfirm: (config: ScopeConfiguration) => void;
}

export const InventoryScopeModal: React.FC<InventoryScopeModalProps> = ({
    allProducts,
    suppliers,
    employees,
    onCancel,
    onConfirm,
}) => {
    const {
        step,
        scopeType,
        inventoryName,
        setInventoryName,
        blindCount,
        setBlindCount,
        selectedSupplierId,
        setSelectedSupplierId,
        selectedResponsibleId,
        setSelectedResponsibleId,
        responsibleError,
        setResponsibleError,
        customProducts,
        setCustomProducts,
        matchingItems,
        handleNextStep,
    } = useInventoryScopeBuilder(allProducts, suppliers);

    const handleConfirm = () => {
        if (!inventoryName.trim()) return;
        if (scopeType === 'supplier' && !selectedSupplierId) return;
        if (scopeType === 'custom' && customProducts.length === 0) return;
        if (!selectedResponsibleId) {
            setResponsibleError(true);
            return;
        }

        onConfirm({
            type: scopeType!,
            name: inventoryName.trim(),
            blindCount,
            supplierId: selectedSupplierId,
            responsibleId: selectedResponsibleId,
            customProductIds: scopeType === 'custom' ? customProducts.map(cp => String(cp.product.id)) : undefined,
            itemsSnapshot: matchingItems,
        });
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
            <header className="flex shrink-0 items-center justify-between gap-4 px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
                <div>
                    <h2 className="text-xl font-black tracking-tight text-slate-800 dark:text-slate-100">Novo Inventário</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                        {step === 1 ? 'O que você deseja inventariar?' : 'Configuração do Escopo'}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onCancel}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors"
                >
                    <i className="bi bi-x-lg"></i>
                </button>
            </header>

            <main className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto space-y-6">
                    {step === 1 && (
                        <InventoryScopeTypeSelector onSelect={handleNextStep} />
                    )}

                    {step === 2 && (
                        <InventoryScopeConfigForm
                            scopeType={scopeType}
                            inventoryName={inventoryName}
                            setInventoryName={setInventoryName}
                            blindCount={blindCount}
                            setBlindCount={setBlindCount}
                            selectedSupplierId={selectedSupplierId}
                            setSelectedSupplierId={setSelectedSupplierId}
                            selectedResponsibleId={selectedResponsibleId}
                            setSelectedResponsibleId={setSelectedResponsibleId}
                            responsibleError={responsibleError}
                            setResponsibleError={setResponsibleError}
                            customProducts={customProducts}
                            setCustomProducts={setCustomProducts}
                            suppliers={suppliers}
                            employees={employees}
                        />
                    )}
                </div>
            </main>

            {step === 2 && (
                <footer className="shrink-0 px-6 py-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-sm">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-6 py-2.5 font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg shadow-sm transition-colors flex items-center gap-2"
                    >
                        Confirmar e Iniciar
                        <i className="bi bi-arrow-right"></i>
                    </button>
                </footer>
            )}
        </div>
    );
};

export default InventoryScopeModal;
