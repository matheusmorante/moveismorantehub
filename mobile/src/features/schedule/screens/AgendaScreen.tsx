import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SectionList, ActivityIndicator, RefreshControl, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar as CalendarIcon, Plus, Truck, Package, RefreshCw, ChevronRight, MapPin, Clock, Tag } from 'lucide-react-native';
import { MobileDrill } from '../../../components/shared/MobileDrill';
import { supabase } from '../../../services/supabaseClient';
import { fetchCalendarEvents, CalendarEvent } from '../../../services/scheduleEventsService';
import { CreateEventModal } from '../components/CreateEventModal';
import { getLocalDateString, formatFullAddress } from '../../../utils/orderUtils';
import { getOperationalScheduleDate } from '../../../utils/operationalSchedule';
import { getOperationActivityPresentation, getOperationActivityType } from '../utils/operationActivity';

export type AgendaFilterType = 'all' | 'deliveries' | 'pickups' | 'assemblies' | 'events';

interface Props {
  isDarkMode?: boolean;
  isAdmin?: boolean;
  onSelectOrder?: (order: any) => void;
}

export const AgendaScreen: React.FC<Props> = ({
  isDarkMode = false,
  isAdmin = false,
  onSelectOrder,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0) + 8;

  const [activeFilter, setActiveFilter] = useState<AgendaFilterType>('all');
  const [orders, setOrders] = useState<any[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadData = async () => {
    try {
      const [{ data: orderData }, eventList] = await Promise.all([
        supabase
          .from('orders')
          .select('id, status, created_at, order_data')
          .or('order_data->>deleted.is.null,order_data->>deleted.eq.false')
          .order('created_at', { ascending: false })
          .limit(500),
        fetchCalendarEvents(),
      ]);

      if (orderData) setOrders(orderData);
      if (eventList) setEvents(eventList);
    } catch (e) {
      console.warn('[AgendaScreen] Erro ao carregar dados da agenda:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Agrupamento de itens por data (Entregas, Retiradas, Montagens e Eventos)
  const sections = useMemo(() => {
    const todayStr = getLocalDateString(new Date());

    const itemsByDate: Record<string, any[]> = {};

    // 1. Inserir Pedidos (Entregas / Retiradas / Montagens)
    orders.forEach(order => {
      const orderData = order.order_data || {};
      const shipping = orderData.shipping || order.shipping || {};
      const customer = orderData.customerData || order.customer || {};
      const orderItems = orderData.items || order.items || [];
      const dDate = getOperationalScheduleDate(order) || order.delivery_date || order.scheduled_date || todayStr;
      if (!itemsByDate[dDate]) itemsByDate[dDate] = [];

      const operationType = getOperationActivityType(order);
      const isPickup = String(shipping.deliveryType || shipping.deliveryMethod || '').toLowerCase().includes('retirada');
      const isAssembly = orderItems.some((item: { handlingType?: string }) => item.handlingType?.includes('montagem'));

      let itemKind = operationType === 'return' ? 'return' : operationType === 'assistance' ? 'assistance' : (isPickup ? 'pickup' : 'delivery');
      if (isAssembly) itemKind = 'assembly';

      itemsByDate[dDate].push({
        id: `ord_${order.id}`,
        kind: itemKind,
        date: dDate,
        title: customer.fullName || order.customer_name || order.client_name || `Pedido #${orderData.orderIndex || order.orderIndex || order.order_number}`,
        subtitle: formatFullAddress(shipping, customer),
        order,
      });
    });

    // 2. Inserir Eventos da Agenda (Reuniões, Vistorias, etc.)
    events.forEach(evt => {
      const eDate = evt.date || todayStr;
      if (!itemsByDate[eDate]) itemsByDate[eDate] = [];

      itemsByDate[eDate].push({
        id: `evt_${evt.id}`,
        kind: 'event',
        date: eDate,
        title: evt.title,
        subtitle: evt.time_or_period || 'Horário a definir',
        event: evt,
      });
    });

    // Filtrar conforme pílula ativa
    const sortedDates = Object.keys(itemsByDate).sort();
    return sortedDates.map(dateKey => {
      let list = itemsByDate[dateKey];
      if (activeFilter === 'deliveries') list = list.filter(i => i.kind === 'delivery');
      else if (activeFilter === 'pickups') list = list.filter(i => i.kind === 'pickup');
      else if (activeFilter === 'assemblies') list = list.filter(i => i.kind === 'assembly');
      else if (activeFilter === 'events') list = list.filter(i => i.kind === 'event');

      return {
        title: dateKey === todayStr ? `Hoje (${dateKey})` : dateKey,
        data: list,
      };
    }).filter(sec => sec.data.length > 0);
  }, [orders, events, activeFilter]);

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Header com Botão + Novo Evento */}
      <View style={[styles.header, isDarkMode && styles.headerDark, { paddingTop: topInset }]}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.screenTitle, isDarkMode && styles.textDark]}>Agenda</Text>
            <Text style={[styles.screenSubtitle, isDarkMode && styles.subtitleDark]}>
              Entregas, retiradas, montagens e eventos
            </Text>
          </View>

          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.8}
          >
            <Plus size={15} color="#ffffff" />
            <Text style={styles.createBtnText}>Novo Evento</Text>
          </TouchableOpacity>
        </View>

        {/* Pílulas de Filtro */}
        <View style={[styles.pillFilterRow, isDarkMode && styles.pillFilterRowDark]}>
          <TouchableOpacity
            style={[styles.pillBtn, activeFilter === 'all' && styles.pillBtnActive]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.pillText, activeFilter === 'all' && styles.pillTextActive]}>Todos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pillBtn, activeFilter === 'deliveries' && styles.pillBtnActive]}
            onPress={() => setActiveFilter('deliveries')}
          >
            <Text style={[styles.pillText, activeFilter === 'deliveries' && styles.pillTextActive]}>Entregas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pillBtn, activeFilter === 'pickups' && styles.pillBtnActive]}
            onPress={() => setActiveFilter('pickups')}
          >
            <Text style={[styles.pillText, activeFilter === 'pickups' && styles.pillTextActive]}>Retiradas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pillBtn, activeFilter === 'assemblies' && styles.pillBtnActive]}
            onPress={() => setActiveFilter('assemblies')}
          >
            <Text style={[styles.pillText, activeFilter === 'assemblies' && styles.pillTextActive]}>Montagens</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pillBtn, activeFilter === 'events' && styles.pillBtnActive]}
            onPress={() => setActiveFilter('events')}
          >
            <Text style={[styles.pillText, activeFilter === 'events' && styles.pillTextActive]}>Eventos</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista da Agenda */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={[styles.loadingText, isDarkMode && styles.subtitleDark]}>Carregando agenda...</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
          renderSectionHeader={({ section: { title } }) => (
            <View style={[styles.sectionHeader, isDarkMode && styles.sectionHeaderDark]}>
              <CalendarIcon size={14} color="#2563eb" />
              <Text style={[styles.sectionHeaderText, isDarkMode && styles.textDark]}>{title}</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const isOrder = !!item.order;
            return (
              <TouchableOpacity
                style={[styles.itemCard, isDarkMode && styles.itemCardDark]}
                onPress={() => isOrder && onSelectOrder && onSelectOrder(item.order)}
                activeOpacity={isOrder ? 0.7 : 1}
              >
                <View style={styles.itemBadgeCol}>
                  {item.kind === 'delivery' || item.kind === 'assistance' || item.kind === 'return' ? (
                    <View style={[styles.kindBadge, { backgroundColor: getOperationActivityPresentation(item.order).backgroundColor }]}>
                      <Text style={[styles.operationLabel, { color: getOperationActivityPresentation(item.order).color }]}>{getOperationActivityPresentation(item.order).label}</Text>
                    </View>
                  ) : item.kind === 'pickup' ? (
                    <View style={[styles.kindBadge, { backgroundColor: '#f3e8ff' }]}>
                      <Package size={14} color="#7c3aed" />
                    </View>
                  ) : item.kind === 'assembly' ? (
                    <View style={[styles.kindBadge, { backgroundColor: '#fef3c7' }]}>
                      <MobileDrill size={14} color="#d97706" />
                    </View>
                  ) : (
                    <View style={[styles.kindBadge, { backgroundColor: '#dcfce7' }]}>
                      <Tag size={14} color="#16a34a" />
                    </View>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, isDarkMode && styles.textDark]}>{item.title}</Text>
                  <Text style={[styles.itemSub, isDarkMode && styles.subtitleDark]}>{item.subtitle}</Text>
                </View>

                {isOrder ? <ChevronRight size={16} color={isDarkMode ? '#94a3b8' : '#64748b'} /> : null}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Modal de Criação de Evento */}
      <CreateEventModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onEventCreated={() => loadData()}
        isDarkMode={isDarkMode}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerDark: {
    backgroundColor: '#1e293b',
    borderBottomColor: '#334155',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  screenSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  textDark: {
    color: '#f8fafc',
  },
  subtitleDark: {
    color: '#94a3b8',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  createBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  pillFilterRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 3,
    gap: 2,
  },
  pillFilterRowDark: {
    backgroundColor: '#0f172a',
  },
  pillBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 11,
  },
  pillBtnActive: {
    backgroundColor: '#ffffff',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  pillTextActive: {
    color: '#2563eb',
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 12,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  sectionHeaderDark: {
    backgroundColor: '#334155',
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  itemCardDark: {
    backgroundColor: '#1e293b',
    borderBottomColor: '#334155',
  },
  itemBadgeCol: {
    width: 32,
  },
  kindBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  operationLabel: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  itemTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
});
