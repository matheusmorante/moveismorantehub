import { Platform, Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { supabase, NOTIFICATION_SOUND_URL } from './supabaseClient';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
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

export const registerPushToken = async () => {
  try {
    if (Platform.OS === 'web') return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Vendas e montagens',
        importance: 4,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
      });
    }
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'bda44a09-b091-47ec-a0b1-25bc097ac641'
    });
    const token = tokenData?.data;
    if (token) {
      await supabase.from('push_tokens').upsert([{
        token,
        device_info: { os: Platform.OS },
        updated_at: new Date().toISOString()
      }], { onConflict: 'token' });
    }
  } catch (err) {
    console.warn('[PushToken] Registro seguro:', err);
  }
};

export const triggerLocalNotification = async (title: string, body: string, dataPayload: any = {}) => {
  playNotificationSound();
  Vibration.vibrate([0, 250, 250, 250]);

  try {
    if (Platform.OS !== 'web') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          data: dataPayload
        },
        trigger: null,
      });
    }
  } catch (e) {
    console.warn('[LocalNotif] Erro ao agendar notificação local:', e);
  }
};
