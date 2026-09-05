import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Navigation, Play, Eye, Check, AlertTriangle, MapPin, Package, Clock } from 'lucide-react-native';
import { DeliveryRouteItem } from '../../hooks/useDeliveryRoute';
import { openExternalNavigation } from '../../utils/externalMapsNavigation';

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
  const isFixedTime = item.scheduleSlot?.isFixedTime;

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
      ]}
      onPress={() => onSelect(item)}
      activeOpacity={0.7}
    >
      {/* Linha Superior: Código, Cliente e Restrição de Horário */}
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.customerName, isDarkMode && styles.textLight]} numberOfLines={1}>
            {item.customerName}
          </Text>
          {item.orderIndex && (
            <Text style={[styles.orderIndex, isDarkMode && styles.textMuted]}>
              Pedido #{item.orderIndex}
            </Text>
          )}
        </View>

        {/* Badge de Horário ou Status */}
        {isFixedTime ? (
          <View style={[styles.statusBadge, styles.statusFixed]}>
            <Text style={[styles.statusText, { color: '#7c3aed' }]}>
              {item.scheduleSlot.sublabel}
            </Text>
          </View>
        ) : (
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
              {isCompleted ? 'ENTREGUE' : isUnattended ? 'NÃO ATENDIDO' : isInProgress ? 'EM ROTA' : item.scheduleSlot.displayBadge}
            </Text>
          </View>
        )}
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
          <Text style={[styles.metricText, { color: '#64748b' }]}>📦 {item.itemsCount} vol</Text>
          {item.distanceKm ? (
            <Text style={[styles.metricText, { color: '#2563eb' }]}>• {item.distanceKm} km</Text>
          ) : null}
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

          {item.status === 'pending' && (
            <TouchableOpacity
              style={styles.startActionBtn}
              onPress={() => {
                onStartDelivery(item);
                handleOpenNav();
              }}
            >
              <Play size={12} color="#ffffff" fill="#ffffff" />
            </TouchableOpacity>
          )}
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
  statusFixed: {
    backgroundColor: '#f3e8ff',
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
  startActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textLight: {
    color: '#f8fafc',
  },
  textMuted: {
    color: '#94a3b8',
  },
});
