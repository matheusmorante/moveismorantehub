import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SectionList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Share,
} from 'react-native';
import { Calendar, Share2 } from 'lucide-react-native';
import {
  groupOrdersByDate,
  isCancelledOrder,
  isDateInPeriod,
  formatGroupDateLabel,
  getLocalDateString,
} from '../../../utils/orderUtils';
import { getOperationalScheduleDate } from '../../../utils/operationalSchedule';
import { TodayDeliveriesScreen } from './TodayDeliveriesScreen';
import { LogisticsOrderCard } from '../components/LogisticsOrderCard';
import { useLogisticsScheduleData } from '../hooks/useLogisticsScheduleData';
import { LogisticsDateSectionHeader } from '../components/LogisticsDateSectionHeader';

interface Props {
  isDarkMode: boolean;
  isAdmin: boolean;
  userProfile?: any;
  onSelectOrder?: (order: any) => void;
  isEmbeddedInHub?: boolean;
  title?: string;
  onNavigateToDeliveriesMap?: () => void;
}

export const NativeLogisticsScreen: React.FC<Props> = ({
  isDarkMode,
  userProfile,
  onSelectOrder,
  title,
}) => {
  const { orders, loading, refreshing, handlingOptions, showingOffline, error, onRefresh } = useLogisticsScheduleData();
  const selectedPeriod = 'today_and_following';
  const todayStr = getLocalDateString(new Date());
  const [showTodayMap, setShowTodayMap] = useState<boolean>(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    sem_data: true,
  });

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [key]: !(prev[key] ?? key !== todayStr),
    }));
  };

  const deliveryOrders = orders.filter((o) => {
    const oData = o.order_data || {};
    if (oData.deleted || o.deleted || isCancelledOrder(o)) return false;
    const orderStatus = (o.status || oData.status || '').toLowerCase();
    if (orderStatus === 'draft' || orderStatus === 'rascunho' || orderStatus === 'drafts')
      return false;

    const shipping = oData.shipping || {};
    const sched = shipping.scheduling || oData.schedule || oData.scheduling || o.schedule || {};
    const rawSchedDate = getOperationalScheduleDate(o);

    const isExplicitlyPending = Boolean(
      sched.pendingScheduling ||
        oData.pendingScheduling ||
        o.pending_scheduling ||
        orderStatus === 'pending_scheduling' ||
        orderStatus === 'agendar_depois'
    );

    if (isExplicitlyPending) return true;
    if (!rawSchedDate || rawSchedDate === 'sem_data') return false;

    return isDateInPeriod(rawSchedDate || o.created_at, selectedPeriod);
  });

  const rawGrouped = groupOrdersByDate(deliveryOrders);

  const getDatesInPeriod = (period: string): string[] => {
    const dates: string[] = [];
    const now = new Date();

    if (period === 'today') {
      dates.push(getLocalDateString(now));
    } else if (period === 'today_and_following') {
      for (let i = 0; i <= 7; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() + i);
        dates.push(getLocalDateString(d));
      }
    } else if (period === 'this_week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now);
      monday.setDate(diff);

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        dates.push(getLocalDateString(d));
      }
    } else if (period === 'this_month') {
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i);
        dates.push(getLocalDateString(d));
      }
    } else if (period === 'last_30_days') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        dates.push(getLocalDateString(d));
      }
    }

    return dates;
  };

  const datesInPeriod = getDatesInPeriod(selectedPeriod);
  const mergedGroupsMap: Record<string, any[]> = {};
  rawGrouped.forEach((g) => {
    mergedGroupsMap[g.dateKey] = g.orders;
  });

  datesInPeriod.forEach((d) => {
    if (!mergedGroupsMap[d]) {
      mergedGroupsMap[d] = [];
    }
  });

  const sortedKeys = Object.keys(mergedGroupsMap).sort((a, b) => {
    if (a === 'sem_data') return -1;
    if (b === 'sem_data') return 1;
    return a.localeCompare(b);
  });

  const sections = sortedKeys.map((key) => {
    const isPending = key === 'sem_data';
    const ordersForDay = mergedGroupsMap[key];
    const count = ordersForDay.length;

    const isCollapsed =
      collapsedSections[key] === undefined ? key !== todayStr : Boolean(collapsedSections[key]);

    const label = isPending ? 'Agendamentos Pendentes' : formatGroupDateLabel(key);

    return {
      title: label,
      key,
      isPending,
      count,
      fullData: ordersForDay,
      data: isCollapsed
        ? []
        : count === 0
          ? [{ id: `empty-${key}`, isEmptyPlaceholder: true }]
          : ordersForDay,
    };
  });

  const renderHeader = () => (
    <View style={styles.headerPadding}>
      <View style={styles.topRow}>
        <View style={styles.titleContainer}>
          <View style={styles.agendaIcon}>
            <Calendar size={16} color="#ffffff" />
          </View>
          <Text style={[styles.screenTitle, isDarkMode && styles.textDark]}>
            {title || 'Agenda'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={() =>
            void Share.share({
              title: 'Agenda do MoranteHub',
              message: '📦 Agenda do MoranteHub\n🔗 Acesse online agora: https://morantehub.vercel.app/schedule',
            })
          }
          accessibilityRole="button"
          accessibilityLabel="Compartilhar agenda"
          activeOpacity={0.8}
        >
          <Share2 size={15} color="#ffffff" />
          <Text style={styles.shareBtnText}>Compartilhar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (showTodayMap) {
    return (
      <TodayDeliveriesScreen
        isDarkMode={isDarkMode}
        userProfile={userProfile}
        onBack={() => setShowTodayMap(false)}
        onSelectOrder={(o) => onSelectOrder && onSelectOrder(o)}
      />
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {showingOffline ? <Text style={styles.loadingText}>Sem conexão. Exibindo os pedidos salvos neste aparelho.</Text> : null}
      {error ? <Text accessibilityRole="alert" style={styles.loadingText}>{error}</Text> : null}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={[styles.loadingText, isDarkMode && styles.textDark]}>
            Carregando cronograma...
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => item.id || `item-${index}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />
          }
          renderSectionHeader={({ section }) => (
            <LogisticsDateSectionHeader
              dateKey={section.key}
              label={section.title}
              count={section.count}
              isPending={section.isPending}
              isToday={section.key === todayStr}
              isCollapsed={collapsedSections[section.key] ?? section.key !== todayStr}
              onToggle={toggleSection}
              isDarkMode={isDarkMode}
            />
          )}
          renderItem={({ item, section }) => {
            if (item.isEmptyPlaceholder) {
              return (
                <View
                  style={[
                    styles.emptyDayPlaceholder,
                    isDarkMode && styles.emptyDayPlaceholderDark,
                  ]}
                >
                  <Text style={[styles.emptyDayText, isDarkMode && styles.textMuted]}>
                    Nenhuma entrega programada para este dia
                  </Text>
                </View>
              );
            }

            return (
              <View style={styles.cardContainer}>
                <LogisticsOrderCard
                  order={item}
                  handlingOptions={handlingOptions}
                  isDarkMode={isDarkMode}
                  onSelectOrder={onSelectOrder}
                />
              </View>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  listContent: {
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  headerPadding: {
    paddingVertical: 8,
  },
  topRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  agendaIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
  },
  shareBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  cardContainer: {
    marginBottom: 12,
  },
  emptyDayPlaceholder: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderStyle: 'dashed',
  },
  emptyDayPlaceholderDark: {
    backgroundColor: '#1e293b/40',
    borderColor: '#334155',
  },
  emptyDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  textDark: {
    color: '#f8fafc',
  },
  textMuted: {
    color: '#64748b',
  },
});
