import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Linking, Platform } from 'react-native';
import { MapPin, Navigation, CheckCircle2, User, Clock } from 'lucide-react-native';

interface Props {
  order: any;
  customer: any;
  fullAddress: string;
  isDarkMode: boolean;
  startedAt: string;
  onArriveAtDestination: () => void;
  loading: boolean;
}

export const DeliveryRouteStep: React.FC<Props> = ({
  customer,
  fullAddress,
  isDarkMode,
  startedAt,
  onArriveAtDestination,
  loading,
}) => {
  const openGPS = () => {
    if (!fullAddress) return;
    const encoded = encodeURIComponent(fullAddress);
    const url = Platform.select({
      ios: `maps:0,0?q=${encoded}`,
      android: `geo:0,0?q=${encoded}`,
    }) || `https://www.google.com/maps/search/?api=1&query=${encoded}`;

    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`);
    });
  };

  const formattedStartedTime = startedAt
    ? new Date(startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  return (
    <View style={styles.container}>
      {/* Banner Em Rota */}
      <View style={[styles.routeBanner, isDarkMode && styles.routeBannerDark]}>
        <View style={styles.iconCircle}>
          <Text style={{ fontSize: 24 }}>🚚</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.bannerTitle, isDarkMode && styles.textLight]}>Em Rota</Text>
          <View style={styles.timeRow}>
            <Clock size={12} color="#64748b" />
            <Text style={styles.bannerSubtitle}>Saída registrada às {formattedStartedTime}</Text>
          </View>
        </View>
      </View>

      {/* Cartão do Cliente e Endereço */}
      <View style={[styles.infoCard, isDarkMode && styles.infoCardDark]}>
        <View style={styles.infoRow}>
          <User size={18} color="#2563eb" />
          <Text style={[styles.customerName, isDarkMode && styles.textLight]}>
            {customer.fullName || 'Cliente'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <MapPin size={18} color="#ef4444" style={{ marginTop: 2 }} />
          <Text style={[styles.addressText, isDarkMode && styles.textLight]}>{fullAddress}</Text>
        </View>

        {/* Botão de abrir GPS */}
        <TouchableOpacity onPress={openGPS} style={styles.gpsButton} activeOpacity={0.8}>
          <Navigation size={16} color="#2563eb" />
          <Text style={styles.gpsButtonText}>Abrir no GPS / Navegador</Text>
        </TouchableOpacity>
      </View>

      {/* Botão Cheguei no Destino */}
      <TouchableOpacity
        onPress={onArriveAtDestination}
        disabled={loading}
        style={[styles.arriveButton, loading && { opacity: 0.6 }]}
        activeOpacity={0.85}
      >
        <CheckCircle2 size={22} color="#ffffff" />
        <Text style={styles.arriveButtonText}>
          {loading ? 'REGISTRANDO...' : 'CHEGUEI NO DESTINO'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  routeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
  },
  routeBannerDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1e3a8a',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  bannerSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  textLight: {
    color: '#f8fafc',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoCardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    lineHeight: 18,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginTop: 4,
  },
  gpsButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563eb',
  },
  arriveButton: {
    height: 56,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 3,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    marginTop: 6,
  },
  arriveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
