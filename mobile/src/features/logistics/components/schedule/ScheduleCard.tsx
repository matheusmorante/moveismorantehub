import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MapPin, Clock } from 'lucide-react-native';
import { DeliveryRouteItem } from '../../hooks/useDeliveryRoute';
import { analyzeOrderServiceHandlings } from '../../utils/scheduleServiceEstimator';
import {
  isAssemblyInternalType,
  isAssemblyOutsideType,
  type AssemblyHandlingItem,
  type AssemblyHandlingOption,
} from '../../../../utils/aiSummaryHelper';
import { resolveEffectiveSchedule } from '../../../../../../shared-utils/commercialOrderRules';
import { getDeliveryTimelineMarker } from './deliveryTimelineMarker';
import { ScheduleCardBadges } from './ScheduleCardBadges';
import { ScheduleAlternativesInfo } from './ScheduleAlternativesInfo';

interface Props {
  item: DeliveryRouteItem;
  onViewOrder: (item: DeliveryRouteItem) => void;
  handlingOptions?: AssemblyHandlingOption[];
  isDarkMode?: boolean;
}

export const ScheduleCard: React.FC<Props> = ({
  item,
  onViewOrder,
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
  const shipping = oData.shipping || item.order?.shipping || {};
  const deliveryAddr = shipping.deliveryAddress || item.order?.customer?.fullAddress || {};
  const neighborhood = deliveryAddr.neighborhood || '';
  const city = deliveryAddr.city || '';
  const locationText =
    [neighborhood, city].filter(Boolean).join(' · ') || item.fullAddress || '';
  const distance = Number(item.distanceKm ?? shipping.distance);
  const distanceText =
    Number.isFinite(distance) && distance > 0
      ? `${distance.toFixed(1).replace('.', ',')} km`
      : undefined;
  const storedDuration = Number(item.durationMin ?? shipping.durationMinutes);
  const durationMinutes =
    Number.isFinite(storedDuration) && storedDuration > 0
      ? Math.round(storedDuration)
      : Number.isFinite(distance) && distance > 0
        ? Math.max(1, Math.round(distance * 2.2))
        : undefined;
  const durationText = durationMinutes ? `~ ${durationMinutes} min` : undefined;
  const isDeliveryActivity = item.activityType === 'delivery';
  const isPreparationStarted = Boolean(oData.deliveryPreparationStartedAt);
  const timelineMarker = getDeliveryTimelineMarker(item, isDarkMode);
  const statusBadge =
    item.status === 'pending'
      ? isPreparationStarted
        ? null
        : {
            label: 'Agendada',
            backgroundColor: isDarkMode ? '#334155' : '#f1f5f9',
            color: isDarkMode ? '#e2e8f0' : '#475569',
          }
      : item.status === 'completed'
        ? isDeliveryActivity
          ? null
          : {
              label: 'Concluída',
              backgroundColor: isDarkMode ? '#14532d' : '#F0FDF4',
              color: isDarkMode ? '#bbf7d0' : '#16A34A',
            }
        : item.status === 'unattended'
          ? {
              label: 'Falhou',
              backgroundColor: isDarkMode ? '#7f1d1d' : '#FEF2F2',
              color: isDarkMode ? '#fecaca' : '#DC2626',
            }
          : !isDeliveryActivity
            ? {
                label: timelineMarker.label,
                backgroundColor: isDarkMode ? '#172554' : '#EFF6FF',
                color: isDarkMode ? '#93c5fd' : '#2563EB',
              }
            : null;

  const scheduleRes = resolveEffectiveSchedule(item.order);
  const effectiveOption = scheduleRes.effective;
  const displayPeriodLabel = (effectiveOption?.formattedTime || item.periodLabel).replace(
    /^🔒\s*/,
    ''
  );

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isDarkMode && styles.cardDark,
      ]}
      onPress={() => onViewOrder(item)}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityHint="Abre os detalhes do pedido"
    >
      {/* Horário e número do pedido */}
      <View style={styles.cardHeader}>
        <View style={styles.timeSection}>
          <Clock size={13} color={isDarkMode ? '#93c5fd' : '#2563EB'} />
          <Text numberOfLines={1} style={[styles.timeText, isDarkMode && styles.timeTextDark]}>
            {displayPeriodLabel}
          </Text>
        </View>
        <Text style={[styles.orderIndexText, isDarkMode && styles.textMuted]}>
          #{item.orderIndex || item.id.substring(0, 5)}
        </Text>
      </View>

      <ScheduleCardBadges
        activityLabel={item.activityLabel}
        activityColor={item.activityColor}
        activityBackgroundColor={item.activityBackgroundColor}
        hasDepotAssembly={hasDepotAssembly}
        hasOutsideAssembly={hasOutsideAssembly}
        hasWallInstallation={serviceSummary.hasWallInstallation}
        showActivityLabel={item.activityType !== 'delivery'}
        isDarkMode={isDarkMode}
      />

      {/* Programação alternativa & Reposicionamento (Informativo no mesmo Card) */}
      <ScheduleAlternativesInfo scheduleRes={scheduleRes} isDarkMode={isDarkMode} />

      {/* Cliente e localização */}
      <Text
        style={[
          styles.customerName,
          isDarkMode && styles.textLight,
        ]}
        numberOfLines={1}
      >
        {item.customerName}
      </Text>

      {locationText || durationText || distanceText ? (
        <View style={styles.locationRow}>
          <MapPin size={13} color={isDarkMode ? '#94a3b8' : '#64748b'} />
          {locationText ? (
            <Text
              numberOfLines={1}
              style={[styles.locationText, isDarkMode && styles.textMuted]}
            >
              {locationText}
            </Text>
          ) : null}
          {durationText ? (
            <>
              {locationText ? <View style={styles.distanceDivider} /> : null}
              <View
                style={[styles.distanceBadge, isDarkMode && styles.distanceBadgeDark]}
                accessible
                accessibilityRole="text"
                accessibilityLabel={`Tempo estimado: ${durationText}`}
              >
                <Clock size={10} color={isDarkMode ? '#bfdbfe' : '#2563EB'} />
                <Text style={[styles.distanceText, isDarkMode && styles.distanceTextDark]}>
                  {durationText}
                </Text>
              </View>
            </>
          ) : null}
          {distanceText ? (
            <>
              {locationText || durationText ? <View style={styles.distanceDivider} /> : null}
              <View
                style={[styles.distanceBadge, isDarkMode && styles.distanceBadgeDark]}
                accessible
                accessibilityRole="text"
                accessibilityLabel={`Distância cadastrada: ${distanceText}`}
              >
                <Text style={[styles.distanceText, isDarkMode && styles.distanceTextDark]}>
                  {distanceText}
                </Text>
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        {isDeliveryActivity && (item.status !== 'pending' || isPreparationStarted) ? (
          <View
            style={styles.flowStageRow}
            accessible
            accessibilityLabel={`Etapa atual: ${timelineMarker.label}`}
          >
            <View style={[styles.flowStageDot, { backgroundColor: timelineMarker.color }]} />
            <Text style={[styles.flowStageText, { color: timelineMarker.color }]}>
              {timelineMarker.label}
            </Text>
          </View>
        ) : (
          <View />
        )}
        <View style={styles.footerDetails}>
          <Text style={[styles.productsCountText, isDarkMode && styles.textMuted]}>
            {item.itemsCount} {item.itemsCount === 1 ? 'item' : 'itens'}
          </Text>
          {statusBadge ? (
            <View style={[styles.statusBadge, { backgroundColor: statusBadge.backgroundColor }]}>
              <Text style={[styles.statusBadgeText, { color: statusBadge.color }]}>
                {statusBadge.label}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  timeSection: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 },
  timeText: { color: '#2563EB', fontSize: 12, fontWeight: '900', flexShrink: 1 },
  timeTextDark: { color: '#93c5fd' },
  orderIndexText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 0.3,
  },
  customerName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
    marginBottom: 3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
    minWidth: 0,
  },
  locationText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
    flex: 1,
    minWidth: 0,
  },
  distanceDivider: { width: 1, height: 12, backgroundColor: '#cbd5e1' },
  distanceBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  distanceBadgeDark: { backgroundColor: '#172554' },
  distanceText: { color: '#2563EB', fontSize: 9, fontWeight: '800' },
  distanceTextDark: { color: '#bfdbfe' },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 2,
  },
  flowStageRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  flowStageDot: { width: 6, height: 6, borderRadius: 3 },
  flowStageText: { fontSize: 10, fontWeight: '800' },
  footerDetails: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { borderRadius: 7, paddingHorizontal: 6, paddingVertical: 3 },
  statusBadgeText: { fontSize: 9, fontWeight: '800' },
  productsCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  textLight: {
    color: '#f8fafc',
  },
  textMuted: {
    color: '#94a3b8',
  },
});
