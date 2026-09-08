import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { ChevronLeft, ChevronRight, AlertTriangle, Clock } from 'lucide-react-native';
import { DeliveryRouteItem } from '../../hooks/useDeliveryRoute';
import { ScheduleCard } from './ScheduleCard';
import { analyzeOrderServiceHandlings } from '../../utils/scheduleServiceEstimator';

interface Props {
  items: DeliveryRouteItem[];
  refreshing: boolean;
  onRefresh: () => void;
  onStartDelivery: (item: DeliveryRouteItem) => void;
  onViewOrder: (item: DeliveryRouteItem) => void;
  isDarkMode?: boolean;
}

export const DeliveryTimelineView: React.FC<Props> = ({
  items,
  refreshing,
  onRefresh,
  onStartDelivery,
  onViewOrder,
  isDarkMode = false,
}) => {
  const [periodFilter, setPeriodFilter] = useState<'all' | 'morning' | 'afternoon'>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Formatação do Topo: "Hoje · Seg, 07/09"
  const formattedDateHeader = useMemo(() => {
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    const weekday = selectedDate.toLocaleDateString('pt-BR', { weekday: 'short' });
    const dayMonth = selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1).replace('.', '');
    const prefix = isToday ? 'Hoje · ' : '';
    return `${prefix}${capitalizedWeekday}, ${dayMonth}`;
  }, [selectedDate]);

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

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
      {/* Navegador de Dias Enxuto */}
      <View style={styles.dateNavigatorRow}>
        <TouchableOpacity style={styles.arrowBtn} onPress={handlePrevDay} activeOpacity={0.7}>
          <ChevronLeft size={18} color={isDarkMode ? '#cbd5e1' : '#334155'} />
        </TouchableOpacity>
        <Text style={[styles.dateHeaderText, isDarkMode && styles.textLight]}>
          {formattedDateHeader}
        </Text>
        <TouchableOpacity style={styles.arrowBtn} onPress={handleNextDay} activeOpacity={0.7}>
          <ChevronRight size={18} color={isDarkMode ? '#cbd5e1' : '#334155'} />
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
              Nenhuma entrega agendada para este período.
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
  dateNavigatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  arrowBtn: {
    padding: 6,
    borderRadius: 8,
  },
  dateHeaderText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.2,
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
