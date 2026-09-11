import React, { useState, useEffect } from 'react';
import { View, Text, SectionList, ActivityIndicator, RefreshControl, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, ChevronDown, ChevronUp, AlertCircle, Check } from 'lucide-react-native';
import { MobileDrill } from '../../../components/shared/MobileDrill';
import { supabase } from '../../../services/supabaseClient';
import { subscribeToLogisticsChanges } from '../../../services/logisticsRealtimeService';
import { isAssemblyOutsideType, isAssemblyInternalType } from '../../../utils/aiSummaryHelper';
import { groupOrdersByDate, isCancelledOrder, isDateInPeriod } from '../../../utils/orderUtils';
import { AssemblyOrderCard } from '../components/AssemblyOrderCard';

interface Props {
  isDarkMode: boolean;
  initialSubTab?: 'internal' | 'outside';
  onSelectOrder?: (order: any) => void;
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

export const NativeAssembliesScreen: React.FC<Props> = ({ isDarkMode, initialSubTab = 'internal', onSelectOrder }) => {
  const insets = useSafeAreaInsets();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subTab, setSubTab] = useState<'internal' | 'outside'>(initialSubTab);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('today_and_following');
  const [showPeriodModal, setShowPeriodModal] = useState<boolean>(false);
  const [handlingOptions, setHandlingOptions] = useState<any[]>([]);
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

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  const fetchAssemblies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('id, status, created_at, order_data')
        .or('order_data->>deleted.is.null,order_data->>deleted.eq.false')
        .order('created_at', { ascending: false })
        .limit(300);

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

    return subscribeToLogisticsChanges(() => {
      fetchAssemblies();
      fetchSettings();
    });
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

  const currentPeriodLabel = PERIOD_OPTIONS.find(p => p.id === selectedPeriod)?.label || 'A partir de hoje';

  const filteredAssemblies = orders.filter(o => {
    const oData = o.order_data || {};
    if (oData.deleted || o.deleted || isCancelledOrder(o)) return false;
    const orderStatus = (o.status || oData.status || '').toLowerCase();
    if (orderStatus === 'draft' || orderStatus === 'rascunho') return false;

    const shipping = oData.shipping || {};
    const sched = shipping.scheduling || oData.schedule || oData.scheduling || o.schedule || {};
    const rawSchedDate = sched.date || sched.startDate || o.scheduled_date || o.date || '';

    const isPending = sched.pendingScheduling || sched.notInformed || oData.pendingScheduling || o.pending_scheduling || !rawSchedDate || rawSchedDate === 'sem_data';
    if (isPending) return false;

    if (selectedPeriod !== 'all') {
      const isInPeriod = isDateInPeriod(rawSchedDate || o.created_at, selectedPeriod);
      if (!isInPeriod) return false;
    }

    const items = oData.items || o.items || [];
    const orderHandling = (oData.handlingType || oData.handling || oData.deliveryType || shipping.handlingType || shipping.handling || o.handling || o.handlingType || '').toString();
    const isOrderAssemblyOutside = isAssemblyOutsideType(orderHandling, handlingOptions);
    const isOrderAssemblyInternal = isAssemblyInternalType(orderHandling, handlingOptions);

    const hasItemAssemblyOutside = items.some((item: any) => {
      const itemHandling = (item.handlingType || item.handling || '').toString();
      return itemHandling ? isAssemblyOutsideType(itemHandling, handlingOptions) : isOrderAssemblyOutside;
    });

    const hasItemAssemblyInternal = items.some((item: any) => {
      const itemHandling = (item.handlingType || item.handling || '').toString();
      return itemHandling ? isAssemblyInternalType(itemHandling, handlingOptions) : isOrderAssemblyInternal;
    });

    if (subTab === 'outside') return hasItemAssemblyOutside;
    return hasItemAssemblyInternal;
  });

  const rawGrouped = groupOrdersByDate(filteredAssemblies).filter(g => g.dateKey !== 'sem_data');
  const sections = rawGrouped.map(g => ({
    title: g.dateLabel,
    key: g.dateKey,
    isPending: false,
    count: g.orders.length,
    fullData: g.orders,
    data: collapsedSections[g.dateKey] ? [] : g.orders,
  }));

  const renderHeader = () => (
    <View style={styles.headerPadding}>
      <Text style={[styles.screenTitle, isDarkMode && styles.textDark]}>Cronograma de Montagens</Text>

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 }}>
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
      </View>

      <View style={[styles.tabsRow, isDarkMode && styles.tabsRowDark]}>
        <TouchableOpacity
          style={[styles.tabBtn, subTab === 'internal' && styles.tabBtnActive]}
          onPress={() => setSubTab('internal')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MobileDrill size={13} color={subTab === 'internal' ? '#ffffff' : '#64748b'} />
            <Text style={[styles.tabBtnText, subTab === 'internal' && styles.tabBtnTextActive]}>
              Montagem Depósito
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, subTab === 'outside' && styles.tabBtnOutsideActive]}
          onPress={() => setSubTab('outside')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MobileDrill size={13} color={subTab === 'outside' ? '#ffffff' : '#64748b'} />
            <Text style={[styles.tabBtnText, subTab === 'outside' && styles.tabBtnTextActive]}>
              Montagem Fora
            </Text>
          </View>
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
                  {isSel && <Check size={16} color={subTab === 'outside' ? '#ef4444' : '#d97706'} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={subTab === 'outside' ? '#ef4444' : '#d97706'} />
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
              <MobileDrill size={40} color="#cbd5e1" />
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#64748b', marginTop: 12 }}>
                Nenhuma montagem {subTab === 'outside' ? 'fora' : 'no depósito'} encontrada
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
                  isPending ? styles.stickySectionHeaderPending : styles.stickySectionHeaderDefault,
                  isDarkMode && styles.stickySectionHeaderDark
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  {isPending ? (
                    <AlertCircle size={16} color="#d97706" />
                  ) : (
                    <Calendar size={16} color="#2563eb" />
                  )}
                  <Text style={[
                    styles.stickySectionTitle,
                    isPending ? { color: '#92400e' } : { color: '#1e3a8a' },
                    isDarkMode && styles.textDark
                  ]}>
                    {section.title}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[
                    styles.stickySectionBadge,
                    { backgroundColor: isPending ? '#d97706' : '#2563eb' }
                  ]}>
                    <Text style={styles.stickySectionBadgeText}>
                      {section.count} {section.count === 1 ? 'montagem' : 'montagens'}
                    </Text>
                  </View>
                  {isCollapsed ? (
                    <ChevronDown size={16} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                  ) : (
                    <ChevronUp size={16} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          renderItem={({ item }) => (
            <AssemblyOrderCard
              order={item}
              subTab={subTab}
              handlingOptions={handlingOptions}
              isDarkMode={isDarkMode}
              onSelectOrder={onSelectOrder}
            />
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  containerDark: { backgroundColor: '#0f172a' },
  headerPadding: { paddingVertical: 12, gap: 10 },
  screenTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  textDark: { color: '#f8fafc' },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectBtnDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  selectBtnText: { fontSize: 12, fontWeight: '700', color: '#1e293b' },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    padding: 4,
    borderRadius: 10,
    gap: 4,
    marginTop: 4,
  },
  tabsRowDark: { backgroundColor: '#1e293b' },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#7c3aed' },
  tabBtnOutsideActive: { backgroundColor: '#ef4444' },
  tabBtnText: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  tabBtnTextActive: { color: '#ffffff' },
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
  stickySectionHeaderDark: { backgroundColor: '#1e293b' },
  stickySectionTitle: { fontSize: 13, fontWeight: '900' },
  stickySectionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  stickySectionBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: '900' },
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
