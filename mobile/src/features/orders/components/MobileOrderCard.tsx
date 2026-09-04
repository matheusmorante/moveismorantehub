import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  Calendar,
  Clock,
  Store,
  Truck,
  Wrench,
  RotateCcw,
  Megaphone,
  CheckCircle2,
  XCircle,
} from 'lucide-react-native';
import { MobileDrill } from '../../../components/shared/MobileDrill';
import { formatOrderCode, formatOrderDate, formatOrderTotal } from '../../../utils/orderUtils';
import { OrderCardDeliveryFooter } from '../../../components/cards/OrderCardDeliveryFooter';

type Props = {
  order: any;
  dark: boolean;
  handlingOptions: any[];
  onDetails: () => void;
};

const getStatusConfig = (value: string) => {
  const status = String(value || '').toLowerCase();
  if (/draft|rascunh/.test(status)) {
    return { bg: '#64748b', border: '#475569', icon: 'draft' };
  }
  if (/sched|agendad/.test(status)) {
    return { bg: '#f59e0b', border: '#d97706', icon: 'scheduled' };
  }
  if (/fulfill|atendid|concluid|finaliz|entreg/.test(status)) {
    return { bg: '#10b981', border: '#059669', icon: 'fulfilled' };
  }
  if (status.includes('cancel')) {
    return { bg: '#f43f5e', border: '#e11d48', icon: 'cancelled' };
  }
  return { bg: '#64748b', border: '#475569', icon: 'draft' };
};

export function MobileOrderCard({ order, dark, handlingOptions, onDetails }: Props) {
  const data = order.order_data || {};
  const shipping = data.shipping || {};
  const orderType = String(order.orderType || order.order_type || data.orderType || 'sale').toLowerCase();
  const isAssistance = orderType === 'assistance';
  const isReturn = orderType === 'return';
  const isBudget = orderType === 'budget';
  const pickup = /pickup|retirada/.test(String(shipping.deliveryMethod || data.deliveryMethod || '').toLowerCase());
  
  // Normalização e detecção de montagens idêntica ao ERP
  const normalize = (str: string) => (str || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const allOptions = Array.isArray(handlingOptions) ? handlingOptions : [];
  const getMatchingOption = (hLabel: string) => {
    if (!hLabel) return null;
    return allOptions.find(o => {
      const sLabel = normalize(o?.label);
      return sLabel === hLabel || (sLabel && (hLabel.includes(sLabel) || sLabel.includes(hLabel)));
    });
  };

  const isHandlingDepot = (item: any) => {
    const hLabel = normalize(typeof item === 'string' ? item : item?.handlingType || item?.handling);
    if (!hLabel || hLabel.includes('sem montagem') || hLabel.includes('sem_montagem') || hLabel.includes('apenas entrega') || hLabel.includes('nao necessita')) return false;
    const opt = getMatchingOption(hLabel);
    if (opt?.includeInAssemblySchedule) return true;
    if (hLabel.includes('montagem no deposito') || hLabel.includes('montagem para retirada') || hLabel.includes('montagem no depósito') || hLabel.includes('deposito') || hLabel.includes('loja')) return true;
    return false;
  };

  const isHandlingOutside = (item: any) => {
    const hLabel = normalize(typeof item === 'string' ? item : item?.handlingType || item?.handling);
    if (!hLabel || hLabel.includes('sem montagem') || hLabel.includes('sem_montagem') || hLabel.includes('apenas entrega') || hLabel.includes('nao necessita')) return false;
    const opt = getMatchingOption(hLabel);
    if (opt?.isAssemblyOutside) return true;
    if (hLabel.includes('montagem na entrega') || hLabel.includes('montagem fora') || hLabel.includes('montagem no endereco') || hLabel.includes('montagem no local') || hLabel.includes('montador')) return true;
    return false;
  };

  const allOrderItems = [...(data.items || order.items || []), ...(data.assistanceItems || order.assistanceItems || [])];
  const orderHandling = normalize(
    data.handlingType || data.handling || data.deliveryType || 
    shipping.handlingType || shipping.handling || order.handling || ''
  );

  const hasAssemblyOutside = isHandlingOutside(orderHandling) || allOrderItems.some(isHandlingOutside);
  const hasAssemblyDepot = isHandlingDepot(orderHandling) || allOrderItems.some(isHandlingDepot);

  const schedule = shipping.scheduling || data.schedule || {};
  const scheduleDate = schedule.date || schedule.startDate || order.scheduled_date || order.date;
  const isDraft = /draft|rascunh/.test(String(order.status || data.status || '').toLowerCase());
  const cancelled = /cancel/.test(String(order.status || data.status || '').toLowerCase());
  const isStockChecked = Boolean(order.isStockChecked ?? data.isStockChecked);
  const isRegisteredInBling = Boolean(order.isRegisteredInBling ?? data.isRegisteredInBling);
  const pendingScheduling = Boolean(shipping.scheduling?.pendingScheduling || data.schedule?.pendingScheduling);

  // Tráfego pago
  const mOrigin1 = (order.marketingOrigin || data.marketingOrigin || "").toLowerCase();
  const mOrigin2 = (data.customerData?.marketingOrigin || "").toLowerCase();
  const isPaidTraffic =
    mOrigin1 === 'paid' || mOrigin1.includes('pago') || mOrigin1.includes('ads') || mOrigin1.includes('facebook') || mOrigin1.includes('insta') || mOrigin1.includes('trafego') || mOrigin1.includes('tráfego') || mOrigin1.includes('google') ||
    mOrigin2 === 'paid' || mOrigin2.includes('pago') || mOrigin2.includes('ads') || mOrigin2.includes('facebook') || mOrigin2.includes('insta') || mOrigin2.includes('trafego') || mOrigin2.includes('tráfego') || mOrigin2.includes('google');

  // Cor de fundo e borda do cabeçalho do card (idênticas ao ERP: emerald-200 para entrega e purple-200 para retirada)
  let headerBg = dark ? '#022c22' : '#a7f3d0'; // Emerald-200 no tom exato do ERP
  let headerBorder = dark ? '#065f46' : '#6ee7b7';
  if (cancelled) {
    headerBg = dark ? '#1e293b' : '#e2e8f0';
    headerBorder = dark ? '#334155' : '#cbd5e1';
  } else if (isDraft) {
    headerBg = dark ? '#334155' : '#f1f5f9';
    headerBorder = dark ? '#475569' : '#e2e8f0';
  } else if (isBudget) {
    headerBg = dark ? '#1e1b4b' : '#c7d2fe';
    headerBorder = dark ? '#312e81' : '#a5b4fc';
  } else if (isReturn) {
    headerBg = dark ? '#451a03' : '#fde68a';
    headerBorder = dark ? '#78350f' : '#fcd34d';
  } else if (isAssistance) {
    headerBg = dark ? '#431407' : '#fed7aa';
    headerBorder = dark ? '#7c2d12' : '#fdba74';
  } else if (pickup) {
    headerBg = dark ? '#3b0764' : '#e9d5ff'; // Purple-200 no tom exato do ERP
    headerBorder = dark ? '#581c87' : '#d8b4fe';
  }

  const statusConfig = getStatusConfig(order.status || data.status || 'Agendado');

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onDetails}
      style={[
        styles.card,
        dark && styles.cardDark,
        cancelled && styles.cardCancelled,
      ]}
    >
      {/* Overlay escuro / brilho baixo quando cancelado (idêntico ao ERP) */}
      {cancelled && <View style={styles.cancelledOverlay} pointerEvents="none" />}

      {/* Carimbo de Cancelado inclinado (idêntico ao ERP) */}
      {cancelled && (
        <View style={styles.stampContainer} pointerEvents="none">
          <View style={styles.stampBadge}>
            <Text style={styles.stampText}>CANCELADO</Text>
          </View>
        </View>
      )}

      {/* Header com Faixa Colorida e Selos Alinhados (idêntico ao ERP) */}
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: headerBorder, borderBottomWidth: 1 }]}>
        {/* Lado Esquerdo: Código do Pedido */}
        <View style={styles.codeBadge}>
          <Text style={styles.codeText}>#{formatOrderCode(order)}</Text>
        </View>

        {/* Lado Direito: Selos / Rótulos */}
        <View style={styles.badgesContainer}>
          {/* 1. Selo de Tipo de Pedido (Entrega / Retirada / Assistência / Devolução) */}
          <View style={[
            styles.iconBadge,
            isAssistance ? styles.badgeOrange : isReturn ? styles.badgeAmber : pickup ? styles.badgePurple : styles.badgeEmerald
          ]}>
            {isAssistance ? (
              <Wrench size={11} color="#ffffff" />
            ) : isReturn ? (
              <RotateCcw size={11} color="#ffffff" />
            ) : pickup ? (
              <Store size={11} color="#ffffff" />
            ) : (
              <Truck size={11} color="#ffffff" />
            )}
          </View>

          {/* 4. Selo de Tráfego Pago */}
          {isPaidTraffic && !isReturn && (
            <View style={[styles.iconBadge, styles.badgeOrange]}>
              <Megaphone size={11} color="#ffffff" />
            </View>
          )}

          {/* 5. Selo de Montagem Fora */}
          {!cancelled && hasAssemblyOutside && (
            <View style={[styles.iconBadge, styles.badgeRed]}>
              <MobileDrill size={11} color="#ffffff" />
            </View>
          )}

          {/* 6. Selo de Montagem Depósito */}
          {!cancelled && hasAssemblyDepot && (
            <View style={[styles.iconBadge, styles.badgeAmber]}>
              <MobileDrill size={11} color="#ffffff" />
            </View>
          )}

          {/* 7. Selo de Agendamento Pendente */}
          {pendingScheduling && (
            <View style={[styles.textBadge, styles.badgeOrange]}>
              <Clock size={10} color="#ffffff" />
              <Text style={styles.textBadgeLabel}>PENDENTE</Text>
            </View>
          )}

          {/* 8. Selo de Status (Quadrado 24x24 idêntico ao ERP) */}
          <View style={[styles.iconBadge, { backgroundColor: statusConfig.bg, borderColor: statusConfig.border }]}>
            {statusConfig.icon === 'fulfilled' ? (
              <CheckCircle2 size={11} color="#ffffff" />
            ) : statusConfig.icon === 'scheduled' ? (
              <Calendar size={11} color="#ffffff" />
            ) : statusConfig.icon === 'cancelled' ? (
              <XCircle size={11} color="#ffffff" />
            ) : (
              <Clock size={11} color="#ffffff" />
            )}
          </View>
        </View>
      </View>

      {/* Corpo do Card */}
      <View style={styles.body}>
        <Text style={[styles.customer, dark && styles.light]}>
          {data.customerData?.fullName || order.customer_name || 'Cliente'}
        </Text>
        <View style={styles.dates}>
          <View style={styles.column}>
            <Text style={styles.label}>PEDIDO</Text>
            <View style={styles.inline}>
              <Calendar size={13} color="#64748b" />
              <Text style={[styles.date, dark && styles.light]}>{formatOrderDate(order.created_at)}</Text>
            </View>
          </View>
          <View style={styles.column}>
            <Text style={styles.label}>{pickup ? 'RETIRADA' : 'ENTREGA'}</Text>
            <Text style={[styles.date, dark && styles.light]}>{scheduleDate ? formatOrderDate(scheduleDate) : 'Não informada'}</Text>
          </View>
        </View>
        {!!schedule.startTime && (
          <View style={styles.time}>
            <Clock size={12} color="#2563eb" />
            <Text style={styles.timeText}>{schedule.startTime}{schedule.endTime ? ` ÀS ${schedule.endTime}` : ''}</Text>
          </View>
        )}
        <View style={styles.footer}>
          <View>
            <Text style={styles.label}>TOTAL</Text>
            <Text style={styles.total}>{formatOrderTotal(order)}</Text>
          </View>
        </View>
        <OrderCardDeliveryFooter order={order} dark={dark} onPress={onDetails} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    elevation: 2,
    position: 'relative',
  },
  cardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  cardCancelled: {
    borderColor: '#cbd5e1',
  },
  cancelledOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 23, 0.55)',
    zIndex: 10,
    borderRadius: 20,
  },
  stampContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    overflow: 'hidden',
  },
  stampBadge: {
    backgroundColor: '#dc2626',
    borderColor: '#ffffff',
    borderWidth: 3,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    transform: [{ rotate: '-12deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 10,
    maxWidth: '85%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  header: {
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  codeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    marginLeft: 'auto',
  },
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
  },
  blingBadge: {
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
  },
  blingText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  textBadge: {
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
  },
  textBadgeLabel: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeSuccess: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  badgeMuted: {
    backgroundColor: '#64748b',
    borderColor: '#475569',
  },
  badgeEmerald: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  badgePurple: {
    backgroundColor: '#9333ea',
    borderColor: '#7e22ce',
  },
  badgeOrange: {
    backgroundColor: '#ea580c',
    borderColor: '#c2410c',
  },
  badgeAmber: {
    backgroundColor: '#d97706',
    borderColor: '#b45309',
  },
  badgeRed: {
    backgroundColor: '#dc2626',
    borderColor: '#b91c1c',
  },
  checkIndicator: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#065f46',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  body: {
    padding: 15,
    gap: 11,
  },
  customer: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  light: {
    color: '#f8fafc',
  },
  dates: {
    flexDirection: 'row',
  },
  column: {
    flex: 1,
    gap: 4,
  },
  inline: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  label: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8',
  },
  date: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  time: {
    flexDirection: 'row',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    padding: 6,
    borderRadius: 8,
  },
  timeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#2563eb',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  total: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2563eb',
  },
});
