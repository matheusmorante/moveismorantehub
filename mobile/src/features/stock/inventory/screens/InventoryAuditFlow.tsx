import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useInventoryAuditWorkflow } from '../hooks/useInventoryAuditWorkflow';
import { InventoryScopeScreen } from './InventoryScopeScreen';
import { InventoryOperationScreen } from './InventoryOperationScreen';
import { InventoryReviewScreen } from './InventoryReviewScreen';

interface Props {
    isDarkMode: boolean;
    userProfile: { id: string; full_name?: string } | null;
    onClose: () => void;
}

export const InventoryAuditFlow: React.FC<Props> = ({ isDarkMode, userProfile, onClose }) => {
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
                    onUpdateCount={(id, count) => {
                        setItems(prev => prev.map(item => item.id === id ? { ...item, physicalCount: count } : item));
                    }}
                    onAddManualItem={() => setView('scope')}
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
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
});
