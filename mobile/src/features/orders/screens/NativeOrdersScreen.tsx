import React, { useRef } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ShoppingBag } from 'lucide-react-native';
import { MobileOrderCard } from '../components/MobileOrderCard';
import { OrdersHeader } from '../components/OrdersHeader';
import { MobileOrderPagination } from '../components/MobileOrderPagination';
import { useMobileOrders } from '../hooks/useMobileOrders';

interface Props {
  isDarkMode: boolean;
  isAdmin: boolean;
  onSelectOrder?: (order: any) => void;
}

export const NativeOrdersScreen: React.FC<Props> = ({ isDarkMode, onSelectOrder }) => {
  const orders = useMobileOrders();
  const scrollViewRef = useRef<ScrollView>(null);

  const handlePageChange = (page: number) => {
    orders.setCurrentPage(page);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <View style={[styles.container, isDarkMode && styles.dark]}>
      {orders.loading && !orders.refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loading}>Carregando pedidos...</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={orders.refreshing} onRefresh={() => orders.refresh(true)} />
          }
        >
          <OrdersHeader
            dark={isDarkMode}
            search={orders.searchTerm}
            onSearch={orders.setSearchTerm}
            onRefresh={() => orders.refresh()}
          />

          {orders.paginatedOrders.length === 0 ? (
            <View style={styles.empty}>
              <ShoppingBag size={40} color="#cbd5e1" />
              <Text style={styles.emptyText}>Nenhum pedido encontrado</Text>
            </View>
          ) : (
            orders.paginatedOrders.map((order) => (
              <MobileOrderCard
                key={order.id}
                order={order}
                dark={isDarkMode}
                handlingOptions={orders.handlingOptions}
                onDetails={() => onSelectOrder?.(order)}
              />
            ))
          )}

          {/* Paginação de Pedidos (30 itens por página com scroll suave ao topo) */}
          <MobileOrderPagination
            currentPage={orders.currentPage}
            totalPages={orders.totalPages}
            totalItems={orders.totalItems}
            itemsPerPage={orders.itemsPerPage}
            dark={isDarkMode}
            onPageChange={handlePageChange}
          />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  dark: {
    backgroundColor: '#0f172a',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 10,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748b',
    marginTop: 12,
  },
});
