import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { Alert } from 'react-native';
import { flattenFormErrors, useZodForm } from '../../../hooks/useZodForm';
import {
  extractLocalSemanticDelta,
  type LocalSemanticDelta,
  MAX_VOICE_INACTIVITY_MS,
  PRE_ANALYSIS_DEBOUNCE_MS,
  type ChatMessage,
} from '../../../services/financialAiAssistantService';
import { GeminiLiveSession, type LiveState, type Quota } from '../../../services/geminiLiveService';
import type { ExecutedToolRecord } from '../../../services/aiAgent/mobileAgentTypes';
import type { VoiceSessionState } from '../types/VoiceSessionState';
import { startVoiceRecording, stopVoiceRecording } from '../../../services/voiceRecorderService';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import {
  financialLiveCommandFormSchema,
  financialRecordingCommandFormSchema,
  financialLiveTranscriptFormSchema,
  financialLiveQuotaSchema,
} from '../../../../../shared-utils/financialVoiceFormSchemas';

const stopRecordingSafely = () => withTimeout(Promise.resolve().then(() => stopVoiceRecording()).then(() => true), 5000, false, 'voz:encerrar-gravacao');
const endLiveSafely = (session: GeminiLiveSession) => withTimeout(Promise.resolve().then(() => session.end()).then(() => true), 10_000, false, 'voz:encerrar-live');

interface VoiceScope {
  userName: string;
  revision: number;
}

interface UseFinancialAiVoiceSessionProps {
  userName: string;
  mountedRef: MutableRefObject<boolean>;
  scopeRef: MutableRefObject<VoiceScope>;
  operationRef: MutableRefObject<object | null>;
  mediaControlBusy: MutableRefObject<boolean>;
  latestInputText: () => string;
  setInputText: Dispatch<SetStateAction<string>>;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setMediaBusy: Dispatch<SetStateAction<boolean>>;
  runMediaOperation: (action: (isCurrent: () => boolean) => Promise<unknown>) => Promise<unknown>;
  publishPreparedTransactionCard: (
    record: ExecutedToolRecord,
    assistantMessageId: string,
    isCurrent?: () => boolean,
    addVoiceAnchor?: boolean,
  ) => unknown;
}

export function useFinancialAiVoiceSession({
  userName,
  mountedRef,
  scopeRef,
  operationRef,
  mediaControlBusy,
  latestInputText,
  setInputText,
  setMessages,
  setMediaBusy,
  runMediaOperation,
  publishPreparedTransactionCard,
}: UseFinancialAiVoiceSessionProps) {
  const [voiceState, setVoiceState] = useState<VoiceSessionState>('IDLE');
  const [livePill, setLivePill] = useState<LocalSemanticDelta | null>(null);
  const [liveState, setLiveState] = useState<LiveState | null>(null);
  const [liveQuota, setLiveQuota] = useState<Quota | null>(null);
  const [mediaError, setMediaError] = useState('');

  const recordingStartForm = useZodForm(financialRecordingCommandFormSchema, { action: 'start', sessionId: 0, baseText: '' });
  const recordingControlForm = useZodForm(financialRecordingCommandFormSchema, { action: 'stop', sessionId: 0, baseText: '' });
  const liveStartForm = useZodForm(financialLiveCommandFormSchema, { action: 'start', state: 'idle' });
  const liveControlForm = useZodForm(financialLiveCommandFormSchema, { action: 'end', state: 'idle' });
  const liveEndForm = useZodForm(financialLiveCommandFormSchema, { action: 'end', state: 'idle' });
  const transcriptForm = useZodForm(financialLiveTranscriptFormSchema, { text: '', role: 'user' });

  const baseInputTextRef = useRef('');
  const speechSessionTextRef = useRef('');
  const lastProcessedTextRef = useRef('');
  const debounceTimerRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const inactivityTimerRef = useRef<any>(null);
  const liveSessionRef = useRef<GeminiLiveSession | null>(null);
  const voiceSessionIdRef = useRef<number>(0);
  const recordingOwner = useRef<{ id: number; scope: VoiceScope; revision: number } | null>(null);
  const mediaControlToken = useRef<object | null>(null);
  const mediaState = useRef({ liveState, voiceState });
  mediaState.current = { liveState, voiceState };

  const clearRecordingTimers = useCallback(() => {
    for (const timer of [debounceTimerRef, silenceTimerRef, inactivityTimerRef]) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const disposeMedia = useCallback(() => {
    const recording = recordingOwner.current;
    ++voiceSessionIdRef.current;
    recordingOwner.current = null;
    clearRecordingTimers();
    if (recording) void stopRecordingSafely().catch(() => undefined);
    const session = liveSessionRef.current;
    liveSessionRef.current = null;
    if (session) void endLiveSafely(session).catch(() => undefined);
  }, [clearRecordingTimers]);

  useEffect(() => {
    disposeMedia();
    setLiveState(null);
    setLiveQuota(null);
    setVoiceState('IDLE');
    setMediaError('');
  }, [userName, disposeMedia]);

  const recordingIsCurrent = (owner: NonNullable<typeof recordingOwner.current>) => mountedRef.current && recordingOwner.current === owner && scopeRef.current === owner.scope && owner.scope.revision === owner.revision;
  const handleRecordingControl = async (action: 'stop' | 'cancel') => {
    if (mediaControlBusy.current) return false;
    mediaControlBusy.current = true;
    const owner = recordingOwner.current;
    const scope = scopeRef.current, revision = scope.revision;
    const isCurrent = () => mountedRef.current && scopeRef.current === scope && scope.revision === revision;
    try {
      return await recordingControlForm.validateAndRun({ action, sessionId: voiceSessionIdRef.current, baseText: latestInputText() }, async values => {
        ++voiceSessionIdRef.current; recordingOwner.current = null; clearRecordingTimers();
        if (isCurrent()) setVoiceState('FINALIZING');
        const stopped = await stopRecordingSafely();
        if (!isCurrent()) return false;
        setVoiceState('IDLE');
        if (!stopped) throw new Error('O microfone não confirmou o encerramento no prazo. Confira as permissões do dispositivo.');
        if (values.action === 'cancel') {
          speechSessionTextRef.current = ''; lastProcessedTextRef.current = ''; setLivePill(null);
          if (latestInputText() === values.baseText) setInputText(owner ? baseInputTextRef.current : values.baseText);
        }
        return true;
      });
    } catch (error) { if (isCurrent()) { setVoiceState('IDLE'); setMediaError(error instanceof Error ? error.message : 'Não foi possível encerrar o microfone.'); } return false; }
    finally { mediaControlBusy.current = false; }
  };
  const handleStopVoice = () => handleRecordingControl('stop');
  const handleCancelVoice = () => handleRecordingControl('cancel');
  const handleStartVoice = () => {
    if (recordingOwner.current && mediaState.current.voiceState !== 'STARTING') return handleStopVoice();
    if (recordingOwner.current || liveSessionRef.current || mediaControlBusy.current) return Promise.resolve(false);
    return runMediaOperation(async isCurrent => {
      setMediaError('');
      return recordingStartForm.validateAndRun({ action: 'start', sessionId: voiceSessionIdRef.current + 1, baseText: latestInputText() }, async values => {
        if (!isCurrent()) return false;
        baseInputTextRef.current = values.baseText.trim(); speechSessionTextRef.current = ''; lastProcessedTextRef.current = '';
        voiceSessionIdRef.current = values.sessionId;
        const owner = { id: values.sessionId, scope: scopeRef.current, revision: scopeRef.current.revision }; recordingOwner.current = owner;
        const current = () => isCurrent() && recordingIsCurrent(owner);
        const armInactivity = () => { if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current); inactivityTimerRef.current = setTimeout(() => { if (current()) void handleStopVoice(); }, MAX_VOICE_INACTIVITY_MS); };
        setVoiceState('STARTING');
        try {
          const started = await withTimeout(startVoiceRecording({
            onRecordingStart: () => { if (current()) { setVoiceState('LISTENING'); armInactivity(); } },
            onRecordingEnd: () => { if (current()) { recordingOwner.current = null; clearRecordingTimers(); setVoiceState('IDLE'); } },
            onSpeechResult: transcript => {
              if (!current()) return;
              speechSessionTextRef.current = transcript;
              const text = (baseInputTextRef.current ? baseInputTextRef.current + ' ' + transcript : transcript).trim();
              setInputText(text); setLivePill(extractLocalSemanticDelta(text)); armInactivity();
              if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = setTimeout(() => { if (current()) setLivePill(extractLocalSemanticDelta(text)); }, PRE_ANALYSIS_DEBOUNCE_MS);
            },
            onError: error => { if (current()) { recordingOwner.current = null; clearRecordingTimers(); setVoiceState('IDLE'); setMediaError(error || 'Não foi possível iniciar o microfone.'); void stopRecordingSafely().catch(() => undefined); } },
          }), 15_000, false, 'voz:iniciar-gravacao');
          if (!current()) return false;
          if (!started) throw new Error('O microfone não iniciou no prazo ou a permissão foi negada.');
          setVoiceState('LISTENING'); armInactivity(); return true;
        } catch (error) {
          if (current()) { recordingOwner.current = null; ++voiceSessionIdRef.current; clearRecordingTimers(); setVoiceState('IDLE'); setMediaError(error instanceof Error ? error.message : 'Não foi possível iniciar o microfone.'); void stopRecordingSafely().catch(() => undefined); }
          return false;
        }
      }, errors => { if (isCurrent()) setMediaError(Object.values(flattenFormErrors(errors))[0]); });
    });
  };

  const liveIsCurrent = (session: GeminiLiveSession, scope: typeof scopeRef.current, revision: number) => mountedRef.current && liveSessionRef.current === session && scopeRef.current === scope && scope.revision === revision;
  const handleLiveControl = async (action: 'pause' | 'resume' | 'mute' | 'end') => {
    const session = liveSessionRef.current;
    if (!session || (action !== 'end' && (mediaControlBusy.current || operationRef.current))) return false;
    const token = {}; mediaControlToken.current = token;
    mediaControlBusy.current = true; setMediaBusy(true); setMediaError('');
    const scope = scopeRef.current, revision = scope.revision;
    const current = () => liveIsCurrent(session, scope, revision);
    try {
      return await (action === 'end' ? liveEndForm : liveControlForm).validateAndRun({ action, sessionId: session.id, state: mediaState.current.liveState || 'idle' }, async values => {
        if (!current()) return false;
        if (values.action === 'end') {
          liveSessionRef.current = null; setLiveState(null); setLiveQuota(null);
          const ended = await endLiveSafely(session); if (!ended) throw new Error('O encerramento da chamada não respondeu no prazo. Confira o microfone do dispositivo.'); return true;
        }
        const done = await withTimeout(Promise.resolve(values.action === 'pause' ? session.pause() : values.action === 'resume' ? session.resume() : session.toggleMute()).then(() => true), 15_000, false, 'voz:controle-live');
        if (!done) throw new Error('O controle da chamada não respondeu no prazo. A sessão será encerrada.');
        return current();
      }, errors => { if (current()) setMediaError(Object.values(flattenFormErrors(errors))[0]); });
    } catch (error) {
      if (mountedRef.current && scopeRef.current === scope && scope.revision === revision && mediaControlToken.current === token) {
        setMediaError(error instanceof Error ? error.message : 'Não foi possível controlar a chamada.');
        if (liveSessionRef.current === session) { liveSessionRef.current = null; setLiveState(null); setLiveQuota(null); void endLiveSafely(session).catch(() => undefined); }
      }
      return false;
    } finally { if (mediaControlToken.current === token) { mediaControlToken.current = null; mediaControlBusy.current = false; if (mountedRef.current) setMediaBusy(Boolean(operationRef.current)); } }
  };
  const handleStartLive = () => {
    if (liveSessionRef.current) return mediaState.current.liveState === 'paused' ? handleLiveControl('resume') : Promise.resolve(false);
    if (recordingOwner.current || mediaControlBusy.current) return Promise.resolve(false);
    return runMediaOperation(async isCurrent => {
      setMediaError('');
      return liveStartForm.validateAndRun({ action: 'start', state: 'idle' }, async () => {
        if (!isCurrent()) return false;
        const scope = scopeRef.current, revision = scope.revision;
        const session = new GeminiLiveSession({
          onState: state => { if (!liveIsCurrent(session, scope, revision)) return; setLiveState(state === 'ended' ? null : state); if (state === 'ended') { liveSessionRef.current = null; setLiveQuota(null); } },
          onTranscript: (role, text) => {
            if (!liveIsCurrent(session, scope, revision)) return;
            void transcriptForm.enqueueAndRun({ role, text }, values => {
              if (!liveIsCurrent(session, scope, revision)) return false;
              setMessages(messages => [...messages, { id: 'live_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), sender: values.role, text: values.text, timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), status: 'ACTIVE' }]); return true;
            }, errors => { if (liveIsCurrent(session, scope, revision)) setMediaError(Object.values(flattenFormErrors(errors))[0]); });
          },
          onToolExecuted: record => {
            const current = () => liveIsCurrent(session, scope, revision);
            if (!current() || record.name !== 'criarMovimentacaoFinanceira') return;
            return publishPreparedTransactionCard(record, 'live_card_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), current, true);
          },
          onQuota: quota => { if (!liveIsCurrent(session, scope, revision)) return; const parsed = financialLiveQuotaSchema.safeParse(quota); if (parsed.success) setLiveQuota(parsed.data); else { setMediaError('A chamada retornou uma cota inválida. Encerre e consulte novamente.'); liveSessionRef.current = null; setLiveState(null); setLiveQuota(null); void endLiveSafely(session).catch(() => undefined); } },
          onError: error => { if (liveIsCurrent(session, scope, revision)) setMediaError(error.message); },
        });
        liveSessionRef.current = session; setLiveState('connecting');
        try {
          const started = await withTimeout(session.start().then(() => true), 20_000, false, 'voz:iniciar-live');
          if (!isCurrent() || liveSessionRef.current !== session) return false;
          if (!started) throw new Error('A chamada não iniciou no prazo. Confira a conexão e tente novamente.');
          return true;
        } catch (error) {
          const ownsSession = liveSessionRef.current === session;
          if (liveIsCurrent(session, scope, revision)) { liveSessionRef.current = null; setLiveState(null); setLiveQuota(null); setMediaError(error instanceof Error ? error.message : 'Não foi possível iniciar a ligação.'); }
          if (ownsSession) void endLiveSafely(session).catch(() => undefined); return false;
        }
      }, errors => { if (isCurrent()) setMediaError(Object.values(flattenFormErrors(errors))[0]); });
    });
  };
  const handleToggleLivePause = () => handleLiveControl(mediaState.current.liveState === 'paused' ? 'resume' : 'pause');
  const handleToggleLiveMute = () => handleLiveControl('mute');
  const handleEndLive = () => handleLiveControl('end');
  const clearLivePill = () => setLivePill(null);
  const clearSession = () => {
    disposeMedia(); setMediaError(''); setLiveState(null); setLiveQuota(null); setVoiceState('IDLE');
    setLivePill(null); speechSessionTextRef.current = ''; lastProcessedTextRef.current = '';
  };
  const isRecordingActive = voiceState === 'LISTENING' || voiceState === 'PRE_ANALYZING';

  return {
    voiceState, livePill, liveState, liveQuota, mediaError, isRecordingActive,
    disposeMedia, clearSession, clearLivePill,
    handleStartVoice, handleStartLive, handleToggleLivePause, handleToggleLiveMute, handleEndLive,
    handleStopVoice, handleCancelVoice,
  };
}
