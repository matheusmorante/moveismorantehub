import { Audio } from 'expo-av';

export interface VoiceRecorderCallbacks {
  onSpeechResult: (transcript: string) => void;
  onRecordingStart?: () => void;
  onRecordingEnd?: () => void;
  onError?: (error: string) => void;
}

let activeSpeechRecognition: any = null;
let activeRecording: Audio.Recording | null = null;
let activeMediaStream: any = null;

/**
 * Solicita permissões de microfone e inicia a escuta/gravação de voz com Speech-to-Text.
 */
export async function startVoiceRecording(callbacks: VoiceRecorderCallbacks): Promise<boolean> {
  await stopVoiceRecording();

  const windowObj = typeof window !== 'undefined' ? (window as any) : null;
  const SpeechRecognitionClass = windowObj?.SpeechRecognition || windowObj?.webkitSpeechRecognition;

  // 1. Solicitar permissão nativa de mídia na Web / WebView via getUserMedia (garante o pop-up de permissão no navegador)
  if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      activeMediaStream = stream;
    } catch (err: any) {
      console.warn('[VoiceRecorder] getUserMedia negado ou não suportado:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        callbacks.onError?.('Permissão de microfone negada. Clique no ícone de cadeado/permissão na barra de endereços do navegador para permitir o acesso.');
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
        callbacks.onRecordingStart?.();
      };

      recognition.onresult = (event: any) => {
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
        callbacks.onRecordingEnd?.();
        activeSpeechRecognition = null;
        if (activeMediaStream) {
          try {
            activeMediaStream.getTracks().forEach((track: any) => {
              track.enabled = false;
              track.stop();
            });
          } catch {}
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
        } catch {}
        activeMediaStream = null;
      }

      return true;
    } catch (err) {
      console.warn('[VoiceRecorder] Erro ao instanciar SpeechRecognition:', err);
    }
  }

  // 3. Fallback via expo-av para ambiente React Native nativo (iOS / Android)
  try {
    const permission = await Audio.requestPermissionsAsync();
    if (permission.status !== 'granted') {
      callbacks.onError?.('Permissão de microfone negada nas configurações do aplicativo.');
      return false;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await recording.startAsync();

    activeRecording = recording;
    callbacks.onRecordingStart?.();
    return true;
  } catch (err: any) {
    console.warn('[VoiceRecorder] Erro expo-av recording:', err);
    callbacks.onError?.('Não foi possível iniciar a gravação no dispositivo.');
    return false;
  }
}

/**
 * Para a gravação ou escuta de voz ativa e encerra estritamente todos os streams de mídia e tracks do navegador.
 */
export async function stopVoiceRecording(): Promise<string | null> {
  if (activeSpeechRecognition) {
    try {
      activeSpeechRecognition.abort();
      activeSpeechRecognition.stop();
    } catch {}
    activeSpeechRecognition = null;
  }

  if (activeMediaStream) {
    try {
      activeMediaStream.getTracks().forEach((track: any) => {
        track.enabled = false;
        track.stop();
      });
    } catch {}
    activeMediaStream = null;
  }

  if (activeRecording) {
    try {
      await activeRecording.stopAndUnloadAsync();
      const uri = activeRecording.getURI();
      activeRecording = null;
      return uri;
    } catch {
      activeRecording = null;
    }
  }

  return null;
}
