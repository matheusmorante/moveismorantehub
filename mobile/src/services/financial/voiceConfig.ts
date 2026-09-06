/**
 * Configurações e Tipos para a Sessão Contínua de Voz do Assistente Financeiro.
 */

/** Tempo de silêncio contínuo em milissegundos para autoenvio (3000ms = 3 segundos) */
export const AUTO_SEND_SILENCE_MS = 3000;

/** Tempo limite de inatividade total sem nenhuma fala para desligar o microfone (15000ms = 15 segundos) */
export const MAX_VOICE_INACTIVITY_MS = 15000;

export type UtteranceStatus =
  | 'LISTENING'
  | 'WAITING_FOR_SILENCE'
  | 'FINALIZED'
  | 'SENT'
  | 'PROCESSING'
  | 'DONE'
  | 'ERROR';

export type TurnIntent =
  | 'CORRECTION'
  | 'ANSWER_TO_QUESTION'
  | 'CONTINUATION'
  | 'NEW_TRANSACTION'
  | 'OTHER';

export interface UtteranceSegment {
  id: string;
  transcript: string;
  startedAt: number;
  lastSpeechAt: number;
  status: UtteranceStatus;
  classificationIntent?: TurnIntent;
}

export interface VoiceSessionStateInfo {
  sessionState: 'IDLE' | 'LISTENING' | 'PRE_ANALYZING' | 'FINALIZING' | 'ANALYZING';
  activeUtteranceId: string | null;
  silenceSecondsRemaining: number | null;
}
