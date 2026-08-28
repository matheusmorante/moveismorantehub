import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Linking } from 'react-native';
import { Check, ClipboardCheck, MapPin, User, Navigation, ExternalLink } from 'lucide-react-native';
import { SlideHoldToStart } from '../SlideHoldToStart';
import { getLocationMapsUrl } from '../../../../utils/orderUtils';

interface Props {
  customer: any;
  fullAddress: string;
  order?: any;
  checklist: any[];
  checked: Record<string, boolean>;
  onToggleChecklist: (id: string) => void;
  onStartDelivery: () => void;
  saving: boolean;
  isDarkMode: boolean;
}

export const DeliveryPreparationStep: React.FC<Props> = ({
  customer,
  fullAddress,
  order,
  checklist,
  checked,
  onToggleChecklist,
  onStartDelivery,
  saving,
  isDarkMode,
}) => {
  const mapsUrl = getLocationMapsUrl(order) || getLocationMapsUrl(customer);

  const openMapsLink = () => {
    if (mapsUrl) {
      Linking.openURL(mapsUrl).catch(() => {});
    }
  };

  return (
    <View style={styles.container}>
      {/* Informações Iniciais do Cliente */}
      <View style={[styles.infoCard, isDarkMode && styles.infoCardDark]}>
        <View style={styles.row}>
          <User size={18} color="#2563eb" />
          <Text style={[styles.infoText, isDarkMode && styles.textLight]}>
            {customer.fullName || 'Cliente'}
          </Text>
        </View>
        <View style={styles.row}>
          <MapPin size={18} color="#ef4444" />
          <Text style={[styles.address, isDarkMode && styles.textLight]}>{fullAddress}</Text>
        </View>

        {Boolean(mapsUrl) && (
          <TouchableOpacity onPress={openMapsLink} style={styles.mapsButton} activeOpacity={0.8}>
            <ExternalLink size={15} color="#dc2626" />
            <Text style={styles.mapsButtonText}>Abrir Localização no Google Maps</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Checklist */}
      <View style={styles.heading}>
        <ClipboardCheck size={20} color="#16a34a" />
        <Text style={[styles.headingText, isDarkMode && styles.textLight]}>Checklist antes de sair</Text>
      </View>

      {checklist.map(item => (
        <TouchableOpacity
          key={item.id}
          style={[styles.item, isDarkMode && styles.cardDark]}
          onPress={() => onToggleChecklist(item.id)}
        >
          <View style={[styles.checkbox, checked[item.id] && styles.checkboxOn]}>
            {checked[item.id] && <Check size={17} color="#ffffff" strokeWidth={3} />}
          </View>
          <Text style={[styles.itemText, isDarkMode && styles.textLight]}>{item.label}</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.safety}>
        O checklist é opcional. Para evitar acionamento acidental, deslize o caminhão 2 vezes para sair.
      </Text>

      <SlideHoldToStart
        disabled={saving}
        onComplete={onStartDelivery}
        actionText="« Deslize para INICIAR rota"
        trackColor="#16a34a"
        knobColor="#14532d"
        iconType="truck"
        direction="left"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 12 },
  infoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoCardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  cardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  infoText: { fontSize: 15, fontWeight: '900', color: '#0f172a' },
  address: { flex: 1, fontSize: 12, fontWeight: '700', color: '#475569' },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  headingText: { fontSize: 15, fontWeight: '900', color: '#0f172a' },
  item: {
    minHeight: 60,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  itemText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '800', color: '#334155' },
  safety: { fontSize: 11, lineHeight: 16, textAlign: 'center', color: '#64748b', marginTop: 8 },
  textLight: { color: '#f8fafc' },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginTop: 4,
  },
  mapsButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#dc2626',
  },
});
