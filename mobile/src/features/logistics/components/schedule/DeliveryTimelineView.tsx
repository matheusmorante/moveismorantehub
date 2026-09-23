import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { DeliveryRouteItem } from '../../hooks/useDeliveryRoute';
import { DeliveryRouteDateScope } from '../../hooks/useDeliveryRoute';
import { ScheduleCard } from './ScheduleCard';
import { analyzeOrderServiceHandlings } from '../../utils/scheduleServiceEstimator';
import { supabase } from '../../../../services/supabaseClient';

interface Props {
  items: DeliveryRouteItem[];
  refreshing: boolean;
  onRefresh: () => void;
  onStartDelivery: (item: DeliveryRouteItem) => void;
  onViewOrder: (item: DeliveryRouteItem) => void;
  dateScope?: DeliveryRouteDateScope;
  onChangeDateScope?: (scope: DeliveryRouteDateScope) => void;
  isDarkMode?: boolean;
}

const matchesPeriod = (item: DeliveryRouteItem, period: 'morning' | 'afternoon') => {
  const label = item.periodLabel.toLowerCase();
  return period === 'morning'
    ? label.includes('manhã') || label.includes('08:') || label.includes('09:') || label.includes('10:') || label.includes('11:')
    : label.includes('tarde') || label.includes('13:') || label.includes('14:') || label.includes('15:') || label.includes('16:') || label.includes('17:') || label.includes('18:');
};

export const DeliveryTimelineView: React.FC<Props> = ({
  items,
  refreshing,
  onRefresh,
  onStartDelivery,
  onViewOrder,
  dateScope = 'today',
  isDarkMode = false,
}) => {
  const [periodFilter, setPeriodFilter] = useState<'all' | 'morning' | 'afternoon'>('all');
  const [handlingOptions, setHandlingOptions] = useState<any[]>([]);

  const shiftCounts = useMemo(() => ({
    morning: items.filter((item) => matchesPeriod(item, 'morning')).length,
    afternoon: items.filter((item) => matchesPeriod(item, 'afternoon')).length,
  }), [items]);

  // Usa as mesmas modalidades configuradas no ERP para identificar os selos.
  useEffect(() => {
    let active = true;

    supabase.from('settings').select('*').limit(1).then(({ data }) => {
      if (!active) return;
      const settings = data?.[0]?.data || data?.[0] || {};
      setHandlingOptions([
        ...(settings.deliveryHandlingOptions || []),
        ...(settings.pickupHandlingOptions || []),
      ]);
    });

    return () => {
      active = false;
    };
  }, []);

  // Filtro por Período (Todas, Manhã, Tarde)
  const filteredItems = useMemo(() => {
    if (periodFilter === 'all') return items;
    return items.filter((item) => matchesPeriod(item, periodFilter));
  }, [items, periodFilter]);

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
      >
        {/* Filtro local do Cronograma: rola junto com os cards da timeline. */}
        <View style={[styles.periodFilterRow, isDarkMode && styles.periodFilterRowDark]}>
          <TouchableOpacity
            style={[styles.periodPill, isDarkMode && styles.periodPillDark, periodFilter === 'all' && styles.periodPillActive]}
            onPress={() => setPeriodFilter('all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.periodPillText, isDarkMode && styles.periodPillTextDark, periodFilter === 'all' && styles.periodPillTextActive]}>
              Todas ({items.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodPill, isDarkMode && styles.periodPillDark, periodFilter === 'morning' && styles.periodPillActive]}
            onPress={() => setPeriodFilter('morning')}
            activeOpacity={0.8}
          >
            <Text style={[styles.periodPillText, isDarkMode && styles.periodPillTextDark, periodFilter === 'morning' && styles.periodPillTextActive]}>
              Manhã ({shiftCounts.morning})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodPill, isDarkMode && styles.periodPillDark, periodFilter === 'afternoon' && styles.periodPillActive]}
            onPress={() => setPeriodFilter('afternoon')}
            activeOpacity={0.8}
          >
            <Text style={[styles.periodPillText, isDarkMode && styles.periodPillTextDark, periodFilter === 'afternoon' && styles.periodPillTextActive]}>
              Tarde ({shiftCounts.afternoon})
            </Text>
          </TouchableOpacity>
        </View>

        {filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, isDarkMode && styles.textMuted]}>
              Nenhuma atividade agendada para {dateScope === 'today' ? 'hoje' : 'os próximos dias'}.
            </Text>
          </View>
        ) : (
          filteredItems.map((item, index) => {
            const nextItem = filteredItems[index + 1];
            const travelMinutes = nextItem?.durationMin || 15;
            const travelKm = nextItem?.distanceKm || 8;

            // Análise de risco de atraso para o próximo compromisso fixo
            const currentService = analyzeOrderServiceHandlings(item.order?.order_data?.items || item.order?.items || []);
            const hasDelayRisk = Boolean(
              nextItem?.isFixedTime && currentService.estimatedMinutes > 90
            );

            return (
              <View key={item.id} style={styles.timelineItemWrapper}>
                {/* Linha e Ponto da Timeline */}
                <View style={styles.timelineSidebar}>
                  <View
                    style={[
                      styles.timelineNode,
                      item.isFixedTime ? styles.timelineNodeFixed : styles.timelineNodeNormal,
                    ]}
                  />
                  {index < filteredItems.length - 1 && <View style={styles.timelineLine} />}
                </View>

                {/* Card de Entrega */}
                <View style={styles.timelineContent}>
                  <ScheduleCard
                    item={item}
                    onStartDelivery={onStartDelivery}
                    onViewOrder={onViewOrder}
                    handlingOptions={handlingOptions}
                    isDarkMode={isDarkMode}
                  />

                  {/* Alerta de Risco de Atraso no Próximo Horário Fixo (se houver) */}
                  {index < filteredItems.length - 1 && hasDelayRisk && (
                    <View style={styles.transitConnector}>
                      <View style={styles.delayRiskBadge}>
                        <AlertTriangle size={12} color="#dc2626" />
                        <Text style={styles.delayRiskText}>RISCO DE ATRASO NO HORÁRIO FIXO</Text>
                      </View>
                    </View>
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
  dateScopeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  dateScopeButton: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  dateScopeButtonActive: {
    backgroundColor: '#2563eb',
  },
  dateScopeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
  },
  dateScopeTextActive: {
    color: '#ffffff',
  },
  periodFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 8,
    paddingBottom: 12,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  periodFilterRowDark: { borderBottomColor: '#334155' },
  periodPill: {
    paddingHorizontal: 16,
    minHeight: 40,
    paddingVertical: 9,
    borderRadius: 12,
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 16,
  },
  timelineItemWrapper: {
    flexDirection: 'row',
  },
  timelineSidebar: {
    width: 32,
    alignItems: 'center',
  },
  timelineNode: {
    width: 10,
    height: 10,
    borderRadius: 5,
    zIndex: 2,
  },
  timelineNodeNormal: {
    backgroundColor: '#2563eb',
  },
  timelineNodeFixed: {
    backgroundColor: '#dc2626',
  },
  timelineLine: {
    flex: 1,
    width: 2.5,
    backgroundColor: '#cbd5e1',
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 12,
  },
  transitConnector: {
    paddingVertical: 12,
    paddingLeft: 4,
    gap: 6,
  },
  transitInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transitText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
  },
  delayRiskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  delayRiskText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#b91c1c',
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
  textLight: {
    color: '#f8fafc',
  },
  textMuted: {
    color: '#94a3b8',
  },
});
