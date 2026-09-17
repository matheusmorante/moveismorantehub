import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Modal, TouchableWithoutFeedback } from 'react-native';
import { ArrowLeft, Plus, ArrowDown, ArrowUp, ArrowLeftRight, MoreVertical, Edit2, RotateCcw, Trash2, Check } from 'lucide-react-native';

export type InventoryMoveType = 'entry' | 'exit' | 'withdrawal' | 'adjustment' | 'balance';

export type InventoryMove = {
    id?: string;
    productId: string;
    variationId?: string;
    productDescription: string;
    type: InventoryMoveType;
    quantity: number;
    date: string;
    label?: string;
    observation?: string;
    status?: 'effective' | 'reversed' | 'active' | 'cancelled';
    reversalReason?: string;
    reversedAt?: string;
    productName?: string;
};

interface Props {
  isDarkMode: boolean;
  onBack: () => void;
}

export const StockMovesScreen: React.FC<Props> = ({ isDarkMode, onBack }) => {
  const [moves, setMoves] = useState<InventoryMove[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  
  // BottomSheet state
  const [activeMove, setActiveMove] = useState<InventoryMove | null>(null);

  const loadMoves = async (isRefresh = false, pageNum = 0) => {
    if (isRefresh) {
        setRefreshing(true);
        setPage(0);
        setHasMore(true);
    } else if (pageNum > 0) {
        setLoadingMore(true);
    } else {
        setLoading(true);
    }

    try {
        const { fetchStockMoves, ITEMS_PER_PAGE } = await import('../../../services/stockService');
        const data = await fetchStockMoves(pageNum);
        
        // Formata os dados retornados do Supabase
        const formattedData = (data || []).map((m: any) => ({
            ...m,
            productName: m.products?.name || m.product_description || m.productName
        }));

        if (isRefresh || pageNum === 0) {
            setMoves(formattedData);
        } else {
            setMoves(prev => [...prev, ...formattedData]);
        }
        
        if (data && data.length < ITEMS_PER_PAGE) {
            setHasMore(false);
        }
    } catch (err) {
        console.error('Failed to fetch stock moves:', err);
        setHasMore(false); // Stop fetching on error to prevent loops
    } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
    }
  };

  const loadMore = () => {
      if (!loadingMore && hasMore && !loading && !refreshing) {
          const nextPage = page + 1;
          setPage(nextPage);
          void loadMoves(false, nextPage);
      }
  };

  useEffect(() => {
    void loadMoves();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderMove = ({ item }: { item: InventoryMove }) => {
    const isReversed = item.status === 'reversed' || item.status === 'cancelled';
    const isExit = item.type === 'withdrawal' || item.type === 'exit';
    const isEntry = item.type === 'entry';
    const isAdjustment = item.type === 'adjustment';
    
    const isExpanded = !!(item.id && expandedIds[item.id]);

    const numQuantity = Number(item.quantity);
    const qtySign = isExit ? '-' : (isEntry ? '+' : (numQuantity > 0 ? '+' : ''));
    const quantityFormatted = `${qtySign}${Math.abs(numQuantity)} un`;

    const hasObs = !!item.observation || (isReversed && !!item.reversalReason);
    
    return (
      <View style={[
          styles.card, 
          isDarkMode && styles.cardDark,
          isReversed ? (isDarkMode ? styles.bgReversedDark : styles.bgReversed) :
          isEntry ? (isDarkMode ? styles.bgEntryDark : styles.bgEntry) :
          isExit ? (isDarkMode ? styles.bgExitDark : styles.bgExit) :
          (isDarkMode ? styles.bgAdjustDark : styles.bgAdjust),
          // Borders
          isReversed ? (isDarkMode ? styles.borderReversedDark : styles.borderReversed) :
          isEntry ? (isDarkMode ? styles.borderEntryDark : styles.borderEntry) :
          isExit ? (isDarkMode ? styles.borderExitDark : styles.borderExit) :
          (isDarkMode ? styles.borderAdjustDark : styles.borderAdjust)
      ]}>
        
        {/* Header Row: Date & Actions */}
        <View style={styles.cardHeader}>
            <View>
                <Text style={[styles.dateText, isDarkMode && styles.textMutedDark]}>
                    {new Date(item.date).toLocaleString('pt-BR')}
                </Text>
                {isReversed && item.reversedAt && (
                    <Text style={styles.reversedDateText}>
                        Estornado em {new Date(item.reversedAt).toLocaleString('pt-BR')}
                    </Text>
                )}
            </View>
            <TouchableOpacity 
                style={styles.menuButton} 
                onPress={() => setActiveMove(item)}
            >
                <MoreVertical size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
        </View>

        {/* Content Row: Product & Qty */}
        <View style={styles.contentRow}>
            <View style={styles.productInfo}>
                <Text style={[
                    styles.productName, 
                    isDarkMode && styles.textDark,
                    isReversed && (isDarkMode ? styles.textMutedDark : { color: '#94a3b8' })
                ]}>
                    {item.productName || item.productDescription || 'Produto Desconhecido'}
                </Text>

                {/* Badges Container */}
                <View style={styles.badgesContainer}>
                    {/* TYPE BADGE */}
                    <View style={[
                        styles.badge,
                        isEntry ? (isDarkMode ? styles.badgeEntryDark : styles.badgeEntry) :
                        isExit ? (isDarkMode ? styles.badgeExitDark : styles.badgeExit) :
                        (isDarkMode ? styles.badgeAdjustDark : styles.badgeAdjust)
                    ]}>
                        <View style={styles.badgeIconWrapper}>
                            {isEntry && <ArrowDown size={14} color={isDarkMode ? '#34d399' : '#059669'} />}
                            {isExit && <ArrowUp size={14} color={isDarkMode ? '#fb7185' : '#e11d48'} />}
                            {isAdjustment && <ArrowLeftRight size={14} color={isDarkMode ? '#fbbf24' : '#d97706'} />}
                        </View>
                        <Text style={[
                            styles.badgeText,
                            isEntry ? (isDarkMode ? styles.badgeTextEntryDark : styles.badgeTextEntry) :
                            isExit ? (isDarkMode ? styles.badgeTextExitDark : styles.badgeTextExit) :
                            (isDarkMode ? styles.badgeTextAdjustDark : styles.badgeTextAdjust)
                        ]}>
                            {isEntry ? 'ENTRADA' : isExit ? 'SAÍDA' : 'AJUSTE'}
                        </Text>
                    </View>

                    {/* STATUS BADGE */}
                    <View style={[
                        styles.badge,
                        isReversed ? (isDarkMode ? styles.badgeReversedDark : styles.badgeReversed) :
                        (isDarkMode ? styles.badgeEntryDark : styles.badgeEntry) // Efetivada is always green
                    ]}>
                        <View style={styles.badgeIconWrapper}>
                            {isReversed ? (
                                <RotateCcw size={14} color={isDarkMode ? '#fcd34d' : '#d97706'} />
                            ) : (
                                <View style={styles.checkWrapperFilled}>
                                    <Check size={10} color="#ffffff" strokeWidth={4} />
                                </View>
                            )}
                        </View>
                        <Text style={[
                            styles.badgeText,
                            isReversed ? (isDarkMode ? styles.badgeTextReversedDark : styles.badgeTextReversed) :
                            (isDarkMode ? styles.badgeTextEntryDark : styles.badgeTextEntry)
                        ]}>
                            {isReversed ? 'ESTORNADA' : 'EFETIVADA'}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.quantityContainer}>
                <Text style={[
                    styles.quantityText,
                    isReversed ? styles.qtyReversed :
                    isEntry ? styles.qtyIn : 
                    isExit ? styles.qtyOut : 
                    styles.qtyLoss,
                    isDarkMode && (
                        isReversed ? styles.qtyReversedDark :
                        isEntry ? styles.qtyInDark : 
                        isExit ? styles.qtyOutDark : 
                        styles.qtyLossDark
                    )
                ]}>
                    {quantityFormatted}
                </Text>
            </View>
        </View>

        {/* Observation Accordion */}
        {hasObs && (
            <View style={[
                styles.obsContainer,
                isReversed ? (isDarkMode ? styles.obsReversedDark : styles.obsReversed) :
                (isDarkMode ? styles.obsNormalDark : styles.obsNormal)
            ]}>
                <Text style={[
                    styles.obsLabel,
                    isReversed ? (isDarkMode ? styles.obsLabelReversedDark : styles.obsLabelReversed) :
                    (isDarkMode ? styles.obsLabelNormalDark : styles.obsLabelNormal)
                ]}>
                    {isReversed && item.reversalReason ? 'MOTIVO/OBS:' : 'OBSERVAÇÃO:'}
                </Text>
                <Text style={[
                    styles.obsText,
                    isReversed ? (isDarkMode ? styles.obsTextReversedDark : styles.obsTextReversed) :
                    (isDarkMode ? styles.obsTextNormalDark : styles.obsTextNormal)
                ]}>
                    {isExpanded ? (
                        item.reversalReason ? `Original: ${item.observation || ''} | Estorno: ${item.reversalReason}` : item.observation
                    ) : (
                        item.reversalReason ? item.reversalReason : item.observation
                    )}
                </Text>
                {((item.observation && item.observation.length > 50) || item.reversalReason) && (
                    <TouchableOpacity onPress={() => item.id && toggleExpand(item.id)}>
                        <Text style={styles.readMoreText}>{isExpanded ? 'Ler menos' : 'Ler mais'}</Text>
                    </TouchableOpacity>
                )}
            </View>
        )}

        {/* Sem Efeito Label */}
        {isReversed && (
            <View style={styles.voidWrapper}>
                <View style={styles.voidIcon}>
                    <Text style={styles.voidIconText}>x</Text>
                </View>
                <Text style={styles.voidText}>SEM EFEITO</Text>
            </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={styles.header}>
        {/* Back button removed as requested for Tab UX, but keeping it if called standalone */}
        <View style={styles.headerTitleGroup}>
          <Text style={[styles.title, isDarkMode && styles.textDark]}>Movimentações</Text>
          <Text style={[styles.subtitle, isDarkMode && styles.textMutedDark]}>Histórico completo de E/S</Text>
        </View>
      </View>

      {/* Filters Bar Mock */}
      <View style={[styles.filtersBar, isDarkMode && styles.filtersBarDark]}>
          <TouchableOpacity style={[styles.filterBtn, isDarkMode && styles.filterBtnDark]}>
              <Text style={[styles.filterText, isDarkMode && styles.textDark]}>Todos os tipos</Text>
              <ArrowDown size={14} color={isDarkMode ? '#94a3b8' : '#64748b'} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterBtn, isDarkMode && styles.filterBtnDark]}>
              <Text style={[styles.filterText, isDarkMode && styles.textDark]}>Últimos 30 dias</Text>
              <ArrowDown size={14} color={isDarkMode ? '#94a3b8' : '#64748b'} />
          </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={moves}
          keyExtractor={item => item.id || Math.random().toString()}
          renderItem={renderMove}
          contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
              loadingMore ? <ActivityIndicator size="small" color="#2563eb" style={{ padding: 16 }} /> : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadMoves(true, 0)}
              colors={['#2563eb']}
              tintColor={isDarkMode ? '#60a5fa' : '#2563eb'}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <ArrowLeftRight size={48} color={isDarkMode ? '#334155' : '#e2e8f0'} />
              <Text style={[styles.emptyStateText, isDarkMode && styles.textMutedDark]}>
                Nenhuma movimentação encontrada.
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={[styles.fab, isDarkMode && styles.fabDark]}>
        <Plus size={24} color="#ffffff" />
      </TouchableOpacity>

      {/* BottomSheet Modal para Ações */}
      <Modal
        visible={!!activeMove}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveMove(null)}
      >
          <TouchableWithoutFeedback onPress={() => setActiveMove(null)}>
              <View style={styles.modalOverlay}>
                  <TouchableWithoutFeedback>
                      <View style={[styles.bottomSheet, isDarkMode && styles.bottomSheetDark]}>
                          <View style={styles.bsHandle} />
                          <Text style={[styles.bsTitle, isDarkMode && styles.textDark]} numberOfLines={1}>
                              {activeMove?.productName}
                          </Text>
                          
                          <TouchableOpacity style={styles.bsActionBtn} onPress={() => setActiveMove(null)}>
                              <Edit2 size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                              <Text style={[styles.bsActionText, isDarkMode && styles.textDark]}>Editar</Text>
                          </TouchableOpacity>

                          <TouchableOpacity style={styles.bsActionBtn} onPress={() => setActiveMove(null)}>
                              <RotateCcw size={20} color="#eab308" />
                              <Text style={[styles.bsActionText, { color: '#eab308' }]}>Estornar</Text>
                          </TouchableOpacity>

                          <TouchableOpacity style={styles.bsActionBtn} onPress={() => setActiveMove(null)}>
                              <Trash2 size={20} color="#ef4444" />
                              <Text style={[styles.bsActionText, { color: '#ef4444' }]}>Excluir</Text>
                          </TouchableOpacity>
                      </View>
                  </TouchableWithoutFeedback>
              </View>
          </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
  },
  headerTitleGroup: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  textDark: {
    color: '#f8fafc',
  },
  textMutedDark: {
    color: '#94a3b8',
  },
  filtersBar: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: '#ffffff',
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
      gap: 8,
  },
  filtersBarDark: {
      backgroundColor: '#0f172a',
      borderBottomColor: '#1e293b',
  },
  filterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: '#f1f5f9',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#e2e8f0',
  },
  filterBtnDark: {
      backgroundColor: '#1e293b',
      borderColor: '#334155',
  },
  filterText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#475569',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 16,
    gap: 12,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  cardDark: {
    borderColor: '#334155',
    backgroundColor: '#1e293b',
  },
  bgReversed: { backgroundColor: '#fff1f2' }, // rose-50
  bgReversedDark: { backgroundColor: '#4c1d95' }, // very dark purple/rose fallback
  bgEntry: { backgroundColor: '#f0fdf4' }, // emerald-50
  bgEntryDark: { backgroundColor: '#022c22' },
  bgExit: { backgroundColor: '#fff1f2' },
  bgExitDark: { backgroundColor: '#4c0519' },
  bgAdjust: { backgroundColor: '#fef08a' }, // yellow-200 (bem forte)
  bgAdjustDark: { backgroundColor: '#713f12' },
  
  borderReversed: { borderColor: '#fecdd3' }, // rose-200
  borderReversedDark: { borderColor: '#881337' },
  borderEntry: { borderColor: '#bbf7d0' }, // emerald-200
  borderEntryDark: { borderColor: '#064e3b' },
  borderExit: { borderColor: '#fecdd3' },
  borderExitDark: { borderColor: '#881337' },
  borderAdjust: { borderColor: '#facc15' }, // yellow-400
  borderAdjustDark: { borderColor: '#a16207' },
  
  cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
  },
  dateText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#64748b',
  },
  reversedDateText: {
      fontSize: 11,
      color: '#ef4444',
      marginTop: 2,
  },
  menuButton: {
      padding: 4,
      marginRight: -4,
      marginTop: -4,
  },
  contentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
  },
  productInfo: {
      flex: 1,
      paddingRight: 12,
  },
  productName: {
      fontSize: 15,
      fontWeight: '700',
      color: '#0f172a',
      marginBottom: 6,
  },
  badgesContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
  },
  badge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
      gap: 4,
  },
  badgeIconWrapper: {
      position: 'relative',
  },
  checkWrapperFilled: {
      backgroundColor: '#059669',
      borderRadius: 8,
      width: 14,
      height: 14,
      alignItems: 'center',
      justifyContent: 'center',
  },
  badgeText: {
      fontSize: 10,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
  },
  // Badge Variants
  badgeReversed: { backgroundColor: '#fef3c7', borderColor: '#fcd34d' },
  badgeReversedDark: { backgroundColor: '#78350f', borderColor: '#92400e' },
  badgeTextReversed: { color: '#92400e' },
  badgeTextReversedDark: { color: '#fcd34d' },
  
  badgeEntry: { backgroundColor: '#d1fae5', borderColor: '#a7f3d0' },
  badgeEntryDark: { backgroundColor: '#064e3b', borderColor: '#065f46' },
  badgeTextEntry: { color: '#059669' },
  badgeTextEntryDark: { color: '#34d399' },
  
  badgeExit: { backgroundColor: '#ffe4e6', borderColor: '#fecdd3' },
  badgeExitDark: { backgroundColor: '#881337', borderColor: '#9f1239' },
  badgeTextExit: { color: '#e11d48' },
  badgeTextExitDark: { color: '#fb7185' },
  
  badgeAdjust: { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
  badgeAdjustDark: { backgroundColor: '#78350f', borderColor: '#92400e' },
  badgeTextAdjust: { color: '#d97706' },
  badgeTextAdjustDark: { color: '#fbbf24' },

  quantityContainer: {
      alignItems: 'flex-end',
      justifyContent: 'center',
  },
  quantityText: {
      fontSize: 20,
      fontWeight: '900',
      fontFamily: 'monospace',
  },
  qtyIn: { color: '#059669' },
  qtyInDark: { color: '#34d399' },
  qtyOut: { color: '#e11d48' },
  qtyOutDark: { color: '#fb7185' },
  qtyLoss: { color: '#d97706' },
  qtyLossDark: { color: '#fbbf24' },
  qtyReversed: { color: '#94a3b8', textDecorationLine: 'line-through' },
  qtyReversedDark: { color: '#475569', textDecorationLine: 'line-through' },

  obsContainer: {
      marginTop: 12,
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
  },
  obsNormal: { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' },
  obsNormalDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  obsReversed: { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
  obsReversedDark: { backgroundColor: '#451a03', borderColor: '#78350f' },
  
  obsLabel: {
      fontSize: 9,
      fontWeight: '900',
      marginBottom: 2,
  },
  obsLabelNormal: { color: '#64748b' },
  obsLabelNormalDark: { color: '#94a3b8' },
  obsLabelReversed: { color: '#b45309' },
  obsLabelReversedDark: { color: '#fbbf24' },

  obsText: {
      fontSize: 12,
      lineHeight: 16,
  },
  obsTextNormal: { color: '#334155' },
  obsTextNormalDark: { color: '#e2e8f0' },
  obsTextReversed: { color: '#78350f' },
  obsTextReversedDark: { color: '#fde68a' },

  readMoreText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#3b82f6',
      marginTop: 4,
      textDecorationLine: 'underline',
  },

  voidWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      gap: 6,
  },
  voidIcon: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: '#ef4444',
      alignItems: 'center',
      justifyContent: 'center',
  },
  voidIconText: {
      color: '#ef4444',
      fontSize: 8,
      fontWeight: '900',
      lineHeight: 9,
      marginTop: -1,
  },
  voidText: {
      color: '#ef4444',
      fontSize: 11,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
  },

  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    color: '#64748b',
    marginTop: 16,
    fontSize: 14,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabDark: {
    backgroundColor: '#3b82f6',
  },
  
  // BottomSheet Styles
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
  },
  bottomSheet: {
      backgroundColor: '#ffffff',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingTop: 12,
  },
  bottomSheetDark: {
      backgroundColor: '#1e293b',
  },
  bsHandle: {
      width: 40,
      height: 4,
      backgroundColor: '#cbd5e1',
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 20,
  },
  bsTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#0f172a',
      marginBottom: 16,
  },
  bsActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      gap: 12,
  },
  bsActionText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#334155',
  }
});
