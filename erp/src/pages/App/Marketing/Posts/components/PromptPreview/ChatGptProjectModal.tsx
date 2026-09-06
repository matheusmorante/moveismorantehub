import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { CHATGPT_PROJECT_INSTRUCTIONS, getChatGptInstructionsCharCount } from '../../services/chatGptProjectInstructions';

interface ChatGptProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatGptProjectModal: React.FC<ChatGptProjectModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const charCount = getChatGptInstructionsCharCount();

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CHATGPT_PROJECT_INSTRUCTIONS);
      setCopied(true);
      toast.success(`✓ Instruções do Projeto copiadas (${charCount}/8000 caracteres)! Cole no campo Instruções do ChatGPT.`);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Não foi possível copiar automaticamente. Selecione e copie o texto abaixo.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🤖</span>
            <div>
              <h3 className="text-sm font-bold text-white">Instruções do Projeto para ChatGPT</h3>
              <p className="text-[11px] text-slate-400">
                Cole este texto no campo <span className="text-indigo-300 font-semibold">&ldquo;Instruções&rdquo; (Project Instructions)</span> do ChatGPT
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
              {charCount} / 8.000 caracteres
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              title="Fechar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Corpo com o texto */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 scrollbar-thin scrollbar-thumb-slate-700">
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap select-all">
            {CHATGPT_PROJECT_INSTRUCTIONS}
          </div>
        </div>

        {/* Rodapé com botões de ação */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/60 px-5 py-3">
          <p className="text-[11px] text-slate-400">
            Configuração permanente: a IA sempre descompactará os ZIPs e ancorará as fotos reais sem inventar produtos.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 transition"
            >
              <span>{copied ? '✓' : '📋'}</span>
              <span>{copied ? 'Copiado!' : 'Copiar Instruções'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
