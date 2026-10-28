import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SectionList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Modal,
} from 'react-native';
import { Calendar, ChevronDown, Check, MoreVertical } from 'lucide-react-native';
import {
  groupOrdersByDate,
  isCancelledOrder,
  isDateInPeriod,
  formatGroupDateLabel,
  getLocalDateString,
} from '../../../utils/orderUtils';
import { getOperationalScheduleDate } from '../../../utils/operationalSchedule';
import { TodayDeliveriesScreen } from './TodayDeliveriesScreen';
import { PERIOD_OPTIONS } from '../components/LogisticsPeriodModal';
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
  const { orders, loading, refreshing, handlingOptions, onRefresh } = useLogisticsScheduleData();
  const [selectedPeriod, setSelectedPeriod] = useState<string>('today_and_following');
  const [showPeriodModal, setShowPeriodModal] = useState<boolean>(false);
  const [showTodayMap, setShowTodayMap] = useState<boolean>(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    sem_data: true,
  });

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const currentPeriodLabel =
    PERIOD_OPTIONS.find((p) => p.id === selectedPeriod)?.label || 'A partir de hoje';

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

    if (selectedPeriod === 'all') return true;
    return isDateInPeriod(rawSchedDate || o.created_at, selectedPeriod);
  });

  const todayStr = getLocalDateString(new Date());
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
          <Text style={[styles.screenTitle, isDarkMode && styles.textDark]}>
            {title || 'Agenda'}
          </Text>
          <TouchableOpacity
            style={[styles.selectBtn, isDarkMode && styles.selectBtnDark]}
            onPress={() => setShowPeriodModal(true)}
            activeOpacity={0.75}
          >
            <Calendar size={13} color="#2563eb" style={{ marginRight: 6 }} />
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.selectBtnText, isDarkMode && styles.textDark]}
            >
              {currentPeriodLabel}
            </Text>
            <ChevronDown
              size={14}
              color={isDarkMode ? '#cbd5e1' : '#64748b'}
              style={{ marginLeft: 4 }}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.moreBtn, isDarkMode && styles.moreBtnDark]}
          onPress={() => {}}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <MoreVertical size={20} color={isDarkMode ? '#cbd5e1' : '#64748b'} />
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
      <Modal
        visible={showPeriodModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPeriodModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPeriodModal(false)}
        >
          <View style={[styles.modalCard, isDarkMode && styles.modalCardDark]}>
            <Text style={[styles.modalTitle, isDarkMode && styles.textDark]}>Filtrar Período</Text>
            {PERIOD_OPTIONS.map((opt) => {
              const isSel = selectedPeriod === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.modalOptionBtn,
                    isSel && styles.modalOptionBtnActive,
                    isDarkMode && isSel && styles.modalOptionBtnActiveDark,
                  ]}
                  onPress={() => {
                    setSelectedPeriod(opt.id);
                    setShowPeriodModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      isSel && styles.modalOptionTextActive,
                      isDarkMode && styles.textDark,
                      isDarkMode && isSel && styles.textPrimaryDark,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {isSel && <Check size={16} color="#2563eb" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

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
    paddingTop: 12,
    paddingBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    maxWidth: 180,
  },
  selectBtnDark: {
    backgroundColor: '#1e293b',
  },
  selectBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  moreBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  moreBtnDark: {
    backgroundColor: '#1e293b',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    elevation: 5,
  },
  modalCardDark: {
    backgroundColor: '#1e293b',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
  },
  modalOptionBtnActive: {
    backgroundColor: '#eff6ff',
  },
  modalOptionBtnActiveDark: {
    backgroundColor: '#1e3a8a/30',
  },
  modalOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  modalOptionTextActive: {
    color: '#2563eb',
    fontWeight: '900',
  },
  textDark: {
    color: '#f8fafc',
  },
  textMuted: {
    color: '#64748b',
  },
  textPrimaryDark: {
    color: '#60a5fa',
  },
});
