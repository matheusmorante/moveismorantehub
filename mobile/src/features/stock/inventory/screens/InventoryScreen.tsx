import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { ClipboardList } from 'lucide-react-native';
import { InventoryCard } from '../components/InventoryCard';
import { useInventory } from '../hooks/useInventory';
import { InventorySession } from '../../types/stock.types';
import { InventoryAuditFlow } from './InventoryAuditFlow';
import { InventoryDetailsModal } from '../modals/InventoryDetailsModal';
import { InventoryOptionsMenuModal } from '../modals/InventoryOptionsMenuModal';
import {
  reverseInventorySession,
  unreverseInventorySession,
  deleteInventoryDraft,
  fetchInventorySessionDetails,
} from '../../../../services/stockService';

interface Props {
  isDarkMode: boolean;
  userProfile?: any;
  onBack: () => void;
  renderHeader: () => React.ReactElement;
}

export const InventoryScreen: React.FC<Props> = ({ isDarkMode, userProfile, onBack, renderHeader }) => {
  const { sessions, loading, loadingMore, loadMore, reload } = useInventory();
  const [periodDays, setPeriodDays] = useState(30);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const filteredSessions = sessions.filter(session => periodDays === 0 || new Date(session.created_at || session.updated_at).getTime() >= Date.now() - periodDays * 24 * 60 * 60 * 1000);
  const pageCount = Math.max(1, Math.ceil(filteredSessions.length / pageSize));
  const visibleSessions = filteredSessions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const [showCount, setShowCount] = useState(false);
  const [editingSession, setEditingSession] = useState<InventorySession | null>(null);
  const [copiedItems, setCopiedItems] = useState<any[] | null>(null);
  const [selectedSession, setSelectedSession] = useState<InventorySession | null>(null);
  const [viewDetailsSession, setViewDetailsSession] = useState<InventorySession | null>(null);

  if (showCount) {
    return (
      <InventoryAuditFlow
        isDarkMode={isDarkMode}
        userProfile={userProfile}
        initialSession={editingSession}
        copiedItems={copiedItems}
        onClose={() => {
          setShowCount(false);
          setEditingSession(null);
          setCopiedItems(null);
          reload();
        }}
      />
    );
  }

  const handleOptionsPress = (session: InventorySession) => {
    setSelectedSession(session);
  };

  const handleContinueInventory = (session: InventorySession) => {
    setSelectedSession(null);
    setEditingSession(session);
    setCopiedItems(null);
    setShowCount(true);
  };

  const handleDuplicateInventory = async (session: InventorySession) => {
    setSelectedSession(null);
    try {
      const details = await fetchInventorySessionDetails(session.id);
      const items = details?.items || [];
      if (!items.length) {
        Alert.alert('Aviso', 'Este inventário não possui itens para duplicar.');
        return;
      }
      setEditingSession(null);
      setCopiedItems(items);
      setShowCount(true);
    } catch (error) {
      console.error('Erro ao buscar itens para duplicar:', error);
      Alert.alert('Erro', 'Não foi possível carregar os itens do inventário.');
    }
  };

  const handleReverseInventory = (session: InventorySession) => {
    setSelectedSession(null);
    const code = session.inventoryCode || session.name?.replace('Inventário #', '') || session.id.split('-')[0];
    Alert.alert(
      'Desfazer inventário',
      `Deseja estornar todos os ajustes gerados pelo Inventário #${code}? Os saldos de estoque dos produtos retornarão aos valores anteriores.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, estornar',
          style: 'destructive',
          onPress: async () => {
            try {
              await reverseInventorySession(session);
              Alert.alert('Sucesso', `Inventário #${code} estornado com sucesso!`);
              reload();
            } catch (error) {
              console.error('Erro ao estornar inventário:', error);
              Alert.alert('Erro', 'Não foi possível estornar os ajustes do inventário.');
            }
          },
        },
      ]
    );
  };

  const handleApplyAdjustments = (session: InventorySession) => {
    setSelectedSession(null);
    const code = session.inventoryCode || session.name?.replace('Inventário #', '') || session.id.split('-')[0];
    Alert.alert(
      'Aplicar ajuste',
      `Deseja reaplicar os ajustes do Inventário #${code}? O estoque será atualizado com as quantidades contadas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aplicar ajustes',
          onPress: async () => {
            try {
              await unreverseInventorySession(session);
              Alert.alert('Sucesso', `Ajustes do Inventário #${code} aplicados com sucesso!`);
              reload();
            } catch (error) {
              console.error('Erro ao aplicar ajustes:', error);
              Alert.alert('Erro', 'Não foi possível reaplicar os ajustes do inventário.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteDraft = (session: InventorySession) => {
    setSelectedSession(null);
    const code = session.inventoryCode || session.name?.replace('Inventário #', '') || session.id.split('-')[0];
    Alert.alert(
      'Excluir contagem',
      `Excluir a contagem #${code}? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteInventoryDraft(session.id);
              Alert.alert('Sucesso', 'Contagem em andamento excluída.');
              reload();
            } catch (error) {
              console.error('Erro ao excluir contagem:', error);
              Alert.alert('Erro', 'Não foi possível excluir a contagem.');
            }
          },
        },
      ]
    );
  };

  const PageHeader = () => (
    <View style={[styles.pageHeader, isDarkMode && styles.pageHeaderDark]}>
      <View style={styles.periodControls}>
        <Text style={[styles.periodLabel, isDarkMode && styles.periodLabelDark]}>Período</Text>
        <TouchableOpacity style={[styles.periodButton, isDarkMode && styles.periodButtonDark]} onPress={() => { setPeriodDays(periodDays === 30 ? 90 : periodDays === 90 ? 365 : periodDays === 365 ? 0 : 30); setCurrentPage(1); }}>
          <Text style={[styles.periodButtonText, isDarkMode && styles.periodButtonTextDark]}>{periodDays === 30 ? 'Últimos 30 dias' : periodDays === 90 ? 'Últimos 90 dias' : periodDays === 365 ? 'Último ano' : 'Todos os períodos'}</Text>
          <Text style={[styles.periodButtonText, isDarkMode && styles.periodButtonTextDark]}>⌄</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        testID="new-inventory-btn"
        style={styles.startBtn}
        onPress={() => {
          setEditingSession(null);
          setCopiedItems(null);
          setShowCount(true);
        }}
      >
        <ClipboardList size={18} color="#ffffff" />
        <Text style={styles.startBtnText}>Novo Inventário</Text>
      </TouchableOpacity>
    </View>
  );

  const data: any[] = [
      { type: 'MODULE_HEADER', id: 'MODULE_HEADER' },
      { type: 'PAGE_HEADER', id: 'PAGE_HEADER' },
      ...visibleSessions.map(s => ({ type: 'ITEM', id: s.id, data: s }))
  ];

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        stickyHeaderIndices={[1]}
        ListHeaderComponent={loading ? <ActivityIndicator size="large" color="#10b981" style={{ padding: 24 }} /> : null}
        renderItem={({ item }) => {
            if (item.type === 'MODULE_HEADER') return renderHeader();
            if (item.type === 'PAGE_HEADER') return <PageHeader />;
            return (
                <View style={styles.cardContainer}>
                    <InventoryCard 
                        session={item.data as InventorySession} 
                        isDarkMode={isDarkMode} 
                        onPress={(session) => {
                            if (session.status === 'in_progress' || session.status === 'pending_sync') {
                                handleContinueInventory(session);
                            } else {
                                setViewDetailsSession(session);
                            }
                        }}
                        onOptionsPress={handleOptionsPress} 
                    />
                </View>
            );
        }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
            <>
                {loadingMore && <ActivityIndicator size="small" color="#10b981" style={{ padding: 16 }} />}
                {!loading && visibleSessions.length === 0 && (
                    <View style={{ padding: 32, alignItems: 'center', justifyContent: 'center', marginTop: 40 }}>
                        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                            <ClipboardList size={32} color={isDarkMode ? '#64748b' : '#94a3b8'} />
                        </View>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: isDarkMode ? '#f8fafc' : '#0f172a', marginBottom: 8 }}>Nenhum inventário ainda</Text>
                        <Text style={{ textAlign: 'center', color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                            Toque no botão "Novo Inventário" para começar a auditar seu estoque.
                        </Text>
                    </View>
                )}
                {!loading && visibleSessions.length > 0 && <View style={styles.pagination}>
                  <TouchableOpacity disabled={currentPage <= 1} onPress={() => setCurrentPage(page => Math.max(1, page - 1))} style={[styles.pageButton, currentPage <= 1 && styles.pageButtonDisabled]}><Text style={styles.pageButtonText}>‹</Text></TouchableOpacity>
                  <Text style={[styles.pageText, isDarkMode && styles.periodLabelDark]}>Página {currentPage} de {pageCount}</Text>
                  <TouchableOpacity disabled={currentPage >= pageCount} onPress={() => setCurrentPage(page => Math.min(pageCount, page + 1))} style={[styles.pageButton, currentPage >= pageCount && styles.pageButtonDisabled]}><Text style={styles.pageButtonText}>›</Text></TouchableOpacity>
                </View>}
            </>
        }
      />
      <InventoryOptionsMenuModal
        visible={Boolean(selectedSession)}
        session={selectedSession}
        isDarkMode={isDarkMode}
        onClose={() => setSelectedSession(null)}
        onContinue={handleContinueInventory}
        onViewDetails={(s) => {
          setSelectedSession(null);
          setTimeout(() => setViewDetailsSession(s), 300);
        }}
        onDuplicate={(s) => void handleDuplicateInventory(s)}
        onReverse={handleReverseInventory}
        onApplyAdjustments={handleApplyAdjustments}
        onDeleteDraft={handleDeleteDraft}
      />
      {viewDetailsSession && (
        <InventoryDetailsModal
          session={viewDetailsSession}
          isDarkMode={isDarkMode}
          onClose={() => setViewDetailsSession(null)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  containerDark: { backgroundColor: '#0f172a' },
  pageHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  pageHeaderDark: { backgroundColor: '#0f172a', borderBottomColor: '#1e293b' },
  startBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#10b981', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 8,
    shadowColor: '#10b981', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 3
  },
  startBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  cardContainer: { paddingHorizontal: 16, paddingTop: 12 },
  periodControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  periodLabel: { color: '#64748b', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  periodLabelDark: { color: '#94a3b8' },
  periodButton: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  periodButtonDark: { borderColor: '#334155' },
  periodButtonText: { color: '#334155', fontSize: 12, fontWeight: '700' },
  periodButtonTextDark: { color: '#e2e8f0' },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 16 },
  pageButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
  pageButtonDisabled: { opacity: 0.35 },
  pageButtonText: { color: '#fff', fontSize: 24, fontWeight: '800', lineHeight: 26 },
  pageText: { color: '#64748b', fontSize: 12, fontWeight: '800' },
});

