import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getSettings, AppSettings, subscribeToSettings } from '@/pages/utils/settingsService';
import { toast } from 'react-toastify';
import { GeminiAgentService } from '@/services/aiAgent/geminiAgentService';
import { GeminiContent, ExecutedToolRecord, AgentPageContext } from '@/services/aiAgent/geminiAgentTypes';

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
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleClose = () => {
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

  const getPageContext = (): AgentPageContext => {
    const path = location.pathname;
    let currentModule = 'Geral';
    if (path.startsWith('/finance')) currentModule = 'Financeiro';
    else if (path.startsWith('/stock') || path.startsWith('/inventory')) currentModule = 'Estoque';
    else if (path.startsWith('/orders') || path.startsWith('/pedidos')) currentModule = 'Vendas & Pedidos';
    else if (path.startsWith('/purchases') || path.startsWith('/compras')) currentModule = 'Compras';
    else if (path.startsWith('/customers') || path.startsWith('/clientes')) currentModule = 'Clientes';
    else if (path.startsWith('/deliveries') || path.startsWith('/logistica')) currentModule = 'Logística & Entregas';
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
    const unsubscribe = subscribeToSettings(newSettings => setSettings(newSettings));
    return () => unsubscribe();
  }, []);

  const aiName = settings.aiPrompts?.aiName || 'Lisandro';
  const aiAvatar = settings.aiPrompts?.aiAvatar || '';

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const initial: ChatMessage = {
      id: 'init',
      role: 'assistant',
      content: `Olá! Sou ${aiName}, seu Agente Inteligente do ERP. Posso lançar despesas, receitas, consultar o fluxo de caixa ou tirar dúvidas do sistema. Como posso te ajudar hoje?`,
      timestamp: new Date(),
    };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const now = Date.now();
        const recent = parsed
          .filter((m: any) => now - new Date(m.timestamp).getTime() < SEVEN_DAYS_MS)
          .map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
        return recent.length > 0 ? recent : [initial];
      } catch {
        return [initial];
      }
    }
    return [initial];
  });

  const [geminiHistory, setGeminiHistory] = useState<GeminiContent[]>(() => {
    const saved = localStorage.getItem(HISTORY_RAW_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch { return []; }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(HISTORY_RAW_KEY, JSON.stringify(geminiHistory));
  }, [geminiHistory]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isCallMode, setIsCallMode] = useState(false);
  const [isAutoSpeakEnabled, setIsAutoSpeakEnabled] = useState(() => localStorage.getItem('lisandro_auto_speak') === 'true');

  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('lisandro_auto_speak', String(isAutoSpeakEnabled));
  }, [isAutoSpeakEnabled]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.lang = 'pt-BR';
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        window.speechSynthesis?.cancel();
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const transcript = event.results[i][0].transcript;
            setInput(prev => {
              const newText = (prev + ' ' + transcript).trim();
              if (isCallMode) {
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = setTimeout(() => handleSendMessage(newText), 1200);
              }
              return newText;
            });
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
      };

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        window.speechSynthesis?.cancel();
      };

      recognitionRef.current.onerror = (event: any) => {
        if (event.error === 'no-speech') return;
        setIsListening(false);
        setIsCallMode(false);
        toast.error('Erro no microfone ou reconhecimento de voz.');
      };

      recognitionRef.current.onend = () => {
        if (isCallMode) {
          try { recognitionRef.current.start(); } catch {}
        } else {
          setIsListening(false);
        }
      };
    }
  }, [isCallMode]);

  const toggleListening = () => {
    if (isListening) {
      setIsCallMode(false);
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (!recognitionRef.current) {
        toast.error('Reconhecimento de voz não suportado neste navegador.');
        return;
      }
      recognitionRef.current.start();
    }
  };

  const toggleCallMode = () => {
    if (isCallMode) {
      setIsCallMode(false);
      recognitionRef.current?.stop();
    } else {
      setIsCallMode(true);
      setIsAutoSpeakEnabled(true);
      if (!isListening) recognitionRef.current?.start();
    }
  };

  const speak = (text: string) => {
    if (!isAutoSpeakEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_`]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.3;
    utterance.pitch = 0.9;

    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => v.lang.includes('pt-BR') && (v.name.includes('Daniel') || v.name.includes('Google')));
    if (naturalVoice) utterance.voice = naturalVoice;

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    const pageCtx = getPageContext();

    try {
      const response = await GeminiAgentService.sendMessage(text, geminiHistory, pageCtx);
      setGeminiHistory(response.updatedHistory);

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: response.result.answer,
        timestamp: new Date(),
        executedTools: response.result.executedTools,
      };

      setMessages(prev => [...prev, assistantMsg]);
      speak(response.result.answer);
    } catch (err: any) {
      console.error('Erro no assistente Gemini:', err);
      const errMsg = err?.message || 'Erro ao processar mensagem com a IA.';
      toast.error(errMsg);
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `Desculpe, ocorreu um erro: ${errMsg}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Deseja limpar o histórico da conversa com o assistente?')) {
      const initial: ChatMessage = {
        id: 'init',
        role: 'assistant',
        content: `Olá! Sou ${aiName}, seu Agente Inteligente do ERP. Posso lançar despesas, receitas, consultar o fluxo de caixa ou tirar dúvidas do sistema. Como posso te ajudar hoje?`,
        timestamp: new Date(),
      };
      setMessages([initial]);
      setGeminiHistory([]);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(HISTORY_RAW_KEY);
    }
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
                  <h4 className="font-black text-base sm:text-lg tracking-tight leading-none text-white">{aiName}</h4>
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
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl transition-all flex items-center justify-center ${isCallMode ? 'bg-white text-red-600 shadow-lg' : 'bg-white/15 hover:bg-white/25 text-white'}`}
                title={isCallMode ? 'Desligar Chamada' : 'Iniciar Chamada de Voz'}
              >
                <i className={`bi ${isCallMode ? 'bi-telephone-fill' : 'bi-telephone'} text-sm sm:text-base`}></i>
              </button>
              <button
                onClick={handleClearHistory}
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
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/30">
            {messages.map(msg => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`flex gap-3 max-w-[92%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
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
                            <i className={`bi ${tool.success ? 'bi-check2-circle' : 'bi-exclamation-triangle-fill'}`}></i>
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
                                <strong key={i} className="font-black text-indigo-700 dark:text-indigo-400">
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
              <div className="flex items-start gap-2 animate-pulse">
                <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">Pensando e consultando ERP...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Footer */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder={isListening ? 'Ouvindo você...' : 'Ex: Paguei 230 de gasolina hoje no Pix...'}
                className={`w-full pl-5 pr-20 py-3 bg-slate-100 dark:bg-slate-950 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-slate-200 ${
                  isListening ? 'ring-2 ring-red-500 animate-pulse' : ''
                }`}
              />
              <div className="absolute right-2 top-1.5 flex gap-1">
                <button
                  onClick={toggleListening}
                  className={`p-1.5 rounded-xl transition-all ${
                    isListening && !isCallMode
                      ? 'bg-red-500 text-white animate-bounce'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500 hover:text-indigo-600'
                  }`}
                  title="Falar"
                >
                  <i className={`bi ${isListening && !isCallMode ? 'bi-mic-fill' : 'bi-mic'} text-sm`}></i>
                </button>
                <button
                  onClick={() => handleSendMessage()}
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
                  <span className="text-[9px] uppercase font-black tracking-widest text-white/80">Agente do ERP</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 relative z-10">
              <button
                onClick={toggleCallMode}
                className={`w-9 h-9 rounded-xl transition-all flex items-center justify-center ${isCallMode ? 'bg-white text-red-600 shadow-lg' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                title={isCallMode ? 'Desligar Chamada' : 'Iniciar Chamada de Voz'}
              >
                <i className={`bi ${isCallMode ? 'bi-telephone-fill' : 'bi-telephone'} text-base`}></i>
              </button>
              <button
                onClick={handleClose}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              >
                <i className="bi bi-dash-lg text-lg"></i>
              </button>
            </div>
          </header>

          {/* Messages Feed */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/30">
            {messages.map(msg => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`flex gap-3 max-w-[92%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
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
                            <i className={`bi ${tool.success ? 'bi-check2-circle' : 'bi-exclamation-triangle-fill'}`}></i>
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
                                <strong key={i} className="font-black text-indigo-700 dark:text-indigo-400">
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
              <div className="flex items-start gap-2 animate-pulse">
                <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">Pensando e consultando ERP...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Footer */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder={isListening ? 'Ouvindo você...' : 'Ex: Paguei 230 de gasolina hoje no Pix...'}
                className={`w-full pl-5 pr-20 py-3 bg-slate-100 dark:bg-slate-950 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-slate-200 ${
                  isListening ? 'ring-2 ring-red-500 animate-pulse' : ''
                }`}
              />
              <div className="absolute right-2 top-1.5 flex gap-1">
                <button
                  onClick={toggleListening}
                  className={`p-1.5 rounded-xl transition-all ${
                    isListening && !isCallMode
                      ? 'bg-red-500 text-white animate-bounce'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500 hover:text-indigo-600'
                  }`}
                  title="Falar"
                >
                  <i className={`bi ${isListening && !isCallMode ? 'bi-mic-fill' : 'bi-mic'} text-sm`}></i>
                </button>
                <button
                  onClick={() => handleSendMessage()}
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
          onClick={() => setIsOpen(!isOpen)}
          className={`w-16 h-16 rounded-[2rem] flex items-center justify-center text-white shadow-2xl transition-all hover:scale-110 active:scale-95 overflow-hidden ${
            isOpen ? 'bg-slate-800 dark:bg-slate-700 rotate-90' : 'bg-indigo-600 shadow-indigo-300 dark:shadow-none'
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
