import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChevronRight, FileText, RotateCcw, ShoppingBag, Wrench } from 'lucide-react-native';
import { MobileOrderCard } from '../components/MobileOrderCard';
import { OrdersHeader } from '../components/OrdersHeader';
import { MobileOrderPagination } from '../components/MobileOrderPagination';
import { useMobileOrders } from '../hooks/useMobileOrders';
import type { MobileOrderType } from '../domain/types';

interface Props {
  isDarkMode: boolean;
  isAdmin: boolean;
  onSelectOrder?: (order: any) => void;
}

const ORDER_SECTIONS: {
  type: MobileOrderType;
  title: string;
  description: string;
  Icon: typeof ShoppingBag;
}[] = [
  {
    type: 'sale',
    title: 'Pedidos de Venda',
    description: 'Agendados, atendidos e retirados',
    Icon: ShoppingBag,
  },
  {
    type: 'budget',
    title: 'Orçamentos',
    description: 'Propostas e negociações',
    Icon: FileText,
  },
  {
    type: 'assistance',
    title: 'Assistências',
    description: 'Garantias e reparos',
    Icon: Wrench,
  },
  {
    type: 'return',
    title: 'Devoluções',
    description: 'Trocas e devoluções',
    Icon: RotateCcw,
  },
];

export const NativeOrdersScreen: React.FC<Props> = ({ isDarkMode, onSelectOrder }) => {
  const [selectedType, setSelectedType] = useState<MobileOrderType | null>(null);

  return (
    <View style={[styles.container, isDarkMode && styles.dark]}>
      {selectedType ? (
        <OrdersList
          key={selectedType}
          orderType={selectedType}
          dark={isDarkMode}
          onBack={() => setSelectedType(null)}
          onSelectOrder={onSelectOrder}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.menuContent}>
          <Text style={[styles.menuTitle, isDarkMode && styles.light]}>Pedidos</Text>
          <Text style={[styles.menuSubtitle, isDarkMode && styles.mutedDark]}>
            Escolha o módulo que deseja consultar.
          </Text>
          {ORDER_SECTIONS.map(({ type, title, description, Icon }) => (
            <TouchableOpacity
              key={type}
              onPress={() => setSelectedType(type)}
              activeOpacity={0.75}
              style={[styles.menuCard, isDarkMode && styles.darkCard]}
            >
              <View
                style={[
                  styles.iconBox,
                  type === 'assistance' ? styles.assistanceIconBox : isDarkMode && styles.iconBoxDark,
                ]}
              >
                <Icon
                  size={21}
                  color={
                    type === 'assistance' ? '#fef08a' : isDarkMode ? '#93c5fd' : '#2563eb'
                  }
                />
              </View>
              <View style={styles.menuCardText}>
                <Text style={[styles.menuCardTitle, isDarkMode && styles.light]}>{title}</Text>
                <Text style={[styles.menuCardDescription, isDarkMode && styles.mutedDark]}>
                  {description}
                </Text>
              </View>
              <ChevronRight size={19} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

function OrdersList({
  orderType,
  dark,
  onBack,
  onSelectOrder,
}: {
  orderType: MobileOrderType;
  dark: boolean;
  onBack: () => void;
  onSelectOrder?: (order: any) => void;
}) {
  const orders = useMobileOrders(orderType);
  const scrollViewRef = useRef<ScrollView>(null);
  const title = ORDER_SECTIONS.find((section) => section.type === orderType)?.title;

  const handlePageChange = (page: number) => {
    orders.setCurrentPage(page);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  return orders.loading && !orders.refreshing ? (
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
        dark={dark}
        title={title}
        onBack={onBack}
        orderType={orderType}
        search={orders.searchTerm}
        onSearch={orders.setSearchTerm}
        statusFilter={orders.statusFilter}
        onSelectStatus={orders.setStatusFilter}
        onRefresh={() => orders.refresh()}
        totalOrders={orders.totalItems}
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
            dark={dark}
            handlingOptions={orders.handlingOptions}
            onDetails={() => onSelectOrder?.(order)}
            onFilterByLinkedOrder={(codeOrId) => {
              orders.setSearchTerm(String(codeOrId));
              scrollViewRef.current?.scrollTo({ y: 0, animated: true });
            }}
          />
        ))
      )}

      <MobileOrderPagination
        currentPage={orders.currentPage}
        totalPages={orders.totalPages}
        totalItems={orders.totalItems}
        itemsPerPage={orders.itemsPerPage}
        dark={dark}
        onPageChange={handlePageChange}
      />
    </ScrollView>
  );
}

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
  menuContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  menuTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#0f172a',
  },
  menuSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginTop: -6,
    marginBottom: 4,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  darkCard: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
  },
  iconBoxDark: {
    backgroundColor: 'rgba(30, 58, 138, 0.35)',
  },
  assistanceIconBox: {
    backgroundColor: '#ca8a04',
  },
  menuCardText: {
    flex: 1,
    gap: 3,
  },
  menuCardTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  menuCardDescription: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  light: {
    color: '#f8fafc',
  },
  mutedDark: {
    color: '#94a3b8',
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
