import {
  AudioModule,
  type AudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { withTimeout } from '../../../shared-utils/withTimeout';
import { Platform } from 'react-native';

export interface VoiceRecorderCallbacks {
  onSpeechResult: (transcript: string) => void;
  onRecordingStart?: () => void;
  onRecordingEnd?: () => void;
  onError?: (error: string) => void;
}

let activeSpeechRecognition: any = null;
let activeRecording: AudioRecorder | null = null;
let activeMediaStream: any = null;
let generation = 0;

/**
 * Solicita permissões de microfone e inicia a escuta/gravação de voz com Speech-to-Text.
 */
export async function startVoiceRecording(callbacks: VoiceRecorderCallbacks): Promise<boolean> {
  const owner = ++generation;
  const isCurrent = () => owner === generation;
  await stopActiveRecording();
  if (!isCurrent()) return false;

  const windowObj = typeof window !== 'undefined' ? (window as any) : null;
  const SpeechRecognitionClass = windowObj?.SpeechRecognition || windowObj?.webkitSpeechRecognition;

  // 1. Solicitar permissão nativa de mídia na Web / WebView via getUserMedia (garante o pop-up de permissão no navegador)
  if (
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia
  ) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!isCurrent()) { stream.getTracks().forEach(track => track.stop()); return false; }
      activeMediaStream = stream;
    } catch (err: any) {
      if (!isCurrent()) return false;
      console.warn('[VoiceRecorder] getUserMedia negado ou não suportado:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        callbacks.onError?.(
          'Permissão de microfone negada. Clique no ícone de cadeado/permissão na barra de endereços do navegador para permitir o acesso.'
        );
        return false;
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        callbacks.onError?.('Nenhum microfone foi encontrado no seu dispositivo.');
        return false;
      }
    }
  }

  // 2. Iniciar Web Speech Recognition para transcrição instantânea de fala em texto
  if (SpeechRecognitionClass) {
    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = 'pt-BR';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        if (!isCurrent()) return;
        callbacks.onRecordingStart?.();
      };

      recognition.onresult = (event: any) => {
        if (!isCurrent()) return;
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const textSegment = result[0]?.transcript || '';
          if (result.isFinal) {
            finalTranscript += textSegment + ' ';
          } else {
            interimTranscript += textSegment;
          }
        }

        const fullTranscript = (finalTranscript + interimTranscript).trim();
        if (fullTranscript) {
          callbacks.onSpeechResult(fullTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        if (!isCurrent()) return;
        console.warn('[VoiceRecorder] Erro SpeechRecognition:', event.error);
        if (event.error === 'not-allowed') {
          callbacks.onError?.('Acesso ao microfone negado pelo navegador.');
        } else if (event.error === 'no-speech') {
          // Apenas silêncio prolongado
          return;
        } else {
          callbacks.onError?.(`Erro no reconhecimento de voz (${event.error}).`);
        }
        callbacks.onRecordingEnd?.();
      };

      recognition.onend = () => {
        if (!isCurrent()) return;
        callbacks.onRecordingEnd?.();
        activeSpeechRecognition = null;
        if (activeMediaStream) {
          try {
            activeMediaStream.getTracks().forEach((track: any) => {
              track.enabled = false;
              track.stop();
            });
          } catch { /* A plataforma pode já ter liberado o recurso durante o encerramento. */ }
          activeMediaStream = null;
        }
      };

      activeSpeechRecognition = recognition;
      recognition.start();

      // Fechar imediatamente a chamada de teste do getUserMedia se o SpeechRecognition já assumiu a voz
      if (activeMediaStream) {
        try {
          activeMediaStream.getTracks().forEach((track: any) => {
            track.enabled = false;
            track.stop();
          });
        } catch { /* A plataforma pode já ter liberado o recurso durante o encerramento. */ }
        activeMediaStream = null;
      }

      return true;
    } catch (err) {
      console.warn('[VoiceRecorder] Erro ao instanciar SpeechRecognition:', err);
    }
  }

  // 3. Fallback via expo-audio para ambiente React Native nativo (iOS / Android)
  try {
    const permission = await requestRecordingPermissionsAsync();
    if (!isCurrent()) return false;
    if (!permission.granted) {
      callbacks.onError?.('Permissão de microfone negada nas configurações do aplicativo.');
      return false;
    }

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });

    if (!isCurrent()) return false;
    const module = AudioModule as typeof AudioModule & { AudioRecorderWeb?: typeof AudioRecorder };
    const Recorder = Platform.OS === 'web' ? module.AudioRecorderWeb : module.AudioRecorder;
    if (!Recorder) throw new Error('O gravador de áudio não está disponível nesta plataforma.');
    const { android, ios, web, ...common } = RecordingPresets.HIGH_QUALITY;
    const recording = new Recorder({ ...common, ...(Platform.OS === 'ios' ? ios : Platform.OS === 'android' ? android : web) });
    try {
      await recording.prepareToRecordAsync();
      if (!isCurrent()) return false;
      recording.record();
      activeRecording = recording;
      callbacks.onRecordingStart?.();
      return true;
    } finally { if (activeRecording !== recording) recording.release(); }
  } catch (err: any) {
    if (!isCurrent()) return false;
    console.warn('[VoiceRecorder] Erro expo-audio recording:', err);
    callbacks.onError?.('Não foi possível iniciar a gravação no dispositivo.');
    return false;
  }
}

/**
 * Para a gravação ou escuta de voz ativa e encerra estritamente todos os streams de mídia e tracks do navegador.
 */
export async function stopVoiceRecording(): Promise<string | null> {
  ++generation;
  return stopActiveRecording();
}

async function stopActiveRecording(): Promise<string | null> {
  if (activeSpeechRecognition) {
    try {
      activeSpeechRecognition.abort();
      activeSpeechRecognition.stop();
    } catch { /* A plataforma pode já ter liberado o recurso durante o encerramento. */ }
    activeSpeechRecognition = null;
  }

  if (activeMediaStream) {
    try {
      activeMediaStream.getTracks().forEach((track: any) => {
        track.enabled = false;
        track.stop();
      });
    } catch { /* A plataforma pode já ter liberado o recurso durante o encerramento. */ }
    activeMediaStream = null;
  }

  if (activeRecording) {
    const recording = activeRecording; activeRecording = null;
    try {
      const stopped = await withTimeout(recording.stop().then(() => true), 5000, false, 'voz:encerrar-gravacao-nativa');
      if (!stopped) throw new Error('O gravador não confirmou o encerramento no prazo.');
      return recording.uri;
    } finally { recording.release(); }
  }

  return null;
}
