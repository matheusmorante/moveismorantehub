import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import type { DeliveryRouteDateScope, DeliveryRouteItem } from '../../hooks/useDeliveryRoute';
import { ScheduleCard } from './ScheduleCard';
import { supabase } from '../../../../services/supabaseClient';
import type { AssemblyHandlingOption } from '../../../../utils/aiSummaryHelper';
import { getOperationalScheduleDate } from '../../../../utils/operationalSchedule';
import { getDeliveryTimelineMarker } from './deliveryTimelineMarker';

interface Props {
  items: DeliveryRouteItem[];
  refreshing: boolean;
  onRefresh: () => void;
  onViewOrder: (item: DeliveryRouteItem) => void;
  handlingOptions?: AssemblyHandlingOption[];
  dateScope?: DeliveryRouteDateScope;
  onChangeDateScope?: (scope: DeliveryRouteDateScope) => void;
  isDarkMode?: boolean;
}

const getStartTimeMinutes = (item: DeliveryRouteItem) => {
  const value = String(item.windowStart || item.periodLabel || '').toLocaleLowerCase('pt-BR');
  const match = value.match(/(\d{1,2}):(\d{2})/);
  if (match) return Number(match[1]) * 60 + Number(match[2]);
  if (value.includes('manhã') || value.includes('manha')) return 8 * 60;
  if (value.includes('tarde')) return 13 * 60;
  if (value.includes('noite')) return 18 * 60;
  return Number.POSITIVE_INFINITY;
};

const compareChronologically = (a: DeliveryRouteItem, b: DeliveryRouteItem) => {
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

const matchesPeriod = (item: DeliveryRouteItem, period: 'morning' | 'afternoon') => {
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
  refreshing,
  onRefresh,
  onViewOrder,
  handlingOptions: sharedHandlingOptions,
  dateScope = 'today',
  isDarkMode = false,
}) => {
  const [periodFilter, setPeriodFilter] = useState<'all' | 'morning' | 'afternoon'>('all');
  const [loadedHandlingOptions, setLoadedHandlingOptions] = useState<AssemblyHandlingOption[]>([]);

  const shiftCounts = useMemo(
    () => ({
      morning: items.filter((item) => matchesPeriod(item, 'morning')).length,
      afternoon: items.filter((item) => matchesPeriod(item, 'afternoon')).length,
    }),
    [items]
  );

  // Usa as mesmas modalidades configuradas no ERP para identificar os selos.
  useEffect(() => {
    if (sharedHandlingOptions !== undefined) return;
    let active = true;

    supabase
      .from('settings')
      .select('*')
      .limit(1)
      .then(({ data }) => {
        if (!active) return;
        const settings = data?.[0]?.data || data?.[0] || {};
        setLoadedHandlingOptions([
          ...(settings.deliveryHandlingOptions || []),
          ...(settings.pickupHandlingOptions || []),
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
      periodFilter === 'all' ? [...items] : items.filter((item) => matchesPeriod(item, periodFilter));
    return periodItems.sort(compareChronologically);
  }, [items, periodFilter]);

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

        <View style={styles.listControlsRow}>
          <Text style={[styles.resultCount, isDarkMode && styles.textMuted]}>
            Exibindo {filteredItems.length}{' '}
            {filteredItems.length === 1 ? 'entrega' : 'entregas'}
          </Text>
        </View>
        <Text style={[styles.timelineHint, isDarkMode && styles.textMuted]}>
          Cada ponto indica a etapa ou situação atual; a lista não representa a rota.
        </Text>

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
            const marker = getDeliveryTimelineMarker(item, isDarkMode);

            return (
              <View key={item.id} style={styles.timelineItemWrapper}>
                {/* Linha e Ponto da Timeline */}
                <View style={styles.timelineSidebar}>
                  <View
                    style={[styles.timelineNode, { backgroundColor: marker.color }]}
                  />
                  {index < filteredItems.length - 1 && <View style={styles.timelineLine} />}
                </View>

                {/* Card de Entrega */}
                <View style={styles.timelineContent}>
                  <ScheduleCard
                    item={item}
                    onViewOrder={onViewOrder}
                    handlingOptions={handlingOptions}
                    isDarkMode={isDarkMode}
                  />
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
    justifyContent: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingBottom: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  periodFilterRowDark: { borderBottomColor: '#334155' },
  periodPill: {
    paddingHorizontal: 12,
    minHeight: 36,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
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
  listControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginHorizontal: 10,
    marginBottom: 2,
  },
  resultCount: { color: '#475569', fontSize: 10, fontWeight: '700', flexShrink: 1 },
  timelineHint: { color: '#64748b', fontSize: 9, marginHorizontal: 10, marginBottom: 6 },
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
