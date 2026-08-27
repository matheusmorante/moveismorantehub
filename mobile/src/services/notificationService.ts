import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { supabase, NOTIFICATION_SOUND_URL } from './supabaseClient';

// Configura o comportamento das notificações no aparelho (quando o app está em primeiro ou segundo plano)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

let soundObject: Audio.Sound | null = null;

export const playNotificationSound = async () => {
  try {
    if (soundObject) {
      await soundObject.replayAsync().catch(() => {});
      return;
    }
    const { sound } = await Audio.Sound.createAsync(
      { uri: NOTIFICATION_SOUND_URL },
      { shouldPlay: true, volume: 1.0 }
    );
    soundObject = sound;
  } catch (err) {
    console.warn('[Sound] Fallback som nativo:', err);
  }
};

/**
 * Cria o canal de alta prioridade do Android e registra o token de Push no Supabase
 */
export const registerPushToken = async () => {
  try {
    if (Platform.OS === 'web') return;

    // No Android, é obrigatório criar o canal com importância MAX para exibir banner e vibrar
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Vendas e Montagens - Móveis Morante',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        lightColor: '#2563EB',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        showBadge: true,
      });
    }

    // Solicita permissão de notificação (obrigatório no Android 13+ e iOS)
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('[PushToken] Permissão de notificação não concedida pelo usuário.');
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'dd556f93-9a32-4219-84a2-378b626f09ae',
    });
    const token = tokenData?.data;

    if (token) {
      await supabase.from('push_tokens').upsert([{
        token,
        device_info: { os: Platform.OS },
        updated_at: new Date().toISOString(),
      }], { onConflict: 'token' });
      console.log('[PushToken] Registrado com sucesso no Supabase:', token);
    }
  } catch (err) {
    console.warn('[PushToken] Registro seguro:', err);
  }
};

/**
 * Dispara notificação nativa com banner na barra de status do celular
 */
export const triggerLocalNotification = async (title: string, body: string, dataPayload: any = {}) => {
  // O push remoto também é exibido em primeiro plano pelo handler acima.
  // O listener Realtime chama esta função, mas não deve agendar uma segunda cópia.
  void title;
  void body;
  void dataPayload;
};
