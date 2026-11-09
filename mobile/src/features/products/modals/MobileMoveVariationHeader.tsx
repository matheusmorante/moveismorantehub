import type React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from './mobileMoveVariationModal.styles';

interface Props {
  dark: boolean;
  closeDisabled: boolean;
  onClose: () => void;
}

export const MobileMoveVariationHeader: React.FC<Props> = ({
  dark,
  closeDisabled,
  onClose,
}) => (
  <View style={[styles.header, dark && styles.borderDark]}>
    <View style={styles.headerText}>
      <Text style={[styles.title, dark && styles.textDark]}>
        Mover para outro produto pai
      </Text>
      <Text style={[styles.subtitle, dark && styles.subtitleDark]}>
        O ID e o histórico da variação serão preservados.
      </Text>
    </View>
    <TouchableOpacity
      onPress={onClose}
      disabled={closeDisabled}
      style={styles.closeButton}
      accessibilityRole="button"
      accessibilityLabel="Fechar movimento de variação"
    >
      <Text style={[styles.closeText, dark && styles.textDark]}>×</Text>
    </TouchableOpacity>
  </View>
);
