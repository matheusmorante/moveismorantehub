import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SectionList,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar as CalendarIcon, Plus } from 'lucide-react-native';
import { CreateEventModal } from '../components/CreateEventModal';
import { getLocalDateString, formatFullAddress } from '../../../utils/orderUtils';
import { getOperationalScheduleDate } from '../../../utils/operationalSchedule';
import { getOperationActivityType } from '../utils/operationActivity';
import { useAgendaData } from '../hooks/useAgendaData';
import { AgendaItemCard } from '../components/AgendaItemCard';

export type AgendaFilterType = 'all' | 'deliveries' | 'pickups' | 'assemblies' | 'events';

interface Props {
  isDarkMode?: boolean;
  isAdmin?: boolean;
  onSelectOrder?: (order: any) => void;
}

export const AgendaScreen: React.FC<Props> = ({
  isDarkMode = false,
  onSelectOrder,
}) => {
  const insets = useSafeAreaInsets();
  const topInset =
    Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0) + 8;

  const [activeFilter, setActiveFilter] = useState<AgendaFilterType>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { orders, events, loading, refreshing, onRefresh, reload } = useAgendaData();

  // Agrupamento de itens por data (Entregas, Retiradas, Montagens e Eventos)
  const sections = useMemo(() => {
    const todayStr = getLocalDateString(new Date());
    const itemsByDate: Record<string, any[]> = {};

    // 1. Inserir Pedidos (Entregas / Retiradas / Montagens)
    orders.forEach((order) => {
      const orderData = order.order_data || {};
      const shipping = orderData.shipping || order.shipping || {};
      const customer = orderData.customerData || order.customer || {};
      const orderItems = orderData.items || order.items || [];
      const observation =
        orderData.observation ?? orderData.observations ?? order.observation ?? order.observations;
      const observationLabels =
        typeof observation === 'string'
          ? observation
              .split(/\r?\n|•|;/)
              .map((notice: string) => notice.trim())
              .filter(Boolean)
          : [];

      const dDate =
        getOperationalScheduleDate(order) ||
        order.delivery_date ||
        order.scheduled_date ||
        todayStr;
      if (!itemsByDate[dDate]) itemsByDate[dDate] = [];

      const operationType = getOperationActivityType(order);
      const isPickup = String(shipping.deliveryType || shipping.deliveryMethod || '')
        .toLowerCase()
        .includes('retirada');
      const isAssembly = orderItems.some((item: { handlingType?: string }) =>
        item.handlingType?.includes('montagem')
      );

      let itemKind =
        operationType === 'return'
          ? 'return'
          : operationType === 'assistance'
            ? 'assistance'
            : isPickup
              ? 'pickup'
              : 'delivery';
      if (isAssembly) itemKind = 'assembly';

      itemsByDate[dDate].push({
        id: `ord_${order.id}`,
        kind: itemKind,
        date: dDate,
        title:
          customer.fullName ||
          order.customer_name ||
          order.client_name ||
          `Pedido #${orderData.orderIndex || order.orderIndex || order.order_number}`,
        subtitle: formatFullAddress(shipping, customer),
        observationLabels,
        order,
      });
    });

    // 2. Inserir Eventos da Agenda (Reuniões, Vistorias, etc.)
    events.forEach((evt) => {
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
    return sortedDates
      .map((dateKey) => {
        let list = itemsByDate[dateKey];
        if (activeFilter === 'deliveries') list = list.filter((i) => i.kind === 'delivery');
        else if (activeFilter === 'pickups') list = list.filter((i) => i.kind === 'pickup');
        else if (activeFilter === 'assemblies') list = list.filter((i) => i.kind === 'assembly');
        else if (activeFilter === 'events') list = list.filter((i) => i.kind === 'event');

        return {
          title: dateKey === todayStr ? `Hoje (${dateKey})` : dateKey,
          data: list,
        };
      })
      .filter((sec) => sec.data.length > 0);
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
            <Text style={[styles.pillText, activeFilter === 'all' && styles.pillTextActive]}>
              Todos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pillBtn, activeFilter === 'deliveries' && styles.pillBtnActive]}
            onPress={() => setActiveFilter('deliveries')}
          >
            <Text style={[styles.pillText, activeFilter === 'deliveries' && styles.pillTextActive]}>
              Entregas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pillBtn, activeFilter === 'pickups' && styles.pillBtnActive]}
            onPress={() => setActiveFilter('pickups')}
          >
            <Text style={[styles.pillText, activeFilter === 'pickups' && styles.pillTextActive]}>
              Retiradas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pillBtn, activeFilter === 'assemblies' && styles.pillBtnActive]}
            onPress={() => setActiveFilter('assemblies')}
          >
            <Text style={[styles.pillText, activeFilter === 'assemblies' && styles.pillTextActive]}>
              Montagens
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pillBtn, activeFilter === 'events' && styles.pillBtnActive]}
            onPress={() => setActiveFilter('events')}
          >
            <Text style={[styles.pillText, activeFilter === 'events' && styles.pillTextActive]}>
              Eventos
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista da Agenda */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={[styles.loadingText, isDarkMode && styles.subtitleDark]}>
            Carregando agenda...
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />
          }
          renderSectionHeader={({ section: { title } }) => (
            <View style={[styles.sectionHeader, isDarkMode && styles.sectionHeaderDark]}>
              <CalendarIcon size={14} color="#2563eb" />
              <Text style={[styles.sectionHeaderText, isDarkMode && styles.textDark]}>{title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <AgendaItemCard item={item} isDarkMode={isDarkMode} onSelectOrder={onSelectOrder} />
          )}
        />
      )}

      {/* Modal de Criação de Evento */}
      <CreateEventModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onEventCreated={() => reload()}
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
    paddingBottom: 12,
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
    marginBottom: 12,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  createBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  pillFilterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pillFilterRowDark: {},
  pillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  pillBtnActive: {
    backgroundColor: '#2563eb',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
  },
  pillTextActive: {
    color: '#ffffff',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 12,
    marginBottom: 4,
  },
  sectionHeaderDark: {},
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 8,
  },
  textDark: {
    color: '#f8fafc',
  },
  subtitleDark: {
    color: '#94a3b8',
  },
});
