import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';

interface Props {
  title: string;
  orderId: string;
  orderCode?: string;
  isDarkMode: boolean;
  isInProgress: boolean;
  onBack: () => void;
  onCancelDelivery: () => void;
  cancelling: boolean;
}

export const DeliveryHeader: React.FC<Props> = ({
  title,
  orderId,
  orderCode,
  isDarkMode,
  isInProgress,
  onBack,
  onCancelDelivery,
  cancelling,
}) => {
  return (
    <View style={[styles.header, isDarkMode && styles.headerDark]}>
      <View style={styles.leftContainer}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={20} color="#2563eb" />
        </TouchableOpacity>
        <View style={{ flexShrink: 1 }}>
          <Text numberOfLines={1} style={[styles.title, isDarkMode && styles.textLight]}>{title}</Text>
          <Text style={styles.subtitle}>Pedido #{orderCode || '—'}</Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={onCancelDelivery}
        disabled={cancelling}
        activeOpacity={0.6}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={styles.cancelTextButton}
      >
        <Text style={[styles.cancelText, cancelling && { opacity: 0.5 }]}>
          {cancelling ? 'Cancelando...' : 'Cancelar Entrega'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  headerDark: {
    backgroundColor: '#0f172a',
    borderBottomColor: '#1e293b',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  textLight: {
    color: '#f8fafc',
  },
  cancelTextButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textDecorationLine: 'underline',
  },
});
