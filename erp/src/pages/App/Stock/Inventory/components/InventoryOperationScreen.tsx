import React, { useState, useMemo } from 'react';
import type { AuditItem } from "../modals/InventoryAuditModal";
import { InventoryOperationHeader } from './InventoryOperationHeader';
import { InventoryScannerMode } from './InventoryScannerMode';
import { InventoryManualMode } from './InventoryManualMode';
import { InventoryStagesView } from './InventoryStagesView';
import { useInventoryOperation } from "../../hooks/useInventoryOperation";
import type { InventoryScopeType } from '../modals/InventoryScopeModal';

interface InventoryOperationScreenProps {
    readonly items: AuditItem[];
    readonly blindCount: boolean;
    readonly hasStages?: boolean;
    readonly inventoryName: string;
    readonly scopeType?: InventoryScopeType | null;
    readonly onUpdateCount: (id: string, count: number | null) => void;
    readonly onAddManualItem: () => void;
    readonly onUpdateItemProduct?: (itemId: string, product: any, variation?: any) => void;
    readonly onReview: () => void;
    readonly onClose?: () => void;
    readonly onSaveDraft?: () => Promise<void>;
    readonly hasChanges?: boolean;
}

export const InventoryOperationScreen: React.FC<InventoryOperationScreenProps> = ({
    items,
    blindCount,
    hasStages,
    inventoryName,
    scopeType,
    onUpdateCount,
    onAddManualItem,
    onUpdateItemProduct,
    onReview,
    onClose,
    onSaveDraft,
    hasChanges,
}) => {
    const [mode, setMode] = useState<'scanner' | 'manual'>('manual');
    const [activeStage, setActiveStage] = useState<string | null>(null);
    
    // Filtramos os itens pelo fornecedor ativo, ou usamos todos se não tiver etapas
    const activeItems = useMemo(() => {
        if (!hasStages) return items;
        if (!activeStage) return [];
        return items.filter(item => (item.assignedSupplier || 'Sem fornecedor') === activeStage);
    }, [items, hasStages, activeStage]);

    const {
        filter,
        setFilter,
        search,
        setSearch,
        filteredItems,
    } = useInventoryOperation(activeItems);

    const isShowingStages = hasStages && !activeStage;
    const isCustom = scopeType === 'custom';

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
            {!isShowingStages && (
                <InventoryOperationHeader
                    inventoryName={hasStages ? `${inventoryName} - ${activeStage}` : inventoryName}
                    items={activeItems}
                    mode={mode}
                    setMode={setMode}
                    onClose={onClose}
                />
            )}

            <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="max-w-5xl mx-auto space-y-6 h-full">
                    {/* Botão "Adicionar Item" acima da lista — apenas para inventário personalizado */}
                    {isCustom && !isShowingStages && (
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={onAddManualItem}
                                className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm shadow-sm transition-colors active:scale-95"
                            >
                                <i className="bi bi-plus-lg" />
                                Adicionar Item
                            </button>
                        </div>
                    )}

                    {isShowingStages ? (
                        <InventoryStagesView
                            items={items}
                            onSelectStage={(supplierName) => setActiveStage(supplierName)}
                            onCancel={onClose}
                        />
                    ) : mode === 'scanner' ? (
                        <InventoryScannerMode
                            items={activeItems}
                            onUpdateCount={onUpdateCount}
                            onSwitchToManual={() => setMode('manual')}
                        />
                    ) : (
                        <InventoryManualMode
                            filteredItems={filteredItems}
                            blindCount={blindCount}
                            filter={filter}
                            setFilter={setFilter}
                            search={search}
                            setSearch={setSearch}
                            onUpdateCount={onUpdateCount}
                            isCustom={scopeType === 'custom'}
                            onUpdateItemProduct={onUpdateItemProduct}
                        />
                    )}
                </div>
            </div>

            {/* Bottom Bar: Revisar ou Voltar */}
            <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 shrink-0">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {activeStage && (
                            <button
                                onClick={() => setActiveStage(null)}
                                className="text-sm font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-2"
                            >
                                <i className="bi bi-arrow-left"></i>
                                Voltar
                            </button>
                        )}
                        {onSaveDraft && (
                            <button
                                onClick={onSaveDraft}
                                disabled={!hasChanges}
                                className={`text-sm font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 border ${
                                    hasChanges 
                                    ? 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer' 
                                    : 'border-transparent text-slate-400 opacity-50 cursor-not-allowed'
                                }`}
                                title={hasChanges ? "Salvar progresso atual" : "Nenhuma alteração para salvar"}
                            >
                                <i className="bi bi-save"></i>
                                Salvar como rascunho
                            </button>
                        )}
                    </div>
                    
                    <button
                        onClick={onReview}
                        className="bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-black shadow-sm transition-colors flex items-center gap-2"
                    >
                        Revisar e Concluir
                        <i className="bi bi-arrow-right"></i>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InventoryOperationScreen;
