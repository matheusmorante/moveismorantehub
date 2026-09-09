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
  dateScope: DeliveryRouteDateScope;
  onChangeDateScope: (scope: DeliveryRouteDateScope) => void;
  isDarkMode?: boolean;
}

export const DeliveryTimelineView: React.FC<Props> = ({
  items,
  refreshing,
  onRefresh,
  onStartDelivery,
  onViewOrder,
  dateScope,
  onChangeDateScope,
  isDarkMode = false,
}) => {
  const [periodFilter, setPeriodFilter] = useState<'all' | 'morning' | 'afternoon'>('all');
  const [handlingOptions, setHandlingOptions] = useState<any[]>([]);

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
    return items.filter((item) => {
      const p = item.periodLabel.toLowerCase();
      if (periodFilter === 'morning') {
        return p.includes('manhã') || p.includes('08:') || p.includes('09:') || p.includes('10:') || p.includes('11:');
      }
      if (periodFilter === 'afternoon') {
        return p.includes('tarde') || p.includes('13:') || p.includes('14:') || p.includes('15:') || p.includes('16:') || p.includes('17:') || p.includes('18:');
      }
      return true;
    });
  }, [items, periodFilter]);

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Filtro de datas: hoje ou próximos dias */}
      <View style={styles.dateScopeRow}>
        <TouchableOpacity
          style={[styles.dateScopeButton, dateScope === 'today' && styles.dateScopeButtonActive]}
          onPress={() => onChangeDateScope('today')}
          activeOpacity={0.8}
        >
          <Text style={[styles.dateScopeText, dateScope === 'today' && styles.dateScopeTextActive]}>Hoje</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dateScopeButton, dateScope === 'next_days' && styles.dateScopeButtonActive]}
          onPress={() => onChangeDateScope('next_days')}
          activeOpacity={0.8}
        >
          <Text style={[styles.dateScopeText, dateScope === 'next_days' && styles.dateScopeTextActive]}>Dias seguintes</Text>
        </TouchableOpacity>
      </View>

      {/* Pílulas de Período: [ Todas ] [ Manhã ] [ Tarde ] */}
      <View style={styles.periodFilterRow}>
        <TouchableOpacity
          style={[styles.periodPill, periodFilter === 'all' && styles.periodPillActive]}
          onPress={() => setPeriodFilter('all')}
          activeOpacity={0.8}
        >
          <Text style={[styles.periodPillText, periodFilter === 'all' && styles.periodPillTextActive]}>
            Todas ({items.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.periodPill, periodFilter === 'morning' && styles.periodPillActive]}
          onPress={() => setPeriodFilter('morning')}
          activeOpacity={0.8}
        >
          <Text style={[styles.periodPillText, periodFilter === 'morning' && styles.periodPillTextActive]}>
            Manhã
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.periodPill, periodFilter === 'afternoon' && styles.periodPillActive]}
          onPress={() => setPeriodFilter('afternoon')}
          activeOpacity={0.8}
        >
          <Text style={[styles.periodPillText, periodFilter === 'afternoon' && styles.periodPillTextActive]}>
            Tarde
          </Text>
        </TouchableOpacity>
      </View>

      {/* Timeline Vertical */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
      >
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
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  periodPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  periodPillActive: {
    backgroundColor: '#2563eb',
  },
  periodPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
  },
  periodPillTextActive: {
    color: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
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
