import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Modal, Alert } from 'react-native';
import { useInventoryOperation } from '../hooks/useInventoryOperation';
import type { AuditItem } from '../hooks/useInventoryAuditWorkflow';
import { InventoryScannerScreen } from './InventoryScannerScreen';
import { InventoryStagesView } from '../components/InventoryStagesView';
import { InventoryFocusMode } from '../components/InventoryFocusMode';
import { InventoryOperationHeader } from '../components/InventoryOperationHeader';
import { InventoryOperationFilterBar } from '../components/InventoryOperationFilterBar';
import { InventoryOperationItemCard } from '../components/InventoryOperationItemCard';
import { InventoryOperationFooter } from '../components/InventoryOperationFooter';

interface Props {
  isDarkMode: boolean;
  inventoryId: string;
  inventoryName: string;
  blindCount: boolean;
  items: AuditItem[];
  scopeType?: string | null;
  onUpdateCount: (id: string, count: number | null) => void;
  onAddManualItem: () => void;
  onOpenProductSearch?: (itemId: string) => void;
  onReview: () => void;
  onCancel?: () => void;
  onSaveDraft?: () => void;
}

export const InventoryOperationScreen: React.FC<Props> = ({
  isDarkMode,
  inventoryId,
  inventoryName,
  blindCount,
  items,
  scopeType,
  onUpdateCount,
  onAddManualItem,
  onOpenProductSearch,
  onReview,
  onCancel,
  onSaveDraft,
}) => {
  const [showScanner, setShowScanner] = useState(false);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  const activeItems = React.useMemo(() => {
    if (scopeType !== 'full') return items;
    if (!activeStage) return [];
    return items.filter(item => (item.assignedSupplier || 'Sem fornecedor') === activeStage);
  }, [items, scopeType, activeStage]);

  const { filter, setFilter, search, setSearch, filteredItems } = useInventoryOperation(activeItems);

  const bg = isDarkMode ? '#0f172a' : '#f8fafc';
  const muted = isDarkMode ? '#94a3b8' : '#64748b';

  const countedItems = activeItems.filter(i => i.physicalCount !== null);
  const progressPercent = activeItems.length > 0 ? Math.round((countedItems.length / activeItems.length) * 100) : 0;
  const isShowingStages = scopeType === 'full' && !activeStage;

  const handleScan = async (data: string) => {
    let scanId = data;
    let targetProductId = data;

    try {
      const parsed = JSON.parse(data);
      if (parsed.scanId) scanId = parsed.scanId;
      if (parsed.productId) targetProductId = String(parsed.productId);
      else if (parsed.sku) targetProductId = String(parsed.sku);
    } catch {
      // data is raw string
    }

    const item = items.find(i => 
      i.productId === targetProductId || 
      i.variationId === targetProductId || 
      i.name.toLowerCase().includes(targetProductId.toLowerCase())
    );

    if (item) {
      const { addInventoryScan } = require('../../../../services/sqlite/inventoryScans');
      const result = await addInventoryScan(inventoryId, item.productId, item.variationId || null, scanId);
      if (result.success) {
        const currentCount = item.physicalCount === null ? 0 : item.physicalCount;
        onUpdateCount(item.id, currentCount + 1);
        Alert.alert('Sucesso', `Produto ${item.name} computado com sucesso!`);
      } else if (result.error === 'duplicate') {
        Alert.alert('Atenção', 'Esta caixa/volume já foi escaneada neste inventário.');
      } else {
        Alert.alert('Erro', 'Falha ao gravar no banco local offline.');
      }
    } else {
      Alert.alert('Não encontrado', 'O código lido não corresponde a nenhum produto nesta lista.');
    }
    setShowScanner(false);
  };

  const handleManualCountUpdate = async (item: AuditItem, newCount: number | null) => {
    const current = item.physicalCount || 0;
    const target = newCount || 0;
    
    if (newCount === null && item.physicalCount === null) return;
    
    const diff = target - current;
    if (diff === 0) {
      onUpdateCount(item.id, newCount);
      return;
    }
    
    const { addInventoryScan, removeLatestScanForProduct } = require('../../../../services/sqlite/inventoryScans');
    const { v4: uuidv4 } = require('uuid');

    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        await addInventoryScan(inventoryId, item.productId, item.variationId || null, uuidv4());
      }
    } else if (diff < 0) {
      const absDiff = Math.abs(diff);
      for (let i = 0; i < absDiff; i++) {
        await removeLatestScanForProduct(inventoryId, item.productId, item.variationId || null);
      }
    }
    onUpdateCount(item.id, newCount);
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <InventoryOperationHeader
        isDarkMode={isDarkMode}
        title={activeStage ? `${inventoryName} - ${activeStage}` : inventoryName}
        countedCount={countedItems.length}
        totalCount={activeItems.length}
        progressPercent={progressPercent}
        onBack={onCancel || (() => {})}
        onOpenScanner={() => setShowScanner(true)}
      />

      {isShowingStages ? (
        <View style={{ flex: 1 }}>
          <InventoryStagesView 
            items={items} 
            isDarkMode={isDarkMode} 
            onSelectStage={setActiveStage} 
          />
        </View>
      ) : (
        <>
          <InventoryOperationFilterBar
            isDarkMode={isDarkMode}
            scopeType={scopeType}
            search={search}
            onSearchChange={setSearch}
            filter={filter}
            onFilterChange={setFilter}
            onAddManualItem={onAddManualItem}
          />

          <FlatList
            data={filteredItems}
            keyExtractor={i => i.id}
            renderItem={({ item }) => (
              <InventoryOperationItemCard
                item={item}
                isDarkMode={isDarkMode}
                blindCount={blindCount}
                scopeType={scopeType}
                onUpdateCount={handleManualCountUpdate}
                onOpenProductSearch={onOpenProductSearch}
                onFocusItem={() => {
                  const idx = activeItems.findIndex(i => i.id === item.id);
                  if (idx >= 0) setFocusIndex(idx);
                }}
              />
            )}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={{ color: muted, textAlign: 'center' }}>Nenhum item encontrado.</Text>
              </View>
            }
          />
        </>
      )}

      <InventoryOperationFooter
        isDarkMode={isDarkMode}
        activeStage={activeStage}
        onBackStage={() => setActiveStage(null)}
        onReview={onReview}
        onSaveDraft={onSaveDraft}
      />

      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <InventoryScannerScreen
          isDarkMode={isDarkMode}
          onClose={() => setShowScanner(false)}
          onScan={handleScan}
        />
      </Modal>

      <InventoryFocusMode 
        visible={focusIndex !== null}
        items={activeItems}
        initialItemIndex={focusIndex || 0}
        totalItemsCount={activeItems.length}
        countedItemsCount={countedItems.length}
        isDarkMode={isDarkMode}
        onClose={() => setFocusIndex(null)}
        onUpdateCount={onUpdateCount}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 16 },
  empty: { padding: 40, alignItems: 'center' },
});
