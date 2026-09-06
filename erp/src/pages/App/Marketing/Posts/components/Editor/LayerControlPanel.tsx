import React from 'react';
import { Layer } from '../../types';

interface LayerControlPanelProps {
  layers: Layer[];
  selectedLayerId?: string | null;
  onSelectLayer: (id: string) => void;
  onUpdateLayer: (layer: Layer) => void;
  onDeleteLayer: (id: string) => void;
}

export const LayerControlPanel: React.FC<LayerControlPanelProps> = ({
  layers,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  onDeleteLayer
}) => {
  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-900/50 p-2 space-y-2">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <span className="text-xs font-bold text-white flex items-center gap-1.5">
          <i className="bi bi-layers-half text-indigo-400"></i> Camadas do Template
        </span>
        <span className="text-[10px] text-slate-400">{layers.length} elementos</span>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto pr-1">
        {sortedLayers.map(layer => {
          const isSelected = layer.id === selectedLayerId;
          return (
            <div
              key={layer.id}
              onClick={() => onSelectLayer(layer.id)}
              className={`p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-indigo-600/30 border border-indigo-500/50 text-white'
                  : 'bg-slate-950/60 hover:bg-slate-800/80 text-slate-300 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2 truncate pr-2">
                <i
                  className={`bi ${
                    layer.type === 'PRODUCT_MAIN_IMAGE'
                      ? 'bi-image text-emerald-400'
                      : layer.type === 'ASSET'
                      ? 'bi-award-fill text-amber-400'
                      : layer.type === 'VARIATION_GALLERY'
                      ? 'bi-grid-fill text-sky-400'
                      : 'bi-fonts text-purple-400'
                  }`}
                ></i>
                <span className="truncate font-medium">{layer.name}</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onUpdateLayer({ ...layer, visible: !layer.visible });
                  }}
                  className="p-1 text-slate-400 hover:text-white"
                  title="Visibilidade"
                >
                  <i className={`bi ${layer.visible ? 'bi-eye-fill' : 'bi-eye-slash'}`}></i>
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onUpdateLayer({ ...layer, locked: !layer.locked });
                  }}
                  className="p-1 text-slate-400 hover:text-white"
                  title="Bloquear Posição"
                >
                  <i className={`bi ${layer.locked ? 'bi-lock-fill text-amber-400' : 'bi-unlock'}`}></i>
                </button>
                {isSelected && <button onClick={e => { e.stopPropagation(); onDeleteLayer(layer.id); }} className="p-1 text-slate-400 hover:text-rose-400" title="Excluir camada selecionada"><i className="bi bi-trash"></i></button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
