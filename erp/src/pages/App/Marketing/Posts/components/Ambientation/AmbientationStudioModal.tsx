import React, { useState } from 'react';
import { ambientationService } from '../../services/ambientationService';
import { AmbientedImageRecord } from '../../types';
import { generateRoom } from '../../services/compositionAi';

interface AmbientationStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  productId: string;
  originalImageUrl: string;
  onSelectAmbientedImage: (imageUrl: string) => void;
}

export const AmbientationStudioModal: React.FC<AmbientationStudioModalProps> = ({
  isOpen,
  onClose,
  productName,
  productId,
  originalImageUrl,
  onSelectAmbientedImage
}) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGeneratePrompt = async () => {
    const generated = await ambientationService.generateAmbientationPrompt(productName);
    setPrompt(generated);
  };

  const handleSimulateAmbientation = async () => {
    setIsGenerating(true);
    try {
      const resultUrl = await generateRoom(originalImageUrl, productName, 'vermelho e dourado', prompt);
      setPreviewUrl(resultUrl);
      setIsGenerating(false);

      await ambientationService.saveAmbientedImage({
        productId,
        originalImageUrl,
        ambientedImageUrl: resultUrl,
        promptUsed: prompt
      });
    } catch (error) { window.alert((error as Error).message); }
    finally { setIsGenerating(false); }
  };

  return (
    <div className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="bi bi-stars text-amber-400 text-xl"></i>
            <h3 className="text-lg font-bold text-white">Estudio de Ambientacao por IA</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-xs font-semibold text-slate-400 block mb-2">Foto Real do Produto</span>
              <img src={originalImageUrl} alt={productName} className="h-40 mx-auto object-contain rounded-lg" />
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center flex flex-col items-center justify-center">
              <span className="text-xs font-semibold text-slate-400 block mb-2">Resultado Ambientado</span>
              {previewUrl ? (
                <img src={previewUrl} alt="Ambientado" className="h-40 mx-auto object-contain rounded-lg" />
              ) : (
                <div className="text-slate-600 text-xs p-4 border border-dashed border-slate-800 rounded-lg w-full h-40 flex flex-col items-center justify-center">
                  <i className="bi bi-magic text-2xl mb-1"></i>
                  Aguardando geração do ambiente
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Prompt de Instrução para IA (Fundo):</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Descreva o ambiente para o produto (ex: quarto moderno iluminado)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 h-20 resize-none"
            />
            <button
              onClick={handleGeneratePrompt}
              className="text-[11px] text-indigo-400 hover:underline mt-1 inline-flex items-center gap-1"
            >
              <i className="bi bi-wand"></i> Gerar sugestão automática de ambiente
            </button>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-[11px] text-amber-300 flex items-start gap-2">
            <i className="bi bi-shield-check text-base mt-0.5"></i>
            <span>
              A IA gera apenas o ambiente de fundo. O produto original (formato, cores, espelhos e puxadores) é estritamente preservado sem alterações.
            </span>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3">
          <button
            onClick={handleSimulateAmbientation}
            disabled={isGenerating}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {isGenerating ? <i className="bi bi-arrow-repeat animate-spin"></i> : <i className="bi bi-stars"></i>}
            Gerar Ambiente por IA
          </button>
          {previewUrl && (
            <button
              onClick={() => {
                onSelectAmbientedImage(previewUrl);
                onClose();
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors"
            >
              Usar Foto Ambientada
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
