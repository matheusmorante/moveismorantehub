import React, { useState } from 'react';
import { AspectRatioType } from '../../types';
import { exportPostImage } from '../../services/exportPostImage';

interface PostExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  aspectRatio: AspectRatioType;
  productName: string;
}

export const PostExportModal: React.FC<PostExportModalProps> = ({
  isOpen,
  onClose,
  aspectRatio,
  productName
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const [ratioWidth, ratioHeight] = aspectRatio.split(':').map(Number);
  const outputHeight = Math.round(1080 * ratioHeight / ratioWidth);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsExporting(true);
    setError('');
    try {
      const element = document.getElementById('marketing-post-canvas');
      if (!element) throw new Error('Selecione um produto antes de exportar.');
      const canvas = await exportPostImage(element);
      const link = document.createElement('a'); link.download = `${productName.replace(/[^\p{L}\p{N} -]/gu, '').slice(0, 100)}.png`;
      link.href = canvas.toDataURL('image/png'); link.click(); onClose();
    } catch (e) {
      setError('Não foi possível exportar. Verifique se todas as imagens carregaram e permitem exportação.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <i className="bi bi-download text-emerald-400 text-xl"></i>
            <h3 className="text-base font-bold text-white">Exportar Post Pronto</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-300">
          <div className="flex justify-between">
            <span>Produto:</span>
            <strong className="text-white truncate max-w-[200px]">{productName}</strong>
          </div>
          <div className="flex justify-between">
            <span>Formato:</span>
            <strong className="text-indigo-400 font-semibold">{aspectRatio} (Feed Instagram)</strong>
          </div>
          <div className="flex justify-between">
            <span>Resolução:</span>
            <strong className="text-emerald-400">1080 x {outputHeight} px (HD)</strong>
          </div>
        </div>

        {error && <p role="alert" className="text-red-300 text-sm">{error}</p>}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
          >
            Cancelar
          </button>
          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2"
          >
            {isExporting ? <i className="bi bi-arrow-repeat animate-spin"></i> : <i className="bi bi-download"></i>}
            Baixar Imagem PNG
          </button>
        </div>
      </div>
    </div>
  );
};
