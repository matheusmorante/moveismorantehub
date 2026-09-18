import React, { useState } from 'react';
import type { AuditItem } from '../modals/InventoryAuditModal';
import { InventoryOperationHeader } from './InventoryOperationHeader';
import { InventoryScannerMode } from './InventoryScannerMode';
import { InventoryManualMode } from './InventoryManualMode';
import { useInventoryOperation } from '../hooks/useInventoryOperation';

interface InventoryOperationScreenProps {
    readonly items: AuditItem[];
    readonly blindCount: boolean;
    readonly inventoryName: string;
    readonly onUpdateCount: (id: string, count: number | null) => void;
    readonly onAddManualItem: () => void;
    readonly onReview: () => void;
}

export const InventoryOperationScreen: React.FC<InventoryOperationScreenProps> = ({
    items,
    blindCount,
    inventoryName,
    onUpdateCount,
    onAddManualItem,
    onReview,
}) => {
    const [mode, setMode] = useState<'scanner' | 'manual'>('scanner');
    
    const {
        filter,
        setFilter,
        search,
        setSearch,
        filteredItems,
    } = useInventoryOperation(items);

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
            <InventoryOperationHeader
                inventoryName={inventoryName}
                items={items}
                mode={mode}
                setMode={setMode}
            />

            <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="max-w-5xl mx-auto space-y-6">
                    {mode === 'scanner' ? (
                        <InventoryScannerMode
                            items={items}
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
                        />
                    )}
                </div>
            </div>

            {/* Bottom Bar: Revisar */}
            <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 shrink-0">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <button
                        onClick={onAddManualItem}
                        className="text-sm font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-2"
                    >
                        <i className="bi bi-plus-circle"></i>
                        Adicionar item ao escopo
                    </button>
                    
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
