import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  type GestureResponderEvent,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type LayoutChangeEvent,
} from 'react-native';
import { MapPin, Clock, Play } from 'lucide-react-native';
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
  isPreparing?: boolean;
  handlingOptions?: AssemblyHandlingOption[];
  isDarkMode?: boolean;
}

export const ScheduleCard: React.FC<Props> = ({
  item,
  onStartDelivery,
  onViewOrder,
  onOpenDeliveryFlow,
  isPreparing = false,
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
        isAssemblyOutsideType(entry?.handlingType || entry?.handling || undefined, handlingOptions)
      ));

  const hasDepotAssembly =
    !isReturn &&
    (serviceSummary.hasDepotAssembly ||
      isAssemblyInternalType(orderHandling, handlingOptions) ||
      items.some((entry: AssemblyHandlingItem) =>
        isAssemblyInternalType(entry?.handlingType || entry?.handling || undefined, handlingOptions)
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
  const isCompleted = item.status === 'completed';

  const handlePrimaryPress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    if (isDeliveryActivity) {
      if (onOpenDeliveryFlow) onOpenDeliveryFlow(item);
      else onStartDelivery(item);
    } else {
      onStartDelivery(item);
    }
  };

  const primaryActionConfig = isDeliveryActivity
    ? item.status === 'in_service'
      ? { label: 'Em atendimento', backgroundColor: '#7e22ce', animated: true }
      : item.status === 'in_progress'
        ? { label: 'Em rota', backgroundColor: '#1e3a8a', animated: true }
        : item.status === 'arrived'
          ? null
          : item.status === 'unattended'
            ? { label: 'Não entregue', backgroundColor: '#b91c1c', animated: false }
            : isPreparing
              ? { label: 'Em preparação', backgroundColor: '#2563eb', animated: true }
              : {
                  label: 'Iniciar fluxo de entrega - preparação',
                  backgroundColor: '#2563eb',
                  animated: false,
                }
    : { label: 'Abrir atividade', backgroundColor: '#2563eb', animated: false };

  const scheduleRes = resolveEffectiveSchedule(item.order);
  const effectiveOption = scheduleRes.effective;
  const displayPeriodLabel = effectiveOption?.formattedTime || item.periodLabel;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isDarkMode && styles.cardDark,
        isCompleted && styles.cardCompleted,
        isCompleted && isDarkMode && styles.cardCompletedDark,
      ]}
      onPress={() => onViewOrder(item)}
      activeOpacity={0.88}
    >
      {/* Cabeçalho do Card com selos de serviço e código do pedido */}
      <View style={styles.cardHeader}>
        <ScheduleCardBadges
          activityLabel={item.activityLabel}
          activityColor={item.activityColor}
          activityBackgroundColor={item.activityBackgroundColor}
          statusBadgeConfig={null}
          hasDepotAssembly={hasDepotAssembly}
          hasOutsideAssembly={hasOutsideAssembly}
          hasWallInstallation={serviceSummary.hasWallInstallation}
          isAlternative={scheduleRes.isUsingAlternative}
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
            <Clock size={13} color="#b45309" />
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
      <Text
        style={[
          styles.customerName,
          isDarkMode && styles.textLight,
          isCompleted && styles.completedText,
          isCompleted && isDarkMode && styles.completedTextDark,
        ]}
      >
        {item.customerName}
      </Text>

      {addressAndTravelText ? (
        <View style={styles.locationRow}>
          <MapPin size={13} color="#2563eb" style={{ marginTop: 1 }} />
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

      {!isCompleted && primaryActionConfig && (
        <View style={styles.actionsRow}>
          <ProcessActionButton
            label={primaryActionConfig.label}
            backgroundColor={primaryActionConfig.backgroundColor}
            animated={primaryActionConfig.animated}
            isDarkMode={isDarkMode}
            onPress={handlePrimaryPress}
            icon={
              isDeliveryActivity ? (
                <DeliveryFlowIcon size={17} color="#ffffff" />
              ) : (
                <Play size={14} color="#ffffff" fill="#ffffff" />
              )
            }
          />
        </View>
      )}
    </TouchableOpacity>
  );
};

interface ProcessActionButtonProps {
  label: string;
  backgroundColor: string;
  animated: boolean;
  isDarkMode: boolean;
  onPress: (event: GestureResponderEvent) => void;
  icon: React.ReactNode;
}

const ProcessActionButton: React.FC<ProcessActionButtonProps> = ({
  label,
  backgroundColor,
  animated,
  isDarkMode,
  onPress,
  icon,
}) => {
  const progress = useRef(new Animated.Value(0)).current;
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!animated || !width) {
      progress.stopAnimation();
      progress.setValue(0);
      return;
    }

    const stripeLoop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: true,
        isInteraction: false,
      })
    );
    stripeLoop.start();
    return () => stripeLoop.stop();
  }, [animated, progress, width]);

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-72, width + 72],
  });

  return (
    <TouchableOpacity
      style={[styles.startBtn, { backgroundColor }]}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.actionButtonContent} onLayout={onLayout}>
        {animated && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.actionStripe,
              { transform: [{ translateX }, { rotate: '18deg' }] },
            ]}
          />
        )}
        <View style={styles.actionButtonForeground}>
          {icon}
          <Text
            style={[styles.actionBtnText, isDarkMode && styles.actionBtnTextDark]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
          >
            {label}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  cardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  cardCompleted: { backgroundColor: '#f8fafc', shadowOpacity: 0, elevation: 0 },
  cardCompletedDark: { backgroundColor: '#172033', borderColor: '#29364a' },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
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
    marginBottom: 4,
  },
  fixedTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  fixedTimeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#92400e',
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
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginBottom: 6,
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
    marginBottom: 8,
  },
  productsCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  actionsRow: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
    marginTop: 4,
  },
  startBtn: {
    width: '100%',
    minHeight: 44,
    borderRadius: 12,
    elevation: 1,
    overflow: 'hidden',
  },
  actionButtonContent: {
    minHeight: 44,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  actionButtonForeground: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    zIndex: 1,
  },
  actionStripe: {
    position: 'absolute',
    top: -12,
    bottom: -12,
    width: 38,
    backgroundColor: '#ffffff',
    opacity: 0.24,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  actionBtnTextDark: {
    textShadowColor: 'rgba(15, 23, 42, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  textLight: {
    color: '#f8fafc',
  },
  textMuted: {
    color: '#94a3b8',
  },
  completedText: { color: '#64748b' },
  completedTextDark: { color: '#cbd5e1' },
});
