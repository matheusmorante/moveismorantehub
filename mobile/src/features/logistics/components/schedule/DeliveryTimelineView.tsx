import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import type { DeliveryRouteDateScope, DeliveryRouteItem } from '../../hooks/useDeliveryRoute';
import { ScheduleCard } from './ScheduleCard';
import { supabase } from '../../../../services/supabaseClient';
import type { AssemblyHandlingOption } from '../../../../utils/aiSummaryHelper';
import { getOperationalScheduleDate } from '../../../../utils/operationalSchedule';
import { getDeliveryTimelineMarker } from './deliveryTimelineMarker';
import type { AssemblyTask } from '../../../assemblies/assemblyTasks';
import { AssemblyOrderCard } from '../../../assemblies/components/AssemblyOrderCard';

interface Props {
  items: DeliveryRouteItem[];
  assemblyTasks?: AssemblyTask[];
  refreshing: boolean;
  onRefresh: () => void;
  onViewOrder: (item: DeliveryRouteItem) => void;
  onViewAssembly?: (order: any) => void;
  handlingOptions?: AssemblyHandlingOption[];
  dateScope?: DeliveryRouteDateScope;
  onChangeDateScope?: (scope: DeliveryRouteDateScope) => void;
  isDarkMode?: boolean;
}

type TimelineItem = {
  id: string;
  order: any;
  customerName: string;
  windowStart?: string;
  periodLabel: string;
  delivery?: DeliveryRouteItem;
  assembly?: AssemblyTask;
};

const getStartTimeMinutes = (item: TimelineItem) => {
  const value = String(item.windowStart || item.periodLabel || '').toLocaleLowerCase('pt-BR');
  const match = value.match(/(\d{1,2}):(\d{2})/);
  if (match) return Number(match[1]) * 60 + Number(match[2]);
  if (value.includes('manhã') || value.includes('manha')) return 8 * 60;
  if (value.includes('tarde')) return 13 * 60;
  if (value.includes('noite')) return 18 * 60;
  return Number.POSITIVE_INFINITY;
};

const compareChronologically = (a: TimelineItem, b: TimelineItem) => {
  const dateDiff = getOperationalScheduleDate(a.order).localeCompare(
    getOperationalScheduleDate(b.order)
  );
  if (dateDiff) return dateDiff;

  const timeA = getStartTimeMinutes(a);
  const timeB = getStartTimeMinutes(b);
  if (timeA !== timeB) {
    if (!Number.isFinite(timeA)) return 1;
    if (!Number.isFinite(timeB)) return -1;
    return timeA - timeB;
  }
  return a.customerName.localeCompare(b.customerName, 'pt-BR');
};

const matchesPeriod = (item: TimelineItem, period: 'morning' | 'afternoon') => {
  const value = String(item.windowStart || item.periodLabel || '').toLocaleLowerCase('pt-BR');
  const startMinutes = getStartTimeMinutes(item);
  if (Number.isFinite(startMinutes)) {
    return period === 'morning'
      ? startMinutes < 12 * 60
      : startMinutes >= 12 * 60 && startMinutes <= 18 * 60;
  }
  return period === 'morning'
    ? value.includes('manhã') || value.includes('manha')
    : value.includes('tarde');
};

export const DeliveryTimelineView: React.FC<Props> = ({
  items,
  assemblyTasks = [],
  refreshing,
  onRefresh,
  onViewOrder,
  onViewAssembly,
  handlingOptions: sharedHandlingOptions,
  dateScope = 'today',
  isDarkMode = false,
}) => {
  const [periodFilter, setPeriodFilter] = useState<'all' | 'morning' | 'afternoon'>('all');
  const [loadedHandlingOptions, setLoadedHandlingOptions] = useState<AssemblyHandlingOption[]>([]);

  const timelineItems = useMemo<TimelineItem[]>(() => [
    ...items.map((item) => ({ ...item, delivery: item })),
    ...assemblyTasks.map((task) => ({
      id: `assembly-${task.id}`,
      order: task.order,
      customerName: String(task.order?.order_data?.customerData?.fullName || task.order?.customer_name || ''),
      periodLabel: task.scheduledTime || '',
      assembly: task,
    })),
  ], [items, assemblyTasks]);

  const shiftCounts = useMemo(
    () => ({
      morning: timelineItems.filter((item) => matchesPeriod(item, 'morning')).length,
      afternoon: timelineItems.filter((item) => matchesPeriod(item, 'afternoon')).length,
    }),
    [timelineItems]
  );

  // Usa as mesmas modalidades configuradas no ERP para identificar os selos.
  useEffect(() => {
    if (sharedHandlingOptions !== undefined) return;
    let active = true;

    supabase
      .from('settings')
      .select('delivery:data->deliveryHandlingOptions,pickup:data->pickupHandlingOptions')
      .limit(1)
      .then(({ data }) => {
        if (!active) return;
        const settings = (data?.[0] || {}) as { delivery?: AssemblyHandlingOption[]; pickup?: AssemblyHandlingOption[] };
        setLoadedHandlingOptions([
          ...(settings.delivery || []),
          ...(settings.pickup || []),
        ]);
      });

    return () => {
      active = false;
    };
  }, [sharedHandlingOptions]);

  const handlingOptions = sharedHandlingOptions ?? loadedHandlingOptions;

  // Filtro por Período (Todas, Manhã, Tarde)
  const filteredItems = useMemo(() => {
    const periodItems =
      periodFilter === 'all' ? [...timelineItems] : timelineItems.filter((item) => matchesPeriod(item, periodFilter));
    return periodItems.sort(compareChronologically);
  }, [timelineItems, periodFilter]);

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />
        }
      >
        {/* Filtro de turno: permanece junto aos cards da timeline. */}
        <View style={[styles.periodFilterRow, isDarkMode && styles.periodFilterRowDark]}>
          <TouchableOpacity
            style={[
              styles.periodPill,
              isDarkMode && styles.periodPillDark,
              periodFilter === 'all' && styles.periodPillActive,
            ]}
            onPress={() => setPeriodFilter('all')}
            accessibilityRole="button"
            accessibilityState={{ selected: periodFilter === 'all' }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.periodPillText,
                isDarkMode && styles.periodPillTextDark,
                periodFilter === 'all' && styles.periodPillTextActive,
              ]}
            >
              Todas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.periodPill,
              isDarkMode && styles.periodPillDark,
              periodFilter === 'morning' && styles.periodPillActive,
            ]}
            onPress={() => setPeriodFilter('morning')}
            accessibilityRole="button"
            accessibilityState={{ selected: periodFilter === 'morning' }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.periodPillText,
                isDarkMode && styles.periodPillTextDark,
                periodFilter === 'morning' && styles.periodPillTextActive,
              ]}
            >
              Manhã ({shiftCounts.morning})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.periodPill,
              isDarkMode && styles.periodPillDark,
              periodFilter === 'afternoon' && styles.periodPillActive,
            ]}
            onPress={() => setPeriodFilter('afternoon')}
            accessibilityRole="button"
            accessibilityState={{ selected: periodFilter === 'afternoon' }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.periodPillText,
                isDarkMode && styles.periodPillTextDark,
                periodFilter === 'afternoon' && styles.periodPillTextActive,
              ]}
            >
              Tarde ({shiftCounts.afternoon})
            </Text>
          </TouchableOpacity>
        </View>

        {filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, isDarkMode && styles.textMuted]}>
              Nenhuma atividade agendada para{' '}
              {dateScope === 'today'
                ? 'hoje'
                : dateScope === 'tomorrow'
                  ? 'amanhã'
                  : 'os próximos dias'}.
            </Text>
          </View>
        ) : (
          filteredItems.map((item, index) => {
            const marker = item.assembly
              ? { color: item.assembly.isOutside ? '#dc2626' : '#d97706' }
              : getDeliveryTimelineMarker(item.delivery!, isDarkMode);

            return (
              <View key={item.id} style={styles.timelineItemWrapper}>
                {/* Linha e Ponto da Timeline */}
                <View style={styles.timelineSidebar}>
                  <View
                    style={[styles.timelineNode, { backgroundColor: marker.color }]}
                  />
                  {index < filteredItems.length - 1 && <View style={styles.timelineLine} />}
                </View>

                {/* Cartão da atividade */}
                <View style={styles.timelineContent}>
                  {item.assembly ? (
                    <AssemblyOrderCard
                      order={item.assembly.order}
                      item={item.assembly.item}
                      isOutside={item.assembly.isOutside}
                      scheduledTime={item.assembly.scheduledTime}
                      responsibleName={item.assembly.responsibleName}
                      isDarkMode={isDarkMode}
                      onPress={() => onViewAssembly?.(item.assembly!.order)}
                    />
                  ) : (
                    <ScheduleCard
                      item={item.delivery!}
                      onViewOrder={onViewOrder}
                      handlingOptions={handlingOptions}
                      isDarkMode={isDarkMode}
                    />
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  periodFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 3,
    padding: 4,
    marginBottom: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
  },
  periodFilterRowDark: { backgroundColor: '#020617', borderColor: '#334155' },
  periodPill: {
    flex: 1,
    minWidth: 0,
    minHeight: 34,
    paddingHorizontal: 2,
    borderRadius: 11,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodPillActive: {
    backgroundColor: '#2563eb',
  },
  periodPillDark: { backgroundColor: '#1e293b' },
  periodPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
  },
  periodPillTextDark: { color: '#cbd5e1' },
  periodPillTextActive: {
    color: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingTop: 0,
    paddingBottom: 16,
  },
  timelineItemWrapper: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  timelineSidebar: {
    width: 16,
    alignItems: 'center',
    paddingTop: 15,
  },
  timelineNode: {
    width: 8,
    height: 8,
    borderRadius: 4,
    zIndex: 2,
  },
  timelineLine: {
    flex: 1,
    width: 1,
    backgroundColor: '#cbd5e1',
    marginTop: 6,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 4,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  textMuted: {
    color: '#94a3b8',
  },
});
