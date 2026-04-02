import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function MobileAppLanding() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse delay-700"></div>
      </div>

      <div className="max-w-4xl w-full flex flex-col lg:flex-row items-center gap-12 lg:gap-20 relative z-10 animate-reveal">
        
        {/* Mocked Phone UI */}
        <div className="w-[280px] h-[580px] bg-slate-900 rounded-[3rem] border-8 border-slate-800 shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 inset-x-0 h-6 bg-slate-800 flex justify-center items-end pb-1">
              <div className="w-16 h-1 rounded-full bg-slate-700"></div>
           </div>
           <div className="p-4 pt-10 h-full flex flex-col gap-4">
              <div className="w-full h-8 bg-slate-800 rounded-lg animate-pulse"></div>
              <div className="flex-1 w-full bg-slate-800/50 rounded-2xl flex flex-col items-center justify-center p-6 border border-white/5">
                 <i className="bi bi-phone-vibrate text-6xl text-blue-500 mb-4 animate-bounce"></i>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Iniciando Hub Mobile...</p>
              </div>
              <div className="grid grid-cols-4 gap-2">
                 {[...Array(4)].map((_, i) => <div key={i} className="h-2 bg-slate-800 rounded-full"></div>)}
              </div>
           </div>
        </div>

        {/* Content */}
        <div className="flex-1 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-1 bg-blue-600/10 border border-blue-500/20 rounded-full mb-6 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] animate-slide-up">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            Disponvel para Android e iOS
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-black tracking-tighter mb-6 leading-none italic animate-slide-up">
            EXPERINCIA <br /> <span className="text-blue-500">MVEIS MORANTE</span>
          </h1>
          
          <p className="text-slate-400 text-lg lg:text-xl font-medium mb-10 leading-relaxed animate-slide-up">
            Tenha o controle total da logstica, montagens e vendas na palma da sua mo. 
            Mais velocidade para sua equipe de campo.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-slide-up">
             <button 
               onClick={() => {
                 alert("🚧 ARQUIVOS-FONTE PRONTOS!\n\nOs arquivos do App Mobile foram criados no diretório '/mobile' do seu projeto.\n\nPara gerar o APK real:\n1. Vá na pasta /mobile\n2. Execute 'npm install'\n3. Use 'npx expo run:android' ou 'eas build'\n\nAcesse o código-fonte agora para ver o núcleo do GPS e Scanner!");
               }}
               className="px-8 py-5 bg-white text-slate-950 rounded-[1.5rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-xl active:scale-95"
             >
                <i className="bi bi-google-play text-xl"></i>
                Download Android (.APK)
             </button>
             <button 
               onClick={() => alert("O App iOS está pronto em código-fonte no diretório /mobile.\nPara rodar no iPhone, abra o projeto no Xcode ou use o Expo Go.")}
               className="px-8 py-5 bg-slate-800 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:scale-105 transition-all border border-slate-700 active:scale-95"
             >
                <i className="bi bi-apple text-xl"></i>
                App Store (iOS)
             </button>
          </div>

          <div className="mt-12 flex items-center gap-6 justify-center lg:justify-start opacity-50">
             <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-slate-500">Desenvolvido por</span>
                <span className="text-sm font-bold">DeepMind Code Labs</span>
             </div>
             <div className="w-px h-8 bg-slate-800"></div>
             <button 
               onClick={() => navigate('/')}
               className="text-white hover:text-blue-400 transition-colors flex items-center gap-2 font-bold text-sm"
             >
                <i className="bi bi-arrow-left"></i> Voltar ao ERP
             </button>
          </div>
        </div>

      </div>
    </div>
  );
}
