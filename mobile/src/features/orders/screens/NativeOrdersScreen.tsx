import React from 'react';
import { ActivityIndicator, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { ShoppingBag } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MobileOrderCard } from '../components/MobileOrderCard';
import { OrdersHeader } from '../components/OrdersHeader';
import { useMobileOrders } from '../hooks/useMobileOrders';

interface Props { isDarkMode: boolean; isAdmin: boolean; onSelectOrder?: (order: any) => void }

export const NativeOrdersScreen: React.FC<Props> = ({ isDarkMode, onSelectOrder }) => {
  const insets = useSafeAreaInsets();
  const orders = useMobileOrders();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0) + 8;

  return <View style={[styles.container, isDarkMode && styles.dark, { paddingTop: topInset }]}>
    {orders.loading && !orders.refreshing ? <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.loading}>Carregando pedidos...</Text></View> :
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={orders.refreshing} onRefresh={() => orders.refresh(true)} />}>
        <OrdersHeader dark={isDarkMode} search={orders.searchTerm} status={orders.statusFilter} onSearch={orders.setSearchTerm} onStatus={orders.setStatusFilter} onRefresh={() => orders.refresh()} />
        {orders.filteredOrders.length === 0 ? <View style={styles.empty}><ShoppingBag size={40} color="#cbd5e1" /><Text style={styles.emptyText}>Nenhum pedido encontrado</Text></View> : orders.filteredOrders.map(order =>
          <MobileOrderCard key={order.id} order={order} dark={isDarkMode} handlingOptions={orders.handlingOptions} onDetails={() => onSelectOrder?.(order)} />
        )}
      </ScrollView>}
  </View>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' }, dark: { backgroundColor: '#0f172a' }, content: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' }, loading: { fontSize: 12, fontWeight: '700', color: '#64748b', marginTop: 10 }, empty: { alignItems: 'center', paddingVertical: 60 }, emptyText: { fontSize: 14, fontWeight: '800', color: '#64748b', marginTop: 12 },
});
