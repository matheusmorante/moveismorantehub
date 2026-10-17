import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getSettings, AppSettings, subscribeToSettings } from '@/pages/utils/settingsService';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import {
  agentSendFormSchema, agentResponseSchema, agentHistoryFormSchema,
  agentClearHistoryFormSchema, agentVoicePreferenceFormSchema,
} from '../../../../shared-utils/agentChatFormSchemas';
import { withTimeout } from '../../../../shared-utils/withTimeout';
import { useAuth } from '@/context/AuthContext';
import { GeminiAgentService } from '@/services/aiAgent/geminiAgentService';
import {
  ExecutedToolRecord,
  AgentPageContext,
} from '@/services/aiAgent/geminiAgentTypes';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  executedTools?: ExecutedToolRecord[];
}

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

  const getPageContext = (): AgentPageContext & { currentPath: string } => {
    const path = location.pathname;
    let currentModule = 'Geral';
    if (path.startsWith('/finance')) currentModule = 'Financeiro';
    else if (path.startsWith('/estoque') || path.startsWith('/inventory'))
      currentModule = 'Estoque';
    else if (path.startsWith('/orders') || path.startsWith('/pedidos'))
      currentModule = 'Vendas & Pedidos';
    else if (path.startsWith('/purchases') || path.startsWith('/compras'))
      currentModule = 'Compras';
    else if (path.startsWith('/customers') || path.startsWith('/clientes'))
      currentModule = 'Clientes';
    else if (path.startsWith('/deliveries') || path.startsWith('/logistica'))
      currentModule = 'Logística & Entregas';
    else if (path.startsWith('/catalog')) currentModule = 'Catálogo Digital';
    else if (path === '/' || path === '/dashboard') currentModule = 'Dashboard';

    const segments = path.split('/').filter(Boolean);
    const pageName = segments.length > 1 ? segments.slice(1).join('/') : segments[0] || 'Início';

    return {
      currentModule,
      currentPage: pageName,
      currentPath: path,
    };
  };

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
  const inputForm = useZodForm(agentSendFormSchema, { text: input, history: geminiHistory, pageContext: getPageContext() });
  const historyForm = useZodForm(agentHistoryFormSchema, { messages: [], history: [] });
  const clearForm = useZodForm(agentClearHistoryFormSchema, { intent: 'clear_history', confirmed: true, autoSpeak: isAutoSpeakEnabled });
  const preferenceForm = useZodForm(agentVoicePreferenceFormSchema, { enabled: isAutoSpeakEnabled });
  const scrollRef = useRef<HTMLDivElement>(null);
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
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, isOpen, isLoading]);

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
      await inputForm.validateAndRun({ text: originalInput, history: geminiHistory, pageContext: getPageContext() }, async parsed => {
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
    if (busyRef.current || !window.confirm('Deseja limpar o histórico da conversa com o assistente?')) return;
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

  const activePageContext = getPageContext();

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
          {/* Header */}
          <header className="p-4 sm:p-5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white flex items-center justify-between relative overflow-hidden shrink-0 shadow-md">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none"></div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center overflow-hidden shadow-lg">
                {aiAvatar ? (
                  <img src={aiAvatar} alt={aiName} className="w-full h-full object-cover" />
                ) : (
                  <i className="bi bi-robot text-2xl text-white"></i>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-base sm:text-lg tracking-tight leading-none text-white">
                    {aiName}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30">
                    Agente ERP
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
                  <span className="text-[10px] text-white/90 font-medium truncate max-w-[220px]">
                    Tela: {activePageContext.currentModule}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 relative z-10">
              <button
                onClick={toggleCallMode}
                disabled={isLoading}
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl transition-all flex items-center justify-center ${isCallMode ? 'bg-white text-red-600 shadow-lg' : 'bg-white/15 hover:bg-white/25 text-white'}`}
                title={isCallMode ? 'Desligar Chamada' : 'Iniciar Chamada de Voz'}
              >
                <i
                  className={`bi ${isCallMode ? 'bi-telephone-fill' : 'bi-telephone'} text-sm sm:text-base`}
                ></i>
              </button>
              <button
                onClick={handleClearHistory}
                disabled={isLoading}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all"
                title="Limpar histórico da conversa"
              >
                <i className="bi bi-trash3 text-sm sm:text-base"></i>
              </button>
              <button
                onClick={handleClose}
                data-testid="agent-drawer-close"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all"
                title="Fechar assistente"
              >
                <i className="bi bi-x-lg text-sm sm:text-base"></i>
              </button>
            </div>
          </header>

          {/* Messages Feed */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/30"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`flex gap-3 max-w-[92%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex flex-shrink-0 items-center justify-center overflow-hidden mt-1 shadow-sm">
                      {aiAvatar ? (
                        <img src={aiAvatar} alt={aiName} className="w-full h-full object-cover" />
                      ) : (
                        <i className="bi bi-robot text-indigo-600 dark:text-indigo-400 text-sm"></i>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    {/* Tool execution badges */}
                    {msg.executedTools && msg.executedTools.length > 0 && (
                      <div className="flex flex-col gap-1.5 mb-1">
                        {msg.executedTools.map((tool, tIdx) => (
                          <div
                            key={tIdx}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                              tool.success
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40'
                                : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40'
                            }`}
                          >
                            <i
                              className={`bi ${tool.success ? 'bi-check2-circle' : 'bi-exclamation-triangle-fill'}`}
                            ></i>
                            <span>{tool.label}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div
                      className={`px-5 py-3 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-200 dark:shadow-none font-medium'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-700 shadow-sm'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">
                        {msg.role === 'assistant'
                          ? msg.content.split(/(\*\*.*?\*\*)/).map((part, i) =>
                              part.startsWith('**') && part.endsWith('**') ? (
                                <strong
                                  key={i}
                                  className="font-black text-indigo-700 dark:text-indigo-400"
                                >
                                  {part.slice(2, -2)}
                                </strong>
                              ) : (
                                part
                              )
                            )
                          : msg.content}
                      </div>
                    </div>
                  </div>
                </div>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 px-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}

            {isLoading && (
              <div role="status" className="flex items-start gap-2 animate-pulse">
                <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">
                    Pensando e consultando ERP...
                  </span>
                </div>
              </div>
            )}
          </div>

          {error && <p role="alert" className="px-4 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
          {/* Input Footer */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                aria-label="Mensagem para o assistente"
                value={input}
                onChange={(e) => updateInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={
                  isListening ? 'Ouvindo você...' : 'Ex: Paguei 230 de gasolina hoje no Pix...'
                }
                className={`w-full pl-5 pr-20 py-3 bg-slate-100 dark:bg-slate-950 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-slate-200 ${
                  isListening ? 'ring-2 ring-red-500 animate-pulse' : ''
                }`}
              />
              <div className="absolute right-2 top-1.5 flex gap-1">
                <button
                  onClick={toggleListening}
                  disabled={isLoading}
                  className={`p-1.5 rounded-xl transition-all ${
                    isListening && !isCallMode
                      ? 'bg-red-500 text-white animate-bounce'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500 hover:text-indigo-600'
                  }`}
                  title="Falar"
                >
                  <i
                    className={`bi ${isListening && !isCallMode ? 'bi-mic-fill' : 'bi-mic'} text-sm`}
                  ></i>
                </button>
                <button
                  onClick={() => handleSendMessage()}
                  aria-label="Enviar mensagem"
                  disabled={!input.trim() || isLoading}
                  className="p-1.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  <i className="bi bi-send-fill text-sm"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Modo Floating (Janela Flutuante para retrocompatibilidade)
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-6">
      {isOpen && (
        <div className="w-[440px] h-[660px] glass-card rounded-[3rem] shadow-premium-lg flex flex-col overflow-hidden animate-reveal border border-white/40 dark:border-slate-800/40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
          {/* Header */}
          <header className="p-6 bg-gradient-to-br from-indigo-600 via-indigo-500 to-blue-600 text-white flex items-center justify-between relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center overflow-hidden shadow-lg">
                {aiAvatar ? (
                  <img src={aiAvatar} alt={aiName} className="w-full h-full object-cover" />
                ) : (
                  <i className="bi bi-robot text-2xl"></i>
                )}
              </div>
              <div>
                <h4 className="font-black text-lg tracking-tight leading-none mb-1">{aiName}</h4>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
                  <span className="text-[9px] uppercase font-black tracking-widest text-white/80">
                    Agente do ERP
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 relative z-10">
              <button
                onClick={toggleCallMode}
                disabled={isLoading}
                className={`w-9 h-9 rounded-xl transition-all flex items-center justify-center ${isCallMode ? 'bg-white text-red-600 shadow-lg' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                title={isCallMode ? 'Desligar Chamada' : 'Iniciar Chamada de Voz'}
              >
                <i
                  className={`bi ${isCallMode ? 'bi-telephone-fill' : 'bi-telephone'} text-base`}
                ></i>
              </button>
              <button onClick={handleClearHistory} disabled={isLoading} title="Limpar histórico da conversa" className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white"><i className="bi bi-trash3" /></button>
              <button
                onClick={handleClose}
                title="Fechar assistente"
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              >
                <i className="bi bi-dash-lg text-lg"></i>
              </button>
            </div>
          </header>

          {/* Messages Feed */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/30"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`flex gap-3 max-w-[92%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex flex-shrink-0 items-center justify-center overflow-hidden mt-1 shadow-sm">
                      {aiAvatar ? (
                        <img src={aiAvatar} alt={aiName} className="w-full h-full object-cover" />
                      ) : (
                        <i className="bi bi-robot text-indigo-600 dark:text-indigo-400 text-sm"></i>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    {/* Tool execution badges */}
                    {msg.executedTools && msg.executedTools.length > 0 && (
                      <div className="flex flex-col gap-1.5 mb-1">
                        {msg.executedTools.map((tool, tIdx) => (
                          <div
                            key={tIdx}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                              tool.success
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40'
                                : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40'
                            }`}
                          >
                            <i
                              className={`bi ${tool.success ? 'bi-check2-circle' : 'bi-exclamation-triangle-fill'}`}
                            ></i>
                            <span>{tool.label}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div
                      className={`px-5 py-3 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-200 dark:shadow-none font-medium'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-700 shadow-sm'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">
                        {msg.role === 'assistant'
                          ? msg.content.split(/(\*\*.*?\*\*)/).map((part, i) =>
                              part.startsWith('**') && part.endsWith('**') ? (
                                <strong
                                  key={i}
                                  className="font-black text-indigo-700 dark:text-indigo-400"
                                >
                                  {part.slice(2, -2)}
                                </strong>
                              ) : (
                                part
                              )
                            )
                          : msg.content}
                      </div>
                    </div>
                  </div>
                </div>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 px-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}

            {isLoading && (
              <div role="status" className="flex items-start gap-2 animate-pulse">
                <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">
                    Pensando e consultando ERP...
                  </span>
                </div>
              </div>
            )}
          </div>

          {error && <p role="alert" className="px-4 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
          {/* Input Footer */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                aria-label="Mensagem para o assistente"
                value={input}
                onChange={(e) => updateInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={
                  isListening ? 'Ouvindo você...' : 'Ex: Paguei 230 de gasolina hoje no Pix...'
                }
                className={`w-full pl-5 pr-20 py-3 bg-slate-100 dark:bg-slate-950 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-slate-200 ${
                  isListening ? 'ring-2 ring-red-500 animate-pulse' : ''
                }`}
              />
              <div className="absolute right-2 top-1.5 flex gap-1">
                <button
                  onClick={toggleListening}
                  disabled={isLoading}
                  className={`p-1.5 rounded-xl transition-all ${
                    isListening && !isCallMode
                      ? 'bg-red-500 text-white animate-bounce'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500 hover:text-indigo-600'
                  }`}
                  title="Falar"
                >
                  <i
                    className={`bi ${isListening && !isCallMode ? 'bi-mic-fill' : 'bi-mic'} text-sm`}
                  ></i>
                </button>
                <button
                  onClick={() => handleSendMessage()}
                  aria-label="Enviar mensagem"
                  disabled={!input.trim() || isLoading}
                  className="p-1.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  <i className="bi bi-send-fill text-sm"></i>
                </button>
              </div>
            </div>
          </div>
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
