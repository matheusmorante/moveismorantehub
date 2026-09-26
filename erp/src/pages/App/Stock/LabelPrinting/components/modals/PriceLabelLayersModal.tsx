import React from 'react';
import { PriceLabelLayerKey } from '../../types/PriceLabelArtEditorTypes';

export interface PriceLabelLayerItem {
  key: PriceLabelLayerKey;
  label: string;
  desc: string;
  icon: string;
  isVisible: boolean;
  toggleVisibility: () => void;
}

export interface PriceLabelLayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  layers: PriceLabelLayerItem[];
  selectedElements: Set<PriceLabelLayerKey>;
  selectedElement: PriceLabelLayerKey;
  onSelectLayer: (key: PriceLabelLayerKey, isShift: boolean) => void;
  onCenterElement: (key: string | null) => void;
}

export const PriceLabelLayersModal: React.FC<PriceLabelLayersModalProps> = ({
  isOpen,
  onClose,
  layers,
  selectedElements,
  selectedElement,
  onSelectLayer,
  onCenterElement,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{ zIndex: 9999 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <i className="bi bi-layers-fill text-blue-600 text-lg" />
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
              Camadas da Etiqueta de Preço
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <i className="bi bi-x-lg text-sm" />
          </button>
        </div>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {layers.map(layer => (
            <div
              key={layer.key}
              className={`w-full p-3 rounded-2xl flex items-center justify-between border transition-all ${
                selectedElements.has(layer.key)
                  ? 'bg-blue-50 dark:bg-blue-950 border-blue-500 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              <button
                type="button"
                onClick={(e) => onSelectLayer(layer.key, e.shiftKey)}
                className="flex items-center gap-3 text-left flex-1 cursor-pointer"
              >
                <i className={`bi ${layer.icon} text-base text-blue-500`} />
                <div>
                  <span className="text-xs font-black uppercase">{layer.label}</span>
                  <p className="text-[9px] font-normal lowercase text-slate-400">
                    {layer.desc}
                  </p>
                </div>
              </button>

              <div className="flex items-center gap-2">
                {layer.key !== 'background' && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCenterElement(layer.key);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer text-amber-700 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-xs"
                      title="Trazer este componente para o centro exato (0, 0) da etiqueta"
                    >
                      <i className="bi bi-crosshair text-xs" />
                      <span>Centralizar</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        layer.toggleVisibility();
                      }}
                      className={`p-1.5 rounded-xl text-xs transition cursor-pointer ${
                        layer.isVisible
                          ? 'text-blue-600 bg-blue-100 dark:bg-blue-900'
                          : 'text-slate-400 bg-slate-200 dark:bg-slate-800'
                      }`}
                      title={layer.isVisible ? 'Ocultar camada' : 'Exibir camada'}
                    >
                      <i className={`bi ${layer.isVisible ? 'bi-eye-fill' : 'bi-eye-slash-fill'}`} />
                    </button>
                  </>
                )}

                {selectedElement === layer.key && (
                  <span className="text-[8px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-black">
                    Ativa
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
