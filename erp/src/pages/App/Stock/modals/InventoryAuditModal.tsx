import React from "react";
import type { InventorySnapshotItem, InventoryAuditSession } from "../components/InventoryAudit";

import InventoryScopeModal from "./InventoryScopeModal";
import InventoryOperationScreen from "../components/InventoryOperationScreen";
import InventoryReviewModal from "../components/InventoryReviewModal";
import { useInventoryAuditWorkflow } from "../hooks/useInventoryAuditWorkflow";

export interface AuditItem {
    id: string;
    key: string;
    productId: string;
    variationId?: string;
    name: string;
    supplierNames: string;
    systemStock: number;
    physicalCount: number | null;
    unit: string;
}

interface InventoryAuditModalProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly copiedItems?: readonly InventorySnapshotItem[] | null;
    readonly editingSession?: InventoryAuditSession | null;
}

export const InventoryAuditModal: React.FC<InventoryAuditModalProps> = ({ 
    isOpen, 
    onClose, 
    copiedItems, 
    editingSession 
}) => {
    const {
        allProducts,
        suppliers,
        employees,
        view,
        setView,
        items,
        setItems,
        scopeConfig,
        draftRef,
        handleConfirmScope,
        handleFinalize,
        saveDraft,
    } = useInventoryAuditWorkflow(isOpen, onClose, editingSession, copiedItems);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[999999] flex"
            role="dialog"
            aria-modal="true"
        >
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-fade-in" />

            <div className="relative h-full w-full bg-white dark:bg-slate-900 overflow-hidden animate-slide-up flex flex-col">
                {view === 'scope' && (
                    <InventoryScopeModal
                        allProducts={allProducts}
                        suppliers={suppliers}
                        employees={employees}
                        onCancel={() => {
                            if (items.length > 0) setView('operation');
                            else onClose();
                        }}
                        onConfirm={handleConfirmScope}
                    />
                )}

                {view === 'operation' && scopeConfig && (
                    <>
                        <InventoryOperationScreen
                            items={items}
                            blindCount={scopeConfig.blindCount}
                            inventoryName={scopeConfig.name || `Inventário #${draftRef.current.code}`}
                            onUpdateCount={(id, count) => {
                                setItems(prev => prev.map(item => item.id === id ? { ...item, physicalCount: count } : item));
                            }}
                            onAddManualItem={() => setView('scope')}
                            onReview={() => setView('review')}
                        />
                        <button
                            type="button"
                            onClick={() => void saveDraft(true)}
                            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-slate-800 dark:text-white flex items-center justify-center transition-colors shadow-sm border border-slate-200 dark:border-slate-700 z-50"
                            title="Salvar e sair"
                        >
                            <i className="bi bi-x-lg text-lg"></i>
                        </button>
                    </>
                )}

                {view === 'review' && (
                    <InventoryReviewModal
                        items={items}
                        startDate={draftRef.current.date!}
                        onCancel={() => setView('operation')}
                        onConfirm={handleFinalize}
                    />
                )}
            </div>
        </div>
    );
};

export default InventoryAuditModal;
