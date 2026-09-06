import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseConfig';
import { AI_LIMITS } from '../../../../services/aiGateway/config/aiLimitsConfig';
import { AiCircuitBreaker } from '../../../../services/aiGateway/core/AiCircuitBreaker';

export const AiUsageDashboardPanel: React.FC = () => {
  const [counts, setCounts] = useState({
    textToday: 0,
    imageToday: 0,
    ttsToday: 0,
    globalToday: 0
  });

  useEffect(() => {
    loadUsage();
    const interval = setInterval(loadUsage, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadUsage = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const startOfDay = `${today}T00:00:00.000Z`;

      const { data } = await supabase
        .from('api_usage_logs')
        .select('module_source')
        .eq('provider', 'gemini')
        .eq('status', 'SUCCESS')
        .gte('created_at', startOfDay);

      const logs = data || [];
      setCounts({
        textToday: logs.filter((l: any) => l.module_source === 'TEXT').length,
        imageToday: logs.filter((l: any) => l.module_source === 'IMAGE').length,
        ttsToday: logs.filter((l: any) => l.module_source === 'TTS').length,
        globalToday: logs.length
      });
    } catch (e) {
      console.warn('[AiUsageDashboardPanel] Erro ao carregar contadores de IA:', e);
    }
  };

  const getProgressColor = (current: number, max: number) => {
    const pct = (current / max) * 100;
    if (pct >= 100) return 'bg-rose-500';
    if (pct >= 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const isCircuitOpen = AiCircuitBreaker.isGlobalOpen();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl">
            <i className="bi bi-[#10a37f] bi-cpu-fill text-xl"></i>
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Monitoramento de IA (Gemini Gateway)</h3>
            <p className="text-xs text-slate-400">Proteção global contra consumo excessivo e controle conservador de cota</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg font-semibold flex items-center gap-1">
            <i className="bi bi-shield-lock-fill"></i> Fail Closed Ativo
          </span>
          <span className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 ${
            isCircuitOpen
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
          }`}>
            <i className={`bi ${isCircuitOpen ? 'bi-lightning-charge-fill text-rose-400' : 'bi-check-circle-fill'}`}></i>
            {isCircuitOpen ? 'Circuit Breaker ABERTO' : 'Circuit Breaker OK'}
          </span>
        </div>
      </div>

      {/* Grid de Contadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TEXTO */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <i className="bi bi-fonts text-purple-400"></i> Texto (Gemini 2.5)
            </span>
            <strong className="text-white">{counts.textToday} / {AI_LIMITS.categories.TEXT.perDay}</strong>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressColor(counts.textToday, AI_LIMITS.categories.TEXT.perDay)} transition-all`}
              style={{ width: `${Math.min(100, (counts.textToday / AI_LIMITS.categories.TEXT.perDay) * 100)}%` }}
            ></div>
          </div>
          <span className="text-[10px] text-slate-500 block">Max 3 simultâneas | 10/min</span>
        </div>

        {/* IMAGEM */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <i className="bi bi-image-fill text-amber-400"></i> Imagem (Ambientação)
            </span>
            <strong className="text-white">{counts.imageToday} / {AI_LIMITS.categories.IMAGE.perDay}</strong>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressColor(counts.imageToday, AI_LIMITS.categories.IMAGE.perDay)} transition-all`}
              style={{ width: `${Math.min(100, (counts.imageToday / AI_LIMITS.categories.IMAGE.perDay) * 100)}%` }}
            ></div>
          </div>
          <span className="text-[10px] text-slate-500 block">Max 1 simultânea | 2/min</span>
        </div>

        {/* VOZ / TTS */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <i className="bi bi-mic-fill text-sky-400"></i> Voz / TTS (Feminina)
            </span>
            <strong className="text-white">{counts.ttsToday} / {AI_LIMITS.categories.TTS.perDay}</strong>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressColor(counts.ttsToday, AI_LIMITS.categories.TTS.perDay)} transition-all`}
              style={{ width: `${Math.min(100, (counts.ttsToday / AI_LIMITS.categories.TTS.perDay) * 100)}%` }}
            ></div>
          </div>
          <span className="text-[10px] text-slate-500 block">Voz 'Aoede' (Fallback p/ Google Maps)</span>
        </div>

        {/* GLOBAL */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <i className="bi bi-globe text-emerald-400"></i> Teto Global Gemini
            </span>
            <strong className="text-white">{counts.globalToday} / {AI_LIMITS.global.perDay}</strong>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressColor(counts.globalToday, AI_LIMITS.global.perDay)} transition-all`}
              style={{ width: `${Math.min(100, (counts.globalToday / AI_LIMITS.global.perDay) * 100)}%` }}
            ></div>
          </div>
          <span className="text-[10px] text-slate-500 block">Prevalece sobre os individuais</span>
        </div>
      </div>
    </div>
  );
};
