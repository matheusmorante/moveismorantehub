import { useEffect, useState } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { createOpportunitySealImage, OpportunitySeal } from './opportunitySealImage';

type Props = { className?: string; open: boolean; onToggle: () => void; onSelect: (opportunity: OpportunitySeal) => void };

export default function OpportunitySealLibrary({ className, open, onToggle, onSelect }: Props) {
  const [opportunities, setOpportunities] = useState<OpportunitySeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('opportunities').select('id, name, slug, badge_color, border_color').eq('active', true).order('name')
      .then(({ data, error }) => {
        if (!error) setOpportunities((data || []) as OpportunitySeal[]);
        setLoading(false);
      });
  }, []);

  return <div className={`rounded-xl border border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-950/20 ${className || ''}`}>
    <button type="button" onClick={onToggle} className="flex w-full items-center gap-2 p-3 text-left text-[10px] font-black text-orange-800 dark:text-orange-300">
      <i className="bi bi-tag-fill" /> Selos de oportunidade
      <i className={`bi bi-chevron-${open ? 'up' : 'down'} ml-auto`} />
    </button>
    {open && <div className="space-y-2 px-2 pb-2">
      {loading && <p className="py-2 text-center text-[10px] font-bold text-slate-400">Carregando selos...</p>}
      {!loading && opportunities.map(opportunity => <button key={opportunity.id} type="button" onClick={() => onSelect(opportunity)} className="block w-full rounded-lg bg-white/80 p-2 hover:ring-2 hover:ring-orange-300 dark:bg-slate-900/70">
        <img src={createOpportunitySealImage(opportunity)} alt={`Selo ${opportunity.name}`} className="h-auto max-h-12 w-full object-contain" />
      </button>)}
      {!loading && opportunities.length === 0 && <p className="py-2 text-center text-[10px] font-bold text-slate-400">Nenhum selo cadastrado.</p>}
    </div>}
  </div>;
}
