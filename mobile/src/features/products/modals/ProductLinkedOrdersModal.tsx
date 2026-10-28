import React, { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Receipt, X } from 'lucide-react-native';
import {
  fetchLinkedProductOrders,
  LinkedProductOrder,
} from '../services/mobileProductOrderService';

interface Props {
  visible: boolean;
  dark: boolean;
  product: any | null;
  onClose: () => void;
}

export const ProductLinkedOrdersModal: React.FC<Props> = ({ visible, dark, product, onClose }) => {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<LinkedProductOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const productId = product?.parentId || product?.id;
  const variationId = product?.variationId || (product?.isVariation ? product?.id : undefined);

  useEffect(() => {
    if (!visible || !productId) return;
    let alive = true;
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setOrders([]);
    fetchLinkedProductOrders(
      String(productId),
      variationId ? String(variationId) : undefined,
      controller.signal,
    )
      .then((rows) => {
        if (alive) setOrders(rows);
      })
      .catch(() => {
        if (alive) setError(true);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
      controller.abort();
    };
  }, [visible, productId, variationId, retryKey]);

  const totalQuantity = orders.reduce((sum, order) => sum + order.quantity, 0);
  const unit = product?.unit || 'un';
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatOrderType = (type: string) =>
    type === 'assistance'
      ? 'Assistência'
      : type === 'showroom'
        ? 'Showroom'
        : type === 'budget'
          ? 'Orçamento'
          : 'Venda';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.backdrop,
          { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <View style={[styles.content, dark && styles.darkContent]}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Receipt size={20} color="#2563eb" />
              <View>
                <Text style={[styles.title, dark && styles.light]}>Pedidos Vinculados</Text>
                <Text style={styles.subtitle}>
                  {product?.name || 'Produto'} · SKU: {product?.code || product?.sku || 'N/A'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Fechar pedidos vinculados"
            >
              <X size={20} color={dark ? '#cbd5e1' : '#64748b'} />
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={styles.loadingState} accessibilityRole="progressbar">
              <ActivityIndicator color="#2563eb" />
              <Text style={styles.state}>Buscando pedidos vinculados...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorState} accessibilityRole="alert">
              <Text style={styles.state}>Não foi possível carregar os pedidos.</Text>
              <TouchableOpacity
                onPress={() => setRetryKey((current) => current + 1)}
                style={styles.retryButton}
                accessibilityRole="button"
                accessibilityLabel="Tentar carregar pedidos vinculados novamente"
              >
                <Text style={styles.retryButtonText}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          ) : orders.length === 0 ? (
            <Text style={styles.state}>Nenhum pedido vinculado encontrado.</Text>
          ) : (
            <ScrollView>
              {orders.map((order) => (
                <View key={order.id} style={[styles.row, dark && styles.darkRow]}>
                  <View style={styles.flex}>
                    <Text style={[styles.order, dark && styles.light]}>
                      Pedido #{order.orderNumber}
                    </Text>
                    <Text style={styles.meta}>
                      {order.customer} ·{' '}
                      {order.date
                        ? new Date(order.date).toLocaleDateString('pt-BR')
                        : 'Data não informada'}
                    </Text>
                    <Text style={styles.meta}>
                      {formatOrderType(order.type)} · {order.status || 'Pendente'}
                    </Text>
                  </View>
                  <View style={styles.orderValues}>
                    <Text style={styles.qty}>
                      {order.quantity} {unit}
                    </Text>
                    <Text style={styles.price}>{formatCurrency(order.unitPrice)}</Text>
                  </View>
                </View>
              ))}
              <View style={[styles.totalRow, dark && styles.darkRow]}>
                <Text style={[styles.totalLabel, dark && styles.light]}>Total acumulado</Text>
                <Text style={styles.totalQuantity}>
                  {totalQuantity} {unit}
                </Text>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'flex-end' },
  content: {
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    gap: 14,
  },
  darkContent: { backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  subtitle: { color: '#64748b', fontSize: 11, marginTop: 2 },
  light: { color: '#f8fafc' },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  state: { textAlign: 'center', color: '#64748b', padding: 30 },
  loadingState: { alignItems: 'center', gap: 4 },
  errorState: { alignItems: 'center', gap: 8 },
  retryButton: {
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#2563eb',
  },
  retryButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    marginBottom: 8,
  },
  darkRow: { backgroundColor: '#1e293b' },
  flex: { flex: 1 },
  order: { fontWeight: '800', color: '#0f172a', fontSize: 12 },
  meta: { color: '#64748b', fontSize: 11, marginTop: 3 },
  qty: { color: '#2563eb', fontWeight: '900' },
  orderValues: { alignItems: 'flex-end', gap: 4, marginLeft: 10 },
  price: { color: '#059669', fontSize: 11, fontWeight: '800' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    marginTop: 4,
  },
  totalLabel: { color: '#64748b', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  totalQuantity: { color: '#2563eb', fontSize: 14, fontWeight: '900' },
});
