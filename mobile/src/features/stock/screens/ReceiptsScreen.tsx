import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { ArrowLeft, Box, CheckSquare, Clock, ShieldCheck, Truck, AlertTriangle } from 'lucide-react-native';
import { ReceiptCheckScreen } from './ReceiptCheckScreen';

interface ReceiptTask {
  id: string;
  nfeNumber: string;
  supplierName: string;
  date: string;
  status: 'pending' | 'checking' | 'divergence' | 'completed';
  itemsCount: number;
  checkedCount: number;
}

interface Props {
  isDarkMode: boolean;
  onBack: () => void;
}

export const ReceiptsScreen: React.FC<Props> = ({ isDarkMode, onBack }) => {
  const [tasks, setTasks] = useState<ReceiptTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [checkingReceipt, setCheckingReceipt] = useState<ReceiptTask | null>(null);

  const loadReceipts = async (isRefresh = false, pageNum = 0) => {
    if (isRefresh) {
        setPage(0);
        setHasMore(true);
    } else if (pageNum > 0) {
        setLoadingMore(true);
    } else {
        setLoading(true);
    }

    try {
        const { fetchReceipts, ITEMS_PER_PAGE } = await import('../../../services/stockService');
        const data = await fetchReceipts(pageNum);
        
        const formattedData = (data || []).map((r: any) => ({
            id: r.id,
            nfeNumber: r.number || r.nfeNumber || `NF-${r.id.slice(0,4)}`,
            supplierName: r.people?.name || 'Fornecedor Desconhecido',
            date: r.date || r.created_at,
            status: r.status === 'partially_received' ? 'checking' : r.status === 'sent' ? 'pending' : r.status,
            itemsCount: r.total_items || 0,
            checkedCount: r.items_received || 0,
        }));

        if (isRefresh || pageNum === 0) {
            setTasks(formattedData);
        } else {
            setTasks(prev => [...prev, ...formattedData]);
        }
        
        if (data && data.length < ITEMS_PER_PAGE) {
            setHasMore(false);
        }
    } catch (err) {
        console.error('Failed to fetch receipts:', err);
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
          void loadReceipts(false, nextPage);
      }
  };

  useEffect(() => {
    void loadReceipts();
  }, []);

  if (checkingReceipt) {
    return <ReceiptCheckScreen isDarkMode={isDarkMode} onBack={() => setCheckingReceipt(null)} />;
  }

  const getStatusConfig = (status: ReceiptTask['status']) => {
      switch (status) {
          case 'pending': 
              return { label: 'Pendente', bg: isDarkMode ? '#1e293b' : '#f1f5f9', color: isDarkMode ? '#94a3b8' : '#64748b' };
          case 'checking': 
              return { label: 'Em Conferência', bg: isDarkMode ? '#1e3a8a' : '#eff6ff', color: isDarkMode ? '#60a5fa' : '#3b82f6' };
          case 'divergence': 
              return { label: 'Divergência', bg: isDarkMode ? '#451a03' : '#fef3c7', color: isDarkMode ? '#fbbf24' : '#d97706' };
          case 'completed': 
              return { label: 'Concluído', bg: isDarkMode ? '#064e3b' : '#d1fae5', color: isDarkMode ? '#34d399' : '#059669' };
      }
  };

  const renderTask = ({ item }: { item: ReceiptTask }) => {
      const statusConfig = getStatusConfig(item.status);
      const isComplete = item.checkedCount === item.itemsCount;

      return (
        <TouchableOpacity style={[styles.card, isDarkMode && styles.cardDark]} onPress={() => setCheckingReceipt(item)}>
          <View style={styles.cardHeader}>
            <View style={styles.titleGroup}>
              <Truck size={20} color={isDarkMode ? '#60a5fa' : '#2563eb'} />
              <Text style={[styles.title, isDarkMode && styles.textDark]}>{item.nfeNumber}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: statusConfig.bg }]}>
              {item.status === 'divergence' && <AlertTriangle size={12} color={statusConfig.color} style={{ marginRight: 4 }} />}
              <Text style={[styles.badgeText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>

          <Text style={[styles.supplierName, isDarkMode && styles.textMutedDark]}>
            {item.supplierName}
          </Text>

          <View style={styles.progressContainer}>
            <View style={styles.progressTextGroup}>
              <Text style={[styles.progressText, isDarkMode && styles.textMutedDark]}>Progresso da Conferência</Text>
              <Text style={[styles.progressValues, isDarkMode && styles.textDark]}>
                {item.checkedCount} / {item.itemsCount} volumes
              </Text>
            </View>
            <View style={[styles.progressBarBg, isDarkMode && styles.progressBarBgDark]}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${(item.checkedCount / item.itemsCount) * 100}%` },
                  item.status === 'divergence' ? { backgroundColor: '#f59e0b' } :
                  isComplete ? { backgroundColor: '#10b981' } : { backgroundColor: '#3b82f6' }
                ]} 
              />
            </View>
          </View>
        </TouchableOpacity>
      );
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={item => item.id}
          renderItem={renderTask}
          contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
              loadingMore ? <ActivityIndicator size="small" color="#2563eb" style={{ padding: 16 }} /> : null
          }
        />
      )}
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
  },
  cardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  textDark: {
    color: '#f8fafc',
  },
  textMutedDark: {
    color: '#94a3b8',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  supplierName: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
    paddingLeft: 28, // align with title
  },
  progressContainer: {
    marginTop: 4,
  },
  progressTextGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  progressValues: {
    fontSize: 12,
    fontWeight: '800',
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
    borderRadius: 3,
  },
});
