import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Linking } from 'react-native';
import { Calendar, Clock, ExternalLink, MapPin, Navigation } from 'lucide-react-native';
import { SectionCard, SectionHeader } from './SectionCard';
import { formatFullAddress, formatOrderDate, getLocationMapsUrl } from '../../../utils/orderUtils';

interface AddressSectionProps {
  shipping: any;
  customer: any;
  schedule: any;
  order: any;
  dark?: boolean;
}

export function AddressSection({ shipping, customer, schedule, order, dark }: AddressSectionProps) {
  const distance = shipping?.distance != null ? Number(shipping.distance).toFixed(1) : null;
  const duration = shipping?.durationMinutes != null ? Math.round(Number(shipping.durationMinutes)) : null;
  const mapsUrl = getLocationMapsUrl(order) || getLocationMapsUrl(customer);

  const openMapsLink = () => {
    if (mapsUrl) {
      Linking.openURL(mapsUrl).catch(() => {});
    }
  };

  return (
    <SectionCard dark={dark}>
      <SectionHeader dark={dark} icon={<MapPin size={18} color="#ef4444" />} title="ENDEREÇO E AGENDAMENTO" />
      <Text style={[styles.addressText, dark && styles.light]}>{formatFullAddress(shipping, customer)}</Text>
      
      {Boolean(mapsUrl) && (
        <TouchableOpacity onPress={openMapsLink} style={styles.mapsLinkButton} activeOpacity={0.8}>
          <ExternalLink size={14} color="#dc2626" />
          <Text style={styles.mapsLinkButtonText}>Abrir Localização no Google Maps</Text>
        </TouchableOpacity>
      )}

      {(distance || duration) && (
        <View style={styles.route}>
          {distance && (
            <View style={styles.inline}>
              <Navigation size={14} color="#2563eb" />
              <Text style={styles.routeText}>Distância: {distance} KM</Text>
            </View>
          )}
          {duration && <Text style={styles.detail}>Tempo estimado: ~ {duration} MIN</Text>}
        </View>
      )}

      <View style={styles.schedule}>
        <View style={styles.inline}>
          <Calendar size={14} color="#64748b" />
          <Text style={styles.detail}>Data: {formatOrderDate(schedule?.date || order?.created_at)}</Text>
        </View>
        <View style={styles.inline}>
          <Clock size={14} color="#64748b" />
          <Text style={styles.detail}>
            Horário: {schedule?.startTime ? `${schedule.startTime}${schedule.endTime ? ` - ${schedule.endTime}` : ''}` : 'Não definido'}
          </Text>
        </View>
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  detail: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  light: { color: '#f8fafc' },
  addressText: { fontSize: 13, fontWeight: '700', color: '#334155', lineHeight: 19 },
  route: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, backgroundColor: '#eff6ff', padding: 9, borderRadius: 11 },
  routeText: { fontSize: 12, fontWeight: '800', color: '#2563eb' },
  schedule: { gap: 6, paddingTop: 4 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  mapsLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginTop: 4,
  },
  mapsLinkButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#dc2626',
  },
});
