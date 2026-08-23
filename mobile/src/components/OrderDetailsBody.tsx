import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { User, MapPin, DollarSign, AlertCircle, Truck, Package, Hammer, Clock, Navigation, Wrench, Calendar, FileText } from 'lucide-react-native';
import { supabase } from '../services/supabaseClient';
import { getOrderTotalValue, formatOrderDate, formatItemNameExact, formatFullAddress } from '../utils/orderUtils';
import { isAssemblyOutsideType, isAssemblyInternalType } from '../utils/aiSummaryHelper';

interface OrderDetailsBodyProps {
  order: any;
  isDarkMode: boolean;
}

export function OrderDetailsBody({ order, isDarkMode }: OrderDetailsBodyProps) {
  const [handlingOptions, setHandlingOptions] = useState<any[]>([]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase.from('settings').select('*').limit(1);
        if (data && data.length > 0) {
          const sData = data[0]?.data || data[0];
          const opts = [
            ...(sData.deliveryHandlingOptions || []),
            ...(sData.pickupHandlingOptions || [])
          ];
          setHandlingOptions(opts);
        }
      } catch (err) {}
    };
    fetchSettings();
  }, []);

  if (!order) return null;

  const orderData = order.order_data || order;
  const customer = orderData.customerData || orderData.customer || {};
  const shipping = orderData.shipping || {};
  const address = shipping.deliveryAddress || shipping.address || customer.address || customer.fullAddress || {};
  const items = orderData.items || order.items || orderData.assistanceItems || order.assistance_items || [];

  const totalValue = getOrderTotalValue(order);
  const sched = shipping.scheduling || orderData.schedule || {};

  // Modos de Entrega e Manuseio
  const deliveryMethod = (shipping.deliveryMethod || orderData.deliveryMethod || '').toLowerCase();
  const isPickup = deliveryMethod === 'pickup' || deliveryMethod === 'retirada';
  const orderType = (order.order_type || orderData.orderType || '').toLowerCase();
  const isAssistance = orderType === 'assistance';

  const orderHandling = (
    orderData.handlingType ||
    orderData.handling ||
    orderData.deliveryType ||
    shipping.handlingType ||
    shipping.handling ||
    order.handling ||
    ''
  ).toString();

  const hasOutsideAssembly = isAssemblyOutsideType(orderHandling, handlingOptions) || items.some((i: any) => isAssemblyOutsideType((i.handlingType || i.handling || '').toString(), handlingOptions));
  const hasInternalAssembly = isAssemblyInternalType(orderHandling, handlingOptions) || items.some((i: any) => isAssemblyInternalType((i.handlingType || i.handling || '').toString(), handlingOptions));

  // Coleta de TODAS as observações e separação em rótulos individuais
  const obsList: { title: string; text: string; type: 'general' | 'address' | 'delivery' | 'customer' }[] = [];

  const mainObs = (order.observation || orderData.observation || order.observations || orderData.observations || order.notes || orderData.notes || '').toString().trim();
  if (mainObs) {
    obsList.push({ title: 'Observações do Pedido', text: mainObs, type: 'general' });
  }

  const addrObs = (address.observation || address.notes || shipping.observation || shipping.deliveryObservation || '').toString().trim();
  if (addrObs) {
    obsList.push({ title: 'Observações de Endereço / Ponto de Referência', text: addrObs, type: 'address' });
  }

  const deliveryObs = (shipping.notes || shipping.instructions || orderData.deliveryNotes || '').toString().trim();
  if (deliveryObs && deliveryObs !== mainObs && deliveryObs !== addrObs) {
    obsList.push({ title: 'Instruções de Entrega', text: deliveryObs, type: 'delivery' });
  }

  const customerObs = (customer.notes || customer.observation || '').toString().trim();
  if (customerObs && customerObs !== mainObs && customerObs !== addrObs) {
    obsList.push({ title: 'Observações do Cliente', text: customerObs, type: 'customer' });
  }

  const distanceKm = shipping.distance != null ? Number(shipping.distance).toFixed(1) : null;
  const durationMin = shipping.durationMinutes != null ? Math.round(Number(shipping.durationMinutes)) : null;

  const getPaymentMethodLabel = (): string => {
    if (orderData.paymentMethod) return String(orderData.paymentMethod);
    if (orderData.payment_method) return String(orderData.payment_method);
    if (Array.isArray(orderData.payments) && orderData.payments.length > 0) {
      return orderData.payments
        .map((p: any) => p.method || p.paymentMethod || p.type || 'Não informado')
        .filter(Boolean)
        .join(', ');
    }
    return 'Não informada';
  };

  return (
    <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }} contentContainerStyle={{ gap: 16, paddingBottom: 48 }}>

      {/* Rótulos Principais no Topo */}
      <View style={styles.topBadgesRow}>
        <View style={[styles.typeBadge, isAssistance ? styles.badgeAssistance : (isPickup ? styles.badgePickup : styles.badgeDelivery)]}>
          {isAssistance ? <Wrench size={14} color="#ffffff" /> : isPickup ? <Package size={14} color="#ffffff" /> : <Truck size={14} color="#ffffff" />}
          <Text style={styles.typeBadgeText}>
            {isAssistance ? 'ASSISTÊNCIA' : (isPickup ? 'RETIRADA' : 'ENTREGA')}
          </Text>
        </View>

        {hasInternalAssembly && (
          <View style={[styles.typeBadge, styles.badgeInternal]}>
            <Hammer size={14} color="#ffffff" />
            <Text style={styles.typeBadgeText}>MONTAGEM DEPÓSITO</Text>
          </View>
        )}

        {hasOutsideAssembly && (
          <View style={[styles.typeBadge, styles.badgeOutside]}>
            <Hammer size={14} color="#ffffff" />
            <Text style={styles.typeBadgeText}>MONTAGEM FORA</Text>
          </View>
        )}
      </View>

      {/* Seção de Observações (Cada uma em seu rótulo/container individual) */}
      {obsList.length > 0 && (
        <View style={{ gap: 10 }}>
          {obsList.map((obs, idx) => (
            <View
              key={idx}
              style={[
                styles.obsBox,
                obs.type === 'address' ? styles.obsBoxAddress : styles.obsBoxDefault,
                isDarkMode && styles.obsBoxDark
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={16} color={obs.type === 'address' ? '#0284c7' : '#b45309'} />
                <Text style={[
                  styles.obsTitle,
                  { color: obs.type === 'address' ? '#0369a1' : '#b45309' },
                  isDarkMode && { color: obs.type === 'address' ? '#7dd3fc' : '#fef08a' }
                ]}>
                  {obs.title}
                </Text>
              </View>
              <Text style={[
                styles.obsText,
                { color: obs.type === 'address' ? '#0c4a6e' : '#92400e' },
                isDarkMode && { color: obs.type === 'address' ? '#e0f2fe' : '#fef9c3' }
              ]}>
                {obs.text}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Dados do Cliente */}
      <View style={[styles.sectionCard, isDarkMode && styles.sectionCardDark]}>
        <View style={styles.sectionHeader}>
          <User size={18} color="#2563eb" />
          <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>DADOS DO CLIENTE</Text>
        </View>
        <Text style={[styles.customerNameText, isDarkMode && styles.textDark]}>
          {customer.fullName || customer.name || 'Cliente Consumidor'}
        </Text>

        {/* Telefone e Documentos */}
        {!!customer.phone && (
          <Text style={[styles.subDetailText, isDarkMode && styles.subDetailTextDark]}>
            📞 Telefone: {customer.phone}
          </Text>
        )}
        {!!customer.document && (
          <Text style={[styles.subDetailText, isDarkMode && styles.subDetailTextDark]}>
            📄 CPF / CNPJ: {customer.document}
          </Text>
        )}
      </View>

      {/* Endereço e Agendamento */}
      <View style={[styles.sectionCard, isDarkMode && styles.sectionCardDark]}>
        <View style={styles.sectionHeader}>
          <MapPin size={18} color="#ef4444" />
          <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>ENDEREÇO E AGENDAMENTO</Text>
        </View>

        <Text style={[styles.addressText, isDarkMode && styles.textDark]}>
          {formatFullAddress(shipping, customer)}
        </Text>

        {/* Métricas de Rota */}
        {(distanceKm || durationMin) ? (
          <View style={[styles.routeMetricsBox, isDarkMode && styles.routeMetricsBoxDark]}>
            {distanceKm ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Navigation size={14} color="#2563eb" />
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#2563eb' }}>Distância: {distanceKm} KM</Text>
              </View>
            ) : null}
            {distanceKm && durationMin ? <Text style={{ color: '#cbd5e1' }}>|</Text> : null}
            {durationMin ? (
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b' }}>Tempo Estimado: ~ {durationMin} MIN</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.schedRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Calendar size={14} color="#64748b" />
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b' }}>
              Data: {formatOrderDate(sched.date || order.created_at)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Clock size={14} color="#64748b" />
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b' }}>
              Horário: {sched.startTime ? `${sched.startTime} ${sched.endTime ? `- ${sched.endTime}` : ''}` : 'Horário não definido'}
            </Text>
          </View>
        </View>
      </View>

      {/* Forma de Pagamento */}
      <View style={[styles.sectionCard, isDarkMode && styles.sectionCardDark]}>
        <View style={styles.sectionHeader}>
          <DollarSign size={18} color="#16a34a" />
          <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>FORMA DE PAGAMENTO</Text>
        </View>
        <Text style={[styles.customerNameText, { fontSize: 14, color: '#16a34a' }, isDarkMode && styles.textDark]}>
          💰 {getPaymentMethodLabel().toUpperCase()}
        </Text>
      </View>

      {/* Itens do Pedido */}
      <View style={[styles.sectionCard, isDarkMode && styles.sectionCardDark]}>
        <View style={styles.sectionHeader}>
          <FileText size={18} color="#7c3aed" />
          <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
            ITENS DO PEDIDO ({items.length})
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          {items.map((item: any, idx: number) => {
            const qty = Number(item.quantity || item.qty || 1);
            const name = formatItemNameExact(item);
            const price = Number(item.total || item.price || item.unitPrice || 0);

            return (
              <View key={idx} style={[styles.itemRow, isDarkMode && styles.itemRowDark]}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={[styles.itemNameText, isDarkMode && styles.textDark]}>
                    <Text style={{ fontWeight: '900', color: '#7c3aed' }}>{qty}x</Text> {name}
                  </Text>
                </View>

                {price > 0 ? (
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#16a34a' }}>
                    R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>

      {/* Resumo Financeiro */}
      <View style={[styles.financialCard, isDarkMode && styles.financialCardDark]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <DollarSign size={22} color="#16a34a" />
          <Text style={[styles.financialTitle, isDarkMode && styles.textDark]}>VALOR TOTAL DO PEDIDO</Text>
        </View>
        <Text style={styles.financialValueText}>
          R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  topBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeDelivery: { backgroundColor: '#10b981' },
  badgePickup: { backgroundColor: '#a855f7' },
  badgeAssistance: { backgroundColor: '#f59e0b' },
  badgeOutside: { backgroundColor: '#ef4444' },
  badgeInternal: { backgroundColor: '#f59e0b' },
  typeBadgeText: { fontSize: 10, fontWeight: '900', color: '#ffffff', letterSpacing: 0.5 },
  obsBox: { padding: 14, borderRadius: 16, borderWidth: 1, gap: 6 },
  obsBoxDefault: { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
  obsBoxAddress: { backgroundColor: '#e0f2fe', borderColor: '#bae6fd' },
  obsBoxDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  obsTitle: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  obsText: { fontSize: 13, fontWeight: '700', lineHeight: 19 },
  sectionCard: { backgroundColor: '#ffffff', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', gap: 10, elevation: 1 },
  sectionCardDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: '#0f172a', letterSpacing: 0.5 },
  textDark: { color: '#f8fafc' },
  customerNameText: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  subDetailText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  subDetailTextDark: { color: '#cbd5e1' },
  addressText: { fontSize: 13, fontWeight: '700', color: '#334155', lineHeight: 19 },
  routeMetricsBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#eff6ff', borderRadius: 12, borderWidth: 1, borderColor: '#dbeafe' },
  routeMetricsBoxDark: { backgroundColor: '#0f172a', borderColor: '#1e293b' },
  schedRow: { flexDirection: 'column', gap: 6, paddingTop: 4 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  itemRowDark: { borderBottomColor: '#334155' },
  itemNameText: { fontSize: 13, fontWeight: '700', color: '#1e3a8a' },
  financialCard: { backgroundColor: '#f0fdf4', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: '#bbf7d0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 1 },
  financialCardDark: { backgroundColor: '#064e3b', borderColor: '#047857' },
  financialTitle: { fontSize: 13, fontWeight: '900', color: '#065f46' },
  financialValueText: { fontSize: 18, fontWeight: '900', color: '#16a34a' }
});
