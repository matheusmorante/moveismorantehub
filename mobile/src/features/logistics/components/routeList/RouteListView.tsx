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
}

export const RouteListView: React.FC<Props> = ({
  items,
  refreshing,
  onRefresh,
  onSelect,
  onStartDelivery,
  onViewOrder,
  isDarkMode = false,
}) => {
  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIconCircle, isDarkMode && styles.emptyIconCircleDark]}>
          <PackageCheck size={36} color="#2563eb" />
        </View>
        <Text style={[styles.emptyTitle, isDarkMode && styles.textLight]}>
          Nenhuma entrega para hoje
        </Text>
        <Text style={[styles.emptySubtitle, isDarkMode && styles.textMuted]}>
          Não existem pedidos com entrega agendada para a data de hoje no cronograma.
        </Text>
      </View>
    );
  }

  // Agrupa por slot de horário/período
  const groups = React.useMemo(() => {
    const list: { key: string; title: string; subtitle?: string; isFixed: boolean; items: DeliveryRouteItem[] }[] = [];
    const map = new Map<string, { key: string; title: string; subtitle?: string; isFixed: boolean; items: DeliveryRouteItem[] }>();

    for (const item of items) {
      const slot = item.scheduleSlot;
      const key = `${slot.type}_${slot.timeSortKey}_${slot.label}`;
      if (!map.has(key)) {
        const entry = {
          key,
          title: slot.label,
          subtitle: slot.sublabel,
          isFixed: slot.isFixedTime,
          items: [],
        };
        map.set(key, entry);
        list.push(entry);
      }
      map.get(key)!.items.push(item);
    }
    return list;
  }, [items]);

  return (
    <FlatList
      data={groups}
      keyExtractor={(grp) => grp.key}
      renderItem={({ item: grp }) => (
        <View style={styles.sectionContainer}>
          {/* Cabeçalho da Seção de Horário */}
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionPill, grp.isFixed && styles.sectionPillFixed]}>
              <Text style={[styles.sectionTitle, grp.isFixed && styles.sectionTitleFixed]}>
                {grp.title} {grp.subtitle ? `· ${grp.subtitle}` : ''}
              </Text>
            </View>
            <Text style={[styles.sectionCountText, isDarkMode && styles.textMuted]}>
              {grp.items.length} {grp.items.length === 1 ? 'entrega' : 'entregas'}
            </Text>
          </View>

          {/* Cards de Entregas do Período */}
          {grp.items.map((routeItem) => (
            <RouteListItem
              key={routeItem.id}
              item={routeItem}
              onSelect={onSelect}
              onStartDelivery={onStartDelivery}
              onViewOrder={onViewOrder}
              isDarkMode={isDarkMode}
            />
          ))}
        </View>
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
    paddingTop: 12,
    paddingBottom: 40,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionPill: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
  },
  sectionPillFixed: {
    backgroundColor: '#faf5ff',
    borderLeftColor: '#7c3aed',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#1e40af',
    letterSpacing: 0.5,
  },
  sectionTitleFixed: {
    color: '#6b21a8',
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
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
