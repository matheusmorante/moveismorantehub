import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MapPin, Navigation, User, Clock } from 'lucide-react-native';
import { SlideHoldToStart } from '../SlideHoldToStart';
import { openGoogleMapsNavigation, extractNavigationTarget } from '../../../logistics/utils/externalMapsNavigation';

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
  const handleOpenGoogleMaps = () => {
    const target = extractNavigationTarget(order, fullAddress);
    void openGoogleMapsNavigation(target);
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

        {/* Ação Destacada: ABRIR ROTA NO GOOGLE MAPS (Idêntico à Etapa 1) */}
        <TouchableOpacity
          onPress={handleOpenGoogleMaps}
          style={styles.googleMapsNavButton}
          activeOpacity={0.85}
        >
          <Navigation size={17} color="#ffffff" fill="#ffffff" />
          <Text style={styles.googleMapsNavButtonText}>ABRIR ROTA NO GOOGLE MAPS</Text>
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
  googleMapsNavButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    elevation: 3,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  googleMapsNavButtonText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: '#ffffff',
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
