import { Alert, Platform } from 'react-native';
import { enqueueWebAlert } from './webAlertService';

/**
 * Polyfill de Alert.alert para ambiente Web (React Native Web).
 * Por padrão, o react-native-web possui Alert.alert como uma função vazia (no-op).
 * Este polyfill encaminha Alert.alert para o modal estilizado do app no ambiente Web,
 * preservando os callbacks das opções exibidas.
 */
if (Platform.OS === 'web') {
  Alert.alert = (title: string, message?: string, buttons?: any[], options?: { cancelable?: boolean }) => {
    enqueueWebAlert(title, message, buttons, options);
  };
}
