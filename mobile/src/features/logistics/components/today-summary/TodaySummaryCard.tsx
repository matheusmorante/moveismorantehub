import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Animated, View, Text, TouchableOpacity } from 'react-native';
import {
  CalendarDays,
  ChevronRight,
  FileText,
  ListTodo,
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
import { DeliveryShiftMetricsGrid } from './DeliveryShiftMetricsGrid';
import { styles } from './todaySummaryCard.styles';
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
  isDarkMode?: boolean;
  periodFilter?: DeliveryPeriodFilter;
  activities?: DeliveryRouteItem[];
  assemblyTasks?: AssemblyTask[];
  onViewSchedule: () => void;
  onViewAssemblies?: () => void;
}

const SHOW_AI_SUMMARY = false;

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

export const TodaySummaryCard: React.FC<TodaySummaryCardProps> = ({
  orders,
  isDarkMode = false,
  periodFilter = 'today',
  activities = [],
  assemblyTasks = [],
  onViewSchedule,
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

  const { totalCount, morningCount, afternoonCount, defaultSummaryText } = useMemo(
    () => calculateDeliverySummaryMetrics(effectiveOrders, periodFilter),
    [effectiveOrders, periodFilter]
  );

  const activeSummaryText = aiSummaryText || defaultSummaryText;
  const assemblyCount = assemblyTasks.length;
  const completedActivityCount = activities.filter(
    (activity) => activity.status === 'completed'
  ).length;
  const remainingActivityCount = Math.max(0, activities.length - completedActivityCount);
  const completionPercent =
    activities.length > 0 ? Math.round((completedActivityCount / activities.length) * 100) : 0;
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
          <View
            style={{
              flex: 1,
              minWidth: 0,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <ListTodo size={16} color={isDarkMode ? '#93c5fd' : '#2563eb'} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.activitiesTitle, isDarkMode && styles.textLight]}>
                Programação
              </Text>
              <Text
                style={[
                  styles.headerSubtitle,
                  isDarkMode && styles.headerSubtitleDark,
                  { marginTop: 2 },
                ]}
              >
                Entregas, assistências e coletas de devolução agendadas
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.linkButton, { flexDirection: 'row', alignItems: 'center', gap: 2 }]}
            onPress={onViewSchedule}
            accessibilityRole="button"
            accessibilityLabel="Ver programação"
          >
            <Text style={[styles.linkText, isDarkMode && styles.linkTextDark]}>Ver</Text>
            <ChevronRight size={16} color={isDarkMode ? '#60a5fa' : '#2563eb'} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};
