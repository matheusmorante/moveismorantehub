import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { Truck, FileText, ChevronRight } from 'lucide-react-native';
import {
  generateDeliveryAISummary,
  subscribeSummaryQuota,
} from '../../../services/aiSummaryService';
import { getLocalDateString } from '../../../utils/orderUtils';
import {
  calculateDeliverySummaryMetrics,
  type DeliveryPeriodFilter,
} from '../utils/deliverySummaryMetrics';
import { getOperationalScheduleDate } from '../../../utils/operationalSchedule';
import { supabase } from '../../../services/supabaseClient';
import {
  getLatestSavedSummaryRecord,
  type DeliverySummaryRecord,
} from '../../../services/deliverySummaryService';
import { offlineStorageService } from '../../../services/offline/offlineStorageService';
import { DeliveryShiftMetricsGrid } from './DeliveryShiftMetricsGrid';

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
}

const SHOW_AI_SUMMARY = false;

export const TodaySummaryCard: React.FC<TodaySummaryCardProps> = ({
  orders,
  onSelectOrder,
  isDarkMode = false,
  periodFilter = 'today',
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
    let summaryDebounceTimer: NodeJS.Timeout | null = null;
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
      {SHOW_AI_SUMMARY && (
        <View style={styles.headerRow}>
          <View style={styles.iconBadge}>
            <Truck size={24} color="#0055ff" />
          </View>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>
              {periodFilter === 'today' ? 'Operação de Hoje' : 'Operação dos Próximos Dias'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {totalCount} {totalCount === 1 ? 'atividade programada' : 'atividades programadas'}
            </Text>
          </View>
        </View>
      )}

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

    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#0066ff',
    borderRadius: 24,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
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
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#dbeafe',
    fontSize: 12,
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
});
