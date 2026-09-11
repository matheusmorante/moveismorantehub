import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SectionList, ActivityIndicator, RefreshControl, StyleSheet, Modal } from 'react-native';
import { Calendar, Truck, ChevronRight, ChevronDown, AlertCircle, Check, Map } from 'lucide-react-native';
import { supabase } from '../../../services/supabaseClient';
import { subscribeToLogisticsChanges } from '../../../services/logisticsRealtimeService';
import { groupOrdersByDate, isCancelledOrder, isDateInPeriod, formatGroupDateLabel } from '../../../utils/orderUtils';
import { getOperationalScheduleDate } from '../../../utils/operationalSchedule';
import { offlineStorageService } from '../../../services/offline/offlineStorageService';
import { TodayDeliveriesScreen } from './TodayDeliveriesScreen';
import { PERIOD_OPTIONS } from '../components/LogisticsPeriodModal';
import { LogisticsOrderCard } from '../components/LogisticsOrderCard';

interface Props {
  isDarkMode: boolean;
  isAdmin: boolean;
  onSelectOrder?: (order: any) => void;
  isEmbeddedInHub?: boolean;
  title?: string;
  onNavigateToDeliveriesMap?: () => void;
}

export const NativeLogisticsScreen: React.FC<Props> = ({
  isDarkMode,
  onSelectOrder,
  isEmbeddedInHub = false,
  title,
  onNavigateToDeliveriesMap,
}) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('today_and_following');
  const [showPeriodModal, setShowPeriodModal] = useState<boolean>(false);
  const [handlingOptions, setHandlingOptions] = useState<any[]>([]);
  const [showTodayMap, setShowTodayMap] = useState<boolean>(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    sem_data: true,
  });

  const fetchSettings = async () => {
    try {
      const { data } = await supabase.from('settings').select('*').limit(1);
      if (data && data.length > 0) {
        const sData = data[0]?.data || data[0];
        const opts = [
          ...(sData.deliveryHandlingOptions || []),
          ...(sData.pickupHandlingOptions || [])
        ];
        setHandlingOptions(opts);
      }
    } catch {}
  };

  const fetchSchedule = async () => {
    try {
      const cached = await offlineStorageService.getWorkingSet<any[]>('logistics_orders');
      if (cached?.data && orders.length === 0) {
        setOrders(cached.data);
        setLoading(false);
      }

      const { data, error } = await supabase
        .from('orders')
        .select('id, status, created_at, order_data')
        .or('order_data->>deleted.is.null,order_data->>deleted.eq.false')
        .order('created_at', { ascending: false })
        .limit(300);

      if (!error && data) {
        setOrders(data);
        await offlineStorageService.cacheWorkingSet('logistics_orders', data);
      }
    } catch (err) {
      console.warn('[NativeLogistics] Erro ao buscar cronograma logístico:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
    fetchSettings();

    return subscribeToLogisticsChanges(() => {
      fetchSchedule();
      fetchSettings();
    });
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSchedule();
    fetchSettings();
  };

  const toggleSection = (key: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const currentPeriodLabel = PERIOD_OPTIONS.find(p => p.id === selectedPeriod)?.label || 'A partir de hoje';

  const deliveryOrders = orders.filter((o) => {
    const oData = o.order_data || {};
    if (oData.deleted || o.deleted || isCancelledOrder(o)) return false;
    const orderStatus = (o.status || oData.status || '').toLowerCase();
    if (orderStatus === 'draft' || orderStatus === 'rascunho' || orderStatus === 'drafts') return false;

    const shipping = oData.shipping || {};
    const sched = shipping.scheduling || oData.schedule || oData.scheduling || o.schedule || {};
    const rawSchedDate = getOperationalScheduleDate(o);

    const isExplicitlyPending = !!(
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

  const todayStr = new Date().toLocaleDateString('en-CA');
  const rawGrouped = groupOrdersByDate(deliveryOrders);

  const getDatesInPeriod = (period: string): string[] => {
    const dates: string[] = [];
    const now = new Date();
    
    if (period === 'today') {
      dates.push(now.toLocaleDateString('en-CA'));
    } else if (period === 'today_and_following') {
      for (let i = 0; i <= 7; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() + i);
        dates.push(d.toLocaleDateString('en-CA'));
      }
    } else if (period === 'this_week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now);
      monday.setDate(diff);

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        dates.push(d.toLocaleDateString('en-CA'));
      }
    } else if (period === 'this_month') {
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i);
        dates.push(d.toLocaleDateString('en-CA'));
      }
    } else if (period === 'last_30_days') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        dates.push(d.toLocaleDateString('en-CA'));
      }
    }
    
    return dates;
  };

  const datesInPeriod = getDatesInPeriod(selectedPeriod);
  const mergedGroupsMap: Record<string, any[]> = {};
  rawGrouped.forEach(g => {
    mergedGroupsMap[g.dateKey] = g.orders;
  });

  datesInPeriod.forEach(d => {
    if (!mergedGroupsMap[d]) {
      mergedGroupsMap[d] = [];
    }
  });

  const sortedKeys = Object.keys(mergedGroupsMap).sort((a, b) => {
    if (a === 'sem_data') return -1;
    if (b === 'sem_data') return 1;
    return a.localeCompare(b);
  });

  const sections = sortedKeys.map(key => {
    const isPending = key === 'sem_data';
    const ordersForDay = mergedGroupsMap[key];
    const count = ordersForDay.length;
    
    const isCollapsed = collapsedSections[key] === undefined
      ? key !== todayStr
      : !!collapsedSections[key];

    const label = isPending ? 'Agendamentos Pendentes' : formatGroupDateLabel(key);

    return {
      title: label,
      key,
      isPending,
      count,
      fullData: ordersForDay,
      data: isCollapsed 
        ? [] 
        : (count === 0 ? [{ id: `empty-${key}`, isEmptyPlaceholder: true }] : ordersForDay),
    };
  });

  const renderHeader = () => (
    <View style={styles.headerPadding}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.screenTitle, isDarkMode && styles.textDark]}>{title || 'Agenda'}</Text>
          <Text style={[styles.screenSubtitle, isDarkMode && styles.subtitleDark]}>
            Cronograma Logístico e Agendamentos
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.selectBtn, isDarkMode && styles.selectBtnDark]}
          onPress={() => setShowPeriodModal(true)}
        >
          <Calendar size={13} color="#2563eb" style={{ marginRight: 4 }} />
          <Text 
            numberOfLines={1} 
            ellipsizeMode="tail"
            style={[styles.selectBtnText, isDarkMode && styles.textDark]}
          >
            {currentPeriodLabel}
          </Text>
          <ChevronDown size={14} color={isDarkMode ? '#cbd5e1' : '#64748b'} style={{ marginLeft: 2 }} />
        </TouchableOpacity>
      </View>

      {!isEmbeddedInHub && (
        <TouchableOpacity
          style={[styles.mapBannerBtn, isDarkMode && styles.mapBannerBtnDark]}
          onPress={() => {
            if (onNavigateToDeliveriesMap) {
              onNavigateToDeliveriesMap();
            } else {
              setShowTodayMap(true);
            }
          }}
          activeOpacity={0.85}
        >
          <View style={styles.mapBannerLeft}>
            <View style={styles.mapIconCircle}>
              <Map size={16} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.mapBannerTitle, isDarkMode && styles.textDark]}>
                Entregas de Hoje no Mapa
              </Text>
              <Text style={styles.mapBannerSubtitle}>
                Visualizar roteiro, GPS e próxima parada
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color="#2563eb" />
        </TouchableOpacity>
      )}
    </View>
  );

  if (showTodayMap) {
    return (
      <TodayDeliveriesScreen
        isDarkMode={isDarkMode}
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
                  style={[styles.modalOptionBtn, isSel && styles.modalOptionActive, isDarkMode && isSel && styles.modalOptionActiveDark]}
                  onPress={() => {
                    setSelectedPeriod(opt.id);
                    setShowPeriodModal(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, isSel && styles.modalOptionTextActive, isDarkMode && styles.textDark]}>
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
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b', marginTop: 10 }}>Carregando cronograma logístico...</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => item?.id ? String(item.id) : String(index)}
          stickySectionHeadersEnabled={true}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Truck size={40} color="#cbd5e1" />
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#64748b', marginTop: 12 }}>Nenhum agendamento logístico encontrado</Text>
            </View>
          }
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderSectionHeader={({ section }) => {
            const isCollapsed = collapsedSections[section.key] === undefined
              ? section.key !== todayStr
              : !!collapsedSections[section.key];
            const isPending = section.isPending;
            const isEmpty = section.count === 0;

            let headerStyle = styles.stickySectionHeaderDefault;
            if (isPending) {
              headerStyle = styles.stickySectionHeaderPending;
            } else if (isEmpty) {
              headerStyle = styles.stickySectionHeaderEmpty;
            }

            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => toggleSection(section.key)}
                style={[
                  styles.stickySectionHeader,
                  headerStyle,
                  isDarkMode && styles.stickySectionHeaderDark
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  {isPending ? (
                    <AlertCircle size={16} color="#d97706" />
                  ) : (
                    <Calendar size={16} color={isEmpty ? (isDarkMode ? '#475569' : '#94a3b8') : '#2563eb'} />
                  )}
                  <Text style={[
                    styles.stickySectionTitle,
                    isPending && { color: '#92400e' },
                    isEmpty && { color: isDarkMode ? '#64748b' : '#94a3b8' },
                    isDarkMode && styles.textDark
                  ]}>
                    {section.title}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[
                    styles.stickySectionBadge,
                    isPending && { backgroundColor: '#d97706' },
                    isEmpty && { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }
                  ]}>
                    <Text style={[
                      styles.stickySectionBadgeText,
                      isEmpty && { color: isDarkMode ? '#cbd5e1' : '#64748b' }
                    ]}>
                      {section.count} {section.count === 1 ? 'item' : 'itens'}
                    </Text>
                  </View>
                  {isCollapsed ? (
                    <ChevronRight size={18} color={isPending ? '#d97706' : (isEmpty ? '#94a3b8' : '#2563eb')} />
                  ) : (
                    <ChevronDown size={18} color={isPending ? '#d97706' : (isEmpty ? '#94a3b8' : '#2563eb')} />
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          renderItem={({ item }) => {
            if (item.isEmptyPlaceholder) {
              return (
                <View style={[styles.emptyDayBox, isDarkMode && styles.emptyDayBoxDark]}>
                  <Text style={styles.emptyDayText}>Nenhuma entrega agendada</Text>
                </View>
              );
            }
            return (
              <LogisticsOrderCard
                order={item}
                handlingOptions={handlingOptions}
                isDarkMode={isDarkMode}
                onSelectOrder={onSelectOrder}
              />
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  containerDark: { backgroundColor: '#0f172a' },
  headerPadding: { paddingVertical: 12, gap: 10 },
  topRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    flexWrap: 'wrap', 
    gap: 8 
  },
  screenTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  screenSubtitle: { fontSize: 11, fontWeight: '700', color: '#64748b', marginTop: 1 },
  textDark: { color: '#f8fafc' },
  subtitleDark: { color: '#94a3b8' },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxWidth: 160,
  },
  selectBtnDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  selectBtnText: { fontSize: 12, fontWeight: '800', color: '#2563eb' },
  mapBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginTop: 4,
  },
  mapBannerBtnDark: { backgroundColor: '#1e3a8a33', borderColor: '#1e40af' },
  mapBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  mapIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapBannerTitle: { fontSize: 13, fontWeight: '900', color: '#1e3a8a' },
  mapBannerSubtitle: { fontSize: 11, color: '#64748b', marginTop: 1 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyBox: { justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  stickySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginVertical: 4,
  },
  stickySectionHeaderDefault: { backgroundColor: '#dbeafe' },
  stickySectionHeaderPending: { backgroundColor: '#fef3c7' },
  stickySectionHeaderEmpty: { backgroundColor: '#f1f5f9' },
  stickySectionHeaderDark: { backgroundColor: '#1e293b' },
  stickySectionTitle: { fontSize: 13, fontWeight: '900' },
  stickySectionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, backgroundColor: '#2563eb' },
  stickySectionBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: '900' },
  emptyDayBox: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  emptyDayBoxDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  emptyDayText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 340,
    gap: 8,
  },
  modalCardDark: { backgroundColor: '#1e293b' },
  modalTitle: { fontSize: 15, fontWeight: '900', color: '#0f172a', marginBottom: 8 },
  modalOptionBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  modalOptionActive: { backgroundColor: '#eff6ff' },
  modalOptionActiveDark: { backgroundColor: '#0f172a' },
  modalOptionText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  modalOptionTextActive: { color: '#2563eb', fontWeight: '900' },
});
