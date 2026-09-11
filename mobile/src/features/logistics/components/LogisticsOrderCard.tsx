import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Clock, MapPin, Navigation, Package, Truck, Wrench } from 'lucide-react-native';
import { MobileDrill } from '../../../components/shared/MobileDrill';
import { formatFullAddress, formatItemNameExact } from '../../../utils/orderUtils';
import { isAssemblyOutsideType, isAssemblyInternalType } from '../../../utils/aiSummaryHelper';
import { OrderCardDeliveryFooter } from '../../../components/cards/OrderCardDeliveryFooter';

interface LogisticsOrderCardProps {
  order: any;
  handlingOptions: any[];
  isDarkMode: boolean;
  onSelectOrder?: (order: any) => void;
}

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

export const LogisticsOrderCard: React.FC<LogisticsOrderCardProps> = ({
  order: o,
  handlingOptions,
  isDarkMode,
  onSelectOrder,
}) => {
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

  let cardBorderColor = '#10b981';
  if (isAssistance) cardBorderColor = '#f59e0b';
  else if (isPickup) cardBorderColor = '#a855f7';

  return (
    <TouchableOpacity
      key={o.id}
      onPress={() => onSelectOrder && onSelectOrder(o)}
      style={[
        styles.card,
        { borderColor: cardBorderColor },
        isDarkMode && styles.cardDark
      ]}
      activeOpacity={0.85}
    >
      {/* Top Badges Row */}
      <View style={styles.cardHeaderTop}>
        <View style={styles.cardHeaderBadges}>
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

      {/* Rodapé de Etapas da Entrega */}
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
    borderColor: '#10b981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  cardHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardHeaderBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
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
  badgePickup: { backgroundColor: '#a855f7' },
  badgeAssistance: { backgroundColor: '#f59e0b' },
  badgeInternal: { backgroundColor: '#3b82f6' },
  badgeOutside: { backgroundColor: '#ef4444' },
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
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    color: '#475569',
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
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  routeMetricsBoxDark: { backgroundColor: '#064e3b' },
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
