import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import {
  X,
  MapPin,
  Package,
  Clock,
  AlertTriangle,
  FileText,
  Navigation,
  Timer,
  Truck,
} from 'lucide-react-native';
import { DeliveryRouteItem } from '../../hooks/useDeliveryRoute';
import { styles } from './deliveryBottomSheet.styles';

interface Props {
  item: DeliveryRouteItem | null;
  distanceKm?: number;
  durationMin?: number;
  onClose: () => void;
  onViewOrder: (item: DeliveryRouteItem) => void;
  onOpenDeliveryFlow: (item: DeliveryRouteItem) => void;
  isDarkMode?: boolean;
}

export const DeliveryBottomSheet: React.FC<Props> = ({
  item,
  distanceKm,
  durationMin,
  onClose,
  onViewOrder,
  onOpenDeliveryFlow,
  isDarkMode = false,
}) => {
  const insets = useSafeAreaInsets();

  if (!item) return null;

  const isInProgress = item.isCurrent;

  const handleViewOrderDetails = () => {
    onClose();
    onViewOrder(item);
  };

  const handleOpenDeliveryFlow = () => {
    onClose();
    onOpenDeliveryFlow(item);
  };

  // Extrair observações separadas por linhas para criar rótulos individuais
  const obsList =
    typeof item.observations === 'string'
      ? item.observations
          .split(/\r?\n|•/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
      : [];

  // Métricas de distância e tempo estimado
  const effectiveKm =
    distanceKm != null
      ? Number(distanceKm.toFixed(1))
      : item.distanceKm != null
        ? Number(item.distanceKm.toFixed(1))
        : undefined;
  const effectiveDuration =
    durationMin != null
      ? Math.round(durationMin)
      : item.durationMin != null
        ? Math.round(item.durationMin)
        : effectiveKm
          ? Math.max(1, Math.round(effectiveKm * 2.2))
          : undefined;

  return (
    <Modal visible={!!item} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={[
          styles.overlay,
          { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
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

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, isDarkMode && styles.closeBtnDark]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color={isDarkMode ? '#cbd5e1' : '#64748b'} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.contentScroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Cliente */}
            <Text style={[styles.customerName, isDarkMode && styles.textLight]}>
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
                <View
                  style={[styles.pill, item.isFixedTime ? styles.pillFixed : styles.pillPeriod]}
                >
                  <Clock size={12} color={item.isFixedTime ? '#d97706' : '#2563eb'} />
                  <Text
                    style={[
                      styles.pillText,
                      item.isFixedTime ? { color: '#d97706' } : { color: '#2563eb' },
                    ]}
                  >
                    {item.periodLabel}
                  </Text>
                </View>
              ) : null}

              {/* Distância em KM */}
              {effectiveKm != null ? (
                <View
                  style={[styles.pill, styles.pillDistance, isDarkMode && styles.pillDistanceDark]}
                >
                  <Navigation size={12} color={isDarkMode ? '#60a5fa' : '#2563eb'} />
                  <Text style={[styles.pillText, { color: isDarkMode ? '#93c5fd' : '#1d4ed8' }]}>
                    {effectiveKm} km
                  </Text>
                </View>
              ) : null}

              {/* Tempo Estimado */}
              {effectiveDuration != null ? (
                <View
                  style={[styles.pill, styles.pillDuration, isDarkMode && styles.pillDurationDark]}
                >
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
                  <Text style={[styles.obsTitle, isDarkMode && styles.obsTitleDark]}>
                    OBSERVAÇÕES DA ENTREGA
                  </Text>
                </View>

                <View style={styles.obsTagsContainer}>
                  {obsList.map((obsText, idx) => (
                    <View key={`${idx}-${obsText.slice(0, 12)}`} style={[styles.obsTag, isDarkMode && styles.obsTagDark]}>
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
            {/* Botão Secundário: Detalhes do Pedido */}
            <TouchableOpacity
              style={[styles.secondaryActionBtn, isDarkMode && styles.secondaryActionBtnDark]}
              onPress={handleViewOrderDetails}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Ver detalhes do pedido"
            >
              <FileText size={16} color={isDarkMode ? '#93c5fd' : '#2563eb'} />
              <Text
                style={[
                  styles.secondaryActionText,
                  isDarkMode && styles.secondaryActionTextDark,
                ]}
              >
                Detalhes do Pedido
              </Text>
            </TouchableOpacity>

            {item.activityType === 'delivery' && (
              <TouchableOpacity
                style={[
                  styles.deliveryFlowActionBtn,
                  isDarkMode && styles.deliveryFlowActionBtnDark,
                ]}
                onPress={handleOpenDeliveryFlow}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Iniciar fluxo de entrega"
              >
                <Truck size={20} color="#ffffff" strokeWidth={2} />
                <Text style={styles.deliveryFlowActionText}>INICIAR FLUXO DE ENTREGA</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};
