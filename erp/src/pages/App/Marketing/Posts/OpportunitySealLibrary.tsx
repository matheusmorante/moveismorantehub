import { useEffect, useState } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { uploadFile } from '@/pages/utils/storageService';
import { toast } from 'react-toastify';
import { createOpportunitySealImage, OpportunitySeal } from './opportunitySealImage';
import OpportunitySealImageEditor from './OpportunitySealImageEditor';

type Props = {
  className?: string;
  open: boolean;
  onToggle: () => void;
  onSelect: (opportunity: OpportunitySeal) => void;
};

export default function OpportunitySealLibrary({ className, open, onToggle, onSelect }: Props) {
  const [opportunities, setOpportunities] = useState<OpportunitySeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOpportunity, setEditingOpportunity] = useState<OpportunitySeal | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchOpportunities = () => {
    supabase
      .from('opportunities')
      .select('id, name, slug, badge_color, border_color, image_url')
      .eq('active', true)
      .order('name')
      .then(async ({ data, error }) => {
        if (!error) {
          setOpportunities((data || []) as OpportunitySeal[]);
        } else {
          const fallback = await supabase
            .from('opportunities')
            .select('id, name, slug, badge_color, border_color')
            .eq('active', true)
            .order('name');
          if (!fallback.error) setOpportunities((fallback.data || []) as OpportunitySeal[]);
        }
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const handleUploadImage = async (opportunity: OpportunitySeal, file: File) => {
    setUploading(true);
    try {
      const url = await uploadFile(file, `marketing/seals/${opportunity.id}-${Date.now()}.png`);
      const { error } = await supabase
        .from('opportunities')
        .update({ image_url: url })
        .eq('id', opportunity.id);

      if (error) throw error;

      setOpportunities(prev =>
        prev.map(item => (item.id === opportunity.id ? { ...item, image_url: url } : item))
      );
      onSelect({ ...opportunity, image_url: url });
      if (editingOpportunity?.id === opportunity.id) {
        setEditingOpportunity(prev => (prev ? { ...prev, image_url: url } : null));
      }
      toast.success(`Imagem do selo "${opportunity.name}" salva com sucesso!`);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar imagem do selo.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async (opportunity: OpportunitySeal) => {
    try {
      const { error } = await supabase
        .from('opportunities')
        .update({ image_url: null })
        .eq('id', opportunity.id);

      if (error) throw error;

      setOpportunities(prev =>
        prev.map(item => (item.id === opportunity.id ? { ...item, image_url: undefined } : item))
      );
      onSelect({ ...opportunity, image_url: undefined });
      setEditingOpportunity(null);
      toast.success(`Imagem do selo "${opportunity.name}" removida.`);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao remover imagem do selo.');
    }
  };

  return (
    <>
      <div className={`rounded-xl border border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-950/20 ${className || ''}`}>
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center gap-2 p-3 text-left text-[10px] font-black text-orange-800 dark:text-orange-300"
        >
          <i className="bi bi-tag-fill" /> Selos de oportunidade
          <i className={`bi bi-chevron-${open ? 'up' : 'down'} ml-auto`} />
        </button>

        {open && (
          <div className="space-y-2 px-2 pb-2">
            {loading && <p className="py-2 text-center text-[10px] font-bold text-slate-400">Carregando selos...</p>}

            {!loading &&
              opportunities.map(opportunity => (
                <div
                  key={opportunity.id}
                  className="group relative rounded-lg bg-white/80 p-2 shadow-sm hover:ring-2 hover:ring-orange-300 dark:bg-slate-900/70"
                >
                  <p className="mb-1.5 truncate text-[10px] font-black text-slate-700 dark:text-slate-200" title={opportunity.name}>{opportunity.name}</p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onSelect(opportunity)}
                      className="flex flex-1 items-center justify-center overflow-hidden"
                      title={`Selecionar selo ${opportunity.name}`}
                    >
                      <img
                        src={createOpportunitySealImage(opportunity)}
                        alt={`Selo ${opportunity.name}`}
                        className="h-auto max-h-12 w-full object-contain"
                      />
                    </button>

                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setEditingOpportunity(opportunity);
                      }}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-orange-100 text-orange-700 opacity-80 transition hover:bg-orange-200 hover:opacity-100 dark:bg-orange-900/40 dark:text-orange-300"
                      title={`Gerenciar imagem do selo ${opportunity.name}`}
                    >
                      <i className="bi bi-image text-xs" />
                    </button>
                  </div>
                </div>
              ))}

            {!loading && opportunities.length === 0 && (
              <p className="py-2 text-center text-[10px] font-bold text-slate-400">Nenhum selo cadastrado.</p>
            )}
          </div>
        )}
      </div>

      {editingOpportunity && (
        <OpportunitySealImageEditor
          image={editingOpportunity.image_url || ''}
          uploading={uploading}
          onImageChange={file => handleUploadImage(editingOpportunity, file)}
          onRemoveImage={() => handleRemoveImage(editingOpportunity)}
          onClose={() => setEditingOpportunity(null)}
        />
      )}
    </>
  );
}
