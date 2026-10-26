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
  initialSubTab?: 'all' | 'internal' | 'outside';
  onSelectOrder?: (order: any) => void;
  dateScope?: 'today' | 'next_days';
  handlingOptions?: AssemblyHandlingOption[];
}

type AssemblyLocationFilter = 'all' | 'internal' | 'outside';

const LOCATION_FILTER_TONES: Record<
  AssemblyLocationFilter,
  {
    background: string;
    backgroundDark: string;
    border: string;
    borderDark: string;
    text: string;
    textDark: string;
    active: string;
    activeDark: string;
  }
> = {
  all: {
    background: '#eff6ff',
    backgroundDark: '#172554',
    border: '#bfdbfe',
    borderDark: '#1e40af',
    text: '#1d4ed8',
    textDark: '#bfdbfe',
    active: '#2563eb',
    activeDark: '#1d4ed8',
  },
  internal: {
    background: '#fffbeb',
    backgroundDark: '#451a03',
    border: '#fde68a',
    borderDark: '#92400e',
    text: '#b45309',
    textDark: '#fcd34d',
    active: '#f59e0b',
    activeDark: '#b45309',
  },
  outside: {
    background: '#fef2f2',
    backgroundDark: '#450a0a',
    border: '#fecaca',
    borderDark: '#991b1b',
    text: '#b91c1c',
    textDark: '#fca5a5',
    active: '#dc2626',
    activeDark: '#b91c1c',
  },
};

const formatUpcomingDate = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });
  const title = weekday.charAt(0).toLocaleUpperCase('pt-BR') + weekday.slice(1);
  return `${title}, ${day}/${String(month).padStart(2, '0')}`;
};

const getScheduledTimeKey = (value?: string) => {
  const normalized = String(value || '').toLocaleLowerCase('pt-BR');
  const match = normalized.match(/(\d{1,2}):(\d{2})/);
  if (match) return `${match[1].padStart(2, '0')}:${match[2]}`;
  if (normalized.includes('manhã') || normalized.includes('manha')) return '08:00';
  if (normalized.includes('tarde') || normalized.includes('noite')) return '13:00';
  return '99:99';
};

const webStickyHeaderStyle =
  Platform.OS === 'web' ? ({ position: 'sticky', top: 0, zIndex: 10 } as any) : undefined;

export const NativeAssembliesScreen: React.FC<Props> = ({
  isDarkMode,
  initialSubTab = 'all',
  onSelectOrder,
  dateScope,
  handlingOptions: sharedHandlingOptions,
}) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadedHandlingOptions, setLoadedHandlingOptions] = useState<AssemblyHandlingOption[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [locationFilter, setLocationFilter] = useState<AssemblyLocationFilter>(initialSubTab);
  const hasExternalHandlingOptions = sharedHandlingOptions !== undefined;

  useEffect(() => setLocationFilter(initialSubTab), [initialSubTab]);

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
  const periodTasks = useMemo(
    () =>
      allTasks
        .filter((task) =>
          dateScope === 'today'
            ? task.dateKey === todayKey
            : dateScope === 'next_days'
              ? task.dateKey > todayKey
              : true
        )
        .sort(
          (a, b) =>
            a.dateKey.localeCompare(b.dateKey) ||
            getScheduledTimeKey(a.scheduledTime).localeCompare(
              getScheduledTimeKey(b.scheduledTime)
            )
        ),
    [allTasks, dateScope, todayKey]
  );
  const locationCounts = {
    all: periodTasks.length,
    internal: periodTasks.filter((task) => !task.isOutside).length,
    outside: periodTasks.filter((task) => task.isOutside).length,
  };
  const tasks = periodTasks.filter(
    (task) =>
      locationFilter === 'all' ||
      (locationFilter === 'internal' ? !task.isOutside : task.isOutside)
  );
  const todayTasks = tasks.filter((task) => task.dateKey === todayKey);
  const upcomingTasks = tasks.filter((task) => task.dateKey > todayKey);
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
      ? [{ key: 'today', title: 'Hoje', data: todayTasks }]
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
  const emptyMessage =
    periodTasks.length > 0
      ? 'Nenhuma montagem para este local no período.'
      : dateScope === 'today'
        ? 'Nenhuma montagem agendada para hoje.'
        : dateScope === 'next_days'
          ? 'Nenhuma montagem agendada para os próximos dias.'
          : 'Nenhuma montagem para hoje ou próximos dias.';
  const filterSummary =
    locationFilter === 'all'
      ? 'Exibindo todas as montagens'
      : locationFilter === 'internal'
        ? 'Exibindo montagens no depósito'
        : 'Exibindo montagens fora';
  const locationFilterOptions: {
    key: AssemblyLocationFilter;
    label: string;
    count: number;
  }[] = [
    { key: 'all', label: 'Todas', count: locationCounts.all },
    { key: 'internal', label: 'No depósito', count: locationCounts.internal },
    { key: 'outside', label: 'Fora', count: locationCounts.outside },
  ];

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={[styles.emptyText, isDarkMode && styles.textDark]}>
            Carregando montagens...
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <View style={styles.locationFilters}>
                {locationFilterOptions.map((option) => {
                  const isSelected = locationFilter === option.key;
                  const tone = LOCATION_FILTER_TONES[option.key];
                  const textColor = isSelected
                    ? '#ffffff'
                    : isDarkMode
                      ? tone.textDark
                      : tone.text;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.locationFilter,
                        {
                          backgroundColor: isSelected
                            ? isDarkMode
                              ? tone.activeDark
                              : tone.active
                            : isDarkMode
                              ? tone.backgroundDark
                              : tone.background,
                          borderColor: isSelected
                            ? isDarkMode
                              ? tone.activeDark
                              : tone.active
                            : isDarkMode
                              ? tone.borderDark
                              : tone.border,
                        },
                      ]}
                      onPress={() => setLocationFilter(option.key)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.locationFilterText,
                          { color: textColor },
                        ]}
                      >
                        {option.label}
                      </Text>
                      <Text
                        style={[
                          styles.locationFilterCount,
                          { color: textColor },
                        ]}
                      >
                        {option.count}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[styles.filterSummary, isDarkMode && styles.filterSummaryDark]}>
                {filterSummary}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.emptyText, isDarkMode && styles.textDark]}>{emptyMessage}</Text>
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
                accessibilityRole="button"
                accessibilityState={{ expanded: !isCollapsed }}
              >
                <View style={styles.sectionHeaderLeft}>
                  <CalendarIcon size={16} color="#2563eb" />
                  <Text style={[styles.sectionHeaderText, isDarkMode && styles.textDark]}>
                    {section.title}
                  </Text>
                </View>
                <View style={styles.sectionHeaderRight}>
                  <Text style={[styles.sectionHeaderCount, isDarkMode && styles.sectionHeaderCountDark]}>
                    {section.count} {section.count === 1 ? 'montagem' : 'montagens'}
                  </Text>
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
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  listHeader: { paddingTop: 4, paddingBottom: 8 },
  locationFilters: { flexDirection: 'row', gap: 6 },
  locationFilter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  locationFilterText: { fontSize: 11, fontWeight: '700' },
  locationFilterCount: { fontSize: 11, fontWeight: '800' },
  filterSummary: { color: '#64748b', fontSize: 11, marginTop: 6 },
  filterSummaryDark: { color: '#94a3b8' },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    alignSelf: 'center',
    minHeight: 44,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  sectionHeaderDark: { backgroundColor: '#0f172a', borderBottomColor: '#334155' },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  sectionHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionHeaderText: { fontSize: 13, fontWeight: '800', color: '#334155' },
  sectionHeaderCount: { color: '#64748b', fontSize: 11, fontWeight: '700' },
  sectionHeaderCountDark: { color: '#94a3b8' },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 10,
  },
  textDark: { color: '#f8fafc' },
});
