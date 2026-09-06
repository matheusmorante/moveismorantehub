import React from 'react';

interface Props {
  title: string;
  widthMm: number;
  heightMm: number;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onSave: () => void;
  onClose: () => void;
  isSaving?: boolean;
}

export const PriceLabelEditorHeader: React.FC<Props> = ({
  title,
  widthMm,
  heightMm,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onSave,
  onClose,
  isSaving = false,
}) => {
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
          🏷️
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-100">{title || 'Editor de Arte de Etiqueta'}</h2>
          <p className="text-xs text-slate-400">
            Dimensão Física: {widthMm}mm × {heightMm}mm • Zoom: {Math.round(zoom * 100)}%
          </p>
        </div>
      </div>

      {/* Ações de Zoom e Salvamento */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
          <button
            onClick={onZoomOut}
            className="px-2.5 py-1 text-xs text-slate-300 hover:text-white transition-colors"
            title="Reduzir Zoom"
          >
            -
          </button>
          <button
            onClick={onResetZoom}
            className="px-2.5 py-1 text-xs font-semibold text-slate-200 border-x border-slate-700"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={onZoomIn}
            className="px-2.5 py-1 text-xs text-slate-300 hover:text-white transition-colors"
            title="Aumentar Zoom"
          >
            +
          </button>
        </div>

        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
        >
          {isSaving ? 'Salvando...' : 'Salvar Arte'}
        </button>

        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title="Fechar Editor"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
