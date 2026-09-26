import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Modal, Alert } from 'react-native';
import { useInventoryOperation } from '../hooks/useInventoryOperation';
import { matchScannedProductItem } from '../../../../utils/barcodeScannerUtils';
import { getPhysicalInventoryScanId } from '../services/inventoryScanRules';
import { ensureOfflineInventoryCatalogSynced, findOfflineInventoryMatch, type OfflineInventoryMatch } from '../services/offlineInventoryCatalog';
import { InventoryScannerScreen, type InventoryScanFeedback } from './InventoryScannerScreen';
import { InventoryStagesView } from '../components/InventoryStagesView';
import { InventoryFocusMode } from '../components/InventoryFocusMode';
import { InventoryOperationHeader } from '../components/InventoryOperationHeader';
import { InventoryOperationFilterBar } from '../components/InventoryOperationFilterBar';
import { InventoryOperationItemCard } from '../components/InventoryOperationItemCard';
import { InventoryOperationFooter } from '../components/InventoryOperationFooter';

import type { AuditItem } from '../types/inventoryWorkflow.types';

interface Props {
  isDarkMode: boolean;
  inventoryId: string;
  inventoryName: string;
  items: AuditItem[];
  scopeType?: string | null;
  onUpdateCount: (id: string, count: number | null) => void;
  onIncrementScannedItem: (id: string, labelId?: string) => Promise<number | null>;
  onFlushLocalWrites: () => Promise<void>;
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
  onIncrementScannedItem,
  onFlushLocalWrites,
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

  const handleScan = async (data: string): Promise<InventoryScanFeedback> => {
    const findDirect = (source: AuditItem[]) => source.find(i => matchScannedProductItem(i, data));
    let item = findDirect(scannerItems);
    let otherSupplierItem = !item && activeStage ? findDirect(items) : undefined;

    let catalogItem: OfflineInventoryMatch | null = null;
    if (!item && !otherSupplierItem) {
      try {
        catalogItem = await findOfflineInventoryMatch(data);
        if (!catalogItem) {
          await ensureOfflineInventoryCatalogSynced();
          catalogItem = await findOfflineInventoryMatch(data);
        }
      } catch (error) {
        console.warn('[Inventory] Índice offline indisponível; usando os itens da sessão:', error);
      }
    }
    if (catalogItem) {
      const matchesCatalog = (candidate: AuditItem) => String(candidate.variationId || '') === catalogItem.variationId
        || (String(candidate.productId) === catalogItem.productId && !candidate.variationId);
      item = scannerItems.find(matchesCatalog);
      if (!item && activeStage) otherSupplierItem = items.find(matchesCatalog);
    }

    if (!item) {
      if (otherSupplierItem) return { kind: 'error', title: 'Produto de outro fornecedor', message: `Produto: ${otherSupplierItem.name}\nFornecedor: ${otherSupplierItem.assignedSupplier || 'Sem fornecedor'}\nNenhuma quantidade foi alterada.` };
      return { kind: 'error', title: 'Produto não pertence a este inventário' };
    }

    try {
      const physicalLabelId = getPhysicalInventoryScanId(data);
      const nextCount = await onIncrementScannedItem(item.id, physicalLabelId);
      if (nextCount === null) return { kind: 'error', title: 'Unidade física já contabilizada', message: item.name };
      return { kind: 'success', title: item.name, sku: item.sku || item.code || item.barcode || '—',
        supplier: activeStage ? undefined : item.assignedSupplier || 'Sem fornecedor', quantity: nextCount, itemId: item.id,
        message: item.isActive === false ? `Produto desativado — ${nextCount} ${nextCount === 1 ? 'unidade encontrada' : 'unidades encontradas'}` : undefined };
    } catch (error) {
      console.error('[Inventory] Falha ao salvar leitura:', error);
      return { kind: 'error', title: 'Falha ao salvar a contagem local', message: 'Verifique o armazenamento do aparelho antes de continuar.' };
    }
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

      <Modal visible={showScanner} animationType="slide" onRequestClose={() => { void onFlushLocalWrites().then(() => setShowScanner(false)).catch(() => Alert.alert('Falha ao salvar', 'Aguarde a contagem ser gravada antes de sair.')); }}>
        <InventoryScannerScreen
          isDarkMode={isDarkMode}
          onClose={() => { void onFlushLocalWrites().then(() => setShowScanner(false)).catch(() => Alert.alert('Falha ao salvar', 'Aguarde a contagem ser gravada antes de sair.')); }}
          onScan={handleScan}
          continuous
          title={activeStage ? `Contagem — ${activeStage}` : 'Contagem geral'}
          subtitle={activeStage ? 'Somente produtos deste fornecedor' : 'Produtos de todos os fornecedores'}
          description="Aponte para o QR Code da etiqueta"
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
