import { excludeTestOrders } from '../../../../../shared-utils/testArtifactQueries';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar as CalendarIcon, ChevronDown, ChevronRight } from 'lucide-react-native';
import { MobileDrill } from '../../../components/shared/MobileDrill';
import { supabase } from '../../../services/supabaseClient';
import { offlineStorageService } from '../../../services/offline/offlineStorageService';
import { OrderRepository } from '../../../repositories/OrderRepository';
import { subscribeToLogisticsChanges } from '../../../services/logisticsRealtimeService';
import type { AssemblyHandlingOption } from '../../../utils/aiSummaryHelper';
import { getLocalDateString } from '../../../utils/orderUtils';
import type { AssemblyTask } from '../assemblyTasks';
import { AssemblyOrderCard } from '../components/AssemblyOrderCard';
import { getAssemblyTasks } from '../assemblyTasks';

const ASSEMBLIES_CACHE_KEY = 'assemblies_orders';
const HANDLING_OPTIONS_CACHE_KEY = 'order_handling_options_v1';

interface Props {
  isDarkMode: boolean;
  initialSubTab?: 'internal' | 'outside';
  onSelectOrder?: (order: any) => void;
  dateScope?: 'today' | 'next_days';
  handlingOptions?: AssemblyHandlingOption[];
}

const formatUpcomingDate = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' }).toLocaleUpperCase('pt-BR');
  return `${weekday} · ${day}/${String(month).padStart(2, '0')}`;
};

const webStickyHeaderStyle =
  Platform.OS === 'web' ? ({ position: 'sticky', top: 0, zIndex: 10 } as any) : undefined;

export const NativeAssembliesScreen: React.FC<Props> = ({
  isDarkMode,
  onSelectOrder,
  dateScope,
  handlingOptions: sharedHandlingOptions,
}) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadedHandlingOptions, setLoadedHandlingOptions] = useState<AssemblyHandlingOption[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const hasExternalHandlingOptions = sharedHandlingOptions !== undefined;

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('settings').select('*').limit(1);
      if (!error && data?.length) {
        const settings = data[0]?.data || data[0];
        const opts = [
          ...(settings.deliveryHandlingOptions || []),
          ...(settings.pickupHandlingOptions || []),
        ];
        setLoadedHandlingOptions(opts);
        await offlineStorageService
          .cacheWorkingSet(HANDLING_OPTIONS_CACHE_KEY, opts)
          .catch(() => {});
        return;
      }
    } catch {}

    try {
      const cached =
        await offlineStorageService.getWorkingSet<any[]>(HANDLING_OPTIONS_CACHE_KEY);
      if (Array.isArray(cached?.data)) {
        setLoadedHandlingOptions(cached.data);
      }
    } catch {}
  };

  const loadOfflineAssembliesFallback = async () => {
    try {
      const [assembliesCached, logisticsCached, repoOrders] = await Promise.all([
        offlineStorageService.getWorkingSet<any[]>(ASSEMBLIES_CACHE_KEY).catch(() => null),
        offlineStorageService.getWorkingSet<any[]>('logistics_orders').catch(() => null),
        OrderRepository.list().catch(() => []),
      ]);

      const byId = new Map<string, any>();
      if (Array.isArray(assembliesCached?.data)) {
        for (const o of assembliesCached.data) {
          if (o?.id) byId.set(o.id, o);
        }
      }
      if (Array.isArray(logisticsCached?.data)) {
        for (const o of logisticsCached.data) {
          if (o?.id && !byId.has(o.id)) byId.set(o.id, o);
        }
      }
      for (const local of repoOrders) {
        if (local?.id) {
          const existing = byId.get(local.id);
          if (!existing || local.isPendingLocal) {
            byId.set(local.id, {
              ...existing,
              id: local.id,
              status: local.status,
              created_at: local.updatedAt,
              customer_name: local.customerName,
              order_data: local.orderData,
            });
          }
        }
      }

      const merged = Array.from(byId.values());
      if (merged.length > 0) {
        setOrders(merged);
      }
    } catch {}
  };

  const fetchAssemblies = async () => {
    try {
      setLoading(true);
      const { data, error } = await excludeTestOrders(
        supabase
          .from('orders')
          .select(
            'id, status, created_at, order_data, deleted, scheduled_date, delivery_method, order_number, order_index, customer_name'
          )
      )
        .or('order_data->>deleted.is.null,order_data->>deleted.eq.false')
        .order('created_at', { ascending: false })
        .limit(300);

      if (!error && data) {
        setOrders(data);
        await offlineStorageService.cacheWorkingSet(ASSEMBLIES_CACHE_KEY, data).catch(() => {});
      } else {
        await loadOfflineAssembliesFallback();
      }
    } catch (error) {
      console.warn('[NativeAssemblies] Erro ao buscar montagens, usando cache local:', error);
      await loadOfflineAssembliesFallback();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAssemblies();
    if (!hasExternalHandlingOptions) fetchSettings();
    return subscribeToLogisticsChanges(() => {
      fetchAssemblies();
      if (!hasExternalHandlingOptions) fetchSettings();
    });
  }, [hasExternalHandlingOptions]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAssemblies();
    if (!hasExternalHandlingOptions) fetchSettings();
  };

  const handlingOptions = sharedHandlingOptions ?? loadedHandlingOptions;
  const allTasks = useMemo(
    () => getAssemblyTasks(orders, handlingOptions),
    [orders, handlingOptions]
  );
  const todayKey = getLocalDateString(new Date());
  const tasks = useMemo(
    () =>
      dateScope === 'today'
        ? allTasks.filter((task) => task.dateKey === todayKey)
        : dateScope === 'next_days'
          ? allTasks.filter((task) => task.dateKey > todayKey)
          : allTasks,
    [allTasks, dateScope, todayKey]
  );
  const todayTasks = tasks.filter((task) => task.dateKey === todayKey);
  const upcomingTasks = tasks
    .filter((task) => task.dateKey > todayKey)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  const upcomingSections = Array.from(
    upcomingTasks.reduce((groups, task) => {
      const group = groups.get(task.dateKey) || [];
      group.push(task);
      groups.set(task.dateKey, group);
      return groups;
    }, new Map<string, AssemblyTask[]>()),
    ([dateKey, data]) => ({ key: dateKey, title: formatUpcomingDate(dateKey), data })
  );
  const defaultExpandedSectionKey = dateScope === 'next_days' ? upcomingSections[0]?.key : 'today';
  const sections = [
    ...(todayTasks.length
      ? [{ key: 'today', title: 'HOJE', data: todayTasks }]
      : []),
    ...upcomingSections,
  ].map((section) => {
    const isCollapsed = collapsedSections[section.key] ?? section.key !== defaultExpandedSectionKey;
    return { ...section, count: section.data.length, data: isCollapsed ? [] : section.data };
  });

  const toggleSection = (key: string) => {
    setCollapsedSections((previous) => ({
      ...previous,
      [key]: !(previous[key] ?? key !== defaultExpandedSectionKey),
    }));
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={[styles.emptyText, isDarkMode && styles.textDark]}>
            Carregando montagens...
          </Text>
        </View>
      ) : tasks.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, isDarkMode && styles.textDark]}>
            {dateScope === 'today'
              ? 'Nenhuma montagem agendada para hoje.'
              : dateScope === 'next_days'
                ? 'Nenhuma montagem agendada para os próximos dias.'
                : 'Nenhuma montagem para hoje ou próximos dias.'}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled
          ListHeaderComponent={
            <View style={styles.legend}>
              <View style={[styles.legendBadge, isDarkMode && styles.legendBadgeDark]}>
                <MobileDrill size={13} />
                <Text style={[styles.legendText, isDarkMode && styles.legendTextDark]}>
                  MONTAGEM NO DEPÓSITO
                </Text>
              </View>
              <View style={[styles.legendBadge, isDarkMode && styles.legendBadgeDark]}>
                <MobileDrill size={13} />
                <Text style={[styles.legendText, isDarkMode && styles.legendTextDark]}>
                  MONTAGEM FORA
                </Text>
              </View>
            </View>
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c3aed']} />
          }
          renderSectionHeader={({ section }) => {
            const isCollapsed =
              collapsedSections[section.key] ?? section.key !== defaultExpandedSectionKey;
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => toggleSection(section.key)}
                style={[
                  styles.sectionHeader,
                  webStickyHeaderStyle,
                  isDarkMode && styles.sectionHeaderDark,
                ]}
              >
                <View style={styles.sectionHeaderLeft}>
                  <CalendarIcon size={16} color="#2563eb" />
                  <Text style={[styles.sectionHeaderText, isDarkMode && styles.textDark]}>
                    {section.title}
                  </Text>
                </View>
                <View style={styles.sectionHeaderRight}>
                  <View style={styles.sectionHeaderCount}>
                    <Text style={styles.sectionHeaderCountText}>
                      {section.count} {section.count === 1 ? 'montagem' : 'montagens'}
                    </Text>
                  </View>
                  {isCollapsed ? (
                    <ChevronRight size={18} color="#2563eb" />
                  ) : (
                    <ChevronDown size={18} color="#2563eb" />
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          renderItem={({ item }) => (
            <AssemblyOrderCard
              order={item.order}
              item={item.item}
              isOutside={item.isOutside}
              isDarkMode={isDarkMode}
              scheduledTime={item.scheduledTime}
              responsibleName={item.responsibleName}
              onPress={() => onSelectOrder?.(item.order)}
            />
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  containerDark: { backgroundColor: '#0f172a' },
  listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24, gap: 8 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4, marginBottom: 4 },
  legendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  legendBadgeDark: { backgroundColor: '#334155' },
  legendText: { color: '#475569', fontSize: 10, fontWeight: '800' },
  legendTextDark: { color: '#e2e8f0' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginVertical: 4,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeaderDark: { backgroundColor: '#1e293b' },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  sectionHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionHeaderText: { fontSize: 12, fontWeight: '800', color: '#334155' },
  sectionHeaderCount: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#2563eb',
  },
  sectionHeaderCountText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 10,
  },
  textDark: { color: '#f8fafc' },
});
