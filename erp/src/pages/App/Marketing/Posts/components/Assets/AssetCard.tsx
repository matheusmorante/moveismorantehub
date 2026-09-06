import React from 'react';
import { MarketingAsset } from '../../types';

interface AssetCardProps {
  asset: MarketingAsset;
  onSelect?: (asset: MarketingAsset) => void;
  onDelete?: (id: string) => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({ asset, onSelect, onDelete }) => {
  return (
    <div className="group relative bg-slate-800/80 rounded-xl border border-slate-700 p-3 hover:border-indigo-500/60 transition-all flex flex-col items-center">
      <div className="w-full h-28 flex items-center justify-center bg-slate-950/60 rounded-lg overflow-hidden relative mb-2 p-2">
        <img
          src={asset.fileUrl}
          alt={asset.name}
          className="max-h-full max-w-full object-contain filter drop-shadow-md group-hover:scale-105 transition-transform"
        />
        {asset.isSystemDefault && (
          <span className="absolute top-1 left-1 bg-indigo-600/90 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
            Sistema
          </span>
        )}
      </div>

      <div className="w-full text-left">
        <h4 className="text-xs font-semibold text-slate-100 truncate" title={asset.name}>
          {asset.name}
        </h4>
        <span className="text-[10px] text-slate-400 block truncate mt-0.5">
          {asset.category}
        </span>
      </div>

      <div className="w-full flex items-center gap-1.5 mt-2">
        {onSelect && (
          <button
            onClick={() => onSelect(asset)}
            className="flex-1 py-1 px-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            <i className="bi bi-plus-circle"></i> Inserir
          </button>
        )}
        {!asset.isSystemDefault && onDelete && (
          <button
            onClick={() => onDelete(asset.id)}
            className="p-1 px-2 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 text-xs rounded-lg transition-colors"
            title="Excluir Asset"
          >
            <i className="bi bi-trash"></i>
          </button>
        )}
      </div>
    </div>
  );
};
