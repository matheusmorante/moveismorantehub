import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getSettings, AppSettings, subscribeToSettings } from '@/pages/utils/settingsService';
import { toast } from 'react-toastify';
import { requestConfirmation } from '@/components/shared/confirmationService';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import {
  agentSendFormSchema, agentResponseSchema, agentHistoryFormSchema,
  agentClearHistoryFormSchema, agentVoicePreferenceFormSchema,
} from '../../../../shared-utils/agentChatFormSchemas';
import { withTimeout } from '../../../../shared-utils/withTimeout';
import { useAuth } from '@/context/AuthContext';
import { GeminiAgentService } from '@/services/aiAgent/geminiAgentService';
import { getAgentPageContext } from '@/services/aiAgent/getAgentPageContext';
import { AIChatAssistantHeader } from './AIChatAssistantHeader';
import { AIChatAssistantInputFooter } from './AIChatAssistantInputFooter';
import { AIChatAssistantMessages, type ChatMessage } from './AIChatAssistantMessages';

export interface AIChatAssistantProps {
  isFloating?: boolean;
  forceOpen?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  mode?: 'drawer' | 'floating';
}

const STORAGE_KEY = 'lisandro_chat_history_v2';
const HISTORY_RAW_KEY = 'lisandro_gemini_raw_history_v2';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function AIChatAssistant({
  isFloating = false,
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  mode = 'drawer',
}: AIChatAssistantProps) {
  const location = useLocation();
  const { user } = useAuth();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleClose = () => {
    requestRef.current?.controller.abort();
    stopVoice();
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  useEffect(() => {
    const handleGlobalOpen = () => {
      setInternalIsOpen(true);
    };
    window.addEventListener('morante:open-agent', handleGlobalOpen);
    return () => window.removeEventListener('morante:open-agent', handleGlobalOpen);
  }, []);

  const [settings, setSettings] = useState<AppSettings>(getSettings());

  useEffect(() => {
    const unsubscribe = subscribeToSettings((newSettings) => setSettings(newSettings));
    return () => unsubscribe();
  }, []);

  const aiName = settings.aiPrompts?.aiName || 'Seu Lizandro';
  const aiAvatar = settings.aiPrompts?.aiAvatar || '/lizandro.png';

  const initialMessage = (): ChatMessage => ({
    id: 'init', role: 'assistant',
    content: `Olá! Sou ${aiName}, seu Agente Inteligente do ERP. Posso lançar despesas, receitas, consultar o fluxo de caixa ou tirar dúvidas do sistema. Como posso te ajudar hoje?`,
    timestamp: new Date(),
  });
  const [initialCache] = useState(() => {
    try {
      const messages = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const history = JSON.parse(localStorage.getItem(HISTORY_RAW_KEY) || '[]');
      const parsed = agentHistoryFormSchema.parse({ messages, history });
      const preference = localStorage.getItem('lisandro_auto_speak');
      if (preference !== null && preference !== 'true' && preference !== 'false') throw new Error('Preferência de voz inválida.');
      const recent = parsed.messages.filter(m => Date.now() - new Date(m.timestamp).getTime() < SEVEN_DAYS_MS);
      return { messages: recent.length ? recent.map(m => ({ ...m, timestamp: new Date(m.timestamp) })) : [initialMessage()], history: parsed.history, enabled: preference === 'true', error: '' };
    } catch {
      return { messages: [initialMessage()], history: [], enabled: false, error: 'Não foi possível ler o histórico ou a preferência de voz. A conversa fica nesta sessão; limpe o histórico para tentar recuperar a gravação local.' };
    }
  });
  const [messages, setMessages] = useState<ChatMessage[]>(initialCache.messages);
  const [geminiHistory, setGeminiHistory] = useState(initialCache.history);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isCallMode, setIsCallMode] = useState(false);
  const [isAutoSpeakEnabled, setIsAutoSpeakEnabled] = useState(initialCache.enabled);
  const [error, setError] = useState(initialCache.error);
  const inputForm = useZodForm(agentSendFormSchema, { text: input, history: geminiHistory, pageContext: getAgentPageContext(location.pathname) });
  const historyForm = useZodForm(agentHistoryFormSchema, { messages: [], history: [] });
  const clearForm = useZodForm(agentClearHistoryFormSchema, { intent: 'clear_history', confirmed: true, autoSpeak: isAutoSpeakEnabled });
  const preferenceForm = useZodForm(agentVoicePreferenceFormSchema, { enabled: isAutoSpeakEnabled });
  const recognitionRef = useRef<any>(null);
  const speechRef = useRef<{ utterance: SpeechSynthesisUtterance; timer: ReturnType<typeof setTimeout> } | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);
  const cacheAvailableRef = useRef(!initialCache.error);
  const uncertainTextsRef = useRef(new Set<string>());
  const requestRef = useRef<{ controller: AbortController; scope: string } | null>(null);
  const scope = JSON.stringify([user?.id, location.pathname, isOpen]);
  const scopeRef = useRef(scope); scopeRef.current = scope;
  const inputRef = useRef(input); inputRef.current = input;
  const callModeRef = useRef(isCallMode); callModeRef.current = isCallMode;
  const sendRef = useRef<(text?: string) => Promise<unknown>>(async () => {});
  const updateInput = (value: string) => { inputRef.current = value; setInput(value); };
  const updateCallMode = (value: boolean) => { callModeRef.current = value; setIsCallMode(value); };
  const showError = (message: string) => { if (mountedRef.current) { setError(message); toast.error(message); } };
  const validationError = (errors: Parameters<typeof flattenFormErrors>[0]) => showError(Object.values(flattenFormErrors(errors))[0] || 'Confira os dados da conversa.');
  const stopVoice = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = null;
    updateCallMode(false);
    if (speechRef.current) clearTimeout(speechRef.current.timer);
    speechRef.current = null;
    recognitionRef.current?.stop();
    setIsListening(false);
    window.speechSynthesis?.cancel();
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; requestRef.current?.controller.abort(); };
  }, []);
  useEffect(() => {
    const currentScope = scope;
    return () => {
      if (requestRef.current?.scope === currentScope) requestRef.current.controller.abort();
      if (speechRef.current) clearTimeout(speechRef.current.timer);
      speechRef.current = null;
      window.speechSynthesis?.cancel();
    };
  }, [scope]);

  // Recognition callbacks always read the current draft/send handler. Cleanup owns
  // the recognizer and the silence timer; no effects inside React state updaters.
  useEffect(() => {
    if (!isOpen) return;
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.continuous = true; recognition.lang = 'pt-BR'; recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      if (busyRef.current || speechRef.current) return;
      window.speechSynthesis?.cancel();
      let text = inputRef.current;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) text = (text + ' ' + event.results[i][0].transcript).trim();
      }
      inputRef.current = text; setInput(text);
      if (callModeRef.current && text) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => { void sendRef.current(inputRef.current); }, 1200);
      }
    };
    recognition.onstart = () => { setIsListening(true); window.speechSynthesis?.cancel(); };
    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') return;
      callModeRef.current = false; setIsCallMode(false); setIsListening(false);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      setError('Erro no microfone ou reconhecimento de voz.');
    };
    recognition.onend = () => {
      setIsListening(false);
      if (callModeRef.current && !busyRef.current && !speechRef.current) {
        try { recognition.start(); } catch { callModeRef.current = false; setIsCallMode(false); setError('Não foi possível retomar o microfone.'); }
      }
    };
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      recognition.onresult = recognition.onstart = recognition.onerror = recognition.onend = null;
      recognition.abort?.(); recognition.stop(); recognitionRef.current = null;
      callModeRef.current = false; setIsCallMode(false); setIsListening(false);
      window.speechSynthesis?.cancel();
    };
  }, [isOpen, location.pathname, user?.id]);

  const toggleListening = () => {
    if (busyRef.current) return;
    if (isListening) { stopVoice(); return; }
    if (!recognitionRef.current) { showError('Reconhecimento de voz não suportado neste navegador.'); return; }
    try { recognitionRef.current.start(); } catch { showError('Não foi possível iniciar o microfone.'); }
  };
  const toggleCallMode = async () => {
    if (busyRef.current) return;
    if (isCallMode) { stopVoice(); return; }
    if (!recognitionRef.current) { showError('Reconhecimento de voz não suportado neste navegador.'); return; }
    busyRef.current = true;
    const preferenceScope = scopeRef.current;
    try {
      await preferenceForm.validateAndRun({ enabled: true }, ({ enabled }) => {
        if (scopeRef.current !== preferenceScope || !mountedRef.current) return false;
        localStorage.setItem('lisandro_auto_speak', String(enabled));
        if (localStorage.getItem('lisandro_auto_speak') !== String(enabled)) throw new Error('Preferência de voz não confirmada.');
        setIsAutoSpeakEnabled(enabled); updateCallMode(true);
        if (!isListening) recognitionRef.current?.start();
        return true;
      }, validationError);
    } catch { updateCallMode(false); setIsListening(false); showError('Não foi possível salvar a preferência de voz ou iniciar o microfone.'); }
    finally { busyRef.current = false; }
  };
  const speak = (text: string) => {
    if (!isAutoSpeakEnabled || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/[*#_`]/g, '').trim());
      utterance.lang = 'pt-BR'; utterance.rate = 1.3; utterance.pitch = 0.9;
      const naturalVoice = window.speechSynthesis.getVoices().find(v => v.lang.includes('pt-BR') && (v.name.includes('Daniel') || v.name.includes('Google')));
      if (naturalVoice) utterance.voice = naturalVoice;
      const speakingScope = scopeRef.current;
      const finish = (failed = false) => {
        if (speechRef.current?.utterance !== utterance) return;
        clearTimeout(speechRef.current.timer); speechRef.current = null;
        if (!mountedRef.current || scopeRef.current !== speakingScope) return;
        if (failed) { updateCallMode(false); showError('Resposta recebida, mas a reprodução de voz foi interrompida.'); return; }
        if (callModeRef.current && !busyRef.current) {
          try { recognitionRef.current?.start(); } catch { updateCallMode(false); showError('Não foi possível retomar o microfone.'); }
        }
      };
      utterance.onend = () => finish(); utterance.onerror = () => finish(true);
      speechRef.current = { utterance, timer: setTimeout(() => { finish(true); window.speechSynthesis?.cancel(); }, 60_000) };
      window.speechSynthesis.speak(utterance);
    } catch {
      if (speechRef.current) clearTimeout(speechRef.current.timer);
      speechRef.current = null; updateCallMode(false);
      showError('Resposta recebida, mas não foi possível reproduzir a voz.');
    }
  };
  const persistHistory = async (nextMessages: ChatMessage[], history: typeof geminiHistory, isCurrent: () => boolean) => {
    if (!cacheAvailableRef.current) return;
    try {
      await historyForm.validateAndRun({ messages: nextMessages.map(m => ({ ...m, timestamp: m.timestamp.toISOString() })), history }, parsed => {
        if (!isCurrent()) return false;
        const messagesJson = JSON.stringify(parsed.messages); const historyJson = JSON.stringify(parsed.history);
        localStorage.setItem(STORAGE_KEY, messagesJson); localStorage.setItem(HISTORY_RAW_KEY, historyJson);
        if (localStorage.getItem(STORAGE_KEY) !== messagesJson || localStorage.getItem(HISTORY_RAW_KEY) !== historyJson) throw new Error('Histórico não confirmado.');
        return true;
      }, validationError);
    } catch {
      cacheAvailableRef.current = false;
      showError('Resposta recebida. Não foi possível gravar o histórico local; a conversa permanece nesta sessão. Limpe o histórico para recuperar a gravação.');
    }
  };
  const handleSendMessage = async (textToSend?: string) => {
    if (busyRef.current || !isOpen) return;
    if (!user?.id) { showError('Entre na sua conta antes de consultar o assistente.'); return; }
    const originalInput = textToSend ?? inputRef.current;
    const fingerprint = originalInput.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
    if (uncertainTextsRef.current.has(fingerprint)) { showError('Esta mensagem tem uma ação sem confirmação. Confira o resultado no ERP antes de repetir.'); return; }
    busyRef.current = true; setIsLoading(true);
    if (cacheAvailableRef.current) setError('');
    const request = { controller: new AbortController(), scope: scopeRef.current };
    requestRef.current = request;
    const isCurrent = () => mountedRef.current && scopeRef.current === request.scope && !request.controller.signal.aborted;
    let toolDispatched = false;
    let success = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    recognitionRef.current?.stop(); setIsListening(false);
    try {
      await inputForm.validateAndRun({ text: originalInput, history: geminiHistory, pageContext: getAgentPageContext(location.pathname) }, async parsed => {
        if (!isCurrent()) return false;
        const nextMessages: ChatMessage[] = [...messages, { id: crypto.randomUUID(), role: 'user', content: parsed.text, timestamp: new Date() }];
        setMessages(nextMessages);
        const expired = Symbol('expired');
        const rawResponse = await withTimeout<unknown>(GeminiAgentService.sendMessage(parsed.text, parsed.history, parsed.pageContext, {
          signal: request.controller.signal, isCurrent, onToolDispatch: () => { toolDispatched = true; },
        }), 90_000, expired, 'conversa do assistente');
        if (rawResponse === expired) {
          request.controller.abort();
          throw Object.assign(new Error('O assistente excedeu o prazo. Confira o resultado das ações iniciadas antes de repetir.'), { knownFailure: !toolDispatched });
        }
        if (!isCurrent()) throw Object.assign(new Error('Conversa interrompida. Confira o resultado das ações iniciadas antes de repetir.'), { knownFailure: !toolDispatched });
        const receipt = agentResponseSchema.safeParse(rawResponse);
        if (!receipt.success) throw new Error('A resposta do assistente não pôde ser confirmada.');
        const response = receipt.data;
        const completed: ChatMessage[] = [...nextMessages, { id: crypto.randomUUID(), role: 'assistant', content: response.result.answer, timestamp: new Date(), executedTools: response.result.executedTools }];
        setGeminiHistory(response.updatedHistory); setMessages(completed);
        if (inputRef.current === originalInput) updateInput('');
        success = true;
        await persistHistory(completed, response.updatedHistory, isCurrent);
        if (isCurrent()) speak(response.result.answer);
        return true;
      }, validationError);
    } catch (failure) {
      request.controller.abort();
      const knownFailure = failure instanceof Error && 'knownFailure' in failure && failure.knownFailure === true;
      if (!knownFailure) uncertainTextsRef.current.add(fingerprint);
      if (mountedRef.current) {
        updateCallMode(false);
        const message = failure instanceof Error ? failure.message : 'Não foi possível confirmar a resposta do assistente.';
        showError(knownFailure ? message : `${message} Confira o resultado das ações no ERP antes de repetir esta mensagem.`);
      }
    } finally {
      if (requestRef.current === request) requestRef.current = null;
      busyRef.current = false;
      if (mountedRef.current) {
        setIsLoading(false);
        if (success && isCurrent() && callModeRef.current && !speechRef.current) {
          try { recognitionRef.current?.start(); } catch { updateCallMode(false); showError('Não foi possível retomar o microfone.'); }
        }
      }
    }
  };
  sendRef.current = handleSendMessage;

  const handleClearHistory = async () => {
    if (busyRef.current || !await requestConfirmation({
      title: 'Limpar histórico da conversa?',
      message: 'Deseja limpar o histórico da conversa com o assistente?',
      confirmLabel: 'Limpar histórico',
      type: 'warning',
    })) return;
    busyRef.current = true; setIsLoading(true);
    const clearScope = scopeRef.current;
    try {
      await clearForm.validateAndRun({ intent: 'clear_history', confirmed: true, autoSpeak: isAutoSpeakEnabled }, ({ autoSpeak }) => {
        if (!mountedRef.current || scopeRef.current !== clearScope) return false;
        localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(HISTORY_RAW_KEY);
        localStorage.setItem('lisandro_auto_speak', String(autoSpeak));
        if (localStorage.getItem(STORAGE_KEY) !== null || localStorage.getItem(HISTORY_RAW_KEY) !== null || localStorage.getItem('lisandro_auto_speak') !== String(autoSpeak)) throw new Error('Limpeza não confirmada.');
        stopVoice(); setMessages([initialMessage()]); setGeminiHistory([]);
        cacheAvailableRef.current = true; setError('');
        return true;
      }, validationError);
    } catch { cacheAvailableRef.current = false; showError('Não foi possível confirmar a limpeza do histórico local. A conversa foi preservada.'); }
    finally { busyRef.current = false; if (mountedRef.current) setIsLoading(false); }
  };

  const activePageContext = getAgentPageContext(location.pathname);

  // Modo Drawer Lateral Global (Slide-over panel)
  if (mode === 'drawer') {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-[99999] flex justify-end" data-testid="agent-drawer-root">
        {/* Backdrop escuro e suave */}
        <div
          onClick={handleClose}
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity"
        />

        {/* Painel do Drawer */}
        <div className="relative w-full sm:w-[480px] md:w-[520px] h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-10">
          <AIChatAssistantHeader
            variant="drawer"
            aiAvatar={aiAvatar}
            aiName={aiName}
            currentModule={activePageContext.currentModule}
            isCallMode={isCallMode}
            isLoading={isLoading}
            onToggleCallMode={toggleCallMode}
            onClearHistory={handleClearHistory}
            onClose={handleClose}
          />

          <AIChatAssistantMessages
            messages={messages}
            aiAvatar={aiAvatar}
            aiName={aiName}
            isLoading={isLoading}
            isOpen={isOpen}
            mode={mode}
          />

          {error && <p role="alert" className="px-4 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
          {/* Input Footer */}
          <AIChatAssistantInputFooter
            input={input}
            isListening={isListening}
            isCallMode={isCallMode}
            isLoading={isLoading}
            onInputChange={updateInput}
            onSubmit={() => { void handleSendMessage(); }}
            onToggleListening={toggleListening}
          />
        </div>
      </div>
    );
  }

  // Modo Floating (Janela Flutuante para retrocompatibilidade)
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-6">
      {isOpen && (
        <div className="w-[440px] h-[660px] glass-card rounded-[3rem] shadow-premium-lg flex flex-col overflow-hidden animate-reveal border border-white/40 dark:border-slate-800/40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
          <AIChatAssistantHeader
            variant="floating"
            aiAvatar={aiAvatar}
            aiName={aiName}
            isCallMode={isCallMode}
            isLoading={isLoading}
            onToggleCallMode={toggleCallMode}
            onClearHistory={handleClearHistory}
            onClose={handleClose}
          />

          <AIChatAssistantMessages
            messages={messages}
            aiAvatar={aiAvatar}
            aiName={aiName}
            isLoading={isLoading}
            isOpen={isOpen}
            mode={mode}
          />

          {error && <p role="alert" className="px-4 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
          {/* Input Footer */}
          <AIChatAssistantInputFooter
            input={input}
            isListening={isListening}
            isCallMode={isCallMode}
            isLoading={isLoading}
            onInputChange={updateInput}
            onSubmit={() => { void handleSendMessage(); }}
            onToggleListening={toggleListening}
          />
        </div>
      )}

      {isFloating && (
        <button
          onClick={() => isOpen ? handleClose() : setInternalIsOpen(true)}
          className={`w-16 h-16 rounded-[2rem] flex items-center justify-center text-white shadow-2xl transition-all hover:scale-110 active:scale-95 overflow-hidden ${
            isOpen
              ? 'bg-slate-800 dark:bg-slate-700 rotate-90'
              : 'bg-indigo-600 shadow-indigo-300 dark:shadow-none'
          }`}
        >
          {isOpen ? (
            <i className="bi bi-x-lg text-2xl"></i>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              {aiAvatar ? (
                <img src={aiAvatar} alt={aiName} className="w-full h-full object-cover" />
              ) : (
                <i className="bi bi-robot text-3xl"></i>
              )}
              <span className="absolute top-3 right-3 w-3 h-3 bg-emerald-400 border-2 border-indigo-600 rounded-full z-10"></span>
            </div>
          )}
        </button>
      )}
    </div>
  );
}
