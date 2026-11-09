import { Package } from 'lucide-react-native';
import type React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { getMobileCompositionEmptyHint } from '../domain/mobileProductListPresentation';
import { styles } from './nativeProductsScreen.styles';

type Props =
  | { state: 'loading' }
  | { state: 'error'; message: string; onRetry: () => void }
  | {
      state: 'empty';
      isComposition: boolean;
      showTrash: boolean;
      canCreateComposition: boolean;
      dark: boolean;
    };

export const NativeProductListStatus: React.FC<Props> = (props) => {
  if (props.state === 'loading') {
    return (
      <View style={styles.loadingContent}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loading}>Sincronizando catálogo...</Text>
      </View>
    );
  }

  if (props.state === 'error') {
    return (
      <View style={styles.empty}>
        <Package size={40} color="#dc2626" />
        <Text
          style={styles.emptyText}
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          {props.message}
        </Text>
        <TouchableOpacity
          onPress={props.onRetry}
          style={styles.retryButton}
          accessibilityRole="button"
        >
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.empty}>
      <Package size={40} color="#cbd5e1" />
      <Text style={styles.emptyText}>
        {props.isComposition
          ? 'Nenhum produto composto encontrado'
          : props.showTrash
            ? 'A lixeira está vazia'
            : 'Nenhum item encontrado'}
      </Text>
      {!props.showTrash && (
        <Text style={[styles.emptyHint, props.dark && styles.emptyHintDark]}>
          {props.isComposition
            ? getMobileCompositionEmptyHint(props.canCreateComposition)
            : 'Tente ajustar seus filtros ou adicione um novo produto ou serviço.'}
        </Text>
      )}
    </View>
  );
};
