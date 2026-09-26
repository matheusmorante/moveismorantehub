import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Edit3, X } from 'lucide-react-native';
import { MobilePurchase, PurchaseStatus, purchaseStatusLabel } from './mobilePurchaseService';

interface Props {
  visible: boolean;
  isDarkMode: boolean;
  purchase: MobilePurchase | null;
  onClose: () => void;
  onEdit: () => void;
  onStatusChange: (status: PurchaseStatus) => void;
}

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const date = (value?: string) => value ? new Date(value).toLocaleDateString('pt-BR') : '—';

export const PurchaseDetailsModal: React.FC<Props> = ({ visible, isDarkMode, purchase, onClose, onEdit, onStatusChange }) => {
  const insets = useSafeAreaInsets();
  if (!purchase) return null;
  const colors = { bg: isDarkMode ? '#0f172a' : '#f8fafc', surface: isDarkMode ? '#1e293b' : '#fff', border: isDarkMode ? '#334155' : '#e2e8f0', text: isDarkMode ? '#f8fafc' : '#0f172a', muted: isDarkMode ? '#94a3b8' : '#64748b' };
  const statusColor = purchase.status === 'fulfilled' ? '#059669' : purchase.status === 'cancelled' ? '#dc2626' : '#d97706';
  const changeStatus = (status: PurchaseStatus) => {
    if (status === 'cancelled') {
      Alert.alert('Cancelar pedido?', 'O ERP cancela o pedido e estorna movimentos vinculados quando o estoque já foi processado.', [{ text: 'Voltar', style: 'cancel' }, { text: 'Cancelar pedido', style: 'destructive', onPress: () => onStatusChange(status) }]);
    } else onStatusChange(status);
  };

  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <View style={[styles.flex, { backgroundColor: colors.bg }, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.headerCopy}><View style={styles.titleLine}><Text style={[styles.title, { color: colors.text }]}>Pedido #{purchase.purchaseNumber || purchase.id.slice(0, 8).toUpperCase()}</Text><Text style={[styles.badge, { color: statusColor, borderColor: statusColor }]}>{purchaseStatusLabel(purchase.status)}</Text></View><Text style={[styles.meta, { color: colors.muted }]}>{purchase.supplierName} · {date(purchase.date)}</Text></View><TouchableOpacity onPress={onClose} style={styles.icon}><X size={24} color={colors.text} /></TouchableOpacity></View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.border }]}><View><Text style={[styles.label, { color: colors.muted }]}>Fornecedor</Text><Text style={[styles.value, { color: colors.text }]}>{purchase.supplierName}</Text></View><View><Text style={[styles.label, { color: colors.muted }]}>Data</Text><Text style={[styles.value, { color: colors.text }]}>{date(purchase.date)}</Text></View><View><Text style={[styles.label, { color: colors.muted }]}>Total</Text><Text style={[styles.total, { color: '#059669' }]}>{money(purchase.totalValue)}</Text></View><View><Text style={[styles.label, { color: colors.muted }]}>Estoque</Text><Text style={[styles.value, { color: colors.text }]}>{purchase.stockProcessed ? 'Processado' : 'Não processado'}</Text></View></View>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.sectionTitle, { color: colors.text }]}>Itens ({purchase.items.length})</Text>{purchase.items.length === 0 ? <Text style={{ color: colors.muted }}>Nenhum item informado.</Text> : purchase.items.map((item, index) => <View key={`${item.productId}-${item.variationId || index}`} style={[styles.item, { borderColor: colors.border }]}><View style={styles.itemCopy}><Text style={[styles.itemName, { color: colors.text }]}>{item.description}</Text><Text style={[styles.meta, { color: colors.muted }]}>{item.sku ? `SKU ${item.sku} · ` : ''}{item.quantity} un. · Custo {money(item.unitCost || item.baseCost)}</Text></View><Text style={[styles.itemValue, { color: colors.text }]}>{money(item.totalCost || item.quantity * item.unitCost)}</Text></View>)}</View>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.sectionTitle, { color: colors.text }]}>Dados adicionais</Text><Text style={[styles.meta, { color: colors.muted }]}>IPI: {purchase.ipiPercent.toFixed(2)}% · Frete: {purchase.freightPercent.toFixed(2)}%</Text>{purchase.invoiceNumber ? <Text style={[styles.meta, { color: colors.muted }]}>Nota fiscal: {purchase.invoiceNumber}</Text> : null}{purchase.observation ? <Text style={[styles.observation, { color: colors.text }]}>{purchase.observation}</Text> : null}</View>
      </ScrollView>
      <View style={[styles.footer, { backgroundColor: colors.surface, borderColor: colors.border }]}><TouchableOpacity onPress={onEdit} style={styles.editButton}><Edit3 size={16} color="#2563eb" /><Text style={styles.editText}>Editar</Text></TouchableOpacity>{purchase.status === 'ordered' ? <TouchableOpacity onPress={() => changeStatus('fulfilled')} style={styles.primary}><Text style={styles.primaryText}>Marcar atendido</Text></TouchableOpacity> : <TouchableOpacity onPress={() => changeStatus('ordered')} style={styles.editButton}><Text style={styles.editText}>Voltar para ordem</Text></TouchableOpacity>}{purchase.status !== 'cancelled' ? <TouchableOpacity onPress={() => changeStatus('cancelled')} style={styles.danger}><Text style={styles.primaryText}>Cancelar</Text></TouchableOpacity> : null}</View>
    </View>
  </Modal>;
};

const styles = StyleSheet.create({ flex: { flex: 1 }, header: { padding: 18, paddingTop: 52, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center' }, headerCopy: { flex: 1 }, titleLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }, title: { fontSize: 17, fontWeight: '900' }, badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }, meta: { fontSize: 11, marginTop: 4 }, icon: { padding: 6 }, content: { padding: 16, gap: 14 }, summary: { padding: 14, borderWidth: 1, borderRadius: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 14 }, label: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }, value: { fontSize: 13, fontWeight: '800', marginTop: 3 }, total: { fontSize: 17, fontWeight: '900', marginTop: 2 }, section: { borderWidth: 1, borderRadius: 16, padding: 14 }, sectionTitle: { fontSize: 13, fontWeight: '900', marginBottom: 8 }, item: { paddingVertical: 11, borderTopWidth: 1, flexDirection: 'row', gap: 8, alignItems: 'center' }, itemCopy: { flex: 1 }, itemName: { fontSize: 13, fontWeight: '800' }, itemValue: { fontSize: 12, fontWeight: '900' }, observation: { marginTop: 10, lineHeight: 19 }, footer: { borderTopWidth: 1, padding: 12, flexDirection: 'row', gap: 8 }, editButton: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }, editText: { color: '#2563eb', fontWeight: '900' }, primary: { flex: 1.35, minHeight: 44, borderRadius: 10, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center' }, danger: { flex: 1, minHeight: 44, borderRadius: 10, backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center' }, primaryText: { color: '#fff', fontWeight: '900', fontSize: 11 },
});
