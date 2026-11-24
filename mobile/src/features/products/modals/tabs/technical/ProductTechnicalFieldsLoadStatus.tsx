import type React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { styles } from './productFormTechnicalTab.styles';

interface Props {
  error: string | null;
  loading: boolean;
  dark: boolean;
  onRetry: () => void;
}

export const ProductTechnicalFieldsLoadStatus: React.FC<Props> = ({
  error,
  loading,
  dark,
  onRetry,
}) => (
  <>
    {error && (
      <View style={[styles.technicalLoadError, dark && styles.darkTechnicalLoadError]}>
        <Text
          style={[styles.technicalLoadErrorText, dark && styles.darkTechnicalLoadErrorText]}
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          {error}
        </Text>
        <TouchableOpacity
          onPress={onRetry}
          disabled={loading}
          accessibilityRole="button"
          accessibilityState={{ disabled: loading }}
          style={styles.technicalLoadRetryButton}
        >
          <Text style={styles.technicalLoadRetryButtonText}>
            Consultar características novamente
          </Text>
        </TouchableOpacity>
      </View>
    )}
    {loading && (
      <View
        style={styles.technicalLoadingState}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Carregando especificações técnicas..."
        accessibilityState={{ busy: true }}
        accessibilityLiveRegion="polite"
      >
        <ActivityIndicator color="#2563eb" />
        <Text style={[styles.technicalLoadingText, dark && styles.dimText]}>
          Carregando especificações técnicas...
        </Text>
      </View>
    )}
  </>
);
