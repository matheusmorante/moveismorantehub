import type React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from './mobileMoveVariationModal.styles';

interface Props {
  hasConflict: boolean;
  hasValidationError: boolean;
  errorMessage: string;
  disabled: boolean;
  onRetry: () => void;
}

export const MobileMoveVariationValidationNotice: React.FC<Props> = ({
  hasConflict,
  hasValidationError,
  errorMessage,
  disabled,
  onRetry,
}) => (
  <>
    {hasConflict ? (
      <View style={styles.conflict}>
        <Text style={styles.conflictTitle}>Combinação já existente</Text>
        <Text style={styles.conflictText}>
          Este produto pai já tem uma variação com estas mesmas características. Altere um valor
          antes de continuar.
        </Text>
      </View>
    ) : null}
    {hasValidationError ? (
      <View style={styles.conflict}>
        <Text style={styles.conflictTitle}>Não foi possível validar a combinação</Text>
        <Text style={styles.conflictText}>
          {errorMessage || 'Confira a conexão e tente novamente.'}
        </Text>
        <TouchableOpacity
          onPress={onRetry}
          disabled={disabled}
          style={styles.retryButton}
          accessibilityRole="button"
          accessibilityLabel="Validar destino novamente"
        >
          <Text style={styles.retryText}>Validar destino novamente</Text>
        </TouchableOpacity>
      </View>
    ) : null}
  </>
);
