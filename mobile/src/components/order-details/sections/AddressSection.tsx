import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertCircle, Calendar, Clock, MapPin, Navigation, Store } from 'lucide-react-native';
import { SectionCard, SectionHeader } from './SectionCard';
import { formatFullAddress, formatOrderDate } from '../../../utils/orderUtils';

interface AddressSectionProps {
  shipping: any;
  customer: any;
  schedule: any;
  order: any;
  isPickup?: boolean;
  dark?: boolean;
}

export function AddressSection({
  shipping,
  customer,
  schedule,
  order,
  isPickup,
  dark,
}: AddressSectionProps) {
  const distance = shipping?.distance != null ? Number(shipping.distance).toFixed(1) : null;
  const duration =
    shipping?.durationMinutes != null ? Math.round(Number(shipping.durationMinutes)) : null;
  const address =
    shipping?.deliveryAddress ||
    shipping?.address ||
    customer?.fullAddress ||
    customer?.address ||
    {};
  const addressObservation = String(
    address?.observation || address?.observations || address?.notes || ''
  ).trim();
  const addressNotices = addressObservation
    .split(/[;\n•]+/)
    .map((notice) => notice.trim())
    .filter(Boolean);

  if (isPickup) {
    return (
      <SectionCard dark={dark}>
        <SectionHeader
          dark={dark}
          icon={<Store size={18} color="#9333ea" />}
          title="RETIRADA NO BALCÃO / LOJA"
        />
        <View style={[styles.pickupBadge, dark && styles.pickupBadgeDark]}>
          <Store size={15} color="#9333ea" />
          <Text style={styles.pickupBadgeText}>RETIRADA PRESENCIAL NA LOJA</Text>
        </View>

        <Text style={[styles.pickupDesc, dark && styles.light]}>
          O cliente optou por retirar os produtos presencialmente no depósito / loja física da Morante Móveis.
        </Text>

        <View style={styles.schedule}>
          <View style={styles.inline}>
            <Calendar size={14} color="#64748b" />
            <Text style={styles.detail}>
              Data da Retirada: {formatOrderDate(schedule?.date || order?.created_at)}
            </Text>
          </View>
          <View style={styles.inline}>
            <Clock size={14} color="#64748b" />
            <Text style={styles.detail}>
              Horário previsto:{' '}
              {schedule?.startTime
                ? `${schedule.startTime}${schedule.endTime ? ` - ${schedule.endTime}` : ''}`
                : 'Horário comercial'}
            </Text>
          </View>
        </View>
      </SectionCard>
    );
  }

  return (
    <SectionCard dark={dark}>
      <SectionHeader
        dark={dark}
        icon={<MapPin size={18} color="#ef4444" />}
        title="ENDEREÇO E AGENDAMENTO"
      />
      <Text style={[styles.addressText, dark && styles.light]}>
        {formatFullAddress(shipping, customer)}
      </Text>
      {addressNotices.length > 0 && (
        <View style={styles.observationLabels}>
          <AlertCircle size={16} color={dark ? '#f59e0b' : '#d97706'} />
          {addressNotices.map((notice, index) => (
            <View
              key={`${index}-${notice}`}
              style={[styles.observationLabel, dark && styles.observationLabelDark]}
            >
              <Text style={[styles.observationText, dark && styles.observationTextDark]}>
                {notice}
              </Text>
            </View>
          ))}
        </View>
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
          <Text style={styles.detail}>
            Data da Entrega: {formatOrderDate(schedule?.date || order?.created_at)}
          </Text>
        </View>
        <View style={styles.inline}>
          <Clock size={14} color="#64748b" />
          <Text style={styles.detail}>
            Horário:{' '}
            {schedule?.startTime
              ? `${schedule.startTime}${schedule.endTime ? ` - ${schedule.endTime}` : ''}`
              : 'Não definido'}
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
  route: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    backgroundColor: '#eff6ff',
    padding: 9,
    borderRadius: 11,
  },
  routeText: { fontSize: 12, fontWeight: '800', color: '#2563eb' },
  schedule: { gap: 6, paddingTop: 4 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  observationLabels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  observationLabel: {
    maxWidth: '100%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  observationLabelDark: { backgroundColor: '#1c1917', borderColor: '#854d0e' },
  observationText: { fontSize: 12, fontWeight: '800', color: '#92400e', lineHeight: 17 },
  observationTextDark: { color: '#fde68a' },
  pickupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f3e8ff',
    borderColor: '#d8b4fe',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  pickupBadgeDark: {
    backgroundColor: 'rgba(88, 28, 135, 0.3)',
    borderColor: 'rgba(147, 51, 234, 0.4)',
  },
  pickupBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#9333ea',
    letterSpacing: 0.5,
  },
  pickupDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    lineHeight: 18,
  },
});
