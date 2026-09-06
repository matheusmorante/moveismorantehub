import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Navigation, Play, Eye, CheckCircle2, MapPin, Package, Clock, Check, X, Truck, Wrench } from 'lucide-react-native';
import { DeliveryRouteItem } from '../../hooks/useDeliveryRoute';
import { MobileDrill } from '../../../../components/shared/MobileDrill';

interface Props {
  currentDelivery: DeliveryRouteItem | null;
  nextDelivery: DeliveryRouteItem | null;
  selectedDelivery?: DeliveryRouteItem | null;
  allCompleted: boolean;
  onCloseCard?: () => void;
  onStartDelivery: (item: DeliveryRouteItem) => void;
  onViewOrder: (item: DeliveryRouteItem) => void;
  onRegisterService?: (item: DeliveryRouteItem) => void;
  isDarkMode?: boolean;
}

export const NextDeliveryCard: React.FC<Props> = ({
  currentDelivery,
  nextDelivery,
  selectedDelivery,
  allCompleted,
  onCloseCard,
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

  const activeItem = selectedDelivery || currentDelivery || nextDelivery;
  if (!activeItem) return null;

  const isInProgress = activeItem.isCurrent;

  const handleOpenNavigation = () => {
    onViewOrder(activeItem);
  };

  const handleStartAndNavigate = () => {
    onStartDelivery(activeItem);
  };

  const isAssistance = activeItem.order?.orderType === 'assistance' || activeItem.order?.taskType === 'assistance';
  const isPickup = activeItem.order?.shipping?.deliveryMethod === 'pickup';

  const allItems = [...(activeItem.order?.items || []), ...(activeItem.order?.assistanceItems || [])];
  const hasOutsideAssembly = allItems.some(i => {
    const h = String(i?.handlingType || i?.handling || '').toLowerCase();
    return h.includes('fora') || h.includes('externa') || h.includes('cliente');
  });
  const hasInternalAssembly = allItems.some(i => {
    const h = String(i?.handlingType || i?.handling || '').toLowerCase();
    return (h.includes('loja') || h.includes('deposito') || h.includes('depósito') || h.includes('interna') || h.includes('montado')) && !h.includes('fora');
  });

  return (
    <View style={[styles.card, isDarkMode && styles.cardDark]}>
      {/* Badge Superior e Botão de Fechar */}
      <View style={styles.headerRow}>
        <View style={[styles.badge, isInProgress ? styles.badgeProgress : styles.badgeNext]}>
          <Text style={[styles.badgeText, isInProgress ? styles.badgeTextProgress : styles.badgeTextNext]}>
            {isInProgress
              ? 'EM ANDAMENTO'
              : activeItem.isSuggestedFirst
              ? `PARADA SUGERIDA · #${activeItem.sequence}`
              : `PARADA · #${activeItem.sequence}`}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {activeItem.orderIndex && (
            <Text style={[styles.orderIndexText, isDarkMode && styles.textMuted]}>
              Pedido #{activeItem.orderIndex}
            </Text>
          )}

          {onCloseCard && (
            <TouchableOpacity
              onPress={onCloseCard}
              style={[styles.closeCardBtn, isDarkMode && styles.closeCardBtnDark]}
              activeOpacity={0.7}
              accessibilityLabel="Fechar card da parada"
            >
              <X size={15} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Badges de Tipo de Serviço & Montagem & Destaque Sugerido */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
        {activeItem.isSuggestedFirst && !isInProgress && (
          <View style={[styles.opBadge, { backgroundColor: '#f59e0b' }]}>
            <Text style={styles.opBadgeText}>⭐ SUGERIDA PELO ROTEIRO</Text>
          </View>
        )}
        <View style={[styles.opBadge, isAssistance ? styles.opBadgeAssis : isPickup ? styles.opBadgePick : styles.opBadgeDeliv]}>
          {isAssistance ? <Wrench size={10} color="#fff" /> : isPickup ? <Package size={10} color="#fff" /> : <Truck size={10} color="#fff" />}
          <Text style={styles.opBadgeText}>{isAssistance ? 'ASSISTÊNCIA' : isPickup ? 'RETIRADA' : 'ENTREGA'}</Text>
        </View>
        {hasInternalAssembly && (
          <View style={[styles.opBadge, styles.opBadgeDepot]}>
            <MobileDrill size={10} color="#fff" />
            <Text style={styles.opBadgeText}>MONTADO NO DEPÓSITO</Text>
          </View>
        )}
        {hasOutsideAssembly && (
          <View style={[styles.opBadge, styles.opBadgeOutside]}>
            <MobileDrill size={10} color="#fff" />
            <Text style={styles.opBadgeText}>MONTAGEM FORA</Text>
          </View>
        )}
      </View>

      {/* Cliente & Endereço */}
      <Text style={[styles.customerName, isDarkMode && styles.textLight]} numberOfLines={2}>
        {activeItem.customerName}
      </Text>

      <View style={styles.addressRow}>
        <MapPin size={13} color="#ef4444" style={{ marginTop: 2 }} />
        <Text style={[styles.addressText, isDarkMode && styles.textMuted]} numberOfLines={2}>
          {activeItem.fullAddress}
        </Text>
      </View>

      {/* Métricas: Período/Janela, Distância, Duração e Itens */}
      <View style={styles.metricsRow}>
        {activeItem.periodLabel ? (
          <View style={[styles.metricPill, activeItem.isFixedTime ? { backgroundColor: '#fffbeb' } : null]}>
            <Clock size={11} color={activeItem.isFixedTime ? '#d97706' : '#2563eb'} />
            <Text style={[styles.metricText, activeItem.isFixedTime ? { color: '#d97706' } : null]}>
              {activeItem.periodLabel}
            </Text>
          </View>
        ) : null}

        {activeItem.distanceKm ? (
          <View style={styles.metricPill}>
            <Navigation size={11} color="#2563eb" />
            <Text style={styles.metricText}>{activeItem.distanceKm} km</Text>
          </View>
        ) : null}

        {activeItem.durationMin ? (
          <View style={styles.metricPill}>
            <Clock size={11} color="#64748b" />
            <Text style={[styles.metricText, { color: '#64748b' }]}>~{activeItem.durationMin} min</Text>
          </View>
        ) : null}

        <View style={styles.metricPill}>
          <Package size={11} color="#64748b" />
          <Text style={[styles.metricText, { color: '#64748b' }]}>{activeItem.itemsCount} vol</Text>
        </View>
      </View>

      {/* Ações Operacionais */}
      <View style={styles.actionsContainer}>
        {isInProgress ? (
          <>
            <TouchableOpacity
              style={[styles.primaryActionBtnFull, { backgroundColor: '#2563eb' }]}
              onPress={handleOpenNavigation}
              activeOpacity={0.85}
            >
              <Play size={18} color="#ffffff" fill="#ffffff" />
              <Text style={styles.primaryActionText}>CONTINUAR ETAPAS DA ENTREGA</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.compactSecondaryBtn, isDarkMode && styles.compactSecondaryBtnDark]}
              onPress={() => onViewOrder(activeItem)}
              activeOpacity={0.85}
            >
              <Eye size={13} color={isDarkMode ? '#94a3b8' : '#64748b'} />
              <Text style={[styles.compactSecondaryText, isDarkMode && styles.textMuted]}>Ver pedido</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.primaryActionBtnFull, { backgroundColor: '#2563eb' }]}
              onPress={handleStartAndNavigate}
              activeOpacity={0.85}
            >
              <Play size={18} color="#ffffff" fill="#ffffff" />
              <Text style={styles.primaryActionText}>INICIAR ETAPAS DA ENTREGA</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.compactSecondaryBtn, isDarkMode && styles.compactSecondaryBtnDark]}
              onPress={() => onViewOrder(activeItem)}
              activeOpacity={0.85}
            >
              <Eye size={13} color={isDarkMode ? '#94a3b8' : '#64748b'} />
              <Text style={[styles.compactSecondaryText, isDarkMode && styles.textMuted]}>Ver pedido</Text>
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
    borderRadius: 20,
    padding: 14,
    marginHorizontal: 12,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    maxWidth: '100%',
  },
  cardDark: {
    backgroundColor: '#1e293b',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
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
    letterSpacing: 0.5,
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
  closeCardBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeCardBtnDark: {
    backgroundColor: '#334155',
  },
  customerName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4,
    lineHeight: 20,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginBottom: 8,
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
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 12,
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  metricText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563eb',
  },
  actionsContainer: {
    gap: 6,
  },
  primaryActionBtnFull: {
    width: '100%',
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  successActionBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  successActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  compactSecondaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
  },
  compactSecondaryBtnDark: {},
  compactSecondaryText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  completedTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  completedSubtitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  opBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  opBadgeDeliv: {
    backgroundColor: '#16a34a',
  },
  opBadgePick: {
    backgroundColor: '#9333ea',
  },
  opBadgeAssis: {
    backgroundColor: '#ea580c',
  },
  opBadgeDepot: {
    backgroundColor: '#f59e0b',
  },
  opBadgeOutside: {
    backgroundColor: '#dc2626',
  },
  opBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.4,
  },
  textLight: {
    color: '#f8fafc',
  },
  textMuted: {
    color: '#94a3b8',
  },
});
