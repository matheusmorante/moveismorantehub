import React, { useState } from "react";
import type { InventorySnapshotItem, InventoryAuditSession } from "../types/inventoryAudit.types";
import type Product from "@/pages/types/product.type";
import type { Variation } from "@/pages/types/product.type";

import InventoryScopeModal from "./InventoryScopeModal";
import type { InventoryScopeType } from "./InventoryScopeModal";
import InventoryOperationScreen from "../components/InventoryOperationScreen";
import InventoryReviewModal from "../modals/InventoryReviewModal";
import { InventoryProductSearchModal } from "../modals/InventoryProductSearchModal";
import { useInventoryAuditWorkflow } from "../hooks/useInventoryAuditWorkflow";
import { getVariationDisplayName } from "@/components/productAutocompleteUtils";

export interface AuditItem {
    id: string;
    key: string;
    productId: string;
    variationId?: string;
    name: string;
    supplierNames: string;
    assignedSupplier: string;
    systemStock: number;
    physicalCount: number | null;
    countedAt?: string;
    unit: string;
    sku?: string;
    code?: string;
    barcode?: string;
    isActive?: boolean;
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
        incrementScannedItem,
        catalogSyncedAt,
        saveDraft,
        hasChanges,
    } = useInventoryAuditWorkflow(isOpen, onClose, editingSession, copiedItems);

    const [showExitWarning, setShowExitWarning] = useState(false);

    if (!isOpen) return null;

    const handleRequestClose = () => {
        if (hasChanges) {
            setShowExitWarning(true);
        } else {
            onClose();
        }
    };

    const handleAddBlankItem = () => {
        const newItem: AuditItem = {
            id: crypto.randomUUID(),
            key: `blank-${Date.now()}`,
            productId: '',
            variationId: undefined,
            name: '',
            supplierNames: '',
            assignedSupplier: 'Sem fornecedor',
            systemStock: 0,
            physicalCount: null,
            unit: 'UN',
        };
        setItems(prev => [newItem, ...prev]);
    };

    const handleUpdateItemProduct = (itemId: string, product: Product, variation?: Variation) => {
        const key = `${product.id}-${variation?.id || 'main'}`;
        // Evita duplicatas pela chave
        if (items.some(i => i.key === key && i.id !== itemId)) {
            // Pode opcionalmente mostrar um toast de aviso aqui
            return;
        }

        const supplierIds = [
            product.mainSupplierId,
            product.supplierId,
            ...(product.supplierIds || []),
        ].filter(Boolean).map(String);

        const supplierNames = supplierIds.map(sid => {
            const s = suppliers.find(p => String(p.id) === sid);
            return s?.tradeName || s?.fullName || s?.nickname;
        }).filter(Boolean).join(' / ') || 'Fábrica não informada';

        const systemStock = variation
            ? Number(variation.stock ?? 0)
            : Number(product.stock ?? 0);

        const updatedData = {
            key,
            productId: String(product.id),
            variationId: variation ? String(variation.id) : undefined,
            name: getVariationDisplayName(product, variation) || product.description || product.name || 'Produto',
            supplierNames,
            assignedSupplier: supplierNames.split(' / ')[0] || 'Sem fornecedor',
            systemStock,
            unit: product.unit || 'UN',
            sku: variation?.sku || (product as any).sku || product.code || '',
            code: product.code || '',
            barcode: variation?.barcode || (product as any).barcode || '',
        };

        setItems(prev => prev.map(item => item.id === itemId ? { ...item, ...updatedData } : item));
    };

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
                    catalogSyncedAt={catalogSyncedAt}
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
                            hasStages={scopeConfig.hasStages}
                            scopeType={scopeConfig.scopeType as InventoryScopeType | undefined}
                            inventoryName={scopeConfig.name || `Inventário #${draftRef.current.code}`}
                            onUpdateCount={(id, count) => {
                                setItems((prev) =>
                                    prev.map((item) => (item.id === id ? { ...item, physicalCount: count, countedAt: count === null ? undefined : new Date().toISOString() } : item))
                                );
                            }}
                            onIncrementScannedItem={incrementScannedItem}
                            onAddManualItem={handleAddBlankItem}
                            onUpdateItemProduct={handleUpdateItemProduct}
                            onReview={() => setView('review')}
                            onClose={handleRequestClose}
                            hasChanges={hasChanges}
                        />
                    </>
                )}

                {view === 'review' && scopeConfig && (
                    <InventoryReviewModal
                        items={items}
                        hasStages={scopeConfig.hasStages}
                        startDate={draftRef.current.date!}
                        onCancel={() => setView('operation')}
                        onConfirm={handleFinalize}
                    />
                )}
            </div>

            {showExitWarning && (
                <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowExitWarning(false)} />
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in-95 duration-200">
                        <i className="bi bi-file-earmark-text text-amber-500 text-4xl mb-4 block" />
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">Continuar depois?</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                            Sua contagem fica salva neste navegador e continua em andamento.
                        </p>
                        <div className="flex flex-col gap-2">
                            <button 
                                onClick={async () => {
                                    setShowExitWarning(false);
                                    await saveDraft(true);
                                }}
                                className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors"
                            >
                                Fechar e continuar depois
                            </button>
                            <button 
                                onClick={() => setShowExitWarning(false)}
                                className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold transition-colors mt-2"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryAuditModal;
