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
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

const LOCAL_NOTIFICATION_SOUND = require('../../assets/levelup.mp3');
let lastPushTokenRegistrationError: string | null = null;

export const getLastPushTokenRegistrationError = () => lastPushTokenRegistrationError;

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
 * Garante a criação do canal de alta prioridade do Android com banner heads-up
 */
export const setupNotificationChannel = async () => {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('morante_alerts_v2', {
        name: 'Alertas e Pedidos - Móveis Morante',
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

      await Notifications.setNotificationChannelAsync('default', {
        name: 'Geral - Móveis Morante',
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
 * Salva ou atualiza o push token na tabela do Supabase
 */
export const savePushTokenToSupabase = async (token: string): Promise<boolean> => {
  try {
    if (!token) return false;
    const { error } = await supabase.from('push_tokens').upsert([{
      token,
      device_info: { os: Platform.OS, updatedAt: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    }], { onConflict: 'token' });
    if (error) throw error;
    console.log('[PushToken] Sincronizado no Supabase com sucesso:', token);
    return true;
  } catch (err) {
    lastPushTokenRegistrationError = `Não foi possível salvar o token no Supabase: ${err instanceof Error ? err.message : String(err)}`;
    console.warn('[PushToken] Erro ao salvar no Supabase:', err);
    return false;
  }
};

import Constants from 'expo-constants';

/**
 * Obtém e registra o Push Token do aparelho no Supabase com tolerância a falhas e retries
 */
export const registerPushToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') return null;
    lastPushTokenRegistrationError = null;

    await setupNotificationChannel();
    const hasPermission = await ensureNotificationPermissions();
    if (!hasPermission) {
      lastPushTokenRegistrationError = 'A permissão de notificações não foi concedida neste aplicativo.';
      console.warn('[PushToken] Sem permissão de notificação.');
      return null;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId ??
      'dd556f93-9a32-4219-84a2-378b626f09ae';

    let token: string | null = null;
    let lastError: any = null;

    // Tenta obter o token até 3 vezes com pequeno intervalo
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        token = tokenData?.data || null;
        if (token) break;
      } catch (e: any) {
        lastError = e;
        console.warn(`[PushToken] Tentativa ${attempt} falhou:`, e?.message || e);
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 600));
        }
      }
    }

    // Fallback sem parâmetro caso a chamada com projectId tenha falhado
    if (!token) {
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
        token = tokenData?.data || null;
      } catch (e: any) {
        lastError = e;
      }
    }

    if (token) {
      const wasSaved = await savePushTokenToSupabase(token);
      if (wasSaved) return token;
      return null;
    }

    if (lastError) {
      lastPushTokenRegistrationError = `O Firebase não gerou o token do aparelho: ${lastError?.message || String(lastError)}`;
      console.warn('[PushToken] Erro final ao obter token:', lastError?.message || lastError);
    } else {
      lastPushTokenRegistrationError = 'O Firebase não retornou um token para este aparelho.';
    }
  } catch (err) {
    lastPushTokenRegistrationError = `Erro ao registrar o token: ${err instanceof Error ? err.message : String(err)}`;
    console.warn('[PushToken] Erro ao registrar:', err);
  }
  return null;
};

/**
 * Registra listener global para renovações de token do FCM
 */
export const initPushTokenListeners = () => {
  try {
    if (Platform.OS === 'web') return () => {};
    
    // Escuta novas emissões/renovações de token pelo Google FCM
    const sub = Notifications.addPushTokenListener((tokenData) => {
      if (tokenData?.data) {
        savePushTokenToSupabase(tokenData.data);
      }
    });

    return () => {
      sub.remove();
    };
  } catch {
    return () => {};
  }
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
          ...(Platform.OS === 'android' && { channelId: 'morante_alerts_v2' }),
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
 * Testa notificação push com disparo imediato e via nuvem
 */
export const testRemotePushNotification = async () => {
  try {
    const hasPermission = await ensureNotificationPermissions();
    if (!hasPermission) {
      Alert.alert(
        'Permissão Necessária',
        'Ative as notificações nas configurações do celular:\nConfigurações > Aplicativos > Equipe Morante > Notificações.'
      );
      return;
    }

    await setupNotificationChannel();

    // 1. Toca o som do levelup imediatamente
    await playNotificationSound();

    // 2. Dispara banner local instantaneamente no aparelho
    try {
      if (Platform.OS !== 'web') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🔔 Teste de Notificação • Equipe Morante',
            body: 'Banner e alerta sonoro funcionando perfeitamente!',
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrate: [0, 250, 250, 250],
            ...(Platform.OS === 'android' && { channelId: 'morante_alerts_v2' }),
            data: { test: true },
          },
          trigger: null,
        });
      }
    } catch (schedErr) {
      console.warn('[Teste Push] Erro ao disparar banner local:', schedErr);
    }

    // 3. Obtém o token para disparo remoto
    const token = await registerPushToken();

    if (!token) {
      Alert.alert(
        'Token não registrado',
        getLastPushTokenRegistrationError() || 'Não foi possível obter e salvar o token deste aparelho.'
      );
      return;
    }

    // 4. Insere no Supabase para testar o gatilho da nuvem
    try {
      await supabase.from('app_notifications').insert({
        title: '🔔 Teste via Banco de Dados (Nuvem)',
        message: 'Notificação enviada pela nuvem para o aparelho.',
        type: 'system',
        read: false
      });
    } catch {}

    // 5. Se temos o token, também envia diretamente para a Expo Push API
    if (token) {
      fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{
          to: token,
          sound: 'default',
          title: '🔔 Teste Remoto Expo • Móveis Morante',
          body: 'Notificação push remota recebida com sucesso!',
          channelId: 'morante_alerts_v2',
          priority: 'high',
          data: { test: true },
        }]),
      }).catch(() => {});
    }

    Alert.alert(
      '✅ Teste Disparado com Sucesso!',
      'O banner e o som tocaram!\n\n💡 Dica para receber com o app fechado no Android:\nCertifique-se de que nas configurações do celular a opção "Economia de Bateria" do app esteja em "Sem Restrições" e as notificações em "Permitir pop-ups".'
    );
  } catch (err: any) {
    Alert.alert('Erro ao Testar', err?.message || String(err));
  }
};
