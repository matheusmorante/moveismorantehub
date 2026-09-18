import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useInventoryAuditWorkflow } from '../hooks/useInventoryAuditWorkflow';
import { InventoryScopeScreen } from './InventoryScopeScreen';
import { InventoryOperationScreen } from './InventoryOperationScreen';
import { InventoryReviewScreen } from './InventoryReviewScreen';
import { InventoryProductSearchModal } from '../components/InventoryProductSearchModal';
import type { SearchableProduct } from '../components/InventoryProductSearchModal';
import type { AuditItem } from '../hooks/useInventoryAuditWorkflow';

interface Props {
    isDarkMode: boolean;
    userProfile: { id: string; full_name?: string } | null;
    onClose: () => void;
}

export const InventoryAuditFlow: React.FC<Props> = ({ isDarkMode, userProfile, onClose }) => {
    const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
    const [searchTargetItemId, setSearchTargetItemId] = useState<string | null>(null);

    const {
        view,
        setView,
        items,
        setItems,
        scopeConfig,
        draftRef,
        isSaving,
        handleConfirmScope,
        handleFinalize,
    } = useInventoryAuditWorkflow(userProfile, onClose);

    const bg = isDarkMode ? '#0f172a' : '#f8fafc';

    const handleAddBlankItem = () => {
        const newItem: AuditItem = {
            id: Math.random().toString(36).slice(2) + Date.now().toString(36),
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
        setItems((prev: AuditItem[]) => [newItem, ...prev]);
    };

    const handleAddProductFromSearch = (product: SearchableProduct) => {
        const key = `${product.id}-main`;

        // Evita duplicatas
        if (items.some((i: AuditItem) => i.key === key && i.id !== searchTargetItemId)) {
            setIsProductSearchOpen(false);
            setSearchTargetItemId(null);
            return;
        }

        const updatedData = {
            key,
            productId: String(product.id),
            variationId: undefined,
            name: product.name || product.description || 'Produto',
            supplierNames: 'Fábrica não informada',
            systemStock: Number(product.stock ?? 0),
            unit: product.unit || 'UN',
            assignedSupplier: 'Sem fornecedor',
        };

        if (searchTargetItemId) {
            setItems((prev: AuditItem[]) => prev.map(item => item.id === searchTargetItemId ? { ...item, ...updatedData } : item));
        } else {
            setItems((prev: AuditItem[]) => [{ ...updatedData, id: Math.random().toString(36).slice(2), physicalCount: null } as AuditItem, ...prev]);
        }
        
        setIsProductSearchOpen(false);
        setSearchTargetItemId(null);
    };

    if (isSaving) {
        return (
            <View style={[styles.container, { backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#10b981" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            {view === 'scope' && (
                <InventoryScopeScreen
                    isDarkMode={isDarkMode}
                    onCancel={() => {
                        if (items.length > 0) setView('operation');
                        else onClose();
                    }}
                    onConfirm={handleConfirmScope}
                />
            )}

            {view === 'operation' && scopeConfig && (
                <InventoryOperationScreen
                    isDarkMode={isDarkMode}
                    inventoryName={scopeConfig.name || `Inventário #${draftRef.current.code}`}
                    blindCount={scopeConfig.blindCount}
                    items={items}
                    scopeType={scopeConfig.scopeType}
                    onUpdateCount={(id, count) => {
                        setItems((prev: AuditItem[]) => prev.map(item => item.id === id ? { ...item, physicalCount: count } : item));
                    }}
                    onAddManualItem={handleAddBlankItem}
                    onOpenProductSearch={(itemId) => {
                        if (itemId) setSearchTargetItemId(itemId);
                        setIsProductSearchOpen(true);
                    }}
                    onReview={() => setView('review')}
                />
            )}

            {view === 'review' && (
                <InventoryReviewScreen
                    isDarkMode={isDarkMode}
                    items={items}
                    startDate={draftRef.current.date!}
                    onCancel={() => setView('operation')}
                    onConfirm={handleFinalize}
                />
            )}

            {/* Modal de busca de produto para inventário personalizado */}
            <InventoryProductSearchModal
                isDarkMode={isDarkMode}
                visible={isProductSearchOpen}
                onClose={() => {
                    setIsProductSearchOpen(false);
                    setSearchTargetItemId(null);
                }}
                onSelect={handleAddProductFromSearch}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
});
