import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatOrderCode, isCancelledOrder } from '../../../utils/orderUtils';
import { getOrderStatusLabel } from '../domain/orderStatusPresentation';
import { getOrderAssemblyFlags, isPaidTrafficOrder } from '../domain/orderAssemblyRules';
import { getStatusConfig, resolveHeaderColors } from './card/orderCardTheme';
import { OrderCardBadges } from './card/OrderCardBadges';
import { OrderCardBody } from './card/OrderCardBody';

export interface MobileOrderCardProps {
  order: any;
  dark: boolean;
  handlingOptions: any[];
  onDetails: () => void;
  onFilterByLinkedOrder?: (orderIdOrCode: string) => void;
}

export const MobileOrderCard: React.FC<MobileOrderCardProps> = ({
  order,
  dark,
  handlingOptions,
  onDetails,
  onFilterByLinkedOrder,
}) => {
  const data = order?.order_data || {};
  const shipping = data.shipping || {};
  const orderType = String(
    order?.orderType || order?.order_type || data.orderType || 'sale'
  ).toLowerCase();
  const isAssistance = orderType === 'assistance';
  const isReturn = orderType === 'return';
  const isBudget = orderType === 'budget';
  const pickup = /pickup|retirada/.test(
    String(shipping.deliveryMethod || data.deliveryMethod || '').toLowerCase()
  );

  const { hasAssemblyDepot, hasAssemblyOutside } = getOrderAssemblyFlags(order, handlingOptions);
  const isPaidTraffic = isPaidTrafficOrder(order);

  const schedule = shipping.scheduling || data.schedule || {};
  const scheduleDate =
    schedule.date ||
    schedule.startDate ||
    order?.scheduled_date ||
    order?.date;
  const isDraft = /draft|rascunh/.test(String(order?.status || data.status || '').toLowerCase());
  const cancelled = isCancelledOrder(order);
  const isStockChecked = Boolean(
    order?.is_stock_checked ?? order?.isStockChecked ?? data.isStockChecked ?? data.is_stock_checked
  );
  const isRegisteredInBling = Boolean(
    order?.is_registered_in_bling ??
      order?.isRegisteredInBling ??
      data.isRegisteredInBling ??
      data.is_registered_in_bling
  );
  const stockProcessed = Boolean(
    isReturn
      ? order?.returnStockProcessed ??
        order?.return_stock_processed ??
        data.returnStockProcessed ??
        data.return_stock_processed ??
        order?.stock_processed ??
        data.stockProcessed
      : order?.stock_processed ??
        order?.stockProcessed ??
        data.stockProcessed ??
        data.stock_processed ??
        data.inventoryProcessed
  );
  const stockReversed = Boolean(
    isReturn
      ? order?.returnStockReversed ??
        order?.return_stock_reversed ??
        data.returnStockReversed ??
        data.return_stock_reversed ??
        order?.stock_reversed ??
        data.stockReversed
      : order?.stock_reversed ??
        order?.stockReversed ??
        data.stockReversed ??
        data.stock_reversed ??
        data.inventoryReversed
  );
  const returnOrderId =
    order?.return_order_id || order?.returnOrderId || data.returnOrderId || data.return_order_id;
  const returnKind =
    order?.return_kind || order?.returnKind || data.returnKind || data.return_kind;
  const linkedOrderId =
    order?.linked_order_id || order?.linkedOrderId || data.linkedOrderId || data.linked_order_id;
  const linkedOrderCode =
    order?.linked_order_code ||
    order?.linkedOrderCode ||
    data.linkedOrderCode ||
    data.linked_order_code;
  const pendingScheduling = Boolean(
    shipping.scheduling?.pendingScheduling || data.schedule?.pendingScheduling
  );

  const { headerBg, headerBorder } = resolveHeaderColors({
    dark,
    cancelled,
    isDraft,
    isBudget,
    isReturn,
    isAssistance,
    pickup,
  });

  const orderStatus = order?.status || data.status || 'scheduled';
  const statusConfig = getStatusConfig(orderStatus);
  const statusLabel = getOrderStatusLabel(
    { ...order, ...data, status: orderStatus },
    orderStatus === 'fulfilled'
      ? 'Atendido'
      : orderStatus === 'scheduled'
        ? 'Agendado'
        : orderStatus
  );

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onDetails}
      style={[
        styles.card,
        dark && styles.cardDark,
        cancelled && (dark ? styles.cardCancelledDark : styles.cardCancelled),
        cancelled && styles.cardCancelledLayout,
      ]}
    >
      {/* Overlay escuro / brilho baixo quando cancelado (idêntico ao ERP) */}
      {cancelled && <View pointerEvents="none" style={styles.cancelledOverlay} />}

      {/* Header com Faixa Colorida e Selos Alinhados (idêntico ao ERP) */}
      <View
        style={[
          styles.header,
          { backgroundColor: headerBg, borderBottomColor: headerBorder, borderBottomWidth: 1 },
        ]}
      >
        {/* Lado Esquerdo: Código do Pedido */}
        <View style={styles.codeBadge}>
          <Text style={styles.codeText}>#{formatOrderCode(order)}</Text>
        </View>

        {/* Lado Direito: Selos / Rótulos Operacionais e Fiscais */}
        <OrderCardBadges
          orderType={orderType}
          isAssistance={isAssistance}
          isReturn={isReturn}
          pickup={pickup}
          isDraft={isDraft}
          cancelled={cancelled}
          isStockChecked={isStockChecked}
          isRegisteredInBling={isRegisteredInBling}
          stockProcessed={stockProcessed}
          stockReversed={stockReversed}
          returnOrderId={returnOrderId}
          returnKind={returnKind}
          isPaidTraffic={isPaidTraffic}
          hasAssemblyOutside={hasAssemblyOutside}
          hasAssemblyDepot={hasAssemblyDepot}
          pendingScheduling={pendingScheduling}
          fiscalBadgeStatus={order?.fiscalBadgeStatus}
          fiscalHmlBadgeStatus={order?.fiscalHmlBadgeStatus}
          fiscalEstornoStatus={order?.fiscalEstornoBadgeStatus}
          fiscalDevolucaoStatus={order?.fiscalDevolucaoBadgeStatus}
          fiscalDevolucaoCount={order?.fiscalDevolucaoCount}
          statusConfig={statusConfig}
          statusLabel={statusLabel}
        />
      </View>

      {/* Corpo do Card: Cliente, Pedido Vinculado, Datas, Total e Footer */}
      <OrderCardBody
        order={order}
        dark={dark}
        isReturn={isReturn}
        pickup={pickup}
        pendingScheduling={pendingScheduling}
        scheduleDate={scheduleDate}
        scheduleEndDate={schedule.endDate}
        scheduleDateType={schedule.dateType}
        startTime={schedule.startTime}
        endTime={schedule.endTime}
        linkedOrderId={linkedOrderId}
        linkedOrderCode={linkedOrderCode}
        fiscalCancellationState={order?.fiscalCancellationState}
        onFilterByLinkedOrder={onFilterByLinkedOrder}
        onDetails={onDetails}
      />
    </TouchableOpacity>
  );
};


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
    borderColor: '#ef4444',
    borderWidth: 2,
    backgroundColor: '#fef2f2',
  },
  cardCancelledDark: {
    borderColor: '#dc2626',
    borderWidth: 2,
    backgroundColor: '#450a0a',
  },
  cardCancelledLayout: {
    overflow: 'hidden',
  },
  cancelledOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 23, 0.45)',
    zIndex: 10,
    borderRadius: 20,
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
});
