import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SectionList, ActivityIndicator, RefreshControl, StyleSheet, Platform, StatusBar, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Hammer, RefreshCw, ChevronRight, ChevronDown, Calendar, Clock, MapPin, Navigation, Package, Truck, AlertCircle, Check } from 'lucide-react-native';
import { supabase } from '../../../services/supabaseClient';
import { isAssemblyOutsideType, isAssemblyInternalType } from '../../../utils/aiSummaryHelper';
import { formatFullAddress, groupOrdersByDate, formatItemNameExact, isDateInPeriod } from '../../../utils/orderUtils';

interface Props {
  isDarkMode: boolean;
  initialSubTab?: 'internal' | 'outside';
  onSelectOrder?: (order: any) => void;
}

const PERIOD_OPTIONS = [
  { id: 'today_and_following', label: 'Hoje e Dias Seguintes' },
  { id: 'today', label: 'Hoje' },
  { id: 'this_week', label: 'Esta Semana' },
  { id: 'this_month', label: 'Este Mês' },
  { id: 'last_30_days', label: 'Últimos 30 Dias' },
  { id: 'all', label: 'Todos' },
];

export const NativeAssembliesScreen: React.FC<Props> = ({ isDarkMode, initialSubTab = 'internal', onSelectOrder }) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0) + 8;

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subTab, setSubTab] = useState<'internal' | 'outside'>(initialSubTab);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('today_and_following');
  const [showPeriodModal, setShowPeriodModal] = useState<boolean>(false);
  const [handlingOptions, setHandlingOptions] = useState<any[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    sem_data: true, // Montagens a Agendar fechadas por padrão
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

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  const fetchAssemblies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setOrders(data);
      }
    } catch (err) {
      console.warn('[NativeAssemblies] Erro ao buscar montagens:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAssemblies();
    fetchSettings();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAssemblies();
    fetchSettings();
  };

  const toggleSection = (key: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const currentPeriodLabel = PERIOD_OPTIONS.find(p => p.id === selectedPeriod)?.label || 'Hoje e Dias Seguintes';

  const filteredAssemblies = orders.filter(o => {
    const oData = o.order_data || {};
    if (oData.deleted || o.deleted) return false;
    const orderStatus = (o.status || oData.status || '').toLowerCase();
    if (orderStatus === 'draft' || orderStatus === 'rascunho') return false;

    // Filtro por Período
    const shipping = oData.shipping || {};
    const sched = shipping.scheduling || oData.schedule || oData.scheduling || o.schedule || {};
    const rawSchedDate = sched.date || sched.startDate || o.scheduled_date || o.date || '';

    const isPending = sched.pendingScheduling || sched.notInformed || oData.pendingScheduling || o.pending_scheduling || !rawSchedDate || rawSchedDate === 'sem_data';

    if (!isPending && selectedPeriod !== 'all') {
      const isInPeriod = isDateInPeriod(rawSchedDate || o.created_at, selectedPeriod);
      if (!isInPeriod) return false;
    }

    const items = oData.items || o.items || [];
    const orderHandling = (oData.handlingType || oData.handling || oData.deliveryType || shipping.handlingType || shipping.handling || o.handling || o.handlingType || '').toString();
    const isOrderAssemblyOutside = isAssemblyOutsideType(orderHandling, handlingOptions);

    const hasItemAssemblyOutside = items.some((item: any) => {
      const itemHandling = (item.handlingType || item.handling || '').toString();
      return itemHandling ? isAssemblyOutsideType(itemHandling, handlingOptions) : isOrderAssemblyOutside;
    });

    if (subTab === 'outside') return hasItemAssemblyOutside;
    return !hasItemAssemblyOutside && items.length > 0;
  });

  const rawGrouped = groupOrdersByDate(filteredAssemblies);
  const sections = rawGrouped.map(g => {
    const isPending = g.dateKey === 'sem_data';
    return {
      title: isPending ? 'Montagens a Agendar' : g.dateLabel,
      key: g.dateKey,
      isPending,
      count: g.orders.length,
      fullData: g.orders,
      data: collapsedSections[g.dateKey] ? [] : g.orders,
    };
  });

  const formatDisplayTime = (sched: any, order: any): string => {
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
    const items = oData.items || o.items || [];
    const sched = shipping.scheduling || oData.schedule || {};
    const displayTime = formatDisplayTime(sched, o);

    const deliveryMethod = (shipping.deliveryMethod || oData.deliveryMethod || '').toLowerCase();
    const isPickup = deliveryMethod === 'pickup' || deliveryMethod === 'retirada';

    const distanceKm = shipping.distance != null ? Number(shipping.distance).toFixed(1) : null;
    const durationMin = shipping.durationMinutes != null ? Math.round(Number(shipping.durationMinutes)) : null;

    return (
      <TouchableOpacity
        key={o.id}
        onPress={() => onSelectOrder && onSelectOrder(o)}
        style={[styles.card, isDarkMode && styles.cardDark]}
      >
        {/* Top Badges Row */}
        <View style={styles.cardHeaderTop}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <View style={[styles.handlingBadge, isPickup ? styles.badgePickup : styles.badgeDelivery]}>
              {isPickup ? <Package size={12} color="#ffffff" /> : <Truck size={12} color="#ffffff" />}
              <Text style={styles.handlingBadgeText}>{isPickup ? 'RETIRADA' : 'ENTREGA'}</Text>
            </View>
          </View>
        </View>

        {/* Time & Status Row */}
        <View style={[styles.timeRow, isDarkMode && styles.timeRowDark]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Clock size={15} color={subTab === 'outside' ? '#ef4444' : '#7c3aed'} />
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
                <Navigation size={13} color="#7c3aed" />
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#7c3aed' }}>{distanceKm} KM</Text>
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
            <Text style={styles.itemsSectionTitle}>MÓVEIS PARA MONTAR</Text>
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
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerPadding}>
      <View style={styles.topRow}>
        <Text style={[styles.screenTitle, isDarkMode && styles.textDark]}>Cronograma de Montagens</Text>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Botão Select de Período estilo Dashboard */}
          <TouchableOpacity
            style={[styles.selectBtn, isDarkMode && styles.selectBtnDark]}
            onPress={() => setShowPeriodModal(true)}
          >
            <Calendar size={13} color={subTab === 'outside' ? '#ef4444' : '#7c3aed'} style={{ marginRight: 6 }} />
            <Text style={[styles.selectBtnText, isDarkMode && styles.textDark]}>
              {currentPeriodLabel}
            </Text>
            <ChevronDown size={14} color={isDarkMode ? '#cbd5e1' : '#64748b'} style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          <TouchableOpacity onPress={onRefresh} style={{ padding: 6 }}>
            <RefreshCw size={16} color={isDarkMode ? '#94a3b8' : '#64748b'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sub-tabs: Montagem Na Loja vs Montagem Fora */}
      <View style={[styles.tabsRow, isDarkMode && styles.tabsRowDark]}>
        <TouchableOpacity
          style={[styles.tabBtn, subTab === 'internal' && styles.tabBtnActive]}
          onPress={() => setSubTab('internal')}
        >
          <Text style={[styles.tabBtnText, subTab === 'internal' && styles.tabBtnTextActive]}>
            Montagem na Loja
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, subTab === 'outside' && styles.tabBtnOutsideActive]}
          onPress={() => setSubTab('outside')}
        >
          <Text style={[styles.tabBtnText, subTab === 'outside' && styles.tabBtnTextActive]}>
            Montagem Fora
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
                  {isSel && <Check size={16} color={subTab === 'outside' ? '#ef4444' : '#7c3aed'} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Lista com Tópicos Sticky Dobráveis */}
      {loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={subTab === 'outside' ? '#ef4444' : '#7c3aed'} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b', marginTop: 10 }}>Carregando montagens...</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => item?.id ? String(item.id) : String(index)}
          stickySectionHeadersEnabled={true}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Hammer size={40} color="#cbd5e1" />
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#64748b', marginTop: 12 }}>
                Nenhuma montagem {subTab === 'outside' ? 'fora' : 'na loja'} encontrada
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderSectionHeader={({ section }) => {
            const isCollapsed = !!collapsedSections[section.key];
            const isPending = section.isPending;

            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => toggleSection(section.key)}
                style={[
                  styles.stickySectionHeader,
                  isPending ? styles.stickySectionHeaderPending : (subTab === 'outside' ? styles.stickySectionHeaderOutside : styles.stickySectionHeaderInternal),
                  isDarkMode && styles.stickySectionHeaderDark
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  {isPending ? (
                    <AlertCircle size={16} color="#d97706" />
                  ) : (
                    <Calendar size={16} color={subTab === 'outside' ? '#ef4444' : '#7c3aed'} />
                  )}
                  <Text style={[
                    styles.stickySectionTitle,
                    isPending && { color: '#92400e' },
                    isDarkMode && styles.textDark
                  ]}>
                    {section.title}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[
                    styles.stickySectionBadge,
                    { backgroundColor: isPending ? '#d97706' : (subTab === 'outside' ? '#ef4444' : '#7c3aed') }
                  ]}>
                    <Text style={styles.stickySectionBadgeText}>
                      {section.count} {section.count === 1 ? 'montagem' : 'montagens'}
                    </Text>
                  </View>
                  {isCollapsed ? (
                    <ChevronRight size={18} color={isPending ? '#d97706' : (subTab === 'outside' ? '#ef4444' : '#7c3aed')} />
                  ) : (
                    <ChevronDown size={18} color={isPending ? '#d97706' : (subTab === 'outside' ? '#ef4444' : '#7c3aed')} />
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          renderItem={({ item }) => renderCard(item)}
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
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
    backgroundColor: '#f5f3ff'
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
    color: '#7c3aed',
    fontWeight: '900'
  },
  tabsRow: { flexDirection: 'row', backgroundColor: '#ffffff', borderRadius: 14, padding: 3, borderWidth: 1, borderColor: '#e2e8f0' },
  tabsRowDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 11 },
  tabBtnActive: { backgroundColor: '#7c3aed' },
  tabBtnOutsideActive: { backgroundColor: '#ef4444' },
  tabBtnText: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  tabBtnTextActive: { color: '#ffffff' },
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
  stickySectionHeaderInternal: {
    backgroundColor: '#f5f3ff',
    borderColor: '#ddd6fe'
  },
  stickySectionHeaderOutside: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3'
  },
  stickySectionHeaderPending: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a'
  },
  stickySectionHeaderDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155'
  },
  stickySectionTitle: { fontSize: 13, fontWeight: '900', color: '#0f172a' },
  stickySectionBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  stickySectionBadgeText: { fontSize: 10, fontWeight: '900', color: '#ffffff' },
  card: { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', gap: 10, elevation: 2, marginBottom: 12 },
  cardDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  cardHeaderTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  handlingBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 3.5, borderRadius: 10 },
  badgeDelivery: { backgroundColor: '#10b981' },
  badgePickup: { backgroundColor: '#a855f7' },
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
  routeMetricsBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f5f3ff', borderRadius: 12, borderWidth: 1, borderColor: '#ddd6fe' },
  routeMetricsBoxDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  itemsContainer: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#f1f5f9', gap: 8 },
  itemsContainerDark: { backgroundColor: '#0f172a', borderColor: '#1e293b' },
  itemsSectionTitle: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 0.5 },
  itemsPillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  itemPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  itemPillDefault: { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' },
  itemPillInternal: { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
  itemPillOutside: { backgroundColor: '#fff1f2', borderColor: '#fecdd3' },
  itemPillDark: { backgroundColor: '#1e293b' },
  itemPillText: { fontSize: 11, fontWeight: '700' },
  itemPillTextDefault: { color: '#64748b' },
  itemPillTextInternal: { color: '#b45309' },
  itemPillTextOutside: { color: '#991b1b' }
});
