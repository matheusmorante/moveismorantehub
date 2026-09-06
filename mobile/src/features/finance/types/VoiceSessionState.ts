export type VoiceSessionState =
  | 'IDLE'
  | 'STARTING'
  | 'LISTENING'
  | 'PRE_ANALYZING'
  | 'FINALIZING'
  | 'ANALYZING'
  | 'READY'
  | 'CANCELLING'
  | 'ERROR';
