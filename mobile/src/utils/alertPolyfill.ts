import { Alert, Platform } from 'react-native';

/**
 * Polyfill de Alert.alert para ambiente Web (React Native Web).
 * Por padrão, o react-native-web possui Alert.alert como uma função vazia (no-op).
 * Este polyfill conecta Alert.alert ao window.confirm / window.alert do navegador,
 * garantindo execução dos callbacks onPress nos diálogos de confirmação no web.
 */
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title: string, message?: string, buttons?: any[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    if (!buttons || buttons.length <= 1) {
      window.alert(text);
      if (buttons && buttons[0]?.onPress) {
        buttons[0].onPress();
      }
    } else {
      const confirmed = window.confirm(text);
      if (confirmed) {
        const confirmBtn = buttons.find(b => b.style !== 'cancel') || buttons[1];
        if (confirmBtn?.onPress) confirmBtn.onPress();
      } else {
        const cancelBtn = buttons.find(b => b.style === 'cancel') || buttons[0];
        if (cancelBtn?.onPress) cancelBtn.onPress();
      }
    }
  };
}
