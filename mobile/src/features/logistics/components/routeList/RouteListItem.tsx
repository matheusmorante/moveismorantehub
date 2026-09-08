import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Navigation, Eye, Check, AlertTriangle, MapPin, Package, Truck, Wrench } from 'lucide-react-native';
import { DeliveryRouteItem } from '../../hooks/useDeliveryRoute';
import { openExternalNavigation } from '../../utils/externalMapsNavigation';
import { MobileDrill } from '../../../../components/shared/MobileDrill';

interface Props {
  item: DeliveryRouteItem;
  onSelect: (item: DeliveryRouteItem) => void;
  onStartDelivery: (item: DeliveryRouteItem) => void;
  onViewOrder: (item: DeliveryRouteItem) => void;
  isDarkMode?: boolean;
}

export const RouteListItem: React.FC<Props> = ({
  item,
  onSelect,
  onStartDelivery,
  onViewOrder,
  isDarkMode = false,
}) => {
  const isCompleted = item.status === 'completed';
  const isUnattended = item.status === 'unattended';
  const isInProgress = item.status === 'in_progress' || item.status === 'in_service';
  const isNext = item.isNext && !isInProgress;

  const isAssistance = item.order?.orderType === 'assistance' || item.order?.taskType === 'assistance';
  const isPickup = item.order?.shipping?.deliveryMethod === 'pickup';

  const allItems = [...(item.order?.items || []), ...(item.order?.assistanceItems || [])];
  const hasOutsideAssembly = allItems.some(i => {
    const h = String(i?.handlingType || i?.handling || '').toLowerCase();
    return h.includes('fora') || h.includes('externa') || h.includes('cliente');
  });
  const hasInternalAssembly = allItems.some(i => {
    const h = String(i?.handlingType || i?.handling || '').toLowerCase();
    return (h.includes('loja') || h.includes('deposito') || h.includes('depósito') || h.includes('interna') || h.includes('montado')) && !h.includes('fora');
  });

  const handleOpenNav = () => {
    openExternalNavigation({
      latitude: item.coords?.latitude,
      longitude: item.coords?.longitude,
      fullAddress: item.fullAddress,
    });
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isDarkMode && styles.cardDark,
        isInProgress && styles.cardInProgress,
        isNext && styles.cardNext,
      ]}
      onPress={() => onSelect(item)}
      activeOpacity={0.7}
    >
      {/* Linha Superior de Badges Operacionais */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
        <View style={[styles.hBadge, isAssistance ? styles.hBadgeAssis : isPickup ? styles.hBadgePick : styles.hBadgeDeliv]}>
          {isAssistance ? <Wrench size={10} color="#fff" /> : isPickup ? <Package size={10} color="#fff" /> : <Truck size={10} color="#fff" />}
          <Text style={styles.hBadgeText}>{isAssistance ? 'ASSISTÊNCIA' : isPickup ? 'RETIRADA' : 'ENTREGA'}</Text>
        </View>
        {hasInternalAssembly && (
          <View style={[styles.hBadge, styles.hBadgeDepot]}>
            <MobileDrill size={10} color="#fff" />
            <Text style={styles.hBadgeText}>MONTAGEM DEPÓSITO</Text>
          </View>
        )}
        {hasOutsideAssembly && (
          <View style={[styles.hBadge, styles.hBadgeOutside]}>
            <MobileDrill size={10} color="#fff" />
            <Text style={styles.hBadgeText}>MONTAGEM FORA</Text>
          </View>
        )}
      </View>

      {/* Linha Principal: Ordem, Código e Status */}
      <View style={styles.topRow}>
        <View style={styles.sequenceBadge}>
          {isCompleted ? (
            <Check size={13} color="#16a34a" strokeWidth={3} />
          ) : isUnattended ? (
            <AlertTriangle size={13} color="#dc2626" strokeWidth={3} />
          ) : (
            <Text style={styles.sequenceText}>{item.sequence}</Text>
          )}
        </View>

        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[styles.customerName, isDarkMode && styles.textLight]} numberOfLines={1}>
            {item.customerName}
          </Text>
          {item.orderIndex && (
            <Text style={[styles.orderIndex, isDarkMode && styles.textMuted]}>
              Pedido #{item.orderIndex}
            </Text>
          )}
        </View>

        {/* Status Badge */}
        <View style={[
          styles.statusBadge,
          isCompleted && styles.statusCompleted,
          isUnattended && styles.statusUnattended,
          isInProgress && styles.statusProgress,
          (!isCompleted && !isUnattended && !isInProgress) && styles.statusPending,
        ]}>
          <Text style={[
            styles.statusText,
            isCompleted && { color: '#16a34a' },
            isUnattended && { color: '#dc2626' },
            isInProgress && { color: '#2563eb' },
            (!isCompleted && !isUnattended && !isInProgress) && { color: '#64748b' },
          ]}>
            {isCompleted ? 'ENTREGUE' : isUnattended ? 'NÃO ATENDIDO' : isInProgress ? 'EM ROTA' : 'PENDENTE'}
          </Text>
        </View>
      </View>

      {/* Endereço */}
      <View style={styles.addressRow}>
        <MapPin size={12} color="#ef4444" style={{ marginTop: 2 }} />
        <Text style={[styles.addressText, isDarkMode && styles.textMuted]} numberOfLines={1}>
          {item.fullAddress}
        </Text>
      </View>

      {/* Rodapé: Métricas e Ações Rápidas */}
      <View style={styles.footerRow}>
        <View style={styles.metricsGroup}>
          {item.periodLabel ? (
            <Text style={[styles.metricText, item.isFixedTime ? { color: '#d97706' } : { color: '#2563eb' }]}>
              {item.periodLabel}
            </Text>
          ) : null}
          {item.distanceKm ? (
            <Text style={[styles.metricText, { color: '#64748b' }]}>• {item.distanceKm} km</Text>
          ) : null}
          {item.durationMin ? (
            <Text style={[styles.metricText, { color: '#64748b' }]}>• ~{item.durationMin} min</Text>
          ) : null}
          <Text style={[styles.metricText, { color: '#94a3b8' }]}>• {item.itemsCount} vol</Text>
        </View>

        <View style={styles.actionsGroup}>
          <TouchableOpacity
            style={[styles.smallActionBtn, isDarkMode && styles.smallActionBtnDark]}
            onPress={handleOpenNav}
          >
            <Navigation size={14} color="#2563eb" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.smallActionBtn, isDarkMode && styles.smallActionBtnDark]}
            onPress={() => onViewOrder(item)}
          >
            <Eye size={14} color={isDarkMode ? '#cbd5e1' : '#64748b'} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  cardInProgress: {
    borderColor: '#3b82f6',
    borderWidth: 1.5,
    backgroundColor: '#f8faff',
  },
  cardNext: {
    borderColor: '#bae6fd',
    borderWidth: 1.5,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sequenceBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sequenceText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  orderIndex: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusCompleted: {
    backgroundColor: '#dcfce7',
  },
  statusUnattended: {
    backgroundColor: '#fee2e2',
  },
  statusProgress: {
    backgroundColor: '#eff6ff',
  },
  statusPending: {
    backgroundColor: '#f1f5f9',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  addressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  metricsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563eb',
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  smallActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallActionBtnDark: {
    backgroundColor: '#334155',
  },
  textLight: {
    color: '#f8fafc',
  },
  startActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textMuted: {
    color: '#94a3b8',
  },
  hBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
  },
  hBadgeDeliv: {
    backgroundColor: '#16a34a',
  },
  hBadgePick: {
    backgroundColor: '#9333ea',
  },
  hBadgeAssis: {
    backgroundColor: '#ea580c',
  },
  hBadgeDepot: {
    backgroundColor: '#f59e0b',
  },
  hBadgeOutside: {
    backgroundColor: '#dc2626',
  },
  hBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
});
