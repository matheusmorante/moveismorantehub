import { useState, useRef, useEffect } from 'react';
import { z } from 'zod';
import { flattenFormErrors, useZodForm } from '../../../hooks/useZodForm';
import { textPromptFormSchema } from '../../../../../shared-utils/assistedFormSchemas';
import { financialIntentDraftFormSchema, financialTransactionFormSchema } from '../../../../../shared-utils/financialFormSchemas';
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
import { advanceFinancialBatch } from '../../../services/financial/financialBatchQueue';

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
});
const singleTransactionFormSchema = financialTransactionFormSchema.extend({ category_name: z.string().trim().nullish(), purpose: purposeSchema.nullish() });
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

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      scopeRef.current.revision += 1;
      void stopVoiceRecording();
      void liveSessionRef.current?.end();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

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

  const handleClearChat = () => {
    scopeRef.current.revision += 1;
    void liveSessionRef.current?.end();
    liveSessionRef.current = null;
    setLiveState(null);
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setMessages([]);
    setPendingIntent(null);
    setActiveDraft(null);
    setTimelineCards([]);
    setActiveTimelineCardId(null);
    setLivePill(null);
    setInputText('');
    setEditingMessageId(null);
    setEditText('');
    setVoiceState('IDLE');
    speechSessionTextRef.current = '';
    lastProcessedTextRef.current = '';
    geminiHistoryRef.current = [];
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
  };

  const handleCopyMessage = async (msg: ChatMessage) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(msg.text);
      }
      setCopiedMessageId(msg.id);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.warn('[ChatView] Erro ao copiar:', err);
    }
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

  const publishPreparedTransactionCard = (createdTx: ExecutedToolRecord, asstMsgId: string) => {
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
    setPendingIntent(intent);
    publishTimelineCard(intent, 'READY_TO_CONFIRM', asstMsgId);
  };

  const publishPreparedTransactionCards = (
    executedTools: ExecutedToolRecord[],
    asstMsgId: string
  ) => {
    executedTools
      .filter((tool) => tool.name === 'criarMovimentacaoFinanceira' && tool.result?.success)
      .forEach((tool) => publishPreparedTransactionCard(tool, asstMsgId));
  };

  const runOperation = async (kind: 'message' | 'write', action: (isCurrent: () => boolean) => Promise<unknown>) => {
    if (operationRef.current) return false;
    const token = {}, scope = scopeRef.current;
    const revision = scope.revision;
    const isCurrent = () => mountedRef.current && scopeRef.current === scope && scope.revision === revision;
    operationRef.current = token;
    if (kind === 'message') setLoading(true); else setRegistering(true);
    try { return await action(isCurrent); }
    finally {
      if (operationRef.current === token) operationRef.current = null;
      if (mountedRef.current) { if (kind === 'message') setLoading(false); else setRegistering(false); }
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
        publishPreparedTransactionCards(result.executedTools, assistantMessage.id);
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

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(async () => {
      await handleStopVoice();
    }, MAX_VOICE_INACTIVITY_MS);
  };

  const handleStartVoice = async () => {
    if (isRecordingActive) {
      await handleStopVoice();
      return;
    }

    baseInputTextRef.current = inputText.trim();
    speechSessionTextRef.current = '';
    lastProcessedTextRef.current = '';
    voiceSessionIdRef.current += 1;
    const currentSessionId = voiceSessionIdRef.current;

    setVoiceState('STARTING');
    resetInactivityTimer();

    const started = await startVoiceRecording({
      onRecordingStart: () => {
        if (voiceSessionIdRef.current === currentSessionId) {
          setVoiceState('LISTENING');
        }
      },
      onRecordingEnd: () => {
        if (voiceSessionIdRef.current === currentSessionId) {
          setVoiceState('IDLE');
        }
      },
      onSpeechResult: (transcript) => {
        if (voiceSessionIdRef.current !== currentSessionId) return;

        speechSessionTextRef.current = transcript;
        const fullText = (
          baseInputTextRef.current ? `${baseInputTextRef.current} ${transcript}` : transcript
        ).trim();
        setInputText(fullText);

        const liveDelta = extractLocalSemanticDelta(fullText);
        setLivePill(liveDelta);

        resetInactivityTimer();

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

        silenceTimerRef.current = setTimeout(async () => {
          if (voiceSessionIdRef.current !== currentSessionId) return;
          const currentFullText = (
            baseInputTextRef.current
              ? `${baseInputTextRef.current} ${speechSessionTextRef.current}`
              : speechSessionTextRef.current
          ).trim();
          if (currentFullText) {
            const semanticDelta = extractLocalSemanticDelta(currentFullText);
            setLivePill(semanticDelta);
            resetInactivityTimer();
          }
        }, PRE_ANALYSIS_DEBOUNCE_MS);
      },
      onError: (err) => {
        if (voiceSessionIdRef.current === currentSessionId) {
          if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          setVoiceState('IDLE');
          console.warn('[VoiceRecorder] Erro de voz:', err);
        }
      },
    });

    if (!started && voiceSessionIdRef.current === currentSessionId) {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      setVoiceState('IDLE');
    }
  };

  const handleStopVoice = async () => {
    voiceSessionIdRef.current += 1;
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    await stopVoiceRecording();
    setVoiceState('IDLE');
  };

  const handleStartLive = async () => {
    if (liveSessionRef.current) {
      if (liveState === 'paused') await liveSessionRef.current.resume();
      return;
    }
    const session = new GeminiLiveSession({
      onState: (state) => {
        setLiveState(state === 'ended' ? null : state);
        if (state === 'ended') liveSessionRef.current = null;
      },
      onTranscript: (role, text) =>
        setMessages((current) => [
          ...current,
          {
            id: `live_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            sender: role === 'user' ? 'user' : 'assistant',
            text,
            timestamp: new Date().toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            status: 'ACTIVE',
          },
        ]),
      onQuota: setLiveQuota,
      onError: (error) => Alert.alert('Gemini Live', error.message),
    });
    liveSessionRef.current = session;
    setLiveState('connecting');
    try {
      await session.start();
    } catch (error) {
      liveSessionRef.current = null;
      setLiveState(null);
      await session.end();
      Alert.alert(
        'Gemini Live',
        error instanceof Error ? error.message : 'Não foi possível iniciar a ligação.'
      );
    }
  };

  const handleToggleLivePause = () => {
    const session = liveSessionRef.current;
    if (!session) return;
    void (liveState === 'paused' ? session.resume() : session.pause()).catch((error) =>
      Alert.alert('Gemini Live', error.message)
    );
  };
  const handleToggleLiveMute = () => {
    void liveSessionRef.current?.toggleMute();
  };
  const handleEndLive = () => {
    void liveSessionRef.current?.end();
  };

  const handleCancelVoice = async () => {
    voiceSessionIdRef.current += 1;
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();

    await stopVoiceRecording();
    setVoiceState('IDLE');
    speechSessionTextRef.current = '';
    lastProcessedTextRef.current = '';
    setInputText('');
    setLivePill(null);
  };

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

  const handleSelectCandidate = (candidate: any) => {
    if (!pendingIntent) return;
    const updated = {
      ...pendingIntent,
      matchedAccount: candidate,
      supplier: candidate.counterparty || candidate.description,
      amount: candidate.amount,
      dueDate: candidate.due_date,
      isReadyForConfirmation: true,
      candidateAccounts: undefined,
      questionToUser: `Conta selecionada: ${candidate.counterparty || candidate.description} no valor de R$ ${Number(candidate.amount).toFixed(2)}.`,
    };
    setPendingIntent(updated);
  };

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
        onTransactionRegistered();
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
    handleConfirmRegisterSingle,
    latestTimelineAnchor,
    publishTimelineCard,
  };
}
