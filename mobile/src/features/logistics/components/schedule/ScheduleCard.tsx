import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronDown, ChevronUp, MapPin, Clock, Play, ArrowRight, Truck } from 'lucide-react-native';
import { DeliveryRouteItem } from '../../hooks/useDeliveryRoute';
import { analyzeOrderServiceHandlings, formatEstimatedServiceDuration } from '../../utils/scheduleServiceEstimator';
import { MobileDrill } from '../../../../components/shared/MobileDrill';

interface Props {
  item: DeliveryRouteItem;
  onStartDelivery: (item: DeliveryRouteItem) => void;
  onViewOrder: (item: DeliveryRouteItem) => void;
  isDarkMode?: boolean;
}

export const ScheduleCard: React.FC<Props> = ({
  item,
  onStartDelivery,
  onViewOrder,
  isDarkMode = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const oData = item.order?.order_data || item.order || {};
  const items = oData.items || item.order?.items || oData.assistanceItems || [];
  const serviceSummary = analyzeOrderServiceHandlings(items);

  // Informações de pagamento
  const financial = oData.financial || item.order?.financial || {};
  const pendingAmount = Number(financial.remainingAmount || financial.pendingBalance || 0);
  const paymentMethod = financial.pendingPaymentMethod || financial.paymentMethod || 'PIX / Cartão';

  // Observações operacionais
  const observations = (oData.observations || item.order?.observations || item.observations || '').trim();

  // Bairro e Cidade
  const shipping = oData.shipping || {};
  const deliveryAddr = shipping.deliveryAddress || item.order?.customer?.fullAddress || {};
  const neighborhood = deliveryAddr.neighborhood || '';
  const city = deliveryAddr.city || '';
  const locationText = [neighborhood, city].filter(Boolean).join(' · ');

  return (
    <TouchableOpacity
      style={[styles.card, isDarkMode && styles.cardDark]}
      onPress={() => onViewOrder(item)}
      activeOpacity={0.88}
    >
      {/* Cabeçalho do Card com Sequência, Parafusadeira e Código do Pedido */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.sequenceBadge}>
            <Text style={styles.sequenceBadgeText}>{item.sequence}ª ENTREGA</Text>
          </View>

          {/* Selo Parafusadeira Amarela - Montagem Depósito */}
          {serviceSummary.hasDepotAssembly && (
            <View style={[styles.drillBadge, styles.drillBadgeDepot]}>
              <MobileDrill size={11} color="#ffffff" />
            </View>
          )}

          {/* Selo Parafusadeira Vermelha - Montagem Fora */}
          {serviceSummary.hasOutsideAssembly && (
            <View style={[styles.drillBadge, styles.drillBadgeOutside]}>
              <MobileDrill size={11} color="#ffffff" />
            </View>
          )}

          {/* Selo de Fixação em Parede / Instalação de Aéreo (se houver) */}
          {serviceSummary.hasWallInstallation && (
            <View style={[styles.wallBadge, isDarkMode && styles.wallBadgeDark]}>
              <Text style={styles.wallBadgeText}>🧱 AÉREO</Text>
            </View>
          )}
        </View>

        <Text style={[styles.orderIndexText, isDarkMode && styles.textMuted]}>
          #{item.orderIndex || item.id.substring(0, 5)}
        </Text>
      </View>

      {/* Horário / Janela */}
      <View style={styles.timeSection}>
        {item.isFixedTime ? (
          <View style={styles.fixedTimeBadge}>
            <Clock size={13} color="#b91c1c" />
            <Text style={styles.fixedTimeText}>{item.periodLabel} · HORÁRIO FIXO</Text>
          </View>
        ) : (
          <View style={styles.windowBadge}>
            <Clock size={13} color="#2563eb" />
            <Text style={styles.windowText}>{item.periodLabel}</Text>
          </View>
        )}
      </View>

      {/* Cliente e Localização */}
      <Text style={[styles.customerName, isDarkMode && styles.textLight]} numberOfLines={1}>
        {item.customerName}
      </Text>

      {locationText ? (
        <View style={styles.locationRow}>
          <MapPin size={13} color="#ef4444" style={{ marginTop: 1 }} />
          <Text style={[styles.locationText, isDarkMode && styles.textMuted]} numberOfLines={1}>
            {locationText}
          </Text>
        </View>
      ) : null}

      {/* Quantidade de produtos e Tempo Estimado */}
      <View style={styles.metricsRow}>
        <Text style={[styles.productsCountText, isDarkMode && styles.textMuted]}>
          📦 {item.itemsCount} {item.itemsCount === 1 ? 'produto' : 'produtos'}
        </Text>
        <Text style={[styles.durationText, isDarkMode && styles.textMuted]}>
          ⏱ Serviço previsto: {formatEstimatedServiceDuration(serviceSummary.estimatedMinutes)}
        </Text>
      </View>

      {/* Botões de Ação do Card */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.startBtn}
          onPress={(e) => {
            e.stopPropagation?.();
            onStartDelivery(item);
          }}
          activeOpacity={0.85}
        >
          <Play size={14} color="#ffffff" fill="#ffffff" />
          <Text style={styles.startBtnText}>INICIAR ENTREGA</Text>
        </TouchableOpacity>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  sequenceBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  sequenceBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1d4ed8',
    letterSpacing: 0.5,
  },
  drillBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  drillBadgeDepot: {
    backgroundColor: '#d97706', // Amarelo/Âmbar oficial do Morante Hub para Montagem Depósito
  },
  drillBadgeOutside: {
    backgroundColor: '#dc2626', // Vermelho oficial do Morante Hub para Montagem Fora
  },
  wallBadge: {
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  wallBadgeDark: {
    backgroundColor: '#2e1065',
    borderColor: '#5b21b6',
  },
  wallBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#7c3aed',
    letterSpacing: 0.3,
  },
  orderIndexText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
  },
  timeSection: {
    marginBottom: 8,
  },
  fixedTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  fixedTimeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#b91c1c',
  },
  windowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  windowText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  serviceBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  serviceBadge: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  serviceBadgeDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  serviceBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginBottom: 12,
  },
  productsCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  durationText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0369a1',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  startBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 14,
  },
  startBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  expandBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandBtnDark: {
    backgroundColor: '#334155',
  },
  expandedContainer: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10,
  },
  expandedSectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  productsList: {
    gap: 8,
  },
  productItem: {
    gap: 3,
  },
  productName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  productHandlingTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagOutside: {
    fontSize: 10,
    fontWeight: '800',
    color: '#dc2626',
  },
  tagDepot: {
    fontSize: 10,
    fontWeight: '800',
    color: '#d97706',
  },
  tagWall: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7c3aed',
  },
  tagDefault: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  paymentBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 10,
    borderRadius: 10,
  },
  paymentLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#166534',
  },
  paymentValue: {
    fontSize: 12,
    fontWeight: '900',
    color: '#15803d',
  },
  observationText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    color: '#475569',
  },
  fullOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 12,
    paddingTop: 8,
  },
  fullOrderBtnText: {
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
