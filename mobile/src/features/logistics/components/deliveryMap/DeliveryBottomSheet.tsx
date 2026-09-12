import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { X, Play, MapPin, Package, Clock, AlertTriangle, FileText, Navigation, Timer } from 'lucide-react-native';
import { DeliveryRouteItem } from '../../hooks/useDeliveryRoute';

interface Props {
  item: DeliveryRouteItem | null;
  distanceKm?: number;
  durationMin?: number;
  onClose: () => void;
  onStartDelivery: (item: DeliveryRouteItem) => Promise<void> | void;
  onViewOrder: (item: DeliveryRouteItem) => void;
  isDarkMode?: boolean;
}

export const DeliveryBottomSheet: React.FC<Props> = ({
  item,
  distanceKm,
  durationMin,
  onClose,
  onStartDelivery,
  onViewOrder,
  isDarkMode = false,
}) => {
  const [starting, setStarting] = useState(false);

  if (!item) return null;

  const isPending = item.status === 'pending';
  const isInProgress = item.isCurrent;

  // Extrair observações separadas por linhas para criar rótulos individuais
  const obsList = typeof item.observations === 'string'
    ? item.observations
        .split(/\r?\n|•/)
        .map(line => line.trim())
        .filter(line => line.length > 0)
    : [];

  // Métricas de distância e tempo estimado
  const effectiveKm = distanceKm != null ? Number(distanceKm.toFixed(1)) : (item.distanceKm != null ? Number(item.distanceKm.toFixed(1)) : undefined);
  const effectiveDuration = durationMin != null ? Math.round(durationMin) : (item.durationMin != null ? Math.round(item.durationMin) : (effectiveKm ? Math.max(1, Math.round(effectiveKm * 2.2)) : undefined));

  const handleOpenNav = () => {
    onClose();
    onViewOrder(item);
  };

  // Iniciar etapas da entrega
  const handleStartAndNavigate = async () => {
    setStarting(true);
    try {
      await onStartDelivery(item);
      onClose();
    } catch (err) {
      Alert.alert('Atenção', 'Não foi possível registrar o início da entrega. Tente novamente.');
    } finally {
      setStarting(false);
    }
  };

  const handleViewOrderDetails = () => {
    onClose();
    onViewOrder(item);
  };

  return (
    <Modal visible={!!item} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        {/* Card flutuante centralizado no meio da tela */}
        <View style={[styles.sheetCard, isDarkMode && styles.sheetCardDark]}>
          {/* Cabeçalho do Card */}
          <View style={styles.headerRow}>
            <View style={styles.badgeRow}>
              {isInProgress && (
                <View style={[styles.orderBadge, styles.badgeProgress]}>
                  <Text style={[styles.orderBadgeText, styles.badgeTextProgress]}>
                    EM ANDAMENTO
                  </Text>
                </View>
              )}

              {item.orderIndex && (
                <Text style={[styles.orderNumber, isDarkMode && styles.textMuted]}>
                  Pedido #{item.orderIndex}
                </Text>
              )}
            </View>

            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, isDarkMode && styles.closeBtnDark]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color={isDarkMode ? '#cbd5e1' : '#64748b'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false} bounces={false}>
            {/* Cliente */}
            <Text style={[styles.customerName, isDarkMode && styles.textLight]} numberOfLines={2}>
              {item.customerName}
            </Text>

            {/* Endereço Completo */}
            <View style={styles.infoRow}>
              <MapPin size={15} color="#ef4444" style={{ marginTop: 2 }} />
              <Text style={[styles.addressText, isDarkMode && styles.textMuted]}>
                {item.fullAddress}
              </Text>
            </View>

            {/* Pílulas de Horário / Janela, Distância (km), Duração Estimada e Quantidade de Itens */}
            <View style={styles.pillsRow}>
              {item.periodLabel ? (
                <View style={[styles.pill, item.isFixedTime ? styles.pillFixed : styles.pillPeriod]}>
                  <Clock size={12} color={item.isFixedTime ? '#d97706' : '#2563eb'} />
                  <Text style={[styles.pillText, item.isFixedTime ? { color: '#d97706' } : { color: '#2563eb' }]}>
                    {item.periodLabel}
                  </Text>
                </View>
              ) : null}

              {/* Distância em KM */}
              {effectiveKm != null ? (
                <View style={[styles.pill, styles.pillDistance, isDarkMode && styles.pillDistanceDark]}>
                  <Navigation size={12} color={isDarkMode ? '#60a5fa' : '#2563eb'} />
                  <Text style={[styles.pillText, { color: isDarkMode ? '#93c5fd' : '#1d4ed8' }]}>
                    {effectiveKm} km
                  </Text>
                </View>
              ) : null}

              {/* Tempo Estimado */}
              {effectiveDuration != null ? (
                <View style={[styles.pill, styles.pillDuration, isDarkMode && styles.pillDurationDark]}>
                  <Timer size={12} color={isDarkMode ? '#38bdf8' : '#0284c7'} />
                  <Text style={[styles.pillText, { color: isDarkMode ? '#7dd3fc' : '#0369a1' }]}>
                    ~{effectiveDuration} min
                  </Text>
                </View>
              ) : null}

              {/* Quantidade de Itens (itens/produtos distintos do pedido) */}
              <View style={[styles.pill, isDarkMode && styles.pillDark]}>
                <Package size={12} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                <Text style={[styles.pillText, { color: isDarkMode ? '#cbd5e1' : '#475569' }]}>
                  {item.itemsCount} {item.itemsCount === 1 ? 'item' : 'itens'}
                </Text>
              </View>
            </View>

            {/* Destaque ⚠️ Observações da Entrega em container vermelho com rótulos individuais */}
            {obsList.length > 0 ? (
              <View style={[styles.obsBox, isDarkMode && styles.obsBoxDark]}>
                <View style={styles.obsHeader}>
                  <AlertTriangle size={13} color={isDarkMode ? '#f87171' : '#dc2626'} />
                  <Text style={[styles.obsTitle, isDarkMode && styles.obsTitleDark]}>OBSERVAÇÕES DA ENTREGA</Text>
                </View>

                <View style={styles.obsTagsContainer}>
                  {obsList.map((obsText, idx) => (
                    <View key={idx} style={[styles.obsTag, isDarkMode && styles.obsTagDark]}>
                      <Text style={[styles.obsTagText, isDarkMode && styles.obsTagTextDark]}>
                        {obsText}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>

          {/* Ações do Card */}
          <View style={styles.footerActions}>
            {starting ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#2563eb" />
                <Text style={styles.loadingText}>Registrando início da entrega...</Text>
              </View>
            ) : (
              <>
                {/* Botão de Ação Primária: Iniciar ou Continuar (Topo) */}
                {isPending ? (
                  <TouchableOpacity
                    style={[styles.primaryActionBtn, { backgroundColor: '#2563eb' }]}
                    onPress={handleStartAndNavigate}
                    activeOpacity={0.85}
                  >
                    <Play size={16} color="#ffffff" fill="#ffffff" />
                    <Text style={styles.primaryActionText}>INICIAR ETAPAS DA ENTREGA</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.primaryActionBtn, { backgroundColor: '#2563eb' }]}
                    onPress={handleOpenNav}
                    activeOpacity={0.85}
                  >
                    <Play size={16} color="#ffffff" fill="#ffffff" />
                    <Text style={styles.primaryActionText}>CONTINUAR ETAPAS DA ENTREGA</Text>
                  </TouchableOpacity>
                )}

                {/* Botão Secundário: Detalhes do Pedido (Embaixo) */}
                <TouchableOpacity
                  style={[styles.secondaryActionBtn, isDarkMode && styles.secondaryActionBtnDark]}
                  onPress={handleViewOrderDetails}
                  activeOpacity={0.8}
                >
                  <FileText size={16} color={isDarkMode ? '#93c5fd' : '#2563eb'} />
                  <Text style={[styles.secondaryActionText, isDarkMode && styles.secondaryActionTextDark]}>
                    Detalhes do Pedido
                  </Text>
                </TouchableOpacity>
              </>
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
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheetCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    maxHeight: '82%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  sheetCardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeProgress: {
    backgroundColor: '#eff6ff',
  },
  badgeNext: {
    backgroundColor: '#f0fdf4',
  },
  orderBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  badgeTextProgress: {
    color: '#2563eb',
  },
  badgeTextNext: {
    color: '#16a34a',
  },
  orderNumber: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnDark: {
    backgroundColor: '#334155',
  },
  contentScroll: {
    maxHeight: 220,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 8,
  },
  addressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    flex: 1,
    lineHeight: 16,
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pillDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  pillPeriod: {
    backgroundColor: '#eff6ff',
    borderColor: '#dbeafe',
  },
  pillFixed: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
  },
  pillDistance: {
    backgroundColor: '#eff6ff',
    borderColor: '#dbeafe',
  },
  pillDistanceDark: {
    backgroundColor: '#1e293b',
    borderColor: '#3b82f6',
  },
  pillDuration: {
    backgroundColor: '#f0f9ff',
    borderColor: '#e0f2fe',
  },
  pillDurationDark: {
    backgroundColor: '#0c4a6e30',
    borderColor: '#0284c7',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  obsBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    padding: 10,
    borderRadius: 14,
    marginBottom: 8,
  },
  obsBoxDark: {
    backgroundColor: '#450a0a',
    borderColor: '#7f1d1d',
  },
  obsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  obsTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#dc2626',
    letterSpacing: 0.5,
  },
  obsTitleDark: {
    color: '#f87171',
  },
  obsTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  obsTag: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
  },
  obsTagDark: {
    backgroundColor: '#7f1d1d',
    borderColor: '#991b1b',
  },
  obsTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#b91c1c',
    lineHeight: 16,
  },
  obsTagTextDark: {
    color: '#fef2f2',
  },
  footerActions: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 12,
  },
  primaryActionBtn: {
    width: '100%',
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  secondaryActionBtn: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  secondaryActionBtnDark: {
    backgroundColor: '#1e3a5f',
    borderColor: '#2563eb',
  },
  secondaryActionText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryActionTextDark: {
    color: '#93c5fd',
  },
  loadingBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563eb',
  },
  textLight: {
    color: '#f8fafc',
  },
  textMuted: {
    color: '#94a3b8',
  },
});
