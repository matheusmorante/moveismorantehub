import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Navigation, Play, Eye, CheckCircle2, MapPin, Package, Clock, Check, Lock, Truck, X } from 'lucide-react-native';
import { DeliveryRouteItem } from '../../hooks/useDeliveryRoute';

interface Props {
  selectedDelivery: DeliveryRouteItem | null;
  currentDelivery: DeliveryRouteItem | null;
  pendingCount: number;
  allCompleted: boolean;
  onStartDelivery: (item: DeliveryRouteItem) => void;
  onViewOrder: (item: DeliveryRouteItem) => void;
  onRegisterService: (item: DeliveryRouteItem) => void;
  onClearSelection?: () => void;
  isDarkMode?: boolean;
}

export const NextDeliveryCard: React.FC<Props> = ({
  selectedDelivery,
  currentDelivery,
  pendingCount,
  allCompleted,
  onStartDelivery,
  onViewOrder,
  onRegisterService,
  onClearSelection,
  isDarkMode = false,
}) => {
  // 1. Todas as entregas concluídas
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

  // 2. Estado Sem Seleção: nenhuma entrega foi clicada no mapa
  if (!selectedDelivery) {
    return (
      <View style={[styles.card, styles.cardIdle, isDarkMode && styles.cardDark]}>
        <View style={styles.idleHeaderRow}>
          <View style={styles.idleIconCircle}>
            <Truck size={18} color="#2563eb" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.idleTitle, isDarkMode && styles.textLight]}>
              {pendingCount} {pendingCount === 1 ? 'entrega pendente hoje' : 'entregas pendentes hoje'}
            </Text>
            <Text style={[styles.idleSubtitle, isDarkMode && styles.textMuted]}>
              Toque em uma entrega no mapa para ver os detalhes.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // 3. Estado Com Entrega Selecionada
  const activeItem = selectedDelivery;
  const isInProgress = activeItem.isCurrent;
  const isFixedTime = activeItem.scheduleSlot?.isFixedTime;
  const slotText = activeItem.scheduleSlot?.displayBadge || activeItem.scheduleSlot?.sublabel;

  return (
    <View style={[styles.card, isDarkMode && styles.cardDark, isInProgress && styles.cardProgressBorder]}>
      {/* Header Badge + Botão Fechar Seleção (X) */}
      <View style={styles.headerRow}>
        <View style={[
          styles.badge,
          isInProgress ? styles.badgeProgress : isFixedTime ? styles.badgeFixed : styles.badgeSelected
        ]}>
          {isInProgress ? (
            <Text style={styles.badgeTextProgress}>🚚 ENTREGA EM ANDAMENTO</Text>
          ) : isFixedTime ? (
            <View style={styles.badgeRow}>
              <Lock size={10} color="#7c3aed" />
              <Text style={styles.badgeTextFixed}>HORÁRIO FIXO COMBINADO</Text>
            </View>
          ) : (
            <Text style={styles.badgeTextSelected}>ENTREGA SELECIONADA</Text>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {activeItem.orderIndex && (
            <Text style={[styles.orderIndexText, isDarkMode && styles.textMuted]}>
              Pedido #{activeItem.orderIndex}
            </Text>
          )}

          {onClearSelection && (
            <TouchableOpacity
              onPress={onClearSelection}
              style={[styles.closeSelectionBtn, isDarkMode && styles.closeSelectionBtnDark]}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={15} color={isDarkMode ? '#cbd5e1' : '#64748b'} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Nome do Cliente */}
      <Text style={[styles.customerName, isDarkMode && styles.textLight]} numberOfLines={1}>
        {activeItem.customerName}
      </Text>

      {/* Endereço */}
      <View style={styles.addressRow}>
        <MapPin size={13} color="#ef4444" style={{ marginTop: 2 }} />
        <Text style={[styles.addressText, isDarkMode && styles.textMuted]} numberOfLines={2}>
          {activeItem.fullAddress}
        </Text>
      </View>

      {/* Métricas e Agendamento (Período vs Horário Fixo) */}
      <View style={styles.metricsRow}>
        {slotText ? (
          <View style={[styles.metricPill, isFixedTime ? styles.metricPillFixed : styles.metricPillPeriod]}>
            {isFixedTime ? (
              <Lock size={11} color="#7c3aed" />
            ) : (
              <Clock size={11} color="#2563eb" />
            )}
            <Text style={[styles.metricText, isFixedTime ? { color: '#7c3aed' } : { color: '#2563eb' }]}>
              {slotText}
            </Text>
          </View>
        ) : null}

        {activeItem.distanceKm ? (
          <View style={styles.metricPill}>
            <Navigation size={11} color="#64748b" />
            <Text style={[styles.metricText, { color: '#64748b' }]}>{activeItem.distanceKm} km</Text>
          </View>
        ) : null}

        <View style={styles.metricPill}>
          <Package size={11} color="#64748b" />
          <Text style={[styles.metricText, { color: '#64748b' }]}>{activeItem.itemsCount} vol</Text>
        </View>
      </View>

      {/* Ações */}
      <View style={styles.actionsRow}>
        {isInProgress ? (
          <>
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#16a34a' }]}
              onPress={() => onViewOrder(activeItem)}
              activeOpacity={0.85}
            >
              <Navigation size={16} color="#ffffff" />
              <Text style={styles.primaryActionText}>Continuar Entrega</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryActionBtn, isDarkMode && styles.secondaryActionBtnDark]}
              onPress={() => onViewOrder(activeItem)}
              activeOpacity={0.85}
            >
              <Eye size={15} color={isDarkMode ? '#94a3b8' : '#475569'} />
              <Text style={[styles.secondaryActionText, isDarkMode && styles.textLight]}>Ver Pedido</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#2563eb' }]}
              onPress={() => onStartDelivery(activeItem)}
              activeOpacity={0.85}
            >
              <Play size={15} color="#ffffff" fill="#ffffff" />
              <Text style={styles.primaryActionText}>Iniciar Entrega</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryActionBtn, isDarkMode && styles.secondaryActionBtnDark]}
              onPress={() => onViewOrder(activeItem)}
              activeOpacity={0.85}
            >
              <Eye size={15} color={isDarkMode ? '#94a3b8' : '#475569'} />
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
    borderRadius: 22,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  cardIdle: {
    paddingVertical: 14,
  },
  cardProgressBorder: {
    borderColor: '#16a34a',
    borderWidth: 1.5,
  },
  idleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  idleIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  idleSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeSelected: {
    backgroundColor: '#eff6ff',
  },
  badgeTextSelected: {
    fontSize: 10,
    fontWeight: '900',
    color: '#2563eb',
    letterSpacing: 0.5,
  },
  badgeProgress: {
    backgroundColor: '#dcfce7',
  },
  badgeTextProgress: {
    fontSize: 10,
    fontWeight: '900',
    color: '#15803d',
    letterSpacing: 0.5,
  },
  badgeFixed: {
    backgroundColor: '#f5f3ff',
  },
  badgeTextFixed: {
    fontSize: 10,
    fontWeight: '900',
    color: '#7c3aed',
    letterSpacing: 0.5,
  },
  orderIndexText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
  },
  closeSelectionBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeSelectionBtnDark: {
    backgroundColor: '#334155',
  },
  customerName: {
    fontSize: 15,
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
    flex: 1,
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metricPillFixed: {
    backgroundColor: '#f5f3ff',
    borderColor: '#ddd6fe',
  },
  metricPillPeriod: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  metricText: {
    fontSize: 11,
    fontWeight: '800',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  secondaryActionBtnDark: {
    backgroundColor: '#334155',
    borderColor: '#475569',
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
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
    lineHeight: 16,
  },
  textLight: {
    color: '#f8fafc',
  },
  textMuted: {
    color: '#94a3b8',
  },
});
