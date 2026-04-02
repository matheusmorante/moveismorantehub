import React, { useState } from 'react';
import AIChatAssistant from './AIChatAssistant';
import AttendanceVoiceInput from './AttendanceVoiceInput';
import { useTheme } from '../../context/ThemeContext';

export default function FloatingActionsHub() {
  const [isOpen, setIsOpen] = useState(false);
  const { theme } = useTheme();

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col items-end gap-3">
      {/* Expanded Menu */}
      <div className={`flex flex-col items-end gap-4 mb-2 transition-all duration-500 origin-bottom ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-50 opacity-0 translate-y-10 pointer-events-none'}`}>
        
        {/* Chat Assistant (Legacy position) */}
        <div className="relative group">
           <AIChatAssistant isFloating={false} />
           <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1 bg-slate-900 text-white text-[9px] font-black uppercase rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap tracking-widest pointer-events-none shadow-xl">
             Assistente IA
           </span>
        </div>

        {/* Voice Input */}
        <div className="relative group">
          <AttendanceVoiceInput isFloating={false} />
          <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1 bg-slate-900 text-white text-[9px] font-black uppercase rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap tracking-widest pointer-events-none shadow-xl">
            Comando de Voz
          </span>
        </div>

        {/* Download App (Integrated here as well for clean UI) */}
        <div className="relative group">
          <a 
            href="/mobile-app"
            className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-premium-lg hover:scale-110 active:scale-95 transition-all duration-300"
          >
            <i className="bi bi-phone-vibrate text-xl"></i>
          </a>
          <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1 bg-slate-900 text-white text-[9px] font-black uppercase rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap tracking-widest pointer-events-none shadow-xl">
            Baixar App Mobile
          </span>
        </div>
      </div>

      {/* Main Toggle Button (The Tools Icon) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-[2rem] flex items-center justify-center transition-all duration-500 shadow-premium-lg border-2 ${
          isOpen 
            ? 'bg-rose-500 border-rose-400 rotate-90 text-white' 
            : 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-700'
        } hover:scale-105 active:scale-95`}
      >
        <i className={`bi ${isOpen ? 'bi-x-lg' : 'bi-tools'} text-2xl`}></i>
      </button>
    </div>
  );
}
