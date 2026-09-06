import React, { useState, useEffect } from 'react';
import { MarketingCampaign } from '../../types';
import { campaignService } from '../../services/campaignService';

interface CampaignSelectorProps {
  selectedCampaignId?: string | null;
  onSelectCampaign: (campaign: MarketingCampaign) => void;
}

export const CampaignSelector: React.FC<CampaignSelectorProps> = ({
  selectedCampaignId,
  onSelectCampaign
}) => {
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [error, setError] = useState('');
  async function createCampaign() {
    const name = window.prompt('Nome da campanha (ex.: Dia dos Pais):'); if (!name?.trim()) return;
    try { const campaign = await campaignService.save({ name: name.trim(), slug: '', active: true });
      setCampaigns(current => [...current, campaign]); onSelectCampaign(campaign);
      setError(campaign.persistedRemotely ? '' : 'Campanha salva neste navegador. Sincronização indisponível.');
    } catch { setError('Não foi possível salvar a campanha.'); }
  }

  useEffect(() => {
    campaignService.getAll().then(setCampaigns);
  }, []);

  return (
    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-2 rounded-xl">
      <i className="bi bi-megaphone-fill text-amber-400 text-base"></i>
      <span className="text-xs font-semibold text-slate-300">Campanha:</span>
      <select
        value={selectedCampaignId || ''}
        onChange={e => {
          const found = campaigns.find(c => c.id === e.target.value);
          if (found) onSelectCampaign(found);
        }}
        className="bg-slate-950 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-medium"
      >
        <option value="" disabled>Selecione uma campanha</option>
        {campaigns.map(c => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button onClick={createCampaign} title="Criar campanha" className="text-indigo-300 px-2">+</button>
      {error && <span role="alert" className="text-xs text-red-300">{error}</span>}
    </div>
  );
};
