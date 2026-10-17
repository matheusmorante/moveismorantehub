import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ShoppingBag } from 'lucide-react-native';
import { OrderDetailsBody } from '../OrderDetailsBody';
import { DeliveryPreparationScreen } from '../../features/orders/screens/DeliveryPreparationScreen';
import { supabase } from '../../services/supabaseClient';
import { formatOrderCode, formatOrderDate } from '../../utils/orderUtils';
import { getOrderStatusLabel } from '../../features/orders/domain/orderStatusPresentation';

interface Props {
  order: any;
  onClose: () => void;
  isDarkMode: boolean;
  userRole?: string;
  userProfile?: any;
}

export const OrderDetailsModal: React.FC<Props> = ({
  order,
  onClose,
  isDarkMode,
  userRole,
  userProfile,
}) => {
  const insets = useSafeAreaInsets();
  const [preparingDelivery, setPreparingDelivery] = useState(false);
  const [canStartDelivery, setCanStartDelivery] = useState(false);
  const [detailedOrder, setDetailedOrder] = useState<any>(order);
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
  );

  useEffect(() => {
    setDetailedOrder(order);
    if (!order?.id) {
      setPreparingDelivery(false);
      return;
    }
    if (order._openDeliveryPreparation) {
      setPreparingDelivery(true);
    }

    const existingItems = order.order_data?.items || order.items || [];
    const hasFullItems =
      Array.isArray(existingItems) &&
      existingItems.length > 0 &&
      existingItems.some((i: any) => i.name || i.description || i.productName || i.title);
    if (hasFullItems) return;

    let alive = true;
    supabase
      .from('orders')
      .select('*')
      .eq('id', order.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data && alive) {
          setDetailedOrder(data);
        }
      })
      .catch((err) =>
        console.warn('[OrderDetailsModal] Falha ao carregar detalhes completos:', err)
      );

    return () => {
      alive = false;
    };
  }, [order]);
  useEffect(() => {
    const loadPermission = async () => {
      const { data } = await supabase.from('settings').select('data').eq('id', 'app').maybeSingle();
      const configuredRoles = data?.data?.rolePermissions?.startDelivery;
      const defaultAllowedRoles = [
        'administrator',
        'admin',
        'master',
        'manager',
        'gerente',
        'deliverer',
        'entregador',
        'driver',
        'seller',
        'vendedor',
        'stockist',
        'estoquista',
        'assembler',
        'montador',
      ];
      const allowedRoles = Array.isArray(configuredRoles) && configuredRoles.length > 0
        ? configuredRoles
        : defaultAllowedRoles;
      const normalizedRole = String(userRole || '')
        .trim()
        .toLowerCase();
      const isAdministrator = ['admin', 'administrator', 'master'].includes(normalizedRole);
      const isDefaultRole = defaultAllowedRoles.includes(normalizedRole);
      const hasConfiguredPermission = allowedRoles.some(
        (role: string) => String(role).trim().toLowerCase() === normalizedRole
      );

      // Qualquer usuário da equipe (estoquista, entregador, vendedor, gerente, admin) tem acesso
      setCanStartDelivery(isAdministrator || isDefaultRole || hasConfiguredPermission || !normalizedRole);
    };
    void loadPermission();
  }, [userRole]);

  if (!order) return null;

  const targetOrder = detailedOrder || order;
  const orderData = targetOrder.order_data || targetOrder;
  const orderCode = formatOrderCode(targetOrder);
  const orderDate = targetOrder.created_at || targetOrder.date || orderData.createdAt || orderData.date;
  const seller = targetOrder.seller || orderData.seller || orderData.sellerName || orderData.sellerData?.fullName;
  const rawStatus = targetOrder.status || orderData.status || 'scheduled';
  const statusLabel = getOrderStatusLabel(
    { ...targetOrder, ...orderData, status: rawStatus },
    rawStatus === 'fulfilled'
      ? 'Atendido'
      : rawStatus === 'scheduled'
        ? 'Agendado'
        : rawStatus
  );

  const isCancelled = rawStatus === 'cancelled';
  const isFulfilled = ['fulfilled', 'completed', 'delivered'].includes(rawStatus);
  const isDraft = rawStatus === 'draft';

  const statusBg = isCancelled
    ? (isDarkMode ? '#450a0a' : '#fee2e2')
    : isFulfilled
      ? (isDarkMode ? '#052e16' : '#dcfce7')
      : isDraft
        ? (isDarkMode ? '#1e293b' : '#f1f5f9')
        : (isDarkMode ? '#451a03' : '#fef3c7');

  const statusBorder = isCancelled
    ? (isDarkMode ? '#991b1b' : '#fca5a5')
    : isFulfilled
      ? (isDarkMode ? '#166534' : '#86efac')
      : isDraft
        ? (isDarkMode ? '#334155' : '#cbd5e1')
        : (isDarkMode ? '#92400e' : '#fcd34d');

  const statusColor = isCancelled
    ? '#dc2626'
    : isFulfilled
      ? '#16a34a'
      : isDraft
        ? '#64748b'
        : '#d97706';

  return (
    <Modal
      visible={Boolean(order)}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.modalContainer,
          { paddingTop: topInset },
          isDarkMode && styles.modalContainerDark,
        ]}
      >
        {preparingDelivery ? (
          <DeliveryPreparationScreen
            order={detailedOrder || order}
            isDarkMode={isDarkMode}
            userProfile={userProfile}
            onBack={(started) => {
              setPreparingDelivery(false);
              if (started) onClose();
            }}
          />
        ) : (
          <>
            {/* Full-Screen Header com paridade de informações ao ERP */}
            <View style={[styles.headerRow, isDarkMode && styles.headerRowDark]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={styles.iconCircle}>
                  <ShoppingBag size={20} color="#2563eb" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={[styles.titleText, isDarkMode && styles.textDark]}>
                      Detalhes do Pedido
                    </Text>
                    <View style={styles.codeBadge}>
                      <Text style={styles.codeText}>#{orderCode}</Text>
                    </View>
                  </View>

                  <View style={styles.headerMetaRow}>
                    {Boolean(orderDate) && (
                      <Text style={[styles.metaText, isDarkMode && styles.metaTextDark]}>
                        {formatOrderDate(orderDate)}
                      </Text>
                    )}
                    {Boolean(seller) && (
                      <Text style={[styles.metaText, isDarkMode && styles.metaTextDark]}>
                        • Vendedor: <Text style={styles.sellerText}>{seller}</Text>
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.statusBadge, { backgroundColor: statusBg, borderColor: statusBorder }]}>
                  <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                    {statusLabel.toUpperCase()}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={onClose}
                  style={[styles.closeBtn, isDarkMode && styles.closeBtnDark]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={18} color={isDarkMode ? '#f8fafc' : '#475569'} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Full-Screen Body Content */}
            <View style={{ flex: 1 }}>
              <OrderDetailsBody
                order={detailedOrder || order}
                isDarkMode={isDarkMode}
                canStartDelivery={canStartDelivery}
                onStartDelivery={() => setPreparingDelivery(true)}
                onViewDelivery={() => setPreparingDelivery(true)}
              />
            </View>
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalContainerDark: {
    backgroundColor: '#0f172a',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  headerRowDark: {
    backgroundColor: '#0f172a',
    borderBottomColor: '#1e293b',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    flexShrink: 1,
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  textDark: {
    color: '#f8fafc',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnDark: {
    backgroundColor: '#1e293b',
  },
  codeBadge: {
    backgroundColor: '#eff6ff',
    borderColor: '#dbeafe',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  codeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#2563eb',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  metaTextDark: {
    color: '#94a3b8',
  },
  sellerText: {
    fontWeight: '800',
    color: '#3b82f6',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
