import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { styles } from './deliveryArrivalStep.styles';

interface Props {
  order?: any;
  isDarkMode: boolean;
  onOpenUnattendedModal: () => void;
}

/**
 * Etapa 3 do Fluxo de Entrega: Chegada no Local.
 * Exibe unicamente o botão de insucesso "Não foi possível entregar",
 * mantendo as ações de prosseguir e voltar no rodapé deslizante (DeliveryStepActionFooter).
 */
export const DeliveryArrivalStep: React.FC<Props> = ({
  isDarkMode,
  onOpenUnattendedModal,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onOpenUnattendedModal}
        style={[styles.unattendedButton, isDarkMode && styles.unattendedButtonDark]}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Não foi possível entregar"
      >
        <AlertTriangle size={20} color={isDarkMode ? '#fca5a5' : '#dc2626'} />
        <Text
          style={[styles.unattendedButtonText, isDarkMode && styles.unattendedButtonTextDark]}
        >
          Não foi possível entregar
        </Text>
      </TouchableOpacity>
    </View>
  );
};
