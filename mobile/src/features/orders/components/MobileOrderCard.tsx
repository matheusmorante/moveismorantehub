import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, Clock, Package, Truck } from 'lucide-react-native';
import { formatOrderDate, formatOrderTotal } from '../../../utils/orderUtils';
import { isAssemblyInternalType, isAssemblyOutsideType } from '../../../utils/aiSummaryHelper';
import { OrderCardDeliveryFooter } from '../../../components/cards/OrderCardDeliveryFooter';

type Props = { order: any; dark: boolean; handlingOptions: any[]; onDetails: () => void };
const statusLabel = (value: string) => {
  const status = String(value || '').toLowerCase();
  if (/draft|rascunh/.test(status)) return 'RASCUNHO';
  if (/sched|agendad/.test(status)) return 'AGENDADO';
  if (/fulfill|atendid|concluid|finaliz|entreg/.test(status)) return 'ATENDIDO';
  if (status.includes('cancel')) return 'CANCELADO';
  return status.toUpperCase();
};

export function MobileOrderCard({ order, dark, handlingOptions, onDetails }: Props) {
  const data = order.order_data || {};
  const shipping = data.shipping || {};
  const pickup = /pickup|retirada/.test(String(shipping.deliveryMethod || data.deliveryMethod || '').toLowerCase());
  const items = data.items || order.items || [];
  const handling = String(data.handlingType || data.handling || data.deliveryType || shipping.handlingType || shipping.handling || order.handling || '');
  const outside = isAssemblyOutsideType(handling, handlingOptions) || items.some((item: any) => isAssemblyOutsideType(String(item.handlingType || item.handling || ''), handlingOptions));
  const internal = isAssemblyInternalType(handling, handlingOptions) || items.some((item: any) => isAssemblyInternalType(String(item.handlingType || item.handling || ''), handlingOptions));
  const schedule = shipping.scheduling || data.schedule || {};
  const scheduleDate = schedule.date || schedule.startDate || order.scheduled_date || order.date;

  return <TouchableOpacity onPress={onDetails} style={[styles.card, dark && styles.cardDark]}>
    <View style={[styles.header, { backgroundColor: pickup ? '#f3e8ff' : '#d1fae5' }]}>
      {pickup ? <Package size={16} color="#a855f7" /> : <Truck size={16} color="#10b981" />}
      <View style={styles.badges}>{outside && <Text style={[styles.badge, styles.red]}>MONTAGEM FORA</Text>}{internal && <Text style={[styles.badge, styles.orange]}>MONTAGEM DEPÓSITO</Text>}<Text style={styles.status}>● {statusLabel(order.status || data.status || 'Agendado')}</Text></View>
    </View>
    <View style={styles.body}>
      <Text style={[styles.customer, dark && styles.light]}>{data.customerData?.fullName || order.customer_name || 'Cliente'}</Text>
      <View style={styles.dates}><View style={styles.column}><Text style={styles.label}>PEDIDO</Text><View style={styles.inline}><Calendar size={13} color="#64748b" /><Text style={[styles.date, dark && styles.light]}>{formatOrderDate(order.created_at)}</Text></View></View><View style={styles.column}><Text style={styles.label}>{pickup ? 'RETIRADA' : 'ENTREGA'}</Text><Text style={[styles.date, dark && styles.light]}>{scheduleDate ? formatOrderDate(scheduleDate) : 'Não informada'}</Text></View></View>
      {!!schedule.startTime && <View style={styles.time}><Clock size={12} color="#2563eb" /><Text style={styles.timeText}>{schedule.startTime}{schedule.endTime ? ` ÀS ${schedule.endTime}` : ''}</Text></View>}
      <View style={styles.footer}><View><Text style={styles.label}>TOTAL</Text><Text style={styles.total}>{formatOrderTotal(order)}</Text></View></View>
      <OrderCardDeliveryFooter order={order} dark={dark} onPress={onDetails} />
    </View>
  </TouchableOpacity>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', elevation: 2 }, cardDark: { backgroundColor: '#1e293b', borderColor: '#334155' }, light: { color: '#f8fafc' }, header: { minHeight: 38, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, badges: { flexDirection: 'row', alignItems: 'center', gap: 5 }, badge: { color: '#fff', fontSize: 8, fontWeight: '900', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 7 }, red: { backgroundColor: '#ef4444' }, orange: { backgroundColor: '#f59e0b' }, status: { fontSize: 8, fontWeight: '900', color: '#d97706', backgroundColor: '#fef3c7', padding: 4, borderRadius: 7 }, body: { padding: 15, gap: 11 }, customer: { fontSize: 16, fontWeight: '900', color: '#0f172a' }, dates: { flexDirection: 'row' }, column: { flex: 1, gap: 4 }, inline: { flexDirection: 'row', gap: 4, alignItems: 'center' }, label: { fontSize: 9, fontWeight: '900', color: '#94a3b8' }, date: { fontSize: 12, fontWeight: '700', color: '#475569' }, time: { flexDirection: 'row', gap: 5, alignSelf: 'flex-start', backgroundColor: '#eff6ff', padding: 6, borderRadius: 8 }, timeText: { fontSize: 10, fontWeight: '900', color: '#2563eb' }, footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }, total: { fontSize: 18, fontWeight: '900', color: '#2563eb' },
});
