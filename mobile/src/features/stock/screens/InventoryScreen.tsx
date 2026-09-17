import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { ArrowLeft, Plus, CheckSquare, Clock, User, QrCode } from 'lucide-react-native';
import { InventoryScannerScreen } from './InventoryScannerScreen';
import { InventoryCountScreen } from './InventoryCountScreen';

interface InventorySnapshotItem {
  productId: string;
  variationId?: string;
  name: string;
  systemStock: number;
  physicalCount: number;
}

interface InventorySession {
  id: string;
  name: string;
  date: string;
  status: 'in_progress' | 'completed' | 'scheduled' | string;
  itemsCount: number;
  progress: number;
}

interface Props {
  isDarkMode: boolean;
  onBack: () => void;
  userProfile?: any;
}

export const InventoryScreen: React.FC<Props> = ({ isDarkMode, onBack, userProfile }) => {
  const [sessions, setSessions] = useState<InventorySession[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [activeSession, setActiveSession] = useState<InventorySession | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCounting, setIsCounting] = useState(false);

  const loadSessions = async (isRefresh = false, pageNum = 0) => {
    if (isRefresh) {
        setPage(0);
        setHasMore(true);
    } else if (pageNum > 0) {
        setLoadingMore(true);
    } else {
        setLoading(true);
    }

    try {
        const { fetchInventorySessions, ITEMS_PER_PAGE } = await import('../../../services/stockService');
        const data = await fetchInventorySessions(pageNum);
        
        const formattedData = (data || []).map((s: any) => ({
            id: s.id,
            name: s.name || `Inventário ${s.id.slice(0,4)}`,
            date: s.date || s.created_at,
            status: s.status || 'in_progress',
            itemsCount: s.itemsCount || 0,
            progress: s.progress || 0
        }));

        if (isRefresh || pageNum === 0) {
            setSessions(formattedData);
        } else {
            setSessions(prev => [...prev, ...formattedData]);
        }
        
        if (data && data.length < ITEMS_PER_PAGE) {
            setHasMore(false);
        }
    } catch (err) {
        console.error('Failed to fetch inventory sessions:', err);
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
          void loadSessions(false, nextPage);
      }
  };

  useEffect(() => {
    void loadSessions();
  }, []);

  if (isCounting) {
    return <InventoryCountScreen isDarkMode={isDarkMode} onBack={() => setIsCounting(false)} />;
  }

  if (isScanning) {
    return (
      <InventoryScannerScreen 
        isDarkMode={isDarkMode} 
        onClose={() => setIsScanning(false)}
        onScan={(data) => {
          console.log('Scanned:', data);
          setIsScanning(false);
          // TODO: handle scanned item (add to current session)
        }} 
      />
    );
  }

  const renderSession = ({ item }: { item: InventorySession }) => (
    <TouchableOpacity style={[styles.sessionCard, isDarkMode && styles.sessionCardDark]}>
      <View style={styles.sessionHeader}>
        <View style={styles.sessionTitleGroup}>
          <CheckSquare size={20} color={isDarkMode ? '#60a5fa' : '#2563eb'} />
          <Text style={[styles.sessionTitle, isDarkMode && styles.textDark]}>
            {item.name}
          </Text>
        </View>
        <View style={[
          styles.badge, 
          item.status === 'in_progress' ? styles.badgeProgress : styles.badgeDone,
          isDarkMode && (item.status === 'in_progress' ? styles.badgeProgressDark : styles.badgeDoneDark)
        ]}>
          <Text style={[
            styles.badgeText,
            item.status === 'in_progress' ? styles.badgeTextProgress : styles.badgeTextDone,
            isDarkMode && (item.status === 'in_progress' ? styles.badgeTextProgressDark : styles.badgeTextDoneDark)
          ]}>
            {item.status === 'in_progress' ? 'Em andamento' : 'Concluído'}
          </Text>
        </View>
      </View>
      
      <View style={styles.sessionDetails}>
        <View style={styles.detailItem}>
          <Clock size={16} color={isDarkMode ? '#94a3b8' : '#64748b'} />
          <Text style={[styles.detailText, isDarkMode && styles.textMutedDark]}>
            {new Date(item.date).toLocaleDateString('pt-BR')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={[styles.backButton, isDarkMode && styles.backButtonDark]}>
          <ArrowLeft size={24} color={isDarkMode ? '#94a3b8' : '#64748b'} />
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <Text style={[styles.title, isDarkMode && styles.textDark]}>Inventário</Text>
          <Text style={[styles.subtitle, isDarkMode && styles.textMutedDark]}>Contagem de estoque física</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={item => item.id}
          renderItem={renderSession}
          contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
              loadingMore ? <ActivityIndicator size="small" color="#2563eb" style={{ padding: 16 }} /> : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <CheckSquare size={48} color={isDarkMode ? '#334155' : '#e2e8f0'} />
              <Text style={[styles.emptyStateText, isDarkMode && styles.textMutedDark]}>
                Nenhuma contagem de inventário em andamento ou recente.
              </Text>
            </View>
          }
        />
      )}

      <View style={[styles.footer, isDarkMode && styles.footerDark]}>
        <TouchableOpacity style={styles.fab} onPress={() => setIsCounting(true)}>
          <Plus size={24} color="#ffffff" />
          <Text style={styles.fabText}>Nova Contagem</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.fabScan} onPress={() => setIsScanning(true)}>
          <QrCode size={24} color={isDarkMode ? '#f8fafc' : '#0f172a'} />
        </TouchableOpacity>
      </View>
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
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  headerTitleGroup: {
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    marginRight: 12,
  },
  backButtonDark: {
    backgroundColor: '#1e293b',
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
  sessionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sessionCardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sessionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeProgress: {
    backgroundColor: '#dbeafe',
  },
  badgeProgressDark: {
    backgroundColor: '#1e3a8a',
  },
  badgeDone: {
    backgroundColor: '#d1fae5',
  },
  badgeDoneDark: {
    backgroundColor: '#064e3b',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeTextProgress: {
    color: '#1d4ed8',
  },
  badgeTextProgressDark: {
    color: '#93c5fd',
  },
  badgeTextDone: {
    color: '#047857',
  },
  badgeTextDoneDark: {
    color: '#6ee7b7',
  },
  sessionDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 16,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  footerDark: {
    backgroundColor: '#0f172a',
    borderTopColor: '#1e293b',
  },
  fab: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  fabScan: {
    width: 56,
    height: 56,
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  }
});
