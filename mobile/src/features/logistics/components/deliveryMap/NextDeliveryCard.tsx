import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Navigation, Play, Eye, CheckCircle2, MapPin, Package, Clock, Check } from 'lucide-react-native';
import { DeliveryRouteItem } from '../../hooks/useDeliveryRoute';
import { openExternalNavigation } from '../../utils/externalMapsNavigation';

interface Props {
  currentDelivery: DeliveryRouteItem | null;
  nextDelivery: DeliveryRouteItem | null;
  allCompleted: boolean;
  onStartDelivery: (item: DeliveryRouteItem) => void;
  onViewOrder: (item: DeliveryRouteItem) => void;
  onRegisterService: (item: DeliveryRouteItem) => void;
  isDarkMode?: boolean;
}

export const NextDeliveryCard: React.FC<Props> = ({
  currentDelivery,
  nextDelivery,
  allCompleted,
  onStartDelivery,
  onViewOrder,
  onRegisterService,
  isDarkMode = false,
}) => {
  if (allCompleted) {
    return (
      <View style={[styles.card, isDarkMode && styles.cardDark]}>
        <View style={styles.completedHeader}>
          <CheckCircle2 size={24} color="#10b981" />
          <Text style={[styles.completedTitle, isDarkMode && styles.textLight]}>
            Roteiro de Hoje Concluído!
          </Text>
        </View>
        <Text style={[styles.completedSubtitle, isDarkMode && styles.textMuted]}>
          Todas as entregas programadas para hoje foram finalizadas com sucesso.
        </Text>
      </View>
    );
  }

  const activeItem = currentDelivery || nextDelivery;
  if (!activeItem) return null;

  const isInProgress = activeItem.isCurrent;

  const handleOpenNavigation = () => {
    openExternalNavigation({
      latitude: activeItem.coords?.latitude,
      longitude: activeItem.coords?.longitude,
      fullAddress: activeItem.fullAddress,
    });
  };

  return (
    <View style={[styles.card, isDarkMode && styles.cardDark]}>
      {/* Badge Superior */}
      <View style={styles.headerRow}>
        <View style={[styles.badge, isInProgress ? styles.badgeProgress : styles.badgeNext]}>
          <Text style={[styles.badgeText, isInProgress ? styles.badgeTextProgress : styles.badgeTextNext]}>
            {isInProgress ? 'ENTREGA EM ANDAMENTO' : `PRÓXIMA ENTREGA • #${activeItem.sequence}`}
          </Text>
        </View>

        {activeItem.orderIndex && (
          <Text style={[styles.orderIndexText, isDarkMode && styles.textMuted]}>
            Pedido #{activeItem.orderIndex}
          </Text>
        )}
      </View>

      {/* Cliente & Endereço */}
      <Text style={[styles.customerName, isDarkMode && styles.textLight]} numberOfLines={1}>
        {activeItem.customerName}
      </Text>

      <View style={styles.addressRow}>
        <MapPin size={13} color="#ef4444" style={{ marginTop: 2 }} />
        <Text style={[styles.addressText, isDarkMode && styles.textMuted]} numberOfLines={2}>
          {activeItem.fullAddress}
        </Text>
      </View>

      {/* Métricas: Distância, Duração e Itens */}
      <View style={styles.metricsRow}>
        {activeItem.distanceKm ? (
          <View style={styles.metricPill}>
            <Navigation size={11} color="#2563eb" />
            <Text style={styles.metricText}>{activeItem.distanceKm} km</Text>
          </View>
        ) : null}

        {activeItem.durationMin ? (
          <View style={styles.metricPill}>
            <Clock size={11} color="#64748b" />
            <Text style={[styles.metricText, { color: '#64748b' }]}>{activeItem.durationMin} min</Text>
          </View>
        ) : null}

        <View style={styles.metricPill}>
          <Package size={11} color="#64748b" />
          <Text style={[styles.metricText, { color: '#64748b' }]}>{activeItem.itemsCount} volumes</Text>
        </View>
      </View>

      {/* Ações */}
      <View style={styles.actionsRow}>
        {isInProgress ? (
          <>
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#2563eb' }]}
              onPress={handleOpenNavigation}
              activeOpacity={0.85}
            >
              <Navigation size={16} color="#ffffff" />
              <Text style={styles.primaryActionText}>Navegação</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryActionBtn, isDarkMode && styles.secondaryActionBtnDark]}
              onPress={() => onViewOrder(activeItem)}
              activeOpacity={0.85}
            >
              <Eye size={16} color={isDarkMode ? '#94a3b8' : '#475569'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.successActionBtn]}
              onPress={() => onRegisterService(activeItem)}
              activeOpacity={0.85}
            >
              <Check size={16} color="#ffffff" strokeWidth={3} />
              <Text style={styles.successActionText}>Atendimento</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#2563eb' }]}
              onPress={() => onStartDelivery(activeItem)}
              activeOpacity={0.85}
            >
              <Play size={16} color="#ffffff" fill="#ffffff" />
              <Text style={styles.primaryActionText}>Iniciar Entrega</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryActionBtn, isDarkMode && styles.secondaryActionBtnDark]}
              onPress={() => onViewOrder(activeItem)}
              activeOpacity={0.85}
            >
              <Eye size={16} color={isDarkMode ? '#94a3b8' : '#475569'} />
              <Text style={[styles.secondaryActionText, isDarkMode && styles.textLight]}>Ver Pedido</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  cardDark: {
    backgroundColor: '#1e293b',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeProgress: {
    backgroundColor: '#eff6ff',
  },
  badgeNext: {
    backgroundColor: '#f0fdf4',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  badgeTextProgress: {
    color: '#2563eb',
  },
  badgeTextNext: {
    color: '#16a34a',
  },
  orderIndexText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 10,
  },
  addressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    flex: 1,
    lineHeight: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metricText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563eb',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryActionBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  secondaryActionBtn: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryActionBtnDark: {
    backgroundColor: '#334155',
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  successActionBtn: {
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  successActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  completedTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  completedSubtitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  textLight: {
    color: '#f8fafc',
  },
  textMuted: {
    color: '#94a3b8',
  },
});
