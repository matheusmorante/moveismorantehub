import React from 'react';
import { type GestureResponderEvent, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MapPin, Clock, Play, Eye } from 'lucide-react-native';
import { DeliveryRouteItem } from '../../hooks/useDeliveryRoute';
import { analyzeOrderServiceHandlings } from '../../utils/scheduleServiceEstimator';
import {
  isAssemblyInternalType,
  isAssemblyOutsideType,
  type AssemblyHandlingItem,
  type AssemblyHandlingOption,
} from '../../../../utils/aiSummaryHelper';
import { DeliveryFlowIcon } from '../../../../components/shared/DeliveryFlowIcon';
import { resolveEffectiveSchedule } from '../../../../../../shared-utils/commercialOrderRules';
import { ScheduleCardBadges } from './ScheduleCardBadges';
import { ScheduleAlternativesInfo } from './ScheduleAlternativesInfo';

interface Props {
  item: DeliveryRouteItem;
  onStartDelivery: (item: DeliveryRouteItem) => void;
  onViewOrder: (item: DeliveryRouteItem) => void;
  onOpenDeliveryFlow?: (item: DeliveryRouteItem) => void;
  handlingOptions?: AssemblyHandlingOption[];
  isDarkMode?: boolean;
}

export const ScheduleCard: React.FC<Props> = ({
  item,
  onStartDelivery,
  onViewOrder,
  onOpenDeliveryFlow,
  handlingOptions = [],
  isDarkMode = false,
}) => {
  const oData = item.order?.order_data || item.order || {};
  const serviceSummary = analyzeOrderServiceHandlings(
    oData.items || item.order?.items || oData.assistanceItems || []
  );
  const items = oData.items || item.order?.items || oData.assistanceItems || [];
  const orderHandling = oData.handlingType || item.order?.handling_type || oData.handling;
  const isReturn =
    String(
      oData.orderType || oData.order_type || item.order?.orderType || item.order?.order_type || ''
    ).toLowerCase() === 'return';

  const hasOutsideAssembly =
    !isReturn &&
    (serviceSummary.hasOutsideAssembly ||
      isAssemblyOutsideType(orderHandling, handlingOptions) ||
      items.some((entry: AssemblyHandlingItem) =>
        isAssemblyOutsideType(entry?.handlingType || entry?.handling, handlingOptions)
      ));

  const hasDepotAssembly =
    !isReturn &&
    (serviceSummary.hasDepotAssembly ||
      isAssemblyInternalType(orderHandling, handlingOptions) ||
      items.some((entry: AssemblyHandlingItem) =>
        isAssemblyInternalType(entry?.handlingType || entry?.handling, handlingOptions)
      ));

  // Endereço e localização
  const shipping = oData.shipping || {};
  const deliveryAddr = shipping.deliveryAddress || item.order?.customer?.fullAddress || {};
  const neighborhood = deliveryAddr.neighborhood || '';
  const city = deliveryAddr.city || '';
  const locationText = [neighborhood, city].filter(Boolean).join(' · ');

  // Tempo de deslocamento e quilometragem
  const travelMin = item.durationMin || shipping.durationMinutes;
  const travelKm = item.distanceKm || shipping.distance;
  const travelParts = [
    travelMin ? `${travelMin} min` : '',
    travelKm ? `${travelKm} km` : '',
  ].filter(Boolean);
  const travelText = travelParts.join(' · ');
  const addressAndTravelText = [locationText, travelText].filter(Boolean).join(' · ');

  const isDeliveryActivity = item.activityType === 'delivery';

  const statusBadgeConfig =
    item.status === 'in_progress'
      ? { label: 'EM ROTA', bg: '#fef3c7', color: '#b45309' }
      : item.status === 'arrived'
        ? { label: 'NO LOCAL', bg: '#cffafe', color: '#0e7490' }
        : item.status === 'in_service'
          ? { label: 'EM ATENDIMENTO', bg: '#dbeafe', color: '#1d4ed8' }
          : item.status === 'completed'
            ? { label: 'CONCLUÍDA', bg: '#dcfce7', color: '#15803d' }
            : item.status === 'unattended'
              ? { label: 'NÃO ENTREGUE', bg: '#fee2e2', color: '#b91c1c' }
              : null;

  const handlePrimaryPress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    if (isDeliveryActivity) {
      onViewOrder(item);
    } else {
      onStartDelivery(item);
    }
  };

  const handleDeliveryFlowPress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    if (onOpenDeliveryFlow) {
      onOpenDeliveryFlow(item);
    } else {
      onStartDelivery(item);
    }
  };

  const primaryActionConfig = isDeliveryActivity
    ? {
        label: 'VER DETALHES',
        accessibilityLabel: 'Ver detalhes do pedido',
        icon: <Eye size={18} color="#ffffff" />,
      }
    : {
        label: 'VER ATIVIDADE',
        accessibilityLabel: 'Ver atividade',
        icon: <Play size={14} color="#ffffff" fill="#ffffff" />,
      };

  const scheduleRes = resolveEffectiveSchedule(item.order);
  const effectiveOption = scheduleRes.effective;
  const displayPeriodLabel = effectiveOption?.formattedTime || item.periodLabel;

  return (
    <TouchableOpacity
      style={[styles.card, isDarkMode && styles.cardDark]}
      onPress={() => onViewOrder(item)}
      activeOpacity={0.88}
    >
      {/* Cabeçalho do Card com selos de serviço e código do pedido */}
      <View style={styles.cardHeader}>
        <ScheduleCardBadges
          activityLabel={item.activityLabel}
          activityColor={item.activityColor}
          activityBackgroundColor={item.activityBackgroundColor}
          statusBadgeConfig={statusBadgeConfig}
          hasDepotAssembly={hasDepotAssembly}
          hasOutsideAssembly={hasOutsideAssembly}
          hasWallInstallation={serviceSummary.hasWallInstallation}
          isDarkMode={isDarkMode}
        />

        <Text style={[styles.orderIndexText, isDarkMode && styles.textMuted]}>
          #{item.orderIndex || item.id.substring(0, 5)}
        </Text>
      </View>

      {/* Horário / Janela */}
      <View style={styles.timeSection}>
        {item.isFixedTime ? (
          <View style={styles.fixedTimeBadge}>
            <Clock size={13} color="#b91c1c" />
            <Text style={styles.fixedTimeText}>{displayPeriodLabel} · HORÁRIO FIXO</Text>
          </View>
        ) : (
          <View style={styles.windowBadge}>
            <Clock size={13} color="#2563eb" />
            <Text style={styles.windowText}>{displayPeriodLabel}</Text>
          </View>
        )}
      </View>

      {/* Programação alternativa & Reposicionamento (Informativo no mesmo Card) */}
      <ScheduleAlternativesInfo scheduleRes={scheduleRes} isDarkMode={isDarkMode} />

      {/* Cliente e Localização com Deslocamento e Quilometragem */}
      <Text style={[styles.customerName, isDarkMode && styles.textLight]}>{item.customerName}</Text>

      {addressAndTravelText ? (
        <View style={styles.locationRow}>
          <MapPin size={13} color="#ef4444" style={{ marginTop: 1 }} />
          <Text style={[styles.locationText, isDarkMode && styles.textMuted]}>
            {addressAndTravelText}
          </Text>
        </View>
      ) : null}

      {/* Quantidade de itens */}
      <View style={styles.metricsRow}>
        <Text style={[styles.productsCountText, isDarkMode && styles.textMuted]}>
          📦 {item.itemsCount} {item.itemsCount === 1 ? 'item' : 'itens'}
        </Text>
      </View>

      {/* Botões de Ação do Card */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.startBtn}
          onPress={handlePrimaryPress}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={primaryActionConfig.accessibilityLabel}
        >
          {primaryActionConfig.icon}
          <Text style={styles.startBtnText}>{primaryActionConfig.label}</Text>
        </TouchableOpacity>

        {/* Botão de Fluxo de Entrega — exclusivo para atividades de entrega */}
        {isDeliveryActivity && (
          <TouchableOpacity
            style={[styles.deliveryFlowBtn, isDarkMode && styles.deliveryFlowBtnDark]}
            onPress={handleDeliveryFlowPress}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Abrir fluxo de entrega"
          >
            <DeliveryFlowIcon size={20} color="#ffffff" />
            <Text style={styles.deliveryFlowBtnText}>FLUXO DE ENTREGA</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  cardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderIndexText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  timeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  fixedTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  fixedTimeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#b91c1c',
    letterSpacing: 0.3,
  },
  windowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  windowText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563eb',
  },
  customerName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    flex: 1,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  productsCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  startBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    paddingVertical: 11,
    borderRadius: 14,
    elevation: 2,
  },
  startBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  deliveryFlowBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingVertical: 11,
    borderRadius: 14,
    elevation: 2,
  },
  deliveryFlowBtnDark: {
    backgroundColor: '#059669',
  },
  deliveryFlowBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  textLight: {
    color: '#f8fafc',
  },
  textMuted: {
    color: '#94a3b8',
  },
});
