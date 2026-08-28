import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Linking, Platform } from 'react-native';
import { MapPin, Navigation, CheckCircle2, User, Clock, ExternalLink } from 'lucide-react-native';
import { SlideHoldToStart } from '../SlideHoldToStart';
import { getLocationMapsUrl } from '../../../../utils/orderUtils';

interface Props {
  order: any;
  customer: any;
  fullAddress: string;
  isDarkMode: boolean;
  startedAt: string;
  onArriveAtDestination: () => void;
  onStepBackToPreparation: () => void;
  loading: boolean;
}

export const DeliveryRouteStep: React.FC<Props> = ({
  order,
  customer,
  fullAddress,
  isDarkMode,
  startedAt,
  onArriveAtDestination,
  onStepBackToPreparation,
  loading,
}) => {
  const mapsUrl = getLocationMapsUrl(order) || getLocationMapsUrl(customer);

  const openGPS = () => {
    if (mapsUrl) {
      Linking.openURL(mapsUrl).catch(() => {});
      return;
    }
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

  const openExactMapsLink = () => {
    if (mapsUrl) {
      Linking.openURL(mapsUrl).catch(() => {});
    }
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

        {/* Botão de Localização Exata (Google Maps) caso cadastrado */}
        {Boolean(mapsUrl) && (
          <TouchableOpacity onPress={openExactMapsLink} style={styles.exactMapsButton} activeOpacity={0.8}>
            <ExternalLink size={16} color="#dc2626" />
            <Text style={styles.exactMapsButtonText}>Abrir Localização no Google Maps</Text>
          </TouchableOpacity>
        )}

        {/* Botão de abrir GPS */}
        <TouchableOpacity onPress={openGPS} style={styles.gpsButton} activeOpacity={0.8}>
          <Navigation size={16} color="#2563eb" />
          <Text style={styles.gpsButtonText}>
            {mapsUrl ? 'Navegar com GPS' : 'Abrir no GPS / Navegador'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Botão Deslizante Cheguei no Destino (Direita para Esquerda) */}
      <View style={{ marginTop: 6, gap: 6 }}>
        <Text style={styles.safetyText}>
          Ao chegar no endereço do cliente, deslize 2 vezes da direita para a esquerda:
        </Text>
        <SlideHoldToStart
          disabled={loading}
          onComplete={onArriveAtDestination}
          actionText="« Deslize para CHEGUEI NO DESTINO"
          trackColor="#2563eb"
          knobColor="#1d4ed8"
          iconType="check"
          direction="left"
        />
      </View>

      {/* Retroceder Etapa (Slide 2x Cinza - Esquerda para Direita) */}
      <View style={{ marginTop: 10, gap: 6 }}>
        <Text style={styles.stepBackText}>
          Para retroceder para a Etapa 1 (Preparação), deslize 2 vezes da esquerda para a direita:
        </Text>
        <SlideHoldToStart
          disabled={loading}
          onComplete={onStepBackToPreparation}
          actionText="Deslize para VOLTAR AO PREPARO »"
          trackColor="#64748b"
          knobColor="#334155"
          iconType="back"
          direction="right"
        />
      </View>
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
  exactMapsButton: {
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
  exactMapsButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#dc2626',
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
  stepBackText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 4,
  },
  safetyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
    marginBottom: 4,
  },
});
