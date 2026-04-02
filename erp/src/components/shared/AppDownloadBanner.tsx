import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function AppDownloadBanner() {
  const [isOpen, setIsOpen] = useState(true);
  const { theme } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[100] animate-slide-up">
      <div className="relative group">
        {/* Pulsing ring for attention */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2.5rem] blur opacity-30 group-hover:opacity-75 animate-pulse transition duration-1000"></div>
        
        <div className="relative flex items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl border border-white/20 dark:border-slate-800 rounded-[2.5rem] shadow-premium-lg p-3 lg:p-4 gap-4 lg:gap-6 min-w-[320px] max-w-[450px]">
          <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-[1.8rem] flex items-center justify-center text-white shadow-premium overflow-hidden group-hover:scale-105 transition-transform duration-500">
             <i className="bi bi-phone-vibrate text-3xl lg:text-4xl animate-bounce-subtle"></i>
          </div>
          
          <div className="flex-1">
            <h4 className="text-xs lg:text-[13px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter italic italic">
              EXPERINCIA <span className="text-blue-600">MOBILE HUB</span>
            </h4>
            <p className="text-[10px] lg:text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
              Leve o ERP no bolso. Baixe a verso nativa para Android e iOS.
            </p>
            
            <div className="flex gap-2 mt-3 lg:mt-4">
               <button className="flex-1 py-2 px-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
                  <i className="bi bi-apple mr-1"></i> iOS
               </button>
               <button className="flex-1 py-2 px-3 bg-blue-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all shadow-premium-sm">
                  <i className="bi bi-google-play mr-1"></i> Android
               </button>
            </div>
          </div>

          <button 
            onClick={() => setIsOpen(false)}
            className="absolute -top-2 -right-2 w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-full text-slate-400 hover:text-rose-500 shadow-premium transition-all"
          >
            <i className="bi bi-x-lg text-xs"></i>
          </button>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 3s ease-in-out infinite;
        }
      `}} />
    </div>
  );
}
