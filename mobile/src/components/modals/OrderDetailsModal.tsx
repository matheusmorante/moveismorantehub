import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ShoppingBag } from 'lucide-react-native';
import { OrderDetailsBody } from '../OrderDetailsBody';
import { DeliveryPreparationScreen } from '../../features/orders/screens/DeliveryPreparationScreen';
import { supabase } from '../../services/supabaseClient';

interface Props {
  order: any;
  onClose: () => void;
  isDarkMode: boolean;
  userRole?: string;
}

export const OrderDetailsModal: React.FC<Props> = ({ order, onClose, isDarkMode, userRole }) => {
  const insets = useSafeAreaInsets();
  const [preparingDelivery, setPreparingDelivery] = useState(false);
  const [canStartDelivery, setCanStartDelivery] = useState(false);
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  useEffect(() => {
    if (!order) {
      setPreparingDelivery(false);
    } else if (order._openDeliveryPreparation) {
      setPreparingDelivery(true);
    }
  }, [order]);
  useEffect(() => {
    const loadPermission = async () => {
      const { data } = await supabase.from('settings').select('data').eq('id', 'app').maybeSingle();
      const allowedRoles = data?.data?.rolePermissions?.startDelivery || ['administrator', 'deliverer'];
      setCanStartDelivery(userRole === 'administrator' || allowedRoles.includes(userRole));
    };
    void loadPermission();
  }, [userRole]);

  if (!order) return null;

  const orderData = order.order_data || order;
  const customerName = order.customer_name || orderData.customerData?.fullName || orderData.customer?.fullName || 'Consumidor';

  return (
    <Modal
      visible={Boolean(order)}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { paddingTop: topInset }, isDarkMode && styles.modalContainerDark]}>
        {preparingDelivery ? (
          <DeliveryPreparationScreen order={order} isDarkMode={isDarkMode} onBack={started => {
            setPreparingDelivery(false);
            if (started) onClose();
          }} />
        ) : <>
        {/* Full-Screen Header */}
        <View style={[styles.headerRow, isDarkMode && styles.headerRowDark]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <View style={styles.iconCircle}>
              <ShoppingBag size={20} color="#2563eb" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.titleText, isDarkMode && styles.textDark]}>
                Detalhes do Pedido
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b' }} numberOfLines={1}>
                {customerName}
              </Text>
            </View>
          </View>

          <TouchableOpacity onPress={onClose} style={[styles.closeBtn, isDarkMode && styles.closeBtnDark]}>
            <X size={20} color={isDarkMode ? '#f8fafc' : '#475569'} />
          </TouchableOpacity>
        </View>

        {/* Full-Screen Body Content */}
        <View style={{ flex: 1 }}>
          <OrderDetailsBody order={order} isDarkMode={isDarkMode} canStartDelivery={canStartDelivery} onStartDelivery={() => setPreparingDelivery(true)} onViewDelivery={() => setPreparingDelivery(true)} />
        </View>
        </>}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  modalContainerDark: {
    backgroundColor: '#0f172a'
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff'
  },
  headerRowDark: {
    backgroundColor: '#0f172a',
    borderBottomColor: '#1e293b'
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  titleText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a'
  },
  textDark: {
    color: '#f8fafc'
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeBtnDark: {
    backgroundColor: '#1e293b'
  }
});
