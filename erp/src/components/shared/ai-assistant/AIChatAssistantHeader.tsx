import React from 'react';

interface AIChatAssistantHeaderProps {
  variant: 'drawer' | 'floating';
  aiAvatar: string;
  aiName: string;
  currentModule?: string;
  isCallMode: boolean;
  isLoading: boolean;
  onToggleCallMode: () => void;
  onClearHistory: () => void;
  onClose: () => void;
}

export function AIChatAssistantHeader({
  variant,
  aiAvatar,
  aiName,
  currentModule,
  isCallMode,
  isLoading,
  onToggleCallMode,
  onClearHistory,
  onClose,
}: AIChatAssistantHeaderProps) {
  if (variant === 'drawer') {
    return (
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
                Tela: {currentModule}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 relative z-10">
          <button
            onClick={onToggleCallMode}
            disabled={isLoading}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl transition-all flex items-center justify-center ${isCallMode ? 'bg-white text-red-600 shadow-lg' : 'bg-white/15 hover:bg-white/25 text-white'}`}
            title={isCallMode ? 'Desligar Chamada' : 'Iniciar Chamada de Voz'}
          >
            <i
              className={`bi ${isCallMode ? 'bi-telephone-fill' : 'bi-telephone'} text-sm sm:text-base`}
            ></i>
          </button>
          <button
            onClick={onClearHistory}
            disabled={isLoading}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all"
            title="Limpar histórico da conversa"
          >
            <i className="bi bi-trash3 text-sm sm:text-base"></i>
          </button>
          <button
            onClick={onClose}
            data-testid="agent-drawer-close"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all"
            title="Fechar assistente"
          >
            <i className="bi bi-x-lg text-sm sm:text-base"></i>
          </button>
        </div>
      </header>
    );
  }

  return (
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
          onClick={onToggleCallMode}
          disabled={isLoading}
          className={`w-9 h-9 rounded-xl transition-all flex items-center justify-center ${isCallMode ? 'bg-white text-red-600 shadow-lg' : 'bg-white/10 hover:bg-white/20 text-white'}`}
          title={isCallMode ? 'Desligar Chamada' : 'Iniciar Chamada de Voz'}
        >
          <i
            className={`bi ${isCallMode ? 'bi-telephone-fill' : 'bi-telephone'} text-base`}
          ></i>
        </button>
        <button onClick={onClearHistory} disabled={isLoading} title="Limpar histórico da conversa" className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white"><i className="bi bi-trash3" /></button>
        <button
          onClick={onClose}
          title="Fechar assistente"
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
        >
          <i className="bi bi-dash-lg text-lg"></i>
        </button>
      </div>
    </header>
  );
}
