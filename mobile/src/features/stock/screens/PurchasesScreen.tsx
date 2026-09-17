import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Modal, TouchableWithoutFeedback } from 'react-native';
import { ArrowLeft, Check, Clock, FileText, ShoppingCart, User, MoreVertical, Download, XCircle, ChevronDown, ChevronUp } from 'lucide-react-native';

interface PurchaseItem {
    id: string;
    name: string;
    ncm: string;
    quantity: number;
    unitPrice: number;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierName: string;
  date: string;
  status: 'draft' | 'sent' | 'partially_received' | 'completed';
  totalValue: number;
  itemsReceived: number;
  totalItems: number;
  items: PurchaseItem[];
}

interface Props {
  isDarkMode: boolean;
  onBack: () => void;
}

export const PurchasesScreen: React.FC<Props> = ({ isDarkMode, onBack }) => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [activeOrder, setActiveOrder] = useState<PurchaseOrder | null>(null);

  const loadOrders = async (isRefresh = false, pageNum = 0) => {
    if (isRefresh) {
        setPage(0);
        setHasMore(true);
        // don't set loading for pull-to-refresh
    } else if (pageNum > 0) {
        setLoadingMore(true);
    } else {
        setLoading(true);
    }

    try {
        const { fetchPurchases, ITEMS_PER_PAGE } = await import('../../../services/stockService');
        const data = await fetchPurchases(pageNum);
        
        const formattedData = (data || []).map((ord: any) => ({
            id: ord.id,
            orderNumber: ord.number || ord.orderNumber || `PC-${ord.id.slice(0,4)}`,
            supplierName: ord.people?.name || 'Fornecedor Desconhecido',
            date: ord.date || ord.created_at,
            status: ord.status || 'draft',
            totalValue: ord.total_amount || ord.totalValue || 0,
            itemsReceived: ord.items_received || 0,
            totalItems: ord.total_items || 0,
            items: ord.items || [] // fallback to empty if items are not eagerly fetched
        }));

        if (isRefresh || pageNum === 0) {
            setOrders(formattedData);
        } else {
            setOrders(prev => [...prev, ...formattedData]);
        }
        
        if (data && data.length < ITEMS_PER_PAGE) {
            setHasMore(false);
        }
    } catch (err) {
        console.error('Failed to fetch orders:', err);
        setHasMore(false);
    } finally {
        setLoading(false);
        setLoadingMore(false);
    }
  };

  const loadMore = () => {
      if (!loadingMore && hasMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          void loadOrders(false, nextPage);
      }
  };

  useEffect(() => {
    void loadOrders();
  }, []);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'draft': return { label: 'Rascunho', bg: '#f1f5f9', color: '#64748b' };
      case 'sent': return { label: 'Enviado', bg: '#dbeafe', color: '#1d4ed8' };
      case 'partially_received': return { label: 'Recebido Parcial', bg: '#fef3c7', color: '#b45309' };
      case 'completed': return { label: 'Concluído', bg: '#d1fae5', color: '#047857' };
      default: return { label: status, bg: '#f1f5f9', color: '#64748b' };
    }
  };

  const toggleExpand = (id: string) => {
      setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderOrder = ({ item }: { item: PurchaseOrder }) => {
    const statusConfig = getStatusConfig(item.status);
    const isExpanded = !!expandedIds[item.id];
    const progressPercent = item.totalItems > 0 ? (item.itemsReceived / item.totalItems) * 100 : 0;

    return (
      <View style={[styles.card, isDarkMode && styles.cardDark]}>
        <View style={styles.cardHeader}>
          <View style={styles.titleGroup}>
            <ShoppingCart size={20} color={isDarkMode ? '#60a5fa' : '#2563eb'} />
            <Text style={[styles.title, isDarkMode && styles.textDark]}>{item.orderNumber}</Text>
          </View>
          <View style={styles.headerRight}>
              <View style={[styles.badge, { backgroundColor: isDarkMode ? `${statusConfig.color}40` : statusConfig.bg }]}>
                  <Text style={[styles.badgeText, { color: isDarkMode ? statusConfig.color : statusConfig.color }]}>
                      {statusConfig.label}
                  </Text>
              </View>
              <TouchableOpacity onPress={() => setActiveOrder(item)} style={styles.menuBtn}>
                  <MoreVertical size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
          </View>
        </View>

        <View style={styles.supplierContainer}>
          <User size={16} color={isDarkMode ? '#94a3b8' : '#64748b'} />
          <Text style={[styles.supplierName, isDarkMode && styles.textMutedDark]}>
            {item.supplierName}
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, isDarkMode && styles.textMutedDark]}>Recebimento:</Text>
                <Text style={[styles.progressText, isDarkMode && styles.textDark]}>
                    {item.itemsReceived} de {item.totalItems} entregues
                </Text>
            </View>
            <View style={[styles.progressBarBg, isDarkMode && styles.progressBarBgDark]}>
                <View style={[
                    styles.progressBarFill, 
                    { width: `${progressPercent}%`, backgroundColor: progressPercent === 100 ? '#10b981' : '#3b82f6' }
                ]} />
            </View>
        </View>

        <View style={styles.footerInfo}>
          <View style={styles.dateContainer}>
            <Clock size={14} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            <Text style={[styles.dateText, isDarkMode && styles.textMutedDark]}>
              {new Date(item.date).toLocaleDateString('pt-BR')}
            </Text>
          </View>
          <Text style={[styles.valueText, isDarkMode && styles.textDark]}>
            R$ {item.totalValue.toFixed(2).replace('.', ',')}
          </Text>
        </View>

        {/* Accordion Toggle */}
        <TouchableOpacity 
            style={[styles.accordionToggle, isDarkMode && styles.accordionToggleDark]} 
            onPress={() => toggleExpand(item.id)}
        >
            <Text style={[styles.accordionToggleText, isDarkMode && styles.textMutedDark]}>
                {isExpanded ? 'Ocultar Itens' : 'Ver Itens do Pedido'}
            </Text>
            {isExpanded ? (
                <ChevronUp size={16} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            ) : (
                <ChevronDown size={16} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            )}
        </TouchableOpacity>

        {/* Accordion Content */}
        {isExpanded && (
            <View style={[styles.accordionContent, isDarkMode && styles.accordionContentDark]}>
                {item.items.map(subItem => (
                    <View key={subItem.id} style={[styles.subItem, isDarkMode && styles.subItemDark]}>
                        <View style={styles.subItemHeader}>
                            <Text style={[styles.subItemName, isDarkMode && styles.textDark]}>{subItem.name}</Text>
                        </View>
                        <View style={styles.subItemDetails}>
                            <Text style={[styles.subItemNcm, isDarkMode && styles.textMutedDark]}>NCM: {subItem.ncm}</Text>
                            <Text style={[styles.subItemValue, isDarkMode && styles.textDark]}>
                                {subItem.quantity}x R$ {subItem.unitPrice.toFixed(2).replace('.', ',')}
                            </Text>
                        </View>
                    </View>
                ))}
            </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Filters Mock */}
      <View style={[styles.filtersBar, isDarkMode && styles.filtersBarDark]}>
          <TouchableOpacity style={[styles.filterBtn, isDarkMode && styles.filterBtnDark]}>
              <Text style={[styles.filterText, isDarkMode && styles.textDark]}>Qualquer Fornecedor</Text>
              <ChevronDown size={14} color={isDarkMode ? '#94a3b8' : '#64748b'} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterBtn, isDarkMode && styles.filterBtnDark]}>
              <Text style={[styles.filterText, isDarkMode && styles.textDark]}>Todos os Status</Text>
              <ChevronDown size={14} color={isDarkMode ? '#94a3b8' : '#64748b'} />
          </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => item.id}
          renderItem={renderOrder}
          contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
              loadingMore ? <ActivityIndicator size="small" color="#2563eb" style={{ padding: 16 }} /> : null
          }
        />
      )}

      {/* BottomSheet Modal para Ações */}
      <Modal
        visible={!!activeOrder}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveOrder(null)}
      >
          <TouchableWithoutFeedback onPress={() => setActiveOrder(null)}>
              <View style={styles.modalOverlay}>
                  <TouchableWithoutFeedback>
                      <View style={[styles.bottomSheet, isDarkMode && styles.bottomSheetDark]}>
                          <View style={styles.bsHandle} />
                          <Text style={[styles.bsTitle, isDarkMode && styles.textDark]} numberOfLines={1}>
                              {activeOrder?.orderNumber}
                          </Text>
                          
                          <TouchableOpacity style={styles.bsActionBtn} onPress={() => setActiveOrder(null)}>
                              <Download size={20} color={isDarkMode ? '#60a5fa' : '#3b82f6'} />
                              <Text style={[styles.bsActionText, { color: isDarkMode ? '#60a5fa' : '#3b82f6' }]}>Baixar PDF</Text>
                          </TouchableOpacity>

                          <TouchableOpacity style={styles.bsActionBtn} onPress={() => setActiveOrder(null)}>
                              <XCircle size={20} color="#ef4444" />
                              <Text style={[styles.bsActionText, { color: '#ef4444' }]}>Cancelar Pedido</Text>
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
  textDark: {
    color: '#f8fafc',
  },
  textMutedDark: {
    color: '#94a3b8',
  },
  
  filtersBar: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
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
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  cardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  menuBtn: {
      padding: 4,
      marginRight: -4,
  },
  supplierContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  supplierName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  
  progressContainer: {
      marginBottom: 16,
  },
  progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
  },
  progressLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: '#64748b',
  },
  progressText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#0f172a',
  },
  progressBarBg: {
      height: 6,
      backgroundColor: '#f1f5f9',
      borderRadius: 3,
      overflow: 'hidden',
  },
  progressBarBgDark: {
      backgroundColor: '#334155',
  },
  progressBarFill: {
      height: '100%',
  },

  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 13,
    color: '#64748b',
  },
  valueText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  
  accordionToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: '#f1f5f9',
  },
  accordionToggleDark: {
      borderTopColor: '#334155',
  },
  accordionToggleText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#64748b',
  },
  accordionContent: {
      marginTop: 12,
      backgroundColor: '#f8fafc',
      borderRadius: 12,
      padding: 12,
      gap: 8,
  },
  accordionContentDark: {
      backgroundColor: '#0f172a',
  },
  subItem: {
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
      paddingBottom: 8,
  },
  subItemDark: {
      borderBottomColor: '#1e293b',
  },
  subItemHeader: {
      marginBottom: 4,
  },
  subItemName: {
      fontSize: 14,
      fontWeight: '600',
      color: '#334155',
  },
  subItemDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  subItemNcm: {
      fontSize: 12,
      color: '#64748b',
  },
  subItemValue: {
      fontSize: 13,
      fontWeight: '700',
      color: '#0f172a',
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
