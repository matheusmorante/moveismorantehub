import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Modal, Alert } from 'react-native';
import { useInventoryOperation } from '../hooks/useInventoryOperation';
import { matchScannedProductItem, extractLabelIdentity } from '../../../../utils/barcodeScannerUtils';
import { addInventoryScan } from '../../../../services/sqlite/inventoryScans';
import { InventoryScannerScreen } from './InventoryScannerScreen';
import { InventoryStagesView } from '../components/InventoryStagesView';
import { InventoryFocusMode } from '../components/InventoryFocusMode';
import { InventoryOperationHeader } from '../components/InventoryOperationHeader';
import { InventoryOperationFilterBar } from '../components/InventoryOperationFilterBar';
import { InventoryOperationItemCard } from '../components/InventoryOperationItemCard';
import { InventoryOperationFooter } from '../components/InventoryOperationFooter';

import { fetchInventoryLabelRecord } from '../../../../services/stock/stockInventoryService';
import type { AuditItem } from '../types/inventoryWorkflow.types';

interface Props {
  isDarkMode: boolean;
  inventoryId: string;
  inventoryName: string;
  items: AuditItem[];
  scopeType?: string | null;
  onUpdateCount: (id: string, count: number | null) => void;
  onAddManualItem: () => void;
  onOpenProductSearch?: (itemId: string) => void;
  onReview: () => void;
  onCancel?: () => void;
}

export const InventoryOperationScreen: React.FC<Props> = ({
  isDarkMode,
  inventoryId,
  inventoryName,
  items,
  scopeType,
  onUpdateCount,
  onAddManualItem,
  onOpenProductSearch,
  onReview,
  onCancel,
}) => {
  const [showScanner, setShowScanner] = useState(false);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  const activeItems = React.useMemo(() => {
    if (scopeType !== 'full') return items;
    if (!activeStage) return [];
    return items.filter(item => (item.assignedSupplier || 'Sem fornecedor') === activeStage);
  }, [items, scopeType, activeStage]);
  const scannerItems = scopeType === 'full' && activeStage ? activeItems : items;

  const { filter, setFilter, search, setSearch, filteredItems } = useInventoryOperation(activeItems);

  const bg = isDarkMode ? '#0f172a' : '#f8fafc';
  const muted = isDarkMode ? '#94a3b8' : '#64748b';

  const countedItems = activeItems.filter(i => i.physicalCount !== null);
  const progressPercent = activeItems.length > 0 ? Math.round((countedItems.length / activeItems.length) * 100) : 0;
  const isShowingStages = scopeType === 'full' && !activeStage;

  const handleScan = async (data: string) => {
    let item = scannerItems.find(i => matchScannedProductItem(i, data));

    // Se não encontrou pelo código direto e possui labelId ou UUID, tenta buscar no cadastro de etiquetas físicas
    if (!item) {
      const { labelId } = extractLabelIdentity(data);
      if (labelId) {
        const labelRecord = await fetchInventoryLabelRecord(labelId);
        if (labelRecord) {
          const normStr = (val?: string | null) => (val ? String(val).trim().toLowerCase() : '');
          item = scannerItems.find(i => {
            if (labelRecord.variation_id && String(i.variationId) === String(labelRecord.variation_id)) return true;
            if (labelRecord.product_id && String(i.productId) === String(labelRecord.product_id) && (!labelRecord.variation_id || !i.variationId)) return true;
            if (labelRecord.sku && normStr(i.sku) === normStr(labelRecord.sku)) return true;
            if (labelRecord.barcode && normStr(i.barcode) === normStr(labelRecord.barcode)) return true;
            return false;
          });
        }
      }
    }

    if (!item) {
      Alert.alert('Não encontrado', 'O código lido não corresponde a nenhum produto nesta lista.');
      setShowScanner(false);
      return;
    }

    const { labelId } = extractLabelIdentity(data);

    // Se o QR possui um labelId UUID de unidade física, valida duplicidade local no SQLite
    if (labelId) {
      const scanResult = await addInventoryScan(
        inventoryId || 'default-inventory',
        String(item.productId),
        item.variationId ? String(item.variationId) : null,
        labelId
      );

      if (!scanResult.success && scanResult.error === 'duplicate') {
        Alert.alert(
          'Unidade já contabilizada',
          `Esta unidade física (${item.name}) já foi escaneada e contabilizada neste inventário.`
        );
        setShowScanner(false);
        return;
      }
    }

    const currentCount = item.physicalCount === null ? 0 : item.physicalCount;
    const nextCount = currentCount + 1;
    // Atualização unificada: salva no SQLite local
    onUpdateCount(item.id, nextCount);
    Alert.alert('Produto escaneado', `${item.name}\nContagem atualizada: ${nextCount} ${item.unit || 'UN'}`);
    setShowScanner(false);
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <InventoryOperationHeader
        isDarkMode={isDarkMode}
        title={activeStage ? `${inventoryName} - ${activeStage}` : inventoryName}
        countedCount={countedItems.length}
        totalCount={activeItems.length}
        progressPercent={progressPercent}
        onBack={activeStage ? () => setActiveStage(null) : (onCancel || (() => {}))}
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
                scopeType={scopeType}
                onUpdateCount={(it, count) => onUpdateCount(it.id, count)}
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
        onBack={activeStage ? () => setActiveStage(null) : (onCancel || (() => {}))}
        onReview={onReview}
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
