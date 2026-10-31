import React, { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { Box, MoreVertical, Plus } from 'lucide-react-native';
import { useReceipts } from '../hooks/useReceipts';
import { ReceiptCheckScreen } from './ReceiptCheckScreen';
import { NewGoodsReceiptModal } from '../modals/NewGoodsReceiptModal';

interface Props {
  isDarkMode: boolean;
  onBack: () => void;
  renderHeader: (rightAction?: ReactNode) => React.ReactElement;
}

export const ReceiptsScreen: React.FC<Props> = ({ isDarkMode, onBack, renderHeader }) => {
  const { receipts, loading, loadingMore, loadMore, loadError, reload } = useReceipts();
  const { width } = useWindowDimensions();
  const menuAnchor = useRef<View>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [isNewReceiptOpen, setIsNewReceiptOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 16 });

  const openMenu = () => {
    menuAnchor.current?.measureInWindow((x, y, anchorWidth, height) => {
      setMenuPosition({ top: y + height + 4, right: Math.max(8, width - x - anchorWidth) });
      setIsMenuOpen(true);
    });
  };

  if (selectedReceipt) {
    return (
      <ReceiptCheckScreen
        isDarkMode={isDarkMode}
        receipt={selectedReceipt}
        onBack={() => setSelectedReceipt(null)}
        onCompleted={() => {
          void reload();
        }}
      />
    );
  }

  const data: any[] = [
    { type: 'MODULE_HEADER', id: 'MODULE_HEADER' },
    ...(receipts.length === 0 && !loading ? [{ type: 'EMPTY', id: 'EMPTY' }] : []),
    ...receipts.map((r) => ({ type: 'ITEM', id: r.id, data: r })),
  ];

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        stickyHeaderIndices={[0]}
        renderItem={({ item }) => {
          if (item.type === 'MODULE_HEADER') {
            return renderHeader(
              <View ref={menuAnchor} collapsable={false}>
                <TouchableOpacity
                  style={styles.menuTrigger}
                  onPress={openMenu}
                  accessibilityRole="button"
                  accessibilityLabel="Mais opções de recebimentos"
                >
                  <MoreVertical size={19} color={isDarkMode ? '#cbd5e1' : '#475569'} />
                </TouchableOpacity>
              </View>
            );
          }
          if (item.type === 'EMPTY') {
            return (
              <View style={styles.emptyState}>
                <Box
                  size={48}
                  color={isDarkMode ? '#334155' : '#cbd5e1'}
                  style={{ marginBottom: 16 }}
                />
                <Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>
                  {loadError || 'Nenhum recebimento encontrado.'}
                </Text>
                {loadError ? (
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => void reload()}
                    accessibilityRole="button"
                  >
                    <Text style={styles.retryButtonText}>Tentar novamente</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          }
          const r = item.data;
          const hasNF = Boolean(r.fiscal_key && r.fiscal_key.replace(/\D/g, '').length === 44);
          const formattedDate = new Date(r.received_at || r.created_at).toLocaleDateString('pt-BR');
          const total = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(r.totalValue || 0);
          const isDraft = r.status === 'draft';
          const isEstornado = r.status === 'estornado';

          return (
            <View style={styles.cardContainer}>
              <TouchableOpacity
                style={[styles.card, isDarkMode && styles.cardDark]}
                onPress={() => setSelectedReceipt(r)}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <View>
                    <Text style={[styles.title, isDarkMode && styles.textDark]}>
                      Rec #
                      {r.receipt_index || r.receiptIndex
                        ? String(r.receipt_index || r.receiptIndex).padStart(6, '0')
                        : r.id
                          ? r.id.split('-')[0].toUpperCase()
                          : '—'}
                    </Text>
                    <Text
                      style={{ color: '#059669', fontSize: 12, fontWeight: '700', marginTop: 2 }}
                    >
                      {r.items?.length || 0} itens recebidos
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      isDraft
                        ? styles.badgeDraft
                        : isEstornado
                          ? styles.badgeError
                          : styles.badgeSuccess,
                      isDarkMode && { opacity: 0.8 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        isDraft
                          ? styles.badgeTextDraft
                          : isEstornado
                            ? styles.badgeTextError
                            : styles.badgeTextSuccess,
                      ]}
                    >
                      {isDraft ? 'Rascunho' : isEstornado ? 'Estornado' : 'Recebido'}
                    </Text>
                  </View>
                </View>

                <View style={{ marginTop: 12, gap: 6 }}>
                  <Text style={[styles.supplierName, isDarkMode && styles.textDark]}>
                    {r.supplierName}
                  </Text>

                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 4,
                    }}
                  >
                    <Text style={{ color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 13 }}>
                      📅 {formattedDate}
                    </Text>
                    <Text style={{ color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 13 }}>
                      {hasNF
                        ? `📄 Com NF ${r.invoice_number ? `(${r.invoice_number})` : ''}`
                        : '📄 Sem NF'}
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: isDarkMode ? '#334155' : '#e2e8f0',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: isDarkMode ? '#94a3b8' : '#64748b',
                      fontSize: 12,
                      textTransform: 'uppercase',
                      fontWeight: '700',
                    }}
                  >
                    Total Recebido
                  </Text>
                  <Text
                    style={{
                      color: isDarkMode ? '#f8fafc' : '#0f172a',
                      fontSize: 15,
                      fontWeight: '800',
                    }}
                  >
                    {total}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          );
        }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore || loading ? (
            <ActivityIndicator size="small" color="#2563eb" style={{ padding: 16 }} />
          ) : loadError && receipts.length > 0 ? (
            <View style={styles.retryFooter}>
              <Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>{loadError}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => void reload()}
                accessibilityRole="button"
              >
                <Text style={styles.retryButtonText}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
      <Modal visible={isMenuOpen} transparent animationType="fade" onRequestClose={() => setIsMenuOpen(false)}>
        <View style={styles.menuOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsMenuOpen(false)} accessibilityRole="button" accessibilityLabel="Fechar menu de opções" />
          <View style={[styles.menu, isDarkMode && styles.menuDark, menuPosition]}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setIsMenuOpen(false);
                setIsNewReceiptOpen(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Novo recebimento"
            >
              <Plus size={17} color={isDarkMode ? '#93c5fd' : '#2563eb'} />
              <Text style={[styles.menuText, isDarkMode && styles.textDark]}>Novo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <NewGoodsReceiptModal
        visible={isNewReceiptOpen}
        isDarkMode={isDarkMode}
        onClose={() => setIsNewReceiptOpen(false)}
        onSaved={() => void reload()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  containerDark: { backgroundColor: '#0f172a' },
  emptyState: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#64748b', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  emptyTextDark: { color: '#94a3b8' },
  retryFooter: { padding: 16, alignItems: 'center', gap: 10 },
  retryButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#2563eb',
  },
  retryButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  menuTrigger: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuOverlay: { flex: 1 },
  menu: { position: 'absolute', minWidth: 168, padding: 5, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff', elevation: 8 },
  menuDark: { borderColor: '#334155', backgroundColor: '#1e293b' },
  menuItem: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10 },
  menuText: { color: '#0f172a', fontSize: 13, fontWeight: '700' },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  pageHeaderDark: { backgroundColor: '#0f172a', borderBottomColor: '#1e293b' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnDark: { backgroundColor: '#1e293b' },
  pageTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  textDark: { color: '#f8fafc' },
  cardContainer: { paddingHorizontal: 16, paddingTop: 12 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  cardDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  title: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  supplierName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  badgeSuccess: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  badgeDraft: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  badgeError: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  badgeTextSuccess: { color: '#059669' },
  badgeTextDraft: { color: '#d97706' },
  badgeTextError: { color: '#dc2626' },
});
