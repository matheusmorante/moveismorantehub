import { useState, useRef, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { flattenFormErrors, useZodForm } from '../../../hooks/useZodForm';
import { textPromptFormSchema } from '../../../../../shared-utils/assistedFormSchemas';
import { financialCandidateSelectionFormSchema, financialIntentDraftFormSchema, financialPreparedIntentFormSchema, financialTransactionFormSchema } from '../../../../../shared-utils/financialFormSchemas';
import { ScrollView, Alert } from 'react-native';
import {
  FinancialCategory,
  createFinancialTransaction,
  confirmFinancialDraft,
} from '../../../services/mobileFinanceService';
import {
  ChatMessage,
  ParsedFinancialIntent,
  extractLocalSemanticDelta,
  LocalSemanticDelta,
  PRE_ANALYSIS_DEBOUNCE_MS,
  MAX_VOICE_INACTIVITY_MS,
} from '../../../services/financialAiAssistantService';
import { MobileAgentService } from '../../../services/aiAgent/mobileAgentService';
import { GeminiLiveSession, type LiveState, type Quota } from '../../../services/geminiLiveService';
import { GeminiContent, ExecutedToolRecord } from '../../../services/aiAgent/mobileAgentTypes';
import { VoiceSessionState } from '../types/VoiceSessionState';
import { CardVisualState } from '../components/TransactionPreviewCard';
import {
  appendFinancialTimelineCard,
  updateFinancialTimelineCardState,
} from '../components/chat/financialCardTimeline';
import type { FinancialCardTimelineEntry } from '../components/chat/financialCardTimeline';
import { startVoiceRecording, stopVoiceRecording } from '../../../services/voiceRecorderService';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import { financialChatUtilityFormSchema, financialLiveCommandFormSchema, financialRecordingCommandFormSchema, financialLiveTranscriptFormSchema, financialLiveQuotaSchema } from '../../../../../shared-utils/financialVoiceFormSchemas';
import { advanceFinancialBatch, rebuildFinancialBatch } from '../../../services/financial/financialBatchQueue';

const messageFormSchema = textPromptFormSchema.extend({ targetMessageId: z.string().trim().min(1).optional() });
const purposeSchema = z.string().pipe(z.enum(['BUSINESS', 'PERSONAL', 'PERSONAL_PARTNER']));
// Incomplete drafts remain editable; only confirmation requires a realized fact.
const confirmationFormSchema = financialIntentDraftFormSchema.extend({
  description: z.string().trim().nullish(), supplier: z.string().trim().nullish(),
  paymentMethod: financialTransactionFormSchema.shape.payment_method.refine((value) => !['UNKNOWN', 'UNKNOWN_BY_USER'].includes(value), 'Informe a forma de pagamento.'),
  businessPurpose: purposeSchema.nullish(), purpose: purposeSchema.nullish(),
  categoryName: z.string().trim().nullish(), categoryId: z.string().trim().nullish(),
  vehicleId: z.string().trim().nullish(),
  matchedAccount: z.object({ id: z.string().trim().min(1, 'Conta não identificada.') }).passthrough().nullish(),
}).superRefine((values, ctx) => {
  if (!values.businessPurpose && !values.purpose) ctx.addIssue({ code: 'custom', path: ['businessPurpose'], message: 'Informe a finalidade da movimentação.' });
  const amount = financialTransactionFormSchema.shape.amount.safeParse(values.amount ?? values.totalAmount);
  if (!amount.success) ctx.addIssue({ code: 'custom', path: ['amount'], message: amount.error.issues[0].message });
  if (values.intentType && ['INSTALLMENT', 'PAYABLE_BILL', 'RECURRING'].includes(values.intentType)) ctx.addIssue({ code: 'custom', path: ['intentType'], message: 'Registre apenas fatos realizados; parcelas futuras e recorrências não são suportadas.' });
  if (values.intentType && ['MATCH_EXISTING', 'QUERY_OR_UPDATE'].includes(values.intentType) && !values.matchedAccount) ctx.addIssue({ code: 'custom', path: ['matchedAccount'], message: 'Selecione a conta existente antes de confirmar a movimentação.' });
});
const singleTransactionFormSchema = financialTransactionFormSchema.extend({ category_name: z.string().trim().nullish(), purpose: purposeSchema.nullish() });
const stopRecordingSafely = () => withTimeout(Promise.resolve().then(() => stopVoiceRecording()).then(() => true), 5000, false, 'voz:encerrar-gravacao');
const endLiveSafely = (session: GeminiLiveSession) => withTimeout(Promise.resolve().then(() => session.end()).then(() => true), 10_000, false, 'voz:encerrar-live');
const uncertainMessage = 'Não foi possível confirmar o registro. Confira as movimentações antes de repetir.';

interface UseFinancialAiChatProps {
  categories: FinancialCategory[];
  onTransactionRegistered: () => void | Promise<void>;
  userName?: string;
}

export function useFinancialAiChat({
  categories,
  onTransactionRegistered,
  userName = 'Operador',
}: UseFinancialAiChatProps) {
  const [inputText, setInputText] = useState('');
  const inputForm = useZodForm(messageFormSchema, { text: inputText });
  const intentForm = useZodForm(confirmationFormSchema, { paymentMethod: '' });
  const transactionForm = useZodForm(singleTransactionFormSchema, { description: '', amount: 0, type: 'expense', date: '', payment_method: '' });
  const candidateForm = useZodForm(financialCandidateSelectionFormSchema, { candidate: { id: '', amount: 0 } });
  const preparedForm = useZodForm(financialPreparedIntentFormSchema, { type: 'expense', description: '', amount: 0 });
  const liveStartForm = useZodForm(financialLiveCommandFormSchema, { action: 'start', state: 'idle' });
  const liveControlForm = useZodForm(financialLiveCommandFormSchema, { action: 'end', state: 'idle' });
  const liveEndForm = useZodForm(financialLiveCommandFormSchema, { action: 'end', state: 'idle' });
  const recordingStartForm = useZodForm(financialRecordingCommandFormSchema, { action: 'start', sessionId: 0, baseText: '' });
  const recordingControlForm = useZodForm(financialRecordingCommandFormSchema, { action: 'stop', sessionId: 0, baseText: '' });
  const transcriptForm = useZodForm(financialLiveTranscriptFormSchema, { text: '', role: 'user' });
  const utilityForm = useZodForm(financialChatUtilityFormSchema, { intent: 'clear_chat', messageIds: [], cardIds: [], inputText: '', editText: '' });
  const utilityPending = useRef<object | null>(null);
  const [utilityBusy, setUtilityBusy] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingIntent, setPendingIntent] = useState<ParsedFinancialIntent | null>(null);
  const [activeDraft, setActiveDraft] = useState<ParsedFinancialIntent | null>(null);
  const [registering, setRegistering] = useState(false);
  const [timelineCards, setTimelineCards] = useState<FinancialCardTimelineEntry[]>([]);
  const [activeTimelineCardId, setActiveTimelineCardId] = useState<string | null>(null);

  // Estados de Edicao e Copia de Mensagens
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Estados da Sessao de Voz
  const [voiceState, setVoiceState] = useState<VoiceSessionState>('IDLE');
  const [livePill, setLivePill] = useState<LocalSemanticDelta | null>(null);
  const [liveState, setLiveState] = useState<LiveState | null>(null);
  const [liveQuota, setLiveQuota] = useState<Quota | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const baseInputTextRef = useRef('');
  const speechSessionTextRef = useRef('');
  const lastProcessedTextRef = useRef('');
  const debounceTimerRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const inactivityTimerRef = useRef<any>(null);
  const geminiHistoryRef = useRef<GeminiContent[]>([]);
  const liveSessionRef = useRef<GeminiLiveSession | null>(null);
  const mountedRef = useRef(true);
  const scopeRef = useRef({ userName, revision: 0 });
  if (scopeRef.current.userName !== userName) scopeRef.current = { userName, revision: scopeRef.current.revision + 1 };
  const operationRef = useRef<object | null>(null);
  const uncertainWrites = useRef(new Set<string>());
  const confirmedWrites = useRef(new Set<string>());
  const completedBatchCounts = useRef(new Map<string, number>());
  const latest = useRef({ inputText, editText, pendingIntent, timelineCards, messages, editingMessageId });
  latest.current = { inputText, editText, pendingIntent, timelineCards, messages, editingMessageId };

  const voiceSessionIdRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const recordingOwner = useRef<{ id: number; scope: typeof scopeRef.current; revision: number } | null>(null);
  const mediaControlBusy = useRef(false);
  const mediaControlToken = useRef<object | null>(null);
  const mediaState = useRef({ liveState, voiceState }); mediaState.current = { liveState, voiceState };
  const clearRecordingTimers = useCallback(() => {
    for (const timer of [debounceTimerRef, silenceTimerRef, inactivityTimerRef]) { if (timer.current) clearTimeout(timer.current); timer.current = null; }
  }, []);
  const disposeMedia = useCallback(() => {
    const recording = recordingOwner.current;
    ++voiceSessionIdRef.current; recordingOwner.current = null; clearRecordingTimers();
    if (recording) void stopRecordingSafely().catch(() => undefined);
    const session = liveSessionRef.current; liveSessionRef.current = null;
    if (session) void endLiveSafely(session).catch(() => undefined);
  }, [clearRecordingTimers]);
  const abortActiveRequest = useCallback(() => { abortControllerRef.current?.abort(); }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      scopeRef.current.revision += 1;
      disposeMedia();
      abortActiveRequest();
    };
  }, [disposeMedia, abortActiveRequest]);
  useEffect(() => { disposeMedia(); setLiveState(null); setLiveQuota(null); setVoiceState('IDLE'); setMediaError('');
  }, [userName, disposeMedia]);

  const isRecordingActive = voiceState === 'LISTENING' || voiceState === 'PRE_ANALYZING';

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const publishTimelineCard = (
    intent: ParsedFinancialIntent,
    cardState: CardVisualState,
    afterMessageId: string
  ) => {
    const entry = {
      id: `card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      afterMessageId,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      intent,
      cardState,
    };
    setTimelineCards((current) => appendFinancialTimelineCard(current, entry));
    setActiveTimelineCardId(entry.id);
    scrollToBottom();
  };

  const markActiveTimelineCard = (cardState: CardVisualState) => {
    setTimelineCards((current) =>
      updateFinancialTimelineCardState(current, activeTimelineCardId, cardState)
    );
  };

  const finishActiveTimelineCard = (cardState: 'SAVED' | 'DISCARDED') => {
    markActiveTimelineCard(cardState);
    setActiveTimelineCardId(null);
  };

  const latestTimelineAnchor = () => {
    const activeMsgs = messages.filter((message) => !message.status || message.status === 'ACTIVE');
    return (
      (activeMsgs.length ? activeMsgs[activeMsgs.length - 1]?.id : null) ||
      (timelineCards.length ? timelineCards[timelineCards.length - 1]?.afterMessageId : '') ||
      ''
    );
  };

  const handleClearChat = async () => {
    const snapshot = latest.current;
    const scope = scopeRef.current, revision = ++scope.revision;
    const token = {}; utilityPending.current = token; setUtilityBusy(true);
    const isCurrent = () => mountedRef.current && scopeRef.current === scope && scope.revision === revision;
    try {
      return await utilityForm.enqueueAndRun({ intent: 'clear_chat', messageIds: snapshot.messages.map(message => message.id), cardIds: snapshot.timelineCards.map(card => card.id), inputText: snapshot.inputText, editText: snapshot.editText }, values => {
        if (!isCurrent() || values.intent !== 'clear_chat') return false;
        disposeMedia(); setMediaError(''); setLiveState(null); setLiveQuota(null); setVoiceState('IDLE');
        abortActiveRequest();
        const messageIds = new Set(values.messageIds), cardIds = new Set(values.cardIds);
        setMessages(current => current.filter(message => !messageIds.has(message.id)));
        setCopiedMessageId(current => current && messageIds.has(current) ? null : current);
        setTimelineCards(current => current.filter(card => !cardIds.has(card.id)));
        setPendingIntent(current => JSON.stringify(current) === JSON.stringify(snapshot.pendingIntent) ? null : current);
        setActiveDraft(null); setActiveTimelineCardId(current => current && cardIds.has(current) ? null : current);
        setInputText(current => current === values.inputText ? '' : current);
        setEditText(current => current === values.editText ? '' : current);
        setEditingMessageId(current => current === snapshot.editingMessageId ? null : current);
        setLivePill(null); speechSessionTextRef.current = ''; lastProcessedTextRef.current = ''; geminiHistoryRef.current = [];
        return true;
      }, errors => { if (isCurrent()) Alert.alert('Não foi possível limpar a conversa', Object.values(flattenFormErrors(errors))[0]); });
    } catch { if (isCurrent()) Alert.alert('Não foi possível limpar a conversa', 'Confira a conversa e tente novamente.'); return false; }
    finally { if (utilityPending.current === token) { utilityPending.current = null; if (mountedRef.current) setUtilityBusy(false); } }
  };

  const handleCopyMessage = async (msg: ChatMessage) => {
    const scope = scopeRef.current, revision = scope.revision;
    const isCurrent = () => mountedRef.current && scopeRef.current === scope && scope.revision === revision;
    try {
      return await utilityForm.enqueueAndRun({ intent: 'copy_message', messageId: msg.id, text: msg.text }, async values => {
        if (!isCurrent() || values.intent !== 'copy_message' || !latest.current.messages.some(message => message.id === values.messageId && message.text === values.text)) return false;
        if (typeof navigator === 'undefined' || !navigator.clipboard) throw new Error('A cópia não está disponível neste dispositivo.');
        const copied = await withTimeout(navigator.clipboard.writeText(values.text).then(() => true), 5000, false, 'chat:copiar-mensagem');
        if (!copied) throw new Error('A cópia da mensagem não respondeu no prazo.');
        if (!isCurrent()) return false;
        setCopiedMessageId(values.messageId);
        setTimeout(() => { if (isCurrent()) setCopiedMessageId(current => current === values.messageId ? null : current); }, 2000);
        return true;
      }, errors => { if (isCurrent()) Alert.alert('Não foi possível copiar', Object.values(flattenFormErrors(errors))[0]); });
    } catch (error) { if (isCurrent()) Alert.alert('Não foi possível copiar', error instanceof Error ? error.message : 'Confira a mensagem.'); return false; }
  };

  const handleStartEditMessage = (msg: ChatMessage) => {
    if (operationRef.current) return;
    setEditingMessageId(msg.id);
    setEditText(msg.text);
  };

  const handleCancelEdit = () => {
    if (operationRef.current) return;
    setEditingMessageId(null);
    setEditText('');
  };

  const publishPreparedTransactionCard = (createdTx: ExecutedToolRecord, asstMsgId: string, isCurrent = () => mountedRef.current, addVoiceAnchor = false) => {
    if (!createdTx || !createdTx.result?.success) return;
    const txData = createdTx.result?.data || createdTx.args;
    if (!txData) return;

    const matchedCat = categories.find((c) => c.id === txData.categoriaId);
    const catName = txData.categoriaNome || matchedCat?.name || 'Categoria não informada';
    const intent: ParsedFinancialIntent = {
      type: txData.tipo,
      amount: txData.valor,
      totalAmount: txData.valor,
      description: txData.descricao,
      categoryName: catName,
      categoryId: txData.categoriaId || undefined,
      businessPurpose: txData.finalidade || 'BUSINESS',
      paymentMethod: txData.formaPagamento || '',
      vehicle: txData.veiculo || undefined,
      date: txData.data || new Date().toISOString().split('T')[0],
      missingFields: [],
      isReadyForConfirmation: true,
      validationStatus: 'ready',
    };
    return preparedForm.enqueueAndRun(intent as z.input<typeof financialPreparedIntentFormSchema>, values => {
      if (!isCurrent()) return false;
      const parsed = values as ParsedFinancialIntent;
      const ready = confirmationFormSchema.safeParse(parsed).success;
      parsed.isReadyForConfirmation = ready; parsed.validationStatus = ready ? 'ready' : 'needs_input';
      if (addVoiceAnchor) setMessages(messages => [...messages, { id: asstMsgId, sender: 'assistant', text: 'Movimentação preparada por voz. Confira os dados no cartão antes de confirmar.', timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), status: 'ACTIVE' }]);
      setPendingIntent(parsed); publishTimelineCard(parsed, ready ? 'READY_TO_CONFIRM' : 'NEEDS_INPUT', asstMsgId); return true;
    }, errors => { if (isCurrent()) Alert.alert('Revise a movimentação preparada', Object.values(flattenFormErrors(errors))[0]); });
  };

  const publishPreparedTransactionCards = async (
    executedTools: ExecutedToolRecord[],
    asstMsgId: string,
    isCurrent: () => boolean,
  ) => {
    for (const tool of executedTools.filter(tool => tool.name === 'criarMovimentacaoFinanceira' && tool.result?.success)) {
      if (!isCurrent()) return;
      await publishPreparedTransactionCard(tool, asstMsgId, isCurrent);
    }
  };

  const runOperation = async (kind: 'message' | 'write' | 'media', action: (isCurrent: () => boolean) => Promise<unknown>) => {
    if (operationRef.current || mediaControlBusy.current || utilityPending.current) return false;
    const token = {}, scope = scopeRef.current;
    const revision = scope.revision;
    const isCurrent = () => mountedRef.current && scopeRef.current === scope && scope.revision === revision;
    operationRef.current = token;
    if (kind === 'message') setLoading(true); else if (kind === 'write') setRegistering(true); else setMediaBusy(true);
    try { return await action(isCurrent); }
    finally {
      if (operationRef.current === token) operationRef.current = null;
      if (mountedRef.current) { if (kind === 'message') setLoading(false); else if (kind === 'write') setRegistering(false); else setMediaBusy(mediaControlBusy.current); }
    }
  };

  const sendValidatedMessage = (text: string, targetMessageId?: string) => runOperation('message', async (isCurrent) => {
    try {
      return await inputForm.validateAndRun({ text, targetMessageId }, async (values) => {
        const sourceMessages = latest.current.messages;
        const target = values.targetMessageId ? sourceMessages.find((message) => message.id === values.targetMessageId) : undefined;
        if (values.targetMessageId && !target) { Alert.alert('Revise a mensagem', 'A mensagem editada não está mais disponível.'); return false; }
        if (!isCurrent()) return false;
        const response = await withTimeout(MobileAgentService.sendMessage(values.text, geminiHistoryRef.current), 45_000, null, 'Análise da mensagem financeira');
        if (!isCurrent()) return false;
        if (!response) throw new Error('A análise demorou demais. Sua mensagem foi preservada; tente novamente.');
        const { result, updatedHistory } = response;
        if (!result || typeof result.answer !== 'string') throw new Error('O assistente não confirmou a análise. Tente novamente.');
        geminiHistoryRef.current = updatedHistory;
        const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const editedMessage: ChatMessage = { id: 'usr_' + Date.now(), sender: 'user', text: values.text, timestamp: timeStr,
          ...(target ? { parentMessageId: target.id, version: (target.version || 1) + 1, status: 'ACTIVE' as const, editedAt: timeStr } : {}) };
        const assistantMessage: ChatMessage = { id: 'asst_' + Date.now(), sender: 'assistant', text: result.answer, timestamp: timeStr };
        setMessages((current) => {
          const targetIndex = target ? current.findIndex((message) => message.id === target.id) : -1;
          const base = target ? current.map((message, index) => message.id === target.id ? { ...message, status: 'SUPERSEDED' as const } : index > targetIndex ? { ...message, status: 'BRANCH_INACTIVE' as const } : message) : current;
          return [...base, editedMessage, assistantMessage];
        });
        if (target) { setEditingMessageId(null); setEditText(''); }
        else setInputText((current) => current.trim() === values.text ? '' : current);
        setLivePill(null);
        await publishPreparedTransactionCards(result.executedTools, assistantMessage.id, isCurrent);
        scrollToBottom();
        return true;
      }, (errors) => { if (isCurrent()) Alert.alert('Revise a mensagem', Object.values(flattenFormErrors(errors))[0]); });
    } catch (error) {
      if (isCurrent()) Alert.alert('Erro ao consultar o assistente', error instanceof Error ? error.message : 'Não foi possível analisar a mensagem. Tente novamente.');
      return false;
    }
  });
  const handleSaveAndResend = (targetMsg: ChatMessage) => sendValidatedMessage(latest.current.editText, targetMsg.id);
  const handleSendMessage = (textToSend?: string) => sendValidatedMessage(textToSend ?? latest.current.inputText);

  const recordingIsCurrent = (owner: NonNullable<typeof recordingOwner.current>) => mountedRef.current && recordingOwner.current === owner && scopeRef.current === owner.scope && owner.scope.revision === owner.revision;
  const handleRecordingControl = async (action: 'stop' | 'cancel') => {
    if (mediaControlBusy.current) return false;
    mediaControlBusy.current = true;
    const owner = recordingOwner.current;
    const scope = scopeRef.current, revision = scope.revision;
    const isCurrent = () => mountedRef.current && scopeRef.current === scope && scope.revision === revision;
    try {
      return await recordingControlForm.validateAndRun({ action, sessionId: voiceSessionIdRef.current, baseText: latest.current.inputText }, async values => {
        ++voiceSessionIdRef.current; recordingOwner.current = null; clearRecordingTimers();
        if (isCurrent()) setVoiceState('FINALIZING');
        const stopped = await stopRecordingSafely();
        if (!isCurrent()) return false;
        setVoiceState('IDLE');
        if (!stopped) throw new Error('O microfone não confirmou o encerramento no prazo. Confira as permissões do dispositivo.');
        if (values.action === 'cancel') {
          speechSessionTextRef.current = ''; lastProcessedTextRef.current = ''; setLivePill(null);
          if (latest.current.inputText === values.baseText) setInputText(owner ? baseInputTextRef.current : values.baseText);
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
    return runOperation('media', async isCurrent => {
      setMediaError('');
      return recordingStartForm.validateAndRun({ action: 'start', sessionId: voiceSessionIdRef.current + 1, baseText: latest.current.inputText }, async values => {
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
    return runOperation('media', async isCurrent => {
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

  const confirmIntent = (intent: ParsedFinancialIntent, idempotencyKey: string, cardId: string | null, clearPending: boolean) => runOperation('write', async (isCurrent) => {
    const writeKey = userName + ':' + idempotencyKey;
    if (uncertainWrites.current.has(writeKey)) { Alert.alert('Registro não confirmado', uncertainMessage); return false; }
    if (confirmedWrites.current.has(writeKey)) return false;
    const mark = (state: CardVisualState) => { if (isCurrent()) setTimelineCards((current) => updateFinancialTimelineCardState(current, cardId, state)); };
    let writing = false;
    try {
      return await intentForm.validateAndRun({ ...intent, paymentMethod: intent.paymentMethod ?? '' }, async (values) => {
        if (!isCurrent()) return false;
        mark('SAVING'); writing = true;
        const response = await withTimeout(confirmFinancialDraft(values as ParsedFinancialIntent, idempotencyKey, userName), 20_000, null, 'Confirmação financeira assistida');
        if (!response || (response.success && !response.recordId)) {
          uncertainWrites.current.add(writeKey); mark('ERROR');
          if (isCurrent()) Alert.alert('Registro não confirmado', uncertainMessage);
          return false;
        }
        if (response.success === true) confirmedWrites.current.add(writeKey);
        if (!isCurrent()) return false;
        if (response.success !== true) { mark('ERROR'); Alert.alert('Erro ao Salvar', response.error || 'Não foi possível registrar a movimentação.'); return false; }
        confirmedWrites.current.add(writeKey);
        writing = false;
        const card = latest.current.timelineCards.find((entry) => entry.id === cardId);
        const remaining = card?.intent.batchDraftsList?.length ? advanceFinancialBatch(card.intent) : null;
        if (remaining && card) {
          const completedCount = (completedBatchCounts.current.get(card.id) || 0) + 1;
          completedBatchCounts.current.set(card.id, completedCount);
          setTimelineCards((cards) => cards.map((entry) => entry.id === cardId ? { ...entry, intent: remaining, cardState: remaining.isReadyForConfirmation ? 'READY_TO_CONFIRM' : 'NEEDS_INPUT' } : entry));
        } else mark('SAVED');
        if (clearPending) { setPendingIntent(null); setActiveDraft(null); setActiveTimelineCardId(null); }
        try {
          const refreshed = await withTimeout(Promise.resolve(onTransactionRegistered()).then(() => true), 15_000, false, 'Atualização das movimentações');
          if (!refreshed && isCurrent()) Alert.alert('Registro salvo', 'A atualização da lista demorou demais. Confira as movimentações.');
        } catch { if (isCurrent()) Alert.alert('Registro salvo', 'Não foi possível atualizar a lista. Confira as movimentações.'); }
        return true;
      }, (errors) => { if (isCurrent()) Alert.alert('Revise a movimentação', Object.values(flattenFormErrors(errors))[0]); });
    } catch (error) {
      if (writing) uncertainWrites.current.add(writeKey);
      mark('ERROR');
      if (isCurrent()) Alert.alert(writing ? 'Registro não confirmado' : 'Erro ao Salvar', writing ? uncertainMessage : error instanceof Error ? error.message : 'Revise a movimentação.');
      return false;
    }
  });
  const handleConfirmRegister = () => {
    const intent = latest.current.pendingIntent;
    if (!intent) return Promise.resolve(false);
    const key = 'draft_' + JSON.stringify([intent.description || intent.supplier, intent.amount ?? intent.totalAmount, intent.date, intent.paymentMethod, intent.categoryId]);
    return confirmIntent(intent, key, activeTimelineCardId, true);
  };
  const handleConfirmTimelineCard = (cardId: string, intent: ParsedFinancialIntent) => {
    const current = latest.current.timelineCards.find((card) => card.id === cardId);
    if (!current || current.cardState === 'SAVED' || current.cardState === 'DISCARDED') return Promise.resolve(false);
    const expected = current.intent.batchDraftsList?.[0] || current.intent;
    if (JSON.stringify(expected) !== JSON.stringify(intent)) return Promise.resolve(false);
    return confirmIntent(expected, 'agent-card_' + cardId + '_' + (completedBatchCounts.current.get(cardId) || 0), cardId, false);
  };

  const selectCandidate = (candidate: unknown, cardId?: string) => runOperation('write', async isCurrent => {
    const card = cardId ? latest.current.timelineCards.find(entry => entry.id === cardId) : null;
    if (cardId && (!card || ['SAVED', 'DISCARDED', 'SAVING'].includes(card.cardState))) return false;
    const parent = card?.intent || latest.current.pendingIntent;
    if (!parent) return false;
    const current = parent.batchDraftsList?.[0] || parent;
    const original = JSON.stringify(parent);
    try {
      return await candidateForm.validateAndRun({ cardId, candidate: candidate as z.input<typeof financialCandidateSelectionFormSchema>['candidate'] }, async values => {
        if (!isCurrent()) return false;
        const owner = cardId ? latest.current.timelineCards.find(entry => entry.id === values.cardId)?.intent : latest.current.pendingIntent;
        if (!owner || JSON.stringify(owner) !== original) return false;
        const offered = current.candidateAccounts?.find(account => JSON.stringify(account) === JSON.stringify(candidate));
        if (!offered) { Alert.alert('Revise a conta selecionada', 'A conta não pertence às opções atuais desta movimentação. Consulte novamente.'); return false; }
        const next = { ...current, matchedAccount: values.candidate, supplier: values.candidate.counterparty || values.candidate.description,
          amount: values.candidate.amount, totalAmount: values.candidate.amount, dueDate: values.candidate.due_date, candidateAccounts: undefined };
        const checked = confirmationFormSchema.safeParse(next);
        const selected: ParsedFinancialIntent = { ...next, isReadyForConfirmation: checked.success, validationStatus: checked.success ? 'ready' : 'needs_input',
          missingFields: checked.success ? [] : checked.error.issues.map(issue => issue.path.join('.')),
          questionToUser: checked.success ? `Conta selecionada: ${values.candidate.counterparty || values.candidate.description || values.candidate.id}. Confira antes de registrar.` : checked.error.issues[0].message };
        const updated = parent.batchDraftsList?.length ? rebuildFinancialBatch(parent, [selected, ...parent.batchDraftsList.slice(1)])! : selected;
        if (cardId) setTimelineCards(cards => cards.map(entry => entry.id === values.cardId ? { ...entry, intent: updated, cardState: checked.success ? 'READY_TO_CONFIRM' : 'NEEDS_INPUT' } : entry));
        else setPendingIntent(updated);
        return true;
      }, errors => { if (isCurrent()) Alert.alert('Revise a conta selecionada', Object.values(flattenFormErrors(errors))[0]); });
    } catch { if (isCurrent()) Alert.alert('Revise a conta selecionada', 'Não foi possível selecionar a conta. Confira as opções e tente novamente.'); return false; }
  });
  const handleSelectCandidate = (candidate: unknown) => selectCandidate(candidate);
  const handleSelectTimelineCandidate = (cardId: string, candidate: unknown) => selectCandidate(candidate, cardId);

  const handleConfirmRegisterSingle = (intent: ParsedFinancialIntent, index: number) => runOperation('write', async (isCurrent) => {
    const draft = intent.batchDraftsList?.[index] || intent;
    const values = {
      type: draft.type || 'expense', amount: draft.amount ?? draft.totalAmount ?? 0, description: draft.description || '',
      payment_method: draft.paymentMethod || '', date: draft.date || new Date().toISOString().split('T')[0],
      category_name: draft.categoryName, purpose: draft.businessPurpose === 'UNKNOWN' ? undefined : draft.businessPurpose,
    };
    const key = userName + ':single:' + JSON.stringify(values);
    if (confirmedWrites.current.has(key)) return false;
    if (uncertainWrites.current.has(key)) { Alert.alert('Registro não confirmado', uncertainMessage); return false; }
    let writing = false;
    try {
      return await transactionForm.validateAndRun(values, async (parsed) => {
        if (!isCurrent()) return false;
        writing = true;
        const result = await withTimeout(createFinancialTransaction(parsed), 20_000, null, 'Registro financeiro assistido');
        if (!result || (result.success && !result.data?.id)) {
          uncertainWrites.current.add(key);
          if (isCurrent()) Alert.alert('Registro não confirmado', uncertainMessage);
          return false;
        }
        if (result.success === true) confirmedWrites.current.add(key);
        if (!isCurrent()) return false;
        if (result.success !== true) { Alert.alert('Erro ao Salvar', result.error || 'Não foi possível registrar a movimentação.'); return false; }
        confirmedWrites.current.add(key);
        writing = false;
        if (intent.batchDraftsList?.length) setPendingIntent(advanceFinancialBatch(intent, index)); else setPendingIntent(null);
        finishActiveTimelineCard('SAVED');
        try {
          const refreshed = await withTimeout(Promise.resolve(onTransactionRegistered()).then(() => true), 15_000, false, 'Atualização das movimentações');
          if (!refreshed && isCurrent()) Alert.alert('Registro salvo', 'A atualização da lista demorou demais. Confira as movimentações.');
        } catch { if (isCurrent()) Alert.alert('Registro salvo', 'Não foi possível atualizar a lista. Confira as movimentações.'); }
        return true;
      }, (errors) => { if (isCurrent()) Alert.alert('Revise a movimentação', Object.values(flattenFormErrors(errors))[0]); });
    } catch {
      if (writing) uncertainWrites.current.add(key);
      if (isCurrent()) Alert.alert('Registro não confirmado', uncertainMessage);
      return false;
    }
  });

  return {
    inputText,
    messages,
    loading,
    pendingIntent,
    activeDraft,
    registering,
    timelineCards,
    activeTimelineCardId,
    editingMessageId,
    editText,
    copiedMessageId,
    voiceState,
    livePill,
    liveState,
    liveQuota,
    mediaBusy, mediaError, utilityBusy,
    isRecordingActive,
    scrollViewRef,
    setInputText,
    setEditText,
    setPendingIntent,
    handleClearChat,
    handleCopyMessage,
    handleStartEditMessage,
    handleCancelEdit,
    handleSaveAndResend,
    handleSendMessage,
    handleStartVoice,
    handleStartLive,
    handleToggleLivePause,
    handleToggleLiveMute,
    handleEndLive,
    handleStopVoice,
    handleCancelVoice,
    handleConfirmRegister,
    handleConfirmTimelineCard,
    handleSelectCandidate,
    handleSelectTimelineCandidate,
    handleConfirmRegisterSingle,
    latestTimelineAnchor,
    publishTimelineCard,
  };
}
