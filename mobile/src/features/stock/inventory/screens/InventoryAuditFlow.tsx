import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { useInventoryAuditWorkflow } from '../hooks/useInventoryAuditWorkflow';
import { InventoryScopeScreen } from './InventoryScopeScreen';
import { InventoryOperationScreen } from './InventoryOperationScreen';
import { InventoryReviewScreen } from './InventoryReviewScreen';
import { InventoryProductSearchModal } from '../components/InventoryProductSearchModal';
import type { SearchableProduct } from '../components/InventoryProductSearchModal';
import type { AuditItem } from '../hooks/useInventoryAuditWorkflow';

import type { InventorySession } from '../../types/stock.types';

interface Props {
    isDarkMode: boolean;
    userProfile: { id: string; full_name?: string } | null;
    initialSession?: InventorySession | null;
    copiedItems?: any[] | null;
    onClose: () => void;
}

export const InventoryAuditFlow: React.FC<Props> = ({ isDarkMode, userProfile, initialSession, copiedItems, onClose }) => {
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
        handleUpdateCount,
        handleFinalize,
    } = useInventoryAuditWorkflow(userProfile, onClose, initialSession, copiedItems);

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
        const key = `${product.id}-${product.variation_id || 'main'}`;

        // Evita duplicatas
        if (items.some((i: AuditItem) => i.key === key && i.id !== searchTargetItemId)) {
            setIsProductSearchOpen(false);
            setSearchTargetItemId(null);
            return;
        }

        const updatedData = {
            key,
            productId: String(product.id),
            variationId: product.variation_id ? String(product.variation_id) : undefined,
            name: product.name || product.description || 'Produto',
            supplierNames: product.supplierNames || 'Fábrica não informada',
            systemStock: Number(product.stock ?? 0),
            unit: product.unit || 'UN',
            assignedSupplier: product.assignedSupplier || 'Sem fornecedor',
            sku: product.sku || product.code || '',
            code: product.code || '',
            barcode: product.barcode || '',
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
                        const hasAnyCount = items.some(item => item.physicalCount !== null);
                        if (hasAnyCount) setView('operation');
                        else onClose();
                    }}
                    onConfirm={handleConfirmScope}
                />
            )}

            {view === 'operation' && scopeConfig && (
                <InventoryOperationScreen
                    isDarkMode={isDarkMode}
                    inventoryName={scopeConfig.name || `Inventário #${draftRef.current.code}`}
                    inventoryId={draftRef.current.id!}
                    items={items}
                    scopeType={scopeConfig.scopeType}
                    onUpdateCount={handleUpdateCount}
                    onAddManualItem={handleAddBlankItem}
                    onOpenProductSearch={(itemId) => {
                        if (itemId) setSearchTargetItemId(itemId);
                        setIsProductSearchOpen(true);
                    }}
                    onReview={() => setView('review')}
                    onCancel={() => {
                        const hasAnyCount = items.some(item => item.physicalCount !== null);
                        if (!hasAnyCount) {
                            // Nenhuma contagem feita: volta direto ao escopo sem modal e sem inventário fantasma
                            setView('scope');
                            return;
                        }

                        // Contagens salvas com segurança no SQLite local
                        if (Platform.OS === 'web') {
                            const shouldExit = typeof window !== 'undefined' && window.confirm 
                                ? window.confirm('Suas contagens estão salvas com segurança. Deseja voltar ao escopo?') 
                                : true;
                            if (shouldExit) setView('scope');
                            return;
                        }

                        Alert.alert(
                            'Sair da contagem',
                            'Suas contagens estão salvas neste aparelho. Deseja voltar à seleção de escopo ou fechar o inventário?',
                            [
                                { text: 'Continuar contando', style: 'cancel' },
                                { 
                                    text: 'Voltar ao escopo', 
                                    onPress: () => setView('scope') 
                                },
                                { 
                                    text: 'Fechar inventário', 
                                    style: 'destructive',
                                    onPress: onClose 
                                }
                            ]
                        );
                    }}
                />
            )}

            {view === 'review' && (
                <InventoryReviewScreen
                    isDarkMode={isDarkMode}
                    items={items}
                    hasStages={scopeConfig?.hasStages}
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
