import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Animated, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Truck, FileText, ChevronRight } from 'lucide-react-native';
import {
  generateDeliveryAISummary,
  subscribeSummaryQuota,
} from '../../../../services/aiSummaryService';
import { formatItemDisplayName, getLocalDateString } from '../../../../utils/orderUtils';
import {
  calculateDeliverySummaryMetrics,
  type DeliveryPeriodFilter,
} from '../../utils/deliverySummaryMetrics';
import { getOperationalScheduleDate } from '../../../../utils/operationalSchedule';
import { supabase } from '../../../../services/supabaseClient';
import {
  getLatestSavedSummaryRecord,
  type DeliverySummaryRecord,
} from '../../../../services/deliverySummaryService';
import { offlineStorageService } from '../../../../services/offline/offlineStorageService';
import { DeliveryShiftMetricsGrid } from './DeliveryShiftMetricsGrid';
import type { DeliveryRouteItem } from '../../hooks/useDeliveryRoute';
import type { AssemblyTask } from '../../../assemblies/assemblyTasks';

interface OrderItem {
  id: string;
  order_number?: string;
  orderIndex?: string;
  customer_name?: string;
  client_name?: string;
  delivery_date?: string;
  scheduled_date?: string;
  status?: string;
  items?: any[];
  order_items?: any[];
  shipping?: any;
}

interface TodaySummaryCardProps {
  orders: OrderItem[];
  onSelectOrder?: (order: any) => void;
  isDarkMode?: boolean;
  periodFilter?: DeliveryPeriodFilter;
  activities?: DeliveryRouteItem[];
  nextAssembly?: AssemblyTask;
  assemblyCount?: number;
  onViewAll?: () => void;
  onViewAssemblies?: () => void;
}

const SHOW_AI_SUMMARY = false;

const formatActivityDate = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}` : value;
};

export const TodaySummaryCard: React.FC<TodaySummaryCardProps> = ({
  orders,
  onSelectOrder,
  isDarkMode = false,
  periodFilter = 'today',
  activities = [],
  nextAssembly,
  assemblyCount = 0,
  onViewAll,
  onViewAssemblies,
}) => {
  const [isGeminiQuotaExceeded, setIsGeminiQuotaExceeded] = useState<boolean>(false);

  useEffect(() => {
    if (!SHOW_AI_SUMMARY) return;
    const unsub = subscribeSummaryQuota((exceeded) => {
      setIsGeminiQuotaExceeded(exceeded);
    });
    return unsub;
  }, []);

  const [aiSummaryText, setAiSummaryText] = useState<string>('');
  const [fallbackOrders, setFallbackOrders] = useState<any[]>([]);

  const effectiveOrdersRef = useRef<any[]>([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (!SHOW_AI_SUMMARY) return;
    let alive = true;
    const todayStr = getLocalDateString(new Date());
    const hasFuture = (orders || []).some((o) => {
      const d = getOperationalScheduleDate(o);
      return d && d > todayStr;
    });

    if (!orders || orders.length === 0 || !hasFuture) {
      offlineStorageService.getWorkingSet<any[]>('logistics_orders').then((cached) => {
        if (!alive) return;
        if (cached?.data && cached.data.length > 0) {
          setFallbackOrders(cached.data);
        } else {
          supabase
            .from('orders')
            .select('id, status, created_at, updated_at, order_data')
            .order('created_at', { ascending: false })
            .then(({ data }) => {
              if (alive && data && data.length > 0) setFallbackOrders(data);
            });
        }
      });
    }

    return () => {
      alive = false;
    };
  }, [orders]);

  const effectiveOrders = useMemo(() => {
    const todayStr = getLocalDateString(new Date());
    const hasFuture = (orders || []).some((o) => {
      const d = getOperationalScheduleDate(o);
      return d && d > todayStr;
    });

    if (hasFuture && orders && orders.length > 0) {
      return orders;
    }
    return fallbackOrders.length > 0 ? fallbackOrders : orders || [];
  }, [orders, fallbackOrders]);

  useEffect(() => {
    effectiveOrdersRef.current = effectiveOrders;
  });

  const ordersFingerprint = useMemo(() => {
    return (effectiveOrders || [])
      .map(
        (o) => `${o.id}_${o.status || o.order_data?.status || ''}_${getOperationalScheduleDate(o)}`
      )
      .join('|');
  }, [effectiveOrders]);

  const { filteredOrders, totalCount, morningCount, afternoonCount, defaultSummaryText } = useMemo(
    () => calculateDeliverySummaryMetrics(effectiveOrders, periodFilter),
    [effectiveOrders, periodFilter]
  );

  const upcomingActivities = useMemo(
    () =>
      [...activities]
        .sort((a, b) => {
          const rank = (item: DeliveryRouteItem) =>
            item.isCurrent
              ? 0
              : item.status === 'unattended'
                ? 1
                : item.isNext
                  ? 2
                  : item.status === 'completed'
                    ? 4
                    : 3;
          const dateOrder = getOperationalScheduleDate(a.order).localeCompare(
            getOperationalScheduleDate(b.order)
          );
          return rank(a) - rank(b) || dateOrder || a.sequence - b.sequence;
        })
        .slice(0, 3),
    [activities]
  );

  const activeSummaryText = aiSummaryText || defaultSummaryText;
  const assemblySummaryText = `${assemblyCount} ${assemblyCount === 1 ? 'montagem agendada' : 'montagens agendadas'}`;

  useEffect(() => {
    if (!SHOW_AI_SUMMARY) return;
    let isMounted = true;
    const mode = periodFilter === 'today' ? 'today' : 'next_days';

    generateDeliveryAISummary(
      mode,
      false,
      (text) => {
        if (isMounted && periodFilter === 'today') setAiSummaryText(text);
      },
      (text) => {
        if (isMounted && periodFilter !== 'today') setAiSummaryText(text);
      },
      undefined,
      effectiveOrdersRef.current
    );

    return () => {
      isMounted = false;
    };
  }, [periodFilter, ordersFingerprint]);

  useEffect(() => {
    if (!SHOW_AI_SUMMARY) return;
    let alive = true;
    const scope = periodFilter === 'today' ? 'today' : 'next_days';
    const applySummaryRecord = (record: DeliverySummaryRecord | null) => {
      if (!alive || !record) return;
      if (record.text_status === 'READY' && record.text) setAiSummaryText(record.text);
    };

    void getLatestSavedSummaryRecord(scope).then(applySummaryRecord);
    let summaryDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel(`delivery-summary-${periodFilter}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'delivery_summaries' },
        (payload) => {
          const record = payload.new as any;
          if (record?.scope !== scope) return;

          if (summaryDebounceTimer) clearTimeout(summaryDebounceTimer);
          summaryDebounceTimer = setTimeout(() => {
            void applySummaryRecord(record as DeliverySummaryRecord);
          }, 2000);
        }
      )
      .subscribe();

    return () => {
      alive = false;
      if (summaryDebounceTimer) clearTimeout(summaryDebounceTimer);
      supabase.removeChannel(channel);
    };
  }, [periodFilter]);

  return (
    <Animated.View style={[styles.cardContainer, { opacity: fadeAnim }]}>
      <View style={styles.headerRow}>
        <View style={styles.iconBadge}>
          <Truck size={22} color="#0055ff" />
        </View>

        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.headerTitle}>
            {periodFilter === 'today' ? 'Visão geral de hoje' : 'Visão geral dos próximos dias'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {totalCount} {totalCount === 1 ? 'atividade' : 'atividades'} · {morningCount} manhã ·{' '}
            {afternoonCount} tarde
          </Text>
        </View>
      </View>

      <DeliveryShiftMetricsGrid
        morningCount={morningCount}
        afternoonCount={afternoonCount}
        totalCount={totalCount}
      />

      {SHOW_AI_SUMMARY && (
        <View
          style={[
            styles.resumoBox,
            isGeminiQuotaExceeded && { borderColor: '#fca5a5', backgroundColor: '#fff1f2' },
          ]}
        >
          <View
            style={[styles.resumoIconBox, isGeminiQuotaExceeded && { backgroundColor: '#fee2e2' }]}
          >
            <FileText size={18} color={isGeminiQuotaExceeded ? '#dc2626' : '#0055ff'} />
          </View>

          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.resumoTitle}>
                {periodFilter === 'today' ? 'Resumo do dia' : 'Resumo dos próximos dias'}
              </Text>
              {isGeminiQuotaExceeded && (
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '800',
                    color: '#dc2626',
                    textTransform: 'uppercase',
                  }}
                >
                  • Cota Indisponível
                </Text>
              )}
            </View>
            {isGeminiQuotaExceeded ? (
              <Text
                style={[styles.resumoText, { color: '#dc2626', fontWeight: '700' }]}
                numberOfLines={4}
              >
                ⚠ Resumo de IA indisponível no momento por limite de cota de tokens.
              </Text>
            ) : (
              <Text style={styles.resumoText} numberOfLines={4}>
                {activeSummaryText}
              </Text>
            )}
          </View>

          <ChevronRight size={18} color="#94a3b8" />
        </View>
      )}

      <View style={[styles.activitiesBox, isDarkMode && styles.activitiesBoxDark]}>
        <View style={styles.activitiesHeader}>
          <Text style={[styles.activitiesTitle, isDarkMode && styles.textLight]}>
            Próximas atividades
          </Text>
          <TouchableOpacity
            onPress={onViewAll}
            accessibilityRole="button"
            accessibilityLabel="Ver todas as atividades"
            hitSlop={8}
          >
            <Text style={[styles.linkText, isDarkMode && styles.linkTextDark]}>Ver todas</Text>
          </TouchableOpacity>
        </View>
        {upcomingActivities.length ? (
          upcomingActivities.map((activity) => {
            const orderData = activity.order?.order_data || {};
            const shipping = orderData.shipping || {};
            const address = shipping.deliveryAddress || {};
            const location = [address.neighborhood, address.city].filter(Boolean).join(' · ');
            const activityDate = getOperationalScheduleDate(activity.order);
            const statusLabel =
              activity.status === 'completed'
                ? 'Concluída'
                : activity.status === 'in_progress'
                  ? 'Em rota'
                  : activity.status === 'arrived'
                    ? 'No local'
                    : activity.status === 'in_service'
                      ? 'Em atendimento'
                      : activity.status === 'unattended'
                        ? 'Não concluída'
                        : 'Pendente';
            return (
              <TouchableOpacity
                key={activity.id}
                style={[styles.activityRow, isDarkMode && styles.activityRowDark]}
                onPress={() => onSelectOrder?.(activity.order)}
                activeOpacity={0.8}
              >
                <View style={styles.activityTextContent}>
                  <View style={styles.activityTopLine}>
                    <Text style={[styles.activityType, isDarkMode && styles.activityTypeDark]}>
                      {activity.activityLabel}
                    </Text>
                    <Text
                      style={[
                        styles.activityStatus,
                        isDarkMode && styles.activityStatusDark,
                        activity.status === 'completed' && styles.activityStatusCompleted,
                        activity.status === 'completed' &&
                          isDarkMode &&
                          styles.activityStatusCompletedDark,
                        activity.status === 'unattended' && styles.activityStatusWarning,
                        activity.status === 'unattended' &&
                          isDarkMode &&
                          styles.activityStatusWarningDark,
                      ]}
                    >
                      {statusLabel}
                    </Text>
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[styles.activityCustomer, isDarkMode && styles.textLight]}
                  >
                    {activity.customerName}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[styles.activityMeta, isDarkMode && styles.textMuted]}
                  >
                    {[
                      periodFilter === 'next_days' ? formatActivityDate(activityDate) : '',
                      activity.periodLabel,
                      location,
                      `${activity.itemsCount} ${activity.itemsCount === 1 ? 'item' : 'itens'}`,
                      `Pedido #${activity.orderIndex || activity.id.slice(0, 6)}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                <ChevronRight size={16} color={isDarkMode ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            );
          })
        ) : null}
        {nextAssembly ? (
          <TouchableOpacity
            style={[styles.activityRow, isDarkMode && styles.activityRowDark]}
            onPress={() => onSelectOrder?.(nextAssembly.order)}
            activeOpacity={0.8}
          >
            <View style={styles.activityTextContent}>
              <View style={styles.activityTopLine}>
                <Text
                  style={[
                    styles.assemblyActivityType,
                    isDarkMode && styles.assemblyActivityTypeDark,
                  ]}
                >
                  {nextAssembly.isOutside ? 'MONTAGEM FORA' : 'MONTAGEM NO DEPÓSITO'}
                </Text>
                {nextAssembly.scheduledTime ? (
                  <Text style={[styles.activityStatus, isDarkMode && styles.textMuted]}>
                    {nextAssembly.scheduledTime}
                  </Text>
                ) : null}
              </View>
              <Text
                numberOfLines={1}
                style={[styles.activityCustomer, isDarkMode && styles.textLight]}
              >
                {formatItemDisplayName(nextAssembly.item)}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.activityMeta, isDarkMode && styles.textMuted]}
              >
                {[
                  nextAssembly.dateKey === getLocalDateString(new Date())
                    ? ''
                    : formatActivityDate(nextAssembly.dateKey),
                  nextAssembly.responsibleName,
                  nextAssembly.order?.customer_name ||
                    nextAssembly.order?.order_data?.customerData?.fullName ||
                    nextAssembly.order?.order_data?.customerData?.name ||
                    'Montagem agendada',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
            <ChevronRight size={16} color={isDarkMode ? '#94a3b8' : '#64748b'} />
          </TouchableOpacity>
        ) : null}
        {!upcomingActivities.length && !nextAssembly ? (
          <Text style={[styles.emptyActivitiesText, isDarkMode && styles.textMuted]}>
            {filteredOrders.length
              ? 'Atividades do período sem detalhes de rota.'
              : 'Nenhuma atividade programada para este período.'}
          </Text>
        ) : null}
      </View>

      <View style={[styles.assemblySummaryRow, isDarkMode && styles.assemblySummaryRowDark]}>
        <View>
          <Text style={[styles.assemblySummaryTitle, isDarkMode && styles.textLight]}>
            Montagens
          </Text>
          <Text style={[styles.assemblySummaryCount, isDarkMode && styles.textMuted]}>
            {assemblySummaryText}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onViewAssemblies}
          accessibilityRole="button"
          accessibilityLabel="Ver montagens"
          hitSlop={8}
        >
          <Text style={[styles.linkText, isDarkMode && styles.linkTextDark]}>Ver montagens</Text>
        </TouchableOpacity>
      </View>

    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#0066ff',
    borderRadius: 20,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#dbeafe',
    fontSize: 11,
    marginTop: 2,
  },
  resumoBox: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    minHeight: 76,
  },
  resumoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumoTitle: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
  resumoText: {
    color: '#475569',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
    minHeight: 32,
  },
  activitiesBox: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
  },
  activitiesBoxDark: { backgroundColor: '#1e293b' },
  activitiesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  activitiesTitle: { color: '#0f172a', fontSize: 13, fontWeight: '800' },
  linkText: { color: '#2563eb', fontSize: 11, fontWeight: '800' },
  linkTextDark: { color: '#60a5fa' },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 8,
    gap: 8,
  },
  activityRowDark: { borderTopColor: '#334155' },
  activityTextContent: { flex: 1, minWidth: 0 },
  activityTopLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  activityType: { color: '#2563eb', fontSize: 9, fontWeight: '900' },
  activityTypeDark: { color: '#60a5fa' },
  assemblyActivityType: { color: '#475569', fontSize: 9, fontWeight: '900' },
  assemblyActivityTypeDark: { color: '#cbd5e1' },
  activityStatus: { color: '#64748b', fontSize: 9, fontWeight: '800' },
  activityStatusDark: { color: '#94a3b8' },
  activityStatusCompleted: { color: '#15803d' },
  activityStatusCompletedDark: { color: '#4ade80' },
  activityStatusWarning: { color: '#b91c1c' },
  activityStatusWarningDark: { color: '#fca5a5' },
  activityCustomer: { color: '#0f172a', fontSize: 12, fontWeight: '700', marginTop: 2 },
  activityMeta: { color: '#64748b', fontSize: 10, marginTop: 2 },
  emptyActivitiesText: { color: '#64748b', fontSize: 11, paddingVertical: 8 },
  assemblySummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  assemblySummaryRowDark: { backgroundColor: '#1e293b' },
  assemblySummaryTitle: { color: '#0f172a', fontSize: 12, fontWeight: '800' },
  assemblySummaryCount: { color: '#64748b', fontSize: 10, marginTop: 2 },
  textLight: { color: '#f8fafc' },
  textMuted: { color: '#94a3b8' },
});
