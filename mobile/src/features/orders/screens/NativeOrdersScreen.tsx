import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, RefreshControl, StyleSheet, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingBag, Search, RefreshCw, Truck, Package, Calendar, Clock, Edit2, MoreVertical } from 'lucide-react-native';
import { supabase } from '../../../services/supabaseClient';
import { formatOrderDate, formatOrderTotal } from '../../../utils/orderUtils';
import { isAssemblyOutsideType, isAssemblyInternalType } from '../../../utils/aiSummaryHelper';

interface Props {
  isDarkMode: boolean;
  isAdmin: boolean;
  onSelectOrder?: (order: any) => void;
}

export const NativeOrdersScreen: React.FC<Props> = ({ isDarkMode, isAdmin, onSelectOrder }) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0) + 8;

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [handlingOptions, setHandlingOptions] = useState<any[]>([]);

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

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        setOrders(data);
      }
    } catch (err) {
      console.warn('[NativeOrders] Erro ao buscar pedidos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSettings();
    fetchOrders();
  };

  const filteredOrders = orders.filter((o) => {
    const oData = o.order_data || {};
    if (oData.deleted || o.deleted) return false;

    const customerName = (oData.customerData?.fullName || o.customer_name || '').toLowerCase();
    const city = (oData.shipping?.deliveryAddress?.city || o.city || '').toLowerCase();
    const matchesSearch = !searchTerm || customerName.includes(searchTerm.toLowerCase()) || city.includes(searchTerm.toLowerCase());

    const orderStatus = (o.status || oData.status || '').toLowerCase();
    let matchesStatus = true;

    if (statusFilter === 'agendados') {
      matchesStatus = orderStatus.includes('agendad') || orderStatus.includes('scheduled');
    } else if (statusFilter === 'concluidos') {
      matchesStatus = orderStatus.includes('concluid') || orderStatus.includes('entreg') || orderStatus.includes('finaliz');
    } else if (statusFilter === 'rascunhos') {
      matchesStatus = orderStatus.includes('draft') || orderStatus.includes('rascunh');
    }

    return matchesSearch && matchesStatus;
  });

  const renderHeader = () => (
    <View style={styles.headerPadding}>
      <View style={styles.topRow}>
        <Text style={[styles.screenTitle, isDarkMode && styles.textDark]}>Pedidos de Venda</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <RefreshCw size={16} color={isDarkMode ? '#94a3b8' : '#64748b'} />
        </TouchableOpacity>
      </View>

      {/* Input de Busca */}
      <View style={[styles.searchBox, isDarkMode && styles.searchBoxDark]}>
        <Search size={16} color="#94a3b8" />
        <TextInput
          placeholder="Buscar por cliente ou cidade..."
          placeholderTextColor="#94a3b8"
          style={[styles.searchInput, isDarkMode && styles.textDark]}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* Filtros de Status */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        {[
          { id: 'all', label: 'Todos' },
          { id: 'agendados', label: 'Agendados' },
          { id: 'concluidos', label: 'Concluídos' },
          { id: 'rascunhos', label: 'Rascunhos' },
        ].map(f => {
          const active = statusFilter === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              onPress={() => setStatusFilter(f.id)}
              style={[
                styles.filterChip,
                active && styles.filterChipActive,
                isDarkMode && !active && styles.filterChipDark
              ]}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b', marginTop: 10 }}>Carregando pedidos...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {renderHeader()}

          {filteredOrders.length === 0 ? (
            <View style={styles.emptyBox}>
              <ShoppingBag size={40} color="#cbd5e1" />
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#64748b', marginTop: 12 }}>Nenhum pedido encontrado</Text>
            </View>
          ) : (
            filteredOrders.map((o) => {
              const oData = o.order_data || {};
              const customerName = oData.customerData?.fullName || o.customer_name || 'Cliente';
              const total = formatOrderTotal(o);
              const orderIdLabel = oData.name || `#${o.id}`;

              const shipping = oData.shipping || {};
              const deliveryMethod = (shipping.deliveryMethod || oData.deliveryMethod || '').toLowerCase();
              const isPickup = deliveryMethod === 'pickup' || deliveryMethod === 'retirada';
              
              const translateStatus = (statusStr: string): string => {
                const s = String(statusStr || '').toLowerCase().trim();
                if (s.includes('draft') || s.includes('rascunh')) return 'Rascunho';
                if (s.includes('sched') || s.includes('agendad')) return 'Agendado';
                if (s.includes('fulfill') || s.includes('concluid') || s.includes('finaliz') || s.includes('entreg')) return 'Concluído';
                if (s.includes('cancel')) return 'Cancelado';
                return statusStr.toUpperCase();
              };

              const status = translateStatus(o.status || oData.status || 'Agendado').toUpperCase();

              const sched = shipping.scheduling || oData.schedule || {};
              const rawSchedDate = sched.date || sched.startDate || o.scheduled_date || o.date || '';
              const displayTime = sched.startTime ? `${sched.startTime} ${sched.endTime ? `ÀS ${sched.endTime}` : ''}`.toUpperCase() : null;

              const items = oData.items || o.items || [];
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

              // Cor de cabeçalho baseada no tipo de entrega/retirada
              const headerBg = isPickup ? '#f3e8ff' : '#d1fae5';
              const headerBorder = isPickup ? '#e9d5ff' : '#a7f3d0';

              return (
                <TouchableOpacity
                  key={o.id}
                  onPress={() => onSelectOrder && onSelectOrder(o)}
                  style={[styles.orderCard, isDarkMode && styles.orderCardDark]}
                >
                  {/* Card Header */}
                  <View style={[styles.cardHeader, { backgroundColor: headerBg, borderColor: headerBorder }]}>
                    <View style={styles.cardHeaderLeft}>
                      {isPickup ? (
                        <Package size={14} color="#a855f7" />
                      ) : (
                        <Truck size={14} color="#10b981" />
                      )}
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {hasOutsideAssembly && (
                        <View style={[styles.assemblyBadge, { backgroundColor: '#ef4444' }]}>
                          <Text style={styles.assemblyBadgeText}>MONTAGEM FORA</Text>
                        </View>
                      )}
                      {hasInternalAssembly && (
                        <View style={[styles.assemblyBadge, { backgroundColor: '#f59e0b' }]}>
                          <Text style={styles.assemblyBadgeText}>MONTAGEM DEPÓSITO</Text>
                        </View>
                      )}
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusBadgeText}>● {status}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Card Body */}
                  <View style={styles.cardBody}>
                    {/* Cliente */}
                    <Text style={[styles.customerName, isDarkMode && styles.textDark]}>{customerName}</Text>
                    <View style={styles.divider} />

                    {/* Datas (Pedido vs Entrega) */}
                    <View style={styles.datesRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dateLabel}>PEDIDO</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <Calendar size={13} color="#64748b" />
                          <Text style={[styles.dateText, isDarkMode && styles.textDark]}>
                            {formatOrderDate(o.created_at)}
                          </Text>
                        </View>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.dateLabel}>{isPickup ? 'RETIRADA' : 'ENTREGA'}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          {isPickup && <Package size={13} color="#a855f7" />}
                          <Text style={[styles.dateText, isDarkMode && styles.textDark]}>
                            {rawSchedDate ? formatOrderDate(rawSchedDate) : 'Não informada'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Horário Agendado */}
                    {displayTime && (
                      <View style={styles.timePill}>
                        <Clock size={12} color="#2563eb" />
                        <Text style={styles.timePillText}>{displayTime}</Text>
                      </View>
                    )}

                    {/* Footer Row: Total */}
                    <View style={styles.footerRow}>
                      <View>
                        <Text style={styles.totalLabel}>TOTAL</Text>
                        <Text style={styles.totalValue}>{total}</Text>
                      </View>
                    </View>

                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
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
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  screenTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  textDark: { color: '#f8fafc' },
  refreshBtn: { padding: 6 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ffffff', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10 },
  searchBoxDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '600', color: '#0f172a' },
  filterScroll: { gap: 8 },
  filterChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  filterChipDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  filterChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterChipText: { fontSize: 11, fontWeight: '800', color: '#64748b' },
  filterChipTextActive: { color: '#ffffff' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  orderCard: { backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', elevation: 2, marginBottom: 4 },
  orderCardDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkboxPlaceholder: { width: 14, height: 14, borderWidth: 1, borderColor: '#64748b', borderRadius: 3, backgroundColor: '#ffffff' },
  orderIdText: { fontSize: 11, fontWeight: '900', color: '#475569' },
  assemblyBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  assemblyBadgeText: { fontSize: 9, fontWeight: '900', color: '#ffffff' },
  statusBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: '#fde68a' },
  statusBadgeText: { fontSize: 9, fontWeight: '900', color: '#d97706' },
  cardBody: { padding: 16, gap: 12 },
  customerName: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  divider: { height: 1, backgroundColor: '#f1f5f9' },
  datesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dateLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 0.5 },
  dateText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  timePill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  timePillText: { fontSize: 11, fontWeight: '900', color: '#2563eb' },
  totalLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 0.5 },
  totalValue: { fontSize: 18, fontWeight: '900', color: '#2563eb', marginTop: 2 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 },
  footerActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }
});
