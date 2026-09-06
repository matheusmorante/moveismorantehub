import React from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { PackageCheck } from 'lucide-react-native';
import { RouteListItem } from './RouteListItem';
import { DeliveryRouteItem } from '../../hooks/useDeliveryRoute';

interface Props {
  items: DeliveryRouteItem[];
  refreshing: boolean;
  onRefresh: () => void;
  onSelect: (item: DeliveryRouteItem) => void;
  onStartDelivery: (item: DeliveryRouteItem) => void;
  onViewOrder: (item: DeliveryRouteItem) => void;
  isDarkMode?: boolean;
  headerComponent?: React.ReactNode;
}

export const RouteListView: React.FC<Props> = ({
  items,
  refreshing,
  onRefresh,
  onSelect,
  onStartDelivery,
  onViewOrder,
  isDarkMode = false,
  headerComponent,
}) => {
  if (items.length === 0) {
    return (
      <FlatList
        data={[]}
        renderItem={null}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />
        }
        ListHeaderComponent={
          <View>
            {headerComponent}
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, isDarkMode && styles.emptyIconCircleDark]}>
                <PackageCheck size={36} color="#2563eb" />
              </View>
              <Text style={[styles.emptyTitle, isDarkMode && styles.textLight]}>
                Nenhuma entrega para o período
              </Text>
              <Text style={[styles.emptySubtitle, isDarkMode && styles.textMuted]}>
                Não existem pedidos com entrega agendada para o período selecionado.
              </Text>
            </View>
          </View>
        }
      />
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />
      }
      ListHeaderComponent={
        <View>
          {headerComponent}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>
              PRÓXIMAS PARADAS ({items.length})
            </Text>
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <RouteListItem
          item={item}
          onSelect={onSelect}
          onStartDelivery={onStartDelivery}
          onViewOrder={onViewOrder}
          isDarkMode={isDarkMode}
        />
      )}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#2563eb']}
          tintColor="#2563eb"
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  sectionHeader: {
    paddingVertical: 8,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 0.8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIconCircleDark: {
    backgroundColor: '#1e293b',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  textLight: {
    color: '#f8fafc',
  },
  textMuted: {
    color: '#94a3b8',
  },
});
