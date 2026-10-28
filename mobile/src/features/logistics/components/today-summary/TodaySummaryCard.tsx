import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Animated, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  AlertCircle,
  CalendarDays,
  ChevronRight,
  FileText,
  Truck,
  Wrench,
} from 'lucide-react-native';
import {
  generateDeliveryAISummary,
  subscribeSummaryQuota,
} from '../../../../services/aiSummaryService';
import {
  addDaysToLocalDateString,
  getLocalDateString,
} from '../../../../utils/orderUtils';
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
import { MobileDrill } from '../../../../components/shared/MobileDrill';
import { DeliveryShiftMetricsGrid } from './DeliveryShiftMetricsGrid';
import type { DeliveryRouteItem } from '../../hooks/useDeliveryRoute';
import type { AssemblyTask } from '../../../assemblies/assemblyTasks';
import { classifyDeliveryService } from '../../domain/deliveryServiceClassification';

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
  assemblyTasks?: AssemblyTask[];
  onViewAssemblies?: () => void;
}

const SHOW_AI_SUMMARY = false;

const formatActivityDate = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}` : value;
};

const formatSummaryDate = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  const formatted = date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return formatted.charAt(0).toLocaleUpperCase('pt-BR') + formatted.slice(1);
};

const getActivityTimeKey = (value?: string) => {
  const normalized = String(value || '').toLocaleLowerCase('pt-BR');
  const match = normalized.match(/(\d{1,2}):(\d{2})/);
  if (match) return `${match[1].padStart(2, '0')}:${match[2]}`;
  if (normalized.includes('manhã') || normalized.includes('manha')) return '08:00';
  if (normalized.includes('tarde') || normalized.includes('noite')) return '13:00';
  return '99:99';
};

export const TodaySummaryCard: React.FC<TodaySummaryCardProps> = ({
  orders,
  onSelectOrder,
  isDarkMode = false,
  periodFilter = 'today',
  activities = [],
  assemblyTasks = [],
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
  const [showAllDeliveries, setShowAllDeliveries] = useState(false);

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

  const upcomingDeliveries = useMemo(() => {
    const deliveries = activities.filter((activity) =>
      classifyDeliveryService(activity.order).isDelivery
    );
    const priority = (activity: DeliveryRouteItem) => {
      if (activity.status === 'unattended') return 0;
      if (
        activity.status === 'in_progress' ||
        activity.status === 'arrived' ||
        activity.status === 'in_service'
      ) {
        return 1;
      }
      if (activity.isNext) return 2;
      return activity.status === 'completed' ? 4 : 3;
    };

    return deliveries.sort(
      (a, b) =>
        priority(a) - priority(b) ||
        getOperationalScheduleDate(a.order).localeCompare(getOperationalScheduleDate(b.order)) ||
        getActivityTimeKey(a.periodLabel).localeCompare(getActivityTimeKey(b.periodLabel)) ||
        a.sequence - b.sequence
    );
  }, [activities]);

  useEffect(() => setShowAllDeliveries(false), [periodFilter]);

  const activeSummaryText = aiSummaryText || defaultSummaryText;
  const assemblyCount = assemblyTasks.length;
  const completedActivityCount = activities.filter(
    (activity) => activity.status === 'completed'
  ).length;
  const remainingActivityCount = Math.max(0, activities.length - completedActivityCount);
  const completionPercent =
    activities.length > 0 ? Math.round((completedActivityCount / activities.length) * 100) : 0;
  const attentionCount = upcomingDeliveries.filter(
    (activity) => activity.status === 'unattended'
  ).length;
  const visibleDeliveries = showAllDeliveries
    ? upcomingDeliveries
    : upcomingDeliveries.slice(0, 5);

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
      <View style={[styles.summaryCard, isDarkMode && styles.summaryCardDark]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconBadge, isDarkMode && styles.iconBadgeDark]}>
            <CalendarDays size={20} color={isDarkMode ? '#93c5fd' : '#2563eb'} />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>
              {periodFilter === 'today'
                ? 'Visão geral de hoje'
                : periodFilter === 'tomorrow'
                  ? 'Visão geral de amanhã'
                  : 'Visão geral dos próximos dias'}
            </Text>
            <Text style={[styles.headerSubtitle, isDarkMode && styles.headerSubtitleDark]}>
              {periodFilter === 'next_days'
                ? 'Entregas, serviços e montagens agendadas'
                : formatSummaryDate(
                    addDaysToLocalDateString(
                      getLocalDateString(new Date()),
                      periodFilter === 'tomorrow' ? 1 : 0
                    )
                  )}
            </Text>
          </View>
        </View>

        <DeliveryShiftMetricsGrid
          morningCount={morningCount}
          afternoonCount={afternoonCount}
          totalCount={totalCount}
          isDarkMode={isDarkMode}
        />

        {activities.length > 0 && (
          <View style={[styles.progressPanel, isDarkMode && styles.progressPanelDark]}>
            <View style={styles.progressHeader}>
              <View>
                <Text style={[styles.progressTitle, isDarkMode && styles.textLight]}>
                  {periodFilter === 'today'
                    ? 'Progresso do dia'
                    : periodFilter === 'tomorrow'
                      ? 'Progresso de amanhã'
                      : 'Progresso das atividades'}
                </Text>
                <Text style={[styles.progressSubtitle, isDarkMode && styles.textMuted]}>
                  Entregas e serviços concluídos
                </Text>
              </View>
              <Text style={[styles.progressValue, isDarkMode && styles.progressValueDark]}>
                {completedActivityCount}/{activities.length}
              </Text>
            </View>
            <View
              style={[styles.progressTrack, isDarkMode && styles.progressTrackDark]}
              accessibilityLabel={`${completionPercent}% das entregas e serviços concluídos`}
            >
              <View
                style={[
                  styles.progressFill,
                  isDarkMode && styles.progressFillDark,
                  { width: `${completionPercent}%` },
                ]}
              />
            </View>
            <Text style={[styles.progressMeta, isDarkMode && styles.textMuted]}>
              <Text style={[styles.progressMetaCompleted, isDarkMode && styles.progressMetaCompletedDark]}>
                {completedActivityCount}{' '}
                {completedActivityCount === 1 ? 'concluída' : 'concluídas'}
              </Text>
              {' · '}
              {remainingActivityCount}{' '}
              {remainingActivityCount === 1 ? 'restante' : 'restantes'}
            </Text>
          </View>
        )}

        {assemblyCount > 0 && (
          <View style={[styles.assemblySummaryRow, isDarkMode && styles.assemblySummaryRowDark]}>
            <View style={styles.assemblySummaryInfo}>
              <Wrench size={16} color={isDarkMode ? '#fdba74' : '#C2410C'} />
              <View>
                <Text
                  style={[
                    styles.assemblySummaryTitle,
                    isDarkMode && styles.assemblySummaryTitleDark,
                  ]}
                >
                  Montagens
                </Text>
                <Text
                  style={[
                    styles.assemblySummaryCount,
                    isDarkMode && styles.assemblySummaryCountDark,
                  ]}
                >
                  {assemblyCount} {assemblyCount === 1 ? 'agendada' : 'agendadas'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={onViewAssemblies}
              accessibilityRole="button"
              accessibilityLabel="Ver montagens"
            >
              <Text style={[styles.linkText, isDarkMode && styles.linkTextDark]}>Ver montagens</Text>
            </TouchableOpacity>
          </View>
        )}

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
                  {periodFilter === 'today'
                    ? 'Resumo do dia'
                    : periodFilter === 'tomorrow'
                      ? 'Resumo de amanhã'
                      : 'Resumo dos próximos dias'}
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
      </View>

      <View style={[styles.activitiesBox, isDarkMode && styles.activitiesBoxDark]}>
        <View style={styles.activitiesHeader}>
          <Text style={[styles.activitiesTitle, isDarkMode && styles.textLight]}>
            Próximas entregas
          </Text>
          {upcomingDeliveries.length > 5 && (
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => setShowAllDeliveries((current) => !current)}
              accessibilityRole="button"
              accessibilityLabel={
                showAllDeliveries ? 'Mostrar menos entregas' : 'Ver todas as entregas'
              }
            >
              <Text style={[styles.linkText, isDarkMode && styles.linkTextDark]}>
                {showAllDeliveries ? 'Ver menos' : 'Ver todas'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {attentionCount > 0 && (
          <View style={[styles.attentionNotice, isDarkMode && styles.attentionNoticeDark]}>
            <AlertCircle size={16} color={isDarkMode ? '#fca5a5' : '#DC2626'} />
            <Text style={[styles.attentionText, isDarkMode && styles.attentionTextDark]}>
              {attentionCount}{' '}
              {attentionCount === 1
                ? 'entrega não realizada precisa'
                : 'entregas não realizadas precisam'}{' '}
              de atenção
            </Text>
          </View>
        )}

        {visibleDeliveries.length ? (
          visibleDeliveries.map((routeActivity, index) => {
            const order = routeActivity.order;
            const orderData = order?.order_data || {};
            const shipping = orderData.shipping || order?.shipping || {};
            const address = shipping.deliveryAddress || {};
            const location = [address.neighborhood, address.city].filter(Boolean).join(' · ');
            const activityDate = getOperationalScheduleDate(order);
            const activityLabel = routeActivity.activityLabel || 'ENTREGA';
            const customerName = routeActivity.customerName || 'Cliente';
            const timeLabel = routeActivity.periodLabel;
            const orderNumber = routeActivity.orderIndex || routeActivity.id.slice(0, 6);
            const deliveryService = classifyDeliveryService(order);
            const assemblyLabels = [
              deliveryService.hasInternalAssembly
                ? { label: 'Montagem no depósito', background: '#f59e0b', border: '#d97706' }
                : null,
              deliveryService.hasOutsideAssembly
                ? { label: 'Montagem fora', background: '#dc2626', border: '#b91c1c' }
                : null,
            ].filter(
              (badge): badge is { label: string; background: string; border: string } =>
                badge !== null
            );
            const routeStatus = routeActivity.status;
            const activityTypeColor = isDarkMode ? '#93c5fd' : '#2563EB';
            const activityTypeBackground = isDarkMode ? '#172554' : '#EFF6FF';
            let statusLabel = 'Agendada';
            let statusTone = 'pending';
            if (routeStatus === 'completed') {
              statusLabel = 'Concluída';
              statusTone = 'completed';
            } else if (routeStatus === 'unattended') {
              statusLabel = 'Não realizada';
              statusTone = 'warning';
            } else if (
              routeStatus === 'in_progress' ||
              routeStatus === 'arrived' ||
              routeStatus === 'in_service'
            ) {
              statusLabel =
                routeStatus === 'in_progress'
                  ? 'Em rota'
                  : routeStatus === 'arrived'
                    ? 'No local'
                    : 'Em atendimento';
              statusTone = 'active';
            } else if (routeStatus === 'cancelled') {
              statusLabel = 'Cancelada';
            }

            return (
              <TouchableOpacity
                key={routeActivity.id}
                style={[
                  styles.activityRow,
                  isDarkMode && styles.activityRowDark,
                  index === visibleDeliveries.length - 1 && styles.activityRowLast,
                ]}
                onPress={() => onSelectOrder?.(order)}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <View style={styles.activityTextContent}>
                  <View style={styles.activityTopLine}>
                    <View
                      style={[styles.activityTypeRow, { backgroundColor: activityTypeBackground }]}
                    >
                      <Truck size={13} color={activityTypeColor} />
                      <Text
                        numberOfLines={1}
                        style={[styles.activityType, { color: activityTypeColor }]}
                      >
                        {activityLabel}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.activityStatusBadge,
                        statusTone === 'completed' && styles.activityStatusCompleted,
                        statusTone === 'active' && styles.activityStatusActive,
                        statusTone === 'warning' && styles.activityStatusWarning,
                        statusTone === 'pending' && styles.activityStatusPending,
                        isDarkMode &&
                          statusTone === 'completed' &&
                          styles.activityStatusCompletedDark,
                        isDarkMode && statusTone === 'active' && styles.activityStatusActiveDark,
                        isDarkMode && statusTone === 'warning' && styles.activityStatusWarningDark,
                        isDarkMode && statusTone === 'pending' && styles.activityStatusPendingDark,
                      ]}
                    >
                      <Text
                        style={[
                          styles.activityStatusText,
                          statusTone === 'completed' && styles.activityStatusTextCompleted,
                          statusTone === 'active' && styles.activityStatusTextActive,
                          statusTone === 'warning' && styles.activityStatusTextWarning,
                          isDarkMode &&
                            statusTone === 'completed' &&
                            styles.activityStatusTextCompletedDark,
                          isDarkMode && statusTone === 'active' && styles.activityStatusTextActiveDark,
                          isDarkMode &&
                            statusTone === 'warning' &&
                            styles.activityStatusTextWarningDark,
                          isDarkMode && statusTone === 'pending' && styles.activityStatusTextPendingDark,
                        ]}
                      >
                        {statusLabel}
                      </Text>
                    </View>
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[styles.activityCustomer, isDarkMode && styles.textLight]}
                  >
                    {customerName}
                  </Text>
                  <View style={styles.activityDetails}>
                    <Text
                      style={[styles.activitySchedule, isDarkMode && styles.activityScheduleDark]}
                    >
                      {[
                        periodFilter !== 'today' ? formatActivityDate(activityDate) : '',
                        timeLabel,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Horário a confirmar'}
                    </Text>
                    {location ? (
                      <Text
                        numberOfLines={1}
                        style={[styles.activityLocation, isDarkMode && styles.textMuted]}
                      >
                        {location}
                      </Text>
                    ) : null}
                  </View>
                  {assemblyLabels.length > 0 && (
                    <View style={styles.assemblyLabels}>
                      {assemblyLabels.map(({ label, background, border }) => (
                        <View
                          key={label}
                          style={[
                            styles.activityTypeRow,
                            { backgroundColor: background, borderColor: border, borderWidth: 1 },
                          ]}
                        >
                          <MobileDrill size={11} color="#ffffff" />
                          <Text
                            numberOfLines={1}
                            style={[styles.activityType, { color: '#ffffff' }]}
                          >
                            {label}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <Text
                    numberOfLines={1}
                    style={[styles.activityMeta, isDarkMode && styles.textMuted]}
                  >
                    {`Pedido #${orderNumber}`}
                  </Text>
                </View>
                <ChevronRight size={16} color={isDarkMode ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            );
          })
        ) : (
          <Text style={[styles.emptyActivitiesText, isDarkMode && styles.textMuted]}>
            {filteredOrders.length
              ? 'Entregas do período sem detalhes de rota.'
              : 'Nenhuma entrega programada para este período.'}
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    gap: 8,
    paddingBottom: 8,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  summaryCardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeDark: { backgroundColor: '#172554' },
  headerTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  headerTitleDark: { color: '#f8fafc' },
  headerSubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  headerSubtitleDark: { color: '#94a3b8' },
  progressPanel: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  progressPanelDark: { backgroundColor: '#172554' },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressTitle: { color: '#0f172a', fontSize: 12, fontWeight: '800' },
  progressSubtitle: { color: '#64748b', fontSize: 10, marginTop: 2 },
  progressValue: { color: '#2563eb', fontSize: 18, fontWeight: '900' },
  progressValueDark: { color: '#60a5fa' },
  progressTrack: {
    height: 6,
    backgroundColor: '#DBEAFE',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressTrackDark: { backgroundColor: '#1e3a8a' },
  progressFill: { height: '100%', backgroundColor: '#16A34A', borderRadius: 4 },
  progressFillDark: { backgroundColor: '#22c55e' },
  progressMeta: { color: '#64748b', fontSize: 10, marginTop: 5 },
  progressMetaCompleted: { color: '#16A34A', fontWeight: '800' },
  progressMetaCompletedDark: { color: '#86efac' },
  assemblySummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 2,
  },
  assemblySummaryRowDark: { backgroundColor: '#3f2a1a' },
  assemblySummaryInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  assemblySummaryTitle: { color: '#9a3412', fontSize: 11, fontWeight: '800' },
  assemblySummaryTitleDark: { color: '#fed7aa' },
  assemblySummaryCount: { color: '#C2410C', fontSize: 10, marginTop: 1 },
  assemblySummaryCountDark: { color: '#fdba74' },
  linkButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  linkText: { color: '#2563eb', fontSize: 11, fontWeight: '800' },
  linkTextDark: { color: '#60a5fa' },
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
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginHorizontal: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  activitiesBoxDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  activitiesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  activitiesTitle: { color: '#0f172a', fontSize: 13, fontWeight: '800' },
  attentionNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 8,
    marginBottom: 4,
  },
  attentionNoticeDark: { backgroundColor: '#451a1a' },
  attentionText: { flex: 1, color: '#DC2626', fontSize: 11, fontWeight: '700' },
  attentionTextDark: { color: '#fecaca' },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    minHeight: 64,
    paddingVertical: 10,
    gap: 8,
  },
  activityRowDark: { borderBottomColor: '#334155' },
  activityRowLast: { borderBottomWidth: 0 },
  activityTextContent: { flex: 1, minWidth: 0 },
  activityTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  activityTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
    minWidth: 0,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  assemblyLabels: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 3 },
  activityType: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', flexShrink: 1 },
  activityStatusBadge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 },
  activityStatusPending: { backgroundColor: '#f1f5f9' },
  activityStatusPendingDark: { backgroundColor: '#334155' },
  activityStatusActive: { backgroundColor: '#EFF6FF' },
  activityStatusActiveDark: { backgroundColor: '#1e3a8a' },
  activityStatusCompleted: { backgroundColor: '#F0FDF4' },
  activityStatusCompletedDark: { backgroundColor: '#14532d' },
  activityStatusWarning: { backgroundColor: '#FEF2F2' },
  activityStatusWarningDark: { backgroundColor: '#7f1d1d' },
  activityStatusText: { color: '#475569', fontSize: 10, fontWeight: '800' },
  activityStatusTextPendingDark: { color: '#e2e8f0' },
  activityStatusTextActive: { color: '#2563EB' },
  activityStatusTextActiveDark: { color: '#bfdbfe' },
  activityStatusTextCompleted: { color: '#16A34A' },
  activityStatusTextCompletedDark: { color: '#bbf7d0' },
  activityStatusTextWarning: { color: '#DC2626' },
  activityStatusTextWarningDark: { color: '#fecaca' },
  activityCustomer: { color: '#0f172a', fontSize: 13, fontWeight: '700', marginTop: 3 },
  activityDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 3,
  },
  activitySchedule: { color: '#334155', fontSize: 11, fontWeight: '700' },
  activityScheduleDark: { color: '#e2e8f0' },
  activityLocation: { color: '#64748b', fontSize: 11 },
  activityMeta: { color: '#64748b', fontSize: 10, marginTop: 2 },
  emptyActivitiesText: { color: '#64748b', fontSize: 12, paddingVertical: 10 },
  textLight: { color: '#f8fafc' },
  textMuted: { color: '#94a3b8' },
});
