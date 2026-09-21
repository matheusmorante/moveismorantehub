import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, Modal, ScrollView, Alert } from 'react-native';
import { X, Minus, Plus, Search, ScanLine, ArrowRight, ArrowLeft } from 'lucide-react-native';
import { useInventoryOperation } from '../hooks/useInventoryOperation';
import type { AuditItem } from '../hooks/useInventoryAuditWorkflow';
import { InventoryScannerScreen } from './InventoryScannerScreen';
import { InventoryStagesView } from '../components/InventoryStagesView';
import { InventoryFocusMode } from '../components/InventoryFocusMode';
import { Maximize2 } from 'lucide-react-native';

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
  const surface = isDarkMode ? '#1e293b' : '#ffffff';
  const border = isDarkMode ? '#334155' : '#e2e8f0';
  const textPrimary = isDarkMode ? '#f1f5f9' : '#0f172a';
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
      } catch (e) {
          // data is not JSON, use raw string
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
              Alert.alert("Sucesso", `Produto ${item.name} computado com sucesso!`);
          } else if (result.error === 'duplicate') {
              Alert.alert("Atenção", "Esta caixa/volume já foi escaneada neste inventário.");
          } else {
              Alert.alert("Erro", "Falha ao gravar no banco local offline.");
          }
      } else {
          Alert.alert("Não encontrado", "O código lido não corresponde a nenhum produto nesta lista.");
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
              await removeLatestScanForProduct(inventoryId, item.productId);
          }
      }
      onUpdateCount(item.id, newCount);
  };

  const renderItem = ({ item }: { item: AuditItem }) => {
      const isCounted = item.physicalCount !== null;
      const diff = isCounted ? item.physicalCount! - item.systemStock : 0;
      
      const diffText = diff > 0 ? `+${diff}` : `${diff}`;
      const diffColor = diff > 0 ? '#10b981' : diff < 0 ? '#ef4444' : muted;

      return (
          <View style={[styles.itemCard, { backgroundColor: surface, borderColor: isCounted ? 'rgba(16,185,129,0.3)' : border }]}>
              <View style={styles.itemHeader}>
                  {item.productId === '' ? (
                      <TouchableOpacity
                          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: '#10b981' }}
                          onPress={() => onOpenProductSearch?.(item.id)}
                      >
                          <Text style={{ color: muted, fontSize: 16, fontWeight: '700' }}>Pesquisar produto...</Text>
                          <Search size={18} color={muted} />
                      </TouchableOpacity>
                  ) : (
                      <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={[styles.itemName, { color: scopeType === 'custom' ? '#10b981' : textPrimary, flex: 1 }]} numberOfLines={2}>{item.name}</Text>
                              {scopeType === 'custom' && <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 8, fontWeight: '900' }}>✓</Text></View>}
                              {isCounted && scopeType !== 'custom' && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' }} />}
                              <TouchableOpacity onPress={() => {
                                  const idx = activeItems.findIndex(i => i.id === item.id);
                                  if (idx >= 0) setFocusIndex(idx);
                              }} style={{ padding: 4 }}>
                                  <Maximize2 size={20} color={muted} />
                              </TouchableOpacity>
                          </View>
                      </View>
                  )}
              </View>

              <View style={styles.itemBody}>
                  <View style={styles.statsCol}>
                      {!blindCount && (
                          <View style={{ flexDirection: 'row', gap: 16 }}>
                              <View>
                                  <Text style={[styles.statLabel, { color: muted }]}>Sistema</Text>
                                  <Text style={[styles.statVal, { color: textPrimary }]}>{item.systemStock} {item.unit}</Text>
                              </View>
                              {isCounted && diff !== 0 && (
                                  <View>
                                      <Text style={[styles.statLabel, { color: muted }]}>Ajuste</Text>
                                      <Text style={[styles.statVal, { color: diffColor }]}>{diffText}</Text>
                                  </View>
                              )}
                          </View>
                      )}
                  </View>

                  <View style={[styles.counter, { backgroundColor: isDarkMode ? 'rgba(15,23,42,0.5)' : '#f8fafc', borderColor: border }]}>
                      <TouchableOpacity 
                        style={[styles.counterBtn, { backgroundColor: surface, borderColor: border }]} 
                        onPress={() => handleManualCountUpdate(item, Math.max(0, (item.physicalCount || 0) - 1))}
                        disabled={item.physicalCount === 0}
                      >
                          <Minus size={24} color={textPrimary} opacity={item.physicalCount === 0 ? 0.3 : 1} />
                      </TouchableOpacity>
                      
                      <View style={{ alignItems: 'center', width: 70 }}>
                          <TextInput
                              style={[styles.countInput, { color: textPrimary }]}
                              keyboardType="numeric"
                              value={item.physicalCount === null ? '' : String(item.physicalCount)}
                              onChangeText={val => {
                                  if (val === '') handleManualCountUpdate(item, null);
                                  else handleManualCountUpdate(item, Math.max(0, parseInt(val, 10) || 0));
                              }}
                              placeholder="-"
                              placeholderTextColor={muted}
                          />
                          <Text style={{ fontSize: 9, color: muted, fontWeight: '800', marginTop: -2 }}>CONTADO</Text>
                      </View>

                      <TouchableOpacity 
                        testID="increment-btn"
                        style={[styles.counterBtn, { backgroundColor: surface, borderColor: border }]} 
                        onPress={() => handleManualCountUpdate(item, (item.physicalCount || 0) + 1)}
                      >
                          <Plus size={24} color={textPrimary} />
                      </TouchableOpacity>
                  </View>
              </View>
          </View>
      );
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Sticky Header Progress */}
      <View style={[styles.header, { backgroundColor: surface, borderBottomColor: border }]}>
          <TouchableOpacity onPress={onCancel} style={{ marginRight: 12, padding: 4 }}>
              <ArrowLeft size={24} color={textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={[styles.headerTitle, { color: textPrimary }]} numberOfLines={1}>
                  {activeStage ? `${inventoryName} - ${activeStage}` : inventoryName}
              </Text>
              <View style={styles.progressRow}>
                  <Text style={[styles.progressText, { color: muted }]}>
                      <Text style={{ color: '#10b981', fontWeight: '800' }}>{countedItems.length}</Text> / {activeItems.length}
                  </Text>
                  <View style={[styles.progressBarBg, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }]}>
                      <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                  </View>
                  <Text style={[styles.progressText, { color: muted }]}>{progressPercent}%</Text>
              </View>
          </View>
          <TouchableOpacity style={styles.scanActionBtn} onPress={() => setShowScanner(true)}>
              <ScanLine size={24} color="#ffffff" />
          </TouchableOpacity>
      </View>

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
          {/* Manual Mode List */}
      <View style={[styles.filterBar, { backgroundColor: surface, borderBottomColor: border }]}>
          {scopeType !== 'custom' && (
              <View style={[styles.searchBox, { backgroundColor: bg, borderColor: border }]}>
                  <Search size={18} color={muted} />
                  <TextInput
                      style={[styles.searchInput, { color: textPrimary }]}
                      placeholder="Buscar produto..."
                      placeholderTextColor={muted}
                      value={search}
                      onChangeText={setSearch}
                  />
              </View>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
              {(['all', 'uncounted', 'counted', 'divergent'] as const).map(f => (
                  <TouchableOpacity
                      key={f}
                      style={[
                          styles.filterChip, 
                          { borderColor: filter === f ? '#3b82f6' : border, backgroundColor: filter === f ? 'rgba(59,130,246,0.1)' : bg }
                      ]}
                      onPress={() => setFilter(f)}
                  >
                      <Text style={{ color: filter === f ? '#3b82f6' : textPrimary, fontWeight: filter === f ? '700' : '500', fontSize: 13 }}>
                          {f === 'all' ? 'Todos' : f === 'uncounted' ? 'Não contados' : f === 'counted' ? 'Contados' : 'Divergentes'}
                      </Text>
                  </TouchableOpacity>
              ))}
          </ScrollView>
      </View>

      {/* Lista de itens com botão Adicionar acima para inventário custom */}
      {scopeType === 'custom' && (
          <View style={[styles.addItemBar, { backgroundColor: surface, borderBottomColor: border }]}>
              <TouchableOpacity
                  style={styles.addItemBtn}
                  onPress={onAddManualItem}
              >
                  <Text style={styles.addItemBtnText}>+ Adicionar Item</Text>
              </TouchableOpacity>
          </View>
      )}

      <FlatList
          data={filteredItems}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
              <View style={styles.empty}>
                  <Text style={{ color: muted, textAlign: 'center' }}>Nenhum item encontrado.</Text>
              </View>
          }
      />

      </>
      )}

      <View style={[styles.footer, { backgroundColor: surface, borderTopColor: border }]}>
          {activeStage ? (
              <TouchableOpacity style={styles.backBtn} onPress={() => setActiveStage(null)}>
                  <ArrowLeft size={18} color={textPrimary} />
                  <Text style={[styles.backBtnText, { color: textPrimary }]}>Voltar Etapa</Text>
              </TouchableOpacity>
          ) : (
              <View style={{ flex: 1 }} />
          )}
          
          <TouchableOpacity style={styles.reviewBtn} onPress={onReview}>
              <Text style={styles.reviewBtnText}>Revisar</Text>
              <ArrowRight size={18} color="#ffffff" />
          </TouchableOpacity>
      </View>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    paddingTop: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  progressText: { fontSize: 12, fontWeight: '700' },
  progressBarBg: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#10b981' },
  scanActionBtn: {
      width: 48, height: 48, borderRadius: 24, backgroundColor: '#10b981',
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#10b981', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 4
  },
  filterBar: { padding: 16, borderBottomWidth: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, fontSize: 15 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  listContent: { padding: 16, gap: 12 },
  empty: { padding: 32, alignItems: 'center' },
  itemCard: { padding: 16, borderRadius: 16, borderWidth: 1 },
  itemHeader: { marginBottom: 12 },
  itemName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  itemSupplier: { fontSize: 12 },
  itemBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  statsCol: { flex: 1 },
  statLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginBottom: 2 },
  statVal: { fontSize: 14, fontWeight: '700' },
  counter: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 4 },
  counterBtn: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  countInput: { textAlign: 'center', fontSize: 24, fontWeight: '800', padding: 0, height: 32 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderTopWidth: 1, paddingBottom: 32 },
  reviewBtn: { backgroundColor: '#0f172a', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 14, paddingHorizontal: 12 },
  backBtnText: { fontWeight: '700', fontSize: 16 },
  addItemBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, alignItems: 'flex-end' },
  addItemBtn: { backgroundColor: '#7c3aed', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  addItemBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
});

