import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Play } from 'lucide-react-native';

export function OrderDeliveryStartFooter({ order, onStart }: { order: any; onStart?: () => void }) {
  const data = order.order_data || order;
  const shipping = data.shipping || {};
  const status = String(order.status || data.status || '').toLowerCase();
  const pickup = /pickup|retirada/.test(String(shipping.deliveryMethod || data.deliveryMethod || '').toLowerCase());
  const started = Boolean(data.deliveryStartedAt || data.deliveryStatus === 'in_progress');
  const visible = !pickup && !started && /agendad|scheduled/.test(status) && onStart;
  if (!visible) return null;
  return <TouchableOpacity onPress={onStart} style={styles.button}><Play size={18} color="#fff" fill="#fff" /><Text style={styles.text}>INICIAR ENTREGA</Text></TouchableOpacity>;
}

const styles = StyleSheet.create({ button: { height: 52, borderRadius: 16, backgroundColor: '#16a34a', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 2 }, text: { color: '#fff', fontSize: 13, fontWeight: '900' } });
