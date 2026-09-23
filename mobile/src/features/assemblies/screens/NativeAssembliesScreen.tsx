import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, RefreshControl, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar as CalendarIcon, ChevronDown, ChevronRight } from 'lucide-react-native';
import { MobileDrill } from '../../../components/shared/MobileDrill';
import { supabase } from '../../../services/supabaseClient';
import { subscribeToLogisticsChanges } from '../../../services/logisticsRealtimeService';
import { isAssemblyOutsideType, isAssemblyInternalType } from '../../../utils/aiSummaryHelper';
import { getLocalDateString, isCancelledOrder, parseOrderDateStr } from '../../../utils/orderUtils';
import { AssemblyOrderCard } from '../components/AssemblyOrderCard';

interface Props {
  isDarkMode: boolean;
  initialSubTab?: 'internal' | 'outside';
  onSelectOrder?: (order: any) => void;
}

type AssemblyTask = {
  id: string;
  order: any;
  item: any;
  dateKey: string;
  isOutside: boolean;
};

const normalizeLabel = (value: unknown) => String(value || '').trim().toLocaleLowerCase('pt-BR');

const getScheduleDate = (order: any): string => {
  const data = order.order_data || {};
  const shipping = data.shipping || {};
  const schedule = shipping.scheduling || data.schedule || data.scheduling || order.schedule || {};
  return parseOrderDateStr(schedule.date || schedule.startDate || order.scheduled_date || order.date);
};

const getSchedule = (order: any) => {
  const data = order.order_data || {};
  const shipping = data.shipping || {};
  return shipping.scheduling || data.schedule || data.scheduling || order.schedule || {};
};

const getAssemblyTasks = (orders: any[], handlingOptions: any[]): AssemblyTask[] => {
  const today = getLocalDateString(new Date());

  return orders.flatMap((order) => {
    const data = order.order_data || {};
    const shipping = data.shipping || {};
    const schedule = getSchedule(order);
    const dateKey = getScheduleDate(order);
    const status = String(order.status || data.status || '').toLowerCase();
    const hasPendingSchedule = schedule.pendingScheduling || schedule.notInformed || data.pendingScheduling || order.pending_scheduling;

    if (data.deleted || order.deleted || isCancelledOrder(order) || status === 'draft' || status === 'rascunho') return [];
    if (hasPendingSchedule || !dateKey || dateKey < today) return [];

    const items = Array.isArray(data.items) ? data.items : Array.isArray(order.items) ? order.items : [];
    const orderHandling = String(
      data.handlingType || data.handling || data.deliveryType || shipping.handlingType || shipping.handling || order.handling || order.handlingType || '',
    );

    return items.flatMap((item: any, index: number) => {
      const handling = String(item.handlingType || item.handling || orderHandling);
      const isOutside = isAssemblyOutsideType(handling, handlingOptions);
      const isInternal = isAssemblyInternalType(handling, handlingOptions);
      if (!isOutside && !isInternal) return [];

      return [{
        id: `${order.id || order.orderIndex || 'order'}-${index}-${normalizeLabel(handling)}`,
        order,
        item,
        dateKey,
        isOutside,
      }];
    });
  });
};

const formatUpcomingDate = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' }).toLocaleUpperCase('pt-BR');
  return `AGENDADO PARA ${weekday}, ${day}/${String(month).padStart(2, '0')}`;
};

const webStickyHeaderStyle = Platform.OS === 'web'
  ? ({ position: 'sticky', top: 0, zIndex: 10 } as any)
  : undefined;

export const NativeAssembliesScreen: React.FC<Props> = ({ isDarkMode, onSelectOrder }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [handlingOptions, setHandlingOptions] = useState<any[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const fetchSettings = async () => {
    try {
      const { data } = await supabase.from('settings').select('*').limit(1);
      if (data?.length) {
        const settings = data[0]?.data || data[0];
        setHandlingOptions([
          ...(settings.deliveryHandlingOptions || []),
          ...(settings.pickupHandlingOptions || []),
        ]);
      }
    } catch {}
  };

  const fetchAssemblies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('id, status, created_at, order_data')
        .or('order_data->>deleted.is.null,order_data->>deleted.eq.false')
        .order('created_at', { ascending: false })
        .limit(300);

      if (!error && data) setOrders(data);
    } catch (error) {
      console.warn('[NativeAssemblies] Erro ao buscar montagens:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAssemblies();
    fetchSettings();
    return subscribeToLogisticsChanges(() => {
      fetchAssemblies();
      fetchSettings();
    });
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAssemblies();
    fetchSettings();
  };

  const tasks = useMemo(() => getAssemblyTasks(orders, handlingOptions), [orders, handlingOptions]);
  const todayKey = getLocalDateString(new Date());
  const todayTasks = tasks.filter((task) => task.dateKey === todayKey);
  const upcomingTasks = tasks.filter((task) => task.dateKey > todayKey).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  const upcomingSections = Array.from(
    upcomingTasks.reduce((groups, task) => {
      const group = groups.get(task.dateKey) || [];
      group.push(task);
      groups.set(task.dateKey, group);
      return groups;
    }, new Map<string, AssemblyTask[]>()),
    ([dateKey, data]) => ({ key: dateKey, title: formatUpcomingDate(dateKey), data }),
  );
  const sections = [
    ...(todayTasks.length ? [{ key: 'today', title: `PARA HOJE · ${todayTasks.length}`, data: todayTasks }] : []),
    ...upcomingSections,
  ].map((section) => {
    const isCollapsed = collapsedSections[section.key] ?? section.key !== 'today';
    return { ...section, count: section.data.length, data: isCollapsed ? [] : section.data };
  });

  const toggleSection = (key: string) => {
    setCollapsedSections((previous) => ({
      ...previous,
      [key]: !(previous[key] ?? key !== 'today'),
    }));
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={[styles.emptyText, isDarkMode && styles.textDark]}>Carregando montagens...</Text>
        </View>
      ) : tasks.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, isDarkMode && styles.textDark]}>Nenhuma montagem para hoje ou próximos dias.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled
          ListHeaderComponent={(
            <View style={styles.legend}>
              <View style={[styles.legendBadge, styles.legendInternal]}>
                <MobileDrill size={13} />
                <Text style={styles.legendText}>MONTAGEM NO DEPÓSITO</Text>
              </View>
              <View style={[styles.legendBadge, styles.legendOutside]}>
                <MobileDrill size={13} />
                <Text style={styles.legendText}>MONTAGEM FORA</Text>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c3aed']} />}
          renderSectionHeader={({ section }) => {
            const isCollapsed = collapsedSections[section.key] ?? section.key !== 'today';
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => toggleSection(section.key)}
                style={[styles.sectionHeader, webStickyHeaderStyle, isDarkMode && styles.sectionHeaderDark]}
              >
                <View style={styles.sectionHeaderLeft}>
                  <CalendarIcon size={16} color="#2563eb" />
                  <Text style={[styles.sectionHeaderText, isDarkMode && styles.textDark]}>{section.title}</Text>
                </View>
                <View style={styles.sectionHeaderRight}>
                  <View style={styles.sectionHeaderCount}>
                    <Text style={styles.sectionHeaderCountText}>{section.count} {section.count === 1 ? 'montagem' : 'montagens'}</Text>
                  </View>
                  {isCollapsed ? <ChevronRight size={18} color="#2563eb" /> : <ChevronDown size={18} color="#2563eb" />}
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
  legendBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  legendInternal: { backgroundColor: '#f59e0b' },
  legendOutside: { backgroundColor: '#ef4444' },
  legendText: { color: '#fff', fontSize: 10, fontWeight: '900' },
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
  sectionHeaderCount: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, backgroundColor: '#2563eb' },
  sectionHeaderCountText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  emptyText: { color: '#64748b', fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 10 },
  textDark: { color: '#f8fafc' },
});
