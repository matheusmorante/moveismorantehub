import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { ClipboardList } from 'lucide-react-native';
import { InventoryCard } from '../components/InventoryCard';
import { useInventory } from '../hooks/useInventory';
import { InventorySession } from '../../types/stock.types';
import { InventoryAuditFlow } from './InventoryAuditFlow';
import { InventoryDetailsModal } from '../components/InventoryDetailsModal';

interface Props {
  isDarkMode: boolean;
  userProfile?: any;
  onBack: () => void;
  renderHeader: () => React.ReactElement;
}

export const InventoryScreen: React.FC<Props> = ({ isDarkMode, userProfile, onBack, renderHeader }) => {
  const { sessions, loading, loadingMore, loadMore, reload } = useInventory();
  const [showCount, setShowCount] = useState(false);
  const [selectedSession, setSelectedSession] = useState<InventorySession | null>(null);
  const [viewDetailsSession, setViewDetailsSession] = useState<InventorySession | null>(null);

  if (showCount) {
    return <InventoryAuditFlow isDarkMode={isDarkMode} userProfile={userProfile} onClose={() => {
        setShowCount(false);
        reload();
    }} />;
  }

  const handleOptionsPress = (session: InventorySession) => {
      setSelectedSession(session);
  };

  const renderOptionsModal = () => {
      if (!selectedSession) return null;
      const adjustmentsCount = selectedSession.adjustmentsCount || 0;
      const reversedCount = selectedSession.reversedCount || 0;
      const canRevert = selectedSession.status === 'completed' && adjustmentsCount > 0 && reversedCount === 0;
      const hasReverted = selectedSession.status === 'completed' && reversedCount > 0;

      return (
        <Modal visible={true} transparent animationType="fade" onRequestClose={() => setSelectedSession(null)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedSession(null)}>
                <View style={[styles.modalContent, isDarkMode && styles.modalContentDark]}>
                    <Text style={[styles.modalTitle, isDarkMode && styles.modalTitleDark]}>
                        Opções do Inventário #{selectedSession.inventoryCode || selectedSession.name?.replace('Inventário #', '') || selectedSession.id.split('-')[0]}
                    </Text>
                    
                    <TouchableOpacity style={styles.modalOption} onPress={() => { 
                        setSelectedSession(null); 
                        setTimeout(() => setViewDetailsSession(selectedSession), 300);
                    }}>
                        <Text style={[styles.modalOptionText, isDarkMode && styles.modalOptionTextDark]}>Ver detalhes</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.modalOption} onPress={() => { setSelectedSession(null); Alert.alert('Em breve', 'A cópia de inventário estará disponível na próxima atualização.'); }}>
                        <Text style={[styles.modalOptionText, isDarkMode && styles.modalOptionTextDark]}>Duplicar inventário</Text>
                    </TouchableOpacity>

                    {canRevert && (
                        <TouchableOpacity style={styles.modalOption} onPress={() => { setSelectedSession(null); Alert.alert('Em breve', 'A funcionalidade de estorno estará disponível na próxima atualização.'); }}>
                            <Text style={styles.modalOptionTextDestructive}>Desfazer inventário</Text>
                        </TouchableOpacity>
                    )}

                    {hasReverted && (
                        <TouchableOpacity style={styles.modalOption} onPress={() => { setSelectedSession(null); Alert.alert('Em breve', 'A funcionalidade de aplicar ajuste estará disponível na próxima atualização.'); }}>
                            <Text style={[styles.modalOptionText, isDarkMode && styles.modalOptionTextDark]}>Aplicar ajuste</Text>
                        </TouchableOpacity>
                    )}

                    <View style={[styles.modalDivider, isDarkMode && styles.modalDividerDark]} />

                    <TouchableOpacity style={styles.modalOption} onPress={() => setSelectedSession(null)}>
                        <Text style={styles.modalOptionTextCancel}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
      );
  };

  const PageHeader = () => (
    <View style={[styles.pageHeader, isDarkMode && styles.pageHeaderDark, { justifyContent: 'flex-end' }]}>
        <TouchableOpacity testID="new-inventory-btn" style={styles.startBtn} onPress={() => setShowCount(true)}>
            <ClipboardList size={18} color="#ffffff" />
            <Text style={styles.startBtnText}>Novo Inventário</Text>
        </TouchableOpacity>
    </View>
  );

  const data: any[] = [
      { type: 'MODULE_HEADER', id: 'MODULE_HEADER' },
      { type: 'PAGE_HEADER', id: 'PAGE_HEADER' },
      ...sessions.map(s => ({ type: 'ITEM', id: s.id, data: s }))
  ];

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        stickyHeaderIndices={[1]}
        renderItem={({ item }) => {
            if (item.type === 'MODULE_HEADER') return renderHeader();
            if (item.type === 'PAGE_HEADER') return <PageHeader />;
            return (
                <View style={styles.cardContainer}>
                    <InventoryCard session={item.data as InventorySession} isDarkMode={isDarkMode} onOptionsPress={handleOptionsPress} />
                </View>
            );
        }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
            <>
                {loadingMore && <ActivityIndicator size="small" color="#10b981" style={{ padding: 16 }} />}
                {!loading && sessions.length === 0 && (
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
            </>
        }
      />
      {renderOptionsModal()}
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 32 },
  modalContentDark: { backgroundColor: '#1e293b' },
  modalTitle: { fontSize: 14, fontWeight: '800', color: '#64748b', marginBottom: 16, textAlign: 'center' },
  modalTitleDark: { color: '#94a3b8' },
  modalOption: { paddingVertical: 16, alignItems: 'center' },
  modalOptionText: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  modalOptionTextDark: { color: '#f8fafc' },
  modalOptionTextDestructive: { fontSize: 16, fontWeight: '700', color: '#ef4444' },
  modalOptionTextCancel: { fontSize: 16, fontWeight: '700', color: '#3b82f6' },
  modalDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 8 },
  modalDividerDark: { backgroundColor: '#334155' },
});
