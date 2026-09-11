import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Clock, MapPin, Navigation, Package, Truck } from 'lucide-react-native';
import { formatFullAddress, formatItemNameExact } from '../../../utils/orderUtils';
import { isAssemblyOutsideType, isAssemblyInternalType } from '../../../utils/aiSummaryHelper';
import { OrderCardDeliveryFooter } from '../../../components/cards/OrderCardDeliveryFooter';

interface AssemblyOrderCardProps {
  order: any;
  subTab: 'internal' | 'outside';
  handlingOptions: any[];
  isDarkMode: boolean;
  onSelectOrder?: (order: any) => void;
}

const formatDisplayTime = (sched: any, order: any): string => {
  if (sched?.startTime && sched?.endTime && sched.startTime !== sched.endTime) {
    return `${sched.startTime} - ${sched.endTime}`;
  }
  if (sched?.startTime) return sched.startTime;
  if (sched?.time) return sched.time;
  if (order?.scheduled_time) return order.scheduled_time;
  return 'Horário não definido';
};

export const AssemblyOrderCard: React.FC<AssemblyOrderCardProps> = ({
  order: o,
  subTab,
  handlingOptions,
  isDarkMode,
  onSelectOrder,
}) => {
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
      activeOpacity={0.85}
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
          <Text style={styles.itemsSectionTitle}>ITENS PARA MONTAGEM</Text>
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
                    isDarkMode && styles.itemPillDark,
                  ]}
                >
                  <Text style={[
                    styles.itemPillText,
                    isItemOutside ? styles.itemPillTextOutside : (isItemInternal ? styles.itemPillTextInternal : styles.itemPillTextDefault),
                    isDarkMode && isItemOutside && { color: '#fca5a5' },
                    isDarkMode && isItemInternal && { color: '#fcd34d' },
                    isDarkMode && !isItemOutside && !isItemInternal && { color: '#cbd5e1' },
                  ]}>
                    <Text style={{ fontWeight: '900' }}>{qty}x</Text> {name}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Rodapé de Etapas */}
      <OrderCardDeliveryFooter order={o} dark={isDarkMode} onPress={() => onSelectOrder && onSelectOrder(o)} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#7c3aed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#6d28d9',
  },
  cardHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  handlingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  badgeDelivery: { backgroundColor: '#10b981' },
  badgePickup: { backgroundColor: '#8b5cf6' },
  handlingBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  timeRowDark: { backgroundColor: '#0f172a' },
  timeText: { fontSize: 12, fontWeight: '800', color: '#1e293b' },
  textDark: { color: '#f8fafc' },
  statusBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    color: '#4338ca',
    fontSize: 9,
    fontWeight: '900',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  addressBoxDark: { backgroundColor: '#0f172a' },
  addressText: { fontSize: 12, color: '#334155', flex: 1, lineHeight: 16 },
  routeMetricsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#faf5ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  routeMetricsBoxDark: { backgroundColor: '#3b0764' },
  itemsContainer: {
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemsContainerDark: { backgroundColor: '#0f172a' },
  itemsSectionTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  itemsPillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  itemPill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  itemPillDefault: { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' },
  itemPillOutside: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  itemPillInternal: { backgroundColor: '#fef3c7', borderColor: '#fcd34d' },
  itemPillDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  itemPillText: { fontSize: 11 },
  itemPillTextDefault: { color: '#334155' },
  itemPillTextOutside: { color: '#b91c1c', fontWeight: '700' },
  itemPillTextInternal: { color: '#b45309', fontWeight: '700' },
});
