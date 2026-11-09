import type React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from './productFormFiscalTab.styles';

interface Props {
  dark: boolean;
  suggestion: { code: string; description: string };
  onAccept?: () => void;
  onReject?: () => void;
}

export const ProductFormNcmSuggestion: React.FC<Props> = ({
  dark,
  suggestion,
  onAccept,
  onReject,
}) => (
  <View style={styles.ncmSuggestion}>
    <View style={styles.ncmSuggestionCopy}>
      <Text style={[styles.ncmCode, dark && styles.lightText]}>
        Sugestão de NCM: {suggestion.code}
      </Text>
      <Text style={styles.ncmDesc}>{suggestion.description}</Text>
      <Text style={styles.ncmDesc}>
        Confirme a classificação antes de usá-la em documentos fiscais.
      </Text>
    </View>
    <View style={styles.ncmSuggestionActions}>
      <TouchableOpacity
        onPress={onAccept}
        accessibilityRole="button"
        accessibilityLabel="Aceitar sugestão de NCM"
        style={styles.ncmSuggestionAccept}
      >
        <Text style={styles.ncmSuggestionAcceptText}>Aceitar</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onReject}
        accessibilityRole="button"
        accessibilityLabel="Rejeitar sugestão de NCM"
        style={styles.ncmSuggestionReject}
      >
        <Text style={styles.ncmSuggestionRejectText}>Recusar</Text>
      </TouchableOpacity>
    </View>
  </View>
);
