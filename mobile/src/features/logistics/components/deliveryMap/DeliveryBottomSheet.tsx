import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { X, Navigation, Play, Eye, Phone, MessageCircle, MapPin, Package, Clock, AlertTriangle } from 'lucide-react-native';
import { DeliveryRouteItem } from '../../hooks/useDeliveryRoute';
import { openExternalNavigation } from '../../utils/externalMapsNavigation';

interface Props {
  item: DeliveryRouteItem | null;
  onClose: () => void;
  onStartDelivery: (item: DeliveryRouteItem) => void;
  onViewOrder: (item: DeliveryRouteItem) => void;
  isDarkMode?: boolean;
}

export const DeliveryBottomSheet: React.FC<Props> = ({
  item,
  onClose,
  onStartDelivery,
  onViewOrder,
  isDarkMode = false,
}) => {
  if (!item) return null;

  const isPending = item.status === 'pending';

  const handleOpenNav = () => {
    openExternalNavigation({
      latitude: item.coords?.latitude,
      longitude: item.coords?.longitude,
      fullAddress: item.fullAddress,
    });
  };

  return (
    <Modal visible={!!item} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheet, isDarkMode && styles.sheetDark]}>
          {/* Indicador de puxar (Drag handle) */}
          <View style={styles.dragHandle} />

          {/* Cabeçalho */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.orderBadge}>
                <Text style={styles.orderBadgeText}>PARADA #{item.sequence}</Text>
              </View>
              {item.orderIndex && (
                <Text style={[styles.orderNumber, isDarkMode && styles.textMuted]}>
                  #{item.orderIndex}
                </Text>
              )}
            </View>

            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, isDarkMode && styles.closeBtnDark]}>
              <X size={18} color={isDarkMode ? '#cbd5e1' : '#64748b'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.contentScroll} bounces={false}>
            {/* Cliente */}
            <Text style={[styles.customerName, isDarkMode && styles.textLight]}>
              {item.customerName}
            </Text>

            {/* Endereço */}
            <View style={styles.infoRow}>
              <MapPin size={15} color="#ef4444" style={{ marginTop: 2 }} />
              <Text style={[styles.addressText, isDarkMode && styles.textMuted]}>
                {item.fullAddress}
              </Text>
            </View>

            {/* Alerta de endereço sem coordenadas */}
            {!item.hasValidCoords && (
              <View style={styles.warningBox}>
                <AlertTriangle size={14} color="#f59e0b" />
                <Text style={styles.warningText}>
                  Não foi possível obter coordenadas exatas deste endereço.
                </Text>
              </View>
            )}

            {/* Métricas */}
            <View style={styles.metricsGrid}>
              {item.distanceKm && (
                <View style={[styles.metricCard, isDarkMode && styles.metricCardDark]}>
                  <Navigation size={14} color="#2563eb" />
                  <Text style={styles.metricCardValue}>{item.distanceKm} km</Text>
                  <Text style={styles.metricCardLabel}>Distância</Text>
                </View>
              )}

              {item.durationMin && (
                <View style={[styles.metricCard, isDarkMode && styles.metricCardDark]}>
                  <Clock size={14} color="#64748b" />
                  <Text style={[styles.metricCardValue, { color: '#64748b' }]}>{item.durationMin} min</Text>
                  <Text style={styles.metricCardLabel}>Estimado</Text>
                </View>
              )}

              <View style={[styles.metricCard, isDarkMode && styles.metricCardDark]}>
                <Package size={14} color="#64748b" />
                <Text style={[styles.metricCardValue, { color: '#64748b' }]}>{item.itemsCount}</Text>
                <Text style={styles.metricCardLabel}>Volumes</Text>
              </View>
            </View>

            {/* Observações */}
            {item.observations ? (
              <View style={[styles.obsBox, isDarkMode && styles.obsBoxDark]}>
                <Text style={styles.obsLabel}>OBSERVAÇÃO:</Text>
                <Text style={[styles.obsText, isDarkMode && styles.textMuted]}>{item.observations}</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Ações Inferiores */}
          <View style={styles.footerActions}>
            <TouchableOpacity
              style={[styles.navBtn]}
              onPress={handleOpenNav}
              activeOpacity={0.85}
            >
              <Navigation size={16} color="#2563eb" />
              <Text style={styles.navBtnText}>Abrir Navegação</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.viewOrderBtn, isDarkMode && styles.viewOrderBtnDark]}
              onPress={() => {
                onClose();
                onViewOrder(item);
              }}
              activeOpacity={0.85}
            >
              <Eye size={16} color={isDarkMode ? '#cbd5e1' : '#475569'} />
              <Text style={[styles.viewOrderText, isDarkMode && styles.textLight]}>Ver Pedido</Text>
            </TouchableOpacity>

            {isPending && (
              <TouchableOpacity
                style={styles.startBtn}
                onPress={() => {
                  onClose();
                  onStartDelivery(item);
                }}
                activeOpacity={0.85}
              >
                <Play size={16} color="#ffffff" fill="#ffffff" />
                <Text style={styles.startBtnText}>Iniciar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 24,
    maxHeight: '80%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  sheetDark: {
    backgroundColor: '#1e293b',
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  orderBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#2563eb',
    letterSpacing: 0.5,
  },
  orderNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnDark: {
    backgroundColor: '#334155',
  },
  contentScroll: {
    maxHeight: 280,
  },
  customerName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  addressText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    flex: 1,
    lineHeight: 18,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef3c7',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  warningText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400e',
    flex: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
  },
  metricCardDark: {
    backgroundColor: '#0f172a',
  },
  metricCardValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#2563eb',
    marginTop: 4,
  },
  metricCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    marginTop: 2,
  },
  obsBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 14,
    marginBottom: 14,
  },
  obsBoxDark: {
    backgroundColor: '#0f172a',
  },
  obsLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    marginBottom: 2,
  },
  obsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  footerActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  navBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  navBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#2563eb',
  },
  viewOrderBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  viewOrderBtnDark: {
    backgroundColor: '#334155',
  },
  viewOrderText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  startBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  startBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
  },
  textLight: {
    color: '#f8fafc',
  },
  textMuted: {
    color: '#94a3b8',
  },
});
