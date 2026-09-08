import React from 'react';

export default function FloatingActionsHub() {
  const handleOpenAgent = () => {
    window.dispatchEvent(new CustomEvent('morante:open-agent'));
  };

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex items-center gap-3">
      {/* Botão Flutuante do Agente Seu Lizandro */}
      <div className="relative group" data-testid="assistant-container">
        {/* Tooltip elegante à esquerda */}
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white rounded-2xl shadow-xl border border-slate-700/50 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap flex items-center gap-2 transform translate-x-2 group-hover:translate-x-0">
          <div className="flex flex-col text-left">
            <span className="text-xs font-black text-white leading-tight">Seu Lizandro</span>
            <span className="text-[10px] font-semibold text-indigo-300 dark:text-indigo-400">Agente IA do ERP</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        </div>

        {/* Botão Principal com Avatar do Seu Lizandro */}
        <button
          onClick={handleOpenAgent}
          data-testid="assistant-toggle"
          aria-label="Abrir chat do Seu Lizandro, Agente Inteligente do ERP"
          className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 sm:p-1 bg-gradient-to-tr from-indigo-600 via-blue-500 to-amber-400 shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-indigo-400/30"
          title="Falar com Seu Lizandro (Agente IA)"
        >
          {/* Container interno da imagem */}
          <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 shadow-inner flex items-center justify-center">
            <img
              src="/lizandro.png"
              alt="Seu Lizandro - Agente IA"
              className="w-full h-full object-cover object-top hover:scale-110 transition-transform duration-300"
              onError={(e) => {
                // Fallback para seu-lizandro.jpg caso lizandro.png falhe
                const target = e.currentTarget;
                if (!target.src.endsWith('seu-lizandro.jpg')) {
                  target.src = '/seu-lizandro.jpg';
                }
              }}
            />
          </div>

          {/* Badge / Ponto de Status Online */}
          <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full shadow-sm flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
          </span>
        </button>
      </div>
    </div>
  );
}
