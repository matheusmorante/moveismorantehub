import type React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from './mobileMoveVariationModal.styles';

interface Props {
  dark: boolean;
  closeDisabled: boolean;
  confirmDisabled: boolean;
  mutationBlocked: boolean;
  buttonLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const MobileMoveVariationFooter: React.FC<Props> = ({
  dark,
  closeDisabled,
  confirmDisabled,
  mutationBlocked,
  buttonLabel,
  onClose,
  onConfirm,
}) => (
  <View style={[styles.footer, dark && styles.borderDark]}>
    <TouchableOpacity
      onPress={onClose}
      disabled={closeDisabled}
      style={[styles.footerButton, styles.cancelButton]}
      accessibilityRole="button"
    >
      <Text style={styles.cancelText}>Cancelar</Text>
    </TouchableOpacity>
    <TouchableOpacity
      onPress={onConfirm}
      disabled={confirmDisabled}
      style={[
        styles.footerButton,
        styles.confirmButton,
        confirmDisabled && styles.disabledButton,
      ]}
      accessibilityRole="button"
    >
      <Text style={styles.confirmText}>
        {mutationBlocked ? 'Movimento sem confirmação' : buttonLabel}
      </Text>
    </TouchableOpacity>
  </View>
);
