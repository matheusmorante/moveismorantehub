import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { matchScannedProductItem } from '../../../../utils/barcodeScannerUtils';
import { getPhysicalInventoryScanId } from '../services/inventoryScanRules';
import {
  ensureOfflineInventoryCatalogSynced,
  findOfflineInventoryMatch,
  type OfflineInventoryMatch,
} from '../services/offlineInventoryCatalog';
import { InventoryScannerScreen, type InventoryScanFeedback } from './InventoryScannerScreen';
import { InventoryStagesView } from '../components/inventory-stages/InventoryStagesView';
import { InventoryFocusMode } from '../components/InventoryFocusMode';
import { InventoryOperationHeader } from '../components/inventory-operation/InventoryOperationHeader';
import { InventoryOperationFilterBar } from '../components/inventory-operation/InventoryOperationFilterBar';
import { InventoryOperationItemCard } from '../components/inventory-operation/InventoryOperationItemCard';
import { InventoryOperationFooter } from '../components/inventory-operation/InventoryOperationFooter';

import type { AuditItem } from '../types/inventoryWorkflow.types';
import { sumInventoryCountedQuantities } from '../../../../../../shared-utils/inventorySupplierStages';

interface Props {
  isDarkMode: boolean;
  inventoryId: string;
  inventoryName: string;
  items: AuditItem[];
  scopeType?: string | null;
  hasStages?: boolean;
  onUpdateCount: (id: string, count: number | null) => void;
  onIncrementScannedItem: (id: string, labelId?: string) => Promise<number | null>;
  onStartSupplierStage: (supplierName: string) => Promise<void>;
  onResetSupplierStage?: (supplierName: string) => Promise<void>;
  onDiscardInventory?: () => Promise<boolean>;
  onFlushLocalWrites: () => Promise<void>;
  onAddManualItem: () => void;
  onOpenProductSearch?: (itemId: string) => void;
  onReview: () => void;
  onCancel?: () => void;
}

const SCAN_ERROR_FEEDBACK_COOLDOWN_MS = 10_000;

export const InventoryOperationScreenContent: React.FC<Props> = ({
  isDarkMode,
  inventoryId,
  inventoryName,
  items,
  scopeType,
  hasStages,
  onUpdateCount,
  onIncrementScannedItem,
  onStartSupplierStage,
  onResetSupplierStage,
  onDiscardInventory,
  onFlushLocalWrites,
  onAddManualItem,
  onOpenProductSearch,
  onReview,
  onCancel,
}) => {
  const [showScanner, setShowScanner] = useState(false);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [showCancelStageConfirm, setShowCancelStageConfirm] = useState(false);
  const [isCancellingStage, setIsCancellingStage] = useState(false);
  const [cancelStageError, setCancelStageError] = useState('');
  const [showCancelInventoryConfirm, setShowCancelInventoryConfirm] = useState(false);
  const [isCancellingInventory, setIsCancellingInventory] = useState(false);
  const [cancelInventoryError, setCancelInventoryError] = useState('');
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const recentErrorFeedbackAtRef = React.useRef(new Map<string, number>());

  const isStageBased = Boolean(hasStages && (scopeType === 'full' || scopeType === 'supplier'));
  const isSupplierSpecific = isStageBased && scopeType === 'supplier';
  const activeItems = React.useMemo(() => {
    if (!isStageBased && scopeType !== 'general') return items;
    if (!activeStage) return scopeType === 'general' ? items : [];
    return items.filter((item) => (item.assignedSupplier || 'Sem fornecedor') === activeStage);
  }, [items, isStageBased, scopeType, activeStage]);
  const scannerItems = scopeType === 'general' && activeStage
    ? []
    : isStageBased ? (activeStage ? activeItems : []) : items;

  const bg = isDarkMode ? '#0f172a' : '#f8fafc';
  const muted = isDarkMode ? '#94a3b8' : '#64748b';

  const isShowingStages = isStageBased && !activeStage;
  const isShowingSupplierSelection = isSupplierSpecific && !activeStage;
  const isShowingSupplierSummary = scopeType === 'general' && !activeStage;
  const countItems = isShowingStages ? items : activeItems;
  const countedItems = countItems.filter((i) => typeof i.physicalCount === 'number');
  const countedQuantityTotal = sumInventoryCountedQuantities(countItems);
  const hasIncompleteProduct = items.some((item) => !item.productId?.trim());

  React.useEffect(() => {
    if (!isSupplierSpecific || activeStage) return;
    const startedSuppliers = new Set(
      items
        .filter((item) => item.supplierStageStarted === true || typeof item.physicalCount === 'number')
        .map((item) => item.assignedSupplier || 'Sem fornecedor')
        .filter((supplier) => supplier !== 'Sem fornecedor')
    );
    if (startedSuppliers.size === 1) setActiveStage([...startedSuppliers][0]);
  }, [items, isSupplierSpecific, activeStage]);

  const withErrorFeedbackCooldown = (
    data: string,
    feedback: InventoryScanFeedback
  ): InventoryScanFeedback | undefined => {
    if (feedback.kind === 'success') return feedback;

    const feedbackKey = getPhysicalInventoryScanId(data) || data.trim();
    const now = Date.now();
    const lastShownAt = recentErrorFeedbackAtRef.current.get(feedbackKey);
    if (lastShownAt !== undefined && now - lastShownAt < SCAN_ERROR_FEEDBACK_COOLDOWN_MS)
      return undefined;

    for (const [key, shownAt] of recentErrorFeedbackAtRef.current) {
      if (now - shownAt >= SCAN_ERROR_FEEDBACK_COOLDOWN_MS)
        recentErrorFeedbackAtRef.current.delete(key);
    }
    recentErrorFeedbackAtRef.current.set(feedbackKey, now);
    return feedback;
  };

  const handleScan = async (data: string): Promise<InventoryScanFeedback | undefined> => {
    const findDirect = (source: AuditItem[]) =>
      source.find((i) => matchScannedProductItem(i, data));
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
      const matchesCatalog = (candidate: AuditItem) =>
        String(candidate.variationId || '') === catalogItem.variationId ||
        (String(candidate.productId) === catalogItem.productId && !candidate.variationId);
      item = scannerItems.find(matchesCatalog);
      if (!item && activeStage) otherSupplierItem = items.find(matchesCatalog);
    }

    if (!item) {
      if (otherSupplierItem)
        return withErrorFeedbackCooldown(data, {
          kind: 'error',
          title: 'Produto de outro fornecedor',
          message: `Produto: ${otherSupplierItem.name}\nFornecedor: ${otherSupplierItem.assignedSupplier || 'Sem fornecedor'}\nNenhuma quantidade foi alterada. Volte à lista e inicie a etapa desse fornecedor.`,
        });
      return withErrorFeedbackCooldown(data, {
        kind: 'error',
        title: 'Produto não pertence a este inventário',
      });
    }

    try {
      const physicalLabelId = getPhysicalInventoryScanId(data);
      const nextCount = await onIncrementScannedItem(item.id, physicalLabelId);
      if (nextCount === null)
        return withErrorFeedbackCooldown(data, {
          kind: 'warning',
          title: 'Unidade física já contabilizada',
          message: item.name,
        });
      return withErrorFeedbackCooldown(data, {
        kind: 'success',
        title: item.name,
        sku: item.sku || item.code || item.barcode || '—',
        supplier: activeStage ? undefined : item.assignedSupplier || 'Sem fornecedor',
        quantity: nextCount,
        itemId: item.id,
        message:
          item.isActive === false
            ? `Produto desativado — ${nextCount} ${nextCount === 1 ? 'unidade encontrada' : 'unidades encontradas'}`
            : undefined,
      });
    } catch (error) {
      console.error('[Inventory] Falha ao salvar leitura:', error);
      return withErrorFeedbackCooldown(data, {
        kind: 'error',
        title: 'Falha ao salvar a contagem local',
        message: 'Verifique o armazenamento do aparelho antes de continuar.',
      });
    }
  };

  const confirmCancelStage = async () => {
    if (!activeStage || !onResetSupplierStage || isCancellingStage) return;
    setIsCancellingStage(true);
    setCancelStageError('');
    try {
      await onResetSupplierStage(activeStage);
      setShowScanner(false);
      setActiveStage(null);
      setShowCancelStageConfirm(false);
    } catch {
      setCancelStageError('Não foi possível salvar o cancelamento. A etapa continua preservada; tente novamente.');
    } finally {
      setIsCancellingStage(false);
    }
  };

  const confirmCancelInventory = async () => {
    if (!onDiscardInventory || isCancellingInventory) return;
    setIsCancellingInventory(true);
    setCancelInventoryError('');
    try {
      const discarded = await onDiscardInventory();
      if (!discarded) throw new Error('discard-not-confirmed');
      setShowCancelInventoryConfirm(false);
    } catch {
      setCancelInventoryError('Não foi possível cancelar o inventário. Os dados foram preservados; tente novamente.');
    } finally {
      setIsCancellingInventory(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <InventoryOperationHeader
        isDarkMode={isDarkMode}
        title={activeStage || inventoryName}
        countedCount={countedQuantityTotal}
        countLabel="quantidades contadas"
        onBack={activeStage ? () => setActiveStage(null) : onCancel || (() => {})}
        onOpenScanner={() => setShowScanner(true)}
        showBackButton={!isSupplierSpecific}
        showCount={!isShowingSupplierSelection}
        showScanner={!isShowingStages && !(scopeType === 'general' && activeStage)}
        showStageActions={scopeType === 'full' && Boolean(activeStage && onResetSupplierStage)}
        onRequestCancelInventory={scopeType === 'full' && Boolean(activeStage) ? undefined : () => {
          setCancelInventoryError('');
          setShowCancelInventoryConfirm(true);
        }}
        onRequestCancelStage={() => {
          setCancelStageError('');
          setShowCancelStageConfirm(true);
        }}
      />
      {isShowingStages || isShowingSupplierSummary ? (
        <View style={{ flex: 1 }}>
          <InventoryStagesView
            items={items}
            isDarkMode={isDarkMode}
            variant={isShowingSupplierSummary ? 'summary' : isSupplierSpecific ? 'selection' : 'stages'}
            onSelectSupplier={isShowingSupplierSummary ? setActiveStage : undefined}
            onStartStage={isShowingStages ? async (supplierName) => {
              await onStartSupplierStage(supplierName);
              setActiveStage(supplierName);
            } : undefined}
          />
        </View>
      ) : (
        <>
          {!activeStage && (
            <InventoryOperationFilterBar
              isDarkMode={isDarkMode}
              scopeType={scopeType}
              onAddManualItem={onAddManualItem}
            />
          )}

          <FlatList
            data={activeItems}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => (
              <InventoryOperationItemCard
                item={item}
                isDarkMode={isDarkMode}
                scopeType={scopeType}
                onUpdateCount={(it, count) => onUpdateCount(it.id, count)}
                onOpenProductSearch={onOpenProductSearch}
                onFocusItem={() => {
                  const idx = activeItems.findIndex((i) => i.id === item.id);
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

      {(!isSupplierSpecific || Boolean(activeStage)) && (
        <InventoryOperationFooter
          isDarkMode={isDarkMode}
          activeStage={activeStage}
          supplierSpecific={isSupplierSpecific}
          supplierSelected={Boolean(activeStage)}
          hasIncompleteProduct={hasIncompleteProduct}
          onBack={activeStage ? () => setActiveStage(null) : onCancel || (() => {})}
          onReview={onReview}
        />
      )}

      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => {
          void onFlushLocalWrites()
            .then(() => setShowScanner(false))
            .catch(() =>
              Alert.alert('Falha ao salvar', 'Aguarde a contagem ser gravada antes de sair.'),
            );
        }}
      >
        <InventoryScannerScreen
          isDarkMode={isDarkMode}
          countedCount={countedQuantityTotal}
          onClose={() => {
            void onFlushLocalWrites()
              .then(() => setShowScanner(false))
              .catch(() =>
                Alert.alert('Falha ao salvar', 'Aguarde a contagem ser gravada antes de sair.'),
              );
          }}
          onScan={handleScan}
          continuous
          title={activeStage ? 'Etapa iniciada' : scopeType === 'product' ? inventoryName : ''}
          subtitle={activeStage ? `Fornecedor: ${activeStage}` : scopeType === 'product' ? 'Variações do produto' : undefined}
          inventoryLayout
          description={
            scopeType === 'general'
              ? 'Scanner geral: aceita todos os itens deste inventário, com ou sem fornecedor.'
              : scopeType === 'full'
              ? activeStage
                ? `Somente produtos de ${activeStage}. Para outro fornecedor, volte à lista e inicie a etapa correspondente.`
                : 'Aponte para o QR Code da etiqueta'
              : 'Aponte para o QR Code da etiqueta'
          }
        />
      </Modal>

      <Modal
        visible={showCancelStageConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isCancellingStage) setShowCancelStageConfirm(false);
        }}
      >
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmCard, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff' }]}>
            <View style={styles.confirmIcon}>
              <Text style={styles.confirmIconText}>!</Text>
            </View>
            <Text style={{ color: isDarkMode ? '#f1f5f9' : '#0f172a', fontSize: 19, fontWeight: '800', textAlign: 'center' }}>
              Cancelar etapa?
            </Text>
            <Text style={{ color: muted, fontSize: 14, lineHeight: 20, textAlign: 'center' }}>
              A contagem de {activeStage || 'este fornecedor'} será apagada e a etapa voltará para não iniciada. As outras etapas serão preservadas.
            </Text>
            {cancelStageError ? <Text accessibilityRole="alert" style={styles.cancelStageError}>{cancelStageError}</Text> : null}
            <View style={styles.confirmActions}>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={isCancellingStage}
                style={[styles.confirmCancelButton, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
                onPress={() => setShowCancelStageConfirm(false)}
              >
                <Text style={{ color: isDarkMode ? '#cbd5e1' : '#475569', fontWeight: '700' }}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={isCancellingStage}
                style={[styles.confirmDeleteButton, isCancellingStage && { opacity: 0.6 }]}
                onPress={() => void confirmCancelStage()}
              >
                <Text style={{ color: '#ffffff', fontWeight: '800' }}>{isCancellingStage ? 'Salvando…' : 'Cancelar etapa'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCancelInventoryConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isCancellingInventory) setShowCancelInventoryConfirm(false);
        }}
      >
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmCard, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff' }]}>
            <View style={styles.confirmIcon}>
              <Text style={styles.confirmIconText}>!</Text>
            </View>
            <Text style={{ color: isDarkMode ? '#f1f5f9' : '#0f172a', fontSize: 19, fontWeight: '800', textAlign: 'center' }}>
              Cancelar inventário?
            </Text>
            <Text style={{ color: muted, fontSize: 14, lineHeight: 20, textAlign: 'center' }}>
              Toda a contagem será descartada e você voltará à lista de tipos de inventário.
            </Text>
            {cancelInventoryError ? <Text accessibilityRole="alert" style={styles.cancelStageError}>{cancelInventoryError}</Text> : null}
            <View style={styles.confirmActions}>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={isCancellingInventory}
                style={[styles.confirmCancelButton, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
                onPress={() => setShowCancelInventoryConfirm(false)}
              >
                <Text style={{ color: isDarkMode ? '#cbd5e1' : '#475569', fontWeight: '700' }}>Continuar contando</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={isCancellingInventory}
                style={[styles.confirmDeleteButton, isCancellingInventory && { opacity: 0.6 }]}
                onPress={() => void confirmCancelInventory()}
              >
                <Text style={{ color: '#ffffff', fontWeight: '800' }}>{isCancellingInventory ? 'Cancelando…' : 'Cancelar inventário'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(2,6,23,0.62)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  confirmCard: { width: '100%', maxWidth: 420, borderRadius: 24, padding: 24, gap: 14, alignItems: 'center', elevation: 16 },
  confirmIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#fff1f2', alignItems: 'center', justifyContent: 'center' },
  confirmIconText: { color: '#e11d48', fontSize: 30, fontWeight: '900' },
  confirmActions: { width: '100%', flexDirection: 'row', gap: 10, marginTop: 6 },
  confirmCancelButton: { flex: 1, borderRadius: 14, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  confirmDeleteButton: { flex: 1, borderRadius: 14, minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e11d48' },
  cancelStageError: { color: '#e11d48', fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
