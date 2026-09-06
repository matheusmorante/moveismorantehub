import React, { useState, useEffect, useMemo } from 'react';
import { MarketingAsset, AssetCategory } from '../../types';
import { assetService } from '../../services/assetService';
import { AssetCard } from './AssetCard';

interface AssetLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAsset: (asset: MarketingAsset) => void;
  selectedCampaignId?: string | null;
}

const CATEGORIES: { label: string; value: AssetCategory | 'ALL' }[] = [
  { label: 'Todas', value: 'ALL' },
  { label: 'Selos de Campanha', value: 'CAMPAIGN_BADGE' },
  { label: 'Pagamento & Bandeiras', value: 'PAYMENT' },
  { label: 'Logos & Marcas', value: 'BRAND' },
  { label: 'Descontos & Etiquetas', value: 'DISCOUNT' },
  { label: 'Decorações', value: 'DECORATION' },
  { label: 'Molduras', value: 'FRAME' },
  { label: 'Ícones', value: 'ICON' }
];

export const AssetLibraryModal: React.FC<AssetLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectAsset,
  selectedCampaignId
}) => {
  const [assets, setAssets] = useState<MarketingAsset[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | 'ALL'>('ALL');
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploadName, setUploadName] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadAssets();
    }
  }, [isOpen]);

  const loadAssets = async () => {
    const data = await assetService.getAll();
    setAssets(data);
  };

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchCategory = selectedCategory === 'ALL' || asset.category === selectedCategory;
      const matchSearch = asset.name.toLowerCase().includes(search.toLowerCase());
      const matchCampaign = !selectedCampaignId || !asset.campaignId || asset.campaignId === selectedCampaignId;
      return matchCategory && matchSearch && matchCampaign;
    });
  }, [assets, selectedCategory, search, selectedCampaignId]);

  const handleAddCustomAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadUrl || !uploadName) return;
    
    await assetService.save({
      name: uploadName,
      type: 'image/png',
      category: selectedCategory === 'ALL' ? 'DECORATION' : selectedCategory,
      fileUrl: uploadUrl,
      campaignId: selectedCampaignId || null,
      width: 400,
      height: 400,
      aspectRatio: 1
    });

    setUploadUrl('');
    setUploadName('');
    loadAssets();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja remover este asset?')) {
      await assetService.delete(id);
      loadAssets();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="bi bi-collection-play-fill text-indigo-400 text-xl"></i>
            <h3 className="text-lg font-bold text-white">Biblioteca de Assets Graficos</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 text-xl">
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Filtros e Busca */}
        <div className="p-4 bg-slate-800/40 border-b border-slate-800 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <i className="bi bi-search absolute left-3 top-2.5 text-slate-400"></i>
            <input
              type="text"
              placeholder="Pesquisar asset..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de Assets */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredAssets.map(asset => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onSelect={asset => {
                onSelectAsset(asset);
                onClose();
              }}
              onDelete={handleDelete}
            />
          ))}

          {filteredAssets.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400">
              <i className="bi bi-image text-4xl block mb-2 opacity-50"></i>
              Nenhum asset encontrado para este filtro.
            </div>
          )}
        </div>

        {/* Adicionar Novo Asset Rápido */}
        <form onSubmit={handleAddCustomAsset} className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center gap-3">
          <input
            type="text"
            placeholder="Nome do Asset"
            value={uploadName}
            onChange={e => setUploadName(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 flex-1"
          />
          <input
            type="url"
            placeholder="URL da Imagem (PNG/WebP/SVG)"
            value={uploadUrl}
            onChange={e => setUploadUrl(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 flex-1"
          />
          <button
            type="submit"
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Adicionar Asset
          </button>
        </form>
      </div>
    </div>
  );
};
