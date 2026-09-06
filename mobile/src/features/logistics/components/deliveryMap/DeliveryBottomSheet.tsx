import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { X, Navigation, Play, Eye, MapPin, Package, Clock, AlertTriangle, DollarSign, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react-native';
import { DeliveryRouteItem } from '../../hooks/useDeliveryRoute';
import { openExternalNavigation } from '../../utils/externalMapsNavigation';

interface Props {
  item: DeliveryRouteItem | null;
  onClose: () => void;
  onStartDelivery: (item: DeliveryRouteItem) => Promise<void> | void;
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
  const [starting, setStarting] = useState(false);
  const [showItemsDetails, setShowItemsDetails] = useState(false);

  if (!item) return null;

  const isPending = item.status === 'pending';
  const isInProgress = item.isCurrent;

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

  // Iniciar sem abrir navegação externa
  const handleStartOnly = async () => {
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

  // Extrair informações de pagamento do pedido
  const oData = item.order?.order_data || item.order || {};
  const payment = oData.payment || oData.financial || {};
  const totalVal = Number(oData.totalValue || oData.total_value || oData.total || 0);
  const valueFormatted = totalVal > 0 
    ? totalVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
    : 'R$ 0,00';

  const isPaid = payment.status === 'paid' || oData.paymentStatus === 'paid' || oData.isPaid === true || item.order?.status === 'fulfilled';
  const paymentMethodStr = payment.methodName || payment.method || payment.paymentMethod || 'no ato da entrega';

  // Extrair itens da entrega
  const rawItems = oData.items || item.order?.items || oData.assistanceItems || [];
  const itemsList = rawItems.map((it: any) => ({
    name: String(it.name || it.title || it.product_name || it.description || 'Produto').trim(),
    qty: Number(it.quantity || it.qty || 1),
  }));

  return (
    <Modal visible={!!item} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheet, isDarkMode && styles.sheetDark]}>
          {/* Pegador superior (Drag handle) */}
          <View style={styles.dragHandle} />

          {/* Cabeçalho do Bottom Sheet */}
          <View style={styles.headerRow}>
            <View>
              <View style={styles.badgeRow}>
                <View style={[styles.orderBadge, isInProgress ? styles.badgeProgress : styles.badgeNext]}>
                  <Text style={[styles.orderBadgeText, isInProgress ? styles.badgeTextProgress : styles.badgeTextNext]}>
                    {isInProgress
                      ? 'EM ANDAMENTO'
                      : item.isSuggestedFirst
                      ? `PARADA SUGERIDA · #${item.sequence}`
                      : `PARADA · #${item.sequence}`}
                  </Text>
                </View>

                {item.orderIndex && (
                  <Text style={[styles.orderNumber, isDarkMode && styles.textMuted]}>
                    Pedido #{item.orderIndex}
                  </Text>
                )}
              </View>

              <Text style={[styles.sheetTitle, isDarkMode && styles.textLight]}>
                {isInProgress ? 'Detalhes da Parada' : 'Iniciar Entrega'}
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, isDarkMode && styles.closeBtnDark]}>
              <X size={18} color={isDarkMode ? '#cbd5e1' : '#64748b'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false} bounces={false}>
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

            {/* Pílulas de Horário / Janela e Volumes */}
            <View style={styles.pillsRow}>
              {item.periodLabel ? (
                <View style={[styles.pill, item.isFixedTime ? styles.pillFixed : styles.pillPeriod]}>
                  <Clock size={12} color={item.isFixedTime ? '#d97706' : '#2563eb'} />
                  <Text style={[styles.pillText, item.isFixedTime ? { color: '#d97706' } : { color: '#2563eb' }]}>
                    {item.periodLabel}
                  </Text>
                </View>
              ) : null}

              <View style={styles.pill}>
                <Package size={12} color="#64748b" />
                <Text style={[styles.pillText, { color: '#64748b' }]}>
                  {item.itemsCount} {item.itemsCount === 1 ? 'volume' : 'volumes'}
                </Text>
              </View>
            </View>

            {/* Destaque ⚠️ Observações da Entrega (Apenas se existirem) */}
            {item.observations ? (
              <View style={styles.obsBox}>
                <View style={styles.obsHeader}>
                  <AlertTriangle size={14} color="#d97706" />
                  <Text style={styles.obsTitle}>OBSERVAÇÕES DA ENTREGA</Text>
                </View>
                <Text style={styles.obsContent}>{item.observations}</Text>
              </View>
            ) : null}

            {/* Destaque 💰 Situação de Pagamento */}
            <View style={[styles.paymentBox, isPaid ? styles.paymentBoxPaid : styles.paymentBoxPending]}>
              {isPaid ? (
                <View style={styles.paymentRow}>
                  <CheckCircle2 size={16} color="#16a34a" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paymentTitlePaid}>PAGAMENTO REALIZADO</Text>
                    <Text style={styles.paymentSubPaid}>Pedido já quitado anteriormente</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.paymentRow}>
                  <DollarSign size={16} color="#d97706" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paymentTitlePending}>
                      {valueFormatted} — A RECEBER NA ENTREGA
                    </Text>
                    <Text style={styles.paymentSubPending}>
                      Forma de recebimento: {paymentMethodStr}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Resumo Expansível de Itens */}
            {itemsList.length > 0 && (
              <View style={[styles.itemsBox, isDarkMode && styles.itemsBoxDark]}>
                <TouchableOpacity
                  style={styles.itemsHeader}
                  onPress={() => setShowItemsDetails(!showItemsDetails)}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Package size={14} color="#2563eb" />
                    <Text style={[styles.itemsTitle, isDarkMode && styles.textLight]}>
                      ITENS DA ENTREGA ({item.itemsCount} vol)
                    </Text>
                  </View>

                  {showItemsDetails ? (
                    <ChevronUp size={16} color="#94a3b8" />
                  ) : (
                    <ChevronDown size={16} color="#94a3b8" />
                  )}
                </TouchableOpacity>

                {showItemsDetails && (
                  <View style={styles.itemsListContainer}>
                    {itemsList.map((it, idx) => (
                      <View key={idx} style={styles.itemRow}>
                        <Text style={styles.itemQty}>{it.qty}×</Text>
                        <Text style={[styles.itemName, isDarkMode && styles.textMuted]}>{it.name}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Ações do Bottom Sheet */}
          <View style={styles.footerActions}>
            {starting ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#2563eb" />
                <Text style={styles.loadingText}>Registrando início da entrega...</Text>
              </View>
            ) : isPending ? (
              <>
                {/* CTA Principal: INICIAR ETAPAS DA ENTREGA */}
                <TouchableOpacity
                  style={[styles.primaryActionBtn, { backgroundColor: '#2563eb' }]}
                  onPress={handleStartAndNavigate}
                  activeOpacity={0.85}
                >
                  <Play size={18} color="#ffffff" fill="#ffffff" />
                  <Text style={styles.primaryActionText}>INICIAR ETAPAS DA ENTREGA</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Quando já estiver EM ANDAMENTO */}
                <TouchableOpacity
                  style={[styles.primaryActionBtn, { backgroundColor: '#2563eb' }]}
                  onPress={handleOpenNav}
                  activeOpacity={0.85}
                >
                  <Play size={18} color="#ffffff" fill="#ffffff" />
                  <Text style={styles.primaryActionText}>CONTINUAR ETAPAS DA ENTREGA</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryActionLink}
                  onPress={() => {
                    onClose();
                    onViewOrder(item);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.secondaryLinkText}>Ver detalhes do pedido</Text>
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
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 24,
    maxHeight: '85%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 12,
  },
  sheetDark: {
    backgroundColor: '#1e293b',
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
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
  sheetTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
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
    maxHeight: 340,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 10,
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
    gap: 8,
    marginBottom: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pillPeriod: {
    backgroundColor: '#eff6ff',
  },
  pillFixed: {
    backgroundColor: '#fffbeb',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  obsBox: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
    borderWidth: 1,
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  obsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  obsTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#d97706',
    letterSpacing: 0.5,
  },
  obsContent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400e',
    lineHeight: 16,
  },
  paymentBox: {
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  paymentBoxPaid: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  paymentBoxPending: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paymentTitlePaid: {
    fontSize: 11,
    fontWeight: '900',
    color: '#16a34a',
    letterSpacing: 0.4,
  },
  paymentSubPaid: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803d',
  },
  paymentTitlePending: {
    fontSize: 11,
    fontWeight: '900',
    color: '#b45309',
    letterSpacing: 0.4,
  },
  paymentSubPending: {
    fontSize: 11,
    fontWeight: '600',
    color: '#d97706',
  },
  itemsBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemsBoxDark: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
  },
  itemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemsTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#334155',
  },
  itemsListContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemQty: {
    fontSize: 11,
    fontWeight: '900',
    color: '#2563eb',
  },
  itemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    flex: 1,
  },
  footerActions: {
    gap: 8,
    marginTop: 10,
  },
  primaryActionBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  secondaryActionLink: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  secondaryLinkText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    textDecorationLine: 'underline',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
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

