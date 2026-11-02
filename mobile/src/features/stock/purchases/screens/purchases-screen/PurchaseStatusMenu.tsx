import { Check } from 'lucide-react-native';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatPurchaseNumber } from '../../../../../../../shared-utils/purchaseNumber';
import {
  purchaseStatusLabel,
  type MobilePurchase,
  type PurchaseStatus,
} from '../../mobilePurchaseService';
import { styles } from './purchasesScreen.styles';

interface Props {
  purchase: MobilePurchase | null;
  isDarkMode: boolean;
  colors: { border: string; muted: string; text: string };
  options: readonly PurchaseStatus[];
  onClose: () => void;
  onSelectStatus: (status: PurchaseStatus) => void;
}

export const PurchaseStatusMenu: React.FC<Props> = ({
  purchase,
  isDarkMode,
  colors,
  options,
  onClose,
  onSelectStatus,
}) => (
  <Modal
    visible={Boolean(purchase)}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <View style={styles.statusMenuOverlay}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Fechar opções de status"
      />
      <View style={[styles.statusMenuCard, isDarkMode && styles.headerMenuDark]}>
        <Text style={[styles.statusMenuTitle, isDarkMode && styles.headerMenuTextDark]}>
          Alterar status
        </Text>
        {purchase ? (
          <Text style={[styles.statusMenuSubtitle, { color: colors.muted }]}>
            Pedido #{formatPurchaseNumber(purchase.purchaseNumber) || purchase.id.slice(0, 8).toUpperCase()}
          </Text>
        ) : null}
        {options.map((status) => {
          const isCurrent = purchase?.status === status;
          return (
            <TouchableOpacity
              key={status}
              accessibilityRole="button"
              accessibilityState={{ selected: isCurrent, disabled: isCurrent }}
              disabled={isCurrent}
              onPress={() => onSelectStatus(status)}
              style={[styles.statusMenuOption, { borderColor: colors.border }]}
            >
              <Text style={[styles.statusMenuOptionText, { color: colors.text }]}>
                {purchaseStatusLabel(status)}
              </Text>
              {isCurrent ? <Check size={17} color="#2563eb" /> : null}
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onClose}
          style={styles.statusMenuClose}
        >
          <Text style={[styles.statusMenuCloseText, { color: colors.muted }]}>Fechar</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);
