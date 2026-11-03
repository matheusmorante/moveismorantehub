import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check, PackagePlus, PackageX, RotateCcw, X } from 'lucide-react-native';

interface Props {
  visible: boolean;
  isDarkMode: boolean;
  receipt: any | null;
  onClose: () => void;
}

const itemMovement = (item: any, isDraft: boolean, isReversed: boolean) => {
  const productId = item?.productId || item?.product_id || item?.item_snapshot?.productId;
  if (!productId) return { label: 'Sem cadastro', color: '#b45309', background: '#fef3c7' };
  if (isReversed) return { label: 'Estornada', color: '#b91c1c', background: '#fee2e2' };
  if (isDraft) return { label: 'Não efetivada', color: '#64748b', background: '#f1f5f9' };
  return { label: 'Efetivada', color: '#047857', background: '#d1fae5' };
};

export const ReceiptMovementDetailsModal: React.FC<Props> = ({
  visible,
  isDarkMode,
  receipt,
  onClose,
}) => {
  if (!receipt) return null;

  const isDraft = receipt.is_draft === true || receipt.isDraft === true || receipt.status === 'draft';
  const isReversed = receipt.status === 'estornado';
  const receiptCode = receipt.receipt_index || receipt.receiptIndex;
  const code = receiptCode ? String(receiptCode).padStart(6, '0') : receipt.id?.split('-')[0]?.toUpperCase() || '—';
  const items = Array.isArray(receipt.items) ? receipt.items : [];
  const statusLabel = isDraft ? 'Sem Movimentação' : isReversed ? 'Entrada Estornada' : 'Entrada Efetivada';
  const explanation = isDraft
    ? 'Rascunhos não movimentam o estoque. As entradas serão registradas ao confirmar o recebimento.'
    : isReversed
      ? 'As entradas vinculadas a este recebimento foram estornadas e não compõem o saldo atual.'
      : 'As entradas efetivadas pelos itens deste recebimento foram incluídas no saldo de estoque.';
  const statusColor = isDraft ? '#64748b' : isReversed ? '#b91c1c' : '#047857';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar detalhes da movimentação do recebimento"
        />
        <View
          style={[styles.card, isDarkMode && styles.cardDark]}
          accessibilityViewIsModal
          accessibilityRole="summary"
        >
          <View style={[styles.header, isDarkMode && styles.headerDark]}>
            <View style={styles.headerIcon}>
              {isReversed ? <PackageX size={21} color="#ffffff" /> : <PackagePlus size={21} color="#ffffff" />}
              {isReversed ? (
                <View style={[styles.indicator, { backgroundColor: '#b91c1c' }]}>
                  <RotateCcw size={9} color="#ffffff" strokeWidth={3} />
                </View>
              ) : !isDraft ? (
                <View style={[styles.indicator, { backgroundColor: '#047857' }]}>
                  <Check size={9} color="#ffffff" strokeWidth={3} />
                </View>
              ) : null}
            </View>
            <View style={styles.headerCopy}>
              <Text style={[styles.title, isDarkMode && styles.textDark]}>Movimentação do recebimento</Text>
              <Text style={[styles.status, { color: statusColor }]}>{statusLabel}</Text>
              <Text style={[styles.meta, isDarkMode && styles.mutedDark]}>
                Recebimento #{code} · {receipt.supplierName || receipt.supplier_name || 'Fornecedor'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Fechar detalhes da movimentação"
            >
              <X size={21} color={isDarkMode ? '#cbd5e1' : '#64748b'} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.explanation, isDarkMode && styles.mutedDark]}>{explanation}</Text>

          <View style={styles.itemsHeader}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.mutedDark]}>
              Itens do recebimento ({items.length})
            </Text>
            <Text style={[styles.columnTitle, isDarkMode && styles.mutedDark]}>Entrada</Text>
          </View>

          <ScrollView style={styles.itemsList} contentContainerStyle={styles.itemsContent}>
            {items.length ? items.map((item: any, index: number) => {
              const movement = itemMovement(item, isDraft, isReversed);
              const description = item.description || item.item_snapshot?.description || item.name || 'Produto';
              return (
                <View key={`${item.id || item.product_id || description}-${index}`} style={[styles.item, isDarkMode && styles.itemDark]}>
                  <View style={styles.itemCopy}>
                    <Text style={[styles.itemName, isDarkMode && styles.textDark]}>{description}</Text>
                    <Text style={[styles.quantity, isDarkMode && styles.mutedDark]}>
                      Quantidade: {Number(item.quantity ?? 1)}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: isDarkMode ? `${movement.color}25` : movement.background }]}>
                    <Text style={[styles.statusBadgeText, { color: movement.color }]}>{movement.label}</Text>
                  </View>
                </View>
              );
            }) : (
              <Text style={[styles.empty, isDarkMode && styles.mutedDark]}>Nenhum item registrado neste recebimento.</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '82%',
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: '#ffffff',
    elevation: 16,
  },
  cardDark: { backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  headerDark: { borderBottomColor: '#334155' },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
  },
  indicator: {
    position: 'absolute',
    right: -4,
    top: -4,
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { color: '#0f172a', fontSize: 15, fontWeight: '900' },
  status: { marginTop: 2, fontSize: 12, fontWeight: '800' },
  meta: { marginTop: 3, color: '#64748b', fontSize: 11 },
  closeButton: { padding: 6 },
  explanation: { paddingHorizontal: 16, paddingTop: 13, color: '#475569', fontSize: 13, lineHeight: 19 },
  itemsHeader: {
    marginTop: 14,
    marginHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: { color: '#64748b', fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  columnTitle: { color: '#64748b', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  itemsList: { marginHorizontal: 16, marginTop: 8, marginBottom: 16, flexGrow: 0 },
  itemsContent: { gap: 8, paddingBottom: 2 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  itemDark: { borderColor: '#334155', backgroundColor: '#1e293b' },
  itemCopy: { flex: 1, minWidth: 0 },
  itemName: { color: '#0f172a', fontSize: 13, fontWeight: '800' },
  quantity: { marginTop: 4, color: '#64748b', fontSize: 11 },
  statusBadge: { maxWidth: 116, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 6 },
  statusBadgeText: { fontSize: 9, fontWeight: '900', textAlign: 'center', textTransform: 'uppercase' },
  empty: { paddingVertical: 14, color: '#64748b', fontSize: 13 },
  textDark: { color: '#f8fafc' },
  mutedDark: { color: '#94a3b8' },
});
