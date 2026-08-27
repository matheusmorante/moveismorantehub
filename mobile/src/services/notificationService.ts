import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { supabase, NOTIFICATION_SOUND_URL } from './supabaseClient';

// Configura o comportamento das notificações quando o app está aberto em primeiro plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const LOCAL_NOTIFICATION_SOUND = require('../../assets/levelup.mp3');

/**
 * Toca o áudio customizado levelup com volume máximo e configuração correta de áudio
 */
export const playNotificationSound = async () => {
  try {
    // Configura o modo de áudio do sistema para tocar sobre outras mídias
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});

    let soundInstance: Audio.Sound | null = null;
    try {
      const { sound } = await Audio.Sound.createAsync(
        LOCAL_NOTIFICATION_SOUND,
        { shouldPlay: true, volume: 1.0 }
      );
      soundInstance = sound;
    } catch {
      const { sound } = await Audio.Sound.createAsync(
        { uri: NOTIFICATION_SOUND_URL },
        { shouldPlay: true, volume: 1.0 }
      );
      soundInstance = sound;
    }

    if (soundInstance) {
      soundInstance.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          soundInstance?.unloadAsync().catch(() => {});
        }
      });
      await soundInstance.playAsync().catch(() => {});
    }
  } catch (err) {
    console.warn('[Sound] Erro ao reproduzir áudio levelup:', err);
  }
};

/**
 * Garante a criação do canal de alta prioridade do Android
 */
export const setupNotificationChannel = async () => {
  try {
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
        bypassDnd: true,
      });
    }
  } catch (err) {
    console.warn('[NotificationChannel] Erro ao configurar canal:', err);
  }
};

/**
 * Garante que as permissões de notificação foram concedidas (Android 13+ e iOS)
 */
export const ensureNotificationPermissions = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'web') return true;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notification] Permissão de notificação negada.');
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[Notification] Erro ao solicitar permissões:', err);
    return false;
  }
};

/**
 * Obtém e registra o Push Token do aparelho no Supabase
 */
export const registerPushToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') return null;

    await setupNotificationChannel();
    const hasPermission = await ensureNotificationPermissions();
    if (!hasPermission) return null;

    let token: string | null = null;
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'dd556f93-9a32-4219-84a2-378b626f09ae',
      });
      token = tokenData?.data || null;
    } catch (e) {
      const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
      token = tokenData?.data || null;
    }

    if (token) {
      await supabase.from('push_tokens').upsert([{
        token,
        device_info: { os: Platform.OS, updatedAt: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      }], { onConflict: 'token' });
      console.log('[PushToken] Registrado no Supabase com sucesso:', token);
      return token;
    }
  } catch (err) {
    console.warn('[PushToken] Erro ao registrar:', err);
  }
  return null;
};

/**
 * Dispara notificação local nativa com banner e som customizado
 */
export const triggerLocalNotification = async (title: string, body: string, dataPayload: any = {}) => {
  try {
    if (Platform.OS !== 'web') {
      await setupNotificationChannel();
      await ensureNotificationPermissions();

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: dataPayload,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 250, 250, 250],
          ...(Platform.OS === 'android' && { channelId: 'default' }),
        },
        trigger: null,
      });
    }
  } catch (err) {
    console.warn('[Notification] Erro ao disparar notificação local:', err);
  }

  // Toca o áudio levelup
  await playNotificationSound();
};

/**
 * Testa notificação push remota através da API da Expo com delay de 5s para testar com app fechado
 */
export const testRemotePushNotification = async () => {
  try {
    const hasPermission = await ensureNotificationPermissions();
    if (!hasPermission) {
      Alert.alert(
        'Permissão Necessária',
        'Ative as notificações nas configurações do celular: Configurações > Aplicativos > Equipe Morante > Notificações.'
      );
      return;
    }

    // Toca imediatamente o som do levelup para confirmação sonora do usuário
    await playNotificationSound();

    const token = await registerPushToken();
    if (!token) {
      Alert.alert('Erro no Token', 'Não foi possível obter o token de notificação deste aparelho.');
      return;
    }

    Alert.alert(
      '🚀 Teste de Notificação com App Fechado',
      'O som Level Up tocou!\n\nAgora FECHE OU MINIMIZE O APP nos próximos 5 segundos para ver o banner e a notificação chegarem com o app fechado!',
      [{ text: 'OK, vou fechar o app agora!' }]
    );

    // Dispara via Expo Push API após 5 segundos
    setTimeout(async () => {
      try {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([{
            to: token,
            sound: 'default',
            title: '🔔 Teste de Notificação Remota',
            body: 'Notificação recebida com sucesso no Equipe Morante!',
            channelId: 'default',
            priority: 'high',
            data: { test: true },
          }]),
        });
      } catch (e) {
        console.warn('[Teste Push] Erro no envio:', e);
      }
    }, 5000);
  } catch (err: any) {
    Alert.alert('Erro ao Testar', err?.message || String(err));
  }
};
