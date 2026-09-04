import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SectionList, ActivityIndicator, RefreshControl, StyleSheet, Platform, StatusBar, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Truck, RefreshCw, ChevronRight, ChevronDown, Hammer, Clock, MapPin, Navigation, Package, AlertCircle, Wrench, Check, Map } from 'lucide-react-native';
import { MobileDrill } from '../../../components/shared/MobileDrill';
import { supabase } from '../../../services/supabaseClient';
import { subscribeToLogisticsChanges } from '../../../services/logisticsRealtimeService';
import { isAssemblyOutsideType, isAssemblyInternalType } from '../../../utils/aiSummaryHelper';
import { formatFullAddress, groupOrdersByDate, formatItemNameExact, isCancelledOrder, isDateInPeriod, formatGroupDateLabel } from '../../../utils/orderUtils';
import { OrderCardDeliveryFooter } from '../../../components/cards/OrderCardDeliveryFooter';
import { getOperationalScheduleDate } from '../../../utils/operationalSchedule';
import { offlineStorageService } from '../../../services/offline/offlineStorageService';
import { TodayDeliveriesScreen } from './TodayDeliveriesScreen';

interface Props {
  isDarkMode: boolean;
  isAdmin: boolean;
  onSelectOrder?: (order: any) => void;
  isEmbeddedInHub?: boolean;
}

const PERIOD_OPTIONS = [
  { id: 'today_and_following', label: 'A partir de hoje' },
  { id: 'today', label: 'Hoje' },
  { id: 'tomorrow', label: 'Amanhã' },
  { id: 'this_week', label: 'Esta Semana' },
  { id: 'this_month', label: 'Este Mês' },
  { id: 'last_30_days', label: 'Últimos 30 Dias' },
  { id: 'all', label: 'Todos' },
];

export const NativeLogisticsScreen: React.FC<Props> = ({ isDarkMode, isAdmin, onSelectOrder, isEmbeddedInHub = false }) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0) + 8;

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('today_and_following');
  const [showPeriodModal, setShowPeriodModal] = useState<boolean>(false);
  const [handlingOptions, setHandlingOptions] = useState<any[]>([]);
  const [showTodayMap, setShowTodayMap] = useState<boolean>(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    sem_data: true, // Entregas a Agendar fechadas por padrão
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
    } catch (err) {}
  };

  const fetchSchedule = async () => {
    try {
      // 1. Tenta carregar dados do cache de trabalho local primeiro (resposta instantânea)
      const cached = await offlineStorageService.getWorkingSet<any[]>('logistics_orders');
      if (cached?.data && orders.length === 0) {
        setOrders(cached.data);
        setLoading(false);
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setOrders(data);
        // Atualiza o cache local para a próxima consulta offline
        await offlineStorageService.cacheWorkingSet('logistics_orders', data);
      }
    } catch (err) {
      console.warn('[NativeLogistics] Erro ao buscar cronograma logístico (usando cache local se disponível):', err);
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

    // Considera PENDENTE apenas se o pedido foi marcado explicitamente como "Agendar Depois"
    const isExplicitlyPending = !!(
      sched.pendingScheduling ||
      oData.pendingScheduling ||
      o.pending_scheduling ||
      orderStatus === 'pending_scheduling' ||
      orderStatus === 'agendar_depois'
    );

    if (isExplicitlyPending) return true;

    // Se não tem data agendada nem foi marcado para agendar depois, ignora
    if (!rawSchedDate || rawSchedDate === 'sem_data') return false;

    if (selectedPeriod === 'all') return true;
    return isDateInPeriod(rawSchedDate || o.created_at, selectedPeriod);
  });

  const todayStr = new Date().toLocaleDateString('en-CA'); // 'YYYY-MM-DD' em formato local estável

  const rawGrouped = groupOrdersByDate(deliveryOrders);

  // 1. Obter todas as datas do período selecionado
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

  // 2. Criar seções vazias para datas sem entrega no período
  const mergedGroupsMap: Record<string, any[]> = {};
  rawGrouped.forEach(g => {
    mergedGroupsMap[g.dateKey] = g.orders;
  });

  datesInPeriod.forEach(d => {
    if (!mergedGroupsMap[d]) {
      mergedGroupsMap[d] = [];
    }
  });

  // Ordenar cronologicamente
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

  const formatDisplayTime = (sched: any, order: any): string => {
    if (order?.order_type === 'assistance' && order?.scheduled_time) {
      return order.scheduled_time;
    }
    if (sched?.startTime && sched?.endTime && sched.startTime !== sched.endTime) {
      return `${sched.startTime} - ${sched.endTime}`;
    }
    if (sched?.startTime) return sched.startTime;
    if (sched?.time) return sched.time;
    if (order?.scheduled_time) return order.scheduled_time;
    return 'Horário não definido';
  };

  const renderCard = (o: any) => {
    const oData = o.order_data || {};
    const customerName = (oData.customerData?.fullName || o.customer_name || 'Consumidor').toUpperCase();
    const shipping = oData.shipping || {};
    const fullAddress = formatFullAddress(shipping, oData.customerData);
    const sched = shipping.scheduling || oData.schedule || {};
    const displayTime = formatDisplayTime(sched, o);
    const items = oData.items || o.items || oData.assistanceItems || o.assistance_items || [];

    const orderType = (o.order_type || oData.orderType || '').toLowerCase();
    const taskType = (o.task_type || oData.taskType || '').toLowerCase();
    const deliveryMethod = (shipping.deliveryMethod || oData.deliveryMethod || '').toLowerCase();

    const isAssistance = orderType === 'assistance' || taskType === 'assistance';
    const isPickup = deliveryMethod === 'pickup' || deliveryMethod === 'retirada' || taskType === 'pickup';

    const orderHandling = (
      oData.handlingType ||
      oData.handling ||
      oData.deliveryType ||
      shipping.handlingType ||
      shipping.handling ||
      o.handling ||
      ''
    ).toString();

    const hasOutsideAssembly = isAssemblyOutsideType(orderHandling, handlingOptions) || items.some((i: any) => isAssemblyOutsideType((i.handlingType || i.handling || '').toString(), handlingOptions));
    const hasInternalAssembly = isAssemblyInternalType(orderHandling, handlingOptions) || items.some((i: any) => isAssemblyInternalType((i.handlingType || i.handling || '').toString(), handlingOptions));

    const distanceKm = shipping.distance != null ? Number(shipping.distance).toFixed(1) : null;
    const durationMin = shipping.durationMinutes != null ? Math.round(Number(shipping.durationMinutes)) : null;

    let cardBorderColor = '#10b981'; // verde = entrega (padrão)
    if (isAssistance) cardBorderColor = '#f59e0b'; // âmbar = assistência
    else if (isPickup) cardBorderColor = '#a855f7'; // roxo = retirada

    return (
      <TouchableOpacity
        key={o.id}
        onPress={() => onSelectOrder && onSelectOrder(o)}
        style={[
          styles.card,
          { borderColor: cardBorderColor },
          isDarkMode && styles.cardDark
        ]}
      >
        {/* Top Badges Row */}
        <View style={styles.cardHeaderTop}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <View style={[
              styles.handlingBadge,
              isAssistance ? styles.badgeAssistance : (isPickup ? styles.badgePickup : styles.badgeDelivery)
            ]}>
              {isAssistance ? (
                <Wrench size={12} color="#ffffff" />
              ) : isPickup ? (
                <Package size={12} color="#ffffff" />
              ) : (
                <Truck size={12} color="#ffffff" />
              )}
              <Text style={styles.handlingBadgeText}>
                {isAssistance ? 'ASSISTÊNCIA' : (isPickup ? 'RETIRADA' : 'ENTREGA')}
              </Text>
            </View>

            {hasInternalAssembly && (
              <View style={[styles.handlingBadge, styles.badgeInternal]}>
                <MobileDrill size={12} color="#ffffff" />
                <Text style={styles.handlingBadgeText}>MONTAGEM DEPÓSITO</Text>
              </View>
            )}

            {hasOutsideAssembly && (
              <View style={[styles.handlingBadge, styles.badgeOutside]}>
                <MobileDrill size={12} color="#ffffff" />
                <Text style={styles.handlingBadgeText}>MONTAGEM FORA</Text>
              </View>
            )}
          </View>
        </View>

        {/* Time & Status Row */}
        <View style={[styles.timeRow, isDarkMode && styles.timeRowDark]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Clock size={15} color={cardBorderColor} />
            <Text style={[styles.timeText, isDarkMode && styles.textDark]}>{displayTime}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>AGENDADO</Text>
          </View>
        </View>

        {/* Customer Name */}
        <Text style={[styles.customerName, isDarkMode && styles.textDark]}>{customerName}</Text>

        {/* Address Box */}
        <View style={[styles.addressBox, isDarkMode && styles.addressBoxDark]}>
          <MapPin size={15} color="#ef4444" style={{ marginTop: 2 }} />
          <Text style={[styles.addressText, isDarkMode && styles.textDark]}>{fullAddress}</Text>
        </View>

        {/* Distance & Time Box */}
        {(distanceKm || durationMin) ? (
          <View style={[styles.routeMetricsBox, isDarkMode && styles.routeMetricsBoxDark]}>
            {distanceKm ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Navigation size={13} color={cardBorderColor} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: cardBorderColor }}>{distanceKm} KM</Text>
              </View>
            ) : null}
            {distanceKm && durationMin ? <Text style={{ color: '#cbd5e1' }}>|</Text> : null}
            {durationMin ? (
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748b' }}>~ {durationMin} MIN</Text>
            ) : null}
          </View>
        ) : null}

        {/* Items Container Pills */}
        {items.length > 0 ? (
          <View style={[styles.itemsContainer, isDarkMode && styles.itemsContainerDark]}>
            <Text style={styles.itemsSectionTitle}>
              {isAssistance ? 'PEÇAS / MATERIAIS' : 'ITENS DO PEDIDO'}
            </Text>
            <View style={styles.itemsPillsRow}>
              {items.map((item: any, idx: number) => {
                const qty = Number(item.quantity || item.qty || 1);
                const name = formatItemNameExact(item);
                const itemHandling = (item.handlingType || item.handling || '').toString();
                
                const isItemOutside = isAssemblyOutsideType(itemHandling, handlingOptions);
                const isItemInternal = isAssemblyInternalType(itemHandling, handlingOptions);

                return (
                  <View
                    key={idx}
                    style={[
                      styles.itemPill,
                      isItemOutside ? styles.itemPillOutside : (isItemInternal ? styles.itemPillInternal : styles.itemPillDefault),
                      isDarkMode && styles.itemPillDark
                    ]}
                  >
                    <Text style={[
                      styles.itemPillText,
                      isItemOutside ? styles.itemPillTextOutside : (isItemInternal ? styles.itemPillTextInternal : styles.itemPillTextDefault),
                      isDarkMode && isItemOutside && { color: '#fca5a5' },
                      isDarkMode && isItemInternal && { color: '#fcd34d' },
                      isDarkMode && !isItemOutside && !isItemInternal && { color: '#cbd5e1' }
                    ]}>
                      <Text style={{ fontWeight: '900' }}>{qty}x</Text> {name}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Rodapé de Etapas da Entrega (Em Preparação / Em Rota / Em Atendimento / Não Atendido / Concluído) */}
        <OrderCardDeliveryFooter order={o} dark={isDarkMode} onPress={() => onSelectOrder && onSelectOrder(o)} />
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerPadding}>
      <View style={styles.topRow}>
        <Text style={[styles.screenTitle, isDarkMode && styles.textDark]}>Cronograma Logístico</Text>
        
        {/* Botão Select de Período posicionado à direita */}
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

      {/* Banner de Acesso Rápido ao Mapa de Entregas de Hoje (apenas se fora do hub unificado) */}
      {!isEmbeddedInHub && (
        <TouchableOpacity
          style={[styles.mapBannerBtn, isDarkMode && styles.mapBannerBtnDark]}
          onPress={() => setShowTodayMap(true)}
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
      {/* Modal Select de Período */}
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

      {/* Lista com Tópicos Sticky Dobráveis */}
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
            const todayStr = new Date().toLocaleDateString('en-CA');
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
            return renderCard(item);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  containerDark: { backgroundColor: '#0f172a' },
  headerPadding: {
    paddingVertical: 12,
    gap: 10
  },
  topRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    flexWrap: 'wrap', 
    gap: 8 
  },
  screenTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  textDark: { color: '#f8fafc' },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    elevation: 1
  },
  selectBtnDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155'
  },
  selectBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    gap: 8
  },
  modalCardDark: {
    backgroundColor: '#1e293b'
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 8
  },
  modalOptionBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#f8fafc'
  },
  modalOptionActive: {
    backgroundColor: '#eff6ff'
  },
  modalOptionActiveDark: {
    backgroundColor: '#0f172a'
  },
  modalOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569'
  },
  modalOptionTextActive: {
    color: '#2563eb',
    fontWeight: '900'
  },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  stickySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginVertical: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  stickySectionHeaderDefault: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe'
  },
  stickySectionHeaderPending: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a'
  },
  stickySectionHeaderEmpty: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0'
  },
  stickySectionHeaderDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155'
  },
  emptyDayBox: {
    backgroundColor: '#f8fafc',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4
  },
  emptyDayBoxDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155'
  },
  emptyDayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8'
  },
  stickySectionTitle: { fontSize: 13, fontWeight: '900', color: '#1e3a8a' },
  stickySectionBadge: { backgroundColor: '#2563eb', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  stickySectionBadgeText: { fontSize: 10, fontWeight: '900', color: '#ffffff' },
  card: { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, borderWidth: 2, gap: 10, elevation: 2, marginBottom: 12 },
  cardDark: { backgroundColor: '#1e293b' },
  cardHeaderTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  handlingBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 3.5, borderRadius: 10 },
  badgeDelivery: { backgroundColor: '#10b981' },
  badgePickup: { backgroundColor: '#a855f7' },
  badgeAssistance: { backgroundColor: '#f59e0b' },
  badgeOutside: { backgroundColor: '#ef4444' },
  badgeInternal: { backgroundColor: '#f59e0b' },
  handlingBadgeText: { fontSize: 9, fontWeight: '900', color: '#ffffff', letterSpacing: 0.5 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  timeRowDark: { backgroundColor: '#0f172a', borderColor: '#1e293b' },
  timeText: { fontSize: 13, fontWeight: '900', color: '#0f172a' },
  statusBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: '#fde68a' },
  statusBadgeText: { fontSize: 9, fontWeight: '900', color: '#d97706' },
  customerName: { fontSize: 15, fontWeight: '900', color: '#0f172a', letterSpacing: 0.2 },
  addressBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#f8fafc', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#f1f5f9' },
  addressBoxDark: { backgroundColor: '#0f172a', borderColor: '#1e293b' },
  addressText: { flex: 1, fontSize: 12, fontWeight: '700', color: '#475569', lineHeight: 17 },
  routeMetricsBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#eff6ff', borderRadius: 12, borderWidth: 1, borderColor: '#dbeafe' },
  routeMetricsBoxDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  itemsContainer: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#f1f5f9', gap: 8 },
  itemsContainerDark: { backgroundColor: '#0f172a', borderColor: '#1e293b' },
  itemsSectionTitle: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 0.5 },
  itemsPillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  itemPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, maxWidth: '100%' },
  itemPillDefault: { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' },
  itemPillInternal: { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
  itemPillOutside: { backgroundColor: '#fff1f2', borderColor: '#fecdd3' },
  itemPillDark: { backgroundColor: '#1e293b' },
  itemPillText: { fontSize: 11, fontWeight: '700', flexShrink: 1 },
  itemPillTextDefault: { color: '#64748b' },
  itemPillTextInternal: { color: '#b45309' },
  itemPillTextOutside: { color: '#991b1b' },
  mapBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  mapBannerBtnDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  mapBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  mapIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapBannerTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
  },
  mapBannerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 1,
  },
});
