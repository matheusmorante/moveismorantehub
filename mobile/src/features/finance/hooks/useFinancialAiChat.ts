import { useState, useRef, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { flattenFormErrors, useZodForm } from '../../../hooks/useZodForm';
import { financialCandidateSelectionFormSchema, financialPreparedIntentFormSchema } from '../../../../../shared-utils/financialFormSchemas';
import { ScrollView, Alert } from 'react-native';
import {
  FinancialCategory,
  createFinancialTransaction,
  confirmFinancialDraft,
} from '../../../services/mobileFinanceService';
import {
  ChatMessage,
  ParsedFinancialIntent,
} from '../../../services/financialAiAssistantService';
import { MobileAgentService } from '../../../services/aiAgent/mobileAgentService';
import { GeminiContent, ExecutedToolRecord } from '../../../services/aiAgent/mobileAgentTypes';
import type { CardVisualState } from '../types/CardVisualState';
import {
  appendFinancialTimelineCard,
  updateFinancialTimelineCardState,
} from '../components/chat/financialCardTimeline';
import type { FinancialCardTimelineEntry } from '../components/chat/financialCardTimeline';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import { financialChatUtilityFormSchema } from '../../../../../shared-utils/financialVoiceFormSchemas';
import { advanceFinancialBatch, rebuildFinancialBatch } from '../../../services/financial/financialBatchQueue';
import { confirmationFormSchema, messageFormSchema, singleTransactionFormSchema } from './financialAiChatSchemas';
import { useFinancialAiVoiceSession } from './useFinancialAiVoiceSession';

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
  const utilityForm = useZodForm(financialChatUtilityFormSchema, { intent: 'clear_chat', messageIds: [], cardIds: [], inputText: '', editText: '' });
  const utilityPending = useRef<object | null>(null);
  const [utilityBusy, setUtilityBusy] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
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

  const scrollViewRef = useRef<ScrollView>(null);
  const geminiHistoryRef = useRef<GeminiContent[]>([]);
  const mountedRef = useRef(true);
  const scopeRef = useRef({ userName, revision: 0 });
  if (scopeRef.current.userName !== userName) scopeRef.current = { userName, revision: scopeRef.current.revision + 1 };
  const operationRef = useRef<object | null>(null);
  const mediaControlBusy = useRef(false);
  const uncertainWrites = useRef(new Set<string>());
  const confirmedWrites = useRef(new Set<string>());
  const completedBatchCounts = useRef(new Map<string, number>());
  const latest = useRef({ inputText, editText, pendingIntent, timelineCards, messages, editingMessageId });
  latest.current = { inputText, editText, pendingIntent, timelineCards, messages, editingMessageId };

  const abortControllerRef = useRef<AbortController | null>(null);
  const abortActiveRequest = useCallback(() => { abortControllerRef.current?.abort(); }, []);

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
        voice.clearSession();
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
        geminiHistoryRef.current = [];
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

  const voice = useFinancialAiVoiceSession({
    userName,
    mountedRef,
    scopeRef,
    operationRef,
    mediaControlBusy,
    latestInputText: () => latest.current.inputText,
    setInputText,
    setMessages,
    setMediaBusy,
    runMediaOperation: action => runOperation('media', action),
    publishPreparedTransactionCard,
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      scopeRef.current.revision += 1;
      voice.disposeMedia();
      abortActiveRequest();
    };
  }, [voice.disposeMedia, abortActiveRequest]);

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
        voice.clearLivePill();
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
    voiceState: voice.voiceState,
    livePill: voice.livePill,
    liveState: voice.liveState,
    liveQuota: voice.liveQuota,
    mediaBusy, mediaError: voice.mediaError, utilityBusy,
    isRecordingActive: voice.isRecordingActive,
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
    handleStartVoice: voice.handleStartVoice,
    handleStartLive: voice.handleStartLive,
    handleToggleLivePause: voice.handleToggleLivePause,
    handleToggleLiveMute: voice.handleToggleLiveMute,
    handleEndLive: voice.handleEndLive,
    handleStopVoice: voice.handleStopVoice,
    handleCancelVoice: voice.handleCancelVoice,
    handleConfirmRegister,
    handleConfirmTimelineCard,
    handleSelectCandidate,
    handleSelectTimelineCandidate,
    handleConfirmRegisterSingle,
    latestTimelineAnchor,
    publishTimelineCard,
  };
}
